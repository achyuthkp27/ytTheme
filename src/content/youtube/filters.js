// Hide videos by channel, by word in the title, or once they're watched.
(() => {
  const Lull = globalThis.Lull;
  if (Lull.site !== 'yt') return;

  // Outermost element of each kind of video card YouTube renders.
  const CARDS = [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-compact-video-renderer',
    'yt-lockup-view-model:not(ytd-rich-item-renderer yt-lockup-view-model)',
  ].join(',');

  const text = (n) => (n ? (n.getAttribute('title') || n.textContent || '').replace(/\s+/g, ' ').trim() : '');

  function cardInfo(card) {
    const link = card.querySelector('a[href*="/watch?v="], a[href^="/shorts/"]');
    const href = link ? link.getAttribute('href') : '';
    const id = (href.match(/[?&]v=([\w-]{6,})/) || href.match(/\/shorts\/([\w-]{6,})/) || [])[1] || '';

    const title = text(card.querySelector('#video-title, h3[title], .ytLockupMetadataViewModelHeadingReset, h3 a, a#video-title-link'));

    let channel = text(card.querySelector('ytd-channel-name #text, ytd-channel-name a'));
    const handleLink = card.querySelector('a[href^="/@"]:not([href*="/shorts/"]), a[href^="/channel/"]');
    if (!channel && handleLink) channel = text(handleLink);
    if (!channel) {
      const avatar = card.querySelector('[aria-label^="Go to channel "]');
      if (avatar) channel = avatar.getAttribute('aria-label').slice('Go to channel '.length).trim();
    }
    if (!channel) {
      const row = card.querySelector('yt-content-metadata-view-model [class*="MetadataRow"], yt-content-metadata-view-model [class*="metadata-row"]');
      if (row) channel = text(row).split(/\s+•\s+/)[0];
    }
    const handleHref = handleLink ? handleLink.getAttribute('href') : '';
    const handle = (handleHref.match(/^\/(@[^/?]+)/) || [])[1] || '';

    return { id, href, title, channel, handle: handle ? decodeURIComponent(handle) : '' };
  }

  function watchedPercent(card) {
    const bar = card.querySelector('[class*="WatchedProgressBarSegment"], ytd-thumbnail-overlay-resume-playback-renderer #progress');
    if (!bar) return 0;
    return parseFloat(bar.style.width) || 0;
  }

  const norm = (s) => s.toLowerCase().replace(/^@/, '').trim();
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  let matchers = { key: '', channels: new Set(), words: [] };
  function buildMatchers(s) {
    const key = JSON.stringify([s.yt.blockedChannels, s.yt.blockedWords]);
    if (key === matchers.key) return matchers;
    const words = s.yt.blockedWords.map((w) => {
      const n = w.toLowerCase().trim();
      return /^[\w\s'-]+$/.test(n) ? new RegExp('(^|[^\\w])' + escape(n) + '($|[^\\w])', 'i') : { test: (t) => t.toLowerCase().includes(n) };
    });
    return (matchers = { key, channels: new Set(s.yt.blockedChannels.map(norm)), words });
  }

  function reasonFor(card, s, m, allowWatched) {
    if (!m.channels.size && !m.words.length && !allowWatched) return '';
    const info = cardInfo(card);
    if (m.channels.size && ((info.channel && m.channels.has(norm(info.channel))) || (info.handle && m.channels.has(norm(info.handle))))) return 'channel';
    if (m.words.length && info.title && m.words.some((r) => r.test(info.title))) return 'word';
    if (allowWatched && watchedPercent(card) >= s.yt.watchedThreshold) return 'watched';
    return '';
  }

  function scan() {
    const s = Lull.settings;
    const active = s.yt.enabled;
    const exempt = Lull.page === 'history' || Lull.page === 'playlist';
    const m = buildMatchers(s);
    const allowWatched = active && s.yt.hideWatched && !exempt;
    for (const card of document.querySelectorAll(CARDS)) {
      const reason = active && !exempt ? reasonFor(card, s, m, allowWatched) : '';
      const now = card.getAttribute('data-lull-hidden') || '';
      if (reason === now) continue;
      if (reason) card.setAttribute('data-lull-hidden', reason);
      else card.removeAttribute('data-lull-hidden');
    }
  }

  // Game shelves found by their heading, for layouts whose cards CSS can't spot.
  const GAMES = /^(youtube\s+)?playables\b|^(play\s+)?games\b|^games for you/i;
  const SHELVES = 'ytd-rich-section-renderer, ytd-rich-shelf-renderer, ytd-shelf-renderer, ytd-reel-shelf-renderer, grid-shelf-view-model';
  function scanGames() {
    const on = Lull.on('yt.hideGames') && Lull.page !== 'playables';
    for (const chip of document.querySelectorAll('yt-chip-cloud-chip-renderer')) {
      const match = on && /^gaming$/i.test(chip.textContent.trim());
      const now = chip.getAttribute('data-lull-hidden');
      if (match && now !== 'games') chip.setAttribute('data-lull-hidden', 'games');
      else if (!match && now === 'games') chip.removeAttribute('data-lull-hidden');
    }
    for (const shelf of document.querySelectorAll(SHELVES)) {
      const heading = shelf.querySelector('#title, #title-text, h2, yt-section-header-view-model');
      const match = on && heading && GAMES.test(heading.textContent.trim());
      const now = shelf.getAttribute('data-lull-hidden');
      if (match && now !== 'games') shelf.setAttribute('data-lull-hidden', 'games');
      else if (!match && now === 'games') shelf.removeAttribute('data-lull-hidden');
    }
  }

  Lull.yt = Object.assign(Lull.yt || {}, { CARDS, cardInfo });
  Lull.onMutate(scan);
  Lull.onMutate(scanGames);
  Lull.onRoute(() => Lull.rescan());
})();
