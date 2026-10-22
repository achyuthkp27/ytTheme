(async () => {
  const Lull = globalThis.Lull;
  const { ui } = Lull;
  const { el, ICONS } = ui;
  ui.adopt(document);

  Lull.settings = await Lull.load();
  const nav = document.getElementById('nav');
  const host = document.getElementById('sections');
  const mounted = [];

  const actions = {
    async clearHistory() {
      await chrome.storage.local.remove('ytHistory');
      return 'Cleared. ytTheme no longer remembers any videos.';
    },
  };

  let group = '';
  const sections = [...ui.SECTIONS, { id: 'data', group: 'Data', title: 'Backup & reset', icon: 'data', blurb: 'Move your settings to another browser, or start over.' }];
  for (const s of sections) {
    if (s.group !== group) {
      group = s.group;
      nav.append(el('div', { class: 'nav-group' }, group));
    }
    nav.append(el('a', { href: '#' + s.id, html: ICONS[s.icon] + `<span>${s.title}</span>` }));

    const card = el('section', { class: 'card', id: s.id }, el('h2', { html: ICONS[s.icon] + `<span>${s.title}</span>` }), s.blurb ? el('p', { class: 'blurb' }, s.blurb) : null);
    host.append(card);
    if (s.controls) {
      const box = el('div');
      card.append(box);
      mounted.push(ui.mount(box, s.controls, structuredClone(Lull.settings), { actions }));
    }
  }

  // ---- backup & reset --------------------------------------------------------
  const status = el('div', { class: 'status', role: 'status' });
  const btn = (label, fn, cls = '') => {
    const b = el('button', { class: 'l-btn ' + cls, type: 'button' }, label);
    b.addEventListener('click', fn);
    return b;
  };
  const exportBtn = btn('Export settings', async () => {
    const settings = await Lull.load();
    const blob = new Blob([JSON.stringify({ lull: 1, settings }, null, 2)], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: 'ytTheme-settings.json' });
    a.click();
    URL.revokeObjectURL(a.href);
    status.textContent = 'Saved ytTheme-settings.json.';
  });
  const importBtn = btn('Import…', () => {
    const input = el('input', { type: 'file', accept: 'application/json,.json' });
    input.addEventListener('change', async () => {
      try {
        const data = JSON.parse(await input.files[0].text());
        if (!data || !data.settings) throw new Error('not a ytTheme file');
        await Lull.saveAll(Lull.merge(Lull.DEFAULTS, data.settings));
        status.textContent = 'Imported.';
      } catch (e) {
        status.textContent = 'That file could not be read as ytTheme settings.';
      }
    });
    input.click();
  });
  let armed = false;
  const resetBtn = btn(
    'Reset everything',
    async () => {
      if (!armed) {
        armed = true;
        resetBtn.textContent = 'Click again to reset';
        status.textContent = 'This resets every setting and removes your background image. Hidden lists are cleared too.';
        setTimeout(() => {
          armed = false;
          resetBtn.textContent = 'Reset everything';
        }, 4000);
        return;
      }
      armed = false;
      resetBtn.textContent = 'Reset everything';
      await chrome.storage.local.remove('customBackground');
      await Lull.saveAll(structuredClone(Lull.DEFAULTS));
      status.textContent = 'Everything is back to the defaults.';
    },
    'l-danger'
  );
  document.getElementById('data').append(el('div', { class: 'data-row' }, exportBtn, importBtn, resetBtn), status);

  Lull.onChange((next) => {
    if (!next) return;
    Lull.settings = next;
    for (const m of mounted) m.update(structuredClone(next));
  });

  // Highlight the section in view.
  const links = [...nav.querySelectorAll('a')];
  const spy = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        for (const a of links) a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + e.target.id));
      }
    },
    { rootMargin: '-30% 0px -60% 0px' }
  );
  for (const c of host.querySelectorAll('.card')) spy.observe(c);
})();
