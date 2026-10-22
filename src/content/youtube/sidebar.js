// Shortcuts to History, Playlists, Watch later and Liked at the top of the guide.
(() => {
  const Lull = globalThis.Lull;
  if (Lull.site !== 'yt') return;

  const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const MAIN = [
    { href: '/', label: 'Home', icon: svg('<path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>') },
    { href: '/feed/subscriptions', label: 'Subscriptions', icon: svg('<rect x="3.5" y="7" width="17" height="13" rx="2.5"/><path d="M6.5 4h11M10.5 11.2v5.6l4.6-2.8z"/>') },
    { href: '/feed/you', label: 'You', icon: svg('<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>') },
  ];
  const LINKS = [
    { href: '/feed/history', label: 'History', icon: svg('<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.5v4h4"/><path d="M12 8v4.2l2.8 1.8"/>') },
    { href: '/feed/playlists', label: 'Playlists', icon: svg('<path d="M4 6.5h11M4 11h11M4 15.5h6"/><path d="M15 14.2v5.3l4.5-2.65z"/>') },
    { href: '/playlist?list=WL', label: 'Watch later', icon: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>') },
    { href: '/playlist?list=LL', label: 'Liked videos', icon: svg('<path d="M7.5 10.5v9h-3v-9z"/><path d="M7.5 10.5l3.6-6.3c1.4 0 2.4 1.2 2.1 2.6l-.6 2.7h5.2a2 2 0 0 1 2 2.4l-1.3 6.2a2 2 0 0 1-2 1.6H7.5"/>') },
  ];

  // Prefer YouTube's own guide link so navigation stays in-app (no full reload).
  function go(e, href) {
    const own = [...document.querySelectorAll('ytd-guide-entry-renderer a, ytd-mini-guide-entry-renderer a')].find((a) => a.getAttribute('href') === href);
    if (own) {
      e.preventDefault();
      own.click();
    }
  }

  function build(cls, withTitle) {
    const { el } = Lull.ui;
    const box = el('div', { class: cls });
    if (withTitle) box.append(el('div', { class: 'lull-shortcuts-title' }, 'Shortcuts'));
    for (const l of LINKS) {
      const a = el('a', { href: l.href, title: l.label, html: l.icon + `<span>${l.label}</span>` });
      a.addEventListener('click', (e) => go(e, l.href));
      box.append(a);
    }
    return box;
  }

  function markCurrent(box) {
    const here = location.pathname + location.search;
    for (const a of box.querySelectorAll('a')) {
      if (here === a.getAttribute('href')) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
  }

  // The floating icon rail (glass layout). YouTube only fills its own mini
  // guide when the full sidebar is closed, so the rail is built here.
  function ensureRail() {
    const want = Lull.designOn() && Lull.settings.design.glass && Lull.settings.design.rail && Lull.page !== 'watch';
    let rail = document.querySelector('nav.lull-rail');
    if (!want) {
      if (rail) rail.remove();
      return;
    }
    const withShortcuts = Lull.on('yt.shortcuts');
    if (rail && rail.dataset.shortcuts !== String(withShortcuts)) {
      rail.remove();
      rail = null;
    }
    if (!rail) {
      const { el } = Lull.ui;
      rail = el('nav', { class: 'lull-rail', 'aria-label': 'Main', 'data-shortcuts': String(withShortcuts) });
      const add = (l) => {
        const a = el('a', { href: l.href, title: l.label, 'aria-label': l.label, html: l.icon });
        a.addEventListener('click', (e) => go(e, l.href));
        rail.append(a);
      };
      MAIN.forEach(add);
      if (withShortcuts) {
        rail.append(el('span', { class: 'lull-rail-sep', 'aria-hidden': 'true' }));
        LINKS.forEach(add);
      }
      document.body.append(rail);
    }
    markCurrent(rail);
  }

  // The glass top bar is always dark; YouTube's own [dark] rules then give
  // everything inside it light icons and text, whatever the page mode.
  function ensureMasthead() {
    const bar = document.getElementById('masthead-container');
    if (!bar) return;
    const want = Lull.designOn() && Lull.settings.design.glass;
    if (want && !bar.hasAttribute('dark')) {
      bar.setAttribute('dark', '');
      bar.dataset.lullDark = '1';
    } else if (!want && bar.dataset.lullDark) {
      bar.removeAttribute('dark');
      delete bar.dataset.lullDark;
    }
  }

  function ensure() {
    ensureRail();
    ensureMasthead();
    if (!Lull.on('yt.shortcuts')) return;
    const sections = document.querySelector('ytd-guide-renderer #sections');
    if (sections && !sections.querySelector(':scope > .lull-shortcuts')) sections.prepend(build('lull-shortcuts', true));
    const mini = document.querySelector('ytd-mini-guide-renderer #items');
    if (mini && !mini.querySelector(':scope > .lull-mini-shortcuts')) mini.append(build('lull-mini-shortcuts', false));
    document.querySelectorAll('.lull-shortcuts, .lull-mini-shortcuts').forEach(markCurrent);
  }

  Lull.onMutate(ensure);

  // A channel header that has scrolled up is pinned with only its tab bar in
  // view; mark it so the rest of it can't peek out above the floating top bar.
  let ticking = false;
  addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const header = document.querySelector('ytd-page-manager > ytd-browse:not([hidden]) tp-yt-app-header#header[fixed]');
        if (header) header.toggleAttribute('data-lull-stuck', header.getBoundingClientRect().top < -2);
      });
    },
    { passive: true }
  );
})();
