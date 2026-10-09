// ===== 08b_explore.js : 방 안 탐험 (옆으로 걷는 실시간 탐험 — 갈림길·조우 전투·상인·이벤트·모닥불) =====
// 지도에서 방을 고르면 그 방이 무엇인지는 들어가 봐야 안다. 방 안에서는 파티가 오른쪽으로 걸어가며
// 길 위의 것들을 만난다. 적 무리에 닿으면 그 자리에서 실시간 전투(전장 = 화면 2배 폭)로 이어진다.

const EXPLORE = {
  SPEED: 150,          // 걷는 속도 (px/초)
  START_X: 200,
  CAM_LEAD: 380,       // 화면에서 선두 캐릭터 위치 (왼쪽에서)
  SPOT_DIST: 520,      // 적 무리를 발견(전투 시작)하는 거리
  STOP_DIST: 70,       // 상인·이벤트 앞에 멈추는 거리
  FIELD_W: 1920,       // 조우 전투 전장 폭 (화면 2배)
  LANES: [342, 372, 402],
};

// 갈림길 단서: 75%는 맞는 단서, 나머지는 아무 단서도 없다
const EXPLORE_HINTS = {
  fight: '거친 숨소리가 들린다',
  elite: '묵직한 발소리가 땅을 울린다',
  chest: '바닥에서 무언가 반짝인다',
  event: '알 수 없는 기운이 감돈다',
  shop: '희미한 등불이 보인다',
  rest: '모닥불 냄새가 난다',
  tree: '커다란 나무 그림자가 드리워 있다',
  none: '조용하다',
};
const EXPLORE_LABEL = {
  shop: { name: '떠돌이 상인', act: '거래하기' },
  event: { name: '수상한 것', act: '살펴보기' },
  rest: { name: '모닥불 자리', act: '쉬어 가기' },
  tree: { name: '고목', act: '다가가기' },
};

// 방 구성 (숨겨진 방 종류 → 길 위의 것들). 갈림길 두 갈래 중 하나만 지나간다
// 방 하나에 전투 1~2번 (원정 전체 8번 안팎)
const ROOM_PLANS = {
  battle: { first: ['fight'], branches: [['chest', 'fight'], ['event']], last: [] },
  elite:  { first: ['fight'], branches: [['elite'], ['chest']], last: [] },
  rest:   { first: [], branches: [['fight'], ['chest']], last: ['rest'] },
  event:  { first: ['event'], branches: [['fight'], ['chest']], last: [] },
  shop:   { first: ['fight'], branches: [['shop'], ['event']], last: [] },
  tree:   { first: ['tree'], branches: [['fight'], ['chest']], last: [] },
  boss:   { first: ['fight'], branches: [['rest'], ['shop']], last: ['boss'] },
};

function genRoom(run, node, type) {
  const rng = makeRng(hashSeed(run.seed, 'room', node.stage, node.row));
  const plan = ROOM_PLANS[type] || ROOM_PLANS.battle;
  let uid = 0, x = 1400;
  const mk = (kind, at) => {
    const it = { id: ++uid, kind, x: at, done: false };
    if (kind === 'fight' || kind === 'elite' || kind === 'boss') it.enc = kind === 'boss' ? node.enc : rng.int(0, 99);
    if (kind === 'event') it.event = Object.keys(EVENTS)[rng.int(0, Object.keys(EVENTS).length - 1)];
    return it;
  };
  const items = [];
  for (const k of plan.first) { items.push(mk(k, x)); x += 700; }
  // 갈림길 문 두 개: 위치는 방마다 무작위, 단 들어온 문에서는 멀리 (2000px 이상)
  const d0 = Math.max(x - 250, EXPLORE.START_X + 2000) + rng.int(0, 700);
  const doors = [d0, d0 + rng.int(260, 520)];
  const forkX = doors[0];
  const branches = plan.branches.map((list, bi) => {
    let bx = doors[1] + 650;
    const its = list.map((k) => { const it = mk(k, bx); bx += 650; return it; });
    const real = rng() < 0.75;
    return { items: its, end: bx, hint: EXPLORE_HINTS[real ? its[0].kind : 'none'], side: bi === 0 ? '왼쪽 길' : '오른쪽 길' };
  });
  const after = Math.max(...branches.map((b) => b.end));
  const tail = []; let tx = after;
  for (const k of plan.last) { tail.push(mk(k, tx)); tx += 700; }
  return { stage: node.stage, row: node.row, type, items, forkX, doors, branches, chosen: -1, tail, exitX: tx + (plan.last.length ? 0 : 100), x: EXPLORE.START_X, theme: node.stage };
}
// 지금 길 위에 있는 것들 (갈림길에서 고른 갈래 포함)
// 갈림길 문 위치 (벽에 난 문 두 개). 문 앞으로 걸어가면 그 길로 들어간다
function doorX(room, i) { return room.doors[i]; }
function roomTrack(room) {
  const out = room.items.slice();
  if (room.chosen >= 0) out.push(...room.branches[room.chosen].items, ...room.tail);
  return out;
}
// 다른 화면(전투·상점·이벤트·보상)이 끝나면 돌아갈 곳
function backToRun() { Game.go(Game.run && Game.run.room ? 'explore' : 'map'); }

const ExploreScene = {
  enter() {
    const run = Game.run, room = run.room;
    this.t = 0;
    this.moving = true;
    this.prompt = null;
    this.fx = [];
    this.camX = Math.max(0, room.x - EXPLORE.CAM_LEAD);
    this.walkTarget = null; this.doorPick = null; this.forkSeen = false; this.fade = 0;
    this.buildHud();
    if (!room.seen) { room.seen = true; Game.toast(room.stage === CONST.STAGES ? '가장 깊은 곳에 들어섰다. 굴의 주인이 가까이 있다.' : `${room.stage}번째 방에 들어섰다. 무엇이 있을지 모른다.`, 1800); Game.hint('explore'); }
  },
  exit() {},

  buildHud() {
    const run = Game.run, ui = Game.ui;
    ui.innerHTML = '';
    const top = el('div', 'map-top ex-top');
    const hdr = el('div', 'map-hdr');
    hdr.appendChild(el('div', 'map-title', `고블린 굴 — ${run.room.stage === CONST.STAGES ? '가장 깊은 곳' : `${run.room.stage}/${CONST.STAGES}`}`));
    hdr.appendChild(resourceBar(run));
    top.appendChild(hdr);
    top.appendChild(partyPanel(run, { compact: true }));
    ui.appendChild(top);
    const side = el('div', 'map-actions ex-actions');
    this.walkBtn = btn('', 'small', () => {
      const room = Game.run.room;
      if (room && room.chosen < 0 && room.x >= room.forkX - 180) { // 갈림길에서 전진 = 가까운 문으로
        const near = Math.abs(room.x - doorX(room, 0)) <= Math.abs(room.x - doorX(room, 1)) ? 0 : 1;
        this.walkToDoor(near); return;
      }
      this.moving = !this.moving; this.refreshWalk();
    }, { id: 'btn-walk' });
    side.appendChild(this.walkBtn);
    side.appendChild(btn('⚙ 전략', 'small', () => openStrategyEditor(run), { id: 'btn-strategy' }));
    side.appendChild(btn('🧪 회복약', 'small', () => usePotionFlow(run, () => this.buildHud()), { id: 'btn-potion' }));
    ui.appendChild(side);
    this.act = el('div', 'ex-act hidden');
    ui.appendChild(this.act);
    this.refreshWalk();
  },
  refreshWalk() { if (this.walkBtn) this.walkBtn.innerHTML = this.moving ? '⏸ 멈춤' : '▶ 전진'; },

  party() {
    const run = Game.run, room = run.room;
    const ids = partyIds(run).filter((id) => !run.heroes[id].dead);
    return ids.map((id, i) => ({ id, x: room.x - i * 46, y: EXPLORE.LANES[i % 3] }));
  },

  update(dt) {
    this.t += dt;
    const run = Game.run, room = run.room;
    if (!room || Game.modalOpen) return;
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.t += dt; f.y -= 30 * dt; if (f.t > f.dur) this.fx.splice(i, 1); }
    // 갈림길: 문 두 개 앞에서 멈추고, 탭한 문(또는 지점)으로 걸어가 문 앞에 닿으면 들어간다
    const atFork = room.chosen < 0 && room.x >= room.forkX - 180;
    if (atFork) {
      if (!this.forkSeen) { this.forkSeen = true; this.moving = false; this.refreshWalk(); this.showForkGuide(); }
      const sp = EXPLORE.SPEED * dt * ((Game.debug && Game.debug.simMult) || 1);
      if (this.walkTarget !== null && this.walkTarget !== undefined) {
        const d = this.walkTarget - room.x;
        room.x += Math.sign(d) * Math.min(Math.abs(d), sp);
        this.faceLeft = d < 0;
        if (Math.abs(d) < 1) this.walkTarget = null;
      }
      for (const i of [0, 1]) if (Math.abs(room.x - doorX(room, i)) < 8 && this.doorPick === i) { this.enterDoor(i); break; }
      this.camX += ((doorX(room, 0) + doorX(room, 1)) / 2 - 480 - this.camX) * Math.min(1, dt * 4);
      return;
    }
    const next = roomTrack(room).filter((it) => !it.done).sort((a, b) => a.x - b.x)[0];
    let limit = room.chosen < 0 ? room.forkX - 180 : room.exitX;
    if (next) {
      if (next.kind === 'fight' || next.kind === 'elite' || next.kind === 'boss') {
        if (room.x >= next.x - EXPLORE.SPOT_DIST) { this.startFight(next); return; }
      } else if (next.kind === 'chest') {
        if (room.x >= next.x - 20) this.openChest(next);
      } else {
        limit = Math.min(limit, next.x - EXPLORE.STOP_DIST);
        if (room.x >= next.x - EXPLORE.STOP_DIST - 1) this.showAct(next); else this.hideAct();
      }
    }
    if (this.moving) room.x = Math.min(limit, room.x + EXPLORE.SPEED * dt * ((Game.debug && Game.debug.simMult) || 1));
    if (room.chosen >= 0 && room.x >= room.exitX - 1 && !roomTrack(room).some((it) => !it.done)) { this.leaveRoom(); return; }
    this.camX += (Math.max(0, room.x - EXPLORE.CAM_LEAD) - this.camX) * Math.min(1, dt * 4);
  },

  showAct(it) {
    if (this.prompt === it.id) return;
    this.prompt = it.id;
    const L = EXPLORE_LABEL[it.kind];
    this.act.innerHTML = '';
    this.act.appendChild(el('div', 'ex-act-title', L.name));
    const row = el('div', 'btn-row');
    row.appendChild(btn('지나가기', 'ghost', () => { it.done = true; this.hideAct(); }, { id: 'ex-skip', sfx: 'back' }));
    row.appendChild(btn(L.act, 'primary', () => this.enterPoi(it), { id: 'ex-go' }));
    this.act.appendChild(row);
    this.act.classList.remove('hidden');
  },
  hideAct() { if (this.prompt !== null) { this.prompt = null; this.act.classList.add('hidden'); } },

  enterPoi(it) {
    const run = Game.run, room = run.room;
    it.done = true;
    this.hideAct();
    const node = { stage: room.stage, row: room.row, type: it.kind, event: it.event, sub: it.id };
    Sfx.play('door');
    Game.go(it.kind, { node });
  },

  openChest(it) {
    const run = Game.run, room = run.room;
    it.done = true;
    const rng = makeRng(hashSeed(run.seed, 'chest', room.stage, room.row, it.id));
    const gold = rng.int(12, 30) + room.stage * 4;
    run.gold += gold;
    let text = `골드 +${gold}`;
    if (rng() < 0.4) { const s = 1 + rng.int(0, 2); Game.profile.stones += s; text += ` · 강화석 +${s}`; saveProfile(); }
    if (rng() < 0.2) { run.potions++; text += ' · 회복약 +1'; }
    Sfx.play('coin');
    this.fx.push({ x: it.x, y: 300, text, t: 0, dur: 1.8 });
    this.buildHud();
  },

  showForkGuide() {
    this.act.innerHTML = '';
    this.act.appendChild(el('div', 'ex-act-title', '갈림길'));
    this.act.appendChild(el('div', 'muted', '문이 두 개 있다. 문을 탭하면 그 문으로, ▶ 전진을 누르면 가까운 문으로 들어간다.'));
    this.act.classList.remove('hidden');
  },
  // 탭: 갈림길에서는 그 지점(문을 탭하면 그 문)으로 걸어간다
  pointerDown(p) {
    const room = Game.run.room;
    if (!room || room.chosen >= 0 || room.x < room.forkX - 180 || Game.modalOpen) return;
    const wx = p.x + this.camX;
    const pick = [0, 1].find((i) => Math.abs(wx - doorX(room, i)) < 70 && p.y < 420);
    if (pick !== undefined) this.walkToDoor(pick);
    else { this.doorPick = null; this.walkTarget = clamp(wx, room.forkX - 180, doorX(room, 1) + 40); }
  },
  walkToDoor(i) { const room = Game.run.room; this.doorPick = i; this.walkTarget = doorX(room, i); Sfx.play('click'); },
  enterDoor(i) {
    const room = Game.run.room;
    room.chosen = i;
    room.x = doorX(room, 1) + 80; // 문을 지나 그 길로
    this.camX = Math.max(0, room.x - EXPLORE.CAM_LEAD);
    this.walkTarget = null; this.doorPick = null; this.forkSeen = false;
    this.act.classList.add('hidden'); this.prompt = null;
    this.moving = true; this.refreshWalk();
    this.fade = 0.6;
    Sfx.play('door');
    Game.toast(`${room.branches[i].side}로 들어섰다.`, 1200);
  },

  startFight(it) {
    const run = Game.run, room = run.room;
    const worldX = Math.round(it.x - 1250);
    const heroPos = this.party().map((p) => ({ x: clamp(p.x - worldX, CONST.FIELD_X0 + 10, EXPLORE.FIELD_W - 60), y: p.y }));
    let type = it.kind;
    if (type === 'fight' && run.torch <= 0) { // 횃불이 꺼지면 어둠 속 습격 (정예로 바뀔 수 있다)
      const r = makeRng(hashSeed(run.seed, 'dark', room.stage, room.row, it.id));
      if (r() < CONST.TORCH_DARK_ELITE_CHANCE && ENCOUNTERS.elite[room.stage]) { type = 'elite'; Game.toast('어둠 속에서 정예가 습격했다!', 2000); }
    }
    const node = { stage: room.stage, row: room.row, type: type === 'fight' ? 'battle' : type, enc: it.enc, sub: it.id, exploreId: it.id };
    Sfx.play('skill');
    Game.go('battle', { node, explore: { fieldW: EXPLORE.FIELD_W, heroPos, enemySpawnX: 1100, worldX, theme: room.theme } });
  },

  leaveRoom() {
    const run = Game.run;
    run.room = null;
    Sfx.play('door');
    Game.go('map');
  },

  render(ctx) {
    const run = Game.run, room = run.room, t = this.t;
    if (!room) return;
    const cam = Math.round(this.camX);
    drawCorridor(ctx, cam, t, room.theme);
    ctx.save(); ctx.translate(-cam, 0);
    // 갈림길 표지판
    if (room.chosen < 0) for (const i of [0, 1]) drawForkDoor(ctx, doorX(room, i), t, room.branches[i], this.doorPick === i);
    // 들어온 문 · 출구
    drawExitDoor(ctx, EXPLORE.START_X - 140, t);
    drawExitDoor(ctx, room.exitX + 60, t);
    const objs = [];
    for (const it of roomTrack(room)) if (!it.done) objs.push({ y: 380, draw: () => drawPoi(ctx, it, t) });
    for (const p of this.party()) objs.push({ y: p.y, draw: () => {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
      const walking = (this.moving || (this.walkTarget !== null && this.walkTarget !== undefined)) && !Game.modalOpen;
      drawSprite(ctx, HEROES[p.id].sprite, p.x, p.y - (walking ? Math.abs(Math.sin(t * 10 + p.x * 0.01)) * 3 : 0), { scale: CONST.SPRITE_SCALE, t, flip: !!this.faceLeft && this.walkTarget != null, phase: p.x * 0.01, blinking: ((t + p.x * 0.003) % 3.4) < 0.12 });
    } });
    objs.sort((a, b) => a.y - b.y).forEach((o) => o.draw());
    ctx.textAlign = 'center';
    for (const f of this.fx) { ctx.globalAlpha = 1 - f.t / f.dur; ctx.font = '800 18px sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = '#1a0f08'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = '#ffd34a'; ctx.fillText(f.text, f.x, f.y); }
    ctx.globalAlpha = 1;
    ctx.restore();
    // 횃불이 약하면 시야가 어두워진다
    const dark = run.torch <= 0 ? 0.55 : run.torch < 30 ? 0.3 : 0.1;
    const g = ctx.createRadialGradient(EXPLORE.CAM_LEAD + 120, 330, 120, EXPLORE.CAM_LEAD + 120, 330, 620);
    g.addColorStop(0, 'rgba(8,6,14,0)'); g.addColorStop(1, `rgba(8,6,14,${dark + 0.35})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 540);
    if (this.fade > 0) { this.fade -= 1 / 60; ctx.fillStyle = `rgba(0,0,0,${Math.min(1, this.fade * 1.6)})`; ctx.fillRect(0, 0, 960, 540); }
  },
};

// ---------------------------------------------------------------- 그림 (탐험·조우 전투 공용)
// 숲속 굴 복도: 먼 벽(느린 시차) · 기둥과 나무뿌리 · 횃불 · 바닥. camX는 탐험 세계 좌표
function drawCorridor(ctx, camX, t, theme) {
  const W = 960, top = CONST.FIELD_Y0 - 30;
  const tint = ['#231c33', '#231c33', '#1f2430', '#22202c', '#261c2a', '#2a1a22'][theme || 0] || '#231c33';
  ctx.fillStyle = tint; ctx.fillRect(0, 0, W, 540);
  // 먼 돌벽
  const o1 = -camX * 0.3;
  for (let row = 0; row < 9; row++) {
    const y = 40 + row * 34, off = (row % 2) * 44;
    const start = Math.floor((-o1 - off) / 88) * 88 + off + o1 - 88;
    for (let x = start; x < W + 88; x += 88) { ctx.fillStyle = row % 3 === 0 ? '#2e2642' : '#2b2340'; ctx.fillRect(Math.round(x), y, 84, 30); ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(Math.round(x), y, 84, 3); }
  }
  // 나무뿌리 (중간 시차)
  const o2 = -camX * 0.55;
  for (let k = Math.floor((-o2 - 200) / 340); k < Math.floor((-o2 + W + 200) / 340) + 1; k++) {
    const x = k * 340 + o2 + ((k * 97) % 120);
    ctx.strokeStyle = '#3a2a22'; ctx.lineWidth = 10 + (k % 3) * 4;
    ctx.beginPath(); ctx.moveTo(x, -10); ctx.bezierCurveTo(x + 30, 80, x - 20, 160, x + 10 + (k % 2) * 30, 270); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,160,90,0.25)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 4, 20); ctx.bezierCurveTo(x + 26, 90, x - 14, 150, x + 12, 240); ctx.stroke();
  }
  // 기둥 + 횃불 (가까운 시차)
  const o3 = -camX * 0.8;
  for (let k = Math.floor((-o3 - 300) / 600); k < Math.floor((-o3 + W + 300) / 600) + 1; k++) {
    const px = k * 600 + o3 + 200;
    ctx.fillStyle = '#3a3152'; ctx.fillRect(px - 16, 70, 32, 220); ctx.fillStyle = '#463c62'; ctx.fillRect(px - 16, 70, 8, 220);
    ctx.fillStyle = '#4c4268'; ctx.fillRect(px - 22, 62, 44, 12); ctx.fillRect(px - 22, 282, 44, 14);
    const tx = px + 50;
    const fl = 0.88 + Math.sin(t * 9 + k) * 0.07 + Math.sin(t * 21 + k * 2) * 0.05;
    const g = ctx.createRadialGradient(tx, 150, 6, tx, 150, 150 * fl);
    g.addColorStop(0, 'rgba(255,170,80,0.42)'); g.addColorStop(0.5, 'rgba(255,140,60,0.12)'); g.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = g; ctx.fillRect(tx - 170, 0, 340, 340);
    ctx.fillStyle = '#5e3a20'; ctx.fillRect(tx - 3, 150, 6, 26);
    const fh = 12 + Math.sin(t * 14 + k) * 3;
    ctx.fillStyle = '#ff9a2a'; ctx.fillRect(tx - 4, 148 - fh, 8, fh); ctx.fillStyle = '#ffe066'; ctx.fillRect(tx - 2, 148 - fh * 0.6, 4, fh * 0.6);
  }
  // 바닥
  const g2 = ctx.createLinearGradient(0, top, 0, 540);
  g2.addColorStop(0, '#3b3150'); g2.addColorStop(1, '#221b30');
  ctx.fillStyle = g2; ctx.fillRect(0, top, W, 540 - top);
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 2;
  const o4 = -camX;
  for (let k = Math.floor((-o4 - 400) / 80); k < Math.floor((-o4 + W + 400) / 80); k++) { const x = k * 80 + o4; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo((x - 480) * 1.35 + 480, 540); ctx.stroke(); }
  for (const y of [top + 30, top + 75, top + 130, top + 200]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, top, W, 3);
}

function drawPoi(ctx, it, t) {
  const x = it.x, y = 380;
  if (it.kind === 'fight' || it.kind === 'elite' || it.kind === 'boss') {
    const waves = encounterFor({ type: it.kind === 'fight' ? 'battle' : it.kind, stage: Game.run.room.stage, enc: it.enc });
    waves[0].forEach((id, k) => {
      const ey = EXPLORE.LANES[k % 3] + (k >= 3 ? 12 : 0), ex = x + (k % 2) * 40 + ENEMIES[id].size * 20;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(ex, ey + 2, 24 * ENEMIES[id].size, 7, 0, 0, Math.PI * 2); ctx.fill();
      drawSprite(ctx, ENEMIES[id].sprite, ex, ey, { scale: CONST.SPRITE_SCALE * (ENEMIES[id].abilities.includes('boss') ? 1.15 : 1), flip: true, t, phase: k });
    });
    return;
  }
  if (it.kind === 'chest') {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a4a24'; ctx.fillRect(x - 22, y - 26, 44, 28); ctx.fillStyle = '#9a6232'; ctx.fillRect(x - 22, y - 34, 44, 10);
    ctx.fillStyle = '#ffd34a'; ctx.fillRect(x - 4, y - 22, 8, 8);
    const s = 0.5 + Math.sin(t * 5) * 0.5; ctx.fillStyle = `rgba(255,230,140,${s})`; ctx.fillRect(x + 14, y - 44 - s * 4, 3, 3);
    return;
  }
  if (it.kind === 'shop') { drawSprite(ctx, 'guide', x, y, { scale: 2.6, t }); ctx.fillStyle = '#7a5a34'; ctx.fillRect(x + 30, y - 30, 50, 30); ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.arc(x + 40, y - 70, 8 + Math.sin(t * 6), 0, 7); ctx.fill(); return; }
  if (it.kind === 'rest') {
    ctx.fillStyle = '#5e3a20'; ctx.fillRect(x - 18, y - 6, 36, 8);
    const fh = 18 + Math.sin(t * 12) * 4;
    ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.moveTo(x - 12, y - 4); ctx.quadraticCurveTo(x, y - 4 - fh * 2, x + 12, y - 4); ctx.fill();
    ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.moveTo(x - 6, y - 4); ctx.quadraticCurveTo(x, y - 4 - fh, x + 6, y - 4); ctx.fill();
    const g = ctx.createRadialGradient(x, y - 20, 4, x, y - 20, 140); g.addColorStop(0, 'rgba(255,170,80,0.35)'); g.addColorStop(1, 'rgba(255,170,80,0)'); ctx.fillStyle = g; ctx.fillRect(x - 140, y - 160, 280, 200);
    return;
  }
  if (it.kind === 'tree') {
    ctx.fillStyle = '#4a3020'; ctx.fillRect(x - 14, y - 150, 28, 150);
    ctx.fillStyle = '#3c6a34'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + Math.cos(i) * 40, y - 170 + Math.sin(i * 2) * 24, 40, 0, 7); ctx.fill(); }
    ctx.fillStyle = `rgba(255,120,90,${0.6 + Math.sin(t * 3) * 0.3})`; ctx.beginPath(); ctx.arc(x + 20, y - 150, 6, 0, 7); ctx.fill();
    return;
  }
  if (it.kind === 'event') {
    const s = 1 + Math.sin(t * 3) * 0.1;
    const g = ctx.createRadialGradient(x, y - 40, 2, x, y - 40, 60 * s); g.addColorStop(0, 'rgba(180,140,255,0.55)'); g.addColorStop(1, 'rgba(180,140,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - 70, y - 110, 140, 140);
    ctx.fillStyle = '#5a4a6a'; ctx.fillRect(x - 16, y - 30, 32, 30); ctx.fillStyle = '#c8b0ff'; ctx.font = '900 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', x, y - 38 - Math.sin(t * 4) * 4);
  }
}
function drawForkDoor(ctx, x, t, br, picked) {
  const y = 330;
  ctx.fillStyle = '#140f1c'; ctx.beginPath(); ctx.moveTo(x - 42, y + 10); ctx.lineTo(x - 42, y - 110); ctx.arc(x, y - 110, 42, Math.PI, 0); ctx.lineTo(x + 42, y + 10); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = picked ? '#ffd34a' : '#5a4e78'; ctx.lineWidth = 7; ctx.stroke();
  const g = ctx.createLinearGradient(x, y - 150, x, y + 10); g.addColorStop(0, 'rgba(255,230,170,0)'); g.addColorStop(1, `rgba(255,230,170,${0.12 + Math.sin(t * 2 + x) * 0.05})`);
  ctx.fillStyle = g; ctx.fill();
  ctx.fillStyle = '#8a5a30'; ctx.fillRect(x - 70, y - 200, 140, 40);
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffe9a0'; ctx.font = '800 14px sans-serif'; ctx.fillText(br.side.replace(' 길', ' 문'), x, y - 184);
  ctx.fillStyle = '#f0e0c0'; ctx.font = '600 11px sans-serif'; ctx.fillText(br.hint, x, y - 168);
  if (picked) { ctx.fillStyle = '#ffd34a'; ctx.beginPath(); const by = y - 214 + Math.sin(t * 6) * 4; ctx.moveTo(x - 8, by - 10); ctx.lineTo(x + 8, by - 10); ctx.lineTo(x, by); ctx.fill(); }
}
function drawSignpost(ctx, x, t) {
  const y = 380;
  ctx.fillStyle = '#5e3a20'; ctx.fillRect(x - 4, y - 90, 8, 90);
  ctx.fillStyle = '#8a5a30'; ctx.fillRect(x - 40, y - 90, 70, 18); ctx.fillRect(x - 30, y - 64, 70, 18);
  ctx.fillStyle = '#f0e0c0'; ctx.font = '800 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('↗', x - 5, y - 76); ctx.fillText('↘', x + 5, y - 50);
}
function drawExitDoor(ctx, x, t) {
  const y = 330;
  ctx.fillStyle = '#1a1424'; ctx.fillRect(x - 40, y - 150, 80, 160);
  ctx.strokeStyle = '#4c4268'; ctx.lineWidth = 8; ctx.strokeRect(x - 44, y - 154, 88, 168);
  const g = ctx.createLinearGradient(x, y - 150, x, y + 10); g.addColorStop(0, 'rgba(255,230,170,0.05)'); g.addColorStop(1, `rgba(255,230,170,${0.15 + Math.sin(t * 2) * 0.05})`);
  ctx.fillStyle = g; ctx.fillRect(x - 40, y - 150, 80, 160);
}
