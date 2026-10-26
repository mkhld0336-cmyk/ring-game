(function() {
'use strict';
const ALL_GAMES = ['neon-pulse', 'neon-flux', 'beat-slasher', 'ghost-of-me', 'vanishing-floor', 'echo-sonar'];

function recordPlay(gameId) {
  try {
    const plays = JSON.parse(localStorage.getItem('jamam_playcounts') || '{}');
    plays[gameId] = (plays[gameId] || 0) + 1;
    localStorage.setItem('jamam_playcounts', JSON.stringify(plays));
    if (ALL_GAMES.every(g => (plays[g] || 0) > 0)) {
      window.JamamAchievements?.unlock('all_rounder');
    }
  } catch(e) {}
}

function addShareButton(gameId, gameName, getScore) {
  if (document.getElementById('jamam-share-fab')) return;
  const btn = document.createElement('button');
  btn.id = 'jamam-share-fab';
  btn.textContent = '📤';
  btn.style.cssText = `position:fixed; bottom:20px; inset-inline-start:20px; width:50px; height:50px; border-radius:50%; background:linear-gradient(135deg,#f7c969,#e9ad45); color:#171322; border:0; font-size:22px; box-shadow:0 6px 20px rgba(247,201,105,0.4); cursor:pointer; z-index:9999; display:grid; place-items:center; transition:transform .15s;`;
  btn.onclick = async () => {
    const score = getScore();
    if (!score) return;
    btn.textContent = '⏳';
    const playerName = localStorage.getItem('jamam_player_name') || 'Player';
    const ok = await window.JamamShare?.share(gameName, score, playerName, '?');
    btn.textContent = ok ? '✓' : '📤';
    setTimeout(() => btn.textContent = '📤', 2000);
  };
  document.body.appendChild(btn);
}

window.Jamam = {
  onGameEnd: function(gameId, data) {
    recordPlay(gameId);
    if (gameId === 'neon-pulse' && data.score >= 500) window.JamamAchievements?.unlock('pulse_master');
    if (gameId === 'ghost-of-me' && data.score >= 100) window.JamamAchievements?.unlock('ghost_hunter');
    if (gameId === 'echo-sonar' && data.won) window.JamamAchievements?.unlock('blind_survivor');
  },
  addShareButton,
  recordPlay
};
})();
