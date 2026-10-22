// Background service worker: first-run setup and migrations, dislike counts,
// SponsorBlock segments, and syncing settings through your Chrome account.
importScripts('shared/wallpapers.js', 'shared/settings.js');

const Lull = globalThis.Lull;
const RYD = 'https://returnyoutubedislikeapi.com/votes?videoId=';
const cache = new Map();
const TTL = 10 * 60 * 1000;

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  const { settings } = await chrome.storage.local.get('settings');
  const next = Lull.merge(Lull.DEFAULTS, settings);
  // Earlier versions also ran on X and had per-site design switches.
  delete next.x;
  delete next.design.onYoutube;
  delete next.design.onX;
  // Revision 2: cards went back to YouTube's own layout (text below the
  // thumbnail) and YouTube's own number of videos per row.
  if (!settings || !(settings.rev >= 2)) {
    next.design.overlayCards = false;
    next.design.perRow = 0;
  }
  // Revision 3: the single "Mine" word list became named topics.
  if (settings && !(settings.rev >= 3) && settings.yt && Array.isArray(settings.yt.topicWords) && settings.yt.topicWords.length) {
    next.yt.topics = [{ id: 'mine', name: 'Mine', words: settings.yt.topicWords }];
    if (next.yt.subsTopic === 'mine') next.yt.subsTopic = 'c:mine';
  }
  if (next.yt) delete next.yt.topicWords;
  next.rev = Lull.REVISION;
  await chrome.storage.local.set({ settings: next });
  if (reason === 'install') chrome.runtime.openOptionsPage();
  await pullSync();
});

chrome.runtime.onStartup.addListener(() => pullSync());

async function votes(id) {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const res = await fetch(RYD + encodeURIComponent(id), { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('RYD ' + res.status);
  const json = await res.json();
  const data = { likes: Number(json.likes) || 0, dislikes: Number(json.dislikes) || 0 };
  cache.set(id, { at: Date.now(), data });
  if (cache.size > 300) cache.delete(cache.keys().next().value);
  return data;
}

// ---- SponsorBlock -------------------------------------------------------------
// Privacy-preserving lookup: only the first 4 hex characters of the video ID's
// SHA-256 go to the server, which answers for every video sharing that prefix.
const SB = 'https://sponsor.ajay.app/api/skipSegments/';
const sbCache = new Map();

async function sha256Prefix(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 4);
}

async function sponsorSegments(id, cats) {
  const key = id + '|' + cats.join(',');
  const hit = sbCache.get(key);
  if (hit && Date.now() - hit.at < TTL * 3) return hit.data;
  const url = SB + (await sha256Prefix(id)) + '?categories=' + encodeURIComponent(JSON.stringify(cats));
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  let data = [];
  if (res.ok) {
    const list = await res.json();
    const match = Array.isArray(list) && list.find((v) => v.videoID === id);
    data = match ? match.segments.filter((s) => !s.actionType || s.actionType === 'skip').map((s) => ({ segment: s.segment, category: s.category, UUID: s.UUID })) : [];
  } else if (res.status !== 404) {
    throw new Error('SponsorBlock ' + res.status);
  }
  sbCache.set(key, { at: Date.now(), data });
  if (sbCache.size > 200) sbCache.delete(sbCache.keys().next().value);
  return data;
}

// ---- settings sync ------------------------------------------------------------
// Settings (not pictures, watch list or watch time) are mirrored to
// chrome.storage.sync in chunks (sync items are capped at 8 KB each).
const CHUNK = 7000;
let lastPushed = '';
let pushTimer = 0;
let applyingRemote = false;

async function deviceId() {
  let { deviceId: id } = await chrome.storage.local.get('deviceId');
  if (!id) {
    id = crypto.randomUUID();
    await chrome.storage.local.set({ deviceId: id });
  }
  return id;
}

async function pushSync() {
  const { settings } = await chrome.storage.local.get('settings');
  if (!settings || settings.sync === false) return;
  const json = JSON.stringify(settings);
  if (json === lastPushed) return;
  const parts = {};
  const n = Math.ceil(json.length / CHUNK);
  for (let i = 0; i < n; i++) parts['s_' + i] = json.slice(i * CHUNK, (i + 1) * CHUNK);
  const ts = Date.now();
  await chrome.storage.sync.set({ ...parts, s_meta: { ts, n, device: await deviceId() } });
  const old = await chrome.storage.sync.get(null);
  const stale = Object.keys(old).filter((k) => /^s_\d+$/.test(k) && Number(k.slice(2)) >= n);
  if (stale.length) await chrome.storage.sync.remove(stale);
  await chrome.storage.local.set({ syncSeen: ts });
  lastPushed = json;
}

async function pullSync() {
  const { s_meta: meta } = await chrome.storage.sync.get('s_meta');
  if (!meta) return pushSync();
  const { settings: local, syncSeen = 0 } = await chrome.storage.local.get(['settings', 'syncSeen']);
  if (local && local.sync === false) return;
  if (meta.device === (await deviceId()) || meta.ts <= syncSeen) return;
  const keys = Array.from({ length: meta.n }, (_, i) => 's_' + i);
  const parts = await chrome.storage.sync.get(keys);
  let remote;
  try {
    remote = JSON.parse(keys.map((k) => parts[k] || '').join(''));
  } catch (e) {
    return;
  }
  const next = Lull.merge(Lull.DEFAULTS, remote);
  applyingRemote = true;
  await chrome.storage.local.set({ settings: next, syncSeen: meta.ts });
  lastPushed = JSON.stringify(next);
  applyingRemote = false;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings && !applyingRemote) {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => pushSync().catch(() => {}), 1500);
  }
  if (area === 'sync' && changes.s_meta) pullSync().catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg && msg.type === 'ryd' && /^[\w-]{6,20}$/.test(msg.id)) {
    votes(msg.id)
      .then((data) => reply({ ok: true, data }))
      .catch((e) => reply({ ok: false, error: String(e) }));
    return true;
  }
  if (msg && msg.type === 'sponsorblock' && /^[\w-]{6,20}$/.test(msg.id) && Array.isArray(msg.cats)) {
    sponsorSegments(msg.id, msg.cats.filter((c) => /^[a-z_]+$/.test(c)))
      .then((segments) => reply({ ok: true, segments }))
      .catch((e) => reply({ ok: false, error: String(e) }));
    return true;
  }
  if (msg && msg.type === 'open-options') {
    chrome.runtime.openOptionsPage();
  }
  return false;
});
