// YouTube cleanup that CSS alone can't do: Shorts redirects and video ads.
(() => {
  const Lull = globalThis.Lull;
  if (Lull.site !== 'yt') return;

  function redirectShorts() {
    if (!Lull.on('yt.redirectShorts')) return;
    const m = location.pathname.match(/^\/shorts\/([\w-]{6,})/);
    if (m) location.replace('/watch?v=' + m[1]);
  }

  // Video ads: mute, fast-forward to the end, press Skip when it appears.
  const SKIP = '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-slot button, button[id^="skip-button"]';
  let watched = null;
  let restore = null;
  let timer = 0;

  function onAdState() {
    const player = document.getElementById('movie_player');
    if (!player) return;
    const video = player.querySelector('video');
    const ad = player.classList.contains('ad-showing') && Lull.on('yt.skipVideoAds');

    if (ad && video) {
      if (!restore) {
        restore = { muted: video.muted, rate: video.playbackRate };
        const root = document.documentElement;
        root.dataset.lullAdsSkipped = String(Number(root.dataset.lullAdsSkipped || 0) + 1);
      }
      video.muted = true;
      if (Number.isFinite(video.duration) && video.duration > 0 && video.currentTime < video.duration - 0.1) {
        video.currentTime = video.duration - 0.05;
      }
      video.playbackRate = 16;
      // A paused ad parked at its last frame never ends on its own.
      if (video.paused) video.play().catch(() => {});
      for (const b of player.querySelectorAll(SKIP)) b.click();
      if (!timer) timer = setInterval(onAdState, 300);
      return;
    }
    if (timer) {
      clearInterval(timer);
      timer = 0;
    }
    if (restore && video) {
      if (video.playbackRate === 16) video.playbackRate = restore.rate;
      video.muted = restore.muted;
      restore = null;
    }
  }

  function watchPlayer() {
    const player = document.getElementById('movie_player');
    if (!player || player === watched) return;
    watched = player;
    new MutationObserver(onAdState).observe(player, { attributes: true, attributeFilter: ['class'] });
    onAdState();
  }

  // Stop autoplay: turn the player's own toggle off. YouTube remembers the
  // choice, so this usually happens once.
  let autoplayFor = '';
  function stopAutoplay() {
    if (!Lull.on('yt.noAutoplay') || Lull.page !== 'watch' || autoplayFor === location.href) return;
    const toggle = document.querySelector('#movie_player .ytp-autonav-toggle-button[aria-checked="true"]');
    if (!toggle) return;
    autoplayFor = location.href;
    (toggle.closest('button') || toggle).click();
  }

  Lull.register({
    early: redirectShorts,
    init: watchPlayer,
  });
  Lull.onRoute(redirectShorts);
  Lull.onMutate(watchPlayer);
  Lull.onMutate(stopAutoplay);
})();
