/* ============================================================
   JAMAM DAILY MISSIONS
   ============================================================ */
(function() {
'use strict';

const MISSIONS_POOL = [
  { id: 'collect_diamonds', icon: '💎', target: 100, reward: 30, text: 'اجمع {target} ماسة' },
  { id: 'beat_boss', icon: '☠️', target: 1, reward: 50, text: 'اهزم البوس {target} مرة' },
  { id: 'reach_level', icon: '🏆', target: 3, reward: 40, text: 'وصل للمستوى {target}' },
  { id: 'play_games', icon: '🎮', target: 5, reward: 25, text: 'العب {target} ألعاب مختلفة' },
  { id: 'high_combo', icon: '⚡', target: 10, reward: 35, text: 'حقق كومبو ×{target}' },
  { id: 'collect_emojis', icon: '🌸', target: 50, reward: 20, text: 'اجمع {target} رمز' }
];

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function getState() {
  const stored = JAMAM.store.get('jamam_daily_missions', null);
  const today = getTodayKey();
  
  if (!stored || stored.date !== today) {
    const shuffled = MISSIONS_POOL.slice().sort(() => Math.random() - 0.5);
    const todayMissions = shuffled.slice(0, 3).map(m => ({
      ...m, progress: 0, completed: false, claimed: false
    }));
    const newState = { date: today, missions: todayMissions };
    JAMAM.store.set('jamam_daily_missions', newState);
    return newState;
  }
  return stored;
}

function saveState(state) {
  JAMAM.store.set('jamam_daily_missions', state);
}

function updateProgress(missionId, amount = 1) {
  const state = getState();
  const mission = state.missions.find(m => m.id === missionId);
  if (!mission || mission.completed) return;
  
  mission.progress = Math.min(mission.target, mission.progress + amount);
  if (mission.progress >= mission.target && !mission.completed) {
    mission.completed = true;
    if (window.JAMAM && JAMAM.haptics) JAMAM.haptics.tap('levelup');
  }
  saveState(state);
  renderBadge();
}

function claimReward(missionId) {
  const state = getState();
  const mission = state.missions.find(m => m.id === missionId);
  if (!mission || !mission.completed || mission.claimed) return false;
  
  mission.claimed = true;
  saveState(state);
  
  const coinData = JAMAM.store.get(JAMAM.KEYS.coins, { balance: 0 });
  coinData.balance += mission.reward;
  JAMAM.store.set(JAMAM.KEYS.coins, coinData);
  
  if (window.updateHubCoins) window.updateHubCoins();
  if (window.JAMAM && JAMAM.haptics) JAMAM.haptics.tap('coin');
  return true;
}

function renderBadge() {
  const state = getState();
  const completedCount = state.missions.filter(m => m.completed && !m.claimed).length;
  const badge = document.getElementById('dailyBadge');
  if (badge) {
    badge.textContent = completedCount > 0 ? completedCount : '';
    badge.style.display = completedCount > 0 ? 'flex' : 'none';
  }
}

function renderMissionsList() {
  const state = getState();
  const container = document.getElementById('daily-missions-list');
  if (!container) return;
  
  container.innerHTML = state.missions.map(m => {
    const progressPct = (m.progress / m.target) * 100;
    const text = m.text.replace('{target}', m.target);
    const status = m.claimed ? '✓ مستلمة' : m.completed ? '🎁 استلام' : `${m.progress}/${m.target}`;
    
    return `
      <div class="mission-row">
        <div class="mission-icon">${m.icon}</div>
        <div class="mission-info">
          <div class="mission-text">${text}</div>
          <div class="mission-bar"><div style="width:${progressPct}%"></div></div>
        </div>
        <button class="mission-btn ${m.completed && !m.claimed ? 'claimable' : ''}" 
                onclick="JAMAM.daily.claim('${m.id}')" 
                ${!m.completed || m.claimed ? 'disabled' : ''}>
          ${status}
        </button>
      </div>
    `;
  }).join('');
}

// Public API
window.JAMAM = window.JAMAM || {};
window.JAMAM.daily = {
  getState,
  updateProgress,
  claim: function(missionId) {
    if (claimReward(missionId)) {
      renderMissionsList();
      renderBadge();
      const reward = MISSIONS_POOL.find(m=>m.id===missionId)?.reward || 0;
      alert('🎉 استلمت ' + reward + ' عملة!');
    }
  },
  renderList: renderMissionsList,
  renderBadge: renderBadge
};

// Hook into game events
if (window.JAMAM && JAMAM.on) {
  JAMAM.on('game:end', function(data) {
    if (!data) return;
    const extra = data.extra || {};
    
    if (extra.emojis && extra.emojis > 0) updateProgress('collect_emojis', extra.emojis);
    if (extra.diamonds && extra.diamonds > 0) updateProgress('collect_diamonds', extra.diamonds);
    if (data.gameId === 'neon-pulse' && extra.bossDefeated) updateProgress('beat_boss', 1);
    if (data.score >= 500) updateProgress('high_combo', 1);
    if (data.score && data.score >= 1000) updateProgress('reach_level', 1);
  });
}

// Init on ready
if (window.JAMAM && JAMAM.ready) {
  JAMAM.ready(function() { renderBadge(); });
} else {
  setTimeout(renderBadge, 100);
}

})();
