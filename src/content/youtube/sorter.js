// Sort and filter a video grid by what's doing well and by topic: Home,
// Subscriptions and a channel's Videos tab. Reads each card's view count,
// upload age and title, then reorders with CSS `order` (YouTube's own nodes
// are never moved).
(() => {
  const Lull = globalThis.Lull;
  if (Lull.site !== 'yt') return;

  const SORTS = { newest: 'Newest', views: 'Most viewed', rising: 'Taking off' };
  const WINDOWS = { any: 'Any time', day: '24 hours', week: 'This week' };
  const HINTS = {
    newest: 'In the order YouTube shows them.',
    views: 'Most views first.',
    rising: 'Views per hour since upload: new videos that are picking up fast.',
  };

  const UNITS = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, b: 1e9, billion: 1e9, lakh: 1e5, lac: 1e5, crore: 1e7, cr: 1e7 };
  const VIEWS = /^([\d.,]+)\s*(k|m|b|thousand|million|billion|lakh|lac|crore|cr)?\s*(views?|watching)?$/i;
  // "3 hours ago", "1 hr ago", and the compact "3h ago", "4d ago", "1mo ago".
  const AGE = /(\d+)\s*(months?|mo|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|wks?|w|years?|yrs?|y|seconds?|secs?|s)\s+ago/i;
  const unitSeconds = (u) => {
    u = u.toLowerCase();
    if (u.startsWith('mo')) return 2629800;
    if (u.startsWith('m')) return 60;
    if (u.startsWith('h')) return 3600;
    if (u.startsWith('d')) return 86400;
    if (u.startsWith('w')) return 604800;
    if (u.startsWith('y')) return 31557600;
    return 1;
  };

  // Topics match whole words in a video's title and channel name.
  const AI = ['ai', 'a.i.', 'agi', 'artificial intelligence', 'gpt', 'chatgpt', 'openai', 'claude', 'anthropic', 'gemini', 'llm', 'llms',
    'machine learning', 'deep learning', 'neural network', 'ai agent', 'ai agents', 'copilot', 'midjourney', 'stable diffusion', 'sora',
    'grok', 'deepseek', 'llama', 'mistral', 'perplexity', 'prompt engineering', 'genai', 'generative'];
  const TECH = [...AI, 'tech', 'technology', 'iphone', 'ipad', 'macbook', 'apple', 'android', 'samsung', 'galaxy', 'pixel', 'google', 'oneplus',
    'xiaomi', 'nothing phone', 'laptop', 'pc', 'gadget', 'gadgets', 'smartphone', 'phone', 'unboxing', 'chip', 'chips', 'nvidia', 'amd',
    'intel', 'gpu', 'cpu', 'software', 'coding', 'programming', 'developer', 'developers', 'app', 'apps', 'windows', 'linux', 'macos', 'ios',
    'airpods', 'tesla', 'ev', 'vision pro', 'smartwatch', 'drone', 'robot', 'robots', 'robotics', 'startup', 'quantum', 'semiconductor',
    'tablet', 'headphones', 'keyboard', 'spacex', 'cybersecurity', 'crypto', 'blockchain'];
  const TOPICS = { all: 'All', ai: 'AI', tech: 'Tech', mine: 'Mine' };
  const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = (words) => (words.length ? new RegExp(`(^|[^\\p{L}\\p{N}])(${words.map(esc).join('|')})(?=$|[^\\p{L}\\p{N}])`, 'iu') : null);
  const BUILT_IN = { ai: matcher(AI), tech: matcher(TECH) };
  let mine = { key: '', re: null };
  function topicRe(topic, words) {
    if (topic === 'mine') {
      const key = words.join('\n');
      if (mine.key !== key) mine = { key, re: matcher(words.map((w) => w.trim()).filter(Boolean)) };
      return mine.re;
    }
    return BUILT_IN[topic] || null;
  }

  function stats(item) {
    const texts = [...item.querySelectorAll('yt-content-metadata-view-model [class*="MetadataText"], #metadata-line span')].map((e) => e.textContent.replace(/\s+/g, ' ').trim());
    let views = null;
    let age = null;
    for (const t of texts) {
      for (const part of t.split('•').map((p) => p.trim())) {
        const a = age == null && part.match(AGE);
        if (a) {
          age = parseInt(a[1], 10) * unitSeconds(a[2]);
          continue;
        }
        const v = views == null && part.match(VIEWS);
        if (v && /\d/.test(v[1])) {
          views = parseFloat(v[1].replace(/,/g, '')) * (UNITS[(v[2] || '').toLowerCase()] || 1);
          if (/watching/i.test(v[3] || '')) age = 0;
        }
      }
    }
    return { views, age };
  }

  const where = () => {
    if (Lull.page === 'home') return 'ytd-browse[page-subtype="home"]';
    if (Lull.page === 'subscriptions') return 'ytd-browse[page-subtype="subscriptions"]';
    if (Lull.page === 'channel' && /\/videos\/?$/.test(location.pathname)) return 'ytd-browse[page-subtype="channels"]';
    return null;
  };

  // ---- ordering --------------------------------------------------------------
  let lastKey = '';
  function arrange() {
    const scope = where();
    const s = Lull.settings.yt;
    const on = Lull.on('yt.sorter') && scope;
    const grid = scope && document.querySelector(`${scope} ytd-rich-grid-renderer #contents`);
    if (!grid) return;
    const items = [...grid.children].filter((n) => n.tagName === 'YTD-RICH-ITEM-RENDERER');
    const sort = on ? s.subsSort : 'newest';
    const win = on ? s.subsWindow : 'any';
    const topic = on ? s.subsTopic : 'all';
    const re = topicRe(topic, s.topicWords);
    const key = [location.pathname, items.length, sort, win, topic, s.topicWords.join(',')].join('|');
    if (key === lastKey) return;
    lastKey = key;

    const limit = { any: Infinity, day: 86400, week: 604800 }[win];
    const scored = items.map((item, i) => {
      const { views, age } = stats(item);
      const hours = Math.max(1, (age ?? 0) / 3600);
      const score = sort === 'views' ? views ?? -1 : sort === 'rising' ? (views == null ? -1 : views / hours) : -i;
      const old = limit !== Infinity && (age == null || age > limit);
      let offTopic = false;
      if (re) {
        const info = Lull.yt.cardInfo(item);
        offTopic = !re.test(`${info.title} ${info.channel}`);
      } else if (topic === 'mine') offTopic = true;
      return { item, score, out: old || offTopic, old };
    });
    scored.sort((a, b) => b.score - a.score);
    scored.forEach(({ item, out }, rank) => {
      if (sort === 'newest') item.style.removeProperty('order');
      else item.style.order = String(rank);
      if (out) item.setAttribute('data-lull-out', '');
      else item.removeAttribute('data-lull-out');
    });
    // Keep the "load more" spinner and any shelves after the sorted videos.
    // These feeds run newest first, so once the loaded videos reach past the
    // time window there is nothing newer to fetch: stop the endless loading.
    // Home isn't in date order and never ends, so there it stops after a
    // generous number of videos instead.
    const pastWindow =
      Lull.page === 'home'
        ? (win !== 'any' || topic !== 'all') && items.length > 240
        : limit !== Infinity && scored.some((x) => x.old && stats(x.item).age > limit);
    for (const n of grid.children) {
      if (n.tagName === 'YTD-RICH-ITEM-RENDERER') continue;
      if (sort === 'newest') n.style.removeProperty('order');
      else n.style.order = '100000';
      if (n.tagName === 'YTD-CONTINUATION-ITEM-RENDERER' && pastWindow) n.setAttribute('data-lull-out', '');
      else n.removeAttribute('data-lull-out');
    }
    const bar = document.querySelector('lull-sorter');
    if (bar) bar.update(scored.filter((x) => !x.out).length, items.length);
  }

  // ---- the bar -----------------------------------------------------------------
  const CSS = `
    :host{display:block;margin:4px 9px 18px}
    .bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;padding:8px;border-radius:16px;
      background:color-mix(in srgb,var(--lull-surface-eff,var(--yt-sys-color-baseline--raised-background,#fff)) 82%,transparent);
      border:1px solid var(--lull-glass-line,rgba(128,128,128,.2));backdrop-filter:blur(16px);
      color:var(--yt-sys-color-baseline--text-primary,#0f0f0f);font:500 13px/1.2 "Roboto","Arial",sans-serif}
    .seg{display:flex;gap:2px;padding:3px;border-radius:12px;background:var(--yt-sys-color-baseline--tonal-background,rgba(128,128,128,.12))}
    .seg button{height:30px;padding:0 13px;border:0;border-radius:9px;background:none;color:inherit;font:inherit;cursor:pointer;opacity:.75}
    .seg button[hidden]{display:none}
    .seg button[aria-pressed=true]{background:var(--yt-sys-color-baseline--text-primary,#0f0f0f);color:var(--yt-sys-color-baseline--text-primary-inverse,#fff);opacity:1}
    .seg button:focus-visible{outline:2px solid var(--lull-accent,#3ea6ff);outline-offset:1px}
    .hint{flex:1;min-width:180px;color:var(--yt-sys-color-baseline--text-secondary,#606060);font-weight:400;padding:0 6px}
    .count{color:var(--yt-sys-color-baseline--text-secondary,#606060);font-weight:400;padding-right:8px}
  `;
  let sheet;

  function build() {
    const host = document.createElement('lull-sorter');
    const root = host.attachShadow({ mode: 'open' });
    if (!sheet) {
      sheet = new CSSStyleSheet();
      sheet.replaceSync(CSS);
    }
    root.adoptedStyleSheets = [sheet];
    const { el } = Lull.ui;
    const seg = (options, key, label) => {
      const box = el('div', { class: 'seg', role: 'group', 'aria-label': label });
      for (const [k, text] of Object.entries(options)) {
        const b = el('button', { type: 'button', 'data-v': k }, text);
        b.addEventListener('click', () => Lull.save(key, k));
        box.append(b);
      }
      return box;
    };
    const topics = seg(TOPICS, 'yt.subsTopic', 'Topic');
    const sorts = seg(SORTS, 'yt.subsSort', 'Sort');
    const windows = seg(WINDOWS, 'yt.subsWindow', 'Uploaded');
    const hint = el('span', { class: 'hint' });
    const count = el('span', { class: 'count' });
    root.append(el('div', { class: 'bar' }, topics, sorts, windows, hint, count));
    host.sync = () => {
      const s = Lull.settings.yt;
      for (const b of topics.children) {
        b.setAttribute('aria-pressed', String(b.dataset.v === s.subsTopic));
        // "Mine" appears once you've added topic words.
        if (b.dataset.v === 'mine') b.hidden = !s.topicWords.length && s.subsTopic !== 'mine';
      }
      for (const b of sorts.children) b.setAttribute('aria-pressed', String(b.dataset.v === s.subsSort));
      for (const b of windows.children) b.setAttribute('aria-pressed', String(b.dataset.v === s.subsWindow));
      hint.textContent = HINTS[s.subsSort] || '';
    };
    host.update = (shown, total) => {
      count.textContent = shown === total ? '' : `${shown} of ${total} videos`;
    };
    host.sync();
    return host;
  }

  function ensureBar() {
    const scope = where();
    let host = document.querySelector('lull-sorter');
    const grid = scope && Lull.on('yt.sorter') && document.querySelector(`${scope} ytd-rich-grid-renderer`);
    if (!grid) {
      if (host) host.remove();
      return;
    }
    if (!host || host.nextElementSibling !== grid) {
      if (host) host.remove();
      host = build();
      grid.before(host);
      lastKey = '';
    }
    host.sync();
  }

  Lull.register({
    update() {
      lastKey = '';
    },
  });
  Lull.onMutate(() => {
    ensureBar();
    arrange();
  });
})();
