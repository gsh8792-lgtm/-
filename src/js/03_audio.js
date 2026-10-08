// ===== 03_audio.js : WebAudio 합성 효과음 (외부 파일 없음) =====
const Sfx = {
  ctx: null, enabled: true, master: null, last: {},
  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  // 너무 잦은 동일 효과음 억제
  _gate(name, ms) {
    const now = performance.now();
    if (this.last[name] && now - this.last[name] < ms) return false;
    this.last[name] = now;
    return true;
  },
  tone(freq, dur, type, vol, slideTo, delay) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + (delay || 0);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(dur, vol, filterFreq, delay) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + (delay || 0);
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = filterFreq || 2000;
    const g = this.ctx.createGain();
    g.gain.value = vol || 0.2;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0);
  },
  play(name) {
    if (!this.ctx || !this.enabled) return;
    switch (name) {
      case 'click': if (this._gate(name, 40)) this.tone(660, 0.06, 'square', 0.08, 880); break;
      case 'back': if (this._gate(name, 40)) this.tone(520, 0.07, 'square', 0.07, 330); break;
      case 'hit': if (this._gate(name, 45)) { this.noise(0.08, 0.18, 1800); this.tone(180, 0.07, 'square', 0.08, 90); } break;
      case 'crit': this.noise(0.14, 0.28, 3200); this.tone(320, 0.12, 'sawtooth', 0.12, 110); break;
      case 'heal': if (this._gate(name, 80)) { this.tone(523, 0.12, 'sine', 0.12, 784); this.tone(784, 0.16, 'sine', 0.08, 1046, 0.06); } break;
      case 'shoot': if (this._gate(name, 60)) this.tone(900, 0.06, 'triangle', 0.06, 500); break;
      case 'magic': if (this._gate(name, 60)) { this.tone(700, 0.18, 'sine', 0.1, 1400); this.tone(1050, 0.18, 'triangle', 0.05, 2100, 0.04); } break;
      case 'skill': this.tone(440, 0.1, 'square', 0.1, 880); this.tone(880, 0.12, 'square', 0.06, 1320, 0.05); break;
      case 'death': this.noise(0.3, 0.2, 700); this.tone(240, 0.3, 'triangle', 0.1, 60); break;
      case 'charge': this.tone(110, 0.5, 'sawtooth', 0.12, 220); this.tone(116, 0.5, 'sawtooth', 0.08, 230, 0.02); break;
      case 'boom': this.noise(0.45, 0.4, 500); this.tone(70, 0.4, 'sine', 0.3, 35); break;
      case 'cancel': this.tone(1200, 0.08, 'square', 0.1, 600); this.tone(900, 0.12, 'square', 0.08, 300, 0.08); break;
      case 'ult': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, 'square', 0.09, f * 1.01, i * 0.06)); break;
      case 'pause': this.tone(400, 0.08, 'sine', 0.1, 300); break;
      case 'coin': this.tone(988, 0.07, 'square', 0.08); this.tone(1319, 0.12, 'square', 0.08, null, 0.07); break;
      case 'win': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.16, 'square', 0.08, null, i * 0.11)); break;
      case 'lose': [392, 349, 311, 262].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.12, null, i * 0.22)); break;
      case 'step': if (this._gate(name, 220)) this.noise(0.04, 0.05, 900); break;
      case 'door': this.tone(150, 0.3, 'sine', 0.15, 300); this.noise(0.25, 0.1, 1200); break;
      case 'summon': this.tone(300, 0.25, 'square', 0.08, 600); break;
      case 'phase': this.tone(90, 0.6, 'sawtooth', 0.2, 45); this.noise(0.5, 0.3, 400); break;
      default: break;
    }
  },
};
