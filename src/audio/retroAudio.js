// Retro Chiptune Audio Synthesizer (Native Web Audio API)
class RetroAudioSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.isPlaying = false;
    this.muted = false;
    this.timerId = null;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.bgmGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);
  }

  unlock() {
    if (!this.ctx) this.init();
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.25, this.ctx.currentTime, 0.05);
    }
    return this.muted;
  }

  isMuted() { return this.muted; }

  playJump() {
    if (this.muted) return;
    this.unlock();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {}
  }

  playCoin() {
    if (this.muted) return;
    this.unlock();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.setValueAtTime(1318.51, now + 0.08);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.31);
    } catch {}
  }

  playCorrect() {
    if (this.muted) return;
    this.unlock();
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + idx * 0.07;
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.22);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(start);
        osc.stop(start + 0.23);
      });
    } catch {}
  }

  playWrong() {
    if (this.muted) return;
    this.unlock();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.28);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.29);
    } catch {}
  }

  playBounce() {
    if (this.muted) return;
    this.unlock();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.18);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.21);
    } catch {}
  }

  startBGM() {
    if (this.isPlaying) return;
    this.unlock();
    this.isPlaying = true;
    const mel = [64,0,67,72,71,0,67,0,69,0,67,0,64,0,62,60,64,0,67,72,74,0,76,0,72,0,69,72,71,0,0,0];
    const bass = [36,0,48,0,36,0,48,0,41,0,53,0,36,0,48,0,36,0,48,0,43,0,55,0,41,0,53,0,43,0,55,0];
    let step = 0;
    this.timerId = setInterval(() => {
      if (!this.isPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const n = mel[step % mel.length];
      if (n > 0) {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = "square";
        o.frequency.setValueAtTime(440 * Math.pow(2, (n - 69) / 12), now);
        g.gain.setValueAtTime(0.06, now);
        g.gain.exponentialRampToValueAtTime(0.005, now + 0.11);
        o.connect(g); g.connect(this.bgmGain);
        o.start(now); o.stop(now + 0.12);
      }
      const b = bass[step % bass.length];
      if (b > 0) {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(440 * Math.pow(2, (b - 69) / 12), now);
        g.gain.setValueAtTime(0.15, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
        o.connect(g); g.connect(this.bgmGain);
        o.start(now); o.stop(now + 0.17);
      }
      step++;
    }, 125);
  }

  stopBGM() {
    this.isPlaying = false;
    if (this.timerId) clearInterval(this.timerId);
  }
}

export const retroAudio = new RetroAudioSystem();
