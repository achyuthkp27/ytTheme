// Soft sounds (synthesised, no audio files) and the YouTube watch room glow.
(() => {
  const Lull = globalThis.Lull;

  // ---- sounds ---------------------------------------------------------------
  let ctx = null;
  let last = 0;
  const TONES = {
    tick: [{ f: 1320, to: 880, d: 0.05, g: 0.5 }],
    soft: [{ f: 660, to: 660, d: 0.16, g: 0.45 }, { f: 990, to: 990, d: 0.22, g: 0.3, at: 0.07 }],
  };

  function play(kind = 'tick') {
    const s = Lull.settings;
    if (!s || !s.design.sounds) return;
    if (Lull.designOn && !Lull.designOn()) return;
    const now = performance.now();
    if (now - last < 60) return;
    last = now;
    try {
      ctx = ctx || new AudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      const vol = s.design.volume * 0.12;
      for (const t of TONES[kind] || TONES.tick) {
        const start = ctx.currentTime + (t.at || 0);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(t.f, start);
        osc.frequency.exponentialRampToValueAtTime(t.to, start + t.d);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(vol * t.g, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + t.d);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + t.d + 0.02);
      }
    } catch (e) {
      // Audio can be unavailable (autoplay policy before any gesture); stay quiet.
    }
  }
  Lull.sound = { play };

  if (!Lull.register) return; // popup / options: sounds only

  const CLICKABLE = 'button, a[href], [role="button"], [role="tab"], [role="menuitem"], tp-yt-paper-item, yt-chip-cloud-chip-renderer, input[type="checkbox"]';
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button === 0 && e.target.closest && e.target.closest(CLICKABLE)) play('tick');
    },
    true
  );

  // ---- watch room (YouTube) -------------------------------------------------
  if (Lull.site !== 'yt') return;
  const root = document.documentElement;
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 9;
  const g2d = canvas.getContext('2d', { willReadFrequently: true });
  let timer = 0;
  let tainted = false;

  function sample(video) {
    if (tainted || video.readyState < 2) return null;
    try {
      g2d.drawImage(video, 0, 0, 16, 9);
      const px = g2d.getImageData(0, 0, 16, 9).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < px.length; i += 4) {
        r += px[i];
        g += px[i + 1];
        b += px[i + 2];
      }
      const n = px.length / 4;
      // Lift dark frames a little so the glow stays visible.
      const lift = (v) => Math.round(Math.min(255, v / n * 1.15 + 18));
      return `rgb(${lift(r)}, ${lift(g)}, ${lift(b)})`;
    } catch (e) {
      tainted = true;
      return null;
    }
  }

  function tick() {
    if (!Lull.alive()) return clearInterval(timer);
    const active = Lull.page === 'watch' && Lull.designOn() && Lull.settings.design.watchRoom;
    const video = active && document.querySelector('#movie_player video.html5-main-video, #movie_player video');
    const playing = !!(video && !video.paused && !video.ended && !document.fullscreenElement && !document.querySelector('#movie_player.ad-showing'));
    root.classList.toggle('lull-room-playing', playing);
    if (!active) {
      root.style.removeProperty('--lull-glow');
      return;
    }
    if (playing) {
      const c = sample(video);
      root.style.setProperty('--lull-glow', c || 'var(--lull-accent, rgba(120,140,255,.8))');
    }
  }

  Lull.register({
    init() {
      timer = setInterval(tick, 450);
    },
  });
})();
