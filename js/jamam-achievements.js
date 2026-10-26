(function() {
class JamamAchievements {
  constructor() {
    this.storageKey = "jamam_unlocked_achievements";
    this.definitions = {
      pulse_master: { title: "برق النيون ⚡", desc: "تجاوز 500 نقطة", xp: 100 },
      blind_survivor: { title: "سيد الظلام 🦇", desc: "أكمل صدى الظلام", xp: 150 },
      ghost_hunter: { title: "مهزوم الظل 👻", desc: "تجاوز 100 نقطة في شبح الماضي", xp: 120 },
      all_rounder: { title: "أسطورة المنصة 👑", desc: "العب الألعاب الست", xp: 300 }
    };
  }
  getUnlocked() { try { return JSON.parse(localStorage.getItem(this.storageKey)) || []; } catch(e) { return []; } }
  unlock(id) {
    const unlocked = this.getUnlocked();
    if (unlocked.includes(id)) return;
    const def = this.definitions[id];
    if (!def) return;
    unlocked.push(id);
    localStorage.setItem(this.storageKey, JSON.stringify(unlocked));
    this.showToast(def);
  }
  showToast(def) {
    if (document.getElementById('jamam-toast-styles')) return;
    const style = document.createElement('style');
    style.id = 'jamam-toast-styles';
    style.innerHTML = `.jamam-toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-150%); background: linear-gradient(135deg,#1a1f3a,#0f1425); border: 1.5px solid #f7c969; border-radius: 18px; padding: 16px 20px; display: flex; gap: 14px; align-items: center; z-index: 99999; box-shadow: 0 20px 60px rgba(0,0,0,.6); max-width: 90vw; transition: transform .4s cubic-bezier(.34,1.56,.64,1); direction: rtl; font-family: system-ui; } .jamam-toast.show { transform: translateX(-50%) translateY(0); } .jamam-toast h4 { margin: 0 0 4px; color: #f7c969; font-size: 15px; } .jamam-toast p { margin: 0; color: #d5deed; font-size: 13px; } .jamam-toast .xp { display: inline-block; margin-top: 6px; padding: 2px 10px; background: rgba(60,255,140,.15); border: 1px solid rgba(60,255,140,.4); border-radius: 99px; font-size: 11px; color: #3cff8c; font-weight: bold; }`;
    document.head.appendChild(style);
    const toast = document.createElement('div');
    toast.className = 'jamam-toast';
    toast.innerHTML = `<div style="font-size:30px">🏆</div><div><h4>إنجاز جديد!</h4><p><strong>${def.title}</strong>: ${def.desc}</p><span class="xp">+${def.xp} XP</span></div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 4000);
  }
}
window.JamamAchievements = new JamamAchievements();
})();
