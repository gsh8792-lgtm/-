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
    if (this.ctx && typeof Music !== 'undefined') setTimeout(() => Music.kick(), 0);
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

// ===== 배경 음악: WebAudio로 합성하는 작은 시퀀서 (외부 파일 없음) =====
// 곡 = { bpm, bars: [화음 루트(미디)...], 패턴 }. 16분음표 단위로 0.12초 앞까지 미리 예약한다
const MIDI = (n) => 440 * Math.pow(2, (n - 69) / 12);
const MUSIC_TRACKS = {
  // 마을: 느긋한 장조 (C - Am - F - G), 트라이앵글 선율 + 부드러운 패드
  village: { bpm: 92, vol: 0.5, chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], bass: [48, 45, 41, 43],
    lead: [72, null, 76, null, 79, null, 76, 74, 72, null, 69, null, 72, null, null, null, 69, null, 72, null, 76, null, 74, 72, 71, null, 67, null, 71, null, null, null],
    leadWave: 'triangle', drums: 'soft' },
  // 탐험: 어두운 단조 (Am - F - G - Em), 느린 드론 + 띄엄띄엄 종소리 + 심장 박동
  explore: { bpm: 68, vol: 0.45, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], bass: [45, 41, 43, 40],
    lead: [null, null, 81, null, null, null, null, null, 79, null, null, null, 76, null, null, null, null, null, 77, null, null, null, 76, null, null, null, 74, null, null, null, null, null],
    leadWave: 'sine', drums: 'heart' },
  // 전투: 빠른 단조 (Dm - Bb - C - A), 8분 베이스 + 드럼 + 아르페지오
  battle: { bpm: 132, vol: 0.5, chords: [[62, 65, 69], [58, 62, 65], [60, 64, 67], [57, 61, 64]], bass: [38, 34, 36, 33],
    lead: [74, 77, 81, 77, 74, 77, 81, 86, 74, 77, 81, 77, 72, 76, 79, 76, 70, 74, 77, 74, 70, 74, 77, 82, 72, 76, 79, 76, 69, 73, 76, 81],
    leadWave: 'square', drums: 'battle', arp: true },
  // 보스: 더 무겁게 (Em - C - D - B), 톱니 베이스 + 두 번 차는 킥
  boss: { bpm: 140, vol: 0.55, chords: [[64, 67, 71], [60, 64, 67], [62, 66, 69], [59, 63, 66]], bass: [40, 36, 38, 35],
    lead: [76, null, 79, 76, 83, null, 81, 79, 76, null, 79, 76, 72, null, 74, 76, 74, null, 78, 74, 81, null, 79, 78, 71, null, 75, 78, 83, 81, 79, 78],
    leadWave: 'sawtooth', drums: 'boss' },
};
const Music = {
  gain: null, track: null, want: null, step: 0, next: 0, timer: null, enabled: true,
  _ensure() {
    if (!Sfx.ctx) return false;
    if (!this.gain) { this.gain = Sfx.ctx.createGain(); this.gain.gain.value = 0; this.gain.connect(Sfx.ctx.destination); }
    return true;
  },
  // 원하는 곡 (오디오가 아직 켜지지 않았으면 첫 터치 때 시작)
  play(name) {
    this.want = name;
    if (!this.enabled || !this._ensure()) return;
    if (this.track === name && this.timer) return;
    const ctx = Sfx.ctx, g = this.gain.gain;
    g.cancelScheduledValues(ctx.currentTime); g.setValueAtTime(g.value, ctx.currentTime); g.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    clearTimeout(this._swap);
    this._swap = setTimeout(() => this._start(name), this.timer ? 420 : 0);
  },
  _start(name) {
    const T = MUSIC_TRACKS[name]; if (!T) return;
    this.track = name; this.step = 0; this.next = Sfx.ctx.currentTime + 0.05;
    const g = this.gain.gain, now = Sfx.ctx.currentTime;
    g.cancelScheduledValues(now); g.setValueAtTime(0, now); g.linearRampToValueAtTime(0.16 * T.vol, now + 1.2);
    if (!this.timer) this.timer = setInterval(() => this._tick(), 30);
  },
  stop() { this.want = null; this.track = null; if (this.timer) { clearInterval(this.timer); this.timer = null; } if (this.gain) this.gain.gain.value = 0; },
  kick() { if (this.want && this.enabled) this.play(this.want); }, // 오디오가 켜진 뒤 호출
  setEnabled(on) { this.enabled = on; if (!on) { const w = this.want; this.stop(); this.want = w; } else this.kick(); },
  _tick() {
    const ctx = Sfx.ctx, T = MUSIC_TRACKS[this.track];
    if (!ctx || !T) return;
    if (ctx.state !== 'running') { this.next = ctx.currentTime + 0.05; return; }
    const st = 60 / T.bpm / 4; // 16분음표
    while (this.next < ctx.currentTime + 0.12) { this._note(T, this.step, this.next, st); this.step++; this.next += st; }
  },
  _osc(freq, t, dur, wave, vol, attack) {
    const ctx = Sfx.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = wave; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.gain); o.start(t); o.stop(t + dur + 0.05);
  },
  _noise(t, dur, vol, freq) {
    const ctx = Sfx.ctx;
    if (!this._nbuf) { const len = ctx.sampleRate * 0.3; this._nbuf = ctx.createBuffer(1, len, ctx.sampleRate); const d = this._nbuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this._nbuf; f.type = freq > 3000 ? 'highpass' : 'lowpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.gain); s.start(t); s.stop(t + dur + 0.02);
  },
  _note(T, step, t, st) {
    const bar = Math.floor(step / 16) % T.chords.length, i = step % 16;
    const ch = T.chords[bar];
    // 패드: 마디 첫 박에 화음
    if (i === 0) for (const n of ch) this._osc(MIDI(n), t, st * 16, 'triangle', 0.05, 0.3);
    // 베이스
    if (T.drums === 'battle' || T.drums === 'boss' ? i % 2 === 0 : i % 8 === 0) this._osc(MIDI(T.bass[bar]), t, st * (T.drums === 'battle' || T.drums === 'boss' ? 1.8 : 7), T.drums === 'boss' ? 'sawtooth' : 'triangle', T.drums === 'boss' ? 0.07 : 0.12);
    // 선율 (32스텝 = 2마디 반복)
    const ln = T.lead[step % T.lead.length];
    if (ln && (!T.arp || i % 2 === 0 || T.drums !== 'battle')) this._osc(MIDI(ln), t, st * (T.arp ? 1.6 : 3.5), T.leadWave, T.leadWave === 'square' || T.leadWave === 'sawtooth' ? 0.035 : 0.07, 0.01);
    // 타악
    if (T.drums === 'soft' && i % 4 === 2) this._noise(t, 0.05, 0.03, 6000);
    if (T.drums === 'heart' && (i === 0 || i === 3)) this._osc(55, t, 0.25, 'sine', 0.2);
    if (T.drums === 'battle' || T.drums === 'boss') {
      if (i % 8 === 0 || (T.drums === 'boss' && i % 8 === 3)) { this._osc(110, t, 0.15, 'sine', 0.3); }
      if (i % 8 === 4) this._noise(t, 0.12, 0.12, 1800);
      if (i % 2 === 0) this._noise(t, 0.03, 0.04, 7000);
    }
  },
  // 장면 → 곡
  forScene(name) {
    const map = { title: 'village', field: 'village', map: 'explore', explore: 'explore', event: 'explore', shop: 'village', rest: 'village', tree: 'explore', reward: 'explore', battle: 'battle', hunt: 'explore' };
    if (map[name]) this.play(map[name]);
    else if (name === 'result') this.stop();
  },
};
