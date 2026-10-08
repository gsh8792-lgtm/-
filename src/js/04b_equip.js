// ===== 04b_equip.js : 장비 로직 (프로필 저장, 아이템 생성, 능력치 합산, 강화, 분해, 드랍) =====
// 화면(DOM)과 무관한 순수 로직. 데이터는 EQUIP_DB(01b_equip_db.js, gen_equipment_db.py 생성).

const EQ = (() => {
  const DB = EQUIP_DB;
  const GRADES = DB.grades.map((g) => g.code);
  const G = {}; DB.grades.forEach((g, i) => { G[g.code] = Object.assign({ idx: i }, g); });
  const STAT = {}; DB.stats.forEach((s) => { STAT[s.key] = s; });
  const BASE = {}; DB.items.forEach((it) => { BASE[it.id] = it; });
  const PASSIVE = {}; DB.passives.forEach((p) => { PASSIVE[p.key] = p; });
  const GEM = {}; DB.gems.forEach((g) => { GEM[g.key] = g; });
  const SLOTS = DB.slots.map((s) => s.key);
  const SLOT_NAME = {}; DB.slots.forEach((s) => { SLOT_NAME[s.key] = s.name; });
  // 게임 내에서 효과가 구현된 스킬 보너스 (L·E). 직업 전용 스킬 보너스는 스킬 풀 개편 때 추가
  const SKILL_BONUS = [
    { key: 's1pow', text: '① 스킬 위력 +{v}', L: 0.10, E: 0.12 },
    { key: 's2pow', text: '② 스킬 위력 +{v}', L: 0.10, E: 0.12 },
    { key: 'ultpow', text: '③ 필살기 위력 +{v}', L: 0.10, E: 0.12 },
    { key: 's1cd', text: '① 스킬 쿨타임 -{v}', L: 0.07, E: 0.08 },
    { key: 's2cd', text: '② 스킬 쿨타임 -{v}', L: 0.07, E: 0.08 },
    { key: 'ultgain', text: '필살기 충전 +{v}', L: 0.08, E: 0.09 },
  ];
  const SB = {}; SKILL_BONUS.forEach((b) => { SB[b.key] = b; });
  const GEM_SKILL = { s1_power: 's1pow', s2_power: 's2pow', ult_power: 'ultpow' };
  const EXTRA_STAT_NAME = { s1pow: '① 스킬 위력', s2pow: '② 스킬 위력', ultpow: '필살기 위력', s1cd: '① 쿨타임', s2cd: '② 쿨타임', nonbroken: '그로기 아닌 적 피해' };

  const heroClass = (heroId) => HEROES[heroId].role;
  const classInfo = (cls) => DB.classes.find((c) => c.key === cls);
  const usableBy = (item, heroId) => BASE[item.base].cls === 'common' || BASE[item.base].cls === heroClass(heroId);
  const weighted = (rng, entries) => { // entries: [[value, weight]]
    let tot = 0; for (const e of entries) tot += e[1];
    let r = rng() * tot;
    for (const e of entries) { r -= e[1]; if (r < 0) return e[0]; }
    return entries[entries.length - 1][0];
  };
  const r4 = (v) => Math.round(v * 10000) / 10000;

  // ------------------------------------------------------------ 프로필 (원정 사이에 유지)
  function newProfile() {
    const equip = {};
    for (const id of HERO_ORDER) { equip[id] = {}; for (const s of SLOTS) equip[id][s] = null; }
    return { v: 1, uidSeq: 1, gold: 0, stones: 0, inv: [], gems: [], equip, unlockedTier: 0, tier: 0, clears: {}, codex: {} };
  }
  function loadProfile() {
    const p = safeStorageGet('fe_profile', null);
    if (p && p.v === 1) return GACHA.ensure(p);
    return GACHA.ensure(newProfile());
  }
  function saveProfile(p) { safeStorageSet('fe_profile', p); }
  function findItem(p, uid) { return p.inv.find((i) => i.uid === uid) || null; }
  function findGem(p, uid) { return p.gems.find((g) => g.uid === uid) || null; }
  function equippedBy(p, uid) {
    for (const h in p.equip) for (const s in p.equip[h]) if (p.equip[h][s] === uid) return h;
    return null;
  }

  // ------------------------------------------------------------ 아이템 생성
  function rollItem(rng, p, spec) {
    const base = BASE[spec.base];
    const grade = spec.grade;
    const g = G[grade];
    const item = { uid: p.uidSeq++, base: base.id, grade, enh: 0, fail: 0, artisan: 0, opts: [], passive: null, gems: [], cls: false, sb: [] };
    // 추가 옵션 (부위 제한, 중복 없음)
    const pool = DB.options.filter((o) => o.slots === '*' || o.slots.split(',').includes(base.slot));
    for (let i = 0; i < g.opt && pool.length; i++) {
      const o = weighted(rng, pool.map((x) => [x, x.weight]));
      pool.splice(pool.indexOf(o), 1);
      item.opts.push({ stat: o.key, v: r4((o.min + (o.max - o.min) * rng()) * g.optMult) });
    }
    // L / E 추가 효과
    let gemSlots = 0, cls = false, sbN = 0;
    if (grade === 'L') {
      gemSlots = 1;
      const x = weighted(rng, Object.entries(DB.lExtraWeights));
      if (x === 'cls') cls = true; else if (x === 'skill') sbN = 1;
    } else if (grade === 'E') {
      gemSlots = +weighted(rng, Object.entries(DB.eGemWeights));
      cls = true;
      sbN = +weighted(rng, Object.entries(DB.eSkillWeights));
    }
    item.gems = new Array(gemSlots).fill(null);
    // 공통 장신구의 특성 스탯은 착용자 직업 기준으로 계산 (cls 플래그만 저장)
    item.cls = cls;
    const sbPool = SKILL_BONUS.slice();
    for (let i = 0; i < sbN; i++) { const b = sbPool.splice(Math.floor(rng() * sbPool.length), 1)[0]; item.sb.push({ key: b.key, v: b[grade] }); }
    // 갑옷 랜덤 패시브: 등급 = 장비 등급 이하
    if (base.slot === 'armor') item.passive = rollPassive(rng, grade);
    return item;
  }
  function rollPassive(rng, grade) {
    const gi = G[grade].idx;
    const down = weighted(rng, DB.passiveGradeRoll.map((w, i) => [i === 3 ? 3 + Math.floor(rng() * 3) : i, w]));
    const pg = GRADES[Math.max(0, gi - down)];
    const cands = DB.passives.filter((x) => G[x.min].idx <= G[pg].idx);
    const ps = cands[Math.floor(rng() * cands.length)];
    return { key: ps.key, grade: pg };
  }
  function rollGem(rng, p, grade) {
    const keys = Object.keys(GEM);
    const key = keys[Math.floor(rng() * keys.length)];
    const n = DB.gemEffectCount[grade] - 1;
    const extraPool = keys.filter((k) => k !== key).map((k) => GEM[k].stat).concat(DB.gemSkillExtras.map((x) => x.key));
    const extras = [];
    for (let i = 0; i < n; i++) extras.push(extraPool.splice(Math.floor(rng() * extraPool.length), 1)[0]);
    return { uid: p.uidSeq++, key, grade, extras, inItem: null };
  }

  // ------------------------------------------------------------ 수치
  const enhMult = (item) => 1 + item.enh * DB.enhance.mainPerLevel;
  function mainStats(item) {
    const base = BASE[item.base], g = G[item.grade];
    return base.main.map((m) => ({ stat: m.stat, v: m.base * g.main * enhMult(item) }));
  }
  function passiveValue(ps) { const d = PASSIVE[ps.key]; return d.v * DB.passiveMult[ps.grade]; }
  function gemEffects(gem) {
    const mult = DB.gemMult[gem.grade];
    const out = [{ stat: GEM[gem.key].stat, v: GEM[gem.key].base * mult }];
    for (const x of gem.extras) {
      const sk = DB.gemSkillExtras.find((e) => e.key === x);
      if (sk) out.push({ stat: GEM_SKILL[x], v: sk.base * mult * DB.gemExtraRatio });
      else { const gk = Object.keys(GEM).find((k) => GEM[k].stat === x); out.push({ stat: x, v: GEM[gk].base * mult * DB.gemExtraRatio }); }
    }
    return out;
  }
  // 아이템 하나가 주는 효과 목록 (착용자 직업 필요: 공통 장신구 특성 스탯)
  function itemEffects(p, item, heroId) {
    const out = mainStats(item).concat(item.opts.map((o) => ({ stat: o.stat, v: o.v })));
    if (item.cls) {
      const cls = BASE[item.base].cls !== 'common' ? BASE[item.base].cls : heroId ? heroClass(heroId) : null;
      if (cls) { const cs = DB.classStat[cls]; out.push({ stat: cs.stat, v: cs[item.grade] }); }
    }
    for (const b of item.sb) out.push({ stat: b.key, v: b.v });
    for (const gu of item.gems) if (gu) { const gem = findGem(p, gu); if (gem) out.push(...gemEffects(gem)); }
    return out;
  }
  // 영웅 최종: 최대 HP, 전투 보정치(mods), 패시브
  function heroLoadout(p, heroId) {
    const def = HEROES[heroId];
    const mods = {};
    const add = (k, v) => { mods[k] = (mods[k] || 0) + v; };
    const passives = {};
    for (const s of SLOTS) {
      const uid = p.equip[heroId] && p.equip[heroId][s];
      const item = uid && findItem(p, uid);
      if (!item) continue;
      for (const e of itemEffects(p, item, heroId)) add(e.stat, e.v);
      if (item.passive) { const cur = passives[item.passive.key]; if (!cur || G[cur.grade].idx < G[item.passive.grade].idx) passives[item.passive.key] = item.passive; }
    }
    for (const k in passives) { // 같은 이름은 가장 높은 등급 하나만
      const d = PASSIVE[k], v = passiveValue(passives[k]);
      if (d.kind === 'stat' || d.kind === 'trade') add(d.stat, v);
      if (d.kind === 'trade') add(d.pen.stat, d.pen.v);
    }
    const hooks = {};
    for (const k in passives) if (PASSIVE[k].kind === 'hook') hooks[k] = passiveValue(passives[k]);
    mods.passives = hooks;
    const maxHp = Math.round((def.hp + (mods.hp || 0)) * (1 + (mods.hp_pct || 0)));
    delete mods.hp; delete mods.hp_pct;
    return { maxHp, mods, passives };
  }
  // 대략적인 전투력 점수 (정렬·비교 표시용)
  function itemScore(p, item, heroId) {
    const cls = BASE[item.base].cls !== 'common' ? BASE[item.base].cls : heroId ? heroClass(heroId) : 'melee';
    const ci = classInfo(cls);
    let s = 0;
    for (const e of itemEffects(p, item, heroId)) {
      if (e.stat === 'atk') s += e.v / ci.baseAtk * 50;
      else if (e.stat === 'hp') s += e.v / ci.baseHp * 50;
      else if (STAT[e.stat] && STAT[e.stat].pw) s += e.v * 100 * STAT[e.stat].pw;
      else if (SB[e.stat]) s += e.v * 100 * 0.12;
    }
    if (item.passive) s += passiveValue(item.passive) * (PASSIVE[item.passive.key].kind === 'hook' ? 0.6 : 100 * ((STAT[PASSIVE[item.passive.key].stat] || {}).pw || 0.15));
    return Math.round(s * 10);
  }

  // ------------------------------------------------------------ 강화
  function enhanceCap(item) { return DB.enhance.capByGrade[item.grade]; }
  function enhanceInfo(item) {
    if (item.enh >= enhanceCap(item)) return null;
    const L = DB.enhance.levels[item.enh];
    const bonus = Math.min(DB.enhance.failBonusMax, item.fail * DB.enhance.failBonusStep);
    const rate = Math.min(1, L.rate * (1 + bonus));
    return { target: item.enh + 1, base: L.rate, rate: item.artisan >= 1 ? 1 : rate, stones: L.stones, gold: L.gold, artisan: Math.min(1, item.artisan), guaranteed: item.artisan >= 1 };
  }
  function tryEnhance(p, item, rng) {
    const info = enhanceInfo(item);
    if (!info) return { ok: false, reason: 'max' };
    if (p.stones < info.stones) return { ok: false, reason: 'stones' };
    if (p.gold < info.gold) return { ok: false, reason: 'gold' };
    p.stones -= info.stones; p.gold -= info.gold;
    const success = info.guaranteed || rng() < info.rate;
    if (success) { item.enh++; item.fail = 0; item.artisan = 0; }
    else { item.fail++; item.artisan = Math.min(1, item.artisan + info.rate * DB.enhance.artisanFactor); }
    return { ok: true, success, info };
  }
  function visualTier(enh) { const v = DB.enhance.visualTiers; return enh >= v[2] ? 3 : enh >= v[1] ? 2 : enh >= v[0] ? 1 : 0; }

  // ------------------------------------------------------------ 장착 / 분해 / 보석
  function equip(p, heroId, item) {
    const slot = BASE[item.base].slot;
    const prevOwner = equippedBy(p, item.uid);
    if (prevOwner) p.equip[prevOwner][slot] = null;
    p.equip[heroId][slot] = item.uid;
  }
  function unequip(p, heroId, slot) { p.equip[heroId][slot] = null; }
  function dismantle(p, item) {
    const owner = equippedBy(p, item.uid);
    if (owner) p.equip[owner][BASE[item.base].slot] = null;
    for (const gu of item.gems) if (gu) { const gem = findGem(p, gu); if (gem) gem.inItem = null; }
    p.inv.splice(p.inv.indexOf(item), 1);
    const n = DB.dismantle[item.grade] + item.enh;
    p.stones += n;
    return n;
  }
  function socket(p, item, idx, gem) {
    if (gem.inItem) { const old = findItem(p, gem.inItem); if (old) old.gems = old.gems.map((g) => (g === gem.uid ? null : g)); }
    const prev = item.gems[idx];
    if (prev) { const pg = findGem(p, prev); if (pg) pg.inItem = null; }
    item.gems[idx] = gem.uid; gem.inItem = item.uid;
  }
  function unsocket(p, item, idx) { const gu = item.gems[idx]; if (gu) { const g = findGem(p, gu); if (g) g.inItem = null; } item.gems[idx] = null; }

  // ------------------------------------------------------------ 드랍
  function dropGrade(rng, source, tier) {
    const row = DB.drops[source][String(Math.max(1, Math.min(8, tier || 1)))];
    return weighted(rng, GRADES.map((g, i) => [g, row[i]]));
  }
  // 파티 직업 장비 또는 공통 장신구 중 하나
  function dropItem(rng, p, source, tier, partyHeroIds) {
    const slot = SLOTS[Math.floor(rng() * SLOTS.length)];
    let cls = 'common';
    if (slot === 'weapon' || slot === 'armor' || slot === 'medal') cls = heroClass(partyHeroIds[Math.floor(rng() * partyHeroIds.length)]);
    const lines = DB.items.filter((it) => it.slot === slot && it.cls === cls);
    const base = lines[Math.floor(rng() * lines.length)];
    return rollItem(rng, p, { base: base.id, grade: dropGrade(rng, source, tier) });
  }
  function dropGem(rng, p, tier) { return rollGem(rng, p, dropGrade(rng, 'boss', tier)); }

  // 전투 레벨: 장비 레벨(등급 × 10 + 강화) 6부위 평균. 던전 레벨과의 차이가 전투 보정(levelGapMult)이 된다
  // (캐릭터 레벨이 생기면 여기에 더한다)
  function itemLevel(item) { return (G[item.grade].idx + 1) * 10 + (item.enh || 0); }
  function heroLevel(p, heroId) {
    let sum = 0;
    for (const s of SLOTS) { const uid = p.equip[heroId] && p.equip[heroId][s]; const item = uid && findItem(p, uid); if (item) sum += itemLevel(item); }
    return Math.round(sum / SLOTS.length);
  }
  function tierLevel(t) { return t ? (G[DB.tiers[t - 1].recGrade].idx + 1) * 10 + 5 : 0; }
  function levelGap(p, heroId, t) { return heroLevel(p, heroId) - tierLevel(t); }

  // 난이도 단계: 0 = 기본 던전(장비 없이 깰 수 있는 데모 난이도), 1~8 = EQUIP_DB.tiers
  function tierInfo(t) {
    if (!t) return { tier: 0, name: '기본', hp: 1, atk: 1, recGrade: null };
    return DB.tiers[t - 1];
  }

  // ------------------------------------------------------------ 표시 문자열
  function fmtStat(stat, v) {
    const s = STAT[stat];
    if (stat === 'atk' || stat === 'hp') return `${s.name} +${Math.round(v * 10) / 10}`;
    if (SB[stat]) return SB[stat].text.replace('{v}', Math.round(v * 1000) / 10 + '%');
    const name = s ? s.name : EXTRA_STAT_NAME[stat] || stat;
    const pct = Math.round(Math.abs(v) * 1000) / 10;
    return `${name} ${v < 0 ? '-' : '+'}${pct}%`;
  }
  function passiveText(ps) {
    const d = PASSIVE[ps.key], v = passiveValue(ps);
    const vs = d.kind === 'hook' ? (d.unit === '초' ? Math.round(v * 10) / 10 + '초' : d.unit === '' ? Math.round(v) : Math.round(v * 100) + '%') : Math.round(v * 1000) / 10 + '%';
    return d.text.replace('{v}', vs) + (d.penText ? ` / ${d.penText}` : '');
  }
  function itemName(item) { return (item.enh ? `+${item.enh} ` : '') + BASE[item.base].name; }

  return {
    DB, GRADES, G, BASE, PASSIVE, GEM, SLOTS, SLOT_NAME, SKILL_BONUS,
    heroClass, usableBy, newProfile, loadProfile, saveProfile, findItem, findGem, equippedBy,
    rollItem, rollPassive, rollGem, mainStats, itemEffects, heroLoadout, itemScore, passiveValue, gemEffects,
    enhanceCap, enhanceInfo, tryEnhance, visualTier, equip, unequip, dismantle, socket, unsocket,
    dropGrade, dropItem, dropGem, tierInfo, itemLevel, heroLevel, tierLevel, levelGap, fmtStat, passiveText, itemName,
  };
})();
