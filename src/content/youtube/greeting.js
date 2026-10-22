// A greeting with the user's name and a calm search box on the YouTube home page.
(() => {
  const Lull = globalThis.Lull;
  if (Lull.site !== 'yt') return;

  const LINES = [
    'Take your time.',
    'What’s worth watching today?',
    'One good video beats ten okay ones.',
    'Watch something that stays with you.',
    'No rush. Nothing here is urgent.',
    'Pick one thing and enjoy it.',
  ];

  // Left-aligned hero over the wallpaper: a date tag, the greeting, and the
  // name on its own line in the accent colour. The search box only appears
  // when the home feed is hidden, where it replaces the feed.
  const T1 = 'var(--lull-text,var(--yt-sys-color-baseline--text-primary,#0f0f0f))';
  const T2 = 'var(--lull-text2,var(--yt-sys-color-baseline--text-secondary,#606060))';
  const CSS = `
    :host{display:block;box-sizing:border-box;padding:clamp(28px,13vh,150px) 12px clamp(24px,8vh,90px);color:var(--lull-hero-fg,${T1});font-family:var(--lull-font,"Roboto","Arial",sans-serif)}
    .g{position:relative;isolation:isolate;width:fit-content;max-width:100%}
    .g::before{content:"";position:absolute;inset:-48px -90px -40px -70px;z-index:-1;background:radial-gradient(closest-side,var(--lull-hero-scrim,transparent),transparent);pointer-events:none}
    :host-context(html[data-lull-glass][data-lull-bg]){min-height:min(58vh,560px);display:flex;flex-direction:column;justify-content:center}
    :host-context(html[data-lull-motion]) .g{animation:rise .9s cubic-bezier(.2,.7,.2,1) both}
    :host-context(html[data-lull-motion]) .s{animation:rise .9s .12s cubic-bezier(.2,.7,.2,1) both}
    @keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
    @media (prefers-reduced-motion:reduce){.g,.s{animation:none!important}}
    .when{display:inline-block;padding:5px 11px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;
      color:var(--lull-hero-fg,${T1});background:color-mix(in srgb,var(--lull-hero-scrim,var(--yt-sys-color-baseline--raised-background,#fff)) 100%,transparent);backdrop-filter:blur(10px);
      border:1px solid var(--yt-sys-color-baseline--tonal-background,rgba(128,128,128,.25))}
    h1{margin:16px 0 0;font-size:clamp(34px,4.6vw,62px);font-weight:700;letter-spacing:-.025em;line-height:1.04;text-shadow:var(--lull-hero-shadow,0 2px 28px rgba(0,0,0,.18))}
    h1 .n{display:block;color:var(--lull-name,var(--lull-hero-fg,currentColor))}
    p{margin:14px 0 0;font-size:16px;font-weight:500;color:var(--lull-hero-fg2,${T2});text-shadow:var(--lull-hero-shadow,none)}
    form{margin:30px 0 0;max-width:560px;display:flex;align-items:center;gap:10px;height:50px;padding:0 8px 0 18px;border-radius:999px;
      background:color-mix(in srgb,var(--lull-surface,var(--yt-sys-color-baseline--raised-background,#fff)) 70%,transparent);
      border:1px solid var(--yt-sys-color-baseline--tonal-background,rgba(128,128,128,.25));backdrop-filter:blur(14px)}
    .solo form{margin:0 auto}
    form:focus-within{border-color:var(--lull-accent,var(--yt-sys-color-baseline--call-to-action,#065fd4))}
    input{flex:1;min-width:0;border:0;background:none;color:inherit;font:inherit;font-size:16px;outline:none}
    input::placeholder{color:${T2}}
    button{height:36px;padding:0 16px;border-radius:999px;border:0;font:inherit;font-weight:600;cursor:pointer;
      background:var(--lull-accent,var(--yt-sys-color-baseline--text-primary,#0f0f0f));color:var(--lull-bg,var(--yt-sys-color-baseline--text-primary-inverse,#fff))}
    svg{width:20px;height:20px;flex:none;color:${T2}}
  `;
  let sheet;

  function phrase() {
    const h = new Date().getHours();
    if (h < 5) return 'Still up';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 22) return 'Good evening';
    return 'Good night';
  }

  function render(host) {
    const d = Lull.settings.design;
    const greet = Lull.designOn() && d.greeting;
    const search = Lull.on('yt.hideHomeFeed');
    const root = host.shadowRoot;
    const day = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
    const line = LINES[new Date().getDate() % LINES.length];
    root.innerHTML =
      `<div class="${greet ? '' : 'solo'}">` +
      (greet ? `<div class="g"><span class="when">${day}</span><h1>${phrase()}${d.name ? ',<span class="n"></span>' : ''}</h1><p>${line}</p></div>` : '') +
      (search
        ? `<form class="s" role="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg><input type="search" name="q" placeholder="Search YouTube" aria-label="Search YouTube" autocomplete="off"><button type="submit">Search</button></form>`
        : '') +
      '</div>';
    if (d.name && greet) root.querySelector('.n').textContent = d.name;
    host.dataset.state = state();
    const form = root.querySelector('form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = form.q.value.trim();
      if (q) location.assign('/results?search_query=' + encodeURIComponent(q));
    });
    form.q.addEventListener('keydown', (e) => e.stopPropagation());
  }

  const state = () => JSON.stringify([Lull.designOn() && Lull.settings.design.greeting, Lull.settings.design.name, phrase(), Lull.on('yt.hideHomeFeed')]);

  function ensure() {
    const want = Lull.page === 'home' && ((Lull.designOn() && Lull.settings.design.greeting) || Lull.on('yt.hideHomeFeed'));
    let host = document.querySelector('lull-greeting');
    if (!want) {
      if (host) host.remove();
      return;
    }
    const primary = document.querySelector('ytd-browse[page-subtype="home"] ytd-two-column-browse-results-renderer > #primary');
    if (!primary) return;
    if (!host || host.parentElement !== primary) {
      if (host) host.remove();
      host = document.createElement('lull-greeting');
      const root = host.attachShadow({ mode: 'open' });
      if (!sheet) {
        sheet = new CSSStyleSheet();
        sheet.replaceSync(CSS);
      }
      root.adoptedStyleSheets = [sheet];
      primary.prepend(host);
      render(host);
      return;
    }
    if (host.dataset.state !== state()) render(host);
  }

  Lull.onMutate(ensure);
})();
