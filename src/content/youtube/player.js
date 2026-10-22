// Resizable recommendations column on watch pages.
(() => {
  const Lull = globalThis.Lull;
  if (Lull.site !== 'yt') return;

  const MIN = 300;
  const MAX = 760;
  const MIN_PRIMARY = 480;
  let dragging = false;

  const nudgeLayout = () => window.dispatchEvent(new Event('resize'));

  function setWidth(flexy, w) {
    if (w == null) {
      flexy.style.removeProperty('--ytd-watch-flexy-sidebar-width');
      flexy.style.removeProperty('--lull-side-w');
      return;
    }
    flexy.style.setProperty('--ytd-watch-flexy-sidebar-width', w + 'px');
    flexy.style.setProperty('--lull-side-w', w + 'px');
  }

  function attach(secondary, flexy) {
    const handle = document.createElement('div');
    handle.className = 'lull-resizer';
    handle.title = 'Drag to resize';
    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      dragging = true;
      handle.setPointerCapture(e.pointerId);
      handle.classList.add('lull-dragging');
      document.documentElement.classList.add('lull-resizing');
      const right = secondary.getBoundingClientRect().right;
      const cols = flexy.querySelector('#columns').getBoundingClientRect();
      let w = Lull.settings.yt.sidebarWidth;
      let frame = 0;
      const move = (ev) => {
        w = Math.round(Math.min(MAX, Math.max(MIN, right - ev.clientX, 0), cols.width - MIN_PRIMARY));
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          setWidth(flexy, w);
          nudgeLayout();
        });
      };
      const up = () => {
        dragging = false;
        handle.classList.remove('lull-dragging');
        document.documentElement.classList.remove('lull-resizing');
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
        Lull.save('yt.sidebarWidth', Math.max(MIN, w));
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
    handle.addEventListener('dblclick', () => Lull.save('yt.sidebarWidth', 402));
    secondary.prepend(handle);
  }

  let lastApplied = null;
  function ensure() {
    if (dragging) return;
    const flexy = document.querySelector('ytd-watch-flexy');
    if (!flexy) return;
    const on = Lull.on('yt.resizableSidebar');
    const secondary = flexy.querySelector('#secondary');
    if (on && secondary && !secondary.querySelector(':scope > .lull-resizer')) attach(secondary, flexy);
    const w = on ? Lull.settings.yt.sidebarWidth : null;
    if (w !== lastApplied) {
      lastApplied = w;
      setWidth(flexy, w);
      nudgeLayout();
    }
  }

  Lull.onMutate(ensure);

  // ---- playback defaults ------------------------------------------------------
  // Speed and quality are applied by page.js (inside YouTube's page); this side
  // just hands it the preferences.
  function sendPlayback() {
    const on = Lull.settings && Lull.settings.yt.enabled;
    const prefs = on ? { speed: Lull.settings.yt.speed, quality: Lull.settings.yt.quality } : { speed: 1, quality: 'auto' };
    document.dispatchEvent(new CustomEvent('lull:playback', { detail: JSON.stringify(prefs) }));
  }
  document.addEventListener('lull:hello', sendPlayback);

  // Theater mode: press YouTube's own size button once per watch page.
  let theaterFor = '';
  function theater() {
    if (!Lull.on('yt.theater') || Lull.page !== 'watch' || theaterFor === location.href || document.fullscreenElement) return;
    const flexy = document.querySelector('ytd-watch-flexy');
    const button = document.querySelector('#movie_player .ytp-size-button');
    if (!flexy || !button) return;
    theaterFor = location.href;
    if (!flexy.hasAttribute('theater')) button.click();
  }

  Lull.register({ init: sendPlayback, update: sendPlayback });
  Lull.onRoute(sendPlayback);
  Lull.onMutate(theater);
})();
