// ===== 07_battle_view.js : 실시간 파티 전투 장면 (렌더/연출/HUD/입력) =====
// BattleSim(로직)을 고정 타임스텝으로 돌리고, sim.events를 소비해 연출만 담당한다.
// HUD: 캐릭터별 묶음 [얼굴 + ① 갑옷 ② 무기 ③ 필살기]. 버튼 탭 = 자동 대상 즉시 시전,
//      버튼을 끌면 슬로모션 → 놓는 곳에 대상/범위 지정. 적 칩/적 탭 = 집중 공격. 오른쪽 = 작전 명령.

const BattleScene = {
  enter(params) {
    const run = Game.run;
    const node = params.node;
    this.node = node;
    this.run = run;
    const waves = oathWaves(run, node, node.waves || encounterFor(node));
    const ex = params.explore || null; // 탐험 중 조우: { fieldW, heroPos, enemySpawnX, worldX(전장 0의 탐험 좌표), theme }
    this.explore = ex;
    const heroes = partyIds(run).filter((id) => !run.heroes[id].dead).map((id) => {
      const h = run.heroes[id];
      const lo = EQ.heroLoadout(Game.profile, id);
      return { id, hp: h.hp, maxHp: h.maxHp, upgrades: h.upgrades, mods: lo.mods, skills: lo.skills, skillRank: lo.skillRank, levelGap: EQ.levelGap(Game.profile, id, run.tier), ultDef: GACHA.ultFor(Game.profile, id) };
    });
    const ti = EQ.tierInfo(run.tier);
    this.sim = new BattleSim({
      seed: hashSeed(run.seed, 'battle', node.stage, node.row, node.type),
      stage: node.stage, waves, heroes,
      relics: run.relics, strategy: run.strategy, autoMode: run.autoMode, fullAuto: !!node.small, smartAuto: !!(Game.debug && Game.debug.smartAuto), partySize: run.party.length,
      fruit: run.fruit && run.fruit.battles > 0 ? { bonus: run.fruit.bonus } : null,
      torchDark: run.torch <= 0,
      tier: (() => { const f = run.dungeon ? 1 + DUNGEON.FLOOR_SCALE * (run.dungeon.floor - 1) : 1, o = run.dungeon ? oathScale(run) : { hp: 1, atk: 1 }; return { hp: ti.hp * f * o.hp, atk: ti.atk * f * o.atk }; })(),
      fieldW: ex ? ex.fieldW : undefined, heroPos: ex ? ex.heroPos : undefined, enemySpawnX: ex ? ex.enemySpawnX : undefined,
      eliteAffix: node.affix || null, named: node.named || null, surprise: !!(ex && ex.surprise),
    });
    this.camX = this.camTarget(); // 카메라 (전장 좌표, 화면 폭 960)
    this.acc = 0;
    this.t = 0;
    this.speed = Game.settings.speed || 1;
    this.paused = false;
    this.drag = null;       // 스킬 버튼 끌기 상태
    this.slowmo = 0;
    this.hitstop = 0;
    this.shake = 0;
    this.fx = [];
    this.popups = [];
    this.banner = null;
    this.cutin = null;
    this.endTimer = -1;
    this.finished = false;
    this.danger = null;
    this.dust = [];
    for (let i = 0; i < 26; i++) this.dust.push({ x: Math.random() * 960, y: 60 + Math.random() * 300, s: 0.5 + Math.random() * 1.5, p: Math.random() * 6 });
    this.buildHud();
    this.consumeEvents();
    if (node.type === 'boss') Music.play('boss');
    this.banner = { text: node.type === 'boss' ? '보스: ' + ENEMIES[waves[0][0]].name : node.type === 'elite' ? (node.named ? `네임드: 「${node.named}」` : node.affix ? `정예: ${ELITE_AFFIXES[node.affix].name}` : '정예 전투!') : '전투 시작', sub: `웨이브 1/${waves.length}`, t: 0, dur: 1.6 };
    if (!Game.hint('battle') && this.sim.enemies.some((e) => e.poiseMax)) Game.hint('break');
    this.breakHintPending = !Game.settings.seenHints.break;
  },

  exit() { this.drag = null; this.cmdDrag = null; this.cmdPress = null; this.tacPause = false; if (this.onKey) window.removeEventListener('keydown', this.onKey); },

  // ------------------------------------------------------------ 카메라 (전장이 화면보다 넓을 때)
  camTarget() {
    const sim = this.sim;
    if (sim.W <= 960) return 0;
    const hs = sim.aliveHeroes(), es = sim.aliveEnemies().filter((e) => e.x < sim.W);
    const avg = (l) => l.reduce((a, u) => a + u.x, 0) / l.length;
    const hc = hs.length ? avg(hs) : sim.W / 2, ec = es.length ? avg(es) : hc;
    return clamp((hs.length ? hc * 0.6 + ec * 0.4 : ec) - 480, 0, sim.W - 960);
  },
  toWorld(p) { return p ? { x: p.x + this.camX, y: p.y } : p; },

  // ------------------------------------------------------------ HUD 구성 (DOM)
  buildHud() {
    const ui = Game.ui;
    const run = this.run;
    const top = el('div', 'b-top');
    this.stageLabel = el('div', 'b-stage', '');
    top.appendChild(this.stageLabel);
    this.pauseBtn = btn('<span class="pz">❚❚</span> 일시정지', 'b-pause', () => this.openPause(), { id: 'btn-pause', sfx: 'pause' });
    top.appendChild(this.pauseBtn);
    // 전술 정지: 시간을 멈춘 채 스킬·이동·대상 명령을 내린다 (던전 세틀러즈·발더스 게이트처럼)
    this.tacBtn = btn('⏸ 전술 정지', 'b-pause b-tac', () => this.toggleTac(), { id: 'btn-tac', sfx: 'pause' });
    top.appendChild(this.tacBtn);
    this.onKey = (ev) => { if (ev.code === 'Space' && Game.sceneName === 'battle' && !Game.modalOpen) { ev.preventDefault(); this.toggleTac(); } };
    window.addEventListener('keydown', this.onKey);
    const right = el('div', 'b-right');
    this.potionBtn = btn(`🧪 ${run.potions}`, 'b-potion small', () => this.startPotion(), { id: 'btn-bpotion' });
    right.appendChild(this.potionBtn);
    this.bigBtn = btn(`💖 ${run.bigPotions || 0}`, 'b-potion small' + (run.bigPotions ? '' : ' hidden'), () => this.startPotion('big'), { id: 'btn-bpotion-big' });
    right.appendChild(this.bigBtn);
    this.speedBtn = btn(`${this.speed}x`, 'b-speed small', () => { this.speed = this.speed >= 3 ? 1 : this.speed + 1; Game.settings.speed = this.speed; Game.saveSettings(); this.speedBtn.innerHTML = `${this.speed}x`; this.speedBtn.classList.toggle('on', this.speed > 1); }, { id: 'btn-speed' });
    this.speedBtn.classList.toggle('on', this.speed > 1);
    right.appendChild(this.speedBtn);
    const seg = el('div', 'seg');
    this.autoBtn = btn('자동', 'seg-btn', () => this.setAuto(true), { id: 'btn-auto' });
    this.manualBtn = btn('수동', 'seg-btn', () => this.setAuto(false), { id: 'btn-manual' });
    seg.appendChild(this.autoBtn); seg.appendChild(this.manualBtn);
    right.appendChild(seg);
    top.appendChild(right);
    ui.appendChild(top);
    this.setAuto(run.autoMode, true);

    this.chipsWrap = el('div', 'b-chips');
    this.chipsWrap.appendChild(el('div', 'chips-label', '적'));
    this.chipEls = {};
    ui.appendChild(this.chipsWrap);

    this.tmsg = el('div', 'b-tmsg hidden');
    ui.appendChild(this.tmsg);
    this.warn = el('div', 'b-warn hidden');
    ui.appendChild(this.warn);

    // 작전 명령 (오른쪽 세로)
    const ord = el('div', 'b-orders');
    ord.appendChild(el('div', 'bo-label', '작전'));
    this.orderBtns = {};
    for (const k of ['charge', 'hold', 'retreat']) {
      const b = btn(ORDERS[k].name, 'bo-btn', () => this.setOrder(k), { id: 'btn-order-' + k });
      this.orderBtns[k] = b;
      ord.appendChild(b);
    }
    ui.appendChild(ord);
    this.setOrder('hold', true);

    // 캐릭터 묶음: 얼굴 + ① ② ③
    const hud = el('div', 'b-hud');
    this.groups = {};
    for (const h of this.sim.heroes) {
      const g = el('div', 'bgroup');
      g.dataset.hero = h.key;
      const face = el('div', 'bg-face');
      face.appendChild(portraitCanvas(h.sprite, 52));
      const hp = bar(1, 'hp'); face.appendChild(hp);
      face.appendChild(el('div', 'bg-name', h.name));
      face.appendChild(el('div', 'bg-stat', ''));
      face.appendChild(el('div', 'bg-dead', '✕'));
      face.id = 'face-' + h.key;
      this.bindFace(face, h);
      g.appendChild(face);
      const btns = {};
      for (const slot of ['s1', 's2', 'ult']) {
        const sk = this.sim.skillDef(h, slot);
        const b = el('button', 'sk sk-' + slot);
        b.type = 'button';
        b.id = `sk-${h.key}-${slot}`;
        b.innerHTML = `<span class="sk-tag"></span><span class="sk-icon">${skillGlyph(sk)}</span><span class="sk-cd"></span><span class="sk-name">${sk.name}</span><span class="sk-kind">${slot === 's1' ? '① 갑옷' : slot === 's2' ? '② 무기' : '③ 필살기'}</span>`;
        this.bindSkillButton(b, h, slot);
        g.appendChild(b);
        btns[slot] = b;
      }
      hud.appendChild(g);
      this.groups[h.uid] = { root: g, hp, stat: face.querySelector('.bg-stat'), btns, last: '' };
    }
    ui.appendChild(hud);
  },

  // 자동: 전략에서 '자동'으로 켠 스킬을 조건대로 사용 / 수동: 모두 직접
  setAuto(on, silent) {
    this.run.autoMode = on;
    this.sim.autoMode = on;
    this.autoBtn.classList.toggle('on', on);
    this.manualBtn.classList.toggle('on', !on);
    if (!silent) Game.toast(on ? '자동: 전략대로 스킬을 써요' : '수동: 스킬을 직접 써요', 1000);
  },

  toggleTac(on) {
    this.tacPause = on === undefined ? !this.tacPause : on;
    this.tacBtn.innerHTML = this.tacPause ? '▶ 재개' : '⏸ 전술 정지';
    this.tacBtn.classList.toggle('on', this.tacPause);
  },
  setOrder(k, silent) {
    this.sim.order = k;
    this.sim.clearCommands();
    for (const o in this.orderBtns) this.orderBtns[o].classList.toggle('on', o === k);
    if (!silent) { Sfx.play('click'); this.popupOrder(k); }
  },
  popupOrder(k) { const f = this.sim.frontHero(); if (f) this.popup(f.x, this.unitTop(f) - 20, ORDERS[k].name + '!', '#ffe9a0', 20, { label: true }); },

  // ------------------------------------------------------------ 스킬 버튼: 탭 = 즉시, 끌기 = 슬로모션 지정
  bindSkillButton(b, h, slot) {
    b.addEventListener('pointerdown', (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      Sfx.init(); Sfx.resume();
      if (!h.alive || this.sim.outcome) return;
      try { b.setPointerCapture(ev.pointerId); } catch (e) { /* 무시 */ }
      this.press = { h, slot, b, x0: ev.clientX, y0: ev.clientY, id: ev.pointerId };
    });
    b.addEventListener('pointermove', (ev) => {
      const pr = this.press;
      if (!pr || pr.b !== b) return;
      if (!this.drag && Math.hypot(ev.clientX - pr.x0, ev.clientY - pr.y0) > 12) this.startDrag(pr);
      if (this.drag) this.updateDrag(Input.toLogical(ev));
    });
    const up = (ev) => {
      const pr = this.press;
      if (!pr || pr.b !== b) return;
      this.press = null;
      if (this.drag) this.endDrag(Input.toLogical(ev));
      else if (ev.type === 'pointerup') this.tapSkill(h, slot);
    };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
  },

  // ------------------------------------------------------------ 캐릭터 끌기: 지점 = 이동, 적 = 공격 대상
  bindFace(face, h) {
    face.addEventListener('pointerdown', (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      Sfx.init(); Sfx.resume();
      if (!h.alive || this.sim.outcome) return;
      if (this.potionPick) { this.usePotionOn(h); return; }
      try { face.setPointerCapture(ev.pointerId); } catch (e) { /* 무시 */ }
      this.cmdPress = { h, x0: ev.clientX, y0: ev.clientY, el: face, client: true };
    });
    face.addEventListener('pointermove', (ev) => {
      const pr = this.cmdPress;
      if (!pr || pr.el !== face) return;
      if (!this.cmdDrag && Math.hypot(ev.clientX - pr.x0, ev.clientY - pr.y0) > 12) this.startCmd(pr);
      if (this.cmdDrag) this.updateCmd(this.toWorld(Input.toLogical(ev)));
    });
    const up = (ev) => {
      const pr = this.cmdPress;
      if (!pr || pr.el !== face) return;
      this.cmdPress = null;
      if (this.cmdDrag) this.endCmd(ev.type === 'pointerup' ? this.toWorld(Input.toLogical(ev)) : null);
    };
    face.addEventListener('pointerup', up);
    face.addEventListener('pointercancel', up);
  },
  startCmd(pr) {
    if (!pr.h.alive) return;
    this.cmdDrag = { h: pr.h, el: pr.el, x: pr.h.x, y: pr.h.y, fx: pr.h.x, fy: pr.h.y, unit: null, over: false };
    Game.ui.classList.add('dragging');
    Sfx.play('click');
  },
  updateCmd(p) {
    const d = this.cmdDrag;
    if (!d) return;
    d.x = p.x; d.y = p.y;
    d.over = p.y < 430 && p.y > 64;
    d.fx = clamp(p.x, this.sim.X0, this.sim.X1); d.fy = clamp(p.y + 30, CONST.FIELD_Y0, CONST.FIELD_Y1);
    d.unit = null;
    let bd = 70;
    for (const u of this.sim.aliveEnemies()) { const dd = Math.hypot(u.x - p.x, (u.y - 40) - p.y); if (dd < bd) { bd = dd; d.unit = u; } }
  },
  endCmd(p) {
    if (p) this.updateCmd(p);
    const d = this.cmdDrag;
    this.cmdDrag = null;
    Game.ui.classList.remove('dragging');
    if (!d || !d.over || !d.h.alive) return;
    const ok = d.unit ? this.sim.command(d.h, { type: 'attack', unit: d.unit }) : this.sim.command(d.h, { type: 'move', x: d.fx, y: d.fy });
    if (!ok) return;
    Sfx.play('click');
    if (d.unit) this.popup(d.unit.x, this.unitTop(d.unit) - 18, `${d.h.name} 공격`, '#ffb0a0', 16, { label: true });
    else this.popup(d.fx, d.fy - 50, d.h.actLock > 0 ? `${d.h.name} 동작 끝나고 이동` : `${d.h.name} 이동`, '#c8f0ff', 16, { label: true });
  },

  explainCant(h, slot) {
    Sfx.play('back');
    if (h.statuses.stun) Game.toast(`${h.name} 기절 중`, 900);
    else if (slot === 'ult') Game.toast(`필살기 게이지 ${Math.floor(h.ult)}%`, 900);
    else Game.toast(`쿨타임 ${h.cds[slot].toFixed(1)}초`, 900);
  },

  tapSkill(h, slot) {
    if (!this.sim.canCast(h, slot)) { this.explainCant(h, slot); return; }
    const spec = this.sim.resolveTarget(h, slot);
    if (!spec) { Sfx.play('back'); Game.toast(this.sim.skillDef(h, slot).target === 'ally' || this.sim.skillDef(h, slot).target === 'area_ally' ? '회복할 아군이 없어요' : '사거리 안에 대상이 없어요', 1000); return; }
    if (this.sim.cast(h, slot, spec)) { Sfx.play('skill'); this.slowmo = CONST.CONFIRM_SLOWMO_SEC; }
  },

  startDrag(pr) {
    const { h, slot } = pr;
    if (!this.sim.canCast(h, slot)) { this.explainCant(h, slot); this.press = null; return; }
    const sk = this.sim.skillDef(h, slot);
    this.drag = { h, slot, sk, b: pr.b, x: 0, y: 0, unit: null, over: false };
    Game.ui.classList.add('dragging');
    pr.b.classList.add('drag');
    this.tmsg.innerHTML = `<b>${h.name} · ${sk.name}</b>`;
    this.tmsg.classList.remove('hidden');
    Sfx.play('click');
  },

  updateDrag(p) {
    const d = this.drag;
    if (!d) return;
    d.x = p.x; d.y = p.y; // 화면 좌표 (끌기 선)
    p = this.toWorld(p);
    d.over = p.y < 430 && p.y > 64; // 전장 위에 있는가
    const fy = clamp(p.y + 30, CONST.FIELD_Y0, CONST.FIELD_Y1); // 손가락 아래 바닥 지점 (손가락에 가리지 않게 살짝 위를 가리킴)
    d.fx = p.x; d.fy = fy;
    d.unit = null;
    const t = d.sk.target;
    if (t === 'enemy' || t === 'ally') {
      const list = t === 'enemy' ? this.sim.aliveEnemies() : this.sim.aliveHeroes();
      let best = null, bd = 90;
      for (const u of list) { const dd = Math.hypot(u.x - p.x, (u.y - 40) - p.y); if (dd < bd) { bd = dd; best = u; } }
      d.unit = best;
    }
  },

  endDrag(p) {
    if (p) this.updateDrag(p); // 놓은 위치로 최종 대상 갱신
    const d = this.drag;
    this.drag = null;
    Game.ui.classList.remove('dragging');
    d.b.classList.remove('drag');
    this.tmsg.classList.add('hidden');
    if (!d.over) { Sfx.play('back'); Game.toast('취소', 600); return; }
    const t = d.sk.target;
    let spec;
    if (t === 'enemy' || t === 'ally') { if (!d.unit) { Sfx.play('back'); Game.toast('대상이 없어요', 900); return; } spec = { unit: d.unit }; }
    else if (t === 'area_enemy' || t === 'area_ally') spec = { x: d.fx, y: d.fy };
    else spec = this.sim.resolveTarget(d.h, d.slot) || {};
    if (this.sim.cast(d.h, d.slot, spec)) { Sfx.play('skill'); this.slowmo = CONST.CONFIRM_SLOWMO_SEC; }
    else this.explainCant(d.h, d.slot);
  },

  // ------------------------------------------------------------ 회복약 (초상화/아군 탭)
  startPotion(kind) {
    if (this.sim.outcome) return;
    this.potionKind = kind === 'big' ? 'big' : 'normal';
    if (this.potionKind === 'big' ? !(this.run.bigPotions > 0) : this.run.potions <= 0) { Game.toast('물약이 없어요', 900); return; }
    this.potionPick = true;
    this.tmsg.innerHTML = this.potionKind === 'big' ? '상급 회복약을 누구에게 쓸까요? (HP 100% + 해로운 효과 해제)' : '회복약을 누구에게 쓸까요?';
    this.tmsg.classList.remove('hidden');
    Game.ui.classList.add('potion-pick');
  },
  endPotion() { this.potionPick = false; this.tmsg.classList.add('hidden'); Game.ui.classList.remove('potion-pick'); },
  usePotionOn(h) {
    if (!h.alive) return;
    if (this.potionKind === 'big') { this.run.bigPotions--; this.sim._heal(null, h, h.maxHp); for (const k of HARMFUL_STATUS) delete h.statuses[k]; }
    else { this.run.potions--; this.sim._heal(null, h, h.maxHp * REWARD.potionHealPct); }
    Sfx.play('heal');
    this.endPotion();
  },

  onChip(u) {
    if (!u.alive) return;
    Sfx.play('click');
    this.sim.focus = this.sim.focus === u ? null : u;
    if (this.sim.focus) this.popup(u.x, this.unitTop(u) - 18, '집중 공격!', '#ff8aa0', 18, { label: true });
  },

  drawMoveMark(ctx, x, y, t, a) {
    ctx.save(); ctx.globalAlpha = a;
    ctx.strokeStyle = '#c8f0ff'; ctx.lineWidth = 2.5;
    const r = 16 + Math.sin(t * 6) * 2;
    ctx.beginPath(); ctx.ellipse(x, y, r, r / CONST.Y_WEIGHT, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke();
    ctx.restore();
  },

  unitAt(p) {
    const all = this.sim.enemies.concat(this.sim.heroes).filter((u) => u.alive);
    let best = null, bd = 1e9;
    for (const u of all) {
      const s = getSprite(u.sprite);
      const sc = this.unitScale(u);
      const w = s.w * sc * 0.8, h = s.h * sc;
      if (p.x >= u.x - w / 2 && p.x <= u.x + w / 2 && p.y >= u.y - h && p.y <= u.y + 6) { const d = Math.abs(p.x - u.x) + Math.abs(p.y - u.y + h / 2) * 0.3; if (d < bd) { bd = d; best = u; } }
    }
    return best;
  },

  pointerDown(p) {
    p = this.toWorld(p);
    if (this.potionPick) { const u = this.unitAt(p); if (u && u.side === 'hero') this.usePotionOn(u); else { Sfx.play('back'); this.endPotion(); } return; }
    const u = this.unitAt(p);
    if (u && u.side === 'enemy') this.onChip(u); // 적을 탭하면 집중 공격
    else if (u && u.side === 'hero' && !this.sim.outcome) this.cmdPress = { h: u, x0: p.x, y0: p.y, el: null };
  },
  pointerMove(p) {
    p = this.toWorld(p);
    const pr = this.cmdPress;
    if (!pr || pr.el) return;
    if (!this.cmdDrag && Math.hypot(p.x - pr.x0, p.y - pr.y0) > 10) this.startCmd(pr);
    if (this.cmdDrag) this.updateCmd(p);
  },
  pointerUp(p) {
    p = this.toWorld(p);
    const pr = this.cmdPress;
    if (!pr || pr.el) return;
    this.cmdPress = null;
    if (this.cmdDrag) this.endCmd(p);
  },

  openPause() {
    if (this.sim.outcome) return;
    this.paused = true;
    const box = el('div', 'pause-box');
    box.appendChild(el('div', 'modal-title', '일시정지'));
    const st = el('div', 'pause-stats');
    st.innerHTML = this.sim.heroes.map((h) => `<div><b>${h.name}</b> 피해 ${Math.round(h.stats.dealt)} · 회복 ${Math.round(h.stats.healed)}</div>`).join('');
    box.appendChild(st);
    const row = el('div', 'btn-col');
    row.appendChild(btn('계속 ▶', 'primary', () => { Game.closeModal(); this.paused = false; }, { id: 'pause-resume' }));
    row.appendChild(btn('⚙ 전략', '', () => openStrategyEditor(this.run, () => { this.sim.strategy = this.run.strategy; this.openPause(); }), { id: 'pause-strategy' }));
    row.appendChild(btn(`효과음: ${Game.settings.sound ? '켬' : '끔'}`, '', (e) => { Game.settings.sound = !Game.settings.sound; Sfx.enabled = Game.settings.sound; Game.saveSettings(); e.target.innerHTML = `효과음: ${Game.settings.sound ? '켬' : '끔'}`; }, { id: 'pause-sound' }));
    row.appendChild(btn(`음악: ${Game.settings.music !== false ? '켬' : '끔'}`, '', (e) => { Game.settings.music = Game.settings.music === false; Music.setEnabled(Game.settings.music); Game.saveSettings(); e.target.innerHTML = `음악: ${Game.settings.music ? '켬' : '끔'}`; }, { id: 'pause-music' }));
    row.appendChild(btn('원정 포기', 'danger', () => this.confirmGiveUp(), { id: 'pause-giveup' }));
    box.appendChild(row);
    Game.modal(box, { dim: true });
  },

  confirmGiveUp() {
    const box = el('div', 'confirm-box');
    box.appendChild(el('div', 'modal-title', '정말 포기할까요?'));
    box.appendChild(el('p', '', '이번 원정은 여기서 끝나요.'));
    const row = el('div', 'btn-row');
    row.appendChild(btn('돌아가기', 'ghost', () => this.openPause(), { sfx: 'back', id: 'giveup-no' }));
    row.appendChild(btn('포기', 'danger', () => { Game.closeModal(); this.finish('lose', true); }, { id: 'giveup-yes' }));
    box.appendChild(row);
    Game.modal(box, { dim: true });
  },

  // ------------------------------------------------------------ 진행
  update(dtReal) {
    this.t += dtReal;
    if (this.hitstop > 0) { this.hitstop -= dtReal; this.updateFx(dtReal * 0.2); this.updateHud(); return; }
    let scale = this.speed;
    if (this.paused || Game.modalOpen || this.potionPick || this.tacPause) scale = 0;
    if (this.drag || this.cmdDrag) scale *= CONST.DRAG_SLOWMO;
    // 위험 순간: 아군이 차지 범위 안에 있으면 슬로모션
    this.danger = null;
    for (const e of this.sim.enemies) if (e.alive && e.charge) {
      const inZone = this.sim.aliveHeroes().filter((h) => this.sim.inChargeZone(h, e.charge)).length;
      if (inZone && (!this.danger || e.charge.t < this.danger.t)) this.danger = { e, t: e.charge.t, n: inZone };
    }
    if (this.danger && !this.drag) scale *= CONST.DANGER_SLOWMO;
    if (this.slowmo > 0) { this.slowmo -= dtReal; scale *= CONST.CONFIRM_SLOWMO_SCALE; }
    if (this.cutin) { this.cutin.t += dtReal; if (this.cutin.t < this.cutin.dur) scale *= 0.12; else this.cutin = null; }
    scale *= Game.debug.simMult;
    this.acc += Math.min(dtReal, 0.1) * scale;
    let steps = 0;
    while (this.acc >= CONST.SIM_DT && steps < 240) {
      this.sim.step(CONST.SIM_DT);
      this.acc -= CONST.SIM_DT;
      steps++;
      this.consumeEvents();
    }
    this.camX += (this.camTarget() - this.camX) * Math.min(1, dtReal * 3);
    this.shake = Math.max(0, this.shake - dtReal * 30);
    this.updateFx(dtReal * (scale > 0 ? Math.min(scale, 2) : 0.15));
    if (this.banner) { this.banner.t += dtReal; if (this.banner.t > this.banner.dur) this.banner = null; }
    if (this.endTimer > 0) { this.endTimer -= dtReal; if (this.endTimer <= 0) this.finish(this.sim.outcome); }
    if (this.drag && !this.drag.h.alive) { this.drag.over = false; this.endDrag(null); }
    this.updateHud();
  },

  consumeEvents() {
    const ev = this.sim.events;
    if (this.sim.enemies.length !== this.codexN) { // 도감: 처음 보는 적 → 등록 + 대응법
      this.codexN = this.sim.enemies.length;
      const fresh = []; for (const e of this.sim.enemies) if (codexSee(Game.profile, e.key)) fresh.push(e);
      if (fresh.length) { // 한 줄로: 새 적 이름들 + 가장 센 적의 대응법만
        saveProfile();
        const key = fresh.slice().sort((a, b) => codexReward(b.key) - codexReward(a.key))[0].key;
        Game.toast(`📖 새 적 ${fresh.map((e) => e.def.name).join(' · ')} (+● ${fresh.reduce((a, e) => a + codexReward(e.key), 0)})<br><small>💡 ${ENEMIES[key].name}: ${ENEMY_CODEX[key].answer}</small>`, 3400);
      }
    }
    if (this.breakHintPending && !Game.modalOpen && this.sim.enemies.some((e) => e.alive && e.poiseMax && e.x < this.sim.W)) { this.breakHintPending = false; Game.hint('break'); }
    if (!ev.length) return;
    for (const e of ev) this.onEvent(e);
    ev.length = 0;
  },

  unitScale(u) { return u.def.abilities && u.def.abilities.includes('boss') ? CONST.SPRITE_SCALE * 1.15 : CONST.SPRITE_SCALE; },
  unitTop(u) { return u.y - getSprite(u.sprite).h * this.unitScale(u); },

  popup(x, y, text, color, size, opts) {
    if (opts && opts.label) {
      for (const q of this.popups) if (q.label && q.t < 0.5 && Math.abs(q.x - x) < 120 && Math.abs(q.y - y) < 20) y = q.y - 22;
      return this.popups.push(Object.assign({ x, y, text, color, size: size || 20, t: 0, dur: 0.9, vy: -40 }, opts));
    }
    this.popups.push(Object.assign({ x: x + (Math.random() - 0.5) * 16, y, text, color, size: size || 20, t: 0, dur: 0.9, vy: -60 }, opts || {}));
  },

  onEvent(e) {
    const run = this.run;
    switch (e.type) {
      case 'hit': {
        const u = e.target;
        const y = this.unitTop(u) + 6;
        if (e.shielded) { this.popup(u.x, y, '보호막', '#cfe6ff', 16); break; }
        if (e.dot) this.popup(u.x, y + 10, String(e.amount), STATUS[e.dot].color, 15, { dur: 0.7 });
        else if (e.crit) { this.popup(u.x, y - 6, e.amount + '!', '#ffd34a', 30, { crit: true }); Sfx.play('crit'); this.hitstop = Math.max(this.hitstop, CONST.HITSTOP_MS / 1000 * 1.4); this.shake = Math.max(this.shake, 4); }
        else { this.popup(u.x, y, String(e.amount), u.side === 'hero' ? '#ff8a7a' : '#ffffff', e.skill ? 24 : 19); Sfx.play('hit'); if (e.skill) this.hitstop = Math.max(this.hitstop, CONST.HITSTOP_MS / 1000); this.shake = Math.max(this.shake, e.skill ? 3 : 1.5); }
        if (!e.dot) this.spark(u.x, u.y - 30 * (u.size || 1), e.crit ? 14 : 7, e.crit ? '#ffe066' : '#fff6c0');
        break;
      }
      case 'heal':
        if (!e.quiet || e.amount >= 8) this.popup(e.target.x, this.unitTop(e.target) + 4, '+' + e.amount, '#6fe08a', e.quiet ? 15 : 22);
        if (!e.quiet) { Sfx.play('heal'); this.sparkle(e.target.x, e.target.y - 30, '#9cf0a8', 10); }
        break;
      case 'death': {
        const u = e.unit;
        this.smoke(u.x, u.y - 20, u.size || 1);
        Sfx.play('death');
        if (u.side === 'hero') { Game.toast(`💀 ${u.name} 쓰러짐`, 2400); run.stats.deathsAt[u.key] = `${this.node.stage}번째 방`; this.shake = 6; }
        break;
      }
      case 'projectile':
        this.fx.push({ type: 'proj', kind: e.kind, x0: e.from.x + 14 * e.from.face, y0: e.from.y - 40, to: e.to, t: 0, dur: e.travel });
        Sfx.play(e.kind === 'soldam' ? 'magic' : 'shoot');
        break;
      case 'dash': this.smoke(e.unit.x, e.unit.y - 6, 0.5); break;
      case 'cast': this.castFx(e); break;
      case 'ult': this.cutin = { hero: e.unit, name: e.skill.name, t: 0, dur: 0.85 }; Sfx.play('ult'); break;
      case 'ultReady': this.popup(e.unit.x, this.unitTop(e.unit) - 8, '필살기 준비!', '#ffd34a', 15); break;
      case 'status':
        if (e.status === 'stun') this.popup(e.target.x, this.unitTop(e.target) - 4, '기절!', STATUS.stun.color, 18);
        else if (['bleed', 'burn', 'vuln'].includes(e.status)) this.popup(e.target.x, this.unitTop(e.target) - 2, STATUS[e.status].name, STATUS[e.status].color, 14, { dur: 0.7 });
        break;
      case 'chargeStart':
        Sfx.play('charge');
        this.popup(e.unit.x, this.unitTop(e.unit) - 10, '차지!', '#ff5a4a', 24);
        if (!Game.settings.seenHints.charge) Game.hint('charge');
        break;
      case 'chargeImpact':
        Sfx.play('boom');
        this.shake = 12; this.hitstop = 0.12;
        for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, r = Math.random() * e.r; this.fx.push({ type: 'dust', x: e.cx + Math.cos(a) * r, y: e.cy + Math.sin(a) * r * 0.45, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 90, t: 0, dur: 0.7 + Math.random() * 0.4 }); }
        this.fx.push({ type: 'flash', t: 0, dur: 0.25, color: 'rgba(255,90,60,' });
        if (e.blocked) this.popup(e.cx, e.cy - 120, '막아냈다!', '#7ab8f0', 20);
        else if (!e.hit) this.popup(e.cx, e.cy - 60, '회피!', '#9fd0ff', 24, { crit: true });
        break;
      case 'chargeCancel': Sfx.play('cancel'); this.popup(e.unit.x, this.unitTop(e.unit) - 14, '끊었다!', '#ffd34a', 30, { crit: true }); this.hitstop = 0.1; break;
      case 'callStart': this.popup(e.unit.x, this.unitTop(e.unit) - 10, '동료 호출!', '#ffb04a', 18); Sfx.play('summon'); break;
      case 'callCancel': this.popup(e.unit.x, this.unitTop(e.unit) - 10, '호출 끊기!', '#ffd34a', 20); Sfx.play('cancel'); break;
      case 'summon': this.smoke(e.unit.x, e.unit.y - 20, 0.8); break;
      case 'shake': this.popup(e.unit.x, this.unitTop(e.unit) - 14, '흔들림!', '#ffb050', 20, { label: true }); break;
      case 'interrupt': Sfx.play('click'); break; // 진행은 머리 위 끊기 칸으로 표시
      case 'enrageStack': this.popup(e.unit.x, this.unitTop(e.unit) - 18, `격노 ${e.n}`, '#ff6a5a', 18, { label: true }); break;
      case 'regenStop': this.popup(e.unit.x, this.unitTop(e.unit) - 16, '재생 멈춤!', '#ffb07a', 16, { label: true }); break;
      case 'reflect': this.popup(e.target.x, this.unitTop(e.target) - 6, `반사 ${e.v}`, '#9cd8ff', 14); this.spark(e.target.x, e.target.y - 30, 4, '#bfe8ff'); break;
      case 'counter': this.popup(e.unit.x, this.unitTop(e.unit) - 18, '반격!', '#bfe8ff', 18, { label: true }); this.spark(e.target.x, e.target.y - 30, 8, '#bfe8ff'); Sfx.play('hit'); this.shake = Math.max(this.shake, 3); break;
      case 'combo': this.popup(e.unit.x, this.unitTop(e.unit) - 30, `연계! ${e.name}`, '#ffe066', 19, { label: true }); if (e.blast) { this.fx.push({ type: 'zone', x: e.unit.x, y: e.unit.y, r: e.blast, t: 0, dur: 0.6, color: '170,220,70' }); this.spark(e.unit.x, e.unit.y - 30, 14, '#b8e050'); this.shake = Math.max(this.shake, 5); } break;
      case 'ambush': this.popup(e.unit.x, this.unitTop(e.unit) - 18, '기습!', '#d8b0ff', 20, { label: true }); this.spark(e.target.x, e.target.y - 30, 10, '#c8a0ff'); Sfx.play('hit'); break;
      case 'vengeance': if (e.v > 5) this.popup(e.unit.x, this.unitTop(e.unit) - 34, `응징 +${e.v}`, '#ffb0ff', 18, { label: true }); break;
      case 'wipeStart': this.banner = { text: e.name, sub: e.hint, t: 0, dur: 1.8 }; Sfx.play('phase'); this.shake = Math.max(this.shake, 6); this.slowmo = 0.6; break;
      case 'wipeStopped': this.popup(e.unit.x, this.unitTop(e.unit) - 30, `${e.name} 저지!`, '#9cf0ff', 24, { label: true }); Sfx.play('cancel'); break;
      case 'wipeHit': this.fx.push({ type: 'flash', color: 'rgba(255,60,40,', t: 0, dur: 0.6 }); this.shake = Math.max(this.shake, 14); Sfx.play('boom'); this.banner = { text: e.name + '!', sub: `${e.n}명이 휩쓸렸다`, t: 0, dur: 1.4 }; break;
      case 'bossSkill': this.popup(e.unit.x, this.unitTop(e.unit) - 18, e.name, '#ffb08a', 16, { label: true }); break;
      case 'root': this.popup(e.unit.x, this.unitTop(e.unit) - 16, '속박!', '#9ad070', 16, { label: true }); break;
      case 'zoneImpact': this.smoke(e.x, e.y - 6, 1.2); this.shake = Math.max(this.shake, 5); Sfx.play('boom'); break;
      case 'affix': this.popup(e.unit.x, this.unitTop(e.unit) - 22, e.name + '!', '#ff9a6a', 18, { label: true }); break;
      case 'explode': this.smoke(e.unit.x, e.unit.y - 10, 1.6); this.shake = Math.max(this.shake, 8); Sfx.play('boom'); break;
      case 'enemyHeal': this.popup(e.target.x, this.unitTop(e.target) - 18, '치유!', '#9cf0a8', 16, { label: true }); Sfx.play('heal'); break;
      case 'surprise': this.banner = { text: '기습!', sub: '파티가 잠깐 굳었다', t: 0, dur: 1.4 }; Sfx.play('charge'); this.shake = Math.max(this.shake, 6); break;
      case 'crushWarn': if (!Game.settings.seenHints.crush) Game.hint('crush'); this.popup(e.unit.x, this.unitTop(e.unit) - 18, '짓누름!', '#ff9a6a', 17, { label: true }); break;
      case 'bossLeap': this.popup(e.unit.x, this.unitTop(e.unit) - 18, '덮치기!', '#ff9a6a', 18, { label: true }); this.shake = Math.max(this.shake, 6); break;
      case 'armorUp': this.popup(e.unit.x, this.unitTop(e.unit) - 18, '방어 강화!', '#cfe6ff', 18, { label: true }); break;
      case 'immune': this.popup(e.unit.x, this.unitTop(e.unit) - 10, '면역', '#cfcfcf', 15); break;
      case 'break':
        this.popup(e.unit.x, this.unitTop(e.unit) - 24, '그로기!', '#ffd34a', 34, { crit: true, dur: 1.2 });
        this.banner = { text: '그로기!', sub: `${e.unit.name} 무방비`, t: 0, dur: 1.3 };
        Sfx.play('crit'); this.shake = 8; this.hitstop = 0.12;
        this.fx.push({ type: 'flash', t: 0, dur: 0.3, color: 'rgba(255,220,120,' });
        break;
      case 'revive': this.popup(e.unit.x, this.unitTop(e.unit) - 20, '부활!', '#9cf0a8', 24, { crit: true }); this.sparkle(e.unit.x, e.unit.y - 30, '#9cf0a8', 20); Sfx.play('heal'); break;
      case 'passive': this.popup(e.unit.x, this.unitTop(e.unit) - 22, e.name, '#fff6c0', 16, { label: true }); break;
      case 'breakEnd': this.popup(e.unit.x, this.unitTop(e.unit) - 10, '방어 태세', '#9fd0ff', 16); break;
      case 'enrage': this.popup(e.unit.x, this.unitTop(e.unit) - 10, '광폭화!', '#ff4a3a', 22); break;
      case 'warcry': this.popup(e.unit.x, this.unitTop(e.unit) - 10, '함성!', '#ffb04a', 18); this.shake = 4; break;
      case 'phase': this.banner = { text: e.name, sub: `${e.unit.name}의 패턴이 바뀐다!`, t: 0, dur: 2.0, danger: true }; Sfx.play('phase'); this.shake = 10; break;
      case 'wave': if (e.index > 0) this.banner = { text: `웨이브 ${e.index + 1}/${e.total}`, sub: '적이 몰려온다!', t: 0, dur: 1.4 }; break;
      case 'end':
        this.endTimer = e.outcome === 'win' ? 1.3 : 1.6;
        if (this.drag) { this.drag.over = false; this.endDrag(null); }
        this.banner = e.outcome === 'win' ? { text: '승리!', sub: '', t: 0, dur: 2 } : { text: '전멸…', sub: '', t: 0, dur: 2, danger: true };
        Sfx.play(e.outcome === 'win' ? 'win' : 'lose');
        break;
      default: break;
    }
  },

  castFx(e) {
    const h = e.unit, sk = e.skill, spec = e.spec || {};
    Sfx.play(sk.fx === 'starbolt' || sk.fx === 'meteor' || sk.fx === 'nova' ? 'magic' : 'skill');
    this.popup(h.x, this.unitTop(h) - 16, sk.name, '#fff0a0', 16, { dur: 0.8, label: true });
    const tu = spec.unit;
    switch (sk.fx) {
      case 'slash': case 'bash': case 'flurry':
        this.fx.push({ type: 'slash', x: tu ? tu.x : h.x + 40 * h.face, y: (tu ? tu.y : h.y) - 36, t: 0, dur: sk.fx === 'flurry' ? 0.75 : 0.3, color: sk.fx === 'bash' ? '#9fd0ff' : '#ffffff', multi: sk.fx === 'flurry' });
        break;
      case 'spin': this.fx.push({ type: 'spin', x: h.x, y: h.y, r: sk.areaR, t: 0, dur: 0.4 }); break;
      case 'pierce': case 'starbolt': case 'snipe': if (tu) this.fx.push({ type: 'proj', kind: sk.fx, x0: h.x + 14 * h.face, y0: h.y - 40, to: tu, t: 0, dur: e.delay, big: true }); break;
      case 'meteor': for (let i = 0; i < 7; i++) { const a = Math.random() * 6.28, r = Math.random() * sk.areaR; this.fx.push({ type: 'meteor', tx: spec.x + Math.cos(a) * r, ty: spec.y + Math.sin(a) * r * 0.45, t: -i * 0.06, dur: 0.5 }); } this.fx.push({ type: 'zone', x: spec.x, y: spec.y, r: sk.areaR, t: 0, dur: 0.7, color: '255,180,80' }); break;
      case 'arrowrain': for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28, r = Math.random() * sk.areaR; this.fx.push({ type: 'arrowdrop', tx: spec.x + Math.cos(a) * r, ty: spec.y + Math.sin(a) * r * 0.45, t: -Math.random() * 0.25, dur: 0.45 }); } this.fx.push({ type: 'zone', x: spec.x, y: spec.y, r: sk.areaR, t: 0, dur: 0.6, color: '255,220,140' }); break;
      case 'nova':
        this.fx.push({ type: 'flash', t: 0, dur: 0.5, color: 'rgba(200,170,255,' });
        for (const en of this.sim.aliveEnemies()) for (let i = 0; i < 3; i++) this.fx.push({ type: 'meteor', tx: en.x + (Math.random() - 0.5) * 40, ty: en.y, t: -i * 0.08 - Math.random() * 0.1, dur: 0.4, big: true });
        break;
      case 'smoke': this.fx.push({ type: 'zone', x: h.x, y: h.y, r: 70, t: 0, dur: 0.6, color: '120,110,150' }); this.sparkle(h.x, h.y - 30, '#b8b0d0', 12); break;
      case 'poison': this.fx.push({ type: 'zone', x: spec.x, y: spec.y, r: sk.areaR, t: 0, dur: 0.9, color: '130,210,60' }); break;
      case 'venom': for (const a of this.sim.aliveHeroes()) this.sparkle(a.x, a.y - 30, '#9ae060', 8); break;
      case 'heal': if (tu) this.sparkle(tu.x, tu.y - 30, '#9cf0a8', 14); break;
      case 'aoeheal': this.fx.push({ type: 'zone', x: spec.x, y: spec.y, r: sk.areaR, t: 0, dur: 0.7, color: '140,240,160' }); break;
      case 'taunt': this.fx.push({ type: 'zone', x: h.x, y: h.y, r: 70, t: 0, dur: 0.5, color: '200,106,240' }); this.popup(h.x, this.unitTop(h) - 30, '이리 와!', '#e0a0ff', 20); break;
      case 'wall': for (const a of this.sim.aliveHeroes()) this.fx.push({ type: 'shield', unit: a, t: 0, dur: 1.0 }); break;
      case 'tree': { const c = this.sim.aliveHeroes(); const mx = c.reduce((s, a) => s + a.x, 0) / Math.max(1, c.length); this.fx.push({ type: 'tree', x: mx - 40, y: CONST.FIELD_Y0 + 10, t: 0, dur: 1.6 }); break; }
      default: break;
    }
  },

  spark(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 160;
      this.fx.push({ type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, t: 0, dur: 0.25 + Math.random() * 0.2, color });
    }
  },
  sparkle(x, y, color, n) {
    for (let i = 0; i < n; i++) this.fx.push({ type: 'sparkle', x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 30, vy: -30 - Math.random() * 40, t: -Math.random() * 0.2, dur: 0.7, color });
  },
  smoke(x, y, size) {
    for (let i = 0; i < 12; i++) this.fx.push({ type: 'smoke', x: x + (Math.random() - 0.5) * 30 * size, y: y + (Math.random() - 0.5) * 20, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 40, r: (8 + Math.random() * 10) * size, t: 0, dur: 0.8 + Math.random() * 0.4 });
  },

  updateFx(dt) {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt;
      if (f.vx !== undefined) { f.x += f.vx * dt; f.y += f.vy * dt; if (f.type === 'spark' || f.type === 'dust') f.vy += 300 * dt; }
      else if (f.vy !== undefined && f.type === 'sparkle') f.y += f.vy * dt;
      if (f.t >= f.dur) this.fx.splice(i, 1);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.t += dt;
      p.y += p.vy * dt * (1 - p.t / p.dur);
      if (p.t >= p.dur) this.popups.splice(i, 1);
    }
  },

  finish(outcome, gaveUp) {
    if (this.finished) return;
    this.finished = true;
    const run = this.run;
    const sum = this.sim.summary();
    for (const h of sum.heroes) {
      const rh = run.heroes[h.id];
      rh.hp = h.hp;
      if (!h.alive) rh.dead = true; // 영구 사망
      run.stats.dealt[h.id] += h.stats.dealt;
      run.stats.healed[h.id] += h.stats.healed;
    }
    run.stats.kills += sum.kills;
    { const kc = {}; for (const e of this.sim.enemies) if (!e.alive && !e.summonedByWipe) kc[e.key] = (kc[e.key] || 0) + 1; for (const k in kc) codexKill(Game.profile, k, kc[k]); }
    run.stats.battles++;
    if (run.fruit && run.fruit.battles > 0) { run.fruit.battles--; if (run.fruit.battles <= 0) run.fruit = null; }
    if (outcome === 'win' && !gaveUp) {
      grantBattleLoot(run, this.node);
      if (this.node.dref) dungeonBattleWon(run, this.node.dref); // 던전으로 복귀할 자리·방 정리
      if (this.node.type === 'boss') { run.result = 'victory'; Game.go('result'); }
      else if (this.node.small) { // 복도의 작은 무리: 보상 화면 없이 골드만 챙기고 바로 이어서
        const g = 6 + this.node.stage * 3 + Math.floor(Math.random() * 6); run.gold += g;
        const L = run.lastLoot; run.lastLoot = null;
        const lv = L && L.exp ? L.exp.filter((r) => r.to > r.from).map((r) => `${HEROES[r.id].name} Lv ${r.to}!`) : [];
        Game.toast(`골드 +${g}` + (L && L.exp && L.exp[0] ? ` · 경험치 +${L.exp[0].exp}` : '') + (lv.length ? ' · ' + lv.join(' ') : ''), 1600);
        backToRun();
      }
      else if (this.node.fromEvent) { Game.go('reward', { node: this.node, goldOnly: true }); }
      else Game.go('reward', { node: this.node });
    } else {
      run.result = gaveUp ? 'giveup' : 'defeat';
      Game.go('result');
    }
  },

  // ------------------------------------------------------------ HUD 갱신
  // ------------------------------------------------------------ HUD 갱신
  updateHud() {
    const sim = this.sim;
    this.stageLabel.textContent = `${this.run.dungeon ? `${this.run.dungeon.floor}층` : `방 ${this.node.stage}`} · 웨이브 ${sim.waveIndex + 1}/${sim.waves.length}`;
    this.potionBtn.innerHTML = `🧪 ${this.run.potions}`;
    this.potionBtn.disabled = this.run.potions <= 0;
    this.bigBtn.innerHTML = `💖 ${this.run.bigPotions || 0}`; this.bigBtn.classList.toggle('hidden', !(this.run.bigPotions > 0));
    // 위험 경고
    if (this.danger) {
      this.warn.classList.remove('hidden');
      const txt = `⚠ ${this.danger.e.name} 차지 ${Math.max(0, this.danger.t).toFixed(1)}초`;
      if (this.warn.dataset.t !== txt) { this.warn.dataset.t = txt; this.warn.innerHTML = `<b>${txt}</b>`; }
    } else this.warn.classList.add('hidden');
    // 적 칩
    const alive = sim.enemies.filter((u) => u.alive).sort((a, b) => a.x - b.x);
    const seen = new Set();
    alive.forEach((u, idx) => {
      seen.add(u.uid);
      let c = this.chipEls[u.uid];
      if (!c) {
        const root = el('button', 'chip');
        root.type = 'button';
        root.dataset.uid = u.uid;
        root.appendChild(portraitCanvas(u.sprite, 30, { flip: true }));
        const body = el('div', 'chip-body');
        const hp = bar(1, 'hp enemy'); body.appendChild(hp);
        const st = el('div', 'chip-st', ''); body.appendChild(st);
        root.appendChild(body);
        const ch = bar(0, 'charge'); root.appendChild(ch);
        const po = u.poiseMax ? bar(1, 'poise') : null; if (po) body.appendChild(po);
        if (u.poiseMax) root.appendChild(el('div', 'chip-armor', `🛡${Math.round(u.armor * 100)}`));
        root.appendChild(el('div', 'chip-focus', '집중'));
        root.addEventListener('click', (e) => { e.stopPropagation(); this.onChip(u); });
        if (u.def.abilities.includes('boss')) root.classList.add('boss');
        this.chipsWrap.appendChild(root);
        c = this.chipEls[u.uid] = { root, hp, st, ch, po, last: '' };
      }
      c.root.style.order = idx;
      setBar(c.hp, u.hp / u.maxHp);
      if (c.po) { setBar(c.po, u.broken > 0 ? u.broken / CONST.BREAK_DUR : u.poise / u.poiseMax); c.po.classList.toggle('broken', u.broken > 0); }
      c.root.classList.toggle('broken', u.broken > 0);
      c.root.classList.toggle('shaken', u.shaken > 0 && !(u.broken > 0));
      const s = this.statusIcons(u);
      if (s !== c.last) { c.st.innerHTML = s; c.last = s; }
      const casting = u.charge || u.call;
      c.root.classList.toggle('charging', !!casting);
      if (casting) setBar(c.ch, 1 - casting.t / casting.total);
      c.root.classList.toggle('focused', sim.focus === u);
      const d = this.drag;
      c.root.classList.toggle('inarea', !!d && d.over && ((d.unit === u) || ((d.sk.target === 'area_enemy') && sim.unitsInArea(d.h, d.slot, d.fx, d.fy).includes(u))));
    });
    for (const uid in this.chipEls) if (!seen.has(+uid)) { this.chipEls[uid].root.remove(); delete this.chipEls[uid]; }
    // 캐릭터 묶음
    for (const h of sim.heroes) {
      const g = this.groups[h.uid];
      setBar(g.hp, h.hp / h.maxHp);
      g.hp.classList.toggle('low', h.hp / h.maxHp < 0.3);
      g.root.classList.toggle('dead', !h.alive);
      g.root.classList.toggle('pick', !!this.potionPick && h.alive);
      const s = this.statusIcons(h);
      if (s !== g.last) { g.stat.innerHTML = s; g.last = s; }
      const st = this.run.strategy[h.key] || AI_PRESETS[h.key];
      for (const slot of ['s1', 's2', 'ult']) {
        const b = g.btns[slot];
        let frac, txt = '';
        if (slot === 'ult') { frac = 1 - h.ult / 100; if (h.ult < 100) txt = Math.floor(h.ult) + '%'; }
        else { frac = h.cds[slot] / sim.skillCdMax(h, slot); if (h.cds[slot] > 0) txt = String(Math.ceil(h.cds[slot])); }
        b.style.setProperty('--cd', clamp(frac, 0, 1).toFixed(3));
        const cdEl = b.children[2];
        if (cdEl.textContent !== txt) cdEl.textContent = txt;
        const ready = sim.canCast(h, slot);
        const hint = slot === 's2' ? sim.skillHint(h, slot) : '';
        const auto = sim.autoMode && st[slot] && sim.slotAuto(slot, st[slot]);
        let tag = '';
        const sk = sim.skillDef(h, slot);
        const dmgSkill = sk.power > 0 && sk.target !== 'self' && sk.target !== 'party';
        const breakNow = dmgSkill && sim.enemies.some((e) => e.alive && e.broken > 0);
        if (ready && breakNow && slot !== 's1') tag = '그로기!';
        else if (ready && hint === 'now') tag = '지금!';
        else if (ready && hint === 'hint') tag = '추천!';
        
        const tagEl = b.children[0];
        if (tagEl.textContent !== tag) tagEl.textContent = tag;
        b.classList.toggle('ready', ready);
        b.classList.toggle('cooling', txt !== '');
        b.classList.toggle('hint', ready && hint === 'hint');
        b.classList.toggle('now', ready && (hint === 'now' || (breakNow && slot !== 's1')));
        b.classList.toggle('glow', ready && slot === 'ult');
        b.classList.toggle('auto', !!auto);
        const kind = b.children[4];
        const kt = auto ? (slot === 's1' ? '① 자동' : slot === 's2' ? '② 자동' : '③ 자동') : (slot === 's1' ? '① 갑옷' : slot === 's2' ? '② 무기' : '③ 필살기');
        if (kind.textContent !== kt) kind.textContent = kt;
      }
    }
  },

  // ------------------------------------------------------------ 렌더
  render(ctx) {
    const sim = this.sim;
    const t = this.t;
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    if (this.explore) drawCorridor(ctx, this.explore.worldX + this.camX, t, this.explore.theme);
    else this.drawBackground(ctx, Math.sin(t * 0.3) * 6, t);
    const cam = Math.round(this.camX);
    ctx.translate(-cam, 0);
    // 보스 장판: 터질 곳(붉게, 차오름) · 독 웅덩이(초록) · 피난처(밝은 청록, 전멸기)
    for (const z of sim.zones) {
      const ry = z.r / CONST.Y_WEIGHT;
      if (z.kind === 'impact') {
        const prog = 1 - z.t / z.total;
        ctx.fillStyle = `rgba(230,60,40,${0.18 + prog * 0.25})`; this.floorEllipse(ctx, z.x, z.y, z.r, ry);
        ctx.fillStyle = `rgba(255,90,60,${0.3 + prog * 0.3})`; this.floorEllipse(ctx, z.x, z.y, z.r * prog, ry * prog);
        ctx.strokeStyle = 'rgba(255,140,110,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, ry, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (z.kind === 'pool') {
        ctx.fillStyle = `rgba(110,200,60,${0.28 + Math.sin(t * 4 + z.x) * 0.06})`; this.floorEllipse(ctx, z.x, z.y, z.r, ry);
        ctx.strokeStyle = 'rgba(160,240,90,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, ry, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (z.kind === 'safe') {
        const pulse = 0.5 + Math.sin(t * 6) * 0.2;
        const g = ctx.createRadialGradient(z.x, z.y - 60, 10, z.x, z.y - 60, 160); g.addColorStop(0, `rgba(160,255,240,${0.35 * pulse})`); g.addColorStop(1, 'rgba(160,255,240,0)');
        ctx.fillStyle = g; ctx.fillRect(z.x - 170, z.y - 230, 340, 260);
        ctx.fillStyle = `rgba(120,255,220,${0.22 + pulse * 0.15})`; this.floorEllipse(ctx, z.x, z.y, z.r, ry);
        ctx.strokeStyle = 'rgba(200,255,245,0.95)'; ctx.lineWidth = 3; ctx.setLineDash([10, 6]); ctx.lineDashOffset = -t * 40; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    // 차지 위험 범위 (원형)
    for (const e of sim.enemies) {
      if (!e.alive || !e.charge) continue;
      const c = e.charge, prog = 1 - c.t / c.total;
      const pulse = 0.35 + Math.sin(t * (10 + prog * 20)) * 0.15 + prog * 0.3;
      ctx.fillStyle = `rgba(220,40,30,${pulse * 0.5})`;
      this.floorEllipse(ctx, c.cx, c.cy, c.r, c.r * 0.45);
      ctx.strokeStyle = `rgba(255,120,90,${0.6 + pulse * 0.4})`; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]);
      ctx.beginPath(); ctx.ellipse(c.cx, c.cy, c.r, c.r * 0.45, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = `rgba(255,60,40,${0.25 + prog * 0.3})`;
      this.floorEllipse(ctx, c.cx, c.cy, c.r * prog, c.r * 0.45 * prog);
    }
    // 집중 공격 표시
    if (sim.focus && sim.focus.alive) {
      const f = sim.focus, r = 26 + Math.sin(t * 6) * 2, y = f.y - getSprite(f.sprite).h * this.unitScale(f) * 0.5;
      ctx.strokeStyle = 'rgba(255,77,109,0.9)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(f.x, f.y + 2, 30 * (f.size || 1), 10, 0, 0, Math.PI * 2); ctx.stroke();
      for (const a of [0, 1.57, 3.14, 4.71]) { ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * (r - 6), y + Math.sin(a) * (r - 6)); ctx.lineTo(f.x + Math.cos(a) * (r + 7), y + Math.sin(a) * (r + 7)); ctx.stroke(); }
    }
    // 끌기 미리보기 (범위)
    const d = this.drag;
    if (d && d.over && (d.sk.target === 'area_enemy' || d.sk.target === 'area_ally' || d.sk.target === 'self_area')) {
      const cx = d.sk.target === 'self_area' ? d.h.x : d.fx, cy = d.sk.target === 'self_area' ? d.h.y : d.fy;
      const col = d.sk.target === 'area_ally' ? '120,240,150' : '255,210,80';
      const r = d.sk.areaR, ry = r / CONST.Y_WEIGHT;
      ctx.fillStyle = `rgba(${col},${0.16 + Math.sin(t * 6) * 0.05})`; this.floorEllipse(ctx, cx, cy, r, ry);
      ctx.strokeStyle = `rgba(${col},0.95)`; ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 30;
      ctx.beginPath(); ctx.ellipse(cx, cy, r, ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    // 3D 시트가 있는 영웅은 쓰러진 모습(쓰러짐 동작 → 마지막 프레임)으로 남는다
    this.downAt = this.downAt || {};
    for (const h of sim.heroes) if (!h.alive && spriteSheetFor(h.sprite)) { if (this.downAt[h.uid] === undefined) this.downAt[h.uid] = t; const k = Math.min(1, (t - this.downAt[h.uid]) / 0.6); ctx.save(); ctx.globalAlpha = 0.85; drawSprite(ctx, h.sprite, h.x, h.y, { scale: this.unitScale(h), flip: h.face < 0, t, anim: 'down', animK: k }); ctx.restore(); }
    const units = sim.heroes.concat(sim.enemies).filter((u) => u.alive);
    units.sort((a, b) => a.y - b.y);
    const inArea = d && d.over && d.sk.areaR ? new Set(sim.unitsInArea(d.h, d.slot, d.fx, d.fy).map((u) => u.uid)) : null;
    for (const u of units) this.drawUnit(ctx, u, t, (inArea && inArea.has(u.uid)) || (d && d.unit === u));
    this.drawFx(ctx);
    this.drawPopups(ctx);
    ctx.restore();
    if (sim.W > 960) this.drawOffscreen(ctx, cam, t);
    this.drawWipe(ctx, t);
    for (const f of this.fx) if (f.type === 'flash') { ctx.fillStyle = f.color + (0.5 * (1 - f.t / f.dur)).toFixed(3) + ')'; ctx.fillRect(0, 0, 960, 540); }
    if (this.danger) {
      const a = 0.2 + Math.sin(t * 12) * 0.1;
      const g = ctx.createRadialGradient(480, 260, 260, 480, 260, 560);
      g.addColorStop(0, 'rgba(200,0,0,0)'); g.addColorStop(1, `rgba(200,0,0,${a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 540);
    }
    if (d) { // 끌기: 슬로모션 톤 + 버튼에서 손가락까지 선
      ctx.fillStyle = 'rgba(30,60,90,0.22)'; ctx.fillRect(0, 0, 960, 540);
      const br = d.b.getBoundingClientRect();
      const bp = Input.toLogical({ clientX: br.left + br.width / 2, clientY: br.top });
      ctx.strokeStyle = d.over ? 'rgba(156,240,168,0.95)' : 'rgba(255,255,255,0.5)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.setLineDash([2, 10]);
      ctx.beginPath(); ctx.moveTo(bp.x, bp.y); ctx.quadraticCurveTo((bp.x + d.x) / 2, Math.min(bp.y, d.y) - 60, d.x, d.y); ctx.stroke(); ctx.setLineDash([]);
      if (d.unit) { ctx.save(); ctx.translate(-cam, 0); this.drawTargetArc(ctx, d.h, d.unit, t); ctx.restore(); }
    }
    const cd = this.cmdDrag;
    if (cd) {
      ctx.fillStyle = 'rgba(30,60,90,0.22)'; ctx.fillRect(0, 0, 960, 540);
      ctx.strokeStyle = !cd.over ? 'rgba(255,255,255,0.5)' : cd.h.actLock > 0 ? 'rgba(255,180,90,0.95)' : 'rgba(200,240,255,0.95)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.setLineDash([2, 10]);
      ctx.save(); ctx.translate(-cam, 0);
      ctx.beginPath(); ctx.moveTo(cd.h.x, cd.h.y - 20); ctx.lineTo(cd.unit ? cd.unit.x : cd.fx, cd.unit ? cd.unit.y - 20 : cd.fy); ctx.stroke(); ctx.setLineDash([]);
      if (cd.over && cd.unit) this.drawTargetArc(ctx, cd.h, cd.unit, t);
      else if (cd.over) this.drawMoveMark(ctx, cd.fx, cd.fy, t, 1);
      ctx.restore();
    }
    ctx.save(); ctx.translate(-cam, 0);
    for (const h of sim.heroes) if (h.alive && h.cmd && h.cmd.type === 'move' && Math.hypot(h.x - h.cmd.x, h.y - h.cmd.y) > 6) this.drawMoveMark(ctx, h.cmd.x, h.cmd.y, t, 0.6);
    ctx.restore();
    if (this.potionPick) { ctx.fillStyle = 'rgba(20,40,30,0.25)'; ctx.fillRect(0, 0, 960, 540); }
    this.drawBanner(ctx);
    if (this.tacPause) { // 전술 정지 표시
      ctx.fillStyle = 'rgba(20,40,70,0.22)'; ctx.fillRect(0, 0, 960, 540);
      ctx.strokeStyle = 'rgba(140,200,255,0.8)'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, 956, 536);
      ctx.textAlign = 'center'; ctx.font = '900 18px sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      const tx = '전술 정지 — 스킬·이동·집중 공격을 명령하고 ▶ 재개';
      ctx.strokeText(tx, 400, 172); ctx.fillStyle = '#cfe8ff'; ctx.fillText(tx, 400, 172);
    }
    this.drawCutin(ctx);
  },

  // 전멸기 시전 막대: 이름 · 대응 방법 · 남은 시간 (+ 껍질 / 남은 꽃봉오리)
  drawWipe(ctx, t) {
    const b = this.sim.enemies.find((e) => e.alive && e.wipe);
    if (!b) return;
    const w = b.wipe, k = Math.max(0, w.t / w.total), x = 260, y = 176, W = 440;
    ctx.fillStyle = `rgba(60,0,0,${0.75 + Math.sin(t * 10) * 0.1})`; ctx.fillRect(x - 6, y - 26, W + 12, 52);
    ctx.fillStyle = '#3a1010'; ctx.fillRect(x, y + 6, W, 12);
    ctx.fillStyle = k < 0.3 ? '#ff3a2a' : '#ff8a3a'; ctx.fillRect(x, y + 6, W * k, 12);
    ctx.textAlign = 'center'; ctx.font = '900 18px sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = '#1a0606';
    const title = `⚠ ${w.name} ${Math.max(0, w.t).toFixed(1)}초 — ${w.hint}`;
    ctx.strokeText(title, 480, y - 4); ctx.fillStyle = '#ffe0c8'; ctx.fillText(title, 480, y - 4);
    ctx.font = '800 12px sans-serif'; ctx.fillStyle = '#ffd0b0';
    if (w.type === 'shield' && b.wshieldMax) ctx.fillText(`껍질 ${Math.ceil(b.wshield)} / ${b.wshieldMax}`, 480, y + 34);
    if (w.type === 'buds') ctx.fillText(`남은 꽃봉오리 ${(w.buds || []).filter((x) => x.alive).length} (하나당 최대 HP ${Math.round(b.kit.wipe.per * 100)}% 피해)`, 480, y + 34);
    if (w.type === 'break') ctx.fillText(`그로기 게이지 ${Math.round(b.poise / b.poiseMax * 100)}% 남음`, 480, y + 34);
  },

  floorEllipse(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); ctx.fill(); },

  // 화면 밖 유닛 표시 (넓은 전장): 가장자리 화살표, 차지 중이면 붉게 깜빡
  drawOffscreen(ctx, cam, t) {
    for (const u of this.sim.heroes.concat(this.sim.enemies)) {
      if (!u.alive || u.x > this.sim.W) continue;
      const sx = u.x - cam;
      if (sx > 10 && sx < 950) continue;
      const left = sx <= 10, x = left ? 14 : 946, y = u.y - 40;
      const hot = u.charge || u.call;
      ctx.fillStyle = u.side === 'hero' ? 'rgba(140,220,255,0.9)' : hot && Math.floor(t * 8) % 2 ? 'rgba(255,80,60,1)' : 'rgba(255,170,140,0.85)';
      ctx.beginPath(); ctx.moveTo(x + (left ? -8 : 8), y); ctx.lineTo(x + (left ? 6 : -6), y - 9); ctx.lineTo(x + (left ? 6 : -6), y + 9); ctx.closePath(); ctx.fill();
      if (u.size > 1) { ctx.font = '700 11px sans-serif'; ctx.textAlign = left ? 'left' : 'right'; ctx.fillText(u.name, x + (left ? 10 : -10), y + 22); }
    }
  },

  floorEllipse(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2); ctx.fill(); },

  drawBackground(ctx, camX, t) {
    const W = 960, F = CONST;
    ctx.fillStyle = '#231c33'; ctx.fillRect(0, 0, W, 540);
    const ox1 = camX * 0.3;
    for (let row = 0; row < 9; row++) {
      const y = 40 + row * 34, off = (row % 2) * 44;
      for (let x = -100 + off + ox1; x < W + 100; x += 88) { ctx.fillStyle = row % 3 === 0 ? '#2e2642' : '#2b2340'; ctx.fillRect(Math.round(x), y, 84, 30); ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(Math.round(x), y, 84, 3); }
    }
    for (const tx0 of [110, 470, 850]) {
      const tx = tx0 + ox1;
      const fl = 0.88 + Math.sin(t * 9 + tx0) * 0.07 + Math.sin(t * 21 + tx0 * 2) * 0.05;
      const g = ctx.createRadialGradient(tx, 150, 6, tx, 150, 150 * fl);
      g.addColorStop(0, 'rgba(255,170,80,0.42)'); g.addColorStop(0.5, 'rgba(255,140,60,0.12)'); g.addColorStop(1, 'rgba(255,140,60,0)');
      ctx.fillStyle = g; ctx.fillRect(tx - 170, 0, 340, 340);
      ctx.fillStyle = '#5e3a20'; ctx.fillRect(tx - 3, 150, 6, 26);
      const fh = 12 + Math.sin(t * 14 + tx0) * 3;
      ctx.fillStyle = '#ff9a2a'; ctx.fillRect(tx - 4, 148 - fh, 8, fh); ctx.fillStyle = '#ffe066'; ctx.fillRect(tx - 2, 148 - fh * 0.6, 4, fh * 0.6);
    }
    const ox2 = camX * 0.6;
    for (const px0 of [290, 690]) {
      const px = px0 + ox2;
      ctx.fillStyle = '#3a3152'; ctx.fillRect(px - 16, 70, 32, 220); ctx.fillStyle = '#463c62'; ctx.fillRect(px - 16, 70, 8, 220);
      ctx.fillStyle = '#4c4268'; ctx.fillRect(px - 22, 62, 44, 12); ctx.fillRect(px - 22, 282, 44, 14);
    }
    // 바닥 (자유 이동 영역)
    const top = F.FIELD_Y0 - 30;
    const g2 = ctx.createLinearGradient(0, top, 0, 540);
    g2.addColorStop(0, '#3b3150'); g2.addColorStop(1, '#221b30');
    ctx.fillStyle = g2; ctx.fillRect(0, top, W, 540 - top);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 2;
    for (let x = -300; x < W + 300; x += 80) { ctx.beginPath(); ctx.moveTo(x + camX, top); ctx.lineTo(x * 1.35 - 160 + camX * 1.3, 540); ctx.stroke(); }
    for (const y of [top + 30, top + 75, top + 130, top + 200]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, top, W, 3);
    for (const dd of this.dust) {
      const x = (dd.x + t * 8 * dd.s + camX * 0.8) % 980 - 10, y = dd.y + Math.sin(t * dd.s + dd.p) * 10;
      ctx.fillStyle = `rgba(255,230,190,${0.15 + 0.15 * Math.sin(t * 2 + dd.p)})`; ctx.fillRect(x, y, 2, 2);
    }
  },

  drawUnit(ctx, u, t, highlight) {
    if (u.statuses && u.statuses.stealth && !u._ghost) { ctx.save(); ctx.globalAlpha = 0.38 + Math.sin(t * 4) * 0.06; this.drawUnit(ctx, Object.assign({}, u, { _ghost: true }), t, highlight); ctx.restore(); return; } // 은신: 반투명
    if (u.vanished) { ctx.save(); ctx.globalAlpha = 0.18 + Math.sin(t * 5) * 0.08; this.drawUnit(ctx, Object.assign({}, u, { vanished: false }), t, false); ctx.restore(); return; }
    const enemy = u.side === 'enemy';
    const sc = this.unitScale(u);
    let x = u.x, y = u.y;
    if (u.anim.lunge > 0) { const k = clamp(Math.sin((1 - u.anim.lunge / 0.25) * Math.PI), 0, 1); x += u.anim.lungeX * k; y += (u.anim.lungeY || 0) * k * 0.5; }
    if (u.anim.hurt > 0) x += -u.face * u.anim.hurt * 30;
    const s = getSprite(u.sprite);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    this.floorEllipse(ctx, x, u.y + 2, s.w * sc * 0.36, 7 * (enemy ? u.size : 1));
    if (highlight) { ctx.strokeStyle = '#ffd34a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, u.y + 2, s.w * sc * 0.42 + Math.sin(t * 8) * 2, 10, 0, 0, Math.PI * 2); ctx.stroke(); }
    if (this.potionPick && !enemy) { ctx.strokeStyle = '#9cf0a8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, u.y + 2, s.w * sc * 0.42, 10, 0, 0, Math.PI * 2); ctx.stroke(); }
    const blinking = ((t + u.uid * 1.37) % 3.6) < 0.13;
    let tint = null, tintAlpha = 0;
    if (u.anim.hurt > 0.08) tint = 'white';
    if (u.charge && Math.floor(t * (6 + (1 - u.charge.t / u.charge.total) * 14)) % 2 === 0) tint = 'white';
    if (!tint && u.statuses.enrage) { tint = 'red'; tintAlpha = 0.25 + Math.sin(t * 8) * 0.1; }
    const squash = u.anim.cast > 0 ? 1 + Math.sin((u.anim.cast / (u.anim.castMax || 0.3)) * Math.PI) * 0.06 : (u.anim.hurt > 0 ? 0.94 : 1);
    const walk = u.moving ? Math.abs(Math.sin(t * 12 + u.uid)) * 3 : 0;
    const so = { scale: sc, flip: u.face < 0, t: t * (u.statuses.stun ? 0.2 : 1), phase: u.uid, blinking, squash, anim: u.casting || (u.anim.cast > 0 && u.anim.castMax > 0.2) ? 'cast' : u.anim.lunge > 0 || u.anim.cast > 0 ? 'attack' : u.anim.hurt > 0.05 ? 'hurt' : u.moving ? 'walk' : 'idle',
      animK: u.casting ? 1 - u.casting.t / u.casting.total : u.anim.cast > 0 ? 1 - u.anim.cast / (u.anim.castMax || 0.3) : u.anim.lunge > 0 ? 1 - u.anim.lunge / 0.22 : u.anim.hurt > 0.05 ? 1 - u.anim.hurt / 0.18 : 0 };
    if (tint === 'white') { // 피격/차지 섬광: 원래 그림 위에 반투명 흰색
      drawSprite(ctx, u.sprite, x, y - walk, so);
      drawSprite(ctx, u.sprite, x, y - walk, Object.assign({}, so, { tint: 'white', alpha: u.charge ? 0.7 : 0.5 }));
    } else drawSprite(ctx, u.sprite, x, y - walk, Object.assign(so, { tint, tintAlpha }));
    if (u.moving && Math.random() < 0.08) this.fx.push({ type: 'dust', x: u.x - u.face * 8, y: u.y, vx: -u.face * 20, vy: -20, t: 0, dur: 0.4 });
    const top = y - s.h * sc;
    if (u.statuses.stun) for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; ctx.fillStyle = '#ffd34a'; ctx.fillRect(x + Math.cos(a) * 16 - 2, top - 4 + Math.sin(a) * 4, 5, 5); }
    const bw = enemy ? 34 + u.size * 10 : 34;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - bw / 2 - 1, top - 10, bw + 2, 6);
    ctx.fillStyle = enemy ? '#e0524a' : '#6fd86a'; ctx.fillRect(x - bw / 2, top - 9, bw * (u.hp / u.maxHp), 4);
    if (u.poiseMax) {
      const pf = u.broken > 0 ? u.broken / CONST.BREAK_DUR : u.poise / u.poiseMax;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - bw / 2 - 1, top - 4, bw + 2, 5);
      ctx.fillStyle = u.broken > 0 ? '#ffd34a' : u.shaken > 0 ? '#ffb050' : '#5aa8ff'; ctx.fillRect(x - bw / 2, top - 3, bw * pf, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; for (let i = 1; i < 5; i++) ctx.fillRect(x - bw / 2 + bw * i / 5 - 0.5, top - 4, 1, 5); // 5칸 눈금
      if (u.charge || u.call) { // 끊기 칸: 빈 원 → 채워진 원
        const res = u.def.interruptResist || (u.size > 1 ? CONST.INTERRUPT_RESIST : CONST.INTERRUPT_RESIST_SMALL);
        const got = u.intr ? Math.min(res, u.intr.pts) : 0;
        const cy = top - 24, w = res * 18 + 8;
        ctx.fillStyle = 'rgba(10,16,30,0.75)'; ctx.beginPath(); ctx.roundRect(x - w / 2, cy - 10, w, 20, 10); ctx.fill();
        for (let i = 0; i < res; i++) {
          const cx = x + (i - (res - 1) / 2) * 18;
          ctx.beginPath(); ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
          ctx.fillStyle = i < got ? '#9fd0ff' : 'rgba(40,60,90,0.9)'; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = i < got ? '#ffffff' : '#9fd0ff'; ctx.stroke();
        }
      }
    }
    if (u.casting) { // 긴 시전 (이동 불가)
      const pf = 1 - u.casting.t / u.casting.total;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 30, top - 26, 60, 7);
      ctx.fillStyle = '#ffd34a'; ctx.fillRect(x - 29, top - 25, 58 * pf, 5);
      ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#1a0f08';
      ctx.strokeText(u.casting.name, x, top - 30); ctx.fillStyle = '#fff6c0'; ctx.fillText(u.casting.name, x, top - 30);
    }
    if (u.broken > 0) {
      for (let i = 0; i < 4; i++) { const a = t * 4 + i * 1.57; ctx.fillStyle = i % 2 ? '#ffd34a' : '#fff6c0'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('★', x + Math.cos(a) * 22, top - 18 + Math.sin(a) * 5); }
      ctx.font = '900 14px sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = '#1a0f08'; ctx.strokeText('그로기', x, top - 30); ctx.fillStyle = '#ffd34a'; ctx.fillText('그로기', x, top - 30);
    }
    const cast = u.charge || u.call;
    if (cast) {
      const prog = 1 - cast.t / cast.total;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 22, top - 20, 44, 7);
      ctx.fillStyle = u.charge ? '#ff5a3a' : '#ffb04a'; ctx.fillRect(x - 21, top - 19, 42 * prog, 5);
      ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#3a0000'; ctx.fillText('!', x + 1, top - 25); ctx.fillStyle = Math.floor(t * 8) % 2 ? '#ff5a3a' : '#ffd34a'; ctx.fillText('!', x, top - 26);
    }
    if (!enemy && u.statuses.guard) { ctx.strokeStyle = 'rgba(122,184,240,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - s.h * sc * 0.5, s.h * sc * 0.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    if (!enemy && u.statuses.regen && Math.random() < 0.15) this.sparkle(x, y - 20, '#9cf0a8', 1);
  },

  drawTargetArc(ctx, from, to, t) {
    const x0 = from.x, y0 = this.unitTop(from) + 10, x1 = to.x, y1 = this.unitTop(to) - 4;
    ctx.strokeStyle = '#ffd34a'; ctx.lineWidth = 3; ctx.setLineDash([8, 7]); ctx.lineDashOffset = -t * 40;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 70, x1, y1); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.moveTo(x1, y1 + 2); ctx.lineTo(x1 - 7, y1 - 10); ctx.lineTo(x1 + 7, y1 - 10); ctx.fill();
  },

  drawFx(ctx) {
    for (const f of this.fx) {
      if (f.t < 0) continue;
      const k = f.t / f.dur;
      switch (f.type) {
        case 'spark': ctx.fillStyle = f.color; ctx.globalAlpha = 1 - k; ctx.fillRect(f.x - 2, f.y - 2, 4, 4); ctx.globalAlpha = 1; break;
        case 'sparkle': ctx.fillStyle = f.color; ctx.globalAlpha = 1 - k; ctx.fillRect(f.x - 1, f.y - 4, 2, 8); ctx.fillRect(f.x - 4, f.y - 1, 8, 2); ctx.globalAlpha = 1; break;
        case 'smoke': ctx.fillStyle = `rgba(200,190,210,${0.55 * (1 - k)})`; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.6 + k), 0, Math.PI * 2); ctx.fill(); break;
        case 'dust': ctx.fillStyle = `rgba(160,130,110,${0.7 * (1 - k)})`; ctx.fillRect(f.x - 3, f.y - 3, 6, 6); break;
        case 'zone': ctx.strokeStyle = `rgba(${f.color},${1 - k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.4 + k * 0.6), f.r / CONST.Y_WEIGHT * (0.4 + k * 0.6), 0, 0, Math.PI * 2); ctx.stroke(); break;
        case 'proj': {
          if (!f.to) break;
          const x1 = f.to.x, y1 = f.to.y - 30 * (f.to.size || 1);
          const x = lerp(f.x0, x1, k), y = lerp(f.y0, y1, k) - Math.sin(k * Math.PI) * (f.kind === 'bori' ? 30 : 12);
          const ang = Math.atan2(y1 - f.y0, x1 - f.x0);
          if (f.kind === 'byeolbi' || f.kind === 'pierce' || f.kind === 'snipe') {
            ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
            ctx.strokeStyle = f.kind === 'snipe' ? '#ffd34a' : '#f3dcb4'; ctx.lineWidth = f.big ? 4 : 2;
            ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(4, 0); ctx.stroke(); ctx.fillStyle = '#c9d0d8'; ctx.fillRect(3, -2, 4, 4);
            if (f.big) { ctx.fillStyle = 'rgba(255,230,120,0.5)'; ctx.fillRect(-40, -1, 30, 2); }
            ctx.restore();
          } else if (f.kind === 'soldam' || f.kind === 'starbolt') {
            const r = f.big ? 7 : 4;
            ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,200,90,0.4)'; ctx.beginPath(); ctx.arc(x - Math.cos(ang) * 8, y - Math.sin(ang) * 8, r * 0.8, 0, Math.PI * 2); ctx.fill();
          } else { ctx.fillStyle = '#9fe0ff'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); }
          break;
        }
        case 'slash': {
          ctx.strokeStyle = f.color; ctx.lineWidth = 4 * (1 - k) + 1;
          const n = f.multi ? 6 : 1;
          for (let i = 0; i < n; i++) { const kk = f.multi ? clamp(k * n - i, 0, 1) : k; if (kk <= 0 || kk >= 1) continue; const a0 = -1.2 + i * 0.7, r = 34 + (i % 2) * 8; ctx.beginPath(); ctx.arc(f.x, f.y, r, a0, a0 + kk * 2.2); ctx.stroke(); }
          break;
        }
        case 'spin': ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(f.x, f.y - 24, f.r * (0.5 + k * 0.5), f.r / CONST.Y_WEIGHT * (0.5 + k * 0.5) + 6, 0, k * 8, k * 8 + 4.5); ctx.stroke(); break;
        case 'meteor': {
          const x = f.tx + (1 - k) * 120, y = lerp(-20, f.ty, k);
          ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(x, y, f.big ? 9 : 7, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,150,60,0.7)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 30, y - 40); ctx.stroke();
          if (k > 0.9) { ctx.fillStyle = 'rgba(255,200,90,0.6)'; this.floorEllipse(ctx, f.tx, f.ty, 26, 8); }
          break;
        }
        case 'arrowdrop': { const y = lerp(40, f.ty, k); ctx.strokeStyle = '#f3dcb4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.tx, y - 16); ctx.lineTo(f.tx, y); ctx.stroke(); ctx.fillStyle = '#c9d0d8'; ctx.fillRect(f.tx - 2, y, 4, 4); break; }
        case 'shield': { const u = f.unit; const s = getSprite(u.sprite); ctx.strokeStyle = `rgba(122,184,240,${1 - k})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(u.x, u.y - s.h * 1.5, s.h * 1.8 * (0.8 + k * 0.3), Math.PI, 0); ctx.stroke(); break; }
        case 'tree': {
          const h = Math.min(1, k * 2) * 140;
          ctx.globalAlpha = k < 0.8 ? 0.85 : (1 - k) * 4;
          ctx.fillStyle = '#6e4724'; ctx.fillRect(f.x - 8, f.y - h, 16, h);
          ctx.fillStyle = '#64b84e';
          for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(f.x + Math.cos(i) * 40 * (h / 140), f.y - h + Math.sin(i * 2) * 18, 26 * (h / 140), 0, Math.PI * 2); ctx.fill(); }
          ctx.globalAlpha = 1; break;
        }
        default: break;
      }
    }
  },

  statusIcons(u) {
    let s = '';
    for (const k in u.statuses) {
      const st = STATUS[k];
      if (!st) continue;
      const t = u.statuses[k].t;
      const n = u.statuses[k].n; // 스택형(짓누름)은 남은 시간 대신 겹 수
      s += `<span class="sti" style="background:${st.color}">${st.short}${n ? `<i>${n}</i>` : isFinite(t) ? `<i>${Math.ceil(t)}</i>` : ''}</span>`;
    }
    return s;
  },


  drawPopups(ctx) {
    ctx.textAlign = 'center';
    for (const p of this.popups) {
      const k = p.t / p.dur;
      const sc = p.crit ? (k < 0.15 ? 0.6 + k / 0.15 * 0.8 : 1.4 - Math.min(0.4, (k - 0.15) * 2)) : (k < 0.1 ? 0.7 + k * 3 : 1);
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.font = `900 ${Math.round(p.size * sc)}px "Trebuchet MS", sans-serif`;
      ctx.lineWidth = 4; ctx.strokeStyle = '#1a0f08';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  },

  drawBanner(ctx) {
    const b = this.banner;
    if (!b) return;
    const k = b.t / b.dur;
    const a = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
    ctx.globalAlpha = a;
    ctx.fillStyle = b.danger ? 'rgba(90,10,10,0.75)' : 'rgba(20,14,30,0.7)';
    ctx.fillRect(0, 196, 960, 74);
    ctx.fillStyle = b.danger ? '#ff8a6a' : '#ffd34a';
    ctx.fillRect(0, 196, 960, 2); ctx.fillRect(0, 268, 960, 2);
    ctx.textAlign = 'center';
    ctx.font = '900 32px sans-serif';
    ctx.lineWidth = 5; ctx.strokeStyle = '#1a0f08';
    const dx = (1 - easeOutCubic(Math.min(1, k * 5))) * 80;
    ctx.strokeText(b.text, 480 + dx, 240); ctx.fillStyle = '#fff6e6'; ctx.fillText(b.text, 480 + dx, 240);
    if (b.sub) { ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#e0d0f0'; ctx.fillText(b.sub, 480 + dx, 262); }
    ctx.globalAlpha = 1;
  },

  drawCutin(ctx) {
    const c = this.cutin;
    if (!c) return;
    const k = c.t / c.dur;
    const slide = k < 0.2 ? easeOutBack(k / 0.2) : k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
    ctx.save();
    ctx.globalAlpha = Math.min(1, slide * 1.2);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, 960, 540);
    ctx.translate(0, 270);
    ctx.rotate(-0.08);
    ctx.fillStyle = c.hero.def.accent; ctx.fillRect(-50, -70, 1100 * slide, 140);
    ctx.fillStyle = '#fff6e6'; ctx.fillRect(-50, -70, 1100 * slide, 6); ctx.fillRect(-50, 64, 1100 * slide, 6);
    for (let i = 0; i < 10; i++) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(((c.t * 1400 + i * 137) % 1100) - 50, -60 + (i * 31) % 120, 60, 2); }
    drawSprite(ctx, c.hero.sprite, 220 * slide - 20, 76, { scale: 7, t: c.t });
    ctx.textAlign = 'left'; ctx.font = '900 46px sans-serif';
    ctx.lineWidth = 6; ctx.strokeStyle = '#1a0f08';
    ctx.strokeText(c.name, 400 * slide + 40, 16); ctx.fillStyle = '#fff6e6'; ctx.fillText(c.name, 400 * slide + 40, 16);
    ctx.font = 'bold 18px sans-serif'; ctx.fillStyle = '#1a0f08'; ctx.fillText(`${c.hero.name}의 필살기`, 400 * slide + 44, 46);
    ctx.restore();
  },
};

// 스킬 아이콘 (인라인 SVG, fx 키 기준)
function skillGlyph(sk) {
  const P = {
    taunt: '<path d="M12 3c5 0 8 1 8 3 0 7-3 12-8 15C7 18 4 13 4 6c0-2 3-3 8-3z" fill="currentColor"/>',
    wall: '<path d="M12 2c5 0 8 1 8 3 0 7-3 12-8 15C7 17 4 12 4 5c0-2 3-3 8-3z" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M8 9h8M8 13h8" stroke="currentColor" stroke-width="2"/>',
    bash: '<path d="M5 19L16 8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="7" r="4.5" fill="currentColor"/>',
    slash: '<path d="M4 20L20 4M9 4c7 1 11 5 11 12" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
    spin: '<path d="M19 12a7 7 0 1 1-3-5.7" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M17 3l1 5-5 0z" fill="currentColor"/>',
    flurry: '<path d="M3 17L13 5M8 20L18 8M13 21L21 11" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    pierce: '<path d="M4 20L19 5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M20 4l-7 1 6 6z" fill="currentColor"/>',
    snipe: '<circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="2.2" fill="none"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="currentColor" stroke-width="2.2"/>',
    arrowrain: '<path d="M6 3v12M12 5v14M18 3v12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M3 14l3 5 3-5zM9 18l3 5 3-5zM15 14l3 5 3-5z" fill="currentColor"/>',
    starbolt: '<path d="M12 2l2.6 6.3L21 9l-5 4.4L17.5 20 12 16.6 6.5 20 8 13.4 3 9l6.4-.7z" fill="currentColor"/>',
    meteor: '<circle cx="9" cy="15" r="5" fill="currentColor"/><path d="M12 11l8-8M14 15l7-5M9 9l5-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    nova: '<circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5M4 4l3.5 3.5M16.5 16.5L20 20M4 20l3.5-3.5M16.5 7.5L20 4" stroke="currentColor" stroke-width="2"/>',
    heal: '<path d="M9.5 3h5v6.5H21v5h-6.5V21h-5v-6.5H3v-5h6.5z" fill="currentColor"/>',
    aoeheal: '<path d="M6 5h3v3h3v3H9v3H6v-3H3V8h3zM15 10h3v3h3v3h-3v3h-3v-3h-3v-3h3z" fill="currentColor"/>',
    tree: '<path d="M12 21V11" stroke="currentColor" stroke-width="2.4"/><path d="M12 2c5 3 6 9 0 12C6 11 7 5 12 2z" fill="currentColor"/>',
  };
  return '<svg viewBox="0 0 24 24" width="30" height="30">' + (P[sk.fx] || P.slash) + '</svg>';
}
