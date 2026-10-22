// Content-script runtime: loads settings, mirrors them onto <html> as data
// attributes and CSS variables (so the static stylesheets react instantly), and
// gives feature modules one throttled DOM observer and one route signal.
(() => {
  const Lull = globalThis.Lull;
  const root = document.documentElement;
  Lull.site = 'yt';

  const modules = [];
  const scanners = new Set();
  const routeHandlers = new Set();
  Lull.register = (m) => modules.push(m);
  Lull.onMutate = (fn) => scanners.add(fn);
  Lull.onRoute = (fn) => routeHandlers.add(fn);
  Lull.settings = null;

  // True when the site is enabled and the given setting is on.
  Lull.on = (path) => {
    const s = Lull.settings;
    return !!(s && s[Lull.site].enabled && Lull.getPath(s, path));
  };
  Lull.designOn = () => {
    const s = Lull.settings;
    return !!(s && s[Lull.site].enabled);
  };

  const kebab = (k) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
  // Attributes owned by other modules (route, diagnostics), not by settings.
  const KEEP = new Set(['data-lull-page', 'data-lull-tokens', 'data-lull-ads-skipped']);
  const VARS = ['--lull-bg', '--lull-surface', '--lull-text', '--lull-text2', '--lull-accent', '--lull-font', '--lull-blur', '--lull-card-alpha', '--lull-radius', '--lull-bg-layer', '--lull-bg-pos', '--lull-bg-zoom', '--lull-per-row', '--lull-name'];

  // Uploaded pictures are large; read each once and again only when it changes.
  const PICTURE_KEY = { custom: 'customBackground', customNight: 'customBackgroundNight' };
  const pictures = {};
  async function pictureFor(bg) {
    const key = PICTURE_KEY[bg];
    if (!key) return null;
    if (pictures[bg] === undefined) pictures[bg] = (await chrome.storage.local.get(key))[key] || null;
    return pictures[bg];
  }

  // In the evening (when that's switched on) the evening wallpaper stands in
  // for the day one. Your evening picture is shown centred.
  function isNight(d) {
    const h = new Date().getHours();
    return d.nightFrom > d.nightTo ? h >= d.nightFrom || h < d.nightTo : h >= d.nightFrom && h < d.nightTo;
  }
  function effectiveDesign(d) {
    if (!d.autoNight || !isNight(d)) return d;
    const bg = d.nightBackground;
    return { ...d, background: bg, bgFrame: bg === 'custom' ? d.bgFrame : { x: 50, y: 50, zoom: 1 } };
  }

  async function backgroundLayer(d) {
    if (PICTURE_KEY[d.background]) {
      const picture = await pictureFor(d.background);
      const f = d.bgFrame;
      return picture ? `${f.x}% ${f.y}% / cover no-repeat url("${picture}")` : null;
    }
    const bg = Lull.BACKGROUNDS[d.background];
    return bg && bg.css ? bg.css : null;
  }

  // ---- how light is the wallpaper? -----------------------------------------
  // Text that sits straight on the wallpaper switches between light and dark
  // to stay readable. For your own picture this measures the part actually on
  // screen (after your crop and zoom): the whole window, and separately the
  // area behind the greeting.
  const HERO = { x0: 0.04, x1: 0.52, y0: 0.12, y1: 0.62 };
  const WHOLE = { x0: 0, x1: 1, y0: 0, y1: 1 };
  let toneCache = { key: '', value: null };
  let image = null;
  let imageSrc = '';

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      if (image && imageSrc === src) return resolve(image);
      const i = new Image();
      i.onload = () => {
        image = i;
        imageSrc = src;
        resolve(i);
      };
      i.onerror = reject;
      i.src = src;
    });

  // Mean relative luminance (0 dark … 1 light) of a window region, mapped back
  // through background-size: cover, background-position and the zoom. With
  // `vivid`, also returns the average of its clearly coloured pixels (or null
  // when the picture is essentially black and white).
  function luminance(img, frame, region, vivid) {
    const vw = innerWidth;
    const vh = innerHeight;
    const s = Math.max(vw / img.naturalWidth, vh / img.naturalHeight);
    const fx = frame.x / 100;
    const fy = frame.y / 100;
    const offX = (vw - img.naturalWidth * s) * fx;
    const offY = (vh - img.naturalHeight * s) * fy;
    const ox = vw * fx;
    const oy = vh * fy;
    const z = frame.zoom || 1;
    const toSource = (X, Y) => [(ox + (X - ox) / z - offX) / s, (oy + (Y - oy) / z - offY) / s];
    const [sx0, sy0] = toSource(region.x0 * vw, region.y0 * vh);
    const [sx1, sy1] = toSource(region.x1 * vw, region.y1 * vh);
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 18;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, sx0, sy0, Math.max(1, sx1 - sx0), Math.max(1, sy1 - sy0), 0, 0, 32, 18);
    const data = g.getImageData(0, 0, 32, 18).data;
    const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    const n = data.length / 4;
    let sum = 0;
    let cw = 0;
    let cr = 0;
    let cg = 0;
    let cb = 0;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g2, b] = [data[i], data[i + 1], data[i + 2]];
      sum += 0.2126 * lin(r) + 0.7152 * lin(g2) + 0.0722 * lin(b);
      if (!vivid) continue;
      const max = Math.max(r, g2, b) / 255;
      const min = Math.min(r, g2, b) / 255;
      const l = (max + min) / 2;
      const sat = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
      if (sat > 0.28 && l > 0.12 && l < 0.88) {
        cw += sat;
        cr += r * sat;
        cg += g2 * sat;
        cb += b * sat;
      }
    }
    if (!vivid) return sum / n;
    // At least a few percent of the picture must carry colour to count.
    const color = cw > n * 0.04 * 0.4 ? [cr / cw, cg / cw, cb / cw] : null;
    return { lum: sum / n, color };
  }

  // A version of `rgb` that reads well on a light (or dark) background.
  function readable([r, g, b], onLight) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
      const d = max - min;
      h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    }
    const l = (max + min) / 2;
    const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
    return `hsl(${Math.round(((h * 60) + 360) % 360)} ${Math.round(Math.min(0.85, Math.max(0.45, s)) * 100)}% ${onLight ? 30 : 76}%)`;
  }

  // Name colours for the built-in wallpapers, picked from each one's palette.
  const WALL_NAME = { ridge: '#ffcf8a', lake: '#cfe0ff', dunes: '#7a2e14', forest: '#1f4a40', aurora: '#9ff0e2', linen: '#9a4a10' };

  // Relative luminance above ~0.3 reads as a light background (≈ mid grey).
  const toneOf = (l) => (l > 0.3 ? 'light' : 'dark');

  async function wallpaperTone(d) {
    const picture = await pictureFor(d.background);
    if (picture) {
      const f = d.bgFrame;
      const key = [picture.length, picture.slice(-48), f.x, f.y, f.zoom, innerWidth, innerHeight].join('|');
      if (toneCache.key !== key) {
        let value = null;
        try {
          const img = await loadImage(picture);
          const whole = luminance(img, f, WHOLE, true);
          const hero = toneOf(luminance(img, f, HERO));
          value = { page: toneOf(whole.lum), hero, name: whole.color ? readable(whole.color, hero === 'light') : null };
        } catch (e) {
          // An unreadable picture keeps the site's own text colours.
        }
        toneCache = { key, value };
      }
      return toneCache.value;
    }
    const bg = Lull.BACKGROUNDS[d.background];
    const pal = Lull.palette(d);
    const scheme = (bg && bg.scheme) || (pal && pal.scheme) || (root.hasAttribute('dark') ? 'dark' : 'light');
    return { page: scheme, hero: scheme, name: WALL_NAME[d.background] || null };
  }

  let applyToken = 0;
  async function apply(s) {
    const token = ++applyToken;
    const site = s[Lull.site];
    const attrs = {};
    const vars = {};

    if (site.enabled) {
      attrs['data-lull'] = Lull.site;
      for (const [k, v] of Object.entries(site)) if (v === true) attrs['data-lull-' + kebab(k)] = '';

      const d = s.design;
      const pal = Lull.palette(d);
      if (pal) {
        attrs['data-lull-theme'] = d.theme;
        attrs['data-lull-scheme'] = pal.scheme;
        Object.assign(vars, { '--lull-bg': pal.bg, '--lull-surface': pal.surface, '--lull-text': pal.text, '--lull-text2': pal.text2, '--lull-accent': pal.accent });
      }
      const font = Lull.FONTS[d.font];
      if (font && font.stack) {
        attrs['data-lull-font'] = d.font;
        vars['--lull-font'] = font.stack;
      }
      let tone = null;
      if (d.glass) {
        attrs['data-lull-glass'] = '';
        Object.assign(vars, { '--lull-blur': d.blur + 'px', '--lull-card-alpha': Math.round(d.cardOpacity * 100) + '%', '--lull-radius': d.radius + 'px' });
        if (d.rail) attrs['data-lull-rail'] = '';
        if (d.overlayCards) attrs['data-lull-overlay'] = '';
        if (d.perRow) {
          attrs['data-lull-per-row'] = String(d.perRow);
          vars['--lull-per-row'] = String(d.perRow);
        }
        const eff = effectiveDesign(d);
        lastNight = eff !== d;
        const layer = await backgroundLayer(eff);
        if (token !== applyToken) return;
        if (layer) {
          attrs['data-lull-bg'] = eff.background;
          attrs['data-lull-bg-scheme'] = Lull.BACKGROUNDS[eff.background].scheme;
          vars['--lull-bg-layer'] = layer;
          if (PICTURE_KEY[eff.background]) {
            vars['--lull-bg-pos'] = `${eff.bgFrame.x}% ${eff.bgFrame.y}%`;
            vars['--lull-bg-zoom'] = String(eff.bgFrame.zoom);
          }
        }
        tone = await wallpaperTone(eff);
        if (token !== applyToken) return;
        if (tone) {
          attrs['data-lull-tone'] = tone.page;
          attrs['data-lull-hero-tone'] = tone.hero;
        }
      }
      // Greeting name colour; without one it matches the greeting text.
      const nameColor = { custom: d.nameCustom, accent: pal && pal.accent, auto: tone && tone.name }[d.nameColor];
      if (nameColor) vars['--lull-name'] = nameColor;
      if (d.motion) attrs['data-lull-motion'] = '';
      if (d.watchRoom) attrs['data-lull-watch-room'] = '';
    }

    for (const a of [...root.attributes]) {
      if (a.name.startsWith('data-lull') && !KEEP.has(a.name) && !(a.name in attrs)) root.removeAttribute(a.name);
    }
    for (const [k, v] of Object.entries(attrs)) if (root.getAttribute(k) !== v) root.setAttribute(k, v);
    for (const v of VARS) {
      if (v in vars) root.style.setProperty(v, vars[v]);
      else root.style.removeProperty(v);
    }
  }

  // ---- routes ---------------------------------------------------------------
  function pageOf(path) {
    if (path === '/') return 'home';
    if (path === '/watch') return 'watch';
    if (path === '/results') return 'search';
    if (path === '/feed/history') return 'history';
    if (path === '/feed/subscriptions') return 'subscriptions';
    if (path === '/playlist') return 'playlist';
    if (path.startsWith('/shorts')) return 'shorts';
    if (path.startsWith('/playables')) return 'playables';
    if (/^\/(@|channel\/|c\/|user\/)/.test(path)) return 'channel';
    return 'other';
  }

  let lastHref = '';
  function checkRoute() {
    if (location.href === lastHref) return;
    lastHref = location.href;
    Lull.page = pageOf(location.pathname);
    root.setAttribute('data-lull-page', Lull.page);
    for (const fn of routeHandlers) safe(fn, Lull.page);
    schedule();
  }

  // ---- observer -------------------------------------------------------------
  const safe = (fn, ...a) => {
    try {
      fn(...a);
    } catch (e) {
      console.debug('[ytTheme]', e);
    }
  };
  let pending = 0;
  let observer = null;
  let routeTimer = 0;
  function schedule() {
    if (pending) return;
    pending = setTimeout(() => {
      pending = 0;
      if (!Lull.settings) return;
      if (!Lull.alive()) return shutdown();
      for (const fn of scanners) safe(fn);
    }, 120);
  }

  // After the extension reloads, this copy can't reach it any more; stop
  // quietly instead of throwing on every page change. The page keeps its
  // current look until it is refreshed.
  function shutdown() {
    if (observer) observer.disconnect();
    clearInterval(routeTimer);
    document.removeEventListener('yt-navigate-finish', checkRoute);
    window.removeEventListener('popstate', checkRoute);
    scanners.clear();
    routeHandlers.clear();
  }
  Lull.rescan = schedule;

  function whenReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  (async () => {
    Lull.settings = await Lull.load();
    await apply(Lull.settings);
    checkRoute();
    for (const m of modules) if (m.early) safe(m.early, Lull.settings);
    whenReady(() => {
      for (const m of modules) if (m.init) safe(m.init, Lull.settings);
      observer = new MutationObserver(schedule);
      observer.observe(document.documentElement, { childList: true, subtree: true });
      document.addEventListener('yt-navigate-finish', checkRoute);
      window.addEventListener('popstate', checkRoute);
      routeTimer = setInterval(checkRoute, 400);
      schedule();
    });
  })();

  // Switch to (or from) the evening wallpaper when the hour comes round.
  let lastNight = false;
  setInterval(() => {
    const s = Lull.settings;
    if (s && s.design.glass && s.design.autoNight && Lull.alive() && isNight(s.design) !== lastNight) apply(s);
  }, 60000);

  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const s = Lull.settings;
      if (s && s.design.glass && PICTURE_KEY[effectiveDesign(s.design).background] && Lull.alive()) apply(s);
    }, 400);
  });

  Lull.onChange(async (next, changes) => {
    if (!Lull.settings) return;
    if (!next) {
      if (changes.customBackground || changes.customBackgroundNight) {
        if (changes.customBackground) pictures.custom = undefined;
        if (changes.customBackgroundNight) pictures.customNight = undefined;
        await apply(Lull.settings);
      }
      return;
    }
    const prev = Lull.settings;
    Lull.settings = next;
    await apply(next);
    for (const m of modules) if (m.update) safe(m.update, next, prev);
    schedule();
  });
})();
