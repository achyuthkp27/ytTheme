// Dislike count and the classic like/dislike ratio bar on watch pages.
// Counts come from the Return YouTube Dislike API via the background worker.
(() => {
  const Lull = globalThis.Lull;
  if (Lull.site !== 'yt') return;

  const cache = new Map();
  const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
  const full = new Intl.NumberFormat();

  const videoId = () => (Lull.page === 'watch' ? new URLSearchParams(location.search).get('v') : null);

  function votes(id) {
    if (!cache.has(id)) {
      if (!Lull.alive()) return Promise.resolve(null);
      const p = Promise.resolve()
        .then(() => chrome.runtime.sendMessage({ type: 'ryd', id }))
        .then((r) => (r && r.ok ? r.data : null))
        .catch(() => null);
      p.then((d) => !d && cache.delete(id));
      cache.set(id, p);
    }
    return cache.get(id);
  }

  const pressed = (btn) => (btn && btn.getAttribute('aria-pressed') === 'true' ? 1 : 0);

  function likesFrom(btn) {
    const digits = ((btn && btn.getAttribute('aria-label')) || '').replace(/[^\d]/g, '');
    return digits ? Number(digits) : null;
  }

  // The vote state when the counts were fetched, so the user's own click shows up.
  const baseline = new Map();

  function paint(seg, id, data) {
    const likeBtn = seg.querySelector('like-button-view-model button');
    const dBtn = seg.querySelector('dislike-button-view-model button');
    if (!dBtn) return;
    if (!baseline.has(id)) baseline.set(id, { d: pressed(dBtn), l: pressed(likeBtn) });
    const base = baseline.get(id);
    const dislikes = Math.max(0, data.dislikes + pressed(dBtn) - base.d);
    const likes = likesFrom(likeBtn) ?? Math.max(0, data.likes + pressed(likeBtn) - base.l);

    let span = dBtn.querySelector('.lull-dislike-count');
    if (!span) {
      span = document.createElement('span');
      span.className = 'lull-dislike-count';
      const icon = dBtn.querySelector('[class*="ButtonShapeNextIcon"]');
      if (icon) icon.after(span);
      else dBtn.append(span);
    }
    if (!dBtn.classList.contains('lull-has-count')) dBtn.classList.add('lull-has-count');
    const txt = compact.format(dislikes);
    if (span.textContent !== txt) span.textContent = txt;

    let bar = seg.querySelector('.lull-likebar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'lull-likebar';
      bar.append(document.createElement('i'));
      seg.append(bar);
    }
    const total = likes + dislikes;
    const pct = total ? (likes / total) * 100 : 50;
    const width = pct.toFixed(1) + '%';
    if (bar.firstChild.style.width !== width) bar.firstChild.style.width = width;
    bar.title = `${full.format(likes)} likes · ${full.format(dislikes)} dislikes (${Math.round(pct)}%)`;
  }

  async function render() {
    if (!(Lull.on('yt.dislikes') || Lull.on('yt.likeBar'))) return;
    const id = videoId();
    if (!id) return;
    const seg = document.querySelector('ytd-watch-metadata segmented-like-dislike-button-view-model');
    if (!seg) return;
    const data = await votes(id);
    if (data && videoId() === id) paint(seg, id, data);
  }

  Lull.onMutate(render);
})();
