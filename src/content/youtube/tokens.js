// YouTube ships many colour tokens under hashed names (e.g. --tffc2fd3a644f6275)
// that hold literal colours instead of pointing at the readable
// --yt-sys-color-baseline--* tokens. To theme them, pair each hashed token with
// the sys token that has the same light and dark values, and point it there.
(() => {
  const Lull = globalThis.Lull;
  if (Lull.site !== 'yt') return;

  const SYS = '--yt-sys-color-baseline--';
  // The sys tokens design.css overrides; only their twins need redirecting.
  // When two share the same light/dark values the first one wins, so
  // text-primary-inverse comes before base-background: glass mode makes the
  // page background transparent, and inverse text (on filled buttons) must
  // never vanish with it.
  const THEMED = [
    'text-primary-inverse', 'base-background', 'raised-background', 'menu-background', 'text-primary', 'text-secondary', 'text-disabled',
    'inverted-background', 'solid-background', 'wordmark-text', 'touch-response',
    'additive-background', 'tonal-background', 'mono-tonal-hover', 'tonal-hover-light', 'state-mono-standard-hovered',
    'outline', 'outline-opaque', 'call-to-action', 'suggested-action', 'frost-container-heavy',
    'frost-container-semi-heavy', 'themed-overlay-background',
  ];
  const HASHED = /^--[a-z][0-9a-f]{12,}$/;

  let sheet = null;
  let built = false;

  // Effective values under [light] and [dark], read from hidden probe elements
  // so every variant rule YouTube layers on (color-version, darker-dark-theme…)
  // applies exactly as it does on the page.
  function collect() {
    const names = [];
    const cs = getComputedStyle(document.documentElement);
    for (let i = 0; i < cs.length; i++) {
      const n = cs[i];
      if (n.startsWith(SYS) || HASHED.test(n)) names.push(n);
    }
    const read = (attr) => {
      const probe = document.createElement('div');
      probe.setAttribute(attr, '');
      probe.style.display = 'none';
      document.body.append(probe);
      const pcs = getComputedStyle(probe);
      const values = new Map();
      for (const n of names) {
        const v = pcs.getPropertyValue(n).trim().toLowerCase().replace(/\s+/g, '');
        if (v && v !== 'initial') values.set(n, v);
      }
      probe.remove();
      return values;
    };
    return { light: read('light'), dark: read('dark') };
  }

  function build() {
    if (built || !document.body) return;
    const { light, dark } = collect();
    const bySignature = new Map();
    for (const t of THEMED) {
      const l = light.get(SYS + t);
      const d = dark.get(SYS + t);
      if (l && d && !bySignature.has(l + '|' + d)) bySignature.set(l + '|' + d, t);
    }
    if (!bySignature.size) return; // stylesheets not loaded yet; try again later
    built = true;

    const lines = [];
    for (const [name, l] of light) {
      if (!HASHED.test(name)) continue;
      const t = bySignature.get(l + '|' + (dark.get(name) || ''));
      if (t) lines.push(`${name}: var(${SYS}${t}) !important;`);
    }
    if (!lines.length) return;
    sheet = new CSSStyleSheet();
    sheet.replaceSync(`html[data-lull="yt"]:is([data-lull-theme], [data-lull-glass]) {\n${lines.join('\n')}\n}`);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    document.documentElement.dataset.lullTokens = String(lines.length);
  }

  Lull.onMutate(build);
})();
