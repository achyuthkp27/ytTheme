// Schema-driven settings controls, shared by the popup, the options page and
// the in-page panels. Every control is described once here.
(() => {
  const Lull = (globalThis.Lull = globalThis.Lull || {});

  const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    play: svg('<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/>'),
    x: svg('<path d="M5 4.5l14 15M19 4.5l-14 15"/>'),
    layers: svg('<path d="M12 3.5l9 4.8-9 4.8-9-4.8z"/><path d="M3 13l9 4.8 9-4.8"/>'),
    palette: svg('<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.3-1-1.6-1-2.6 0-.9.7-1.5 1.7-1.5h2a4 4 0 0 0 4-4C20.5 6.6 16.7 3.5 12 3.5z"/><circle cx="7.8" cy="11" r="1.1" fill="currentColor"/><circle cx="10.5" cy="7.4" r="1.1" fill="currentColor"/><circle cx="15" cy="7.6" r="1.1" fill="currentColor"/>'),
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
    eyeOff: svg('<path d="M3.5 3.5l17 17"/><path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c5 0 8.5 4.6 9.3 6.5-.4.9-1.3 2.3-2.6 3.6M6.4 6.9C4.6 8.1 3.3 10 2.7 12c.8 1.9 4.3 6.5 9.3 6.5 1.6 0 3-.5 4.3-1.2"/><path d="M9.9 10a3 3 0 0 0 4.1 4.1"/>'),
    sidebar: svg('<rect x="3" y="4" width="18" height="16" rx="3.5"/><path d="M9 4v16M5.5 8.5h1.5M5.5 11.5h1.5"/>'),
    clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    screen: svg('<rect x="2.5" y="4.5" width="19" height="12.5" rx="3"/><path d="M8.5 20.5h7"/>'),
    data: svg('<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-6"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    close: svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
    sparkle: svg('<path d="M12 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5z"/><path d="M18.5 15.5c.3 1.7 1.1 2.5 2.8 2.8-1.7.3-2.5 1.1-2.8 2.8-.3-1.7-1.1-2.5-2.8-2.8 1.7-.3 2.5-1.1 2.8-2.8z"/>'),
    upload: svg('<path d="M12 15.5V4.5M7.5 9L12 4.5 16.5 9"/><path d="M4.5 15v2.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>'),
  };

  const t = (key, type, label, extra = {}) => ({ key, type, label, ...extra });
  const tog = (key, label, hint) => t(key, 'toggle', label, hint ? { hint } : {});

  const SECTIONS = [
    {
      id: 'yt-clean', group: 'Clean', title: 'YouTube', icon: 'play',
      blurb: 'Every switch works on its own. Changes apply instantly.',
      controls: [
        tog('yt.enabled', 'ytTheme on YouTube', 'Turn this off to see YouTube untouched.'),
        tog('yt.hideShorts', 'Hide Shorts', 'Shorts shelves, Shorts in search and feeds, and the sidebar entry.'),
        tog('yt.redirectShorts', 'Open Shorts as normal videos', 'A /shorts/ link plays in the regular player.'),
        tog('yt.hideAds', 'Hide ads', 'Feed ads, banners, merch shelves and promoted results.'),
        tog('yt.skipVideoAds', 'Skip video ads', 'Mutes and fast-forwards ads that play in the player.'),
        tog('yt.hideHomeFeed', 'Hide home recommendations', 'The home page shows only your greeting and search.'),
        tog('yt.hideGames', 'Hide games', 'Playables shelves, the Gaming topic chip and the Playables and Gaming sidebar entries.'),
        tog('yt.hideChips', 'Hide topic chips', 'The row of topic filters above the feed and the “Explore more topics” shelf.'),
        tog('yt.hideMixes', 'Hide Mixes', 'Auto-generated Mix playlists in feeds and suggestions.'),
        tog('yt.hideRelated', 'Hide recommended videos', 'The column of suggestions next to the player.'),
        tog('yt.hideEndScreens', 'Hide end screens', 'End cards and the video wall when a video ends.'),
        tog('yt.hideComments', 'Hide comments'),
        tog('yt.noAutoplay', 'Stop autoplay', 'The next video doesn’t start on its own.'),
        tog('yt.tidySidebar', 'Tidy sidebar', 'Hides Explore, More from YouTube and the footer links in the sidebar.'),
        tog('yt.dislikes', 'Show dislike count', 'Counts come from Return YouTube Dislike.'),
        tog('yt.likeBar', 'Classic like bar', 'A thin ratio bar under the like and dislike buttons.'),
      ],
    },
    {
      id: 'layout', group: 'Design', title: 'Glass layout', icon: 'layers',
      blurb: 'Floating bars and frosted cards over a background you choose.',
      controls: [
        tog('design.glass', 'Glass layout'),
        t('design.background', 'backgrounds', 'Background'),
        t('design.bgFrame', 'crop', 'Show this part of your picture', { hint: 'Drag the picture or use the arrow keys. Zoom in to fill or crop tighter.', showIf: (s) => s.design.background === 'custom' }),
        tog('design.rail', 'Floating icon rail', 'A small bar of icons instead of the full sidebar.'),
        tog('design.overlayCards', 'Overlay cards', 'Titles sit on a strip across the thumbnail instead of below it.'),
        t('design.perRow', 'range', 'Videos per row', { min: 0, max: 6, step: 1, zero: 'Auto' }),
        t('design.blur', 'range', 'Frost', { min: 0, max: 40, step: 1, unit: 'px' }),
        t('design.cardOpacity', 'range', 'Card opacity', { min: 0.15, max: 0.95, step: 0.05, pct: true }),
        t('design.radius', 'range', 'Corner radius', { min: 0, max: 28, step: 1, unit: 'px' }),
      ],
    },
    {
      id: 'theme', group: 'Design', title: 'Theme & fonts', icon: 'palette',
      blurb: 'Pick a ready-made palette or mix your own.',
      controls: [
        t('design.theme', 'themes', 'Theme'),
        t('design.custom.bg', 'color', 'Background', { showIf: (s) => s.design.theme === 'custom' }),
        t('design.custom.surface', 'color', 'Surface', { showIf: (s) => s.design.theme === 'custom' }),
        t('design.custom.text', 'color', 'Text', { showIf: (s) => s.design.theme === 'custom' }),
        t('design.custom.accent', 'color', 'Accent', { showIf: (s) => s.design.theme === 'custom' }),
        t('design.font', 'select', 'Font', { options: () => Object.fromEntries(Object.entries(Lull.FONTS).map(([k, v]) => [k, v.label])) }),
      ],
    },
    {
      id: 'mood', group: 'Design', title: 'Greeting & mood', icon: 'sun',
      blurb: 'Small touches that make the page feel calmer.',
      controls: [
        tog('design.greeting', 'Greeting on the YouTube home page'),
        t('design.name', 'text', 'Your name', { placeholder: 'What should ytTheme call you?', showIf: (s) => s.design.greeting }),
        t('design.nameColor', 'select', 'Name colour', { options: () => ({ auto: 'Match wallpaper', text: 'Same as greeting', accent: 'Theme accent', custom: 'Pick a colour' }), showIf: (s) => s.design.greeting && s.design.name }),
        t('design.nameCustom', 'color', 'Your colour', { showIf: (s) => s.design.greeting && s.design.name && s.design.nameColor === 'custom' }),
        tog('design.watchRoom', 'Watch room', 'Dims the page and lets the video’s colours glow around the player.'),
        tog('design.motion', 'Gentle motion', 'A slowly drifting background and soft card fades.'),
        tog('design.sounds', 'Soft sounds', 'Quiet clicks when you press buttons.'),
        t('design.volume', 'range', 'Volume', { min: 0.05, max: 1, step: 0.05, pct: true, showIf: (s) => s.design.sounds }),
        tog('design.editButton', 'Show the customize button', 'A small button in the corner of the page for in-page settings.'),
      ],
    },
    {
      id: 'hiding', group: 'YouTube tools', title: 'Hiding', icon: 'eyeOff',
      blurb: 'Hide channels, words and videos you have already watched.',
      controls: [
        tog('yt.menuActions', 'Add “Hide” actions to the ⋮ menu', 'Hide a channel or a word straight from a video’s menu.'),
        tog('yt.quickNotInterested', 'Not interested button on videos', 'One click runs YouTube’s own “Not interested”. Shift-click: “Don’t recommend channel”.'),
        tog('yt.hideWatched', 'Hide watched videos'),
        t('yt.watchedThreshold', 'range', 'Watched means at least', { min: 10, max: 100, step: 5, unit: '%', showIf: (s) => s.yt.hideWatched }),
        t('yt.blockedChannels', 'list', 'Hidden channels', { placeholder: 'Channel name or @handle' }),
        t('yt.blockedWords', 'list', 'Hidden words', { placeholder: 'A word or phrase in titles' }),
      ],
    },
    {
      id: 'subs', group: 'YouTube tools', title: 'Sort & topics', icon: 'play',
      blurb: 'Find what’s doing well among the channels you follow.',
      controls: [
        tog('yt.sorter', 'Sort and filter bar', 'On Home, Subscriptions and a channel’s Videos tab: pick a topic (AI, Tech or your own words), sort by Newest, Most viewed or Taking off, and limit to the last 24 hours or this week.'),
        t('yt.subsSort', 'select', 'Sort by', { options: () => ({ newest: 'Newest', views: 'Most viewed', rising: 'Taking off (views per hour)' }), showIf: (s) => s.yt.sorter }),
        t('yt.subsWindow', 'select', 'Uploaded', { options: () => ({ any: 'Any time', day: 'Last 24 hours', week: 'This week' }), showIf: (s) => s.yt.sorter }),
        t('yt.subsTopic', 'select', 'Topic', { options: () => ({ all: 'All', ai: 'AI', tech: 'Tech', mine: 'Mine (your words)' }), showIf: (s) => s.yt.sorter }),
        t('yt.topicWords', 'list', 'Your topic words', { placeholder: 'e.g. robotics, F1, chess', showIf: (s) => s.yt.sorter }),
      ],
    },
    {
      id: 'sidebar', group: 'YouTube tools', title: 'Sidebar', icon: 'sidebar',
      controls: [tog('yt.shortcuts', 'Shortcuts', 'History, Playlists, Watch later and Liked at the top of the sidebar.')],
    },
    {
      id: 'history', group: 'YouTube tools', title: 'History search', icon: 'clock',
      blurb: 'ytTheme keeps a private list of videos you open, only in this browser, so you can search it later.',
      controls: [
        tog('yt.historySearch', 'Search box on the History page'),
        t('', 'button', 'Clear ytTheme’s watch list', { action: 'clearHistory', danger: true }),
      ],
    },
    {
      id: 'player', group: 'YouTube tools', title: 'Player', icon: 'screen',
      controls: [
        tog('yt.cleanPlayer', 'Cleaner player', 'Removes the watermark, info cards, pause overlays and the fullscreen video grid.'),
        tog('yt.resizableSidebar', 'Resizable recommendations column', 'Drag the column’s left edge to widen it.'),
        t('yt.sidebarWidth', 'range', 'Column width', { min: 300, max: 760, step: 10, unit: 'px', showIf: (s) => s.yt.resizableSidebar }),
      ],
    },
  ];

  const ALL = SECTIONS.flatMap((s) => s.controls);
  const pick = (keys) => keys.map((k) => ALL.find((c) => c.key === k)).filter(Boolean);

  const CSS = `
  .lull-ui{--l-bg:#f7f6f3;--l-panel:#fff;--l-text:#1c1c21;--l-text2:#6a6a75;--l-line:rgba(20,20,30,.09);--l-accent:#5a67f2;--l-accent2:#2bb3a3;--l-ink:#fff;--l-track:#d6d6de;--l-hover:rgba(20,20,40,.045);--l-danger:#d14343;
    color:var(--l-text);font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;color-scheme:light}
  @media (prefers-color-scheme:dark){.lull-ui:not(.lull-light){--l-bg:#111217;--l-panel:#1a1b21;--l-text:#ececf1;--l-text2:#9b9cab;--l-line:rgba(255,255,255,.08);--l-accent:#8b95ff;--l-ink:#0d0e14;--l-track:#3a3b47;--l-hover:rgba(255,255,255,.05);--l-danger:#ff7b7b;color-scheme:dark}}
  .lull-ui.lull-dark{--l-bg:#111217;--l-panel:rgba(26,27,33,.86);--l-text:#ececf1;--l-text2:#a3a4b2;--l-line:rgba(255,255,255,.09);--l-accent:#8b95ff;--l-ink:#0d0e14;--l-track:#3a3b47;--l-hover:rgba(255,255,255,.06);--l-danger:#ff7b7b;color-scheme:dark}
  .lull-ui *,.lull-ui *::before,.lull-ui *::after{box-sizing:border-box}
  .lull-ui svg{width:18px;height:18px;flex:none}
  .l-row{display:flex;align-items:center;gap:12px;padding:9px 2px;min-height:44px}
  .l-row+.l-row{border-top:1px solid var(--l-line)}
  .l-row.l-stack{flex-direction:column;align-items:stretch;gap:8px}
  .l-row[hidden]{display:none}
  .l-text{flex:1;min-width:0}
  .l-label{font-weight:550;letter-spacing:-.005em}
  .l-hint{color:var(--l-text2);font-size:12px;margin-top:2px}
  .l-switch{position:relative;width:36px;height:21px;flex:none;border-radius:99px;background:var(--l-track);border:0;padding:0;cursor:pointer;transition:background .18s}
  .l-switch::after{content:"";position:absolute;top:2.5px;left:2.5px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .2s cubic-bezier(.3,.7,.4,1)}
  .l-switch[aria-checked=true]{background:var(--l-accent)}
  .l-switch[aria-checked=true]::after{transform:translateX(15px)}
  .l-switch:focus-visible,.l-btn:focus-visible,.l-tile:focus-visible,.l-input:focus-visible{outline:2px solid var(--l-accent);outline-offset:2px}
  .l-range-head{display:flex;justify-content:space-between;align-items:baseline}
  .l-value{color:var(--l-text2);font-variant-numeric:tabular-nums;font-size:12px}
  .l-range{width:100%;accent-color:var(--l-accent);margin:2px 0 0}
  .l-input,.l-select{width:100%;height:32px;border-radius:9px;border:1px solid var(--l-line);background:var(--l-bg);color:var(--l-text);padding:0 10px;font:inherit}
  .l-select{width:auto;min-width:130px;cursor:pointer}
  .l-color{width:36px;height:28px;border:1px solid var(--l-line);border-radius:8px;padding:2px;background:var(--l-bg);cursor:pointer}
  .l-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(74px,1fr));gap:8px}
  .l-tile{position:relative;border:1px solid var(--l-line);border-radius:12px;padding:0;background:var(--l-bg);cursor:pointer;overflow:hidden;color:var(--l-text);font:inherit;text-align:left}
  .l-tile[aria-pressed=true]{border-color:var(--l-accent);box-shadow:0 0 0 2px var(--l-accent)}
  .l-swatch{height:46px;display:block;background-size:cover;background-position:center}
  .l-tile span.l-name{display:block;padding:5px 8px 6px;font-size:11.5px;font-weight:550;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .l-theme{height:46px;display:flex;align-items:flex-end;gap:4px;padding:7px}
  .l-theme i{display:block;border-radius:5px;height:100%;flex:1}
  .l-theme i.a{flex:none;width:10px;height:10px;border-radius:50%;align-self:flex-end}
  .l-none{background:repeating-linear-gradient(135deg,var(--l-hover) 0 6px,transparent 6px 12px)}
  .l-upload{display:flex;align-items:center;justify-content:center;color:var(--l-text2)}
  .l-chips{display:flex;flex-wrap:wrap;gap:6px}
  .l-chip{display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 4px 0 10px;border-radius:99px;background:var(--l-hover);border:1px solid var(--l-line);font-size:12px}
  .l-chip button{border:0;background:none;color:var(--l-text2);cursor:pointer;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;padding:0}
  .l-chip button:hover{background:var(--l-line);color:var(--l-text)}
  .l-chip svg{width:12px;height:12px}
  .l-add{display:flex;gap:6px}
  .l-btn{height:32px;padding:0 12px;border-radius:9px;border:1px solid var(--l-line);background:var(--l-panel);color:var(--l-text);font:inherit;font-weight:550;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
  .l-btn:hover{background:var(--l-hover)}
  .l-btn.l-primary{background:var(--l-accent);border-color:transparent;color:var(--l-ink)}
  .l-btn.l-danger{color:var(--l-danger)}
  .l-empty{color:var(--l-text2);font-size:12px}
  .l-crop{position:relative;width:100%;border-radius:12px;overflow:hidden;border:1px solid var(--l-line);background:var(--l-hover);cursor:grab;touch-action:none;user-select:none}
  .l-crop:active{cursor:grabbing}
  .l-crop:focus-visible{outline:2px solid var(--l-accent);outline-offset:2px}
  .l-crop-pic{position:absolute;inset:0;background-size:cover;background-repeat:no-repeat;pointer-events:none}
  .l-crop-tag{position:absolute;left:8px;bottom:8px;padding:3px 9px;border-radius:99px;background:rgba(0,0,0,.55);color:#fff;font-size:11px;font-weight:600;pointer-events:none}
  .l-crop-row{display:flex;align-items:center;gap:10px}
  .l-crop-row .l-range{flex:1;margin:0}
  `;

  let sheet;
  const adopt = (target) => {
    if (!sheet) {
      sheet = new CSSStyleSheet();
      sheet.replaceSync(CSS);
    }
    target.adoptedStyleSheets = [...target.adoptedStyleSheets.filter((s) => s !== sheet), sheet];
  };

  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null) n.append(kid);
    return n;
  };

  const debounce = (fn, ms) => {
    let id;
    return (...a) => {
      clearTimeout(id);
      id = setTimeout(() => fn(...a), ms);
    };
  };

  const fmt = (c, v) => (c.zero && v === 0 ? c.zero : c.pct ? Math.round(v * 100) + '%' : v + (c.unit || ''));

  // Scale an uploaded picture down so it fits comfortably in local storage.
  const imageToDataUrl = (file, max = 2400) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL('image/jpeg', 0.86));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

  const uploadBackground = () =>
    new Promise((resolve) => {
      const input = el('input', { type: 'file', accept: 'image/*' });
      input.addEventListener('change', async () => {
        const file = input.files && input.files[0];
        if (!file) return resolve(false);
        const url = await imageToDataUrl(file);
        await chrome.storage.local.set({ customBackground: url });
        await Lull.save('design.background', 'custom');
        await Lull.save('design.bgFrame', { x: 50, y: 50, zoom: 1 });
        resolve(true);
      });
      input.click();
    });

  // Mount controls into `root`. Returns { update(settings) } to refresh values.
  function mount(root, controls, settings, opts = {}) {
    const save = opts.onChange || ((key, value) => Lull.save(key, value));
    const actions = opts.actions || {};
    const rows = [];
    let current = settings;
    let customThumb = null;
    const loadThumb = async () => {
      if (!Lull.alive()) return;
      const { customBackground } = await chrome.storage.local.get('customBackground');
      customThumb = customBackground || null;
      refresh();
    };
    loadThumb();

    const changed = (key, value) => {
      Lull.setPath(current, key, value);
      if (Lull.sound) Lull.sound.play('tick');
      save(key, value);
      refresh();
    };

    for (const c of controls) {
      const row = el('div', { class: 'l-row', 'data-key': c.key });
      const text = el('div', { class: 'l-text' }, el('div', { class: 'l-label' }, c.label), c.hint ? el('div', { class: 'l-hint' }, c.hint) : null);
      let sync = () => {};

      if (c.type === 'toggle') {
        const sw = el('button', { class: 'l-switch', role: 'switch', 'aria-label': c.label });
        sw.addEventListener('click', () => changed(c.key, sw.getAttribute('aria-checked') !== 'true'));
        row.append(text, sw);
        sync = (s) => sw.setAttribute('aria-checked', String(!!Lull.getPath(s, c.key)));
      } else if (c.type === 'range') {
        row.classList.add('l-stack');
        const val = el('span', { class: 'l-value' });
        const input = el('input', { class: 'l-range', type: 'range', min: c.min, max: c.max, step: c.step, 'aria-label': c.label });
        const commit = debounce((v) => save(c.key, v), 160);
        input.addEventListener('input', () => {
          const v = Number(input.value);
          Lull.setPath(current, c.key, v);
          val.textContent = fmt(c, v);
          commit(v);
        });
        row.append(el('div', { class: 'l-range-head' }, text, val), input);
        sync = (s) => {
          const v = Lull.getPath(s, c.key);
          if (document.activeElement !== input) input.value = v;
          val.textContent = fmt(c, v);
        };
      } else if (c.type === 'select') {
        const sel = el('select', { class: 'l-select', 'aria-label': c.label });
        for (const [k, label] of Object.entries(c.options())) sel.append(el('option', { value: k }, label));
        sel.addEventListener('change', () => changed(c.key, sel.value));
        row.append(text, sel);
        sync = (s) => (sel.value = Lull.getPath(s, c.key));
      } else if (c.type === 'text') {
        row.classList.add('l-stack');
        const input = el('input', { class: 'l-input', type: 'text', placeholder: c.placeholder || '', 'aria-label': c.label, maxlength: 40 });
        const commit = debounce((v) => save(c.key, v), 300);
        input.addEventListener('input', () => {
          Lull.setPath(current, c.key, input.value);
          commit(input.value.trim());
        });
        row.append(text, input);
        sync = (s) => {
          if (document.activeElement !== input && input.getRootNode().activeElement !== input) input.value = Lull.getPath(s, c.key) || '';
        };
      } else if (c.type === 'color') {
        const input = el('input', { class: 'l-color', type: 'color', 'aria-label': c.label });
        const commit = debounce((v) => save(c.key, v), 200);
        input.addEventListener('input', () => {
          Lull.setPath(current, c.key, input.value);
          commit(input.value);
        });
        row.append(text, input);
        sync = (s) => (input.value = Lull.getPath(s, c.key));
      } else if (c.type === 'themes') {
        row.classList.add('l-stack');
        const grid = el('div', { class: 'l-tiles' });
        const tiles = Object.entries(Lull.THEMES).map(([k, th]) => {
          const sw = el('span', { class: 'l-theme' + (k === 'none' ? ' l-none' : '') });
          const b = el('button', { class: 'l-tile', type: 'button', 'data-v': k, title: th.label }, sw, el('span', { class: 'l-name' }, th.label));
          b.addEventListener('click', () => changed(c.key, k));
          grid.append(b);
          return { k, b, sw, th };
        });
        row.append(text, grid);
        sync = (s) => {
          for (const { k, b, sw, th } of tiles) {
            b.setAttribute('aria-pressed', String(s.design.theme === k));
            const p = k === 'custom' ? s.design.custom : th;
            if (k !== 'none') {
              sw.style.background = p.bg;
              sw.innerHTML = `<i style="background:${p.surface}"></i><i style="background:${p.surface};opacity:.7"></i><i class="a" style="background:${p.accent}"></i>`;
            }
          }
        };
      } else if (c.type === 'backgrounds') {
        row.classList.add('l-stack');
        const grid = el('div', { class: 'l-tiles' });
        const tiles = Object.entries(Lull.BACKGROUNDS).map(([k, bg]) => {
          const sw = el('span', { class: 'l-swatch' + (k === 'none' ? ' l-none' : '') });
          if (bg.css) sw.style.background = bg.css;
          const b = el('button', { class: 'l-tile', type: 'button', title: bg.label }, sw, el('span', { class: 'l-name' }, bg.label));
          b.addEventListener('click', async () => {
            if (k === 'custom' && !customThumb) {
              if (await uploadBackground()) await loadThumb();
              return;
            }
            changed(c.key, k);
          });
          grid.append(b);
          return { k, b, sw };
        });
        const upload = el('button', { class: 'l-btn', type: 'button', html: ICONS.upload + '<span>Upload your own</span>' });
        upload.addEventListener('click', async () => {
          if (await uploadBackground()) {
            Lull.setPath(current, c.key, 'custom');
            Lull.setPath(current, 'design.bgFrame', { x: 50, y: 50, zoom: 1 });
            await loadThumb();
          }
        });
        row.append(text, grid, el('div', {}, upload));
        sync = (s) => {
          for (const { k, b, sw } of tiles) {
            b.setAttribute('aria-pressed', String(s.design.background === k));
            if (k === 'custom') {
              if (customThumb) {
                sw.className = 'l-swatch';
                sw.innerHTML = '';
                sw.style.backgroundImage = `url("${customThumb}")`;
              } else {
                sw.className = 'l-swatch l-upload';
                sw.innerHTML = ICONS.plus;
              }
            }
          }
        };
      } else if (c.type === 'crop') {
        // A window-shaped preview of the picture: drag to choose the visible
        // part, zoom to crop tighter. Mirrors the page layer exactly.
        row.classList.add('l-stack');
        const pic = el('div', { class: 'l-crop-pic' });
        const frame = el('div', { class: 'l-crop', tabindex: '0', role: 'group', 'aria-label': c.label + '. Drag or use the arrow keys to move the picture.' }, pic, el('span', { class: 'l-crop-tag' }, 'Drag to move'));
        frame.style.aspectRatio = `${screen.width || 16} / ${screen.height || 10}`;
        const zoom = el('input', { class: 'l-range', type: 'range', min: 1, max: 3, step: 0.05, 'aria-label': 'Zoom' });
        const zoomVal = el('span', { class: 'l-value' });
        const center = el('button', { class: 'l-btn', type: 'button' }, 'Center');
        const clamp = (v) => Math.round(Math.min(100, Math.max(0, v)) * 10) / 10;
        let f = { x: 50, y: 50, zoom: 1 };
        let dragging = false;
        const paint = () => {
          pic.style.backgroundImage = customThumb ? `url("${customThumb}")` : 'none';
          pic.style.backgroundPosition = `${f.x}% ${f.y}%`;
          pic.style.transformOrigin = `${f.x}% ${f.y}%`;
          pic.style.scale = String(f.zoom);
          if (zoom.getRootNode().activeElement !== zoom) zoom.value = f.zoom;
          zoomVal.textContent = Math.round(f.zoom * 100) + '%';
        };
        const commit = () => {
          Lull.setPath(current, c.key, { ...f });
          save(c.key, { ...f });
        };
        const commitSoon = debounce(commit, 200);
        frame.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          frame.focus();
          dragging = true;
          frame.setPointerCapture(e.pointerId);
          const start = { x: e.clientX, y: e.clientY, fx: f.x, fy: f.y };
          const w = frame.clientWidth;
          const h = frame.clientHeight;
          const move = (ev) => {
            f.x = clamp(start.fx - ((ev.clientX - start.x) / w) * (100 / f.zoom));
            f.y = clamp(start.fy - ((ev.clientY - start.y) / h) * (100 / f.zoom));
            paint();
          };
          const up = () => {
            dragging = false;
            frame.removeEventListener('pointermove', move);
            frame.removeEventListener('pointerup', up);
            frame.removeEventListener('pointercancel', up);
            commit();
          };
          frame.addEventListener('pointermove', move);
          frame.addEventListener('pointerup', up);
          frame.addEventListener('pointercancel', up);
        });
        frame.addEventListener('keydown', (e) => {
          const step = e.shiftKey ? 10 : 2;
          const d = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
          if (!d) return;
          e.preventDefault();
          f.x = clamp(f.x + d[0]);
          f.y = clamp(f.y + d[1]);
          paint();
          commitSoon();
        });
        zoom.addEventListener('input', () => {
          f.zoom = Number(zoom.value);
          paint();
          commitSoon();
        });
        center.addEventListener('click', () => {
          f = { x: 50, y: 50, zoom: 1 };
          paint();
          commit();
        });
        row.append(text, frame, el('div', { class: 'l-crop-row' }, el('span', { class: 'l-hint' }, 'Zoom'), zoom, zoomVal, center));
        sync = (s) => {
          if (dragging) return;
          f = { x: 50, y: 50, zoom: 1, ...Lull.getPath(s, c.key) };
          paint();
        };
      } else if (c.type === 'list') {
        row.classList.add('l-stack');
        const chips = el('div', { class: 'l-chips' });
        const input = el('input', { class: 'l-input', type: 'text', placeholder: c.placeholder || '', 'aria-label': c.label });
        const addBtn = el('button', { class: 'l-btn', type: 'button' }, 'Add');
        const add = () => {
          const v = input.value.trim();
          if (!v) return;
          const list = Lull.getPath(current, c.key) || [];
          if (!list.some((x) => x.toLowerCase() === v.toLowerCase())) changed(c.key, [...list, v]);
          input.value = '';
        };
        addBtn.addEventListener('click', add);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') add();
          e.stopPropagation();
        });
        row.append(text, chips, el('div', { class: 'l-add' }, input, addBtn));
        sync = (s) => {
          const list = Lull.getPath(s, c.key) || [];
          chips.replaceChildren(
            ...(list.length
              ? list.map((v) => {
                  const rm = el('button', { type: 'button', 'aria-label': 'Remove ' + v, html: ICONS.close });
                  rm.addEventListener('click', () => changed(c.key, list.filter((x) => x !== v)));
                  return el('span', { class: 'l-chip' }, v, rm);
                })
              : [el('span', { class: 'l-empty' }, 'Nothing hidden yet.')])
          );
        };
      } else if (c.type === 'button') {
        const b = el('button', { class: 'l-btn' + (c.danger ? ' l-danger' : ''), type: 'button' }, c.label);
        const status = el('div', { class: 'l-hint' });
        b.addEventListener('click', async () => {
          const msg = actions[c.action] ? await actions[c.action]() : null;
          status.textContent = msg || '';
        });
        row.append(el('div', { class: 'l-text' }, status), b);
      }

      rows.push({ c, row, sync });
      root.append(row);
    }

    function refresh() {
      for (const { c, row, sync } of rows) {
        row.hidden = c.showIf ? !c.showIf(current) : false;
        sync(current);
      }
    }
    refresh();

    return {
      update(s) {
        current = s;
        if (s.design.background === 'custom' && !customThumb) loadThumb();
        else refresh();
      },
    };
  }

  Lull.ui = { SECTIONS, ICONS, CSS, pick, mount, adopt, el, debounce, uploadBackground };
})();
