// Background service worker: first-run setup, dislike counts and a few
// requests content scripts can't make themselves.
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
  next.rev = Lull.REVISION;
  await chrome.storage.local.set({ settings: next });
  if (reason === 'install') chrome.runtime.openOptionsPage();
});

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

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg && msg.type === 'ryd' && /^[\w-]{6,20}$/.test(msg.id)) {
    votes(msg.id)
      .then((data) => reply({ ok: true, data }))
      .catch((e) => reply({ ok: false, error: String(e) }));
    return true;
  }
  if (msg && msg.type === 'open-options') {
    chrome.runtime.openOptionsPage();
  }
  return false;
});
