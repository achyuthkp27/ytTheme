// Tone down clickbait: shouting titles become sentence case, and (optionally)
// thumbnails are swapped for a frame from the middle of the video, which
// YouTube itself generates (i.ytimg.com/vi/<id>/hq2.jpg).
(() => {
  const Lull = globalThis.Lull;
  if (Lull.site !== 'yt') return;

  // ---- titles -------------------------------------------------------------------
  const TITLES = [
    '#video-title',
    '.ytLockupMetadataViewModelTitle .ytAttributedStringHost',
    'ytd-watch-metadata h1 yt-formatted-string',
  ].join(',');

  const ACRONYMS = new Set(('AI AGI GPT LLM API UI UX VR AR XR PC TV HD UHD CPU GPU SSD RAM USB OS IOS EV F1 NBA NFL NHL MLB UFC WWE ' +
    'IPL ICC FIFA UEFA BBC CNN NASA ISRO FBI CIA CEO USA UK EU UN DIY ASMR LOL OMG MKBHD LTT AMD IBM HP LG BMW ' +
     'NYC SF DJ MC MV OST BTS IQ GOAT ETF IPO SIP GDP RBI SEBI JEE NEET UPSC PM CM IIT IIM').split(' '));

  // Only letters that have case count (scripts like Telugu have none).
  const cased = (t) => [...t].filter((c) => c.toLowerCase() !== c.toUpperCase());
  const isUpper = (c) => c === c.toUpperCase() && c !== c.toLowerCase();

  function calm(title) {
    let out = title.replace(/([!?])\1+/g, '$1').replace(/\?!|!\?/g, '?');
    const letters = cased(out);
    const shouting = letters.length >= 8 && letters.filter(isUpper).length / letters.length > 0.6;
    out = out.replace(/[\p{L}\p{N}'’-]+/gu, (word) => {
      const w = cased(word);
      const allCaps = w.length && w.every(isUpper);
      if (!allCaps) return word;
      // Keep the pronoun I, known acronyms, and anything with digits (GPT-5, 4K).
      if (word === 'I' || ACRONYMS.has(word) || /\d/.test(word)) return word;
      // In a shouting title every capitalised word goes; elsewhere only long
      // single shouted words ("This is INSANE").
      if (shouting || w.length >= 5) return word.toLowerCase();
      return word;
    });
    if (shouting) out = out.replace(/(^|[.!?:|–—]\s*)(\p{Ll})/gu, (m, sep, c) => sep + c.toUpperCase());
    return out;
  }

  function titles() {
    const on = Lull.on('yt.calmTitles');
    for (const el of document.querySelectorAll(TITLES)) {
      const text = el.textContent;
      if (!on) {
        if (el.dataset.lullOrig != null && text === el.dataset.lullCalm) el.textContent = el.dataset.lullOrig;
        delete el.dataset.lullOrig;
        delete el.dataset.lullCalm;
        continue;
      }
      if (text === el.dataset.lullCalm) continue;
      const next = calm(text);
      if (next === text) continue;
      el.dataset.lullOrig = text;
      el.dataset.lullCalm = next;
      el.textContent = next;
    }
  }

  // ---- thumbnails ---------------------------------------------------------------
  const CARDS = 'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, #related yt-lockup-view-model';

  function thumbs() {
    const on = Lull.on('yt.neutralThumbs');
    for (const card of document.querySelectorAll(CARDS)) {
      const img = card.querySelector('yt-thumbnail-view-model img, ytd-thumbnail img');
      if (!img) continue;
      const link = card.querySelector('a[href*="/watch?v="]');
      const id = link && (link.getAttribute('href').match(/[?&]v=([\w-]{6,})/) || [])[1];
      const live = /\bLIVE\b/.test((card.querySelector('[class*="Badge"], ytd-thumbnail-overlay-time-status-renderer') || {}).textContent || '');
      const frame = id && `https://i.ytimg.com/vi/${id}/hq2.jpg`;
      if (on && frame && !live) {
        if (img.src === frame) continue;
        if (img.src && !img.src.includes('/hq2.jpg')) img.dataset.lullOrig = img.src;
        img.removeAttribute('srcset');
        img.setAttribute('data-lull-thumb', '');
        img.onerror = () => {
          if (img.dataset.lullOrig) img.src = img.dataset.lullOrig;
        };
        img.src = frame;
      } else if (img.hasAttribute('data-lull-thumb')) {
        img.removeAttribute('data-lull-thumb');
        if (img.dataset.lullOrig) img.src = img.dataset.lullOrig;
        delete img.dataset.lullOrig;
      }
    }
  }

  Lull.onMutate(() => {
    titles();
    thumbs();
  });
})();
