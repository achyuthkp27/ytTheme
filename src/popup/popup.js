(async () => {
  const Lull = globalThis.Lull;
  const { ui } = Lull;
  ui.adopt(document);

  const TABS = {
    yt: [{ keys: ui.SECTIONS.find((s) => s.id === 'yt-clean').controls.map((c) => c.key) }],
    design: [
      { title: 'Layout', keys: ['design.glass', 'design.background', 'design.bgFrame', 'design.rail', 'design.overlayCards', 'design.perRow'] },
      { title: 'Theme', keys: ['design.theme', 'design.font'] },
      { title: 'Mood', keys: ['design.greeting', 'design.name', 'design.nameColor', 'design.nameCustom', 'design.watchRoom', 'design.motion', 'design.sounds'] },
    ],
  };

  Lull.settings = await Lull.load();
  const panel = document.getElementById('panel');
  let mounted = [];
  let tab = 'yt';
  try {
    tab = localStorage.getItem('lull-popup-tab') || 'yt';
  } catch (e) {}

  function show(next) {
    tab = TABS[next] ? next : 'yt';
    try {
      localStorage.setItem('lull-popup-tab', tab);
    } catch (e) {}
    for (const b of document.querySelectorAll('.tabs button')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
    panel.replaceChildren();
    mounted = TABS[tab].map((group) => {
      if (group.title) panel.append(ui.el('div', { class: 'sub' }, group.title));
      const box = ui.el('div');
      panel.append(box);
      return ui.mount(box, ui.pick(group.keys), structuredClone(Lull.settings));
    });
  }

  for (const b of document.querySelectorAll('.tabs button')) b.addEventListener('click', () => show(b.dataset.tab));
  document.getElementById('all').addEventListener('click', () => chrome.runtime.openOptionsPage());

  Lull.onChange((next) => {
    if (!next) return;
    Lull.settings = next;
    for (const m of mounted) m.update(structuredClone(next));
  });

  show(tab);

  // Watch time: today and the last 7 days (counted on this computer).
  const fmt = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    return h ? `${h} h ${m} min` : `${m} min`;
  };
  const { watchTime = {} } = await chrome.storage.local.get('watchTime');
  const day = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const now = new Date();
  let week = 0;
  for (let i = 0; i < 7; i++) week += watchTime[day(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i))] || 0;
  const todayS = watchTime[day(now)] || 0;
  if (week) {
    const box = document.getElementById('watch');
    box.hidden = false;
    box.title = 'Video time counted on this computer';
    box.append(ui.el('b', {}, fmt(todayS) + ' today'), fmt(week) + ' this week');
  }
})();
