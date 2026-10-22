// Shared settings model for every Lull context: content scripts, popup,
// options page and the background service worker.
(() => {
  const Lull = (globalThis.Lull = globalThis.Lull || {});

  // Bump when a default changes in a way existing installs should pick up
  // (see the migration in background.js).
  Lull.REVISION = 2;

  Lull.DEFAULTS = {
    rev: 2,
    yt: {
      enabled: true,
      hideShorts: true,
      redirectShorts: false,
      hideAds: true,
      skipVideoAds: true,
      hideHomeFeed: false,
      hideGames: true,
      hideChips: false,
      hideMixes: false,
      tidySidebar: false,
      noAutoplay: false,
      hideRelated: false,
      hideEndScreens: true,
      hideComments: false,
      dislikes: true,
      likeBar: true,
      menuActions: true,
      quickNotInterested: true,
      hideWatched: false,
      watchedThreshold: 85,
      blockedChannels: [],
      blockedWords: [],
      shortcuts: true,
      sorter: true,
      subsSort: 'newest',
      subsWindow: 'any',
      subsTopic: 'all',
      topicWords: [],
      historySearch: true,
      cleanPlayer: false,
      resizableSidebar: true,
      sidebarWidth: 402,
    },
    design: {
      glass: false,
      background: 'ridge',
      bgFrame: { x: 50, y: 50, zoom: 1 },
      rail: true,
      overlayCards: false,
      perRow: 0,
      blur: 18,
      cardOpacity: 0.6,
      radius: 16,
      theme: 'none',
      custom: { bg: '#10131c', surface: '#181c28', text: '#e8eaf2', accent: '#8ab4ff' },
      font: 'system',
      greeting: false,
      name: '',
      nameColor: 'auto',
      nameCustom: '#f2c46d',
      watchRoom: false,
      motion: false,
      sounds: false,
      volume: 0.35,
      editButton: true,
    },
  };

  // scheme tells the glass layer whether text sits on a dark or light page.
  Lull.THEMES = {
    none: { label: 'Site default' },
    midnight: { label: 'Midnight', scheme: 'dark', bg: '#0e1220', surface: '#161b2e', text: '#e7e9f5', text2: '#9aa0bd', accent: '#7c9cff' },
    ember: { label: 'Ember', scheme: 'dark', bg: '#16100d', surface: '#221915', text: '#f3e9e2', text2: '#b5a294', accent: '#ff8a5b' },
    forest: { label: 'Forest', scheme: 'dark', bg: '#0e1611', surface: '#16211a', text: '#e3eee6', text2: '#93a89a', accent: '#6fcf97' },
    rose: { label: 'Rosé', scheme: 'dark', bg: '#1a1216', surface: '#24191f', text: '#f6e8ee', text2: '#bb9aa8', accent: '#f472b6' },
    paper: { label: 'Paper', scheme: 'light', bg: '#f6f1e9', surface: '#fffaf3', text: '#2b2621', text2: '#6e655b', accent: '#c2410c' },
    mist: { label: 'Mist', scheme: 'light', bg: '#eef2f7', surface: '#f8fafc', text: '#1e293b', text2: '#5b6b80', accent: '#2563eb' },
    custom: { label: 'Custom' },
  };

  const W = Lull.WALLPAPERS || {};
  Lull.BACKGROUNDS = {
    none: { label: 'None' },
    ...W,
    aurora: {
      label: 'Aurora',
      scheme: 'dark',
      css:
        'radial-gradient(55% 45% at 12% 18%, rgba(38,140,150,.55), transparent 70%),' +
        'radial-gradient(50% 55% at 88% 28%, rgba(105,72,200,.55), transparent 70%),' +
        'radial-gradient(70% 60% at 50% 105%, rgba(20,80,120,.8), transparent 70%),' +
        '#070a12',
    },
    linen: {
      label: 'Linen',
      scheme: 'light',
      css:
        'radial-gradient(60% 50% at 8% 8%, rgba(255,214,170,.9), transparent 62%),' +
        'radial-gradient(60% 60% at 92% 92%, rgba(196,214,255,.9), transparent 62%),' +
        '#f7f3ee',
    },
    custom: { label: 'Your image', scheme: 'dark' },
  };

  Lull.FONTS = {
    system: { label: 'Site default', stack: '' },
    sans: { label: 'Sans', stack: '"Inter", "SF Pro Text", "Segoe UI", system-ui, sans-serif' },
    rounded: { label: 'Rounded', stack: 'ui-rounded, "SF Pro Rounded", "Nunito", "Varela Round", system-ui, sans-serif' },
    serif: { label: 'Serif', stack: 'ui-serif, "New York", "Iowan Old Style", Georgia, serif' },
    humanist: { label: 'Humanist', stack: '"Avenir Next", "Avenir", "Segoe UI", "Gill Sans", system-ui, sans-serif' },
    mono: { label: 'Mono', stack: 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace' },
  };

  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

  // Fill in any keys missing from stored settings so new defaults reach old installs.
  Lull.merge = function merge(base, over) {
    const out = Array.isArray(base) ? base.slice() : { ...base };
    if (!isObj(over)) return out;
    for (const k of Object.keys(over)) {
      out[k] = isObj(base[k]) && isObj(over[k]) ? merge(base[k], over[k]) : over[k];
    }
    return out;
  };

  Lull.getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

  Lull.setPath = (obj, path, value) => {
    const keys = path.split('.');
    let o = obj;
    for (const k of keys.slice(0, -1)) o = o[k] = isObj(o[k]) ? o[k] : {};
    o[keys[keys.length - 1]] = value;
    return obj;
  };

  const area = () => chrome.storage.local;

  // False once the extension is reloaded or removed: scripts left behind in
  // open tabs keep running but can no longer reach the extension.
  Lull.alive = () => {
    try {
      return !!(globalThis.chrome && chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  };

  Lull.load = async () => {
    const { settings } = await area().get('settings');
    return Lull.merge(Lull.DEFAULTS, settings);
  };

  // Writes are queued so a slider drag can't interleave read-modify-write cycles.
  let queue = Promise.resolve();
  const enqueue = (job) => {
    if (!Lull.alive()) return Promise.resolve(null);
    const run = queue.then(job);
    queue = run.catch(() => {});
    return run;
  };
  Lull.save = (path, value) =>
    enqueue(async () => {
      const current = await Lull.load();
      Lull.setPath(current, path, value);
      await area().set({ settings: current });
      return current;
    });

  Lull.saveAll = (settings) => enqueue(() => area().set({ settings }));

  Lull.onChange = (cb) => {
    chrome.storage.onChanged.addListener((changes, name) => {
      if (name !== 'local') return;
      if (changes.settings) cb(Lull.merge(Lull.DEFAULTS, changes.settings.newValue), changes);
      else cb(null, changes);
    });
  };

  // The effective palette for a theme key, or null when the site's own colours apply.
  Lull.palette = (design) => {
    if (design.theme === 'none') return null;
    if (design.theme === 'custom') {
      const c = design.custom;
      return { scheme: Lull.luma(c.bg) < 0.5 ? 'dark' : 'light', bg: c.bg, surface: c.surface, text: c.text, text2: Lull.mix(c.text, c.bg, 0.62), accent: c.accent };
    }
    return Lull.THEMES[design.theme] || null;
  };

  const rgb = (hex) => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  Lull.luma = (hex) => {
    const [r, g, b] = rgb(hex);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };
  Lull.mix = (a, b, t) => {
    const x = rgb(a), y = rgb(b);
    return '#' + x.map((v, i) => Math.round(v * t + y[i] * (1 - t)).toString(16).padStart(2, '0')).join('');
  };
})();
