// ===== 06_battle_sim.js : 실시간 파티 전투 시뮬레이션 (순수 로직) =====
// 2D 바닥 위 자유 이동: 근접은 달려들고, 원거리는 거리를 유지하고, 서로 겹칠 수 있다.
// 렌더/DOM을 모른다. step(dt)로만 진행하고 events[]에 연출용 이벤트를 쌓는다.
// 같은 시드 + 같은 입력(명령과 그 시점) → 같은 결과.


class BattleSim {
  // opts: { seed, stage, waves, heroes:[{id,hp,maxHp,upgrades}], relics, fruit, torchDark, strategy, autoMode, partySize }
  constructor(opts) {
    this.rng = makeRng(opts.seed >>> 0);
    this.uidSeq = 1; // 전투마다 새로 매기는 유닛 번호 (위치 분산 등에 쓰이므로 결정성 유지)
    this.stage = opts.stage || 1;
    this.scale = STAGE_SCALE[clamp(this.stage - 1, 0, STAGE_SCALE.length - 1)];
    this.waves = opts.waves.map((w) => w.slice());
    this.partyScale = PARTY_ENEMY_SCALE[clamp(opts.partySize || opts.heroes.length, 1, 3)] || 1;
    this.tier = opts.tier || { hp: 1, atk: 1 }; // 난이도 단계 배율 (보스 포함 모든 적)
    this.levelGap = opts.levelGap || 0;          // 파티 전투 레벨 − 던전 레벨 (영웅별 값은 hero.levelGap)
    // 영웅 AI 성향 (밸런스 측정용): none = 실제 게임(이동 판단은 플레이어 작전에 맡김)
    // gimmick = 차지 범위 회피 + 그로기 대상 집중 / brute = 기믹 무시하고 딜만
    this.aiProfile = opts.aiProfile || 'none';
    this.waveIndex = 0;
    this.waveTimer = -1;
    this.relics = new Set(opts.relics || []);
    this.fruit = opts.fruit || null;
    this.torchDark = !!opts.torchDark;
    this.strategy = opts.strategy || {};
    this.autoMode = opts.autoMode !== undefined ? opts.autoMode : true;
    this.order = 'hold';          // 작전: charge | hold | retreat
    this.focus = null;            // 집중 공격 대상 (적 유닛)
    this.time = 0;
    this.events = [];
    this.delayed = [];
    this.outcome = null;
    this.heroes = [];
    this.enemies = [];
    this.kills = 0;
    this.introT = CONST.BATTLE_INTRO;
    this.poiseLog = {}; this.breakLog = [];
    opts.heroes.forEach((h, i) => this.heroes.push(this._makeHero(h, i, opts.heroes.length)));
    this._spawnWave(0, true);
    if (this.relics.has('acorn')) for (const h of this.aliveHeroes()) this._heal(null, h, h.maxHp * 0.1, true);
    for (const h of this.aliveHeroes()) { const pv = this.passive(h, 'first_breath'); if (pv) h.ult = Math.min(100, h.ult + pv); }
  }

  // 갑옷 패시브(전투 규칙형) 수치. 없으면 0
  passive(u, key) { return (u.mods && u.mods.passives && u.mods.passives[key]) || 0; }
  // 차지·호출을 끊었을 때 (반딧불 신호)
  _onCancel(src) { const v = src && this.passive(src, 'firefly'); if (v) this._gainUltRaw(src, v); }

  // ------------------------------------------------------------ 생성
  _makeHero(h, i, n) {
    const def = HEROES[h.id];
    const m = h.mods || {};   // 장비 보정치 (equipStats 결과). hp는 호출 측에서 maxHp에 이미 반영
    const cap = CONST.STAT_CAPS;
    const y = lerp(CONST.FIELD_Y0 + 20, CONST.FIELD_Y1 - 14, n === 1 ? 0.5 : i / (n - 1));
    const u = {
      uid: this.uidSeq++, side: 'hero', key: h.id, def, name: def.name, sprite: def.sprite, role: def.role,
      hp: h.hp, maxHp: h.maxHp, atk: def.atk * (1 + (m.atk_pct || 0)) + (m.atk || 0),
      atkInterval: def.atkInterval / (1 + Math.min(m.aspd || 0, cap.aspd)),
      defPct: 1 - (1 - def.def) * (1 - Math.min(m.dr || 0, cap.dr)), size: 1, mods: m,
      melee: def.range === 'melee', reach: def.reach || 0, speed: def.moveSpeed * (1 + Math.min(m.mspd || 0, cap.mspd)),
      x: CONST.HERO_SPAWN_X - 140 - i * 20, y, tx: 0, ty: 0, face: 1, moving: false,
      atkTimer: 0.3 + this.rng() * 0.6, target: null, retarget: 0,
      statuses: {}, cds: { s1: 1 + this.rng(), s2: 3 + this.rng() * 2 }, ult: 0,
      levelGap: h.levelGap !== undefined ? h.levelGap : this.levelGap,
      upgrades: h.upgrades || {}, alive: h.hp > 0, castLock: 0, actLock: 0, ultDef: h.ultDef || null, casting: null,
      anim: { lunge: 0, lungeX: 0, lungeY: 0, hurt: 0, cast: 0 },
      stats: { dealt: 0, healed: 0, taken: 0, kills: 0 },
    };
    if (this.fruit && this.fruit.bonus > 0) u.statuses.fruit = { t: Infinity, value: this.fruit.bonus };
    return u;
  }

  _makeEnemy(id, x, y) {
    const def = ENEMIES[id];
    const sc = def.fixedScale ? 1 : this.scale;
    const hpMul = (def.fixedScale ? 1 : CONST.ENEMY_HP_MULT) * this.partyScale * this.tier.hp, atkMul = (def.fixedScale ? 1 : CONST.ENEMY_ATK_MULT) * this.tier.atk;
    return {
      uid: this.uidSeq++, side: 'enemy', key: id, def, name: def.name, sprite: def.sprite,
      hp: Math.round(def.hp * sc * hpMul), maxHp: Math.round(def.hp * sc * hpMul), atk: def.atk * sc * atkMul, atkInterval: def.atkInterval,
      defPct: def.def, size: def.size, melee: true, reach: 0, speed: def.moveSpeed || 60,
      x, y, tx: x, ty: y, face: -1, moving: false,
      atkTimer: 0.6 + this.rng() * 1.0, target: null, retarget: 0,
      statuses: {}, alive: true,
      charge: null, chargeCd: def.chargeEvery ? def.chargeEvery * (0.45 + this.rng() * 0.25) : 0,
      chargeEvery: def.chargeEvery, chargeTime: def.chargeTime, chargeMult: def.chargeMult, chargeR: def.chargeR,
      call: null, callCd: def.callEvery ? def.callEvery * (0.5 + this.rng() * 0.3) : 0,
      warcryCd: def.warcryEvery ? def.warcryEvery * 0.6 : 0,
      phase: 0, enraged: false,
      armor: def.armor || 0, poiseMax: def.poise || 0, poise: def.poise || 0, broken: 0, poiseBase: def.poise || 0,
      shaken: 0, regenDelay: 0, breakLock: 0, breaks: 0, stunHist: [], intr: null, unblocked: 0, enrageStacks: 0, armorBoost: 0,
      anim: { lunge: 0, lungeX: 0, lungeY: 0, hurt: 0, cast: 0 },
    };
  }

  _spawnWave(i, initial) {
    const ids = this.waves[i];
    ids.forEach((id, k) => {
      const y = lerp(CONST.FIELD_Y0 + 8, CONST.FIELD_Y1 - 8, ids.length === 1 ? 0.5 : k / (ids.length - 1));
      const x = (initial ? CONST.ENEMY_SPAWN_X + 150 : 1010) + (k % 2) * 40 + ENEMIES[id].size * 20;
      this.enemies.push(this._makeEnemy(id, x, y + (this.rng() - 0.5) * 10));
    });
    this.events.push({ type: 'wave', index: i, total: this.waves.length });
  }

  _summon(ids, by) {
    for (const id of ids) {
      if (this.aliveEnemies().length >= 7) break;
      const e = this._makeEnemy(id, clamp(by.x + 40 + this.rng() * 40, CONST.FIELD_X0, 990), clamp(by.y + (this.rng() - 0.5) * 70, CONST.FIELD_Y0, CONST.FIELD_Y1));
      this.enemies.push(e);
      this.events.push({ type: 'summon', unit: e, by });
    }
  }

  // ------------------------------------------------------------ 조회
  aliveHeroes() { return this.heroes.filter((u) => u.alive); }
  aliveEnemies() { return this.enemies.filter((u) => u.alive); }
  tankHero() { return this.heroes.find((h) => h.alive && h.role === 'tank') || null; }
  hpPct(u) { return u.hp / u.maxHp; }
  // 깊이(y)는 가중치를 줘서 위아래로는 덜 닿게
  dist(a, b) { const dx = a.x - b.x, dy = (a.y - b.y) * CONST.Y_WEIGHT; return Math.sqrt(dx * dx + dy * dy); }
  distXY(u, x, y) { const dx = u.x - x, dy = (u.y - y) * CONST.Y_WEIGHT; return Math.sqrt(dx * dx + dy * dy); }
  nearest(u, list) { let b = null, bd = 1e9; for (const o of list) { const d = this.dist(u, o); if (d < bd) { bd = d; b = o; } } return b; }
  attackRange(u, tgt) { return u.melee ? CONST.MELEE_RANGE + ((tgt && tgt.size) || 1) * 12 + (u.size - 1) * 14 : u.reach; }
  frontEnemy() { let b = null; for (const e of this.enemies) if (e.alive && (!b || e.x < b.x)) b = e; return b; }
  frontHero() { let b = null; for (const h of this.heroes) if (h.alive && (!b || h.x > b.x)) b = h; return b; }

  // ------------------------------------------------------------ 진행
  step(dt) {
    if (this.outcome) return;
    this.time += dt;
    for (let i = this.delayed.length - 1; i >= 0; i--) {
      const d = this.delayed[i];
      d.t -= dt;
      if (d.t <= 0) { this.delayed.splice(i, 1); d.fn(); }
    }
    if (this.focus && !this.focus.alive) { this.focus = null; this.events.push({ type: 'focusClear' }); }
    const intro = this.introT > 0;
    if (intro) this.introT -= dt;
    for (const u of this.heroes) if (u.alive) { if (!intro) this._tickUnit(u, dt); this._think(u, dt, intro); }
    for (const u of this.enemies) if (u.alive) { if (!intro) this._tickUnit(u, dt); this._think(u, dt, intro); }
    this._move(dt);
    for (const u of this.heroes.concat(this.enemies)) {
      u.anim.lunge = Math.max(0, u.anim.lunge - dt);
      u.anim.hurt = Math.max(0, u.anim.hurt - dt);
      u.anim.cast = Math.max(0, u.anim.cast - dt);
    }
    if (intro) return;
    if (this.autoMode) this._heroAI();
    if (this.aliveHeroes().length === 0) { this.outcome = 'lose'; this.events.push({ type: 'end', outcome: 'lose' }); return; }
    if (this.aliveEnemies().length === 0) {
      if (this.waveIndex < this.waves.length - 1) {
        if (this.waveTimer < 0) { this.waveTimer = CONST.WAVE_DELAY; this.events.push({ type: 'waveClear' }); }
        this.waveTimer -= dt;
        if (this.waveTimer <= 0) { this.waveTimer = -1; this.waveIndex++; this._spawnWave(this.waveIndex, false); }
      } else if (this.delayed.length === 0) { this.outcome = 'win'; this.events.push({ type: 'end', outcome: 'win' }); }
    }
  }

  // 대상 선택 + 가고 싶은 위치(tx, ty) 결정
  _think(u, dt, intro) {
    const F = CONST;
    u.retarget -= dt;
    if (u.side === 'hero') {
      const enemies = this.aliveEnemies();
      if (u.retarget <= 0 || !u.target || !u.target.alive) {
        u.retarget = F.RETARGET_SEC;
        if (this.focus && this.focus.alive) u.target = this.focus;
        else if (!enemies.length) u.target = null;
        else if (u.role === 'ranged') { let b = enemies[0]; for (const e of enemies) if (this.hpPct(e) < this.hpPct(b)) b = e; u.target = b; }
        else u.target = this.nearest(u, enemies);
      }
      if (this.aiProfile === 'gimmick') {
        const br = enemies.find((e) => e.broken > 0);
        if (br) u.target = br;
        const squishy = u.role !== 'tank' && (u.role !== 'melee' || this.hpPct(u) < 0.5);
        if (squishy) for (const e of enemies) if (e.charge && this.inChargeZone(u, e.charge)) { // 위험 범위 밖으로
          u.tx = clamp(e.charge.cx - e.charge.r - 30, F.FIELD_X0, F.FIELD_X1); u.ty = u.y; return;
        }
      }
      // 개별 명령 (캐릭터 끌기): 지점 이동 / 대상 공격
      const cmd = u.cmd;
      if (cmd && cmd.type === 'attack') { if (cmd.unit.alive) u.target = cmd.unit; else u.cmd = null; }
      if (cmd && cmd.type === 'move' && !intro) {
        u.tx = cmd.x; u.ty = cmd.y;
        if (u.target && !u.target.alive) u.target = null;
        return;
      }
      const tank = this.tankHero();
      const anchor = tank && tank !== u ? tank : this.frontHero();
      if (intro || !u.target) { // 입장/대기: 기본 대형
        const order = HERO_ORDER.indexOf(u.key);
        u.tx = F.HERO_SPAWN_X + 120 - order * 30; u.ty = u.y;
        return;
      }
      const t = u.target;
      if (this.order === 'retreat' && !u.cmd) {
        u.tx = F.FIELD_X0 + 40 + (u.melee ? 70 : 0); u.ty = clamp(u.y, F.FIELD_Y0, F.FIELD_Y1);
        return;
      }
      if (u.melee) { // 대상에게 붙는다 (대상 앞쪽, 살짝 위아래로 어긋나게)
        const r = this.attackRange(u, t) * 0.8;
        let side = u.x <= t.x ? -1 : 1;
        if (CONST.BREAK_V2 && t.poiseMax && u.role === 'melee' && t.face) side = -t.face; // 큰 적은 등 뒤에서 (후방 끊기)
        u.tx = clamp(t.x + side * r, CONST.FIELD_X0, CONST.FIELD_X1); u.ty = t.y + ((u.uid % 3) - 1) * 10;
      } else {
        const keep = this.order === 'charge' ? u.reach * 0.6 : u.reach * 0.88;
        let tx = t.x - keep;
        if (this.order === 'hold' && anchor && anchor.melee) tx = Math.min(tx, anchor.x - (u.role === 'support' ? 120 : 70));
        if (u.role === 'support') { // 서포터: 평타 사거리는 지키되, 많이 다친 동료가 있으면 그 뒤에 붙는다 (회복은 거리 제한 없음)
          tx = Math.max(tx, t.x - u.reach * 0.9);
          u.ty = t.y + 18;
          const hurt = this.aliveHeroes().filter((b) => b !== u && this.hpPct(b) < 0.6).reduce((a, b) => (!a || this.hpPct(b) < this.hpPct(a) ? b : a), null);
          if (hurt) { tx = Math.min(tx, hurt.x - 50); u.ty = hurt.y + 14; }
        } else u.ty = t.y + ((u.uid % 3) - 1) * 18;
        // 너무 가까이 붙은 적이 있으면 뒤로 빠진다
        const near = this.nearest(u, enemies);
        if (near && this.dist(u, near) < 70 && u.x > F.FIELD_X0 + 30) tx = Math.min(tx, u.x - 60);
        u.tx = tx;
      }
    } else {
      if (u.charge || u.call || u.def.immobile) { u.tx = u.x; u.ty = u.y; return; }
      const heroes = this.aliveHeroes();
      if (!heroes.length) return;
      if (u.statuses.taunt) { const tt = this.heroes.find((h) => h.uid === u.statuses.taunt.src.uid && h.alive); if (tt) { u.target = tt; u.retarget = CONST.TAUNT_LINGER; } } // 도발이 끝나도 잠시 탱커를 계속 노린다
      else if (u.retarget <= 0 || !u.target || !u.target.alive) {
        u.retarget = F.RETARGET_SEC * 2;
        const back = u.def.huntsBackline ? heroes.filter((h) => !h.melee) : [];
        const tankAggro = u.def.abilities.includes('boss') && heroes.find((h) => h.role === 'tank' && this.dist(u, h) < 320); // 보스는 가까운 탱커를 먼저 노린다 (위협)
        u.target = back.length ? this.nearest(u, back) : tankAggro ? tankAggro : u.size <= 1 && this.rng() < 0.3 ? heroes[Math.floor(this.rng() * heroes.length)] : this.nearest(u, heroes); // 사슴왕: 후열 사냥
      }
      if (intro) { u.tx = F.ENEMY_SPAWN_X - (u.uid % 3) * 30; u.ty = u.y; return; }
      const t = u.target;
      const r = this.attackRange(u, t) * 0.8;
      // 같은 대상을 노리는 적들은 둘러싸듯 흩어진다
      const slot = u.size > 1 ? 0 : (u.uid % 5) - 2; // 큰 적은 흩어지지 않는다 (사거리 밖에 멈추는 일 방지)
      u.tx = t.x + (u.x >= t.x ? 1 : -1) * (r + Math.abs(slot) * 8); u.ty = t.y + slot * 14;
    }
  }

  // 개별 명령: { type: 'move', x, y } | { type: 'attack', unit } | null (작전으로 복귀)
  command(h, cmd) {
    if (!h.alive || this.outcome) return false;
    if (cmd && cmd.type === 'move') cmd = { type: 'move', x: clamp(cmd.x, CONST.FIELD_X0, CONST.FIELD_X1), y: clamp(cmd.y, CONST.FIELD_Y0, CONST.FIELD_Y1) };
    if (cmd && cmd.type === 'attack' && !(cmd.unit && cmd.unit.alive && cmd.unit.side === 'enemy')) return false;
    h.cmd = cmd || null;
    if (cmd && cmd.type === 'attack') { h.target = cmd.unit; h.retarget = CONST.RETARGET_SEC; }
    this.events.push({ type: 'command', unit: h, cmd: h.cmd });
    return true;
  }
  travelling(u) { return !!(u.cmd && u.cmd.type === 'move' && Math.hypot(u.x - u.cmd.x, u.y - u.cmd.y) > 6); }
  clearCommands() { for (const h of this.heroes) h.cmd = null; }

  _move(dt) {
    const F = CONST;
    const all = this.heroes.concat(this.enemies).filter((u) => u.alive);
    for (const u of all) {
      if (u.statuses.stun || u.charge || u.call || u.broken > 0 || u.actLock > 0) { u.moving = false; continue; }
      const dx = u.tx - u.x, dy = u.ty - u.y;
      const d = Math.hypot(dx, dy);
      const fast = (u.side === 'enemy' && u.x > 960) || this.introT > 0 ? 2.2 : 1;
      const sp = u.speed * fast * (this.order === 'retreat' && u.side === 'hero' ? 1.25 : 1) * (u.statuses.slow ? 1 - u.statuses.slow.value : 1);
      if (d > 3) {
        const k = Math.min(1, (sp * dt) / d);
        u.x += dx * k; u.y += dy * k; u.moving = true;
        if (Math.abs(dx) > 2) u.face = dx > 0 ? 1 : -1;
      } else u.moving = false;
      if (u.target && u.target.alive && !u.moving) u.face = u.target.x >= u.x ? 1 : -1;
    }
    // 같은 편끼리 살짝만 밀어냄 (완전히 겹치는 것만 방지, 부분 겹침은 허용)
    for (const side of [this.heroes, this.enemies]) {
      const list = side.filter((u) => u.alive);
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        const dx = b.x - a.x, dy = (b.y - a.y) * 1.6, d = Math.hypot(dx, dy) || 0.01;
        const minD = F.SEPARATION * (a.size + b.size) * 0.5;
        if (d < minD) { const push = (minD - d) * 0.5 * Math.min(1, dt * 8); a.x -= (dx / d) * push; b.x += (dx / d) * push; a.y -= (dy / d) * push * 0.4; b.y += (dy / d) * push * 0.4; }
      }
    }
    for (const u of all) {
      if (u.side === 'enemy' && u.x > 960) continue; // 입장 중
      u.x = clamp(u.x, F.FIELD_X0, F.FIELD_X1); u.y = clamp(u.y, F.FIELD_Y0, F.FIELD_Y1);
    }
  }

  _tickUnit(u, dt) {
    for (const k in u.statuses) {
      const s = u.statuses[k];
      if (s.dps) {
        s.acc = (s.acc || 0) + dt;
        if (s.acc >= 0.5) {
          s.acc -= 0.5;
          let dmg = s.dps * 0.5;
          if (k === 'bleed' && this.relics.has('whetstone')) dmg *= 1.5;
          if (k === 'burn' && this.relics.has('ember')) dmg *= 1.3;
          this._damage(s.src, u, dmg, { dot: k });
          if (!u.alive) return;
        }
      }
      if (k === 'regen') { s.acc = (s.acc || 0) + dt; if (s.acc >= 0.5) { s.acc -= 0.5; this._heal(s.src, u, u.maxHp * s.value * 0.5, true); } }
      s.t -= dt;
      if (s.t <= 0) delete u.statuses[k];
    }
    if (u.side === 'hero') {
      u.cds.s1 = Math.max(0, u.cds.s1 - dt);
      u.cds.s2 = Math.max(0, u.cds.s2 - dt);
      u.castLock = Math.max(0, u.castLock - dt);
      u.actLock = Math.max(0, u.actLock - dt);
      if (u.casting) { u.casting.t -= dt; if (u.casting.t <= 0) u.casting = null; }
      this._gainUlt(u, CONST.ULT_GAIN_TIME * dt);
    }
    const stunned = !!u.statuses.stun;
    if (u.side === 'enemy' && u.poiseMax) {
      if (u.broken > 0) {
        u.broken -= dt;
        if (u.broken <= 0) { u.broken = 0; u.poise = u.poiseMax; if (CONST.BREAK_V2) u.breakLock = CONST.BREAK_LOCK; this.events.push({ type: 'breakEnd', unit: u }); }
        return; // 그로기: 행동 불가
      }
      if (!CONST.BREAK_V2) u.poise = Math.min(u.poiseMax, u.poise + CONST.POISE_REGEN * dt);
      else {
        u.breakLock = Math.max(0, u.breakLock - dt);
        if (u.armorBoost > 0) u.armorBoost = Math.max(0, u.armorBoost - dt);
        if (u.intr) { u.intr.t -= dt; if (u.intr.t <= 0 || !(u.charge || u.call)) this._interruptFail(u); }
        if (u.shaken > 0) { u.shaken -= dt; if (u.shaken <= 0) { u.shaken = 0; u.regenDelay = CONST.SHAKE_REGEN_DELAY; this.events.push({ type: 'shakeEnd', unit: u }); } }
        else if (u.regenDelay > 0) u.regenDelay -= dt;
        else if (!(u.def.markStopsRegen && (u.statuses.vuln || u.statuses.exposed))) u.poise = Math.min(u.poiseMax, u.poise + (u.def.poiseRegen || CONST.POISE_REGEN) * (u.def.regenHalfBelow && u.hp < u.maxHp * u.def.regenHalfBelow ? 0.5 : 1) * dt);
      }
    }
    if (u.side === 'enemy') {
      this._enemyAbilities(u, dt, stunned);
      if (!u.alive || u.charge || u.call) return;
    }
    if (stunned) return;
    if (this.travelling(u)) return; // 이동 명령 수행 중: 새 공격을 시작하지 않음
    const speed = u.statuses.enrage ? 1 / (u.def.enrageSpeed || 0.6) : 1;
    u.atkTimer -= dt * speed * (u.statuses.slow ? 1 - u.statuses.slow.value : 1);
    if (u.atkTimer > 0) return;
    let tgt = u.target && u.target.alive ? u.target : null;
    // 보스 추격: 대상이 사거리 밖에 오래 있으면 덮쳐 든다 (멀리서 끌기만으로는 버틸 수 없게)
    if (u.side === 'enemy' && u.def.abilities.includes('boss') && tgt && u.x < 960) {
      if (this.dist(u, tgt) > this.attackRange(u, tgt) + 20) u.chase = (u.chase || 0) + u.atkInterval * 0.5 + 0.15;
      else u.chase = 0;
      if (u.chase >= CONST.BOSS_LEAP_AFTER) {
        u.chase = 0;
        const side = u.x >= tgt.x ? 1 : -1;
        u.x = clamp(tgt.x + side * this.attackRange(u, tgt) * 0.7, CONST.FIELD_X0, CONST.FIELD_X1); u.y = tgt.y;
        this.events.push({ type: 'dash', unit: u }); this.events.push({ type: 'bossLeap', unit: u, target: tgt });
      }
    }
    // 후퇴 중이거나 대상이 멀면, 사거리 안의 아무 적이나
    if (!tgt || this.dist(u, tgt) > this.attackRange(u, tgt)) {
      const foes = u.side === 'hero' ? this.aliveEnemies() : this.aliveHeroes();
      tgt = foes.find((f) => this.dist(u, f) <= this.attackRange(u, f)) || null;
    }
    if (tgt) { u.atkTimer = u.atkInterval * (0.95 + this.rng() * 0.1); this._basicAttack(u, tgt); }
    else u.atkTimer = 0.15;
  }

  _enemyAbilities(u, dt, stunned) {
    const d = u.def;
    if (d.abilities.includes('enrage') && !u.enraged && u.hp <= u.maxHp * d.enrageAt) {
      u.enraged = true; u.statuses.enrage = { t: Infinity };
      this.events.push({ type: 'enrage', unit: u });
    }
    if (d.phases) {
      while (u.phase < d.phases.length && u.hp <= u.maxHp * d.phases[u.phase].at) {
        const ph = d.phases[u.phase];
        u.phase++;
        if (ph.chargeR) u.chargeR = ph.chargeR;
        if (ph.chargeTime) u.chargeTime = ph.chargeTime;
        if (ph.chargeEvery) u.chargeEvery = ph.chargeEvery;
        if (ph.chargeMult) u.chargeMult = ph.chargeMult;
        if (ph.enrage) { u.statuses.enrage = { t: Infinity }; u.enraged = true; }
        if (ph.stunImmune) { u.stunImmune = true; delete u.statuses.stun; }
        u.chargeCd = Math.min(u.chargeCd, 2.5);
        this.events.push({ type: 'phase', unit: u, name: ph.name, phase: u.phase + 1 });
        if (ph.summon) this._summon(ph.summon, u);
      }
    }
    if (u.charge) {
      if (stunned && !d.stunNoCancel) this._cancelCast(u, (u.statuses.stun || {}).src);
      else if (!stunned) { u.charge.t -= dt; if (u.charge.t <= 0) this._chargeImpact(u); }
      return;
    }
    if (u.call) {
      if (stunned && !d.stunNoCancel) this._cancelCast(u, (u.statuses.stun || {}).src);
      else if (!stunned) { u.call.t -= dt; if (u.call.t <= 0) { u.call = null; u.callCd = d.callEvery; this._callComplete(u); } }
      return;
    }
    if (d.abilities.includes('buds') && u.x <= 960) this._buds(u, dt);
    if (stunned || u.x > 960) return;
    if (d.abilities.includes('charge')) {
      u.chargeCd -= dt;
      const tgt = u.target && u.target.alive ? u.target : this.nearest(u, this.aliveHeroes());
      if (u.chargeCd <= 0 && tgt && this.dist(u, tgt) < 260) {
        // 원형 위험 범위: 시작 순간의 대상 위치 (피하려면 범위 밖으로 이동)
        u.charge = { t: u.chargeTime, total: u.chargeTime, cx: tgt.x, cy: tgt.y, r: u.chargeR, mult: u.chargeMult };
        u.face = tgt.x >= u.x ? 1 : -1;
        this.events.push({ type: 'chargeStart', unit: u });
        return;
      }
    }
    if (d.abilities.includes('caller')) {
      u.callCd -= dt;
      if (u.callCd <= 0 && this.aliveEnemies().length < 6) { u.call = { t: d.callCast, total: d.callCast }; this.events.push({ type: 'callStart', unit: u }); return; }
    }
    if (d.abilities.includes('warcry')) {
      u.warcryCd -= dt;
      if (u.warcryCd <= 0) { u.warcryCd = d.warcryEvery; for (const e of this.aliveEnemies()) e.statuses.warcry = { t: 6, value: 0.3 }; this.events.push({ type: 'warcry', unit: u }); }
    }
  }

  // 가시덩굴 여왕: 꽃봉오리 2개를 유지하고, 모든 꽃봉오리가 동시에 호출을 시작한다
  _buds(u, dt) {
    const d = u.def;
    if (!u.buds) { u.buds = []; u.budCd = d.budFirst; for (let i = 0; i < (d.budCount || 2); i++) u.buds.push({ unit: null, regrow: 0 }); }
    u.buds.forEach((b, i) => {
      if (b.unit && b.unit.alive) return;
      if (b.unit && !b.unit.alive && !b.regrow) b.regrow = d.budRegrow;
      if (b.regrow > 0) { b.regrow -= dt; if (b.regrow > 0) return; }
      const e = this._makeEnemy('thorn_bud', clamp(Math.min(u.x, 800) - 40 + i * 30, CONST.FIELD_X0, 830), (CONST.FIELD_Y0 + CONST.FIELD_Y1) / 2 + (i - 1) * 26);
      e.callHost = u; b.unit = e; b.regrow = 0;
      this.enemies.push(e); this.events.push({ type: 'summon', unit: e, by: u });
    });
    if (u.statuses.stun || u.broken > 0) return;
    u.budCd -= dt;
    if (u.budCd <= 0) {
      u.budCd = d.budEvery;
      for (const b of u.buds) if (b.unit && b.unit.alive && !b.unit.call) { b.unit.call = { t: b.unit.def.callCast, total: b.unit.def.callCast }; this.events.push({ type: 'callStart', unit: b.unit }); }
    }
  }

  inChargeZone(h, c) { const dx = (h.x - c.cx) / c.r, dy = (h.y - c.cy) / (c.r * 0.45); return dx * dx + dy * dy <= 1; }

  _chargeImpact(u) {
    const c = u.charge;
    u.charge = null;
    u.chargeCd = u.chargeEvery;
    u.intr = null;
    if (CONST.BREAK_V2 && u.poiseMax) { // 끊지 못한 차지 누적 → 격노 스택
      u.unblocked++;
      if (u.unblocked >= CONST.UNBLOCKED_ENRAGE_FROM) { u.enrageStacks++; this.events.push({ type: 'enrageStack', unit: u, n: u.enrageStacks }); }
    }
    const inZone = this.aliveHeroes().filter((h) => this.inChargeZone(h, c));
    // 탱커 막기: 도발(①) 또는 철벽(③)으로 '버티는 중'인 탱커만 동료 피해를 대신 받아낸다 (타이밍 기믹)
    const tank = inZone.find((h) => h.role === 'tank' && h.statuses.guard);
    this.events.push({ type: 'chargeImpact', unit: u, cx: c.cx, cy: c.cy, r: c.r, blocked: !!tank, hit: inZone.length });
    u.anim.lunge = 0.35; u.anim.lungeX = (c.cx - u.x) * 0.5; u.anim.lungeY = (c.cy - u.y) * 0.5;
    for (const h of inZone) {
      let mult = c.mult;
      if (tank && h !== tank) mult *= 0.4;
      if (h === tank) mult *= 0.6;
      if (h.def.traits.includes('cautious')) mult *= 0.5;
      this._damage(u, h, this._atkOf(u) * mult, { charge: true, noCrit: true });
    }
  }

  _basicAttack(u, tgt) {
    if (u.side === 'hero') u.actLock = Math.max(u.actLock, CONST.ACT_LOCK_ATTACK);
    if (u.melee) {
      u.anim.lunge = 0.22; u.anim.lungeX = (tgt.x - u.x) * 0.4; u.anim.lungeY = (tgt.y - u.y) * 0.4;
      u.face = tgt.x >= u.x ? 1 : -1;
      this.delayed.push({ t: 0.1, fn: () => { if (tgt.alive && u.alive) this._damage(u, tgt, this._atkOf(u), { basic: true }); } });
      this.events.push({ type: 'attack', unit: u, target: tgt, melee: true });
    } else {
      u.anim.cast = 0.18; u.face = tgt.x >= u.x ? 1 : -1;
      const travel = 0.12 + this.dist(u, tgt) / 1400;
      this.events.push({ type: 'projectile', from: u, to: tgt, kind: u.key, travel });
      this.delayed.push({ t: travel, fn: () => { if (tgt.alive) this._damage(u, tgt, this._atkOf(u), { basic: true }); } });
    }
  }

  // 짓누름: 지금 스택만큼 피해 배율을 돌려주고 한 스택 쌓는다 (버티는 중이면 쌓이지 않음)
  _crush(h) {
    const s = h.statuses.crush;
    const n = s ? s.n : 0;
    const res = this.crushRes(h);
    if (!h.statuses.guard && !h.statuses.invuln) {
      h.statuses.crush = { t: CONST.CRUSH_DUR, n: Math.min(CONST.CRUSH_MAX, n + 1) };
      if (n + 1 >= 3 && res < 0.5 && !(s && s.warned)) { h.statuses.crush.warned = true; this.events.push({ type: 'crushWarn', unit: h }); }
      else if (s && s.warned) h.statuses.crush.warned = true;
    }
    return 1 + n * CONST.CRUSH_STEP * (1 - res);
  }
  crushRes(h) {
    let r = h.role === 'tank' ? CONST.CRUSH_RES.tank : h.def.traits.includes('sturdy') ? CONST.CRUSH_RES.sturdy : 0;
    r = 1 - (1 - r) * (1 - Math.min(0.8, (h.mods && h.mods.crushres) || 0));
    return r;
  }

  _atkOf(u) {
    let m = 1;
    if (u.statuses.fruit) m += u.statuses.fruit.value;
    if (u.statuses.warcry) m += u.statuses.warcry.value;
    if (u.statuses.inspire) m += u.statuses.inspire.value;
    if (u.side === 'enemy') {
      if (u.enrageStacks) m += u.enrageStacks * CONST.UNBLOCKED_ENRAGE_STACK;
      if (CONST.BREAK_V2 && u.def.softEnrage && this.time > u.def.softEnrage) m += CONST.SOFT_ENRAGE_STEP * Math.floor((this.time - u.def.softEnrage) / 10 + 1);
    }
    if (u.side === 'hero' && u.def.traits.includes('brave')) m += 0.4 * (1 - u.hp / u.maxHp);
    if (u.side === 'hero' && this.focus && u.target === this.focus) m += 0.1; // 집중 공격 보너스
    return u.atk * m;
  }
  _critChance(u) {
    if (u.side !== 'hero') return 0.05;
    let c = CONST.BASE_CRIT;
    if (u.def.traits.includes('keen')) c += 0.1;
    if (this.relics.has('clover')) c += 0.1;
    if (this.torchDark) c -= CONST.TORCH_DARK_CRIT_PENALTY;
    c += (u.mods && u.mods.crit) || 0;
    return clamp(c, 0, CONST.STAT_CAPS.crit);
  }

  // ------------------------------------------------------------ 피해/회복
  _damage(src, tgt, raw, info) {
    if (!tgt.alive) return 0;
    if (tgt.statuses.invuln) return 0;
    info = info || {};
    let dmg = raw, crit = false;
    if (!info.dot) {
      dmg *= 0.9 + this.rng() * 0.2;
      if (!info.noCrit && src && this.rng() < this._critChance(src)) { crit = true; dmg *= CONST.CRIT_MULT + ((src.mods && src.mods.critdmg) || 0); }
    }
    dmg *= 1 - tgt.defPct;
    if (src && src.side === 'hero' && src.levelGap) dmg *= levelGapMult(src.levelGap).dealt;
    if (tgt.side === 'hero' && tgt.levelGap && src && src.side === 'enemy') dmg *= levelGapMult(tgt.levelGap).taken;
    if (info.basic && tgt.side === 'hero' && src && src.side === 'enemy' && src.def.abilities.includes('boss')) dmg *= this._crush(tgt);
    if (tgt.armor && !(tgt.broken > 0)) dmg *= 1 - (tgt.armorBoost > 0 ? Math.max(tgt.armor, tgt.armorBoostV || CONST.UNBLOCKED_CALL_ARMOR) : tgt.armor); // 방어 태세
    if (tgt.broken > 0) dmg *= 1 + CONST.BREAK_BONUS + ((src && src.mods && src.mods.vsbroken) || 0); // 그로기
    if (src && src.mods && src.mods.nonbroken && tgt.poiseMax && !(tgt.broken > 0)) dmg *= 1 + src.mods.nonbroken; // 달빛 맹세 단점
    if (src && src.statuses && src.statuses.weaken) dmg *= 1 - src.statuses.weaken.value;
    if (src && !src.melee && src.side === 'hero' && tgt.def.frontRangedDmg && (src.x - tgt.x) * tgt.face > 0) dmg *= tgt.def.frontRangedDmg; // 사슴왕 안개: 정면 원거리 피해 감소
    if (tgt.statuses.vuln) dmg *= 1.25;
    if (tgt.statuses.guard) dmg *= 1 - tgt.statuses.guard.value;
    if (tgt.side === 'hero' && tgt.role === 'tank' && this.relics.has('bark')) dmg *= 0.85;
    dmg = Math.max(1, Math.round(dmg));
    if (tgt.side === 'hero' && !tgt.stubbornUsed && tgt.hp - dmg < tgt.maxHp * 0.25 && tgt.hp - dmg > 0) { // 끈질긴 생명
      const v = this.passive(tgt, 'stubborn');
      if (v) { tgt.stubbornUsed = true; tgt.statuses.invuln = { t: v }; this.events.push({ type: 'passive', unit: tgt, name: '끈질긴 생명' }); }
    }
    if (tgt.statuses.shield) { // 보호막이 먼저 받는다
      const sh = tgt.statuses.shield, ab = Math.min(sh.value, dmg);
      sh.value -= ab; dmg -= ab;
      if (sh.value <= 0) delete tgt.statuses.shield;
      if (dmg <= 0) { this.events.push({ type: 'hit', target: tgt, src, amount: 0, shielded: true }); return 0; }
    }
    tgt.hp -= dmg;
    tgt.anim.hurt = 0.18;
    if (src && src.statuses && src.statuses.lifesteal && src.alive) this._heal(src, src, dmg * src.statuses.lifesteal.value, true);
    if (src && src.stats) src.stats.dealt += dmg;
    if (tgt.stats) tgt.stats.taken += dmg;
    if (src && src.side === 'hero') this._gainUlt(src, dmg * CONST.ULT_GAIN_DEAL);
    if (tgt.side === 'hero') this._gainUlt(tgt, dmg * CONST.ULT_GAIN_TAKE);
    if (src && src.side === 'hero' && !info.dot) this._poiseHit(src, tgt, info.skill ? CONST.POISE_SKILL : CONST.POISE_BASIC, info.skill ? 'skill' : 'basic');
    this.events.push({ type: 'hit', target: tgt, src, amount: dmg, crit, dot: info.dot || null, charge: !!info.charge, skill: info.skill || null });
    if (tgt.hp <= 0) {
      tgt.hp = 0; tgt.alive = false; tgt.charge = null; tgt.call = null; tgt.statuses = {};
      if (tgt.side === 'enemy') { this.kills++; if (src && src.stats) src.stats.kills++; }
      this.events.push({ type: 'death', unit: tgt });
    }
    return dmg;
  }

  // 그로기 게이지 감소 → 0이면 그로기
  // 그로기 게이지 감소 → 0이면 그로기. kind: basic|skill|stun|cancel|ult|intrfail (통계·규칙용)
  _poiseHit(src, tgt, amount, kind) {
    if (!tgt.alive || !tgt.poiseMax || tgt.broken > 0) return;
    let m = 1 + ((src && src.mods && src.mods.breakdmg) || 0);
    if (CONST.BREAK_V2) {
      if (tgt.breakLock > 0) return;
      if (tgt.shaken > 0 && (kind === 'basic' || kind === 'skill' || kind === 'ult')) m *= CONST.SHAKE_MULT;
      if (src && src.statuses && src.statuses.resonance) m *= 1 + src.statuses.resonance.value; // 서포터 증폭
      if (tgt.statuses.exposed) m *= 1 + tgt.statuses.exposed.value;
      if (src && tgt.def.backOnly && (src.x - tgt.x) * tgt.face > 0) m *= tgt.def.backOnly; // 정면 피격 그로기 감소 (안개 사슴왕)
      if (kind === 'stun' && tgt.def.stunMult) m *= tgt.def.stunMult;
    }
    const amt = amount * m;
    this.poiseLog[kind || 'other'] = (this.poiseLog[kind || 'other'] || 0) + amt;
    tgt.poise -= amt;
    if (tgt.poise <= 0) {
      tgt.poise = 0; tgt.broken = CONST.BREAK_DUR;
      tgt.charge = null; tgt.call = null; tgt.intr = null; tgt.shaken = 0;
      tgt.breaks++; tgt.stunHist = [];
      if (CONST.BREAK_V2) tgt.poiseMax = Math.min(tgt.poiseBase * CONST.BREAK_GROWTH_CAP, tgt.poiseBase * (1 + CONST.BREAK_GROWTH * tgt.breaks));
      this.breakLog.push(this.time);
      this.events.push({ type: 'break', unit: tgt });
      for (const h of this.aliveHeroes()) { const v = this.passive(h, 'hunter_rain'); if (v) h.cds.s2 = Math.max(0, h.cds.s2 - this.skillCdMax(h, 's2') * v); } // 여우비
    }
  }
  // 흔들림: 회복 정지 + 그로기 ×1.5. extend면 연장(최대 12초)
  _shake(tgt, dur, extend) {
    if (!CONST.BREAK_V2 || !tgt.poiseMax || tgt.broken > 0) return;
    const was = tgt.shaken > 0;
    tgt.shaken = extend ? Math.min(CONST.SHAKE_MAX, tgt.shaken + dur) : Math.max(tgt.shaken, dur);
    tgt.regenDelay = 0;
    if (!was) this.events.push({ type: 'shake', unit: tgt });
  }
  // 차지·호출 끊기 (기절 또는 끊기 포인트 합산 성공)
  _cancelCast(u, src) {
    const wasCall = !!u.call;
    if (u.charge) { u.charge = null; u.chargeCd = u.chargeEvery * 0.8; this.events.push({ type: 'chargeCancel', unit: u }); }
    if (u.call) { u.call = null; u.callCd = u.def.callEvery; this.events.push({ type: 'callCancel', unit: u }); }
    u.intr = null;
    this._onCancel(src);
    if (u.poiseMax) { this._poiseHit(src, u, CONST.POISE_CANCEL, 'cancel'); this._shake(u, CONST.SHAKE_DUR); }
    return wasCall;
  }
  // 끊기 포인트: 2초 창 안에 합산, 저항 이상이면 끊김
  _interrupt(src, u, pts) {
    if (!(u.charge || u.call)) return false;
    if (!CONST.BREAK_V2) return false;
    const resist = u.def.interruptResist || (u.size > 1 ? CONST.INTERRUPT_RESIST : CONST.INTERRUPT_RESIST_SMALL);
    if (!u.intr) u.intr = { pts: 0, t: CONST.INTERRUPT_WINDOW, src, roles: {} };
    const role = (src && src.role) || 'other';
    u.intr.pts += u.intr.roles[role] ? Math.floor(pts * CONST.INTERRUPT_SAME_ROLE) : pts; // 같은 직업은 한 번만
    u.intr.roles[role] = (u.intr.roles[role] || 0) + 1;
    this.events.push({ type: 'interrupt', unit: u, pts: u.intr.pts, resist });
    if (u.intr.pts >= resist) { this._cancelCast(u, src); return true; }
    return false;
  }
  _interruptFail(u) { // 실패한 끊기 시도는 절반을 그로기로
    const it = u.intr; u.intr = null;
    if (it && it.pts > 0 && u.poiseMax) this._poiseHit(it.src, u, it.pts * CONST.INTERRUPT_PIP_POISE, 'intrfail');
  }
  // 끊지 못한 호출: 소환 + 방어 태세 강화
  _callComplete(u) {
    const d = u.def;
    this._summon(new Array(d.callCount || 1).fill(d.callUnit || 'goblin'), u.callHost || u);
    if (CONST.BREAK_V2) { const host = u.callHost || u; if (host.def.calledHeal && host.alive) this._heal(null, host, host.maxHp * host.def.calledHeal, true); if (host.poiseMax) { host.armorBoost = host.def.calledArmorDur || CONST.UNBLOCKED_CALL_DUR; host.armorBoostV = host.def.calledArmor || CONST.UNBLOCKED_CALL_ARMOR; this.events.push({ type: 'armorUp', unit: host }); } }
  }

  _heal(src, tgt, amount, silent) {
    if (!tgt.alive) return 0;
    let a = amount * (silent ? 1 : CONST.HEAL_MULT) * (1 + ((src && src.mods && src.mods.heal) || 0));
    if (src && src.def && src.def.traits && src.def.traits.includes('gentle')) a *= 1.15;
    if (tgt.statuses.burn) a *= 0.5;
    a = Math.round(Math.min(a, tgt.maxHp - tgt.hp));
    if (a <= 0) return 0;
    tgt.hp += a;
    if (src && src.stats) src.stats.healed += a;
    if (src && src.side === 'hero' && !silent) this._gainUlt(src, a * CONST.ULT_GAIN_HEAL);
    this.events.push({ type: 'heal', target: tgt, amount: a, quiet: !!silent });
    return a;
  }

  _gainUlt(h, amt) {
    if (h.mods && h.mods.ultonlybreak && !this.enemies.some((e) => e.alive && e.broken > 0)) return; // 숲의 첫 숨 단점
    this._gainUltRaw(h, amt);
  }
  _gainUltRaw(h, amt) {
    if (!h.alive) return;
    const before = h.ult;
    h.ult = Math.min(100, h.ult + amt * (this.relics.has('stardust') ? 1.3 : 1) * (1 + Math.min((h.mods && h.mods.ultgain) || 0, CONST.STAT_CAPS.ultgain)));
    if (before < 100 && h.ult >= 100) { h.ultFullAt = this.time; this.events.push({ type: 'ultReady', unit: h }); }
  }

  _applyStatus(src, tgt, eff) {
    if (!tgt.alive) return;
    if (eff.status === 'stun' && tgt.stunImmune) { this.events.push({ type: 'immune', unit: tgt }); return; }
    let dur = eff.dur;
    const sm = (src && src.mods) || {};
    if ((eff.status === 'stun' || eff.status === 'taunt') && sm.ccdur) dur *= 1 + sm.ccdur;
    if (eff.status === 'burn') { if (this.relics.has('ember')) dur += 2; if (src && src.def.traits && src.def.traits.includes('cautious')) dur += 1; }
    const s = { t: dur, src };
    if (eff.dps) s.dps = this._atkOf(src) * eff.dps * (1 + (sm.dotdmg || 0));
    if (eff.value) s.value = eff.value;
    const prev = tgt.statuses[eff.status];
    if (prev && prev.dps && s.dps) s.dps = Math.max(prev.dps, s.dps);
    if (prev) s.acc = prev.acc;
    tgt.statuses[eff.status] = s;
    this.events.push({ type: 'status', target: tgt, status: eff.status });
    if (eff.status === 'stun' && tgt.side === 'enemy') {
      let dr = 1;
      if (CONST.BREAK_V2 && tgt.poiseMax) { // 15초 안 반복 기절은 점감
        tgt.stunHist = tgt.stunHist.filter((t) => this.time - t < CONST.STUN_DR_WINDOW);
        dr = CONST.STUN_DR[Math.min(tgt.stunHist.length, CONST.STUN_DR.length - 1)];
        tgt.stunHist.push(this.time);
        s.t = dur * dr * (tgt.def.stunMult || 1);
      }
      this._poiseHit(src, tgt, CONST.POISE_STUN * dr, 'stun');
      this._shake(tgt, CONST.SHAKE_DUR);
    }
  }

  // ------------------------------------------------------------ 스킬 (s1 ① 기본 / s2 ② 상황 / ult ③ 필살기)
  skillDef(h, slot) { if (slot === 'ult' && h.ultDef) return h.ultDef; return SKILLS[slot === 'ult' ? h.def.ult : h.def.skills[slot === 's1' ? 0 : 1]]; }
  skillUp(h, slot) { return h.upgrades[slot] || { power: 0, cd: 0 }; }
  skillCdMax(h, slot) { const d = this.skillDef(h, slot); const m = h.mods || {}; return d.cd * Math.pow(REWARD.skillUpgradeCd, this.skillUp(h, slot).cd) * (1 - Math.min((m.cdr || 0) + (m[slot + 'cd'] || 0), CONST.STAT_CAPS.cdr)); }

  canCast(h, slot) {
    if (!h || !h.alive || this.outcome || this.introT > 0) return false;
    if (h.statuses.stun) return false;
    if (slot === 'ult') return h.ult >= 100;
    return h.cds[slot] <= 0;
  }

  // ② 상황 스킬 추천 상태: '' | 'hint'(추천) | 'now'(위험 대응)
  skillHint(h, slot) {
    const sk = this.skillDef(h, slot);
    if (!h.alive) return '';
    if (sk.interrupt && this.aliveEnemies().some((e) => (e.charge || e.call) && e.x < 960)) return 'now';
    if (!sk.hint) return '';
    switch (sk.hint) {
      case 'enemyCharging': return this.aliveEnemies().some((e) => e.charge || e.call) ? 'now' : '';
      case 'nearEnemies': return this.aliveEnemies().filter((e) => this.dist(h, e) <= sk.areaR + 10).length >= 2 ? 'hint' : '';
      case 'cluster': { const p = this.bestAreaPoint(sk.areaR, this.aliveEnemies()); return p && p.n >= 3 ? 'hint' : ''; }
      case 'alliesHurt': return this.aliveHeroes().filter((a) => this.hpPct(a) <= 0.7).length >= 2 ? 'hint' : '';
      default: return '';
    }
  }

  // 원형 범위에 가장 많이 들어가는 지점
  bestAreaPoint(r, list, filter) {
    let best = null;
    for (const c of list) {
      const n = list.filter((o) => this.distXY(o, c.x, c.y) <= r + o.size * 8 && (!filter || filter(o))).length;
      if (!best || n > best.n) best = { x: c.x, y: c.y, n };
    }
    return best;
  }

  unitsInArea(h, slot, x, y) {
    const sk = this.skillDef(h, slot);
    if (sk.target === 'self_area') { x = h.x; y = h.y; }
    const list = sk.target === 'area_ally' ? this.aliveHeroes() : this.aliveEnemies();
    return list.filter((u) => this.distXY(u, x, y) <= sk.areaR + (u.size || 1) * 8);
  }

  // spec: { unit } | { x, y } | {}
  cast(h, slot, spec) {
    if (!this.canCast(h, slot)) return false;
    const sk = this.skillDef(h, slot);
    const pmul = (1 + this.skillUp(h, slot).power * REWARD.skillUpgradePower) * (1 + ((h.mods && h.mods[slot === 'ult' ? 'ultpow' : slot + 'pow']) || 0));
    const dmul = pmul * (1 + ((h.mods && h.mods.skilldmg) || 0)); // 스킬 피해 보정 (회복에는 미적용)
    spec = spec || {};
    if ((sk.target === 'enemy' || sk.target === 'ally') && (!spec.unit || !spec.unit.alive)) return false;
    if ((sk.target === 'area_enemy' || sk.target === 'area_ally') && spec.x === undefined) return false;
    if (slot === 'ult') { h.ult = 0; this.events.push({ type: 'ult', unit: h, skill: sk }); }
    else h.cds[slot] = this.skillCdMax(h, slot);
    h.castLock = 0.35;
    h.actLock = Math.max(h.actLock, slot === 'ult' ? CONST.ACT_LOCK_ULT : CONST.ACT_LOCK_SKILL);
    h.anim.cast = 0.3;
    const atk = this._atkOf(h);
    const fxDelay = sk.delay || { meteor: 0.55, arrowrain: 0.5, nova: 0.35, starbolt: 0.22, pierce: 0.16, snipe: 0.3 }[sk.fx] || 0.08;
    if (sk.delay) { h.casting = { t: sk.delay, total: sk.delay, name: sk.name }; h.actLock = Math.max(h.actLock, sk.delay + 0.2); } // 긴 시전: 끝날 때까지 이동 불가
    if (sk.selfCost) h.hp = Math.max(1, h.hp - h.maxHp * sk.selfCost);
    if (spec.unit) h.face = spec.unit.x >= h.x ? 1 : -1;
    else if (spec.x !== undefined) h.face = spec.x >= h.x ? 1 : -1;
    this.events.push({ type: 'cast', unit: h, skill: sk, slot, spec, delay: fxDelay });
    const applyEffects = (tgt) => { for (const e of sk.effects) if (!e.to) this._applyStatus(h, tgt, e); };
    const hit = (e) => this._skillHit(h, sk, e, atk * sk.power * dmul);
    const healAmt = (a) => (atk * (sk.heal || 0) + a.maxHp * (sk.healPct || 0)) * pmul;
    const support = (a) => { // 아군 대상 공통: 보호막·해제
      if (sk.shieldPct) a.statuses.shield = { t: 8, value: a.maxHp * sk.shieldPct * pmul };
      if (sk.cleanse) this._cleanse(a);
    };
    switch (sk.target) {
      case 'enemy': {
        const tgt = spec.unit;
        if (h.melee) { // 근접 스킬은 대상에게 순간 돌진
          const side = h.x <= tgt.x ? -1 : 1;
          const r = this.attackRange(h, tgt) * 0.7;
          if (this.dist(h, tgt) > r + 10) { h.x = tgt.x + side * r; h.y = tgt.y; this.events.push({ type: 'dash', unit: h }); }
          h.anim.lunge = 0.25; h.anim.lungeX = (tgt.x - h.x) * 0.5; h.anim.lungeY = 0;
        }
        const hits = sk.hits || 1;
        for (let i = 0; i < hits; i++) this.delayed.push({ t: fxDelay + i * 0.11, fn: () => { if (!tgt.alive || !h.alive) return; hit(tgt); if (i === 0 || i === hits - 1) applyEffects(tgt); } });
        break;
      }
      case 'multi_enemy': { // HP 비율 낮은 적부터 연속 타격
        const list = this.aliveEnemies().slice().sort((a, b) => this.hpPct(a) - this.hpPct(b)).slice(0, sk.count || 3);
        list.forEach((tgt, i) => this.delayed.push({ t: fxDelay + i * 0.22, fn: () => { if (!tgt.alive || !h.alive) return; this.events.push({ type: 'dash', unit: h }); hit(tgt); applyEffects(tgt); } }));
        break;
      }
      case 'ally': {
        const tgt = spec.unit;
        this.delayed.push({ t: fxDelay, fn: () => { if (!tgt.alive) return; if (sk.heal || sk.healPct) this._heal(h, tgt, healAmt(tgt)); support(tgt); applyEffects(tgt); } });
        break;
      }
      case 'area_enemy': case 'self_area': {
        const cx = sk.target === 'self_area' ? h.x : spec.x, cy = sk.target === 'self_area' ? h.y : spec.y;
        if (sk.target === 'self_area') { h.anim.lunge = 0.3; h.anim.lungeX = 0; h.anim.lungeY = 0; }
        const hits = sk.hits || 1;
        for (let i = 0; i < hits; i++) this.delayed.push({ t: fxDelay + i * 0.13, fn: () => {
          if (!h.alive && sk.target === 'self_area') return;
          for (const e of this.aliveEnemies()) if (this.distXY(e, cx, cy) <= sk.areaR + e.size * 8) { hit(e); if (i === 0) applyEffects(e); }
        } });
        spec.x = cx; spec.y = cy;
        break;
      }
      case 'area_ally': {
        const cx = spec.x, cy = spec.y;
        this.delayed.push({ t: fxDelay, fn: () => { for (const a of this.aliveHeroes()) if (this.distXY(a, cx, cy) <= sk.areaR) { this._heal(h, a, healAmt(a)); support(a); } } });
        break;
      }
      case 'all_enemies': {
        const hits = sk.hits || 1;
        for (let i = 0; i < hits; i++) this.delayed.push({ t: fxDelay + i * 0.15, fn: () => { for (const e of this.aliveEnemies()) { hit(e); if (i === 0) applyEffects(e); } } });
        break;
      }
      case 'party': {
        this.delayed.push({ t: fxDelay, fn: () => { for (const a of this.aliveHeroes()) { if (sk.heal || sk.healPct) this._heal(h, a, healAmt(a)); support(a); } } });
        break;
      }
      default: break;
    }
    // 공통 부가 효과
    if (sk.partyHealPct) this.delayed.push({ t: fxDelay, fn: () => { for (const a of this.aliveHeroes()) this._heal(h, a, a.maxHp * sk.partyHealPct * pmul); } });
    if (sk.revive) this.delayed.push({ t: fxDelay, fn: () => this._revive(h, sk.revive) });
    if (sk.cdReduce) for (const a of this.aliveHeroes()) if (a !== h) { a.cds.s1 = Math.max(0, a.cds.s1 - sk.cdReduce); a.cds.s2 = Math.max(0, a.cds.s2 - sk.cdReduce); }
    if (sk.ultGive) for (const a of this.aliveHeroes()) if (a !== h) this._gainUltRaw(a, sk.ultGive);
    for (const e of sk.effects) {
      if (e.to === 'self') this._applyStatus(h, h, e);
      else if (e.to === 'party') for (const a of this.aliveHeroes()) this._applyStatus(h, a, Object.assign({}, e, { value: e.value * (e.status === 'regen' ? pmul : 1) }));
      else if (e.to === 'all_enemies') for (const en of this.aliveEnemies()) this._applyStatus(h, en, e);
    }
    return true;
  }

  // 스킬 1타: 그로기 배율 · 처형 · 추가 그로기 · 독 폭발 · 흡혈 · 파티 회복
  _skillHit(h, sk, e, raw) {
    if (!e.alive) return 0;
    let mult = 1;
    if (sk.brokenMult && e.broken > 0) mult *= sk.brokenMult;
    if (sk.execute && e.hp / e.maxHp <= sk.execute.below) mult *= sk.execute.mult;
    const d = raw > 0 ? this._damage(h, e, raw * mult, { skill: sk.fx }) : 0;
    if (sk.detonate && e.alive && e.statuses[sk.detonate.status]) {
      const st = e.statuses[sk.detonate.status];
      const burst = (st.dps || 0) * Math.max(0, st.t) * sk.detonate.mult;
      delete e.statuses[sk.detonate.status];
      if (burst > 0) this._damage(h, e, burst, { dot: sk.detonate.status, burst: true });
    }
    if (sk.interrupt && e.alive && (e.charge || e.call)) {
      const back = (h.x - e.x) * e.face < 0; // 적이 보는 방향의 반대편 = 후방
      this._interrupt(h, e, Math.max(1, Math.floor(sk.interrupt * (sk.interruptBack && !back ? sk.interruptBack : 1))));
    }
    if (sk.shakeExtend && e.alive && e.shaken > 0) this._shake(e, sk.shakeExtend, true);
    if (sk.poise && e.alive && e.poiseMax) this._poiseHit(h, e, sk.poise * (CONST.BREAK_V2 && !(e.shaken > 0) ? CONST.ULT_POISE_OUTSIDE : 1), 'ult');
    if (d && sk.lifesteal && h.alive) this._heal(h, h, d * sk.lifesteal, true);
    if (d && sk.partyHeal) { const al = this.aliveHeroes(); for (const a of al) this._heal(h, a, d * sk.partyHeal / al.length, true); }
    return d;
  }
  _cleanse(u) { for (const k of ['stun', 'bleed', 'burn', 'poison', 'weaken', 'slow', 'vuln']) delete u.statuses[k]; }
  _revive(h, pct) {
    const dead = this.heroes.find((u) => !u.alive);
    if (!dead) return;
    dead.alive = true; dead.hp = Math.round(dead.maxHp * pct); dead.statuses = {}; dead.ult = 0;
    dead.x = clamp(h.x - 30, CONST.FIELD_X0, CONST.FIELD_X1); dead.y = h.y; dead.cmd = null;
    this.events.push({ type: 'revive', unit: dead });
  }

  // 탭 시전용 자동 대상 / 자동 전략 대상
  resolveTarget(h, slot, rule) {
    const sk = this.skillDef(h, slot);
    const enemies = this.aliveEnemies(), allies = this.aliveHeroes();
    const lowestAlly = () => allies.reduce((a, b) => (!a || this.hpPct(b) < this.hpPct(a) ? b : a), null);
    rule = rule || (sk.target === 'ally' || sk.target === 'area_ally' ? 'lowestAlly' : sk.hint === 'enemyCharging' ? 'charging' : 'focus');
    const casting = sk.interrupt ? enemies.find((e) => (e.charge || e.call) && this.dist(h, e) <= Math.max(this.attackRange(h, e), 240)) : null;
    const pickEnemy = () => {
      if (!enemies.length) return null;
      if (casting) return casting; // 끊기 스킬은 시전 중인 적 우선
      if (rule === 'charging') return enemies.find((e) => e.charge) || enemies.find((e) => e.call) || (this.focus && this.focus.alive ? this.focus : this.nearest(h, enemies));
      if (rule === 'focus' && this.focus && this.focus.alive) return this.focus;
      if (rule === 'weakest') return enemies.reduce((a, b) => (b.hp < a.hp ? b : a));
      if (h.target && h.target.alive && rule === 'focus') return h.target;
      return this.nearest(h, enemies);
    };
    switch (sk.target) {
      case 'enemy': { const u = pickEnemy(); return u ? { unit: u } : null; }
      case 'ally': {
        const u = rule === 'tank' ? (this.tankHero() || lowestAlly()) : lowestAlly();
        if (u && (u.hp < u.maxHp || sk.shieldPct)) return { unit: u };
        if (sk.effects.some((e) => e.status === 'resonance')) { // 다친 아군이 없으면 그로기 담당에게 공명
          const pick = allies.filter((a) => a !== h).sort((a, b) => b.atk - a.atk)[0];
          return pick ? { unit: pick } : null;
        }
        return null;
      }
      case 'area_enemy': {
        if (!enemies.length) return null;
        if (casting) { // 끊기: 시전 중인 적들을 최대한 많이 포함
          const p = this.bestAreaPoint(sk.areaR, enemies.filter((e) => e.charge || e.call));
          return { x: p.x, y: p.y };
        }
        const p = this.bestAreaPoint(sk.areaR, enemies);
        return { x: p.x, y: p.y };
      }
      case 'area_ally': {
        const p = this.bestAreaPoint(sk.areaR, allies, (a) => a.hp < a.maxHp);
        return p ? { x: p.x, y: p.y } : null;
      }
      case 'self_area': return enemies.some((e) => this.dist(h, e) <= sk.areaR + 10) ? {} : null;
      case 'all_enemies': case 'multi_enemy': return enemies.length ? {} : null;
      default: return {};
    }
  }

  // 파티의 끊기 수단(기절 + 끊기 포인트)으로 이 적의 차지·호출을 끊을 수 있는가
  canPartyCancel(e) {
    const resist = e.def.interruptResist || (e.size > 1 ? CONST.INTERRUPT_RESIST : CONST.INTERRUPT_RESIST_SMALL);
    let pts = 0; const roles = {};
    for (const h of this.aliveHeroes()) for (const slot of ['s1', 's2']) {
      const sk = this.skillDef(h, slot);
      if (sk.effects.some((x) => x.status === 'stun') && !e.def.stunNoCancel && !e.stunImmune) return true;
      if (sk.interrupt && !roles[h.role]) { pts += sk.interrupt; roles[h.role] = 1; }
    }
    return CONST.BREAK_V2 && pts >= resist;
  }
  checkCond(h, slot, c) {
    switch (c.cond) {
      case 'always': return true;
      case 'hint': return this.skillHint(h, slot) !== '';
      case 'allyHpBelow': return this.aliveHeroes().some((a) => this.hpPct(a) * 100 <= c.param);
      case 'enemyHpBelow': return this.aliveEnemies().some((e) => this.hpPct(e) * 100 <= c.param);
      case 'enemyCharging': return this.aliveEnemies().some((e) => e.charge || e.call);
      case 'enemyCountGte': return this.aliveEnemies().length >= c.param;
      case 'saveForCharge': { // 차지·호출 능력을 가진 적이 있으면 그 순간에만, 없으면 바로
        const threats = this.aliveEnemies().filter((e) => (e.def.abilities.includes('charge') || e.def.abilities.includes('caller')) && this.canPartyCancel(e));
        if (!threats.length || threats.some((e) => e.charge || e.call)) return true;
        // 짓누름이 쌓인 동료를 보스가 때리고 있으면 시선을 뺏는다 (차지가 곧 오면 아껴 둔다)
        const soon = threats.some((e) => e.def.abilities.includes('charge') && e.chargeCd < 2.5);
        return !soon && this.aliveEnemies().some((e) => e.def.abilities.includes('boss') && e.target && e.target !== h && e.target.alive && e.target.statuses.crush && e.target.statuses.crush.n >= 2);
      }
      case 'auto': { // 필살기 종류에 맞춰 자동: 부활 / 회복 / 그로기 만들기 / 무방비 수확
        const sk = this.skillDef(h, slot);
        const big = this.aliveEnemies().filter((e) => e.poiseMax && e.x < 960);
        if (sk.revive) return this.heroes.some((u) => !u.alive);
        const healer = (sk.heal || sk.healPct || sk.shieldPct) && !sk.power;
        if (healer) return this.aliveHeroes().some((a) => this.hpPct(a) <= 0.6);
        if (!sk.power && sk.effects.some((e) => e.status === 'regen')) return this.aliveHeroes().some((a) => this.hpPct(a) <= 0.7);
        const defensive = !sk.power && sk.effects.some((e) => ['guard', 'invuln', 'taunt', 'shield'].includes(e.status));
        if (defensive) return this.aliveEnemies().some((e) => e.charge) || this.aliveHeroes().some((a) => this.hpPct(a) <= 0.55); // 방어형: 차지가 오거나 위험할 때
        const breaker = sk.poise || sk.interrupt || sk.effects.some((e) => e.status === 'stun');
        if (breaker) return !big.length || big.some((e) => e.shaken > 0 || e.charge || e.call);
        if (!big.length || big.some((e) => e.broken > 0)) return true;
        if (h.ultFullAt !== undefined && this.time - h.ultFullAt > 8) return true; // 너무 오래 아끼지 않음
        return !big.some((e) => e.poise / e.poiseMax <= 0.4 || (e.shaken > 0 && e.poise / e.poiseMax <= 0.7));
      }
      case 'smartInterrupt': { // 끊기 스킬: 지금 시전 중인 적이 있거나, 다음 차지·호출 전에 쿨이 돌아오면 사용
        const threats = this.aliveEnemies().filter((e) => (e.def.abilities.includes('charge') || e.def.abilities.includes('caller')) && e.x < 960);
        if (!threats.length || threats.some((e) => e.charge || e.call)) return true;
        if (!threats.some((e) => this.canPartyCancel(e))) return true; // 아껴도 못 끊는 상대면 그냥 사용
        const next = Math.min(...threats.map((e) => Math.min(e.def.abilities.includes('charge') ? e.chargeCd : 99, e.def.abilities.includes('caller') ? e.callCd : 99)));
        return next > this.skillCdMax(h, slot) + 0.5;
      }
      case 'breakWindow': { // 그로기 중이면 지금, 그로기가 임박(게이지 45% 이하)하면 아껴둠, 아니면 바로
        const big = this.aliveEnemies().filter((e) => e.poiseMax);
        if (!big.length || big.some((e) => e.broken > 0)) return true;
        return !big.some((e) => e.poise / e.poiseMax <= 0.45);
      }
      default: return false;
    }
  }

  // 전략 ON: 스킬별 설정(자동 여부 · 조건 · 대상)대로 시전
  _heroAI() {
    for (const h of this.heroes) {
      if (!h.alive || h.castLock > 0 || h.statuses.stun || this.travelling(h)) continue;
      const st = this.strategy[h.key] || AI_PRESETS[h.key];
      for (const slot of ['s2', 'ult', 's1']) {
        const c = st[slot];
        if (!c || !c.auto || !this.canCast(h, slot) || !this.checkCond(h, slot, c)) continue;
        const spec = this.resolveTarget(h, slot, c.target);
        // 위치 명령으로 자리를 지키는 근접 캐릭터는 자동 스킬로 돌진해 자리를 이탈하지 않는다
        if (spec && spec.unit && h.melee && h.cmd && h.cmd.type === 'move' && this.skillDef(h, slot).target === 'enemy' && this.dist(h, spec.unit) > this.attackRange(h, spec.unit) + 10) continue;
        if (spec && this.cast(h, slot, spec)) break;
      }
    }
  }

  summary() {
    return { outcome: this.outcome, time: this.time, kills: this.kills, heroes: this.heroes.map((h) => ({ id: h.key, hp: Math.max(0, Math.round(h.hp)), alive: h.alive, stats: h.stats })) };
  }
}

BattleSim.runHeadless = function (opts, maxTime) {
  const sim = new BattleSim(Object.assign({ autoMode: true }, opts));
  const lim = maxTime || 300;
  while (!sim.outcome && sim.time < lim) { sim.step(CONST.SIM_DT); sim.events.length = 0; }
  return sim;
};
