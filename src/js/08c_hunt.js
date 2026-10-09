// ===== 08c_hunt.js : 사냥터 화면 (방치 사냥) =====
// 로직은 HuntSim(05c_hunt.js). 여기서는 그리기 · 입력 · 보상(경험치·골드·강화석·장신구) 반영만 한다.
// 조작: 몹을 탭하면 그 몹을 공격, 땅을 탭하면 그곳으로 이동. 자동 사냥이 켜져 있으면 알아서 가장 가까운 몹을 찾는다.

const HuntScene = {
  enter(params) {
    const p = Game.profile, run = Game.run;
    this.field = HUNT_FIELDS[(params && params.field) || 'meadow'];
    this.t = 0; this.acc = 0; this.fx = []; this.banner = null; this.saveT = 0;
    this.speed = Game.settings.huntSpeed || 1;
    this.expAcc = {}; this.log = [];
    this.session = { exp: 0, gold: 0, stones: 0, items: [], levelUps: [] };
    const ids = partyIds(run);
    this.sim = new HuntSim({ field: this.field, seed: hashSeed('hunt', Date.now() % 100000), heroes: ids.map((id) => huntHeroFrom(p, id)), autoHunt: Game.settings.huntAuto !== false });
    this.cam = { x: this.field.entry.x - 480, y: 0 };
    this.buildGround();
    // 화면 위 버튼
    const ui = Game.ui;
    const top = el('div', 'f-top');
    top.appendChild(el('div', 'f-title', `${this.field.theme === 'dark' ? '🌲' : this.field.theme === 'swamp' ? '🌫️' : '🌾'} ${this.field.name} <small>Lv ${this.field.level}</small>`));
    const r = el('div', 'f-right');
    r.appendChild(btn('◀ 마을로', 'small', () => this.leave(), { id: 'btn-hunt-back' }));
    this.autoBtn = btn('', 'small', () => { this.sim.autoHunt = !this.sim.autoHunt; Game.settings.huntAuto = this.sim.autoHunt; Game.saveSettings(); this.refreshBtns(); }, { id: 'btn-hunt-auto' });
    this.speedBtn = btn('', 'small', () => { this.speed = this.speed >= 3 ? 1 : this.speed + 1; Game.settings.huntSpeed = this.speed; Game.saveSettings(); this.refreshBtns(); }, { id: 'btn-hunt-speed' });
    r.appendChild(this.autoBtn); r.appendChild(this.speedBtn);
    r.appendChild(btn('🎒 장비', 'small', () => openInventory({ onClose: () => this.reloadHeroes() }), { id: 'btn-hunt-inv' }));
    top.appendChild(r);
    ui.appendChild(top);
    this.logBox = el('div', 'hunt-log');
    this.logBox.id = 'hunt-log';
    ui.appendChild(this.logBox);
    this.refreshBtns(); this.refreshLog();
    Game.hint('hunt');
  },
  exit() { this.flush(true); },
  refreshBtns() {
    this.autoBtn.innerHTML = `자동 사냥: ${this.sim.autoHunt ? '켬' : '끔'}`;
    this.autoBtn.classList.toggle('on', this.sim.autoHunt);
    this.speedBtn.innerHTML = `배속 ${this.speed}x`;
  },
  // 장비를 바꾸면 능력치를 다시 계산 (HP 비율 유지)
  reloadHeroes() {
    const p = Game.profile;
    for (const h of this.sim.heroes) { const n = huntHeroFrom(p, h.id), k = h.hp / h.maxHp; Object.assign(h, { maxHp: n.maxHp, atk: n.atk, atkInterval: n.atkInterval, level: n.level }); h.hp = Math.round(n.maxHp * k); }
  },
  leave() { this.flush(true); Sfx.play('door'); Game.go('field', { from: 'hunt' }); },

  // 쌓인 경험치를 캐릭터에게 (정수 단위), 프로필 저장
  flush(force) {
    const p = Game.profile;
    for (const id in this.expAcc) {
      const n = Math.floor(this.expAcc[id]);
      if (n <= 0) continue;
      this.expAcc[id] -= n;
      const r = GACHA.addExp(p, id, n);
      if (r && r.to > r.from) { this.session.levelUps.push(`${HEROES[id].name} Lv ${r.to}`); this.toastFx(`${HEROES[id].name} 레벨 업! Lv ${r.to}`, '#ffe08a'); this.reloadHeroes(); }
    }
    if (force || this.saveT <= 0) { saveProfile(); this.saveT = 5; }
  },

  refreshLog() {
    const s = this.sim.stats, k = s.kills, ss = this.session, min = Math.max(1, this.sim.time / 60);
    const items = ss.items.slice(-5).reverse().map((it) => `<div class="hl-item" style="color:${EQ.G[it.grade].color}">${it.grade} ${EQ.itemName(it)}</div>`).join('');
    this.logBox.innerHTML = `<div class="hl-title">사냥 기록 <small>${Math.floor(this.sim.time / 60)}분 ${Math.floor(this.sim.time % 60)}초</small></div>`
      + `<div>처치 ${k.trash + k.normal + k.elite} <small>(잡몹 ${k.trash} · 일반 ${k.normal} · 정예 ${k.elite})</small></div>`
      + `<div>경험치 +${Math.round(ss.exp)} <small>분당 ${(ss.exp / min).toFixed(1)}</small></div>`
      + `<div>● 골드 +${ss.gold} · 💎 +${ss.stones}</div>`
      + `<div class="hl-sub">장신구 ${ss.items.length}개</div>${items}`;
  },

  // ------------------------------------------------------------ 입력
  pointerDown(p) {
    Sfx.init();
    if (this.hitMinimap(p)) return;
    const wx = p.x + this.cam.x, wy = p.y + this.cam.y;
    let best = null, bd = 50 * 50;
    for (const m of this.sim.mobs) if (m.alive) { const d = dist2(wx, wy, m.x, m.y - 24); if (d < bd) { bd = d; best = m; } }
    if (best) { this.sim.attack(best); this.fx.push({ type: 'ring', x: best.x, y: best.y, t: 0, dur: 0.5, color: '255,120,90' }); return; }
    this.sim.moveTo(clamp(wx, 40, this.field.W - 40), clamp(wy, 100, this.field.H - 30));
    this.fx.push({ type: 'ring', x: wx, y: wy, t: 0, dur: 0.5, color: '255,255,255' });
  },
  pointerMove() {}, pointerUp() {},

  // ------------------------------------------------------------ 진행
  update(dt) {
    this.t += dt;
    if (Game.modalOpen) return;
    const mult = this.speed * ((Game.debug && Game.debug.simMult) || 1);
    this.acc += dt * mult;
    let n = 0;
    while (this.acc >= 1 / 30 && n < 400) { this.acc -= 1 / 30; n++; this.sim.step(1 / 30); this.handle(); }
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.t += dt; if (f.vy) f.y += f.vy * dt; if (f.t > f.dur) this.fx.splice(i, 1); }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    this.saveT -= dt;
    this.logT = (this.logT || 0) - dt;
    if (this.logT <= 0) { this.logT = 0.5; this.flush(false); this.refreshLog(); }
    // 카메라: 파티를 따라간다
    const P = this.sim.party;
    const cx = clamp(P.x - 480, 0, this.field.W - 960), cy = clamp(P.y - 290, 0, this.field.H - 540);
    this.cam.x += (cx - this.cam.x) * Math.min(1, dt * 5); this.cam.y += (cy - this.cam.y) * Math.min(1, dt * 5);
  },
  handle() {
    const p = Game.profile, ss = this.session;
    for (const e of this.sim.events) {
      if (e.type === 'hit') this.num(e.mob.x, e.mob.y - 50, e.v, e.skill ? '#ffd34a' : '#fff', e.skill ? 17 : 13);
      else if (e.type === 'hurt') this.num(e.hero.x, e.hero.y - 52, e.v, '#ff8a7a', 12);
      else if (e.type === 'heal') this.num(e.to.x, e.to.y - 56, '+' + e.v, '#9cf0a8', 13);
      else if (e.type === 'down') this.num(e.hero.x, e.hero.y - 60, '쓰러짐', '#ff6a5a', 14);
      else if (e.type === 'revive') this.num(e.hero.x, e.hero.y - 60, '일어섰다', '#9cf0ff', 13);
      else if (e.type === 'wipe') { this.banner = { text: '파티 전멸', sub: '입구로 돌아가 다시 사냥한다', t: 0, dur: 2 }; Sfx.play('back'); }
      else if (e.type === 'eliteSpawn') { this.banner = { text: `정예 출현: 「${e.mob.name}」`, sub: ENEMIES[e.mob.key].name, t: 0, dur: 2.4, danger: true }; Sfx.play('phase'); }
      else if (e.type === 'kill') {
        const ids = this.sim.heroes.map((h) => h.id);
        for (const id of ids) this.expAcc[id] = (this.expAcc[id] || 0) + e.exp;
        ss.exp += e.exp; ss.gold += e.gold; p.gold += e.gold;
        this.num(e.mob.x, e.mob.y - 70, `+${e.gold}●`, '#ffd34a', 12, -30);
        if (e.stones) { p.stones += e.stones; ss.stones += e.stones; this.num(e.mob.x + 20, e.mob.y - 86, `+${e.stones}💎`, '#9ad0ff', 12, -30); }
        if (e.drop) {
          const lines = EQ.DB.items.filter((it) => it.cls === 'common' && it.slot === e.drop.slot);
          const base = lines[Math.floor(Math.random() * lines.length)];
          const it = EQ.rollItem(makeRng(hashSeed('huntdrop', Date.now() % 1e6, ss.items.length)), p, { base: base.id, grade: e.drop.grade });
          p.inv.push(it); ss.items.push(it);
          const col = EQ.G[it.grade].color, rare = EQ.G[it.grade].idx >= 2;
          this.fx.push({ type: 'drop', x: e.mob.x, y: e.mob.y, t: 0, dur: rare ? 3 : 1.8, color: col, text: `${it.grade} ${EQ.itemName(it)}` });
          Sfx.play(rare ? 'phase' : 'coin');
          if (rare) this.banner = { text: `${it.grade} 장신구 획득!`, sub: EQ.itemName(it), t: 0, dur: 2.6 };
          saveProfile();
        } else Sfx.play('coin');
        if (e.mob.cls === 'elite') this.banner = this.banner && this.banner.text.includes('장신구') ? this.banner : { text: `「${e.mob.name}」 처치!`, sub: `경험치 +${Math.round(e.exp)} · 골드 +${e.gold}`, t: 0, dur: 2 };
      }
    }
    this.sim.events.length = 0;
  },
  num(x, y, text, color, size, vy) { this.fx.push({ type: 'num', x: x + (Math.random() - 0.5) * 16, y, text: String(text), color, size: size || 13, t: 0, dur: 0.9, vy: vy || -40 }); },
  toastFx(text, color) { Game.toast(text, 1800); void color; },

  // ------------------------------------------------------------ 그리기
  buildGround() {
    const F = this.field, cv = document.createElement('canvas');
    cv.width = F.W; cv.height = F.H;
    const g = cv.getContext('2d'), rng = makeRng(hashSeed('hunt-ground', F.id));
    const swamp = F.theme === 'swamp', dark = F.theme === 'dark' || swamp;
    const pal = swamp ? ['#3e4a32', '#46523a', '#3a4430', '#4c5a3c', '#34402e'] : dark ? ['#2f4a3a', '#2a4234', '#35523f', '#26392e', '#3b5a44'] : ['#5fa04e', '#548f44', '#68aa56', '#4e8a40', '#76b25e'];
    g.fillStyle = swamp ? '#3c4832' : dark ? '#2c4636' : '#5a9a4a'; g.fillRect(0, 0, F.W, F.H);
    for (let i = 0; i < 1400; i++) { g.fillStyle = pal[Math.floor(rng() * 5)]; g.beginPath(); g.ellipse(rng() * F.W, rng() * F.H, 20 + rng() * 70, 10 + rng() * 34, 0, 0, Math.PI * 2); g.fill(); }
    if (swamp) for (let i = 0; i < 46; i++) { const x = rng() * F.W, y = rng() * F.H, rx = 50 + rng() * 140, ry = 20 + rng() * 50; g.fillStyle = 'rgba(40,70,72,0.85)'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(150,170,120,0.35)'; g.lineWidth = 3; g.stroke(); g.fillStyle = 'rgba(190,220,210,0.18)'; g.beginPath(); g.ellipse(x - rx * 0.3, y - ry * 0.3, rx * 0.35, ry * 0.25, 0, 0, Math.PI * 2); g.fill(); } // 늪 웅덩이
    // 마른 풀밭 띠
    for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(200,180,90,0.22)'; g.beginPath(); g.ellipse(rng() * F.W, rng() * F.H, 160 + rng() * 260, 60 + rng() * 120, rng(), 0, Math.PI * 2); g.fill(); }
    // 흙길: 입구에서 들판 가운데로 갈라진다
    const road = (pts, w) => { g.strokeStyle = '#9a8a62'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = w + 14; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 4) g.quadraticCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3]); g.stroke(); g.strokeStyle = '#b8a678'; g.lineWidth = w; g.stroke(); };
    road([F.W - 40, 120, 2400, 260, 2100, 520, 1800, 780, 1400, 860], 46);
    road([1400, 860, 1000, 940, 600, 1300, 400, 1500, 300, 1700], 38);
    road([1400, 860, 1500, 1200, 1900, 1400, 2300, 1500, 2700, 1680], 34);
    // 연못 두 개
    for (const [x, y, rx, ry] of [[700, 520, 170, 90], [2150, 1180, 140, 80]]) {
      g.fillStyle = '#3c7a5a'; g.beginPath(); g.ellipse(x, y + 6, rx + 12, ry + 10, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#4a8ab0'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(x - rx * 0.3, y - ry * 0.3, rx * 0.4, ry * 0.2, 0, 0, Math.PI * 2); g.fill();
    }
    // 바위
    for (let i = 0; i < 40; i++) { const x = rng() * F.W, y = rng() * F.H, r = 8 + rng() * 18; g.fillStyle = '#7a7a72'; g.beginPath(); g.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#9a9a90'; g.beginPath(); g.ellipse(x - r * 0.2, y - r * 0.25, r * 0.6, r * 0.4, 0, 0, Math.PI * 2); g.fill(); }
    // 입구 (마을로 이어지는 길) 표시
    g.fillStyle = 'rgba(255,240,180,0.25)'; g.beginPath(); g.ellipse(F.entry.x, F.entry.y + 20, 120, 60, 0, 0, Math.PI * 2); g.fill();
    this.groundCv = cv;
    // 나무 (가장자리 숲 + 가운데 군데군데)
    this.trees = [];
    for (let i = 0; i < 70; i++) {
      const edge = i < 50, side = Math.floor(rng() * 4);
      const x = edge ? (side === 0 ? rng() * 90 : side === 1 ? F.W - rng() * 90 : rng() * F.W) : 200 + rng() * (F.W - 400);
      const y = edge ? (side === 2 ? 60 + rng() * 60 : side === 3 ? F.H - rng() * 50 : rng() * F.H) : 200 + rng() * (F.H - 360);
      if (Math.hypot(x - F.entry.x, y - F.entry.y) < 200) continue;
      this.trees.push([x, y, 0.8 + rng() * 0.6]);
    }
    this.flowers = [];
    for (let i = 0; i < 260; i++) this.flowers.push({ x: rng() * F.W, y: rng() * F.H, c: ['#ffd34a', '#f4a7a0', '#e8e8ff', '#c89af0'][Math.floor(rng() * 4)], p: rng() * 6 });
    if (dark) { this.trees = this.trees.concat(Array.from({ length: 40 }, () => [200 + rng() * (F.W - 400), 200 + rng() * (F.H - 360), 0.9 + rng() * 0.6])).filter(([x, y]) => Math.hypot(x - F.entry.x, y - F.entry.y) > 200); }
    // 미니맵 바탕
    const mm = document.createElement('canvas'); mm.width = 168; mm.height = Math.round(168 * F.H / F.W);
    mm.getContext('2d').drawImage(cv, 0, 0, mm.width, mm.height); this.miniCv = mm;
  },

  render(ctx) {
    const t = this.t, cam = this.cam, sim = this.sim, F = this.field;
    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    ctx.drawImage(this.groundCv, 0, 0);
    for (const f of this.flowers) { if (f.x < cam.x - 10 || f.x > cam.x + 970 || f.y < cam.y - 10 || f.y > cam.y + 550) continue; const sw = Math.sin(t * 2 + f.p) * 1.5; ctx.fillStyle = '#3a7a3a'; ctx.fillRect(f.x, f.y - 6, 2, 6); ctx.fillStyle = f.c; ctx.fillRect(f.x - 2 + sw, f.y - 10, 5, 5); }
    // 입구 표지판
    const E = F.entry;
    ctx.fillStyle = '#6a4a2a'; ctx.fillRect(E.x - 4, E.y - 60, 8, 60);
    ctx.fillStyle = '#a07a4a'; ctx.fillRect(E.x - 46, E.y - 72, 92, 26); ctx.strokeStyle = '#4a3018'; ctx.lineWidth = 2; ctx.strokeRect(E.x - 46, E.y - 72, 92, 26);
    ctx.fillStyle = '#fff4d8'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('◀ 숲속 마을', E.x, E.y - 54);
    // 깊이 정렬
    const objs = [];
    const vis = (x, y) => x > cam.x - 120 && x < cam.x + 1080 && y > cam.y - 60 && y < cam.y + 680;
    for (const [x, y, s] of this.trees) if (vis(x, y)) objs.push({ y, draw: () => { FieldScene.drawTrunk(ctx, x, y, s); FieldScene.drawCanopy(ctx, x, y, s, t); } });
    for (const m of sim.mobs) if (vis(m.x, m.y)) objs.push({ y: m.y, draw: () => this.drawMob(ctx, m, t) });
    for (const h of sim.heroes) objs.push({ y: h.y, draw: () => this.drawHero(ctx, h, t) });
    objs.sort((a, b) => a.y - b.y);
    for (const o of objs) o.draw();
    // 효과
    for (const f of this.fx) {
      const k = f.t / f.dur;
      if (f.type === 'num') { ctx.globalAlpha = 1 - k * k; ctx.font = `900 ${f.size}px sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y); ctx.globalAlpha = 1; }
      else if (f.type === 'ring') { ctx.strokeStyle = `rgba(${f.color},${1 - k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(f.x, f.y, 10 + k * 16, 5 + k * 8, 0, 0, Math.PI * 2); ctx.stroke(); }
      else if (f.type === 'drop') {
        const y = f.y - 20 - Math.min(1, k * 3) * 30;
        const gl = ctx.createRadialGradient(f.x, y, 2, f.x, y, 34); gl.addColorStop(0, f.color); gl.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 1 - Math.max(0, k - 0.7) / 0.3; ctx.fillStyle = gl; ctx.fillRect(f.x - 34, y - 34, 68, 68);
        ctx.font = '900 13px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(f.text, f.x, y - 22); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, y - 22); ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    if (F.theme === 'swamp') { const t = performance.now() / 1000; ctx.fillStyle = 'rgba(170,190,180,0.16)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse((i * 211 + t * 14) % 1160 - 100, 120 + i * 70, 260, 50, 0, 0, Math.PI * 2); ctx.fill(); } const vg = ctx.createRadialGradient(480, 270, 160, 480, 270, 600); vg.addColorStop(0, 'rgba(20,30,20,0)'); vg.addColorStop(1, 'rgba(20,30,20,0.5)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, 960, 540); } // 안개
    if (F.theme === 'dark') { const vg = ctx.createRadialGradient(480, 270, 180, 480, 270, 600); vg.addColorStop(0, 'rgba(0,10,20,0)'); vg.addColorStop(1, 'rgba(0,10,20,0.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, 960, 540); }
    // 화면 고정 UI: 배너 · 파티 HP · 미니맵 · 정예 타이머
    if (this.banner) {
      const b = this.banner, a = Math.min(1, b.t * 4, (b.dur - b.t) * 3);
      ctx.globalAlpha = a; ctx.fillStyle = b.danger ? 'rgba(90,10,10,0.8)' : 'rgba(20,30,20,0.8)'; ctx.fillRect(230, 84, 500, 58);
      ctx.textAlign = 'center'; ctx.font = '900 22px sans-serif'; ctx.fillStyle = b.danger ? '#ffb0a0' : '#fff2c0'; ctx.fillText(b.text, 480, 112);
      ctx.font = '700 13px sans-serif'; ctx.fillStyle = '#e8e0d0'; ctx.fillText(b.sub || '', 480, 132); ctx.globalAlpha = 1;
    }
    sim.heroes.forEach((h, i) => {
      const x = 12, y = 448 + i * 28;
      ctx.fillStyle = 'rgba(10,15,25,0.7)'; ctx.fillRect(x, y, 196, 24);
      ctx.fillStyle = '#fff'; ctx.font = '700 12px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`${HEROES[h.id].name} Lv ${EQ.charLevel(Game.profile, h.id)}`, x + 6, y + 16);
      ctx.fillStyle = '#3a2020'; ctx.fillRect(x + 92, y + 7, 98, 10);
      ctx.fillStyle = h.alive ? (h.hp / h.maxHp < 0.35 ? '#e0524a' : '#6ad06a') : '#555'; ctx.fillRect(x + 92, y + 7, 98 * (h.alive ? h.hp / h.maxHp : 0), 10);
      if (!h.alive) { ctx.fillStyle = '#ffb0a0'; ctx.font = '700 10px sans-serif'; ctx.fillText(`${Math.ceil(h.down)}초`, x + 160, y + 16); }
    });
    this.drawMinimap(ctx, t);
  },
  miniBox() { return { x: 960 - 168 - 10, y: 540 - this.miniCv.height - 10, w: 168, h: this.miniCv.height }; },
  hitMinimap(p) {
    const B = this.miniBox();
    if (p.x < B.x || p.x > B.x + B.w || p.y < B.y || p.y > B.y + B.h) return false;
    this.sim.moveTo((p.x - B.x) / B.w * this.field.W, (p.y - B.y) / B.h * this.field.H); // 미니맵을 탭하면 그쪽으로
    return true;
  },
  drawMinimap(ctx, t) {
    const B = this.miniBox(), F = this.field, sx = B.w / F.W, sy = B.h / F.H;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(B.x - 3, B.y - 3, B.w + 6, B.h + 6);
    ctx.globalAlpha = 0.85; ctx.drawImage(this.miniCv, B.x, B.y); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(B.x + this.cam.x * sx, B.y + this.cam.y * sy, 960 * sx, 540 * sy);
    for (const m of this.sim.mobs) if (m.alive) {
      if (m.cls === 'elite') { ctx.fillStyle = Math.floor(t * 4) % 2 ? '#ff4a3a' : '#ffd34a'; ctx.beginPath(); ctx.arc(B.x + m.x * sx, B.y + m.y * sy, 4, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = m.cls === 'normal' ? '#ffa04a' : '#d8d8c8'; ctx.fillRect(B.x + m.x * sx - 1, B.y + m.y * sy - 1, 2.5, 2.5); }
    }
    const P = this.sim.party; ctx.fillStyle = '#7dff8a'; ctx.beginPath(); ctx.arc(B.x + P.x * sx, B.y + P.y * sy, 3.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 10px sans-serif'; ctx.textAlign = 'left';
    const el2 = this.sim.mobs.some((m) => m.alive && m.cls === 'elite');
    ctx.fillText(el2 ? '정예 출현 중!' : `다음 정예 ${Math.max(0, Math.ceil(this.sim.eliteTimer))}초`, B.x, B.y - 6);
  },
  drawHero(ctx, h, t) {
    const sp = HEROES[h.id].sprite;
    FieldScene.shadow(ctx, h.x, h.y, 16);
    if (!h.alive) { ctx.globalAlpha = 0.35; }
    const anim = !h.alive ? 'down' : h.anim > 0.3 ? 'cast' : h.anim > 0 ? 'attack' : h.moving ? 'walk' : 'idle';
    const bob = h.moving && h.alive ? Math.abs(Math.sin(t * 12 + h.x * 0.01)) * 3 : 0;
    drawSprite(ctx, sp, h.x, h.y - bob, { scale: 2, t, flip: h.face < 0, phase: h.x * 0.01, anim, animK: !h.alive ? 1 : h.anim > 0 ? 1 - h.anim / 0.45 : 0, blinking: ((t + h.x * 0.003) % 3.4) < 0.12 });
    ctx.globalAlpha = 1;
  },
  drawMob(ctx, m, t) {
    const d = ENEMIES[m.key], C = HUNT.CLASS[m.cls], sc = 2 * C.size * Math.min(1.25, d.size || 1);
    const a = m.alive ? 1 : Math.max(0, 1 - m.deadT / 1.2);
    ctx.globalAlpha = a;
    FieldScene.shadow(ctx, m.x, m.y, 14 * C.size * (d.size || 1));
    if (m.cls === 'elite') { const gl = ctx.createRadialGradient(m.x, m.y - 30, 5, m.x, m.y - 30, 70); gl.addColorStop(0, `rgba(255,80,40,${0.25 + Math.sin(t * 4) * 0.08})`); gl.addColorStop(1, 'rgba(255,80,40,0)'); ctx.fillStyle = gl; ctx.fillRect(m.x - 70, m.y - 100, 140, 140); }
    const bob = m.moving ? Math.abs(Math.sin(t * 10 + m.uid)) * 2 : 0;
    drawSprite(ctx, d.sprite, m.x, m.y - bob, { scale: sc, t, flip: m.face < 0, phase: m.uid, tint: m.hurt > 0.08 ? 'white' : null, squash: m.alive ? 1 : 1 - Math.min(0.5, m.deadT) });
    ctx.globalAlpha = 1;
    if (!m.alive) return;
    const top = m.y - getSprite(d.sprite).h * sc - 8;
    if (m.hp < m.maxHp || m.cls === 'elite') {
      const w = m.cls === 'elite' ? 70 : 40;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(m.x - w / 2 - 1, top - 1, w + 2, 6);
      ctx.fillStyle = m.cls === 'elite' ? '#ff6a3a' : '#e0524a'; ctx.fillRect(m.x - w / 2, top, w * m.hp / m.maxHp, 4);
    }
    if (m.cls === 'elite' || this.sim.party.target === m) {
      ctx.font = `800 ${m.cls === 'elite' ? 13 : 11}px sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      const name = m.cls === 'elite' ? `★ ${m.name}` : d.name;
      ctx.strokeText(name, m.x, top - 6); ctx.fillStyle = m.cls === 'elite' ? '#ffb07a' : '#fff'; ctx.fillText(name, m.x, top - 6);
    }
    if (this.sim.party.target === m) { ctx.strokeStyle = '#ffd34a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(m.x, m.y + 2, 20 * C.size, 8, 0, 0, Math.PI * 2); ctx.stroke(); }
  },
};
