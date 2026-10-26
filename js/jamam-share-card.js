(function() {
'use strict';
class JamamShareCard {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1200;
    this.canvas.height = 630;
    this.ctx = this.canvas.getContext('2d');
  }

  async share(gameName, score, playerName, rank) {
    try {
      const ctx = this.ctx;
      // 1. خلفية النيون
      const grad = ctx.createLinearGradient(0, 0, 1200, 630);
      grad.addColorStop(0, '#0f0c29');
      grad.addColorStop(0.5, '#302b63');
      grad.addColorStop(1, '#24243e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 630);

      // 2. الإطار الزجاجي
      ctx.fillStyle = 'rgba(20, 20, 35, 0.75)';
      ctx.strokeStyle = 'rgba(247, 201, 105, 0.35)';
      ctx.lineWidth = 3;
      this.roundRect(ctx, 80, 60, 1040, 510, 28, true, true);

      // 3. الشعار
      ctx.fillStyle = '#f7c969';
      ctx.font = '900 32px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('👑 JAMAM GAMES', 1040, 100);

      // 4. اسم اللعبة
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 42px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`اللعبة: ${gameName}`, 140, 165);

      // 5. اللاعب والترتيب
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 24px system-ui, sans-serif';
      ctx.fillText(`اللاعب: ${playerName}`, 140, 225);

      // 6. النقاط بشكل ضخم
      ctx.fillStyle = '#57e8ff';
      ctx.font = '900 96px system-ui, sans-serif';
      ctx.fillText(score.toLocaleString('en-US'), 140, 330);

      // 7. التذييل
      ctx.fillStyle = '#f7c969';
      ctx.font = '700 24px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('هل تستطيع التغلب عليّ؟ 🎮', 1040, 500);

      const blob = await new Promise(r => this.canvas.toBlob(r, 'image/png'));
      const file = new File([blob], 'jamam-score.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'JAMAM GAMES',
          text: `🏆 ${playerName} - ${score} في ${gameName}`
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'jamam-score.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      return true;
    } catch(e) {
      return false;
    }
  }

  roundRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }
}
window.JamamShare = new JamamShareCard();
})();
