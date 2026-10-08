// ===== 06_battle_sim.js : 전투 시뮬레이션 (순수 로직) =====
// 렌더/DOM을 전혀 모른다. step(dt)로만 진행하고 events[]에 연출용 이벤트를 쌓는다.
// 같은 시드 + 같은 입력(명령과 그 시점) → 같은 결과.

let _uidSeq = 1;

class BattleSim {
  // opts: { seed, stage, waves:[[enemyId...]], heroes:[{id, hp, maxHp, upgrades}], relics:[id], fruit:{bonus}, torchDark, strategy, autoMode }
  constructor(opts) {
    this.rng = makeRng(opts.seed >>> 0);
    this.stage = opts.stage || 1;
    this.scale = STAGE_SCALE[clamp(this.stage - 1, 0, STAGE_SCALE.length - 1)];
    this.waves = opts.waves.map((w) => w.slice());
    this.partyScale = PARTY_ENEMY_SCALE[clamp(opts.partySize || opts.heroes.length, 1, 3)] || 1;
    this.waveIndex = 0;
    this.waveTimer = -1;
    this.relics = new Set(opts.relics || []);
    this.fruit = opts.fruit || null;
    this.torchDark = !!opts.torchDark;
    this.strategy = opts.strategy || {};
    this.autoMode = opts.autoMode !== undefined ? opts.autoMode : true;
    this.time = 0;
    this.events = [];
    this.delayed = [];
    this.outcome = null;
    this.heroes = [];
    this.enemies = [];
    this.kills = 0;
    this.introT = CONST.BATTLE_INTRO; // 입장 연출: 이 동안은 이동만
    for (const h of opts.heroes) this.heroes.push(this._makeHero(h));
    this._layoutHeroes(true);
    this._spawnWave(0, true);
    if (this.relics.has('acorn')) {
      for (const h of this.aliveHeroes()) this._heal(null, h, h.maxHp * 0.1, true);
    }
  }

  // ------------------------------------------------------------ 생성
  _makeHero(h) {
    const def = HEROES[h.id];
    const u = {
      uid: _uidSeq++, side: 'hero', key: h.id, def, name: def.name, sprite: def.sprite, role: def.role,
      hp: h.hp, maxHp: h.maxHp, atk: def.atk, atkInterval: def.atkInterval, defPct: def.def, size: 1,
      x: CONST.HERO_FRONT_X - 300, homeX: 0, atkTimer: 0.4 + this.rng() * 0.8,
      statuses: {}, cds: { s1: 1.5 + this.rng() * 1.5, s2: 3 + this.rng() * 2 }, ult: 0,
      upgrades: h.upgrades || {}, alive: h.hp > 0, castLock: 0,
      anim: { lunge: 0, lungeX: 0, hurt: 0, cast: 0 },
      stats: { dealt: 0, healed: 0, taken: 0, kills: 0 },
    };
    if (this.fruit && this.fruit.bonus > 0) u.statuses.fruit = { t: Infinity, value: this.fruit.bonus };
    return u;
  }

  _makeEnemy(id, spawnX) {
    const def = ENEMIES[id];
    const sc = def.fixedScale ? 1 : this.scale;
    const hpMul = (def.fixedScale ? 1 : CONST.ENEMY_HP_MULT) * this.partyScale, atkMul = def.fixedScale ? 1 : CONST.ENEMY_ATK_MULT;
    const u = {
      uid: _uidSeq++, side: 'enemy', key: id, def, name: def.name, sprite: def.sprite,
      hp: Math.round(def.hp * sc * hpMul), maxHp: Math.round(def.hp * sc * hpMul), atk: def.atk * sc * atkMul, atkInterval: def.atkInterval,
      defPct: def.def, size: def.size, x: spawnX, homeX: spawnX, atkTimer: 0.6 + this.rng() * 1.0,
      statuses: {}, alive: true,
      charge: null, chargeCd: def.chargeEvery ? def.chargeEvery * (0.45 + this.rng() * 0.25) : 0,
      chargeEvery: def.chargeEvery, chargeTime: def.chargeTime, chargeMult: def.chargeMult, chargeZone: def.chargeZone,
      call: null, callCd: def.callEvery ? def.callEvery * (0.5 + this.rng() * 0.3) : 0,
      warcryCd: def.warcryEvery ? def.warcryEvery * 0.6 : 0,
      phase: 0, enraged: false,
      anim: { lunge: 0, lungeX: 0, hurt: 0, cast: 0 },
    };
    return u;
  }

  _spawnWave(i, initial) {
    const ids = this.waves[i];
    for (const id of ids) this.enemies.push(this._makeEnemy(id, initial ? CONST.ENEMY_FRONT_X + 260 + this.enemies.length * 40 : 1040 + this.enemies.length * 30));
    this._layoutEnemies();
    this.events.push({ type: 'wave', index: i, total: this.waves.length });
  }

  _summon(ids, by) {
    for (const id of ids) {
      if (this.aliveEnemies().length >= 7) break;
      const e = this._makeEnemy(id, 1010);
      this.enemies.push(e);
      this.events.push({ type: 'summon', unit: e, by });
    }
    this._layoutEnemies();
  }

  // ------------------------------------------------------------ 조회
  aliveHeroes() { return this.heroes.filter((u) => u.alive); }
  aliveEnemies() { return this.enemies.filter((u) => u.alive); }
  frontEnemy() {
    let best = null;
    for (const e of this.enemies) if (e.alive && (!best || e.homeX < best.homeX)) best = e;
    return best;
  }
  frontHero() {
    let best = null;
    for (const h of this.heroes) if (h.alive && (!best || h.homeX > best.homeX)) best = h;
    return best;
  }
  tankHero() { return this.heroes.find((h) => h.alive && h.role === 'tank') || null; }
  hpPct(u) { return u.hp / u.maxHp; }

  _layoutHeroes(snap) {
    let i = 0;
    for (const key of HERO_ORDER) {
      const h = this.heroes.find((u) => u.key === key);
      if (!h || !h.alive) continue;
      h.homeX = CONST.HERO_FRONT_X - i * CONST.HERO_SPACING;
      if (snap) h.x = h.homeX - 260;
      i++;
    }
  }
  _layoutEnemies() {
    let x = CONST.ENEMY_FRONT_X;
    let prev = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const half = 20 + e.size * 14;
      if (prev) x += prev + half;
      e.homeX = x;
      prev = half;
    }
  }

  // ------------------------------------------------------------ 진행
  step(dt) {
    if (this.outcome) return;
    this.time += dt;
    // 지연 효과(투사체 착탄, 연속 타격)
    for (let i = this.delayed.length - 1; i >= 0; i--) {
      const d = this.delayed[i];
      d.t -= dt;
      if (d.t <= 0) { this.delayed.splice(i, 1); d.fn(); }
    }
    if (this.introT > 0) this.introT -= dt;
    else {
      for (const u of this.heroes) if (u.alive) this._tickUnit(u, dt);
      for (const u of this.enemies) if (u.alive) this._tickUnit(u, dt);
    }
    // 위치 보간 (대형 재정렬)
    for (const u of this.heroes.concat(this.enemies)) {
      u.x += (u.homeX - u.x) * Math.min(1, dt * (u.side === 'enemy' && u.x > 960 ? 3.2 : 5));
      u.anim.lunge = Math.max(0, u.anim.lunge - dt);
      u.anim.hurt = Math.max(0, u.anim.hurt - dt);
      u.anim.cast = Math.max(0, u.anim.cast - dt);
    }
    if (this.introT > 0) return;
    if (this.autoMode) this._heroAI();
    else for (const h of this.heroes) if (h.alive && h.ult >= 100 && this._ultAuto(h)) this._tryAutoUlt(h);
    // 웨이브/승패
    if (this.aliveHeroes().length === 0) {
      this.outcome = 'lose';
      this.events.push({ type: 'end', outcome: 'lose' });
      return;
    }
    if (this.aliveEnemies().length === 0) {
      if (this.waveIndex < this.waves.length - 1) {
        if (this.waveTimer < 0) { this.waveTimer = CONST.WAVE_DELAY; this.events.push({ type: 'waveClear' }); }
        this.waveTimer -= dt;
        if (this.waveTimer <= 0) { this.waveTimer = -1; this.waveIndex++; this._spawnWave(this.waveIndex, false); }
      } else if (this.delayed.length === 0) {
        this.outcome = 'win';
        this.events.push({ type: 'end', outcome: 'win' });
      }
    }
  }

  _tickUnit(u, dt) {
    // 상태이상
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
      if (k === 'regen') {
        s.acc = (s.acc || 0) + dt;
        if (s.acc >= 0.5) { s.acc -= 0.5; this._heal(s.src, u, u.maxHp * s.value * 0.5, true); }
      }
      s.t -= dt;
      if (s.t <= 0) delete u.statuses[k];
    }
    if (u.side === 'hero') {
      u.cds.s1 = Math.max(0, u.cds.s1 - dt);
      u.cds.s2 = Math.max(0, u.cds.s2 - dt);
      u.castLock = Math.max(0, u.castLock - dt);
      this._gainUlt(u, CONST.ULT_GAIN_TIME * dt);
    }
    const stunned = !!u.statuses.stun;
    if (u.side === 'enemy') {
      this._enemyAbilities(u, dt, stunned);
      if (!u.alive) return;
      if (u.charge || u.call) return; // 시전 중에는 평타 없음
    }
    if (stunned) return;
    const speed = u.statuses.enrage ? 1 / (u.def.enrageSpeed || 0.6) : 1;
    u.atkTimer -= dt * speed;
    if (u.atkTimer <= 0) {
      const tgt = this._basicTarget(u);
      if (tgt) {
        u.atkTimer = u.atkInterval * (0.95 + this.rng() * 0.1);
        this._basicAttack(u, tgt);
      } else u.atkTimer = 0.2;
    }
  }

  _enemyAbilities(u, dt, stunned) {
    const d = u.def;
    // 광폭화
    if (d.abilities.includes('enrage') && !u.enraged && u.hp <= u.maxHp * d.enrageAt) {
      u.enraged = true;
      u.statuses.enrage = { t: Infinity };
      this.events.push({ type: 'enrage', unit: u });
    }
    // 보스 페이즈
    if (d.phases) {
      while (u.phase < d.phases.length && u.hp <= u.maxHp * d.phases[u.phase].at) {
        const ph = d.phases[u.phase];
        u.phase++;
        if (ph.chargeZone) u.chargeZone = ph.chargeZone;
        if (ph.chargeTime) u.chargeTime = ph.chargeTime;
        if (ph.chargeEvery) u.chargeEvery = ph.chargeEvery;
        if (ph.chargeMult) u.chargeMult = ph.chargeMult;
        if (ph.enrage) { u.statuses.enrage = { t: Infinity }; u.enraged = true; }
        u.chargeCd = Math.min(u.chargeCd, 2.5);
        this.events.push({ type: 'phase', unit: u, name: ph.name, phase: u.phase + 1 });
        if (ph.summon) this._summon(ph.summon, u);
      }
    }
    // 차지 공격
    if (u.charge) {
      if (stunned) {
        u.charge = null;
        u.chargeCd = u.chargeEvery * 0.8;
        this.events.push({ type: 'chargeCancel', unit: u });
      } else {
        u.charge.t -= dt;
        if (u.charge.t <= 0) this._chargeImpact(u);
      }
      return;
    }
    if (u.call) {
      if (stunned) { u.call = null; u.callCd = d.callEvery; this.events.push({ type: 'callCancel', unit: u }); }
      else {
        u.call.t -= dt;
        if (u.call.t <= 0) { u.call = null; u.callCd = d.callEvery; this._summon(new Array(d.callCount).fill('goblin'), u); }
      }
      return;
    }
    if (stunned) return;
    if (d.abilities.includes('charge')) {
      u.chargeCd -= dt;
      if (u.chargeCd <= 0 && this.aliveHeroes().length) {
        const n = u.chargeZone;
        const x1 = CONST.HERO_FRONT_X + 36;
        const x0 = CONST.HERO_FRONT_X - (n - 1) * CONST.HERO_SPACING - 36;
        u.charge = { t: u.chargeTime, total: u.chargeTime, x0, x1, mult: u.chargeMult };
        this.events.push({ type: 'chargeStart', unit: u });
        return;
      }
    }
    if (d.abilities.includes('caller')) {
      u.callCd -= dt;
      if (u.callCd <= 0 && this.aliveEnemies().length < 6) {
        u.call = { t: d.callCast, total: d.callCast };
        this.events.push({ type: 'callStart', unit: u });
        return;
      }
    }
    if (d.abilities.includes('warcry')) {
      u.warcryCd -= dt;
      if (u.warcryCd <= 0) {
        u.warcryCd = d.warcryEvery;
        for (const e of this.aliveEnemies()) e.statuses.warcry = { t: 6, value: 0.3 };
        this.events.push({ type: 'warcry', unit: u });
      }
    }
  }

  _chargeImpact(u) {
    const c = u.charge;
    u.charge = null;
    u.chargeCd = u.chargeEvery;
    const inZone = this.aliveHeroes().filter((h) => h.x >= c.x0 && h.x <= c.x1);
    const tank = inZone.find((h) => h.role === 'tank');
    this.events.push({ type: 'chargeImpact', unit: u, x0: c.x0, x1: c.x1, blocked: !!tank });
    u.anim.lunge = 0.35; u.anim.lungeX = -60;
    for (const h of inZone) {
      let mult = c.mult;
      if (tank && h !== tank) mult *= 0.4;
      if (h === tank) mult *= 0.6;
      if (h.def.traits.includes('cautious')) mult *= 0.5;
      this._damage(u, h, this._atkOf(u) * mult, { charge: true, noCrit: true });
    }
  }

  _basicTarget(u) {
    if (u.side === 'enemy') {
      if (u.statuses.taunt) {
        const t = this.heroes.find((h) => h.uid === u.statuses.taunt.src.uid && h.alive);
        if (t) return t;
      }
      const alive = this.aliveHeroes();
      if (!alive.length) return null;
      if (u.def.size <= 1 && this.rng() < 0.3) return alive[Math.floor(this.rng() * alive.length)];
      return this.frontHero();
    }
    const alive = this.aliveEnemies();
    if (!alive.length) return null;
    if (u.role === 'ranged') { // 원딜은 HP 비율 낮은 적 우선
      let best = alive[0];
      for (const e of alive) if (this.hpPct(e) < this.hpPct(best)) best = e;
      return best;
    }
    return this.frontEnemy();
  }

  _basicAttack(u, tgt) {
    const melee = u.side === 'enemy' || u.def.range === 'melee';
    if (melee) {
      u.anim.lunge = 0.22;
      u.anim.lungeX = (tgt.x - u.x) * 0.45;
      this.delayed.push({ t: 0.1, fn: () => { if (tgt.alive && u.alive) this._damage(u, tgt, this._atkOf(u), { basic: true }); } });
      this.events.push({ type: 'attack', unit: u, target: tgt, melee: true });
    } else {
      u.anim.cast = 0.18;
      const travel = 0.22;
      this.events.push({ type: 'projectile', from: u, to: tgt, kind: u.key, travel });
      this.delayed.push({ t: travel, fn: () => { if (tgt.alive) this._damage(u, tgt, this._atkOf(u), { basic: true }); } });
    }
  }

  _atkOf(u) {
    let m = 1;
    if (u.statuses.fruit) m += u.statuses.fruit.value;
    if (u.statuses.warcry) m += u.statuses.warcry.value;
    if (u.side === 'hero' && u.def.traits.includes('brave')) m += 0.4 * (1 - u.hp / u.maxHp);
    return u.atk * m;
  }

  _critChance(u) {
    if (u.side !== 'hero') return 0.05;
    let c = CONST.BASE_CRIT;
    if (u.def.traits.includes('keen')) c += 0.1;
    if (this.relics.has('clover')) c += 0.1;
    if (this.torchDark) c -= CONST.TORCH_DARK_CRIT_PENALTY;
    return Math.max(0, c);
  }

  // ------------------------------------------------------------ 피해/회복
  _damage(src, tgt, raw, info) {
    if (!tgt.alive) return 0;
    info = info || {};
    let dmg = raw;
    let crit = false;
    if (!info.dot) {
      dmg *= 0.9 + this.rng() * 0.2;
      if (!info.noCrit && src && this.rng() < this._critChance(src)) { crit = true; dmg *= CONST.CRIT_MULT; }
    }
    dmg *= 1 - tgt.defPct;
    if (tgt.statuses.vuln) dmg *= 1.25;
    if (tgt.statuses.guard) dmg *= 1 - tgt.statuses.guard.value;
    if (tgt.side === 'hero' && tgt.role === 'tank' && this.relics.has('bark')) dmg *= 0.85;
    dmg = Math.max(1, Math.round(dmg));
    tgt.hp -= dmg;
    tgt.anim.hurt = 0.18;
    if (src && src.stats) src.stats.dealt += dmg;
    if (tgt.stats) tgt.stats.taken += dmg;
    if (src && src.side === 'hero') this._gainUlt(src, dmg * CONST.ULT_GAIN_DEAL);
    if (tgt.side === 'hero') this._gainUlt(tgt, dmg * CONST.ULT_GAIN_TAKE);
    this.events.push({ type: 'hit', target: tgt, src, amount: dmg, crit, dot: info.dot || null, charge: !!info.charge, skill: info.skill || null });
    if (tgt.hp <= 0) {
      tgt.hp = 0;
      tgt.alive = false;
      tgt.charge = null; tgt.call = null;
      tgt.statuses = {};
      if (tgt.side === 'enemy') { this.kills++; if (src && src.stats) src.stats.kills++; this._layoutEnemies(); }
      else this._layoutHeroes(false);
      this.events.push({ type: 'death', unit: tgt });
    }
    return dmg;
  }

  _heal(src, tgt, amount, silent) {
    if (!tgt.alive) return 0;
    let a = amount * (silent ? 1 : CONST.HEAL_MULT);
    if (src && src.def && src.def.traits && src.def.traits.includes('gentle')) a *= 1.15;
    if (tgt.statuses.burn) a *= 0.5;
    a = Math.round(Math.min(a, tgt.maxHp - tgt.hp));
    if (a <= 0) return 0;
    tgt.hp += a;
    if (src && src.stats) src.stats.healed += a;
    this.events.push({ type: 'heal', target: tgt, amount: a, quiet: !!silent });
    return a;
  }

  _gainUlt(h, amt) {
    if (!h.alive) return;
    const before = h.ult;
    h.ult = Math.min(100, h.ult + amt * (this.relics.has('stardust') ? 1.3 : 1));
    if (before < 100 && h.ult >= 100) this.events.push({ type: 'ultReady', unit: h });
  }

  _applyStatus(src, tgt, eff) {
    if (!tgt.alive) return;
    let dur = eff.dur;
    if (eff.status === 'burn') {
      if (this.relics.has('ember')) dur += 2;
      if (src && src.def.traits && src.def.traits.includes('cautious')) dur += 1;
    }
    const s = { t: dur, src };
    if (eff.dps) s.dps = this._atkOf(src) * eff.dps;
    if (eff.value) s.value = eff.value;
    const prev = tgt.statuses[eff.status];
    if (prev && prev.dps && s.dps) s.dps = Math.max(prev.dps, s.dps);
    if (prev) s.acc = prev.acc;
    tgt.statuses[eff.status] = s;
    this.events.push({ type: 'status', target: tgt, status: eff.status });
  }

  // ------------------------------------------------------------ 스킬
  skillDef(h, slot) { return SKILLS[slot === 'ult' ? h.def.ult : h.def.skills[slot === 's1' ? 0 : 1]]; }
  skillUp(h, slot) { return h.upgrades[slot] || { power: 0, cd: 0 }; }
  skillCdMax(h, slot) { const d = this.skillDef(h, slot); return d.cd * Math.pow(REWARD.skillUpgradeCd, this.skillUp(h, slot).cd); }

  canCast(h, slot) {
    if (!h || !h.alive || this.outcome || this.introT > 0) return false;
    if (h.statuses.stun) return false;
    if (slot === 'ult') return h.ult >= 100;
    return h.cds[slot] <= 0;
  }

  // 타겟이 필요 없거나 / 단일 유닛 / 범위 중심 x
  // spec: { unit } | { x } | {}
  cast(h, slot, spec) {
    if (!this.canCast(h, slot)) return false;
    const sk = this.skillDef(h, slot);
    const up = this.skillUp(h, slot);
    const pmul = 1 + up.power * REWARD.skillUpgradePower;
    spec = spec || {};
    // 타겟 유효성
    if ((sk.target === 'enemy' || sk.target === 'ally') && (!spec.unit || !spec.unit.alive)) return false;
    if (slot === 'ult') { h.ult = 0; this.events.push({ type: 'ult', unit: h, skill: sk }); }
    else h.cds[slot] = this.skillCdMax(h, slot);
    h.castLock = 0.35;
    h.anim.cast = 0.3;
    const atk = this._atkOf(h);
    const fxDelay = { meteor: 0.55, arrowrain: 0.5, nova: 0.35, starbolt: 0.22, pierce: 0.16, snipe: 0.3 }[sk.fx] || 0.08;
    this.events.push({ type: 'cast', unit: h, skill: sk, slot, spec, delay: fxDelay });
    const applyEffects = (tgt) => { for (const e of sk.effects) if (!e.to) this._applyStatus(h, tgt, e); };
    switch (sk.target) {
      case 'enemy': {
        const tgt = spec.unit;
        if (h.def.range === 'melee') { h.anim.lunge = 0.25; h.anim.lungeX = (tgt.x - h.x) * 0.55; }
        const hits = sk.hits || 1;
        for (let i = 0; i < hits; i++) {
          this.delayed.push({ t: fxDelay + i * 0.11, fn: () => {
            if (!tgt.alive) return;
            this._damage(h, tgt, atk * sk.power * pmul, { skill: sk.fx });
            if (i === 0 || i === hits - 1) applyEffects(tgt);
          } });
        }
        break;
      }
      case 'ally': {
        const tgt = spec.unit;
        this.delayed.push({ t: fxDelay, fn: () => this._heal(h, tgt, (atk * sk.heal + tgt.maxHp * sk.healPct) * pmul) });
        break;
      }
      case 'area_enemy': {
        const cx = this.clampAreaX(h, sk, spec.x);
        const half = sk.areaW / 2;
        if (sk.melee) { h.anim.lunge = 0.3; h.anim.lungeX = Math.max(0, (cx - half) - h.x - 10) * 0.8; }
        this.delayed.push({ t: fxDelay, fn: () => {
          for (const e of this.aliveEnemies()) if (Math.abs(e.x - cx) <= half + e.size * 10) { this._damage(h, e, atk * sk.power * pmul, { skill: sk.fx }); applyEffects(e); }
        } });
        break;
      }
      case 'area_ally': {
        const cx = spec.x;
        const half = sk.areaW / 2;
        this.delayed.push({ t: fxDelay, fn: () => {
          for (const a of this.aliveHeroes()) if (Math.abs(a.x - cx) <= half) this._heal(h, a, (atk * sk.heal + a.maxHp * sk.healPct) * pmul);
        } });
        break;
      }
      case 'all_enemies':
        this.delayed.push({ t: fxDelay, fn: () => { for (const e of this.aliveEnemies()) { this._damage(h, e, atk * sk.power * pmul, { skill: sk.fx }); applyEffects(e); } } });
        break;
      default: break; // self / party: effects만
    }
    for (const e of sk.effects) {
      if (e.to === 'self') this._applyStatus(h, h, e);
      else if (e.to === 'party') for (const a of this.aliveHeroes()) this._applyStatus(h, a, Object.assign({}, e, { value: e.value * (e.status === 'regen' ? pmul : 1) }));
      else if (e.to === 'all_enemies') for (const en of this.aliveEnemies()) this._applyStatus(h, en, e);
    }
    return true;
  }

  // 근접 범위 스킬은 앞열 적 근처로만 이동 가능
  clampAreaX(h, sk, x) {
    if (x === undefined || x === null) { const f = this.frontEnemy(); x = f ? f.x : 700; }
    if (sk.target === 'area_enemy') {
      const f = this.frontEnemy();
      const fx = f ? f.x : CONST.ENEMY_FRONT_X;
      if (sk.melee) return clamp(x, fx - 20, fx + sk.areaW * 0.5);
      return clamp(x, CONST.ENEMY_FRONT_X - 60, 940);
    }
    if (sk.target === 'area_ally') return clamp(x, 60, CONST.HERO_FRONT_X + 30);
    return x;
  }

  // 범위 안 유닛 (뷰 하이라이트용)
  unitsInArea(h, slot, x) {
    const sk = this.skillDef(h, slot);
    const cx = this.clampAreaX(h, sk, x);
    const half = sk.areaW / 2;
    if (sk.target === 'area_enemy') return this.aliveEnemies().filter((e) => Math.abs(e.x - cx) <= half + e.size * 10);
    return this.aliveHeroes().filter((a) => Math.abs(a.x - cx) <= half);
  }

  // ------------------------------------------------------------ 자동 전략
  _ultAuto(h) { const st = this.strategy[h.key]; return !!(st && st.ultAuto); }

  _tryAutoUlt(h) {
    const st = this.strategy[h.key] || AI_PRESETS[h.key];
    const sk = this.skillDef(h, 'ult');
    const spec = this.resolveTarget(h, sk, st.ultTarget || 'nearest');
    if (spec) return this.cast(h, 'ult', spec);
    return false;
  }

  checkCond(h, rule) {
    switch (rule.cond) {
      case 'always': return true;
      case 'allyHpBelow': return this.aliveHeroes().some((a) => a.hp / a.maxHp * 100 <= rule.param);
      case 'enemyHpBelow': return this.aliveEnemies().some((e) => e.hp / e.maxHp * 100 <= rule.param);
      case 'enemyCharging': return this.aliveEnemies().some((e) => e.charge || e.call);
      case 'enemyCountGte': return this.aliveEnemies().length >= rule.param;
      case 'ultReady': return h.ult >= 100;
      default: return false;
    }
  }

  // 규칙 → 실제 타겟 spec
  resolveTarget(h, sk, rule) {
    const enemies = this.aliveEnemies();
    const allies = this.aliveHeroes();
    const lowestAlly = () => { let b = null; for (const a of allies) if (!b || a.hp / a.maxHp < b.hp / b.maxHp) b = a; return b; };
    const pickEnemy = () => {
      if (!enemies.length) return null;
      if (rule === 'weakest') { let b = enemies[0]; for (const e of enemies) if (e.hp < b.hp) b = e; return b; }
      if (rule === 'charging') return enemies.find((e) => e.charge) || enemies.find((e) => e.call) || null;
      return this.frontEnemy();
    };
    switch (sk.target) {
      case 'enemy': { const u = pickEnemy(); return u ? { unit: u } : null; }
      case 'ally': { const u = rule === 'tank' ? (this.tankHero() || this.frontHero()) : lowestAlly(); return u && u.hp < u.maxHp ? { unit: u } : null; }
      case 'area_enemy': {
        const anchor = pickEnemy();
        if (!anchor) return null;
        let bestX = anchor.x, bestN = -1;
        for (const e of enemies) {
          const cx = this.clampAreaX(h, sk, e.x);
          const n = enemies.filter((o) => Math.abs(o.x - cx) <= sk.areaW / 2 + o.size * 10).length;
          const hasAnchor = Math.abs(anchor.x - cx) <= sk.areaW / 2 + anchor.size * 10;
          if (hasAnchor && n > bestN) { bestN = n; bestX = cx; }
        }
        return { x: this.clampAreaX(h, sk, bestX) };
      }
      case 'area_ally': {
        const a = rule === 'tank' ? (this.tankHero() || lowestAlly()) : lowestAlly();
        if (!a) return null;
        let bestX = a.x, bestN = -1;
        for (const o of allies) {
          const cx = this.clampAreaX(h, sk, o.x);
          const n = allies.filter((q) => Math.abs(q.x - cx) <= sk.areaW / 2 && q.hp < q.maxHp).length;
          if (Math.abs(a.x - cx) <= sk.areaW / 2 && n > bestN) { bestN = n; bestX = cx; }
        }
        return { x: bestX };
      }
      case 'all_enemies': return enemies.length ? {} : null;
      default: return {};
    }
  }

  _heroAI() {
    for (const h of this.heroes) {
      if (!h.alive || h.castLock > 0 || h.statuses.stun) continue;
      const st = this.strategy[h.key] || AI_PRESETS[h.key];
      if (st.ultAuto && h.ult >= 100 && this._tryAutoUlt(h)) continue;
      for (const rule of st.rules) {
        if (!rule || !rule.skill) continue;
        if (rule.skill === 'ult' && !st.ultAuto) continue;
        if (!this.canCast(h, rule.skill)) continue;
        if (!this.checkCond(h, rule)) continue;
        const sk = this.skillDef(h, rule.skill);
        const spec = this.resolveTarget(h, sk, rule.target);
        if (!spec) continue;
        if (this.cast(h, rule.skill, spec)) break;
      }
    }
  }

  // 결과를 런 상태로 돌려줄 요약
  summary() {
    return {
      outcome: this.outcome, time: this.time, kills: this.kills,
      heroes: this.heroes.map((h) => ({ id: h.key, hp: Math.max(0, Math.round(h.hp)), alive: h.alive, stats: h.stats })),
    };
  }
}

// 헤드리스 실행 (밸런스 검증용): 자동 모드로 끝까지 돌린다.
BattleSim.runHeadless = function (opts, maxTime) {
  const sim = new BattleSim(Object.assign({ autoMode: true }, opts));
  const lim = maxTime || 300;
  while (!sim.outcome && sim.time < lim) { sim.step(CONST.SIM_DT); sim.events.length = 0; }
  return sim;
};
