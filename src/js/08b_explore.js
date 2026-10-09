// ===== 08b_explore.js : 던전 화면 (방 + 복도, 다키스트 던전 방식) =====
// 방: 들어서면 적이 있으면 바로 전투, 아니면 방의 것(야영지·보물·계단·레버·봉인석·열쇠)을 처리.
// 복도: 옆으로 걷는다. 자동 모드면 알아서 걷고, 수동이면 ▶을 누르고 있거나 바닥을 탭해서 걷는다.
//       작은 적 무리 2번(가끔 네임드 정예), 함정·보급 최대 2개. 전투 영역은 고정 (화면 1.5배).
// 던전 지도(오른쪽 위): 가 본 방 + 이웃 방(?)이 보인다. 방에서 이웃 방을 탭하면 그 복도로 출발한다.

const EXPLORE = { SPEED: 210, SPOT: 430, LANES: [342, 372, 402], CAM_LEAD: 380 };
const MAP_BOX = { x: 600, y: 112, cw: 64, ch: 46, w: 5 * 64 + 12, h: 3 * 46 + 30 };

// 다른 화면(전투·상점·이벤트·보상·야영)이 끝나면 돌아갈 곳
function backToRun() { Game.go(Game.run && Game.run.dungeon ? 'dungeon' : 'field'); }

// 원정 시작: 1층 입구 방
function enterDungeon(run) {
  run.dungeon = genFloor(run.seed, 1);
  run.pos = { stage: 1, row: 0 };
  Game.go('dungeon');
}

// 전투에서 이겼을 때 던전 쪽 정리 (BattleScene.finish에서 호출)
function dungeonBattleWon(run, ref) {
  const fl = run.dungeon; if (!fl) return;
  if (ref.room !== undefined) {
    const r = fl.rooms[ref.room]; r.cleared = true;
    if (r.type === 'key') { fl.have++; Game.toast(`열쇠를 얻었다! (${fl.have}/${BOSS_GIMMICKS.key.need})`, 2000); }
  } else if (ref.corr !== undefined) {
    const c = fl.corridors[ref.corr], it = c.items.find((x) => x.id === ref.item);
    if (it) it.done = true;
    if (fl.at.corr === c.id) fl.at.x = Math.max(fl.at.x, ref.pos - 40);
  }
}

const DungeonScene = {
  enter() {
    const run = Game.run, fl = run.dungeon;
    this.t = 0; this.fx = []; this.hold = 0; this.walkTarget = null; this.fade = 0.5; this.pending = null;
    this.camX = 0;
    this.buildHud();
    if (fl.at.room !== undefined) this.arriveRoom(fl.rooms[fl.at.room], true);
    if (!this.introShown && fl.floor === 1 && fl.at.room === 0) { this.introShown = true; Game.hint('dungeon'); }
  },
  exit() { this.hold = 0; },

  buildHud() {
    const run = Game.run, fl = run.dungeon, ui = Game.ui;
    ui.innerHTML = '';
    const top = el('div', 'map-top ex-top');
    const hdr = el('div', 'map-hdr');
    const goal = fl.floor === DUNGEON.BOSS_FLOOR ? (bossOpen(fl) ? '보스 방이 열렸다' : `${BOSS_GIMMICKS[fl.gimmick].name} ${fl.have}/${BOSS_GIMMICKS[fl.gimmick].need}`) : '계단을 찾아라';
    hdr.appendChild(el('div', 'map-title', `고블린 굴 ${fl.floor === DUNGEON.BOSS_FLOOR ? '— 가장 깊은 곳' : `${fl.floor}층`} <small class="goal">${goal}</small>`));
    hdr.appendChild(resourceBar(run));
    top.appendChild(hdr);
    top.appendChild(partyPanel(run, { compact: true }));
    ui.appendChild(top);
    const side = el('div', 'map-actions ex-actions');
    this.speedBtn = btn(`배속 ${Game.settings.speed || 1}x`, 'small', () => { Game.settings.speed = (Game.settings.speed || 1) >= 3 ? 1 : (Game.settings.speed || 1) + 1; Game.saveSettings(); this.speedBtn.innerHTML = `배속 ${Game.settings.speed}x`; }, { id: 'btn-ex-speed' });
    side.appendChild(this.speedBtn);
    this.autoBtn = btn('', 'small', () => { run.autoMode = !run.autoMode; this.refreshAuto(); Game.toast(run.autoMode ? '자동: 복도를 알아서 걷고 전투도 전략대로 해요' : '수동: ▶을 누르고 있거나 바닥을 탭해서 걸어요', 1400); }, { id: 'btn-ex-auto' });
    side.appendChild(this.autoBtn);
    side.appendChild(btn('⚙ 전략', 'small', () => openStrategyEditor(run), { id: 'btn-strategy' }));
    side.appendChild(btn('🧪', 'small', () => usePotionFlow(run, () => this.buildHud()), { id: 'btn-potion' }));
    ui.appendChild(side);
    // 걷기 버튼 (복도에서만): 누르고 있는 동안 걷는다
    const walk = el('div', 'ex-walk');
    const mkHold = (label, dir, id) => {
      const b = btn(label, 'ex-walk-btn', () => {}, { id, sfx: 'none' });
      const on = (e) => { e.preventDefault(); this.hold = dir; this.walkTarget = null; };
      const off = () => { if (this.hold === dir) this.hold = 0; };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
      return b;
    };
    walk.appendChild(mkHold('◀', -1, 'btn-back')); walk.appendChild(mkHold('▶', 1, 'btn-fwd'));
    this.walkBox = walk;
    ui.appendChild(walk);
    this.act = el('div', 'ex-act hidden');
    ui.appendChild(this.act);
    this.refreshAuto();
    this.refreshWalkBox();
  },
  refreshAuto() { if (this.autoBtn) this.autoBtn.innerHTML = Game.run.autoMode ? '자동' : '수동'; this.autoBtn.classList.toggle('on', !!Game.run.autoMode); },
  refreshWalkBox() { const inCorr = Game.run.dungeon.at.corr !== undefined; this.walkBox.classList.toggle('hidden', !inCorr || Game.run.autoMode); },
  refreshRes() { const old = Game.ui.querySelector('.ex-top .res-bar'); if (old) old.replaceWith(resourceBar(Game.run)); },

  // ------------------------------------------------------------ 방
  arriveRoom(r, silent) {
    const run = Game.run, fl = run.dungeon;
    fl.at = { room: r.id };
    r.visited = true;
    this.walkTarget = null; this.hold = 0;
    this.camX = 0;
    if (!silent) { Sfx.play('door'); this.fade = 0.5; }
    this.refreshWalkBox();
    if (r.fight && !r.cleared) {
      if (r.type === 'boss' && !bossOpen(fl)) return; // (지도에서 막지만 안전장치)
      this.showAct(`${ROOM_KINDS[r.type].name}`, r.type === 'boss' ? '굴의 주인이 기다리고 있다.' : r.type === 'elite' || r.type === 'key' ? `${ELITE_AFFIXES[r.fight.affix].name} 정예가 지키고 있다.` : '적이 우글거린다.', []);
      this.pending = { t: 0.9, fn: () => this.startRoomFight(r) };
      return;
    }
    this.showRoomActions(r);
  },
  showRoomActions(r) {
    const run = Game.run, fl = run.dungeon, acts = [];
    const K = ROOM_KINDS[r.type];
    let text = '';
    if (r.type === 'start') text = fl.floor === 1 ? '굴 입구. 지도에서 이웃한 방을 탭하면 그쪽 복도로 간다.' : '계단을 내려왔다.';
    if (r.type === 'combat' || r.type === 'elite') text = '조용해졌다. 지도에서 다음 방을 고르자.';
    if (r.type === 'camp') { text = r.used ? '꺼져 가는 모닥불.' : '안전한 야영지. 쉬어 갈 수 있다.'; if (!r.used) acts.push(['야영하기', () => { r.used = true; this.hideAct(); Game.go('rest', { node: { stage: floorStage(fl.floor), row: r.id, type: 'rest' } }); }]); }
    if (r.type === 'treasure') { text = r.used ? '빈 상자.' : '보물 상자가 놓여 있다.'; if (!r.used) acts.push(['상자 열기', () => this.openTreasure(r)]); }
    if (r.type === 'stairs') { text = '아래로 이어지는 계단.'; acts.push([fl.floor + 1 === DUNGEON.BOSS_FLOOR ? '가장 깊은 곳으로' : `${fl.floor + 1}층으로 내려가기`, () => this.descend()]); }
    if (r.type === 'lever') { text = r.used ? '내려간 레버.' : '녹슨 레버가 있다.'; if (!r.used) acts.push(['레버 내리기', () => { r.used = true; fl.have++; Sfx.play('door'); Game.toast(`레버를 내렸다 (${fl.have}/${BOSS_GIMMICKS.lever.need})${bossOpen(fl) ? ' — 어딘가에서 문이 열리는 소리가 난다' : ''}`, 2200); this.buildHud(); this.showRoomActions(r); }]); }
    if (r.type === 'seal') { text = r.used ? '부서진 봉인석.' : '보랏빛 봉인석이 빛나고 있다.'; if (!r.used) acts.push(['봉인석 부수기', () => { r.used = true; fl.have++; Sfx.play('boom'); Game.toast(`봉인석을 부쉈다 (${fl.have}/${BOSS_GIMMICKS.seal.need})${bossOpen(fl) ? ' — 봉인이 풀렸다' : ''}`, 2200); this.buildHud(); this.showRoomActions(r); }]); }
    if (r.type === 'key') text = '열쇠를 챙겼다.';
    this.showAct(K.name, text, acts);
  },
  showAct(title, text, acts) {
    this.act.innerHTML = '';
    this.act.appendChild(el('div', 'ex-act-title', title));
    if (text) this.act.appendChild(el('div', 'muted', text));
    if (acts.length) { const row = el('div', 'btn-row'); acts.forEach(([label, fn], i) => row.appendChild(btn(label, 'primary', fn, { id: 'ex-act-' + i }))); this.act.appendChild(row); }
    this.act.classList.remove('hidden');
  },
  hideAct() { this.act.classList.add('hidden'); },
  openTreasure(r) {
    const run = Game.run, fl = run.dungeon;
    r.used = true;
    const rng = makeRng(hashSeed(run.seed, 'treasure', fl.floor, r.id));
    const gold = rng.int(30, 60) + fl.floor * 10;
    run.gold += gold;
    const got = [`골드 +${gold}`];
    const p = Game.profile;
    const v = rng();
    if (v < 0.4) { const it = EQ.dropItem(rng, p, 'elite', run.tier, partyIds(run)); p.inv.push(it); run.loot.push({ kind: 'item', uid: it.uid }); got.push(`장비 ${it.grade} ${EQ.itemName(it)}`); }
    else if (v < 0.7) { const pool = Object.keys(RELICS).filter((k) => !run.relics.includes(k)); if (pool.length) { const k = rng.pick(pool); run.relics.push(k); got.push(`유물 ${RELICS[k].name}`); } }
    else { const s = rng.int(3, 6); p.stones += s; run.stonesGot += s; got.push(`강화석 +${s}`); }
    if (rng() < 0.4) { run.potions++; got.push('회복약 +1'); }
    saveProfile();
    Sfx.play('coin');
    Game.toast(got.join(' · '), 2600);
    this.buildHud(); this.showRoomActions(r);
  },
  descend() {
    const run = Game.run, fl = run.dungeon;
    const next = fl.floor + 1;
    run.dungeon = genFloor(run.seed, next);
    run.pos = { stage: next, row: 0 };
    run.torch = Math.min(CONST.TORCH_MAX, run.torch + 10);
    for (const id of partyIds(run)) { const h = run.heroes[id]; if (!h.dead) h.hp = Math.min(h.maxHp, Math.round(h.hp + h.maxHp * DUNGEON.STAIRS_HEAL)); }
    Sfx.play('door');
    Game.go('dungeon');
    if (next === DUNGEON.BOSS_FLOOR) setTimeout(() => Game.toast(BOSS_GIMMICKS[run.dungeon.gimmick].text, 3600), 300);
    else Game.toast(`${next}층 — 계단에서 숨을 돌렸다 (HP +${DUNGEON.STAIRS_HEAL * 100}%)`, 1600);
  },
  startRoomFight(r) {
    const run = Game.run, fl = run.dungeon;
    const st = r.type === 'boss' ? 5 : floorStage(fl.floor);
    const node = { stage: st, row: r.id, type: r.fight.type, enc: r.type === 'boss' ? run.bossEnc : r.fight.enc, affix: r.fight.affix || null, dref: { room: r.id } };
    const waves = encounterFor(node);
    node.waves = waves;
    Sfx.play('skill');
    Game.go('battle', { node, explore: { fieldW: DUNGEON.FIELD_W, heroPos: this.partyAt(380).map((p) => ({ x: p.x, y: p.y })), enemySpawnX: 900, worldX: 0, theme: fl.floor } });
  },

  // ------------------------------------------------------------ 복도
  goTo(target) {
    const fl = Game.run.dungeon, here = fl.rooms[fl.at.room];
    const n = floorNeighbors(fl, here.id).find((x) => x.room.id === target.id);
    if (!n) return;
    if (target.type === 'boss' && !bossOpen(fl)) { Game.toast(BOSS_GIMMICKS[fl.gimmick].text, 2400); Sfx.play('back'); return; }
    fl.at = { corr: n.corr.id, from: here.id, to: target.id, x: 60 };
    n.corr.walked = true;
    this.hideAct(); this.fade = 0.4; this.camX = 0;
    Sfx.play('door');
    this.refreshWalkBox();
  },
  corridor() { const fl = Game.run.dungeon; return fl.at.corr !== undefined ? fl.corridors[fl.at.corr] : null; },

  partyAt(x0) {
    const run = Game.run;
    return partyIds(run).filter((id) => !run.heroes[id].dead).map((id, i) => ({ id, x: x0 - i * 46, y: EXPLORE.LANES[i % 3] }));
  },

  update(dt) {
    this.t += dt;
    const run = Game.run, fl = run.dungeon;
    if (!fl || Game.modalOpen) return;
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.t += dt; f.y -= 30 * dt; if (f.t > f.dur) this.fx.splice(i, 1); }
    if (this.fade > 0) this.fade -= dt;
    if (this.pending) { this.pending.t -= dt; if (this.pending.t <= 0) { const f = this.pending.fn; this.pending = null; f(); return; } }
    const c = this.corridor();
    if (!c) { if (run.autoMode) this.autoRoom(dt); return; }
    const at = fl.at, track = corridorTrack(c, at.from);
    const sp = EXPLORE.SPEED * (Game.settings.speed || 1) * ((Game.debug && Game.debug.simMult) || 1) * dt;
    // 다음 것: 적은 보이는 거리에서 전투, 함정·보급은 밟으면
    const next = track.find((p) => !p.it.done && p.x > at.x - 30);
    let limit = c.len - 40;
    if (next) {
      const it = next.it;
      if (it.kind === 'fight' || it.kind === 'elite') {
        if (at.x >= next.x - EXPLORE.SPOT) { this.startCorridorFight(c, next); return; }
      } else if (at.x >= next.x - 10) this.stepOn(c, next);
    }
    let dir = 0;
    if (run.autoMode) dir = 1;
    else if (this.hold) dir = this.hold;
    else if (this.walkTarget !== null) { const d = this.walkTarget - at.x; dir = Math.abs(d) < 4 ? 0 : Math.sign(d); if (!dir) this.walkTarget = null; }
    this.moving = dir !== 0; this.faceLeft = dir < 0;
    if (dir) at.x = clamp(at.x + dir * sp, -40, limit + 41);
    // 횃불: 복도를 걸을 때만 닳는다
    if (dir > 0) { this.torchAcc = (this.torchAcc || 0) + sp; if (this.torchAcc >= 900) { this.torchAcc -= 900; run.torch = Math.max(0, run.torch - CONST.TORCH_PER_TILE); this.refreshRes(); } }
    if (at.x > limit) { this.arriveRoom(fl.rooms[at.to]); return; }
    if (at.x < -30) { this.arriveRoom(fl.rooms[at.from]); return; } // 되돌아감
    this.camX += (clamp(at.x - EXPLORE.CAM_LEAD, 0, Math.max(0, c.len - 960)) - this.camX) * Math.min(1, dt * 4);
  },

  stepOn(c, p) {
    const run = Game.run, fl = run.dungeon, it = p.it;
    it.done = true;
    const rng = makeRng(hashSeed(run.seed, 'corr', fl.floor, c.id, it.id));
    let text;
    if (it.kind === 'trap') {
      const ids = partyIds(run).filter((id) => !run.heroes[id].dead);
      const spot = 0.35 + (ids.some((id) => ['ranged', 'support'].includes(HEROES[id].role)) ? 0.2 : 0);
      if (rng() < spot) { text = '함정을 알아채고 피했다'; Sfx.play('click'); }
      else { for (const id of ids) { const h = run.heroes[id]; h.hp = Math.max(1, Math.round(h.hp - h.maxHp * 0.1)); } text = '함정! 파티 HP -10%'; Sfx.play('hit'); }
    } else {
      const v = rng();
      if (v < 0.45) { const g = rng.int(10, 25) + fl.floor * 3; run.gold += g; text = `골드 +${g}`; }
      else if (v < 0.65) { run.potions++; text = '회복약 +1'; }
      else if (v < 0.85) { run.food++; text = '식량 +1'; }
      else { run.torch = Math.min(CONST.TORCH_MAX, run.torch + 25); text = '횃불 +25'; }
      Sfx.play('coin');
    }
    this.fx.push({ x: p.x, y: 300, text, t: 0, dur: 1.8 });
    this.buildHud();
  },

  startCorridorFight(c, p) {
    const run = Game.run, fl = run.dungeon, it = p.it;
    const worldX = Math.round(p.x - 1000); // 전장 0의 복도 좌표: 적은 전장 1000 부근, 파티는 걷던 자리
    const heroPos = this.partyAt(fl.at.x).map((q) => ({ x: clamp(q.x - worldX, CONST.FIELD_X0 + 10, DUNGEON.FIELD_W - 60), y: q.y }));
    let type = it.kind === 'elite' ? 'elite' : 'battle';
    let affix = it.affix || null;
    if (type === 'battle' && run.torch <= 0) { // 횃불이 꺼지면 어둠 속 습격
      const r = makeRng(hashSeed(run.seed, 'dark', fl.floor, c.id, it.id));
      if (r() < CONST.TORCH_DARK_ELITE_CHANCE) { type = 'elite'; affix = 'fury'; Game.toast('어둠 속에서 정예가 습격했다!', 2000); }
    }
    const node = { stage: floorStage(fl.floor), row: c.id, type, enc: it.enc, affix, small: type === 'battle', named: it.named || null, dref: { corr: c.id, item: it.id, pos: p.x } };
    node.waves = type === 'battle' ? corridorWaves(fl, it) : encounterFor(node);
    Sfx.play('skill');
    Game.go('battle', { node, explore: { fieldW: DUNGEON.FIELD_W, heroPos, enemySpawnX: 850, worldX, theme: fl.floor } });
  },

  // 자동 모드: 방에서 할 일을 하고, 다음 방을 고른다 (계단·열린 보스 방 → 가까운 안 가 본 방)
  autoRoom(dt) {
    const fl = Game.run.dungeon, here = fl.rooms[fl.at.room];
    if (here.fight && !here.cleared) return;
    this.autoT = (this.autoT || 0) + dt * (Game.settings.speed || 1) * ((Game.debug && Game.debug.simMult) || 1);
    if (this.autoT < 1.4) return;
    this.autoT = 0;
    if ((here.type === 'treasure' || here.type === 'lever' || here.type === 'seal') && !here.used) { const b = document.getElementById('ex-act-0'); if (b) { b.click(); return; } }
    if (here.type === 'camp' && !here.used) { // 자동 야영: 파티 HP가 75% 아래면 식량을 써서 쉰다
      const ids = partyIds(Game.run).filter((id) => !Game.run.heroes[id].dead);
      const avg = ids.reduce((a, id) => a + Game.run.heroes[id].hp / Game.run.heroes[id].maxHp, 0) / Math.max(1, ids.length);
      if (avg < 0.75 && Game.run.food > 0) { this.autoCamp(here); return; }
    }
    if (here.type === 'stairs') { this.descend(); return; }
    const step = dungeonNextStep(fl);
    if (step !== null) this.goTo(fl.rooms[step]);
  },

  autoCamp(r) {
    const run = Game.run;
    r.used = true; run.food--;
    for (const id of partyIds(run)) { const h = run.heroes[id]; if (!h.dead) h.hp = Math.min(h.maxHp, Math.round(h.hp + h.maxHp * CONST.REST_HEAL_PCT)); }
    run.torch = Math.min(CONST.TORCH_MAX, run.torch + CONST.TORCH_REST_GAIN);
    Sfx.play('heal');
    Game.toast(`야영: 식량 1개로 HP ${CONST.REST_HEAL_PCT * 100}% 회복 · 횃불 +${CONST.TORCH_REST_GAIN}`, 1800);
    this.buildHud(); this.showRoomActions(r);
  },

  // ------------------------------------------------------------ 입력
  pointerDown(p) {
    const run = Game.run, fl = run.dungeon;
    // 지도 탭: 이웃 방으로 출발 (방 안에서, 전투가 끝난 뒤)
    const r = this.mapHit(p);
    if (r) {
      if (fl.at.room === undefined) { Game.toast('복도를 다 지난 뒤에 고를 수 있어요', 1200); return; }
      const here = fl.rooms[fl.at.room];
      if (here.fight && !here.cleared) return;
      if (r.id === here.id) return;
      if (!floorNeighbors(fl, here.id).some((n) => n.room.id === r.id)) { Game.toast('이웃한 방으로만 갈 수 있어요', 1100); Sfx.play('back'); return; }
      this.goTo(r);
      return;
    }
    // 복도에서 바닥 탭 = 그 지점까지 걷기 (수동)
    if (fl.at.corr !== undefined && !run.autoMode && p.y > 250) this.walkTarget = clamp(p.x + this.camX, -40, this.corridor().len);
  },
  mapHit(p) {
    const fl = Game.run.dungeon, B = MAP_BOX;
    if (p.x < B.x || p.x > B.x + B.w || p.y < B.y || p.y > B.y + B.h) return null;
    for (const r of fl.rooms) {
      if (!roomSeen(fl, r)) continue;
      const cx = B.x + 6 + r.gx * B.cw + B.cw / 2, cy = B.y + 24 + r.gy * B.ch + B.ch / 2;
      if (Math.abs(p.x - cx) < 22 && Math.abs(p.y - cy) < 16) return r;
    }
    return null;
  },

  // ------------------------------------------------------------ 그리기
  render(ctx) {
    const run = Game.run, fl = run.dungeon, t = this.t;
    if (!fl) return;
    const c = this.corridor();
    const cam = Math.round(this.camX);
    drawCorridor(ctx, cam + (c ? c.id * 3000 : 50000 + fl.at.room * 3000), t, fl.floor);
    ctx.save(); ctx.translate(-cam, 0);
    if (c) {
      drawExitDoor(ctx, -60, t); drawExitDoor(ctx, c.len + 30, t);
      for (const p of corridorTrack(c, fl.at.from)) if (!p.it.done) drawPoi(ctx, p.it, p.x, t, fl);
      this.drawParty(ctx, this.partyAt(fl.at.x), t);
    } else {
      const r = fl.rooms[fl.at.room];
      drawRoomInterior(ctx, r, fl, t);
      this.drawParty(ctx, this.partyAt(380), t);
    }
    ctx.textAlign = 'center';
    for (const f of this.fx) { ctx.globalAlpha = Math.max(0, 1 - f.t / f.dur); ctx.font = '800 18px sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = '#1a0f08'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = '#ffd34a'; ctx.fillText(f.text, f.x, f.y); }
    ctx.globalAlpha = 1;
    ctx.restore();
    const dark = run.torch <= 0 ? 0.55 : run.torch < 30 ? 0.3 : 0.1;
    const g = ctx.createRadialGradient(EXPLORE.CAM_LEAD + 120, 330, 120, EXPLORE.CAM_LEAD + 120, 330, 620);
    g.addColorStop(0, 'rgba(8,6,14,0)'); g.addColorStop(1, `rgba(8,6,14,${dark + 0.35})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 540);
    drawDungeonMap(ctx, fl, t);
    if (this.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, this.fade * 2)})`; ctx.fillRect(0, 0, 960, 540); }
  },
  drawParty(ctx, list, t) {
    const walking = this.moving && !Game.modalOpen;
    for (const p of list.slice().sort((a, b) => a.y - b.y)) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
      drawSprite(ctx, HEROES[p.id].sprite, p.x, p.y - (walking ? Math.abs(Math.sin(t * 10 + p.x * 0.01)) * 3 : 0), { scale: CONST.SPRITE_SCALE, t, flip: !!this.faceLeft && walking, anim: walking ? 'walk' : 'idle', phase: p.x * 0.01, blinking: ((t + p.x * 0.003) % 3.4) < 0.12 });
    }
  },
};

// 자동 길찾기: 지금 방에서 목표까지의 다음 방 (가 본 방·이웃 방만 안다)
function dungeonNextStep(fl) {
  const start = fl.at.room;
  const passable = (r) => roomSeen(fl, r) && !(r.type === 'boss' && !bossOpen(fl));
  const prev = {}; const seen = { [start]: true }; const q = [start]; const order = [];
  while (q.length) { const c = q.shift(); order.push(c); for (const n of floorNeighbors(fl, c)) if (!seen[n.room.id] && passable(n.room) && (fl.rooms[c].visited)) { seen[n.room.id] = true; prev[n.room.id] = c; q.push(n.room.id); } }
  const goal = order.find((id) => id !== start && fl.rooms[id].visited && (fl.rooms[id].type === 'stairs' || (fl.rooms[id].type === 'boss' && bossOpen(fl))))
    ?? order.find((id) => id !== start && fl.rooms[id].type === 'boss' && bossOpen(fl))
    ?? order.find((id) => !fl.rooms[id].visited);
  if (goal === undefined) return null;
  let s = goal; while (prev[s] !== start && prev[s] !== undefined) s = prev[s];
  return prev[s] === start ? s : null;
}

// ---------------------------------------------------------------- 던전 지도 (오른쪽 위)
function drawDungeonMap(ctx, fl, t) {
  const B = MAP_BOX;
  ctx.fillStyle = 'rgba(14,10,22,0.78)'; ctx.fillRect(B.x, B.y, B.w, B.h);
  ctx.strokeStyle = 'rgba(255,230,170,0.25)'; ctx.lineWidth = 1.5; ctx.strokeRect(B.x, B.y, B.w, B.h);
  ctx.fillStyle = '#ffe9a0'; ctx.font = '800 12px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(fl.floor === DUNGEON.BOSS_FLOOR ? '지도 · 가장 깊은 곳' : `지도 · ${fl.floor}층`, B.x + 8, B.y + 16);
  const pos = (r) => ({ x: B.x + 6 + r.gx * B.cw + B.cw / 2, y: B.y + 24 + r.gy * B.ch + B.ch / 2 });
  // 복도
  for (const c of fl.corridors) {
    const a = fl.rooms[c.a], b = fl.rooms[c.b];
    if (!(roomSeen(fl, a) && roomSeen(fl, b)) || !(a.visited || b.visited)) continue;
    const pa = pos(a), pb = pos(b);
    ctx.strokeStyle = c.walked ? '#c8a060' : 'rgba(160,140,200,0.4)'; ctx.lineWidth = c.walked ? 5 : 3; ctx.setLineDash(c.walked ? [] : [4, 4]);
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke(); ctx.setLineDash([]);
  }
  // 지금 복도 위치
  if (fl.at.corr !== undefined) {
    const c = fl.corridors[fl.at.corr], a = pos(fl.rooms[fl.at.from]), b = pos(fl.rooms[fl.at.to]), k = clamp(fl.at.x / c.len, 0, 1);
    ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, 5 + Math.sin(t * 6), 0, 7); ctx.fill();
  }
  // 방
  const here = fl.at.room !== undefined ? fl.rooms[fl.at.room] : null;
  const near = here ? floorNeighbors(fl, here.id).map((n) => n.room.id) : [];
  for (const r of fl.rooms) {
    if (!roomSeen(fl, r)) continue;
    const p = pos(r), K = ROOM_KINDS[r.type];
    const known = r.visited || r.type === 'boss';
    ctx.fillStyle = r.visited ? '#4a3a2a' : '#241c30';
    ctx.fillRect(p.x - 20, p.y - 14, 40, 28);
    ctx.strokeStyle = here === r ? '#ffd34a' : near.includes(r.id) && (!here.fight || here.cleared) ? `rgba(140,220,255,${0.6 + Math.sin(t * 4) * 0.3})` : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = here === r || near.includes(r.id) ? 2.5 : 1.5; ctx.strokeRect(p.x - 20, p.y - 14, 40, 28);
    ctx.textAlign = 'center'; ctx.font = '800 15px sans-serif';
    ctx.fillStyle = known ? (r.cleared && r.fight ? 'rgba(240,224,192,0.5)' : K.color) : 'rgba(160,140,200,0.6)';
    ctx.fillText(known ? K.icon : '?', p.x, p.y + 5);
    if (r.type === 'boss' && !bossOpen(fl)) { ctx.fillStyle = '#ffd34a'; ctx.font = '700 10px sans-serif'; ctx.fillText('🔒', p.x + 14, p.y - 6); }
  }
}

// 방 안: 방 종류에 맞는 물건, 적이 있으면 적 무리
function drawRoomInterior(ctx, r, fl, t) {
  const x = 760, y = 380;
  drawExitDoor(ctx, 60, t);
  if (r.fight && !r.cleared) {
    const node = { type: r.fight.type, stage: r.type === 'boss' ? 5 : floorStage(fl.floor), enc: r.type === 'boss' ? Game.run.bossEnc : r.fight.enc };
    drawPoi(ctx, { kind: 'fight', waves: encounterFor(node) }, x, t, fl);
    return;
  }
  if (r.type === 'camp') drawPoi(ctx, { kind: 'rest' }, x, t, fl);
  if (r.type === 'treasure' && !r.used) drawPoi(ctx, { kind: 'chest' }, x, t, fl);
  if (r.type === 'stairs') { ctx.fillStyle = '#140f1c'; ctx.fillRect(x - 60, y - 40, 120, 44); for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgba(120,100,150,${0.6 - i * 0.12})`; ctx.fillRect(x - 56 + i * 8, y - 36 + i * 9, 112 - i * 16, 6); } }
  if (r.type === 'lever') { ctx.fillStyle = '#5a5060'; ctx.fillRect(x - 14, y - 70, 28, 70); ctx.save(); ctx.translate(x, y - 64); ctx.rotate(r.used ? 0.9 : -0.9); ctx.fillStyle = '#8a6a4a'; ctx.fillRect(-3, -40, 6, 40); ctx.fillStyle = '#d04a3a'; ctx.beginPath(); ctx.arc(0, -42, 7, 0, 7); ctx.fill(); ctx.restore(); }
  if (r.type === 'seal') { const s = r.used ? 0.2 : 0.7 + Math.sin(t * 3) * 0.2; ctx.fillStyle = r.used ? '#3a3040' : '#5a3a7a'; ctx.beginPath(); ctx.moveTo(x, y - 110); ctx.lineTo(x + 26, y); ctx.lineTo(x - 26, y); ctx.fill(); const g = ctx.createRadialGradient(x, y - 50, 4, x, y - 50, 90); g.addColorStop(0, `rgba(180,120,255,${s})`); g.addColorStop(1, 'rgba(180,120,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - 90, y - 140, 180, 180); }
  if (r.type === 'boss' && r.cleared) { /* 비어 있음 */ }
}

// 길 위의 것 (적 무리·상자·함정·보급·모닥불)
function drawPoi(ctx, it, x, t, fl) {
  const y = 380;
  if (it.kind === 'fight' || it.kind === 'elite') {
    const waves = it.waves || (it.kind === 'elite' ? encounterFor({ type: 'elite', stage: floorStage(fl.floor), enc: it.enc }) : corridorWaves(fl, it));
    waves[0].forEach((id, k) => {
      const ey = EXPLORE.LANES[k % 3] + (k >= 3 ? 12 : 0), ex = x + (k % 2) * 40 + ENEMIES[id].size * 20 + Math.floor(k / 3) * 60;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(ex, ey + 2, 24 * ENEMIES[id].size, 7, 0, 0, Math.PI * 2); ctx.fill();
      drawSprite(ctx, ENEMIES[id].sprite, ex, ey, { scale: CONST.SPRITE_SCALE * (ENEMIES[id].abilities.includes('boss') ? 1.15 : 1), flip: true, t, phase: k });
    });
    if (it.named) { ctx.textAlign = 'center'; ctx.font = '800 14px sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = '#1a0f08'; ctx.strokeText(`「${it.named}」`, x + 30, 220); ctx.fillStyle = '#ff9a6a'; ctx.fillText(`「${it.named}」`, x + 30, 220); }
    return;
  }
  if (it.kind === 'trap') {
    ctx.fillStyle = 'rgba(120,90,60,0.8)'; ctx.fillRect(x - 26, y - 2, 52, 8); ctx.fillStyle = 'rgba(200,60,50,0.6)'; for (let i = -2; i <= 2; i++) ctx.fillRect(x + i * 10 - 1, y - 8, 3, 6);
    return;
  }
  if (it.kind === 'supply') {
    ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x - 14, y - 18, 28, 18); ctx.fillStyle = '#9a7a4a'; ctx.fillRect(x - 16, y - 22, 32, 6);
    const s = 0.5 + Math.sin(t * 5) * 0.5; ctx.fillStyle = `rgba(255,230,140,${s})`; ctx.fillRect(x + 10, y - 30 - s * 4, 3, 3);
    return;
  }
  if (it.kind === 'chest') {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 34, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a4a24'; ctx.fillRect(x - 30, y - 34, 60, 36); ctx.fillStyle = '#9a6232'; ctx.fillRect(x - 30, y - 44, 60, 12);
    ctx.fillStyle = '#ffd34a'; ctx.fillRect(x - 5, y - 28, 10, 10);
    const s = 0.5 + Math.sin(t * 5) * 0.5; ctx.fillStyle = `rgba(255,230,140,${s})`; ctx.fillRect(x + 20, y - 56 - s * 4, 4, 4);
    return;
  }
  if (it.kind === 'rest') {
    ctx.fillStyle = '#5e3a20'; ctx.fillRect(x - 18, y - 6, 36, 8);
    const fh = 18 + Math.sin(t * 12) * 4;
    ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.moveTo(x - 12, y - 4); ctx.quadraticCurveTo(x, y - 4 - fh * 2, x + 12, y - 4); ctx.fill();
    ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.moveTo(x - 6, y - 4); ctx.quadraticCurveTo(x, y - 4 - fh, x + 6, y - 4); ctx.fill();
    const g = ctx.createRadialGradient(x, y - 20, 4, x, y - 20, 140); g.addColorStop(0, 'rgba(255,170,80,0.35)'); g.addColorStop(1, 'rgba(255,170,80,0)'); ctx.fillStyle = g; ctx.fillRect(x - 140, y - 160, 280, 200);
  }
}

// ---------------------------------------------------------------- 배경 (탐험·조우 전투 공용)
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

function drawExitDoor(ctx, x, t) {
  const y = 330;
  ctx.fillStyle = '#1a1424'; ctx.fillRect(x - 40, y - 150, 80, 160);
  ctx.strokeStyle = '#4c4268'; ctx.lineWidth = 8; ctx.strokeRect(x - 44, y - 154, 88, 168);
  const g = ctx.createLinearGradient(x, y - 150, x, y + 10); g.addColorStop(0, 'rgba(255,230,170,0.05)'); g.addColorStop(1, `rgba(255,230,170,${0.15 + Math.sin(t * 2) * 0.05})`);
  ctx.fillStyle = g; ctx.fillRect(x - 40, y - 150, 80, 160);
}
