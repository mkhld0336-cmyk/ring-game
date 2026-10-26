(function() {
  if (!window.JAMAM) return;

  const ACHIEVEMENTS = {
    pulse_master: { title: "برق النيون", desc: "احصل على 500 نقطة في نبض النيون", xp: 100 },
    blind_survivor: { title: "سيد الظلام", desc: "أكمل صدى الظلام", xp: 150 },
    ghost_hunter: { title: "مهزوم الظل", desc: "اهزم شبحك في شبح الماضي", xp: 120 },
    flux_master: { title: "كيميائي النيون", desc: "أكمل مستوى في نيون فلكس", xp: 80 },
    rhythm_master: { title: "إيقاع النبض", desc: "احصل على 50 نقطة في بيت سلاشر", xp: 100 },
    survivor: { title: "البقاء للأقوى", desc: "احصل على 30 خطوة في الأرضية المتلاشية", xp: 120 }
  };

  function showToast(title, desc, xp) {
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1a1f3a;border:2px solid #f7c969;border-radius:15px;padding:15px 20px;z-index:99999;display:flex;gap:15px;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,0.5);direction:rtl;`;
    toast.innerHTML = `<div style="font-size:30px">🏆</div><div><h4 style="color:#f7c969;margin:0 0 5px">إنجاز جديد!</h4><p style="margin:0;font-size:14px"><b>${title}</b>: ${desc}</p><span style="font-size:12px;color:#3cff8c">+${xp} XP</span></div>`;
    document.body.appendChild(toast);
    if (window.JAMAM && window.JAMAM.haptics) JAMAM.haptics.tap('achievement');
    setTimeout(() => toast.remove(), 4000);
  }

  function unlock(id) {
    let unlocked = JAMAM.store.get(JAMAM.KEYS.achievements, []);
    if (unlocked.includes(id)) return;
    
    unlocked.push(id);
    JAMAM.store.set(JAMAM.KEYS.achievements, unlocked);
    
    const data = ACHIEVEMENTS[id];
    if (data) showToast(data.title, data.desc, data.xp);
  }

  JAMAM.on('game:end', (data) => {
    if (data.gameId === 'neon-pulse' && data.score >= 500) unlock('pulse_master');
    if (data.gameId === 'echo-sonar' && data.won) unlock('blind_survivor');
    if (data.gameId === 'ghost-of-me' && data.score >= 100) unlock('ghost_hunter');
    if (data.gameId === 'neon-flux' && data.score > 0) unlock('flux_master');
    if (data.gameId === 'beat-slasher' && data.score >= 50) unlock('rhythm_master');
    if (data.gameId === 'vanishing-floor' && data.score >= 30) unlock('survivor');
  });

})();
