// In-page settings: a small customize button, an edit mode that outlines the
// part of the page under the cursor, and floating panels with that part's
// settings. Also hosts toasts and popovers used by other modules.
(() => {
  const Lull = globalThis.Lull;
  const { el, ICONS } = Lull.ui;

  const CSS = `
    :host{all:initial}
    .lull-ui{font-size:13px}
    .fab{position:fixed;right:18px;bottom:var(--fab-bottom,18px);width:40px;height:40px;border-radius:50%;display:grid;place-items:center;cursor:pointer;pointer-events:auto;
      background:rgba(22,23,30,.72);color:#fff;border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(14px) saturate(1.4);
      box-shadow:0 6px 24px rgba(0,0,0,.28);opacity:.5;transition:opacity .2s,transform .2s,background .2s}
    .fab:hover,.fab:focus-visible{opacity:1;transform:scale(1.06);outline:none}
    .fab.on{opacity:1;background:var(--l-accent);color:var(--l-ink)}
    .fab svg{width:19px;height:19px}
    .outline{position:fixed;border:2px solid var(--l-accent);border-radius:12px;background:color-mix(in srgb,var(--l-accent) 9%,transparent);pointer-events:none;transition:all .12s ease}
    .outline .tag{position:absolute;top:6px;left:6px;background:var(--l-accent);color:var(--l-ink);font-weight:650;font-size:12px;padding:3px 9px;border-radius:7px;white-space:nowrap}
    .banner{position:fixed;top:12px;left:50%;transform:translateX(-50%);pointer-events:auto;display:flex;align-items:center;gap:12px;padding:6px 6px 6px 16px;border-radius:999px;
      background:var(--l-panel);border:1px solid var(--l-line);backdrop-filter:blur(20px) saturate(1.4);box-shadow:0 10px 40px rgba(0,0,0,.3);color:var(--l-text);white-space:nowrap}
    .banner .l-btn{height:30px;border-radius:999px}
    .panel{position:fixed;width:330px;max-height:calc(100vh - 32px);overflow:auto;pointer-events:auto;border-radius:18px;padding:0 16px 12px;
      background:var(--l-panel);border:1px solid var(--l-line);backdrop-filter:blur(26px) saturate(1.5);box-shadow:0 24px 70px rgba(0,0,0,.38);color:var(--l-text);
      animation:pop .18s cubic-bezier(.2,.8,.3,1) both;overscroll-behavior:contain}
    @keyframes pop{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}
    .panel header{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:8px;height:50px;margin:0 -16px;padding:0 10px 0 16px;background:inherit;backdrop-filter:inherit}
    .panel header svg{color:var(--l-accent)}
    .panel header b{font-size:14px;font-weight:650;flex:1}
    .icon-btn{width:30px;height:30px;border-radius:9px;border:0;background:none;color:var(--l-text2);display:grid;place-items:center;cursor:pointer}
    .icon-btn:hover{background:var(--l-hover);color:var(--l-text)}
    .icon-btn svg{width:16px;height:16px}
    .panel footer{display:flex;justify-content:flex-end;padding-top:10px;margin-top:4px;border-top:1px solid var(--l-line)}
    .l-word{display:grid;gap:12px;padding:4px 0 6px}
    .l-pick{padding:0 10px;cursor:pointer;color:var(--l-text)}
    .l-pick:hover{border-color:var(--l-accent)}
    .toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);pointer-events:auto;display:flex;align-items:center;gap:14px;padding:8px 8px 8px 16px;border-radius:14px;
      background:var(--l-panel);border:1px solid var(--l-line);backdrop-filter:blur(20px);box-shadow:0 12px 40px rgba(0,0,0,.3);color:var(--l-text);animation:pop .2s both}
    .toast .l-btn{height:28px}
    @media (prefers-reduced-motion:reduce){.panel,.toast{animation:none}}
  `;

  let host = null;
  let root = null;
  let sheet = null;

  function layer() {
    if (root) {
      if (!host.isConnected) document.documentElement.append(host);
      return root;
    }
    host = document.createElement('lull-layer');
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483646;pointer-events:none;display:block';
    root = host.attachShadow({ mode: 'open' });
    Lull.ui.adopt(root);
    sheet = new CSSStyleSheet();
    sheet.replaceSync(CSS);
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    // Keep keystrokes in our inputs away from site shortcuts (k, j, l, / …).
    for (const type of ['keydown', 'keyup', 'keypress']) host.addEventListener(type, (e) => e.stopPropagation());
    document.documentElement.append(host);
    return root;
  }
  const inLayer = (e) => host && e.composedPath().includes(host);
  const wrap = (...kids) => el('div', { class: 'lull-ui lull-dark' }, ...kids);

  // ---- toast ---------------------------------------------------------------
  let toastNode = null;
  let toastTimer = 0;
  Lull.toast = (text, action) => {
    const r = layer();
    if (toastNode) toastNode.remove();
    clearTimeout(toastTimer);
    const kids = [el('span', {}, text)];
    if (action) {
      const b = el('button', { class: 'l-btn', type: 'button' }, action.label);
      b.addEventListener('click', () => {
        action.run();
        toastNode.remove();
      });
      kids.push(b);
    }
    toastNode = wrap(el('div', { class: 'toast', role: 'status' }, ...kids));
    r.append(toastNode);
    toastTimer = setTimeout(() => toastNode && toastNode.remove(), 5000);
  };

  // ---- panels --------------------------------------------------------------
  let openPanelRef = null;

  function place(panel, anchor) {
    const w = 330;
    const h = Math.min(panel.offsetHeight || 420, innerHeight - 32);
    let x = anchor.x ?? anchor.left;
    let y = anchor.y ?? anchor.bottom + 8;
    if (x + w > innerWidth - 16) x = innerWidth - w - 16;
    if (y + h > innerHeight - 16) y = Math.max(16, innerHeight - h - 16);
    panel.style.left = Math.max(16, x) + 'px';
    panel.style.top = Math.max(16, y) + 'px';
  }

  Lull.openPanel = ({ title, icon = 'sparkle', body, controls, anchor, onClose }) => {
    if (openPanelRef) openPanelRef.close();
    const r = layer();
    const close = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', html: ICONS.close });
    const content = el('div');
    const panel = el('div', { class: 'panel', role: 'dialog', 'aria-label': title }, el('header', { html: ICONS[icon] || ICONS.sparkle }, el('b', {}, title), close), content);
    let mounted = null;
    if (body) content.append(body);
    if (controls) {
      mounted = Lull.ui.mount(content, controls, structuredClone(Lull.settings));
      const all = el('button', { class: 'l-btn', type: 'button' }, 'All settings');
      all.addEventListener('click', () => Lull.alive() && chrome.runtime.sendMessage({ type: 'open-options' }));
      panel.append(el('footer', {}, all));
    }
    const node = wrap(panel);
    r.append(node);
    place(panel, anchor || { x: innerWidth - 346, y: 70 });

    const onKey = (e) => e.key === 'Escape' && api.close();
    const onDown = (e) => {
      if (!inLayer(e) && !editing) api.close();
    };
    document.addEventListener('keydown', onKey, true);
    setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0);
    const api = {
      el: panel,
      update: (s) => mounted && mounted.update(structuredClone(s)),
      close() {
        document.removeEventListener('keydown', onKey, true);
        document.removeEventListener('pointerdown', onDown, true);
        node.remove();
        if (openPanelRef === api) openPanelRef = null;
        if (onClose) onClose();
      },
    };
    close.addEventListener('click', () => api.close());
    openPanelRef = api;
    return api;
  };

  // ---- regions -------------------------------------------------------------
  const YT = () => [
    { id: 'player', sel: '#movie_player, ytd-player', title: 'Player', icon: 'screen', keys: ['yt.cleanPlayer', 'design.watchRoom', 'yt.dislikes', 'yt.likeBar', 'yt.hideEndScreens', 'yt.skipVideoAds'] },
    { id: 'topbar', sel: '#masthead-container, ytd-masthead', title: 'Top bar & theme', icon: 'palette', keys: ['design.theme', 'design.custom.bg', 'design.custom.surface', 'design.custom.text', 'design.custom.accent', 'design.font', 'design.greeting', 'design.name', 'design.nameColor', 'design.nameCustom'] },
    { id: 'sidebar', sel: 'tp-yt-app-drawer, ytd-mini-guide-renderer, #guide', title: 'Sidebar', icon: 'sidebar', keys: ['design.rail', 'yt.shortcuts', 'yt.tidySidebar', 'yt.hideShorts', 'design.blur'] },
    { id: 'card', sel: Lull.yt ? Lull.yt.CARDS : 'ytd-rich-item-renderer', title: 'Cards', icon: 'layers', keys: ['design.overlayCards', 'design.perRow', 'design.cardOpacity', 'design.radius', 'yt.hideWatched', 'yt.watchedThreshold', 'yt.hideMixes', 'yt.menuActions'] },
    { id: 'comments', sel: 'ytd-comments', title: 'Comments', icon: 'eyeOff', keys: ['yt.hideComments'] },
    { id: 'related', sel: 'ytd-watch-flexy #secondary', title: 'Recommendations', icon: 'sidebar', keys: ['yt.hideRelated', 'yt.resizableSidebar', 'yt.sidebarWidth', 'yt.hideShorts'] },
  ];
  const BACKGROUND = { id: 'background', title: 'Background', icon: 'sparkle', keys: ['design.glass', 'design.background', 'design.bgFrame', 'design.blur', 'design.motion', 'design.sounds', 'design.volume'] };

  function regionAt(x, y) {
    const target = document.elementFromPoint(x, y);
    if (target && target !== document.documentElement && target !== document.body) {
      for (const r of YT()) {
        const node = target.closest(r.sel);
        if (node) return { ...r, node };
      }
    }
    return { ...BACKGROUND, node: null };
  }

  // ---- edit mode -----------------------------------------------------------
  let editing = false;
  let fab = null;
  let outline = null;
  let banner = null;

  function drawOutline(region) {
    const rect = region.node ? region.node.getBoundingClientRect() : { left: 8, top: 8, width: innerWidth - 16, height: innerHeight - 16 };
    outline.style.left = rect.left - 3 + 'px';
    outline.style.top = rect.top - 3 + 'px';
    outline.style.width = rect.width + 6 + 'px';
    outline.style.height = rect.height + 6 + 'px';
    outline.querySelector('.tag').textContent = region.title;
  }

  const onMove = (e) => {
    if (inLayer(e)) return;
    drawOutline(regionAt(e.clientX, e.clientY));
  };
  const swallow = (e) => {
    if (inLayer(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  };
  const onClick = (e) => {
    if (inLayer(e)) return;
    swallow(e);
    const region = regionAt(e.clientX, e.clientY);
    Lull.sound.play('soft');
    Lull.openPanel({ title: region.title, icon: region.icon, controls: Lull.ui.pick(region.keys), anchor: { x: e.clientX + 14, y: e.clientY + 14 } });
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && !openPanelRef) setEditing(false);
  };

  function setEditing(on) {
    if (on === editing) return;
    editing = on;
    const r = layer();
    fab.classList.toggle('on', on);
    fab.setAttribute('aria-pressed', String(on));
    const opts = { capture: true };
    if (on) {
      outline = wrap(el('div', { class: 'outline' }, el('span', { class: 'tag' })));
      outline = outline.firstChild;
      r.append(outline.parentNode);
      const done = el('button', { class: 'l-btn l-primary', type: 'button' }, 'Done');
      done.addEventListener('click', () => setEditing(false));
      banner = wrap(el('div', { class: 'banner' }, el('span', {}, 'Click any part of the page to customize it'), done));
      r.append(banner);
      addEventListener('pointermove', onMove, opts);
      for (const t of ['click', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'auxclick', 'dblclick']) addEventListener(t, t === 'click' ? onClick : swallow, opts);
      addEventListener('keydown', onKey, opts);
    } else {
      outline.parentNode.remove();
      banner.remove();
      outline = banner = null;
      if (openPanelRef) openPanelRef.close();
      removeEventListener('pointermove', onMove, opts);
      for (const t of ['click', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'auxclick', 'dblclick']) removeEventListener(t, t === 'click' ? onClick : swallow, opts);
      removeEventListener('keydown', onKey, opts);
    }
  }

  function ensureFab() {
    const want = Lull.on('design.editButton');
    if (!want) {
      if (fab) {
        setEditing(false);
        fab.parentNode.remove();
        fab = null;
      }
      return;
    }
    if (fab && fab.isConnected) return;
    const r = layer();
    fab = el('button', { class: 'fab', type: 'button', title: 'Customize this page (ytTheme)', 'aria-label': 'Customize this page', 'aria-pressed': 'false', html: ICONS.sparkle });
    fab.addEventListener('click', () => setEditing(!editing));
    r.append(wrap(fab));
  }

  Lull.register({
    init: ensureFab,
    update(next) {
      ensureFab();
      if (openPanelRef) openPanelRef.update(next);
    },
  });
})();
