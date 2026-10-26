(function() {
  if (!window.JAMAM) return;
  
  // الاستماع لنهاية اللعبة لتوزيع الجوائز
  JAMAM.on('game:end', (data) => {
    // 1. حساب الخبرة (XP) - نقطة خبرة لكل 10 نقاط لعب
    const xpEarned = Math.floor(data.score / 10);
    if (xpEarned > 0) {
      let xpData = JAMAM.store.get(JAMAM.KEYS.xp, { level: 1, xp: 0, totalXp: 0 });
      xpData.xp += xpEarned;
      xpData.totalXp += xpEarned;
      
      // ترقية المستوى (كل 500 خبرة = مستوى جديد)
      const newLevel = 1 + Math.floor(xpData.totalXp / 500);
      if (newLevel > xpData.level) {
        xpData.level = newLevel;
        JAMAM.haptics.tap('levelup');
        console.log(`🎉 مبروك! وصلت للمستوى ${newLevel}`);
      }
      JAMAM.store.set(JAMAM.KEYS.xp, xpData);
    }

    // 2. حساب العملات - عملة واحدة لكل 50 نقطة
    const coinsEarned = Math.floor(data.score / 50);
    if (coinsEarned > 0) {
      let coinData = JAMAM.store.get(JAMAM.KEYS.coins, { balance: 0 });
      coinData.balance += coinsEarned;
      JAMAM.store.set(JAMAM.KEYS.coins, coinData);
    }
    
    console.log(`[Progress] تم إضافة ${xpEarned} XP و ${coinsEarned} عملة.`);
  });
})();
