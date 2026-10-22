// Skip sponsor reads and other segments marked on SponsorBlock, a free,
// crowd-sourced database (sponsor.ajay.app). Segments are marked on the
// progress bar; each skip shows a toast with Undo.
(() => {
  const Lull = globalThis.Lull;
  if (Lull.site !== 'yt') return;

  const CATS = {
    sponsor: { key: 'yt.sbSponsor', name: 'sponsor', color: '#00d400' },
    selfpromo: { key: 'yt.sbSelfpromo', name: 'self-promotion', color: '#ffd400' },
    interaction: { key: 'yt.sbInteraction', name: '“like and subscribe” reminder', color: '#cc00ff' },
    intro: { key: 'yt.sbIntro', name: 'intro', color: '#00ffff' },
    outro: { key: 'yt.sbOutro', name: 'end cards', color: '#3f6bff' },
    music_offtopic: { key: 'yt.sbMusic', name: 'non-music part', color: '#ff9900' },
  };

  let current = { id: '', key: '', segments: [] };
  let skipped = new Set();
  let video = null;

  const enabledCats = () => Object.entries(CATS).filter(([, c]) => Lull.getPath(Lull.settings, c.key)).map(([k]) => k);
  const videoId = () => (Lull.page === 'watch' ? new URLSearchParams(location.search).get('v') : null);

  async function load(id, cats) {
    current = { id, key: id + '|' + cats.join(','), segments: [] };
    skipped = new Set();
    drawMarkers();
    if (!id || !cats.length || !Lull.alive()) return;
    let r = null;
    try {
      r = await chrome.runtime.sendMessage({ type: 'sponsorblock', id, cats });
    } catch (e) {
      return;
    }
    if (!r || !r.ok || current.id !== id) return;
    current.segments = r.segments;
    drawMarkers();
  }

  function check() {
    if (!current.segments.length || !video || video.paused || !Lull.on('yt.sponsorSkip')) return;
    if (document.querySelector('#movie_player.ad-showing')) return;
    const t = video.currentTime;
    for (const s of current.segments) {
      const [a, b] = s.segment;
      if (t >= a && t < b - 0.25 && !skipped.has(s.UUID)) {
        skipped.add(s.UUID);
        video.currentTime = Math.min(b, video.duration || b);
        const name = (CATS[s.category] || {}).name || s.category;
        Lull.toast(`Skipped ${name}`, { label: 'Undo', run: () => (video.currentTime = a) });
      }
    }
  }

  function drawMarkers() {
    const bar = document.querySelector('#movie_player .ytp-progress-bar');
    let box = bar && bar.querySelector('.lull-sb-markers');
    const show = bar && current.segments.length && Lull.on('yt.sponsorSkip') && video && video.duration;
    if (!show) {
      if (box) box.remove();
      return;
    }
    if (!box) {
      box = document.createElement('div');
      box.className = 'lull-sb-markers';
      bar.append(box);
    }
    const key = current.key + '|' + Math.round(video.duration);
    if (box.dataset.key === key) return;
    box.dataset.key = key;
    box.replaceChildren(
      ...current.segments.map((s) => {
        const i = document.createElement('i');
        const [a, b] = s.segment;
        i.style.left = (a / video.duration) * 100 + '%';
        i.style.width = Math.max(0.3, ((b - a) / video.duration) * 100) + '%';
        i.style.background = (CATS[s.category] || {}).color || '#00d400';
        i.title = (CATS[s.category] || {}).name || s.category;
        return i;
      })
    );
  }

  function watch() {
    const v = document.querySelector('#movie_player video.html5-main-video, #movie_player video');
    if (v && v !== video) {
      if (video) video.removeEventListener('timeupdate', check);
      video = v;
      video.addEventListener('timeupdate', check);
      video.addEventListener('loadedmetadata', drawMarkers);
    }
    const id = videoId();
    const cats = Lull.on('yt.sponsorSkip') ? enabledCats() : [];
    const key = (id || '') + '|' + cats.join(',');
    if (key !== current.key) load(id, cats);
    else drawMarkers();
  }

  Lull.onMutate(watch);
})();
