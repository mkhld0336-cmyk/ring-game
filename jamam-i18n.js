(function() {
'use strict';
// We keep it simple here for the achievements and share card
const I18N = {
  en: {
    achNew: "New Achievement Unlocked!", achPulseMaster: "Neon Lightning", achPulseDesc: "Score 500+ in Neon Pulse",
    achBlindSurvivor: "Master of Darkness", achBlindDesc: "Complete Echo Sonar",
    achGhostHunter: "Shadow Slayer", achGhostDesc: "Score 100+ in Ghost of Me",
    achAllRounder: "Platform Legend", achAllRounderDesc: "Play all 6 games",
    xp: "XP", shareGame: "Game", sharePlayer: "Player", shareTotal: "High Score", shareTagline: "Can you beat me? 🎮"
  },
  ar: {
    achNew: "إنجاز جديد!", achPulseMaster: "برق النيون ⚡", achPulseDesc: "تجاوز 500 نقطة في نبض النيون",
    achBlindSurvivor: "سيد الظلام 🦇", achBlindDesc: "أكمل صدى الظلام",
    achGhostHunter: "مهزوم الظل 👻", achGhostDesc: "تجاوز 100 نقطة في شبح الماضي",
    achAllRounder: "أسطورة المنصة 👑", achAllRounderDesc: "العب الألعاب الست كلها",
    xp: "خبرة", shareGame: "اللعبة", sharePlayer: "اللاعب", shareTotal: "أعلى نتيجة", shareTagline: "هل تستطيع التغلب عليّ؟ 🎮"
  }
};
const LANG_KEY = 'jamam_games_lang';
function getLang() {
  try { const s = localStorage.getItem(LANG_KEY); if (s && I18N[s]) return s; } catch(e){}
  return 'ar'; // Default to Arabic
}
function t(key) {
  const lang = getLang();
  const dict = I18N[lang] || I18N.ar;
  return dict[key] || I18N.ar[key] || key;
}
window.JamamI18N = { t: t, getLang: getLang };
})();
