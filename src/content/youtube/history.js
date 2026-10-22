// A private, local list of videos you open, and a search box for it on the
// History page. Nothing here leaves the browser.
(() => {
  const Lull = globalThis.Lull;
  if (Lull.site !== 'yt') return;

  const MAX = 5000;
  const recorded = new Set();

  async function record() {
    if (!Lull.on('yt.historySearch') || Lull.page !== 'watch') return;
    const id = new URLSearchParams(location.search).get('v');
    if (!id || recorded.has(id)) return;
    const flexy = document.querySelector('ytd-watch-flexy');
    if (!flexy || flexy.getAttribute('video-id') !== id) return;
    const title = (document.querySelector('ytd-watch-metadata h1')?.textContent || '').trim();
    if (!title || !document.title.includes(title.slice(0, 30))) return;
    const channel = (document.querySelector('ytd-watch-metadata ytd-channel-name a, ytd-watch-metadata ytd-channel-name #text')?.textContent || '').trim();
    if (!Lull.alive()) return;
    recorded.add(id);
    try {
      const { ytHistory = [] } = await chrome.storage.local.get('ytHistory');
      const next = [{ id, t: title, c: channel, ts: Date.now() }, ...ytHistory.filter((v) => v.id !== id)].slice(0, MAX);
      await chrome.storage.local.set({ ytHistory: next });
    } catch (e) {
      // The extension was reloaded mid-write; the next page view records it.
      recorded.delete(id);
    }
  }

  const CSS = `
    :host{display:block;margin:0 0 20px}
    .box{border:1px solid var(--l-line);border-radius:16px;padding:14px 16px;background:var(--l-panel)}
    .head{display:flex;align-items:center;gap:10px;margin-bottom:10px}
    .head svg{color:var(--l-accent)}
    .head b{font-size:15px;font-weight:600}
    .head span{margin-left:auto;color:var(--l-text2);font-size:12px}
    .l-input{height:40px;font-size:14px;border-radius:12px}
    ul{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:4px;max-height:520px;overflow:auto}
    li a{display:flex;gap:12px;align-items:center;padding:6px;border-radius:10px;color:inherit;text-decoration:none}
    li a:hover{background:var(--l-hover)}
    img{width:120px;height:68px;border-radius:8px;object-fit:cover;flex:none;background:var(--l-hover)}
    .t{font-size:14px;font-weight:550;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .m{font-size:12px;color:var(--l-text2);margin-top:3px}
    .none{color:var(--l-text2);font-size:13px;margin-top:10px}
    mark{background:color-mix(in srgb,var(--l-accent) 30%,transparent);color:inherit;border-radius:3px}
  `;
  let sheet;

  const when = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function highlight(text, terms) {
    let out = esc(text);
    for (const t of terms) out = out.replace(new RegExp('(' + esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
    return out;
  }

  function build() {
    const host = document.createElement('lull-history');
    const root = host.attachShadow({ mode: 'open' });
    Lull.ui.adopt(root);
    if (!sheet) {
      sheet = new CSSStyleSheet();
      sheet.replaceSync(CSS);
    }
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    const { el, ICONS } = Lull.ui;
    const count = el('span');
    const input = el('input', { class: 'l-input', type: 'search', placeholder: 'Search videos you watched — title or channel', 'aria-label': 'Search watch history' });
    const list = el('ul');
    const none = el('div', { class: 'none' });
    const wrap = el('div', { class: 'lull-ui box' + (document.documentElement.hasAttribute('dark') ? ' lull-dark' : ' lull-light') }, el('div', { class: 'head', html: ICONS.clock }, el('b', {}, 'Search your history'), count), input, none, list);
    root.append(wrap);

    let items = [];
    const load = async () => {
      if (!Lull.alive()) return;
      ({ ytHistory: items = [] } = await chrome.storage.local.get('ytHistory'));
      count.textContent = items.length ? `${items.length.toLocaleString()} videos remembered on this device` : '';
      run();
    };
    const run = () => {
      const q = input.value.trim().toLowerCase();
      list.replaceChildren();
      none.textContent = '';
      if (!q) {
        if (!items.length) none.textContent = 'Videos you open from now on will show up here.';
        return;
      }
      const terms = q.split(/\s+/);
      const hits = items.filter((v) => {
        const hay = (v.t + ' ' + v.c).toLowerCase();
        return terms.every((t) => hay.includes(t));
      });
      if (!hits.length) none.textContent = 'No matches.';
      for (const v of hits.slice(0, 60)) {
        list.append(
          el('li', {}, el('a', { href: '/watch?v=' + encodeURIComponent(v.id), html: `<img loading="lazy" alt="" src="https://i.ytimg.com/vi/${encodeURIComponent(v.id)}/mqdefault.jpg"><div><div class="t">${highlight(v.t, terms)}</div><div class="m">${highlight(v.c || '', terms)} · ${when.format(v.ts)}</div></div>` }))
        );
      }
    };
    input.addEventListener('input', run);
    input.addEventListener('keydown', (e) => e.stopPropagation());
    load();
    return host;
  }

  function ensureSearch() {
    const host = document.querySelector('lull-history');
    const want = Lull.on('yt.historySearch') && Lull.page === 'history';
    if (!want) {
      if (host) host.remove();
      return;
    }
    const primary = document.querySelector('ytd-browse[page-subtype="history"] ytd-two-column-browse-results-renderer > #primary');
    if (primary && (!host || host.parentElement !== primary)) {
      if (host) host.remove();
      primary.prepend(build());
    }
  }

  Lull.onMutate(() => {
    record();
    ensureSearch();
  });
})();
