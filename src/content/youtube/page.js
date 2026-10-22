// Runs inside YouTube's own page (manifest "world": "MAIN") because the
// player's API (speed, quality) can't be reached from a content script. It
// only listens for ytTheme's playback preferences and applies them once per
// video, so changing speed or quality by hand mid-video still sticks.
(() => {
  const ORDER = ['tiny', 'small', 'medium', 'large', 'hd720', 'hd1080', 'hd1440', 'hd2160', 'highres'];
  let prefs = { speed: 1, quality: 'auto' };
  let doneFor = '';

  document.addEventListener('lull:playback', (e) => {
    try {
      prefs = JSON.parse(e.detail);
    } catch (err) {
      return;
    }
    doneFor = '';
    apply();
  });
  // Ask the content script for the current preferences (it may have sent
  // them before this script was listening).
  document.dispatchEvent(new CustomEvent('lull:hello'));

  function apply() {
    const p = document.getElementById('movie_player');
    if (!p || typeof p.getVideoData !== 'function' || p.classList.contains('ad-showing')) return;
    const id = (p.getVideoData() || {}).video_id;
    if (!id || id === doneFor) return;
    const levels = typeof p.getAvailableQualityLevels === 'function' ? p.getAvailableQualityLevels() : [];
    if (!levels.length) return; // the video hasn't loaded its formats yet
    doneFor = id;

    if (prefs.speed && prefs.speed !== 1 && typeof p.setPlaybackRate === 'function') p.setPlaybackRate(prefs.speed);

    if (prefs.quality && prefs.quality !== 'auto') {
      // The best available quality at or below the preferred one.
      const want = ORDER.indexOf(prefs.quality);
      const known = levels.filter((q) => ORDER.includes(q)).sort((a, b) => ORDER.indexOf(b) - ORDER.indexOf(a));
      const pick = known.find((q) => ORDER.indexOf(q) <= want) || known[known.length - 1];
      if (pick) {
        if (typeof p.setPlaybackQualityRange === 'function') p.setPlaybackQualityRange(pick, pick);
        if (typeof p.setPlaybackQuality === 'function') p.setPlaybackQuality(pick);
      }
    }
  }

  setInterval(apply, 1000);
})();
