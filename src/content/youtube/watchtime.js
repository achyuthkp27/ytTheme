// Counts how long videos actually play (not ads), per day, on this computer
// only. The popup shows the totals; past your daily limit a gentle note
// appears once. It never blocks anything.
(() => {
  const Lull = globalThis.Lull;
  if (Lull.site !== 'yt') return;

  const KEEP_DAYS = 60;
  let last = 0;
  let pending = 0;

  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  function sample() {
    if (!Lull.alive()) return;
    const v = document.querySelector('#movie_player video');
    const playing = Lull.page === 'watch' && Lull.settings && Lull.settings.yt.enabled && v && !v.paused && !v.ended && !document.querySelector('#movie_player.ad-showing');
    const now = Date.now();
    if (playing && last) pending += Math.min(now - last, 5000) / 1000;
    last = playing ? now : 0;
    if (pending >= 30) flush();
  }

  async function flush() {
    const add = Math.floor(pending);
    if (!add || !Lull.alive()) return;
    pending -= add;
    try {
      const day = today();
      const { watchTime = {}, watchNudged = '' } = await chrome.storage.local.get(['watchTime', 'watchNudged']);
      watchTime[day] = (watchTime[day] || 0) + add;
      for (const k of Object.keys(watchTime).sort().slice(0, -KEEP_DAYS)) delete watchTime[k];
      await chrome.storage.local.set({ watchTime });
      const limit = Lull.settings.yt.watchLimit;
      if (limit > 0 && watchTime[day] >= limit * 60 && watchNudged !== day) {
        await chrome.storage.local.set({ watchNudged: day });
        Lull.toast(`You’ve watched ${Lull.duration(watchTime[day])} today. Maybe a short break?`, { label: 'Okay', run: () => {} });
      }
    } catch (e) {
      // The extension was reloaded mid-write; the next sample carries on.
    }
  }

  Lull.duration = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    return h ? `${h} h ${m} min` : `${m} min`;
  };

  setInterval(sample, 2000);
  addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => document.hidden && flush());
})();
