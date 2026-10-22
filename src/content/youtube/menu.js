// Adds "Hide channel" and "Hide a word" to the ⋮ menu of every video card.
(() => {
  const Lull = globalThis.Lull;
  if (Lull.site !== 'yt') return;

  const STOP = new Set('the a an and or of to in on for with from by at is are was be this that it its you your my our we i me how what why when who official video full new vs feat ft'.split(' '));
  let target = null;

  document.addEventListener(
    'click',
    (e) => {
      if (!Lull.on('yt.menuActions') || e.target.closest('.lull-menu')) return;
      const btn = e.target.closest('button, yt-icon-button');
      const card = btn && btn.closest(Lull.yt.CARDS);
      if (!card) return;
      const label = btn.getAttribute('aria-label') || '';
      const isMenu = btn.closest('ytd-menu-renderer, [class*="MenuButton"], [class*="menu-button"]') || /action menu|more actions/i.test(label);
      if (!isMenu) return;
      target = { card, info: Lull.yt.cardInfo(card), btn };
      for (const ms of [40, 150, 350, 700]) setTimeout(inject, ms);
    },
    true
  );

  function openDropdown() {
    return [...document.querySelectorAll('ytd-popup-container tp-yt-iron-dropdown')].find((d) => {
      if (getComputedStyle(d).display === 'none') return false;
      const r = d.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  }

  function closeMenu() {
    const opts = { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true, composed: true };
    (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', opts));
    setTimeout(() => {
      if (openDropdown() && target) target.btn.click();
    }, 90);
  }

  function item(icon, html, run) {
    const n = Lull.ui.el('div', { class: 'lull-menu-item', role: 'menuitem', tabindex: '0', html: Lull.ui.ICONS[icon] + '<span>' + html + '</span>' });
    const go = (e) => {
      e.preventDefault();
      e.stopPropagation();
      run();
    };
    n.addEventListener('click', go);
    n.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && go(e));
    return n;
  }

  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function inject() {
    if (!target || !Lull.on('yt.menuActions')) return;
    const dd = openDropdown();
    if (!dd) return;
    const list = dd.querySelector('yt-list-view-model, ytd-menu-popup-renderer #items, tp-yt-paper-listbox#items');
    if (!list) return;
    const existing = list.querySelector('.lull-menu');
    if (existing && existing.__lullTarget === target) return;
    if (existing) existing.remove();

    const { info } = target;
    const t = target;
    const menu = Lull.ui.el('div', { class: 'lull-menu', role: 'none' });
    menu.__lullTarget = t;
    const who = info.channel || info.handle;
    if (who) menu.append(item('eyeOff', `Hide channel <b>${esc(who)}</b>`, () => hideChannel(who)));
    if (info.title) menu.append(item('x', 'Hide videos with a word…', () => pickWord(info.title)));
    if (!menu.children.length) return;
    list.append(menu);

    // YouTube sizes the popup to its own items; let it grow to fit ours and
    // keep it on screen.
    const sheet = dd.querySelector('yt-sheet-view-model, ytd-menu-popup-renderer');
    if (sheet) {
      sheet.style.maxHeight = 'none';
      sheet.style.maxWidth = 'none';
    }
    const r = dd.getBoundingClientRect();
    if (r.bottom > innerHeight - 8) dd.style.top = Math.max(8, innerHeight - r.height - 8) + 'px';
    if (r.right > innerWidth - 8) dd.style.left = Math.max(8, innerWidth - r.width - 8) + 'px';
  }

  async function hideChannel(name) {
    closeMenu();
    const list = Lull.settings.yt.blockedChannels;
    if (list.some((x) => x.toLowerCase() === name.toLowerCase())) return;
    await Lull.save('yt.blockedChannels', [...list, name]);
    Lull.sound && Lull.sound.play('soft');
    Lull.toast(`Hidden videos from ${name}`, {
      label: 'Undo',
      run: () => Lull.save('yt.blockedChannels', Lull.settings.yt.blockedChannels.filter((x) => x !== name)),
    });
  }

  function pickWord(title) {
    const rect = target.btn.getBoundingClientRect();
    closeMenu();
    const words = [...new Set(title.split(/[\s|·•:,.!?()[\]"“”'’/\\-]+/).map((w) => w.trim()).filter((w) => w.length > 2 && !STOP.has(w.toLowerCase()) && !/^\d+$/.test(w)))].slice(0, 14);
    const { el } = Lull.ui;
    const input = el('input', { class: 'l-input', type: 'text', placeholder: 'Or type a word or phrase' });
    const done = async (word) => {
      word = word.trim();
      if (!word) return;
      panel.close();
      const list = Lull.settings.yt.blockedWords;
      if (!list.some((x) => x.toLowerCase() === word.toLowerCase())) await Lull.save('yt.blockedWords', [...list, word]);
      Lull.toast(`Hiding titles with “${word}”`, {
        label: 'Undo',
        run: () => Lull.save('yt.blockedWords', Lull.settings.yt.blockedWords.filter((x) => x !== word)),
      });
    };
    const chips = el(
      'div',
      { class: 'l-chips' },
      words.map((w) => {
        const b = el('button', { class: 'l-chip l-pick', type: 'button' }, w);
        b.addEventListener('click', () => done(w));
        return b;
      })
    );
    const add = el('button', { class: 'l-btn l-primary', type: 'button' }, 'Hide');
    add.addEventListener('click', () => done(input.value));
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') done(input.value);
    });
    const body = el('div', { class: 'l-word' }, el('div', { class: 'l-hint' }, 'Hide every video whose title contains:'), chips, el('div', { class: 'l-add' }, input, add));
    const panel = Lull.openPanel({ title: 'Hide a word', body, anchor: rect });
    setTimeout(() => input.focus(), 30);
  }

  // ---- one-click "Not interested" -------------------------------------------
  // A small button on each card that runs YouTube's own "Not interested" from
  // the ⋮ menu (Shift-click: "Don't recommend channel"), so YouTube learns from
  // it exactly as if you'd used the menu.
  const QUICK_CARDS = 'ytd-rich-item-renderer, #related yt-lockup-view-model';
  const NI_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/></svg>';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function runMenuItem(card, pattern) {
    const btn = card.querySelector('[class*="MenuButton"] button, ytd-menu-renderer yt-icon-button button, button[aria-label="More actions"], button[aria-label="Action menu"]');
    if (!btn) return false;
    const root = document.documentElement;
    root.classList.add('lull-quiet-menu');
    try {
      btn.click();
      for (let i = 0; i < 25; i++) {
        await sleep(60);
        const dd = openDropdown();
        if (!dd) continue;
        const entry = [...dd.querySelectorAll('yt-list-item-view-model, ytd-menu-service-item-renderer')].find((n) => pattern.test(n.textContent.trim()));
        if (entry) {
          (entry.querySelector('button, a, tp-yt-paper-item') || entry).click();
          return true;
        }
        if (i > 8) break;
      }
      closeMenu();
      return false;
    } finally {
      setTimeout(() => root.classList.remove('lull-quiet-menu'), 250);
    }
  }

  function ensureQuickButtons() {
    const on = Lull.on('yt.quickNotInterested');
    for (const card of document.querySelectorAll(QUICK_CARDS)) {
      const slot = card.querySelector('.ytLockupViewModelMetadata');
      const existing = card.querySelector('.lull-ni');
      if (!on || !slot || !card.querySelector('a[href*="/watch?v="]')) {
        if (existing) existing.remove();
        continue;
      }
      if (existing && existing.parentElement === slot) continue;
      if (existing) existing.remove();
      const b = Lull.ui.el('button', { class: 'lull-ni', type: 'button', title: 'Not interested (Shift: don’t recommend channel)', 'aria-label': 'Not interested', html: NI_ICON });
      b.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const channel = e.shiftKey;
        const ok = await runMenuItem(card, channel ? /don.t recommend channel/i : /^not interested$/i);
        if (!ok) Lull.toast(channel ? 'This video has no “Don’t recommend channel” option.' : 'This video has no “Not interested” option.');
      });
      slot.append(b);
    }
  }
  Lull.onMutate(ensureQuickButtons);

  // YouTube's hover preview is laid over the whole thumbnail, which with
  // overlay cards includes the title strip (and ⋮). While hovering such a
  // card, trim the preview's bottom edge so the strip stays visible and
  // clickable; the preview itself keeps playing.
  document.addEventListener(
    'pointerover',
    (e) => {
      const root = document.documentElement;
      const card = e.target.closest && e.target.closest(QUICK_CARDS);
      if (!card || !root.hasAttribute('data-lull-overlay')) {
        root.classList.remove('lull-clip-preview');
        return;
      }
      const strip = card.querySelector('.ytLockupMetadataViewModelTextContainer');
      if (strip) root.style.setProperty('--lull-strip', Math.ceil(strip.getBoundingClientRect().height) + 'px');
      root.classList.add('lull-clip-preview');
    },
    true
  );
})();
