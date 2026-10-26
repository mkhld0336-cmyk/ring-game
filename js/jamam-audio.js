class JamamAmbientAudio {
  constructor() {
    this.ctx = null; this.isMuted = true; this.gainNode = null; this.filterNode = null; this.activeOscillators = []; this.chordInterval = null;
    this.scale = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63];
  }
  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();
    this.gainNode = this.ctx.createGain(); this.gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime);
    this.filterNode = this.ctx.createBiquadFilter(); this.filterNode.type = 'lowpass'; this.filterNode.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.filterNode.connect(this.gainNode); this.gainNode.connect(this.ctx.destination);
  }
  start() {
    this.init(); if (this.ctx.state === 'suspended') this.ctx.resume();
    this.isMuted = false; this.playAmbientChord();
    this.chordInterval = setInterval(() => { if (!this.isMuted) this.playAmbientChord(); }, 6000);
  }
  stop() { this.isMuted = true; if (this.chordInterval) clearInterval(this.chordInterval); this.fadeAndStopOscillators(); }
  toggle() { if (this.isMuted) this.start(); else this.stop(); return !this.isMuted; }
  playAmbientChord() {
    this.fadeAndStopOscillators();
    const rootIdx = Math.floor(Math.random() * (this.scale.length - 4));
    const chordNotes = [this.scale[rootIdx], this.scale[rootIdx + 2], this.scale[rootIdx + 4]];
    chordNotes.forEach((freq) => {
      const osc = this.ctx.createOscillator(), oscGain = this.ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.detune.setValueAtTime((Math.random() - 0.5) * 12, this.ctx.currentTime);
      oscGain.gain.setValueAtTime(0.001, this.ctx.currentTime); oscGain.gain.exponentialRampToValueAtTime(0.2, this.ctx.currentTime + 2.5);
      osc.connect(oscGain); oscGain.connect(this.filterNode); osc.start();
      this.activeOscillators.push({ osc, gain: oscGain });
    });
  }
  fadeAndStopOscillators() {
    const now = this.ctx ? this.ctx.currentTime : 0;
    this.activeOscillators.forEach(({ osc, gain }) => {
      try { gain.gain.setValueAtTime(gain.gain.value, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0); setTimeout(() => { osc.stop(); osc.disconnect(); }, 2000); } catch (e) {}
    });
    this.activeOscillators = [];
  }
}
window.JAMAM = window.JAMAM || {};
window.JAMAM.ambientAudio = new JamamAmbientAudio();
