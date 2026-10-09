// ===== 05c_hunt.js : 사냥터 (일반 필드) — 방치 사냥 데이터와 로직 =====
// 마을 남서쪽 출구로 나가면 나오는 넓은 들판. 잡몹·일반몹이 돌아다니고, 주기적으로 정예가 한 마리씩 나온다.
// 목적: 부족한 경험치·골드 보충 + 장신구(반지·목걸이·벨트) 파밍. 필드 레벨에 따라 몹 세기와 드랍 등급이 정해진다.
// 화면(08c_hunt.js)과 분리된 순수 로직이라 node에서 그대로 돌려 볼 수 있다 (tools/check_logic.cjs · tools/hunt_sim.cjs).

const HUNT_FIELDS = {
  meadow: {
    id: 'meadow', name: '바람 들판', level: 5,
    W: 2800, H: 1720,                 // 마을(1600×1000)의 약 3배 면적
    entry: { x: 2660, y: 190 },       // 마을 남서쪽 출구와 이어지는 들판 북동쪽 끝
    trash: { count: 16, kinds: ['goblin', 'goblin_archer'] },
    normal: { count: 8, kinds: ['orc', 'orc_shield', 'goblin_caller'] },
    elite: { every: 90, first: 45, kinds: ['orc_captain'] },
    respawn: 7,                       // 잡혀 비면 이 간격(초)으로 한 마리씩 다시 나온다
    safeR: 320,                       // 입구 주변은 몹이 생기지 않는다
  },
  shade: {
    id: 'shade', name: '그늘 숲', level: 15, theme: 'dark',
    W: 2800, H: 1720,
    entry: { x: 2660, y: 190 },
    trash: { count: 14, kinds: ['goblin_stalker', 'goblin_trapper', 'goblin_archer'] },
    normal: { count: 9, kinds: ['orc_berserker', 'orc_hunter', 'orc_shield'] },
    elite: { every: 100, first: 50, kinds: ['cave_troll'] },
    respawn: 7, safeR: 320,
  },
};

const HUNT = {
  CLASS: {                            // 등급별 배율: 체력 · 공격 · 경험치 · 골드 · 장신구 드랍 확률 · 강화석 확률
    trash:  { hp: 0.5, atk: 0.45, exp: 0.42, gold: 1, drop: 0.006, stone: 0.005, size: 0.85 },
    normal: { hp: 1.1, atk: 0.8, exp: 1.1, gold: 2.5, drop: 0.02, stone: 0.02, size: 1 },
    elite:  { hp: 3.2, atk: 1.1, exp: 9, gold: 30, drop: 0.35, stone: 0.6, size: 1.25 },
  },
  LEVEL_STAT: 0.08,                   // 필드 레벨 1당 몹 체력·공격 +8%
  LEVEL_REWARD: 0.12,                 // 필드 레벨 1당 경험치·골드 +12%
  AGGRO: 170, LEASH: 520,             // 알아채는 거리 · 쫓다가 포기하는 거리(출생지 기준)
  REVIVE: 10,                         // 쓰러진 영웅은 10초 뒤 HP 50%로 일어난다 (방치용)
  REGEN: 0.04,                        // 전투 밖 초당 최대 HP 4% 회복
  SKILL_CD: 7, SKILL_MULT: 2.2,       // 영웅 ① 스킬: 7초마다 평타 2.2배 (사냥터는 단순화)
  HEAL_CD: 3.5, HEAL_PCT: 0.16,       // 서포터: 다친 아군 회복
  ELITE_NAMES: ['들판의 폭군', '찢어진 귀 그락', '굶주린 송곳니', '돌가죽 우르그'],
  ACC_SLOTS: ['ring', 'necklace', 'belt'],
  OVERLEVEL: { free: 3, per: 0.12, min: 0.25 }, // 파티 평균 레벨이 필드 +3을 넘으면 1당 경험치 -12% (최소 25%) — 더 높은 사냥터로
};

// 필드 레벨 → 장신구 등급 확률표. 기준 등급(레벨 10마다 한 단계)보다 위는 한 단계마다 급격히 줄어든다.
// 예: Lv 5 → UC 90.6% · C 9.1% · R 0.27% · SR 0.008% · SSR 0.0002% … (정예는 위쪽 꼬리 ×5)
function huntGradeTable(level, elite) {
  const G = EQ.GRADES, b = Math.min(G.length - 1, Math.floor(level / 10));
  const w = G.map((g, i) => (i < b ? Math.pow(0.15, b - i) : i === b ? 1 : 0.1 * Math.pow(0.03, i - b - 1) * (elite ? 5 : 1)));
  const sum = w.reduce((a, v) => a + v, 0);
  return G.map((g, i) => [g, w[i] / sum]);
}
function huntMobStats(field, cls, key) {
  const d = ENEMIES[key], C = HUNT.CLASS[cls], lv = 1 + HUNT.LEVEL_STAT * (field.level - 1);
  return { hp: Math.round(d.hp * C.hp * lv), atk: d.atk * C.atk * lv, atkInterval: d.atkInterval, reach: d.reach || (24 + 16 * (d.size || 1)), speed: (d.moveSpeed || 70) * 0.9 };
}
function huntExpMult(field, partyLevel) {
  const O = HUNT.OVERLEVEL, g = partyLevel - field.level - O.free;
  return g > 0 ? Math.max(O.min, 1 - O.per * g) : 1;
}
function huntReward(field, cls) {
  const C = HUNT.CLASS[cls], k = 1 + HUNT.LEVEL_REWARD * (field.level - 1);
  return { exp: C.exp * k, gold: Math.round(C.gold * k) };
}

class HuntSim {
  // opts: { field, seed, heroes: [{ id, role, maxHp, hp, atk, atkInterval, reach, speed, level }], autoHunt }
  constructor(opts) {
    this.field = opts.field; this.rng = makeRng(opts.seed || 1);
    this.time = 0; this.events = []; this.mobs = []; this.uid = 0;
    this.autoHunt = opts.autoHunt !== false;
    const e = this.field.entry;
    this.party = { x: e.x - 60, y: e.y + 60, target: null, goal: null };
    this.heroes = opts.heroes.map((h, i) => Object.assign({ alive: true, cd: 0.5 + i * 0.3, skillCd: 2 + i * 1.5, down: 0, x: this.party.x - i * 34, y: this.party.y + i * 14, face: -1, moving: false, anim: 0 }, h));
    this.stats = { kills: { trash: 0, normal: 0, elite: 0 }, exp: 0, gold: 0, stones: 0, drops: [], wipes: 0 };
    this.eliteTimer = this.field.elite.first; this.respawnT = { trash: 0, normal: 0 };
    for (let i = 0; i < this.field.trash.count; i++) this.spawn('trash');
    for (let i = 0; i < this.field.normal.count; i++) this.spawn('normal');
  }
  levelGap(h) { return (h.level || 1) - this.field.level; }
  spawn(cls, at) {
    const F = this.field, kinds = F[cls].kinds, key = kinds[Math.floor(this.rng() * kinds.length)];
    let x, y;
    for (let g = 0; g < 40; g++) {
      x = at ? at.x : 120 + this.rng() * (F.W - 240); y = at ? at.y : 160 + this.rng() * (F.H - 280);
      if (Math.hypot(x - F.entry.x, y - F.entry.y) > F.safeR && Math.hypot(x - this.party.x, y - this.party.y) > 380) break;
    }
    const st = huntMobStats(F, cls, key);
    const m = Object.assign({ uid: ++this.uid, key, cls, x, y, hx: x, hy: y, maxHp: st.hp, alive: true, cd: 1, aggro: false, wander: null, wt: this.rng() * 3, face: -1, hurt: 0, moving: false }, st);
    m.hp = m.maxHp;
    if (cls === 'elite') { m.name = HUNT.ELITE_NAMES[Math.floor(this.rng() * HUNT.ELITE_NAMES.length)]; this.events.push({ type: 'eliteSpawn', mob: m }); }
    this.mobs.push(m);
    return m;
  }
  aliveHeroes() { return this.heroes.filter((h) => h.alive); }
  // 명령: 땅을 찍어 이동 / 몹을 찍어 공격 (수동). 자동 사냥이면 비었을 때 가장 가까운 몹을 고른다.
  moveTo(x, y) { this.party.goal = { x, y }; this.party.target = null; }
  attack(m) { if (m && m.alive) { this.party.target = m; this.party.goal = null; } }

  step(dt) {
    this.time += dt;
    const P = this.party, hs = this.aliveHeroes();
    // 정예: 주기적으로 한 마리 (이미 있으면 기다린다)
    this.eliteTimer -= dt;
    if (this.eliteTimer <= 0 && !this.mobs.some((m) => m.alive && m.cls === 'elite')) { this.eliteTimer = this.field.elite.every; this.spawn('elite'); }
    // 리스폰
    for (const cls of ['trash', 'normal']) {
      const n = this.mobs.filter((m) => m.alive && m.cls === cls).length;
      if (n < this.field[cls].count) { this.respawnT[cls] -= dt; if (this.respawnT[cls] <= 0) { this.respawnT[cls] = this.field.respawn; this.spawn(cls); } }
    }
    this.mobs = this.mobs.filter((m) => m.alive || m.deadT < 1.2);
    // 파티 목표
    if (P.target && !P.target.alive) P.target = null;
    if (!P.target && !P.goal && this.autoHunt && hs.length) P.target = this.pickTarget();
    const lead = hs[0] || this.heroes[0];
    let gx = null, gy = null;
    if (P.target) { gx = P.target.x + (lead.x > P.target.x ? 70 : -70); gy = P.target.y; }
    else if (P.goal) { gx = P.goal.x; gy = P.goal.y; if (Math.hypot(P.x - gx, P.y - gy) < 8) P.goal = null; }
    const pspeed = Math.min(...hs.map((h) => h.speed || 90).concat([110])) * 1.35;
    if (gx !== null && hs.length) { const d = Math.hypot(gx - P.x, gy - P.y); if (d > 6) { const k = Math.min(1, pspeed * dt / d); P.x += (gx - P.x) * k; P.y += (gy - P.y) * k; } }
    P.x = clamp(P.x, 40, this.field.W - 40); P.y = clamp(P.y, 90, this.field.H - 30);
    // 영웅: 자리(대형) → 공격
    const inCombat = this.mobs.some((m) => m.alive && m.aggro);
    hs.forEach((h, i) => {
      const t = P.target;
      let tx = P.x - i * 30 * (t && t.x < P.x ? -1 : 1), ty = P.y + (i - 1) * 26;
      if (t && t.alive) { // 근접은 붙고 원거리는 사거리 안에 선다
        const dx = h.x - t.x, side = dx >= 0 ? 1 : -1, want = h.reach > 80 ? Math.min(h.reach - 20, 150) : h.reach - 10; // 근접은 사거리 안쪽
        tx = t.x + side * want; ty = t.y + (i - 1) * 22;
      }
      const d = Math.hypot(tx - h.x, ty - h.y);
      h.moving = d > 4;
      if (h.moving) { const k = Math.min(1, (h.speed || 90) * 1.6 * dt / d); h.x = clamp(h.x + (tx - h.x) * k, 30, this.field.W - 30); h.y = clamp(h.y + (ty - h.y) * k, 90, this.field.H - 20); if (Math.abs(tx - h.x) > 2) h.face = tx < h.x ? -1 : 1; }
      h.cd -= dt; h.skillCd -= dt; h.anim = Math.max(0, h.anim - dt);
      if (h.role === 'support') { // 회복 우선
        const hurt = hs.filter((o) => o.hp < o.maxHp * 0.7).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (hurt && h.skillCd <= 0) { h.skillCd = HUNT.HEAL_CD; const v = Math.round(hurt.maxHp * HUNT.HEAL_PCT); hurt.hp = Math.min(hurt.maxHp, hurt.hp + v); h.anim = 0.45; this.events.push({ type: 'heal', hero: h, to: hurt, v }); }
      }
      if (t && t.alive && Math.hypot(h.x - t.x, h.y - t.y) <= h.reach + 6 && h.cd <= 0) {
        h.cd = h.atkInterval; h.face = t.x < h.x ? -1 : 1;
        const gm = levelGapMult(this.levelGap(h)).dealt;
        let dmg = h.atk * gm * (0.9 + this.rng() * 0.2), skill = false;
        if (h.role !== 'support' && h.skillCd <= 0) { h.skillCd = HUNT.SKILL_CD; dmg *= HUNT.SKILL_MULT; skill = true; }
        h.anim = skill ? 0.45 : 0.22;
        this.hit(t, dmg, h, skill);
      }
      if (!inCombat && h.hp < h.maxHp) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * HUNT.REGEN * dt);
    });
    // 쓰러진 영웅 부활
    for (const h of this.heroes) if (!h.alive) { h.down -= dt; if (h.down <= 0) { h.alive = true; h.hp = Math.round(h.maxHp * 0.5); h.x = P.x; h.y = P.y; this.events.push({ type: 'revive', hero: h }); } }
    // 몹
    for (const m of this.mobs) {
      if (!m.alive) { m.deadT += dt; continue; }
      m.hurt = Math.max(0, m.hurt - dt); m.cd -= dt;
      const near = hs.length ? hs.reduce((a, h) => (Math.hypot(h.x - m.x, h.y - m.y) < Math.hypot(a.x - m.x, a.y - m.y) ? h : a)) : null;
      const dn = near ? Math.hypot(near.x - m.x, near.y - m.y) : Infinity;
      if (!m.aggro && dn < HUNT.AGGRO) m.aggro = true;
      if (m.aggro && m.cls !== 'elite' && (Math.hypot(m.x - m.hx, m.y - m.hy) > HUNT.LEASH || !near)) { /* 정예는 끝까지 쫓는다 */ m.aggro = false; m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.5); }
      let tx = m.x, ty = m.y;
      if (m.aggro && near) {
        const tank = hs.find((h) => h.role === 'tank' && Math.hypot(h.x - m.x, h.y - m.y) < m.reach + 60); // 탱커가 가까우면 탱커를 친다
        const v = tank || near, dv = Math.hypot(v.x - m.x, v.y - m.y);
        if (dv > m.reach) { tx = v.x; ty = v.y; }
        else if (m.cd <= 0) { m.cd = m.atkInterval; m.face = v.x < m.x ? -1 : 1; m.anim = 0.22; this.hurtHero(v, m.atk * levelGapMult(this.levelGap(v)).taken * (0.9 + this.rng() * 0.2), m); }
      } else { // 어슬렁
        m.wt -= dt;
        if (m.wt <= 0) { m.wt = 2 + this.rng() * 4; m.wander = this.rng() < 0.6 ? { x: clamp(m.hx + (this.rng() - 0.5) * 220, 60, this.field.W - 60), y: clamp(m.hy + (this.rng() - 0.5) * 160, 120, this.field.H - 40) } : null; }
        if (m.wander) { tx = m.wander.x; ty = m.wander.y; }
      }
      const d = Math.hypot(tx - m.x, ty - m.y), sp = m.speed * (m.aggro ? 1 : 0.4);
      m.moving = d > 3;
      if (m.moving) { const k = Math.min(1, sp * dt / d); m.x = clamp(m.x + (tx - m.x) * k, 40, this.field.W - 40); m.y = clamp(m.y + (ty - m.y) * k, 110, this.field.H - 30); m.face = tx < m.x ? -1 : 1; }
      m.anim = Math.max(0, (m.anim || 0) - dt);
    }
  }
  pickTarget() {
    const P = this.party; let best = null, bd = Infinity;
    for (const m of this.mobs) if (m.alive) { const d = Math.hypot(m.x - P.x, m.y - P.y) * (m.aggro ? 0.4 : 1) * (m.cls === 'elite' ? 0.7 : 1); if (d < bd) { bd = d; best = m; } }
    return best;
  }
  hit(m, dmg, h, skill) {
    m.hp -= dmg; m.hurt = 0.15; m.aggro = true;
    this.events.push({ type: 'hit', mob: m, v: Math.round(dmg), skill, hero: h });
    if (m.hp <= 0) this.kill(m);
  }
  hurtHero(h, dmg, m) {
    h.hp -= dmg; this.events.push({ type: 'hurt', hero: h, v: Math.round(dmg), mob: m });
    if (h.hp <= 0) {
      h.hp = 0; h.alive = false; h.down = HUNT.REVIVE; this.events.push({ type: 'down', hero: h });
      if (!this.aliveHeroes().length) { // 전멸: 입구로 돌아가 다시 시작 (방치 사냥이라 잃는 것은 없다)
        this.stats.wipes++;
        const e = this.field.entry; this.party.x = e.x - 60; this.party.y = e.y + 60; this.party.target = null; this.party.goal = null;
        for (const o of this.heroes) { o.alive = true; o.hp = Math.round(o.maxHp * 0.6); o.down = 0; o.x = this.party.x; o.y = this.party.y; }
        for (const mm of this.mobs) if (mm.alive && mm.aggro) { mm.aggro = false; mm.hp = mm.maxHp; }
        this.events.push({ type: 'wipe' });
      }
    }
  }
  kill(m) {
    m.alive = false; m.deadT = 0; m.hp = 0;
    const r = huntReward(this.field, m.cls), C = HUNT.CLASS[m.cls];
    r.exp *= huntExpMult(this.field, this.heroes.reduce((a, h) => a + (h.level || 1), 0) / this.heroes.length);
    this.stats.kills[m.cls]++; this.stats.exp += r.exp; this.stats.gold += r.gold;
    const ev = { type: 'kill', mob: m, exp: r.exp, gold: r.gold };
    if (this.rng() < C.stone) { const s = m.cls === 'elite' ? 2 + Math.floor(this.rng() * 3) : 1; this.stats.stones += s; ev.stones = s; }
    if (this.rng() < C.drop) {
      const grade = this.rng.weighted(huntGradeTable(this.field.level, m.cls === 'elite'));
      const slot = HUNT.ACC_SLOTS[Math.floor(this.rng() * HUNT.ACC_SLOTS.length)];
      const drop = { grade, slot, x: m.x, y: m.y }; this.stats.drops.push(drop); ev.drop = drop;
    }
    this.events.push(ev);
    if (this.party.target === m) this.party.target = null;
  }
}

// 영웅 → 사냥터 능력치 (장비·캐릭터 레벨 반영)
function huntHeroFrom(p, id) {
  const d = HEROES[id], lo = EQ.heroLoadout(p, id), md = lo.mods;
  const atk = (d.atk + (md.atk || 0)) * (1 + (md.atk_pct || 0));
  const asp = 1 + (md.aspd || 0);
  return { id, role: d.role, maxHp: lo.maxHp, hp: lo.maxHp, atk, atkInterval: d.atkInterval / asp, reach: d.range === 'ranged' ? (d.reach || 190) : 46, speed: d.moveSpeed || 80, level: EQ.heroLevel(p, id), sprite: d.sprite, name: d.name };
}
