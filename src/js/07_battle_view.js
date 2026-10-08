// ===== 07_battle_view.js : 전투 장면 (렌더/연출/HUD/수동 타겟팅) =====
// BattleSim(로직)을 고정 타임스텝으로 돌리고, sim.events를 소비해 연출만 담당한다.

const BattleScene = {
  enter(params) {
    const run = Game.run;
    const node = params.node;
    this.node = node;
    this.run = run;
    const waves = encounterFor(node);
    const heroes = partyIds(run).filter((id) => !run.heroes[id].dead).map((id) => {
      const h = run.heroes[id];
      return { id, hp: h.hp, maxHp: h.maxHp, upgrades: h.upgrades };
    });
    this.sim = new BattleSim({
      seed: hashSeed(run.seed, 'battle', node.stage, node.row, node.type),
      stage: node.stage, waves, heroes,
      relics: run.relics, strategy: run.strategy, autoMode: run.autoMode, partySize: run.party.length,
      fruit: run.fruit && run.fruit.battles > 0 ? { bonus: run.fruit.bonus } : null,
      torchDark: run.torch <= 0,
    });
    this.acc = 0;
    this.t = 0;
    this.speed = Game.settings.speed || 1;
    this.paused = false;
    this.targeting = null;
    this.slowmo = 0;
    this.hitstop = 0;
    this.shake = 0;
    this.fx = [];
    this.popups = [];
    this.banner = null;
    this.cutin = null;
    this.endTimer = -1;
    this.finished = false;
    this.dust = [];
    for (let i = 0; i < 26; i++) this.dust.push({ x: Math.random() * 960, y: 60 + Math.random() * 300, s: 0.5 + Math.random() * 1.5, p: Math.random() * 6 });
    this.selHero = this.sim.aliveHeroes()[0];
    this.drag = null;
    this.buildHud();
    this.consumeEvents();
    this.banner = { text: node.type === 'boss' ? '보스: 오우거 대족장' : node.type === 'elite' ? '정예 전투!' : `전투 시작`, sub: `웨이브 1/${waves.length}`, t: 0, dur: 1.6 };
    Game.hint('battle');
  },

  exit() { this.targeting = null; },

  // ------------------------------------------------------------ HUD 구성 (DOM)
  buildHud() {
    const ui = Game.ui;
    const run = this.run;
    const top = el('div', 'b-top');
    this.stageLabel = el('div', 'b-stage', '');
    top.appendChild(this.stageLabel);
    this.pauseBtn = btn('<span class="pz">❚❚</span> 일시정지', 'b-pause', () => this.openPause(), { id: 'btn-pause', sfx: 'pause' });
    top.appendChild(this.pauseBtn);
    const right = el('div', 'b-right');
    this.potionBtn = btn(`🧪 ${run.potions}`, 'b-potion small', () => this.startPotion(), { id: 'btn-bpotion' });
    right.appendChild(this.potionBtn);
    this.speedBtn = btn(`${this.speed}x`, 'b-speed small', () => { this.speed = this.speed === 1 ? 2 : 1; Game.settings.speed = this.speed; Game.saveSettings(); this.speedBtn.innerHTML = `${this.speed}x`; this.speedBtn.classList.toggle('on', this.speed === 2); }, { id: 'btn-speed' });
    this.speedBtn.classList.toggle('on', this.speed === 2);
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
    this.chipsWrap.appendChild(el('div', 'chips-label', '타겟'));
    this.chipEls = {};
    ui.appendChild(this.chipsWrap);

    this.tmsg = el('div', 'b-tmsg hidden');
    ui.appendChild(this.tmsg);

    const hud = el('div', 'b-hud');
    const ports = el('div', 'b-ports');
    this.portEls = {};
    for (const h of this.sim.heroes) {
      const p = el('div', 'bport');
      p.dataset.hero = h.key;
      p.appendChild(portraitCanvas(h.sprite, 44));
      p.appendChild(el('div', 'bp-stat', ''));
      const hp = bar(1, 'hp'); p.appendChild(hp);
      const ult = bar(0, 'ult'); p.appendChild(ult);
      p.appendChild(el('div', 'bp-name', `${h.def.roleName}`));
      p.appendChild(el('div', 'bp-dead', '✕'));
      p.addEventListener('click', (e) => { e.stopPropagation(); this.onPortrait(h); });
      ports.appendChild(p);
      this.portEls[h.uid] = { root: p, hp, ult, stat: p.querySelector('.bp-stat'), last: '' };
    }
    hud.appendChild(ports);
    const skills = el('div', 'b-skills');
    this.skillName = el('div', 'bs-name', '');
    skills.appendChild(this.skillName);
    const row = el('div', 'bs-row');
    this.skillBtns = {};
    for (const slot of ['s1', 's2', 'ult']) {
      const b = el('button', 'sbtn sbtn-' + slot);
      b.type = 'button';
      b.id = 'btn-skill-' + slot;
      b.innerHTML = `<span class="sb-key">${slot === 'ult' ? '궁' : slot === 's1' ? '1' : '2'}</span><span class="sb-cd"></span><span class="sb-lab"></span>`;
      b.addEventListener('click', (e) => { e.stopPropagation(); this.onSkill(slot); });
      row.appendChild(b);
      this.skillBtns[slot] = b;
    }
    skills.appendChild(row);
    this.confirmRow = el('div', 'bs-confirm hidden');
    this.confirmRow.appendChild(btn('취소', 'ghost big', () => this.cancelTargeting(), { id: 'btn-t-cancel', sfx: 'back' }));
    this.confirmBtn = btn('확정', 'primary big', () => this.confirmTargeting(), { id: 'btn-t-confirm', sfx: 'skill' });
    this.confirmRow.appendChild(this.confirmBtn);
    skills.appendChild(this.confirmRow);
    this.skillHint = el('div', 'bs-hint', '스킬 → 타겟 선택');
    skills.appendChild(this.skillHint);
    hud.appendChild(skills);
    ui.appendChild(hud);
  },

  setAuto(on, silent) {
    this.run.autoMode = on;
    this.sim.autoMode = on;
    this.autoBtn.classList.toggle('on', on);
    this.manualBtn.classList.toggle('on', !on);
    if (!silent) Game.toast(on ? '자동 전투: 전략 규칙대로 스킬 사용' : '수동 전투: 스킬을 직접 사용', 1400);
  },

  // ------------------------------------------------------------ 입력
  onPortrait(h) {
    const tg = this.targeting;
    if (tg && tg.kind === 'potion') {
      if (!h.alive) return;
      this.run.potions--;
      this.sim._heal(null, h, h.maxHp * REWARD.potionHealPct);
      Sfx.play('heal');
      this.endTargeting(true);
      return;
    }
    if (tg && (tg.kind === 'ally')) { if (h.alive) { tg.sel = h; Sfx.play('click'); } return; }
    if (tg && tg.kind === 'area_ally') { if (h.alive) { tg.x = this.sim.clampAreaX(tg.hero, tg.sk, h.x); Sfx.play('click'); } return; }
    if (tg) return;
    if (!h.alive) return;
    this.selHero = h;
    Sfx.play('click');
  },

  onChip(u) {
    const tg = this.targeting;
    if (!tg) { // 타겟팅 중이 아닐 때 칩 탭 → 선택 영웅 스킬1이 단일 대상이면 바로 그 대상으로 타겟팅 시작
      return;
    }
    if (tg.kind === 'enemy' && u.alive) { tg.sel = u; Sfx.play('click'); }
    if (tg.kind === 'area_enemy' && u.alive) { tg.x = this.sim.clampAreaX(tg.hero, tg.sk, u.x); Sfx.play('click'); }
  },

  onSkill(slot) {
    Sfx.init(); Sfx.resume();
    if (this.sim.outcome) return;
    const h = this.selHero;
    if (!h || !h.alive) return;
    if (this.targeting) {
      if (this.targeting.hero === h && this.targeting.slot === slot) { this.cancelTargeting(); return; }
      this.cancelTargeting();
    }
    if (!this.sim.canCast(h, slot)) {
      Sfx.play('back');
      if (h.statuses.stun) Game.toast('기절 상태!', 900);
      else if (slot === 'ult') Game.toast(`궁극기 게이지 ${Math.floor(h.ult)}%`, 900);
      else Game.toast(`쿨타임 ${h.cds[slot].toFixed(1)}초`, 900);
      return;
    }
    const sk = this.sim.skillDef(h, slot);
    Sfx.play('click');
    if (sk.target === 'self' || sk.target === 'party' || sk.target === 'all_enemies') {
      this.sim.cast(h, slot, {});
      this.slowmo = CONST.CONFIRM_SLOWMO_SEC;
      return;
    }
    const st = this.run.strategy[h.key] || AI_PRESETS[h.key];
    const defRule = sk.target === 'ally' || sk.target === 'area_ally' ? 'lowestAlly' : (this.sim.aliveEnemies().some((e) => e.charge) && slot !== 'ult' && h.role === 'tank' ? 'charging' : 'nearest');
    const spec = this.sim.resolveTarget(h, sk, defRule) || {};
    this.targeting = { hero: h, slot, sk, kind: sk.target, sel: spec.unit || null, x: spec.x !== undefined ? spec.x : null };
    if (sk.target === 'ally' && !this.targeting.sel) this.targeting.sel = h;
    if (sk.target === 'area_ally' && this.targeting.x === null) this.targeting.x = h.x;
    this.showTargetingUi();
  },

  startPotion() {
    if (this.sim.outcome) return;
    if (this.run.potions <= 0) { Game.toast('회복약이 없어요.', 900); return; }
    if (this.targeting) this.cancelTargeting();
    this.targeting = { kind: 'potion' };
    this.showTargetingUi();
  },

  showTargetingUi() {
    const tg = this.targeting;
    const msgs = {
      enemy: '적 칩(또는 적)을 탭 → [확정]',
      ally: '아군 초상화를 탭 → [확정]',
      area_enemy: '바닥 범위를 드래그해서 이동 → [확정]',
      area_ally: '아군 쪽 범위를 드래그 → [확정]',
      potion: '회복약: 아군 초상화를 탭 (취소 가능)',
    };
    const name = tg.sk ? `<b>${tg.hero.name} · ${tg.sk.name}</b> ` : '';
    this.tmsg.innerHTML = `<span class="tm-pause">⏸ 전술 정지</span> ${name}${msgs[tg.kind]}`;
    this.tmsg.classList.remove('hidden');
    this.confirmRow.classList.remove('hidden');
    this.confirmBtn.style.display = tg.kind === 'potion' ? 'none' : '';
    Game.ui.classList.add('targeting', 't-' + tg.kind);
  },

  confirmTargeting() {
    const tg = this.targeting;
    if (!tg || tg.kind === 'potion') return;
    let spec = {};
    if (tg.kind === 'enemy' || tg.kind === 'ally') {
      if (!tg.sel || !tg.sel.alive) { Game.toast('대상을 먼저 선택하세요.', 1000); return; }
      spec = { unit: tg.sel };
    } else spec = { x: tg.x };
    const ok = this.sim.cast(tg.hero, tg.slot, spec);
    this.endTargeting(ok);
  },

  cancelTargeting() { this.endTargeting(false); },

  endTargeting(didCast) {
    this.targeting = null;
    this.drag = null;
    this.tmsg.classList.add('hidden');
    this.confirmRow.classList.add('hidden');
    Game.ui.classList.remove('targeting', 't-enemy', 't-ally', 't-area_enemy', 't-area_ally', 't-potion');
    if (didCast) this.slowmo = CONST.CONFIRM_SLOWMO_SEC;
  },

  unitAt(p) {
    const all = this.sim.enemies.concat(this.sim.heroes).filter((u) => u.alive);
    let best = null, bd = 1e9;
    for (const u of all) {
      const s = getSprite(u.sprite);
      const sc = this.unitScale(u);
      const w = s.w * sc, h = s.h * sc;
      const uy = this.unitY(u);
      if (p.x >= u.x - w / 2 && p.x <= u.x + w / 2 && p.y >= uy - h && p.y <= uy + 6) {
        const d = Math.abs(p.x - u.x);
        if (d < bd) { bd = d; best = u; }
      }
    }
    return best;
  },

  pointerDown(p) {
    const tg = this.targeting;
    if (!tg) {
      const u = this.unitAt(p); // 보조 수단: 스프라이트 탭으로 영웅 선택
      if (u && u.side === 'hero') this.onPortrait(u);
      return;
    }
    if (tg.kind === 'area_enemy' || tg.kind === 'area_ally') {
      if (p.y < 140) return;
      this.drag = { startX: p.x, startY: p.y, moved: false };
      tg.x = this.sim.clampAreaX(tg.hero, tg.sk, p.x);
      return;
    }
    const u = this.unitAt(p);
    if (tg.kind === 'enemy' && u && u.side === 'enemy') { tg.sel = u; Sfx.play('click'); return; }
    if ((tg.kind === 'ally' || tg.kind === 'potion') && u && u.side === 'hero') { this.onPortrait(u); return; }
    // 빈 곳 탭 → 취소
    Sfx.play('back');
    this.cancelTargeting();
  },
  pointerMove(p) {
    const tg = this.targeting;
    if (!tg || !this.drag) return;
    if (Math.abs(p.x - this.drag.startX) > 4) this.drag.moved = true;
    tg.x = this.sim.clampAreaX(tg.hero, tg.sk, p.x);
  },
  pointerUp() { this.drag = null; },

  openPause() {
    if (this.sim.outcome) return;
    this.paused = true;
    const box = el('div', 'pause-box');
    box.appendChild(el('div', 'modal-title', '일시정지'));
    const st = el('div', 'pause-stats');
    st.innerHTML = this.sim.heroes.map((h) => `<div><b>${h.name}</b> 피해 ${Math.round(h.stats.dealt)} · 회복 ${Math.round(h.stats.healed)}</div>`).join('');
    box.appendChild(st);
    const row = el('div', 'btn-col');
    row.appendChild(btn('▶ 계속하기', 'primary', () => { Game.closeModal(); this.paused = false; }, { id: 'pause-resume' }));
    row.appendChild(btn('⚙ 자동 전략 편집', '', () => openStrategyEditor(this.run, () => { this.sim.strategy = this.run.strategy; this.openPause(); }), { id: 'pause-strategy' }));
    row.appendChild(btn(`효과음: ${Game.settings.sound ? '켬' : '끔'}`, '', (e) => { Game.settings.sound = !Game.settings.sound; Sfx.enabled = Game.settings.sound; Game.saveSettings(); e.target.innerHTML = `효과음: ${Game.settings.sound ? '켬' : '끔'}`; }, { id: 'pause-sound' }));
    row.appendChild(btn('원정 포기', 'danger', () => this.confirmGiveUp(), { id: 'pause-giveup' }));
    box.appendChild(row);
    Game.modal(box, { dim: true });
  },

  confirmGiveUp() {
    const box = el('div', 'confirm-box');
    box.appendChild(el('div', 'modal-title', '정말 포기할까요?'));
    box.appendChild(el('p', '', '이번 원정은 패배로 기록됩니다.'));
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
    if (this.paused || Game.modalOpen || (this.targeting)) scale = 0;
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
    this.shake = Math.max(0, this.shake - dtReal * 30);
    this.updateFx(dtReal * (scale > 0 ? Math.min(scale, 2) : 0.15));
    if (this.banner) { this.banner.t += dtReal; if (this.banner.t > this.banner.dur) this.banner = null; }
    if (this.endTimer > 0) { this.endTimer -= dtReal; if (this.endTimer <= 0) this.finish(this.sim.outcome); }
    // 선택 영웅 사망 시 다음 영웅
    if (!this.selHero || !this.selHero.alive) this.selHero = this.sim.aliveHeroes()[0] || null;
    if (this.targeting && this.targeting.hero && (!this.targeting.hero.alive)) this.cancelTargeting();
    if (this.targeting && this.targeting.sel && !this.targeting.sel.alive) this.targeting.sel = null;
    this.updateHud();
  },

  consumeEvents() {
    const ev = this.sim.events;
    if (!ev.length) return;
    for (const e of ev) this.onEvent(e);
    ev.length = 0;
  },

  unitY(u) {
    if (u.side === 'hero') return CONST.BATTLE_GROUND_Y;
    const idx = this.sim.enemies.indexOf(u);
    return CONST.BATTLE_GROUND_Y + (idx % 2 ? 10 : 0) - (u.size > 1.5 ? 0 : 0);
  },
  unitScale(u) { return u.def.abilities && u.def.abilities.includes('boss') ? CONST.SPRITE_SCALE * 1.15 : CONST.SPRITE_SCALE; },
  unitTop(u) {
    const s = getSprite(u.sprite);
    const sc = this.unitScale(u);
    return this.unitY(u) - s.h * sc;
  },

  popup(x, y, text, color, size, opts) {
    if (opts && opts.label) { // 스킬 이름은 겹치지 않게 위로 쌓는다
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
        if (e.dot) this.popup(u.x, y + 10, String(e.amount), STATUS[e.dot].color, 15, { dur: 0.7 });
        else if (e.crit) { this.popup(u.x, y - 6, e.amount + '!', '#ffd34a', 30, { crit: true }); Sfx.play('crit'); this.hitstop = Math.max(this.hitstop, CONST.HITSTOP_MS / 1000 * 1.4); this.shake = Math.max(this.shake, 4); }
        else { this.popup(u.x, y, String(e.amount), u.side === 'hero' ? '#ff8a7a' : '#ffffff', e.skill ? 24 : 19); Sfx.play('hit'); if (e.skill) this.hitstop = Math.max(this.hitstop, CONST.HITSTOP_MS / 1000); this.shake = Math.max(this.shake, e.skill ? 3 : 1.5); }
        if (!e.dot) this.spark(u.x - (u.side === 'enemy' ? 10 : -10), this.unitY(u) - 30 * (u.size || 1), e.crit ? 14 : 7, e.crit ? '#ffe066' : '#fff6c0');
        break;
      }
      case 'heal':
        if (!e.quiet || e.amount >= 8) this.popup(e.target.x, this.unitTop(e.target) + 4, '+' + e.amount, '#6fe08a', e.quiet ? 15 : 22);
        if (!e.quiet) { Sfx.play('heal'); this.sparkle(e.target.x, this.unitY(e.target) - 30, '#9cf0a8', 10); }
        break;
      case 'death': {
        const u = e.target || e.unit;
        this.smoke(u.x, this.unitY(u) - 20, u.size || 1);
        Sfx.play('death');
        if (u.side === 'hero') {
          Game.toast(`💀 ${u.name} 쓰러짐 — 이번 원정에서 복귀 불가`, 2400);
          run.stats.deathsAt[u.key] = `${this.node.stage}스테이지`;
          this.shake = 6;
        }
        break;
      }
      case 'attack': break;
      case 'projectile': {
        const kind = e.kind;
        this.fx.push({ type: 'proj', kind, x0: e.from.x + 14, y0: this.unitY(e.from) - 34, to: e.to, t: 0, dur: e.travel });
        Sfx.play(kind === 'soldam' ? 'magic' : 'shoot');
        break;
      }
      case 'cast': this.castFx(e); break;
      case 'ult':
        this.cutin = { hero: e.unit, name: e.skill.name, t: 0, dur: 0.85 };
        Sfx.play('ult');
        break;
      case 'ultReady':
        this.popup(e.unit.x, this.unitTop(e.unit) - 8, '궁극기 준비!', '#ffd34a', 15);
        break;
      case 'status':
        if (e.status === 'stun') this.popup(e.target.x, this.unitTop(e.target) - 4, '기절!', STATUS.stun.color, 18);
        else if (e.status === 'taunt' && e.target.side === 'enemy') { /* 대량 표시는 생략 */ }
        else if (['bleed', 'burn', 'vuln'].includes(e.status)) this.popup(e.target.x, this.unitTop(e.target) - 2, STATUS[e.status].name, STATUS[e.status].color, 14, { dur: 0.7 });
        break;
      case 'chargeStart':
        Sfx.play('charge');
        this.popup(e.unit.x, this.unitTop(e.unit) - 10, '차지!', '#ff5a4a', 24);
        if (!Game.settings.seenHints.charge) Game.hint('charge');
        break;
      case 'chargeImpact':
        Sfx.play('boom');
        this.shake = 12;
        this.hitstop = 0.12;
        for (let i = 0; i < 18; i++) this.fx.push({ type: 'dust', x: lerp(e.x0, e.x1, Math.random()), y: CONST.BATTLE_GROUND_Y, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 90, t: 0, dur: 0.7 + Math.random() * 0.4 });
        this.fx.push({ type: 'flash', t: 0, dur: 0.25, color: 'rgba(255,90,60,' });
        if (e.blocked) this.popup((e.x0 + e.x1) / 2, CONST.BATTLE_GROUND_Y - 120, '토비가 막았다!', '#7ab8f0', 20);
        break;
      case 'chargeCancel':
        Sfx.play('cancel');
        this.popup(e.unit.x, this.unitTop(e.unit) - 14, '캔슬!', '#ffd34a', 30, { crit: true });
        this.hitstop = 0.1;
        break;
      case 'callStart':
        this.popup(e.unit.x, this.unitTop(e.unit) - 10, '동료 호출!', '#ffb04a', 18);
        Sfx.play('summon');
        break;
      case 'callCancel':
        this.popup(e.unit.x, this.unitTop(e.unit) - 10, '호출 저지!', '#ffd34a', 20);
        Sfx.play('cancel');
        break;
      case 'summon':
        this.smoke(e.unit.x, CONST.BATTLE_GROUND_Y - 20, 0.8);
        break;
      case 'enrage':
        this.popup(e.unit.x, this.unitTop(e.unit) - 10, '광폭화!', '#ff4a3a', 22);
        break;
      case 'warcry':
        this.popup(e.unit.x, this.unitTop(e.unit) - 10, '함성! (적 공격력↑)', '#ffb04a', 18);
        this.shake = 4;
        break;
      case 'phase':
        this.banner = { text: e.name, sub: '오우거 대족장이 분노한다!', t: 0, dur: 2.0, danger: true };
        Sfx.play('phase');
        this.shake = 10;
        break;
      case 'wave':
        if (e.index > 0) this.banner = { text: `웨이브 ${e.index + 1}/${e.total}`, sub: '적이 몰려온다!', t: 0, dur: 1.4 };
        break;
      case 'waveClear': break;
      case 'end':
        this.endTimer = e.outcome === 'win' ? 1.3 : 1.6;
        if (this.targeting) this.cancelTargeting();
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
    const gy = CONST.BATTLE_GROUND_Y;
    switch (sk.fx) {
      case 'slash': case 'bash': case 'flurry':
        this.fx.push({ type: 'slash', x: spec.unit ? spec.unit.x : h.x + 60, y: gy - 36, t: 0, dur: sk.fx === 'flurry' ? 0.75 : 0.3, color: sk.fx === 'bash' ? '#9fd0ff' : '#ffffff', multi: sk.fx === 'flurry' });
        break;
      case 'spin':
        this.fx.push({ type: 'spin', x: spec.x, y: gy - 30, w: sk.areaW, t: 0, dur: 0.4 });
        break;
      case 'pierce': case 'starbolt': case 'snipe':
        if (spec.unit) this.fx.push({ type: 'proj', kind: sk.fx, x0: h.x + 14, y0: gy - 36, to: spec.unit, t: 0, dur: e.delay, big: true });
        break;
      case 'meteor':
        for (let i = 0; i < 7; i++) this.fx.push({ type: 'meteor', tx: spec.x + (Math.random() - 0.5) * sk.areaW, t: -i * 0.06, dur: 0.5, y: gy - 10 });
        break;
      case 'arrowrain':
        for (let i = 0; i < 16; i++) this.fx.push({ type: 'arrowdrop', tx: spec.x + (Math.random() - 0.5) * sk.areaW, t: -Math.random() * 0.25, dur: 0.45, y: gy - 6 });
        break;
      case 'nova':
        this.fx.push({ type: 'flash', t: 0, dur: 0.5, color: 'rgba(200,170,255,' });
        for (const en of this.sim.aliveEnemies()) for (let i = 0; i < 3; i++) this.fx.push({ type: 'meteor', tx: en.x + (Math.random() - 0.5) * 40, t: -i * 0.08 - Math.random() * 0.1, dur: 0.4, y: gy - 10, big: true });
        break;
      case 'heal':
        if (spec.unit) this.sparkle(spec.unit.x, gy - 30, '#9cf0a8', 14);
        break;
      case 'aoeheal':
        this.fx.push({ type: 'ring', x: spec.x, y: gy, w: sk.areaW, t: 0, dur: 0.6, color: '#8cf0a0' });
        break;
      case 'taunt':
        this.fx.push({ type: 'ring', x: h.x, y: gy, w: 120, t: 0, dur: 0.5, color: '#c86af0' });
        this.popup(h.x, this.unitTop(h) - 30, '이리 와!', '#e0a0ff', 20);
        break;
      case 'wall':
        for (const a of this.sim.aliveHeroes()) this.fx.push({ type: 'shield', unit: a, t: 0, dur: 1.0 });
        break;
      case 'tree':
        this.fx.push({ type: 'tree', x: 230, t: 0, dur: 1.6 });
        break;
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
    run.stats.battles++;
    if (run.fruit && run.fruit.battles > 0) { run.fruit.battles--; if (run.fruit.battles <= 0) run.fruit = null; }
    if (outcome === 'win' && !gaveUp) {
      if (this.node.type === 'boss') { run.result = 'victory'; Game.go('result'); }
      else if (this.node.fromEvent) { Game.go('reward', { node: this.node, goldOnly: true }); }
      else Game.go('reward', { node: this.node });
    } else {
      run.result = gaveUp ? 'giveup' : 'defeat';
      Game.go('result');
    }
  },

  // ------------------------------------------------------------ HUD 갱신
  updateHud() {
    const sim = this.sim;
    this.stageLabel.textContent = `던전 ${this.node.stage}/${CONST.STAGES} · 웨이브 ${sim.waveIndex + 1}/${sim.waves.length}`;
    this.potionBtn.innerHTML = `🧪 ${this.run.potions}`;
    this.potionBtn.disabled = this.run.potions <= 0;
    const tg = this.targeting;
    const inArea = tg && (tg.kind === 'area_enemy' || tg.kind === 'area_ally') ? new Set(sim.unitsInArea(tg.hero, tg.slot, tg.x).map((u) => u.uid)) : null;
    // 적 칩
    const alive = sim.enemies.filter((u) => u.alive);
    const seen = new Set();
    alive.sort((a, b) => a.homeX - b.homeX);
    let idx = 0;
    for (const u of alive) {
      seen.add(u.uid);
      let c = this.chipEls[u.uid];
      if (!c) {
        const root = el('button', 'chip');
        root.type = 'button';
        root.dataset.uid = u.uid;
        const pc = portraitCanvas(u.sprite, 30, { flip: true });
        root.appendChild(pc);
        const body = el('div', 'chip-body');
        const hp = bar(1, 'hp enemy');
        body.appendChild(hp);
        const st = el('div', 'chip-st', '');
        body.appendChild(st);
        root.appendChild(body);
        const ch = bar(0, 'charge');
        root.appendChild(ch);
        root.addEventListener('click', (e) => { e.stopPropagation(); this.onChip(u); });
        if (u.def.abilities.includes('boss')) root.classList.add('boss');
        this.chipsWrap.appendChild(root);
        c = this.chipEls[u.uid] = { root, hp, st, ch, last: '' };
      }
      c.root.style.order = idx++;
      setBar(c.hp, u.hp / u.maxHp);
      const stTxt = this.statusIcons(u);
      if (stTxt !== c.last) { c.st.innerHTML = stTxt; c.last = stTxt; }
      const charging = u.charge || u.call;
      c.root.classList.toggle('charging', !!charging);
      if (charging) setBar(c.ch, 1 - charging.t / charging.total);
      c.root.classList.toggle('targetable', !!tg && (tg.kind === 'enemy' || tg.kind === 'area_enemy'));
      c.root.classList.toggle('targeted', !!tg && tg.sel === u);
      c.root.classList.toggle('inarea', !!inArea && inArea.has(u.uid));
    }
    for (const uid in this.chipEls) if (!seen.has(+uid)) { this.chipEls[uid].root.remove(); delete this.chipEls[uid]; }
    // 초상화
    for (const h of sim.heroes) {
      const p = this.portEls[h.uid];
      setBar(p.hp, h.hp / h.maxHp);
      p.hp.classList.toggle('low', h.hp / h.maxHp < 0.3);
      setBar(p.ult, h.ult / 100);
      p.ult.classList.toggle('ready', h.ult >= 100);
      p.root.classList.toggle('dead', !h.alive);
      p.root.classList.toggle('sel', h === this.selHero && !tg);
      p.root.classList.toggle('targetable', !!tg && (tg.kind === 'ally' || tg.kind === 'potion' || tg.kind === 'area_ally') && h.alive);
      p.root.classList.toggle('targeted', !!tg && tg.sel === h);
      p.root.classList.toggle('inarea', !!inArea && inArea.has(h.uid));
      const s = this.statusIcons(h);
      if (s !== p.last) { p.stat.innerHTML = s; p.last = s; }
    }
    // 스킬 버튼
    const h = this.selHero;
    if (h) {
      this.skillName.innerHTML = `<b>${h.name}</b> <small>${h.def.roleName}</small>`;
      for (const slot of ['s1', 's2', 'ult']) {
        const b = this.skillBtns[slot];
        const sk = sim.skillDef(h, slot);
        const lab = b.querySelector('.sb-lab');
        if (lab.textContent !== sk.name) lab.textContent = sk.name;
        const cdEl = b.querySelector('.sb-cd');
        let frac = 0, txt = '';
        if (slot === 'ult') { frac = 1 - h.ult / 100; txt = h.ult >= 100 ? '' : Math.floor(h.ult) + '%'; }
        else { const mx = sim.skillCdMax(h, slot); frac = h.cds[slot] / mx; txt = h.cds[slot] > 0 ? Math.ceil(h.cds[slot]) + '' : ''; }
        b.style.setProperty('--cd', frac.toFixed(3));
        if (cdEl.textContent !== txt) cdEl.textContent = txt;
        b.classList.toggle('cooling', txt !== '');
        b.classList.toggle('ready', sim.canCast(h, slot));
        b.classList.toggle('active', !!tg && tg.hero === h && tg.slot === slot);
      }
    }
  },

  statusIcons(u) {
    let s = '';
    for (const k in u.statuses) {
      const st = STATUS[k];
      if (!st) continue;
      const t = u.statuses[k].t;
      s += `<span class="sti" style="background:${st.color}">${st.short}${isFinite(t) ? `<i>${Math.ceil(t)}</i>` : ''}</span>`;
    }
    return s;
  },

  // ------------------------------------------------------------ 렌더
  render(ctx) {
    const sim = this.sim;
    const t = this.t;
    const sh = this.shake;
    const camX = Math.sin(t * 0.3) * 6;
    ctx.save();
    if (sh > 0) ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
    this.drawBackground(ctx, camX, t);
    // 차지 위험 범위
    for (const e of sim.enemies) {
      if (!e.alive || !e.charge) continue;
      const c = e.charge;
      const prog = 1 - c.t / c.total;
      const pulse = 0.35 + Math.sin(t * (10 + prog * 20)) * 0.15 + prog * 0.3;
      ctx.fillStyle = `rgba(220,40,30,${pulse * 0.55})`;
      this.floorEllipse(ctx, (c.x0 + c.x1) / 2, CONST.BATTLE_GROUND_Y + 4, (c.x1 - c.x0) / 2 + 10, 22);
      ctx.strokeStyle = `rgba(255,120,90,${0.6 + pulse * 0.4})`;
      ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.ellipse((c.x0 + c.x1) / 2, CONST.BATTLE_GROUND_Y + 4, (c.x1 - c.x0) / 2 + 10, 22, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      // 채워지는 내부 링
      ctx.fillStyle = `rgba(255,60,40,${0.25 + prog * 0.3})`;
      this.floorEllipse(ctx, (c.x0 + c.x1) / 2, CONST.BATTLE_GROUND_Y + 4, ((c.x1 - c.x0) / 2 + 10) * prog, 22 * prog);
    }
    // 범위 지정 표시
    const tg = this.targeting;
    if (tg && (tg.kind === 'area_enemy' || tg.kind === 'area_ally')) {
      const cx = sim.clampAreaX(tg.hero, tg.sk, tg.x);
      const w = tg.sk.areaW;
      const col = tg.kind === 'area_ally' ? '120,240,150' : '255,210,80';
      ctx.fillStyle = `rgba(${col},${0.18 + Math.sin(t * 6) * 0.06})`;
      ctx.fillRect(cx - w / 2, CONST.BATTLE_GROUND_Y - 12, w, 34);
      ctx.strokeStyle = `rgba(${col},0.95)`;
      ctx.lineWidth = 2; ctx.setLineDash([8, 5]); ctx.lineDashOffset = -t * 30;
      ctx.strokeRect(cx - w / 2, CONST.BATTLE_GROUND_Y - 12, w, 34);
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(${col},1)`;
      ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('◀ 드래그: 범위 이동 ▶', cx, CONST.BATTLE_GROUND_Y + 40);
    }
    // 유닛
    const units = sim.heroes.concat(sim.enemies).filter((u) => u.alive);
    units.sort((a, b) => this.unitY(a) - this.unitY(b));
    for (const u of units) this.drawUnit(ctx, u, t);
    // 단일 타겟 화살표 (시전자 → 대상)
    if (tg && tg.sel && tg.hero) this.drawTargetArc(ctx, tg.hero, tg.sel, t);
    this.drawFx(ctx);
    this.drawPopups(ctx);
    ctx.restore();
    // 화면 효과
    for (const f of this.fx) if (f.type === 'flash') { ctx.fillStyle = f.color + (0.5 * (1 - f.t / f.dur)).toFixed(3) + ')'; ctx.fillRect(0, 0, 960, 540); }
    if (sim.enemies.some((e) => e.alive && e.charge)) {
      const a = 0.18 + Math.sin(t * 12) * 0.1;
      const g = ctx.createRadialGradient(480, 260, 260, 480, 260, 560);
      g.addColorStop(0, 'rgba(200,0,0,0)'); g.addColorStop(1, `rgba(200,0,0,${a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 540);
    }
    if (tg) { ctx.fillStyle = 'rgba(20,30,60,0.18)'; ctx.fillRect(0, 0, 960, 540); }
    this.drawBanner(ctx);
    this.drawCutin(ctx);
  },

  floorEllipse(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2); ctx.fill(); },

  drawBackground(ctx, camX, t) {
    const W = 960, gy = CONST.BATTLE_GROUND_Y;
    // 레이어 1: 벽
    ctx.fillStyle = '#231c33';
    ctx.fillRect(0, 0, W, 540);
    const ox1 = camX * 0.3;
    for (let row = 0; row < 9; row++) {
      const y = 40 + row * 34;
      const off = (row % 2) * 44;
      for (let x = -100 + off + ox1; x < W + 100; x += 88) {
        ctx.fillStyle = row % 3 === 0 ? '#2e2642' : '#2b2340';
        ctx.fillRect(Math.round(x), y, 84, 30);
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(Math.round(x), y, 84, 3);
      }
    }
    // 횃불 + 광원
    for (const tx0 of [110, 470, 850]) {
      const tx = tx0 + ox1;
      const fl = 0.88 + Math.sin(t * 9 + tx0) * 0.07 + Math.sin(t * 21 + tx0 * 2) * 0.05;
      const g = ctx.createRadialGradient(tx, 150, 6, tx, 150, 150 * fl);
      g.addColorStop(0, 'rgba(255,170,80,0.42)'); g.addColorStop(0.5, 'rgba(255,140,60,0.12)'); g.addColorStop(1, 'rgba(255,140,60,0)');
      ctx.fillStyle = g; ctx.fillRect(tx - 170, 0, 340, 340);
      ctx.fillStyle = '#5e3a20'; ctx.fillRect(tx - 3, 150, 6, 26);
      ctx.fillStyle = '#3a2418'; ctx.fillRect(tx - 6, 148, 12, 5);
      const fh = 12 + Math.sin(t * 14 + tx0) * 3;
      ctx.fillStyle = '#ff9a2a'; ctx.fillRect(tx - 4, 148 - fh, 8, fh);
      ctx.fillStyle = '#ffe066'; ctx.fillRect(tx - 2, 148 - fh * 0.6, 4, fh * 0.6);
    }
    // 레이어 2: 기둥
    const ox2 = camX * 0.6;
    for (const px0 of [290, 690]) {
      const px = px0 + ox2;
      ctx.fillStyle = '#3a3152'; ctx.fillRect(px - 16, 70, 32, gy - 70);
      ctx.fillStyle = '#463c62'; ctx.fillRect(px - 16, 70, 8, gy - 70);
      ctx.fillStyle = '#2a2340'; ctx.fillRect(px + 10, 70, 6, gy - 70);
      ctx.fillStyle = '#4c4268'; ctx.fillRect(px - 22, 62, 44, 12); ctx.fillRect(px - 22, gy - 14, 44, 14);
    }
    // 레이어 3: 바닥
    const g2 = ctx.createLinearGradient(0, gy - 20, 0, 410);
    g2.addColorStop(0, '#3b3150'); g2.addColorStop(1, '#2a2338');
    ctx.fillStyle = g2; ctx.fillRect(0, gy - 20, W, 410 - (gy - 20));
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
    const ox3 = camX;
    for (let x = -200; x < W + 200; x += 70) {
      ctx.beginPath(); ctx.moveTo(x + ox3, gy - 20); ctx.lineTo(x * 1.25 - 120 + ox3 * 1.3, 410); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(0, gy + 18); ctx.lineTo(W, gy + 18); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, gy - 20, W, 3);
    // 먼지
    for (const d of this.dust) {
      const x = (d.x + t * 8 * d.s + camX * 0.8) % 980 - 10;
      const y = d.y + Math.sin(t * d.s + d.p) * 10;
      ctx.fillStyle = `rgba(255,230,190,${0.15 + 0.15 * Math.sin(t * 2 + d.p)})`;
      ctx.fillRect(x, y, 2, 2);
    }
  },

  drawUnit(ctx, u, t) {
    const enemy = u.side === 'enemy';
    const sc = this.unitScale(u);
    const y = this.unitY(u);
    let x = u.x;
    if (u.anim.lunge > 0) { const k = Math.sin((1 - u.anim.lunge / 0.25) * Math.PI); x += u.anim.lungeX * clamp(k, 0, 1); }
    if (u.anim.hurt > 0) x += (enemy ? 1 : -1) * u.anim.hurt * 30;
    const s = getSprite(u.sprite);
    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    this.floorEllipse(ctx, x, y + 2, s.w * sc * 0.38, 7 * (enemy ? u.size : 1));
    // 선택/타겟 링
    const tg = this.targeting;
    if (!enemy && u === this.selHero && !tg) { ctx.strokeStyle = '#ffd34a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 2, s.w * sc * 0.42, 9, 0, 0, Math.PI * 2); ctx.stroke(); }
    if (tg) {
      const valid = (tg.kind === 'enemy' && enemy) || ((tg.kind === 'ally' || tg.kind === 'potion') && !enemy);
      const inArea = (tg.kind === 'area_enemy' || tg.kind === 'area_ally') && this.sim.unitsInArea(tg.hero, tg.slot, tg.x).includes(u);
      if (valid || inArea) {
        ctx.strokeStyle = tg.sel === u || inArea ? '#ffd34a' : 'rgba(255,255,255,0.45)';
        ctx.lineWidth = tg.sel === u || inArea ? 3 : 1.5;
        ctx.beginPath(); ctx.ellipse(x, y + 2, s.w * sc * 0.45 + Math.sin(t * 8) * 2, 10, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    const blinking = ((t + u.uid * 1.37) % 3.6) < 0.13;
    let tint = null, tintAlpha = 0;
    if (u.anim.hurt > 0.08) tint = 'white';
    if (u.charge && Math.floor(t * (6 + (1 - u.charge.t / u.charge.total) * 14)) % 2 === 0) tint = 'white';
    if (!tint && u.statuses.enrage) { tint = 'red'; tintAlpha = 0.25 + Math.sin(t * 8) * 0.1; }
    const squash = u.anim.cast > 0 ? 1 + Math.sin((u.anim.cast / 0.3) * Math.PI) * 0.06 : (u.anim.hurt > 0 ? 0.94 : 1);
    drawSprite(ctx, u.sprite, x, y, { scale: sc, flip: enemy, t: t * (u.statuses.stun ? 0.2 : 1), phase: u.uid, blinking, tint, tintAlpha, squash });
    const top = y - s.h * sc;
    // 기절 별
    if (u.statuses.stun) for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; ctx.fillStyle = '#ffd34a'; ctx.fillRect(x + Math.cos(a) * 16 - 2, top - 4 + Math.sin(a) * 4, 5, 5); }
    // 머리 위 작은 HP 바
    const bw = enemy ? 34 + u.size * 10 : 34;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - bw / 2 - 1, top - 10, bw + 2, 6);
    ctx.fillStyle = enemy ? '#e0524a' : '#6fd86a'; ctx.fillRect(x - bw / 2, top - 9, bw * (u.hp / u.maxHp), 4);
    // 차지/호출 텔레그래프
    const cast = u.charge || u.call;
    if (cast) {
      const prog = 1 - cast.t / cast.total;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 22, top - 20, 44, 7);
      ctx.fillStyle = u.charge ? '#ff5a3a' : '#ffb04a'; ctx.fillRect(x - 21, top - 19, 42 * prog, 5);
      ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#3a0000'; ctx.fillText('!', x + 1, top - 25);
      ctx.fillStyle = Math.floor(t * 8) % 2 ? '#ff5a3a' : '#ffd34a'; ctx.fillText('!', x, top - 26);
    }
    // 도발당한 적 표시
    if (enemy && u.statuses.taunt) { ctx.fillStyle = '#c86af0'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('도발', x, top - 14); }
    if (!enemy && u.statuses.guard) { ctx.strokeStyle = 'rgba(122,184,240,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - s.h * sc * 0.5, s.h * sc * 0.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    if (!enemy && u.statuses.regen && Math.random() < 0.15) this.sparkle(x, y - 20, '#9cf0a8', 1);
  },

  drawTargetArc(ctx, from, to, t) {
    const x0 = from.x, y0 = this.unitTop(from) + 10;
    const x1 = to.x, y1 = this.unitTop(to) - 4;
    const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 70;
    ctx.strokeStyle = '#ffd34a'; ctx.lineWidth = 3; ctx.setLineDash([8, 7]); ctx.lineDashOffset = -t * 40;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd34a';
    ctx.beginPath(); ctx.moveTo(x1, y1 + 2); ctx.lineTo(x1 - 7, y1 - 10); ctx.lineTo(x1 + 7, y1 - 10); ctx.fill();
  },

  drawFx(ctx) {
    const gy = CONST.BATTLE_GROUND_Y;
    for (const f of this.fx) {
      if (f.t < 0) continue;
      const k = f.t / f.dur;
      switch (f.type) {
        case 'spark':
          ctx.fillStyle = f.color; ctx.globalAlpha = 1 - k;
          ctx.fillRect(f.x - 2, f.y - 2, 4, 4); ctx.globalAlpha = 1; break;
        case 'sparkle':
          ctx.fillStyle = f.color; ctx.globalAlpha = 1 - k;
          ctx.fillRect(f.x - 1, f.y - 4, 2, 8); ctx.fillRect(f.x - 4, f.y - 1, 8, 2); ctx.globalAlpha = 1; break;
        case 'smoke':
          ctx.fillStyle = `rgba(200,190,210,${0.55 * (1 - k)})`;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.6 + k), 0, Math.PI * 2); ctx.fill(); break;
        case 'dust':
          ctx.fillStyle = `rgba(160,130,110,${0.8 * (1 - k)})`; ctx.fillRect(f.x - 3, f.y - 3, 6, 6); break;
        case 'proj': {
          if (!f.to) break;
          const x1 = f.to.x, y1 = this.unitY(f.to) - 30 * (f.to.size || 1);
          const x = lerp(f.x0, x1, k), y = lerp(f.y0, y1, k) - Math.sin(k * Math.PI) * (f.kind === 'bori' ? 30 : 12);
          if (f.kind === 'byeolbi' || f.kind === 'pierce' || f.kind === 'snipe') {
            ctx.strokeStyle = f.kind === 'snipe' ? '#ffd34a' : '#f3dcb4'; ctx.lineWidth = f.big ? 4 : 2;
            ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x + 4, y); ctx.stroke();
            ctx.fillStyle = '#c9d0d8'; ctx.fillRect(x + 3, y - 2, 4, 4);
            if (f.big) { ctx.fillStyle = 'rgba(255,230,120,0.5)'; ctx.fillRect(x - 40, y - 1, 30, 2); }
          } else if (f.kind === 'soldam' || f.kind === 'starbolt') {
            ctx.fillStyle = '#ffe066'; const r = f.big ? 7 : 4;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,200,90,0.4)'; ctx.beginPath(); ctx.arc(x - 8, y, r * 0.8, 0, Math.PI * 2); ctx.fill();
          } else {
            ctx.fillStyle = '#64b84e'; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.fillStyle = '#9fe08a'; ctx.fillRect(x - 1, y - 1, 2, 2);
          }
          break;
        }
        case 'slash': {
          ctx.strokeStyle = f.color; ctx.lineWidth = 4 * (1 - k) + 1;
          const n = f.multi ? 6 : 1;
          for (let i = 0; i < n; i++) {
            const kk = f.multi ? clamp(k * n - i, 0, 1) : k;
            if (kk <= 0 || kk >= 1) continue;
            const a0 = -1.2 + i * 0.7, r = 34 + (i % 2) * 8;
            ctx.beginPath(); ctx.arc(f.x, f.y, r, a0, a0 + kk * 2.2); ctx.stroke();
          }
          break;
        }
        case 'spin':
          ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.ellipse(f.x, f.y, f.w / 2 * (0.4 + k * 0.6), 26, 0, k * 8, k * 8 + 4.5); ctx.stroke(); break;
        case 'meteor': {
          const kk = k;
          const x = f.tx + (1 - kk) * 120, y = lerp(-20, f.y, kk);
          ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(x, y, f.big ? 9 : 7, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,150,60,0.7)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 30, y - 40); ctx.stroke();
          if (kk > 0.9) { ctx.fillStyle = 'rgba(255,200,90,0.6)'; this.floorEllipse(ctx, f.tx, f.y, 26, 8); }
          break;
        }
        case 'arrowdrop': {
          const y = lerp(40, f.y, k);
          ctx.strokeStyle = '#f3dcb4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.tx, y - 16); ctx.lineTo(f.tx, y); ctx.stroke();
          ctx.fillStyle = '#c9d0d8'; ctx.fillRect(f.tx - 2, y, 4, 4);
          break;
        }
        case 'ring':
          ctx.strokeStyle = f.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(f.x, f.y, f.w / 2 * (0.3 + k * 0.7), 20 * (0.3 + k * 0.7), 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; break;
        case 'shield': {
          const u = f.unit; const s = getSprite(u.sprite);
          ctx.strokeStyle = `rgba(122,184,240,${1 - k})`; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(u.x, gy - s.h * 1.5, s.h * 1.8 * (0.8 + k * 0.3), Math.PI, 0); ctx.stroke(); break;
        }
        case 'tree': {
          const h = Math.min(1, k * 2) * 140;
          ctx.globalAlpha = k < 0.8 ? 0.85 : (1 - k) * 4;
          ctx.fillStyle = '#6e4724'; ctx.fillRect(f.x - 8, gy - h, 16, h);
          ctx.fillStyle = '#64b84e';
          for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(f.x + Math.cos(i) * 40 * (h / 140), gy - h + Math.sin(i * 2) * 18, 26 * (h / 140), 0, Math.PI * 2); ctx.fill(); }
          ctx.globalAlpha = 1; break;
        }
        default: break;
      }
    }
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
    ctx.font = 'bold 18px sans-serif'; ctx.fillStyle = '#1a0f08'; ctx.fillText(`${c.hero.name}의 궁극기!`, 400 * slide + 44, 46);
    ctx.restore();
  },
};
