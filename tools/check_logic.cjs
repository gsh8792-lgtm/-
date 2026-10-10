// 로직 검증 (브라우저 불필요): node tools/check_logic.cjs
// 1) 지도 생성 제약 1000시드  2) 같은 시드 → 같은 지도  3) 같은 시드 → 같은 전투 결과
const fs = require('fs'), vm = require('vm');
const code = ['00_util.js', '01_data.js', '01b_equip_db.js', '01c_characters.js', '01d_gear_skills.js', '01e_talents.js', '04b_equip.js', '04c_gacha.js', '05_map.js', '05b_dungeon.js', '05c_hunt.js', '05d_oaths.js', '05e_sites.js', '06_battle_sim.js', '08b_explore.js', '08d_world.js', '08e_territory.js', '09e_codex.js', '09f_achieve.js'].map((f) => fs.readFileSync(__dirname + '/../src/js/' + f, 'utf8')).join('\n');
const ctx = { console, safeStorageGet: () => null, safeStorageSet: () => {}, saveProfile: () => {} }; vm.createContext(ctx);
vm.runInContext(code.replace(/const MapScene[\s\S]*?\n};\n/, '') + '\nthis.X={TERRITORY,terrState,capturePost,zoneSecured,terrRate,terrPending,terrCollect,terrMaybeInvade,terrBonus,postWaves,postInfo,DUNGEON_SITES,ENCOUNTERS_MINE,ACHIEVEMENTS,achCheck,achAdd,achBossWin,OATHS,oathScale,oathReward,oathWaves,oathApplyStart,TALENTS,talentAdd,talentMods,talentPoints,talentSpent,talentReset,HuntSim,HUNT_FIELDS,HUNT,huntGradeTable,huntHeroFrom,huntExpMult,AUTO_REACT,BOSS_KITS,WIPE_AT,DUNGEON,BOSS_GIMMICKS,genFloor,floorNeighbors,bossOpen,corridorTrack,corridorWaves,floorStage,dungeonNextStep,ELITE_AFFIXES,CHAR_LV,GEAR_SKILLS,SKILLS,CONST,ENEMIES,EQ,GACHA,CHARACTERS,ultDefFor,ultChoices,BREAKTHROUGH,makeRng,BattleSim,ENCOUNTERS,HEROES,AI_PRESETS,NODE_TYPES,EVENTS,encounterFor};', ctx);
const { TERRITORY, terrState, capturePost, zoneSecured, terrRate, terrPending, terrCollect, terrMaybeInvade, terrBonus, postWaves, postInfo, DUNGEON_SITES, ENCOUNTERS_MINE, ACHIEVEMENTS, achCheck, achAdd, achBossWin, OATHS, oathScale, oathReward, oathWaves, oathApplyStart, TALENTS, talentAdd, talentMods, talentPoints, talentSpent, talentReset, HuntSim, HUNT_FIELDS, HUNT, huntGradeTable, huntHeroFrom, huntExpMult, AUTO_REACT, BOSS_KITS, WIPE_AT, DUNGEON, BOSS_GIMMICKS, genFloor, floorNeighbors, bossOpen, corridorTrack, corridorWaves, floorStage, dungeonNextStep, ELITE_AFFIXES, CHAR_LV, GEAR_SKILLS, SKILLS, CONST, ENEMIES, EQ, GACHA, CHARACTERS, ultDefFor, ultChoices, BREAKTHROUGH, makeRng, BattleSim, ENCOUNTERS, HEROES, AI_PRESETS, NODE_TYPES, encounterFor } = ctx.X;
let fail = 0;
// 던전 층 생성: 1000시드 × 6층 — 연결성, 입구·계단(보스)·기믹 방 수, 복도 내용, 결정성
{
  const errs = []; const kinds = {};
  for (let seed = 1; seed <= 1000; seed++) for (let floor = 1; floor <= DUNGEON.BOSS_FLOOR; floor++) {
    const f = genFloor(seed, floor);
    if (JSON.stringify(genFloor(seed, floor)) !== JSON.stringify(f)) errs.push('nondeterministic ' + seed);
    const n = f.rooms.length; if (n < 3 || n > 6) errs.push('room count ' + n);
    if (floor === 3 && !f.rooms.some((r) => r.type === 'camp')) errs.push('no camp on floor 3');
    const cells = new Set(f.rooms.map((r) => r.gx + ',' + r.gy)); if (cells.size !== n) errs.push('overlap');
    const seen = new Set([0]); const q = [0]; while (q.length) { const c = q.shift(); for (const nb of floorNeighbors(f, c)) if (!seen.has(nb.room.id)) { seen.add(nb.room.id); q.push(nb.room.id); } }
    if (seen.size !== n) errs.push('disconnected ' + seed + '/' + floor);
    const cnt = (t) => f.rooms.filter((r) => r.type === t).length;
    for (const r of f.rooms) kinds[r.type] = (kinds[r.type] || 0) + 1;
    if (f.rooms[0].type !== 'start') errs.push('start');
    if (floor < DUNGEON.BOSS_FLOOR && cnt('stairs') !== 1) errs.push('stairs');
    if (floor === DUNGEON.BOSS_FLOOR) { const G = BOSS_GIMMICKS[f.gimmick]; if (cnt('boss') !== 1 || cnt(G.kind) !== G.need) errs.push(`boss floor ${f.gimmick} ${cnt(G.kind)}`); if (bossOpen(f)) errs.push('boss open at start'); }
    for (const c of f.corridors) {
      const fights = c.items.filter((x) => x.kind === 'fight' || x.kind === 'elite').length, extras = c.items.filter((x) => x.kind === 'trap' || x.kind === 'supply' || x.kind === 'curio').length;
      if (c.items.length !== 1 || fights + extras !== 1) errs.push(`corridor ${fights}/${extras}`);
      for (const it of c.items) if ((it.kind === 'fight' && !corridorWaves(f, it)[0].length) || it.x <= 0 || it.x >= c.len) errs.push('corridor item');
      const tr = corridorTrack(c, c.b); if (tr.some((p, i) => i && p.x < tr[i - 1].x)) errs.push('track order');
    }
    for (const r of f.rooms) if (r.fight && r.type !== 'boss' && !encounterFor({ type: r.fight.type, stage: floorStage(floor), enc: r.fight.enc })) errs.push('room enc');
  }
  console.log('dungeon: 6000 floors checked,', errs.length ? 'FAIL ' + [...new Set(errs)].slice(0, 8).join(' | ') : 'OK', JSON.stringify(kinds));
  if (errs.length) fail++;
}
// 전투 결정성
const strat = JSON.parse(JSON.stringify(AI_PRESETS));
const mk = () => BattleSim.runHeadless({ seed: 4242, stage: 3, waves: ENCOUNTERS.battle[3][0], strategy: strat, heroes: ['tobi', 'danbi', 'bori'].map((id) => ({ id, hp: HEROES[id].hp, maxHp: HEROES[id].hp, upgrades: {} })) });
const a = mk(), b = mk();
const sa = JSON.stringify(a.summary()), sb = JSON.stringify(b.summary());
console.log('battle determinism:', sa === sb ? 'OK' : 'MISMATCH', `(outcome=${a.outcome}, t=${a.time.toFixed(2)}s)`);
if (sa !== sb) fail++;
// 동작 고정 + 드래그 회피
{
  const heroes = ['tobi', 'danbi', 'bori'].map((id) => ({ id, hp: HEROES[id].hp, maxHp: HEROES[id].hp, upgrades: {} }));
  const step = (sim, sec) => { for (let i = 0; i < Math.round(sec * 60); i++) sim.step(1 / 60); };
  // 1) 공격 동작 중 이동 명령 → 동작이 끝날 때까지 제자리, 그 뒤 이동
  const s1 = new BattleSim({ seed: 7, stage: 1, waves: [['goblin']], strategy: strat, heroes });
  step(s1, 1.2);
  const d = s1.heroes.find((h) => h.key === 'danbi');
  s1._basicAttack(d, s1.enemies[0]);
  const x0 = d.x, y0 = d.y;
  s1.command(d, { type: 'move', x: 60, y: 400 });
  step(s1, 0.2);
  const heldDuringAttack = Math.hypot(d.x - x0, d.y - y0) < 0.5;
  step(s1, 0.5);
  const movedAfter = Math.hypot(d.x - x0, d.y - y0) > 5;
  // 스킬(필살기) 동작도 동일
  d.ult = 100; s1.cast(d, 'ult', { unit: s1.enemies[0] });
  const ux = d.x, uy = d.y; s1.command(d, { type: 'move', x: 900, y: 330 }); step(s1, 0.6);
  const heldDuringUlt = Math.hypot(d.x - ux, d.y - uy) < 0.5;
  const lockOk = heldDuringAttack && movedAfter && heldDuringUlt;
  console.log('action lock:', lockOk ? 'OK' : 'FAIL', JSON.stringify({ heldDuringAttack, movedAfter, heldDuringUlt }));
  if (!lockOk) fail++;
  // 2) 오우거 차지 범위에서 끌어 빼면 피해를 안 받는다 (안 빼면 받는다)
  const dodgeRun = (dodge) => {
    const s = new BattleSim({ seed: 11, stage: 3, waves: [['ogre']], strategy: strat, heroes, autoMode: false });
    const o = () => s.enemies.find((e) => e.key === 'ogre');
    for (let i = 0; i < 60 * 40 && !(o() && o().charge); i++) s.step(1 / 60);
    const c = o() && o().charge; if (!c) return null;
    const victim = s.heroes.find((h) => h.alive && h.key !== 'tobi' && s.inChargeZone(h, c)) || s.heroes.find((h) => h.alive && s.inChargeZone(h, c));
    if (!victim) return { none: true };
    s.heroes.filter((h) => h !== victim).forEach((h) => { h.cmd = null; });
    s.command(victim, dodge ? { type: 'move', x: Math.max(50, c.cx - c.r - 60), y: victim.y } : { type: 'move', x: victim.x, y: victim.y }); // 그대로 버티기 vs 끌어서 피하기
    let impact = false, lost = 0;
    while (!impact && s.time < 200) { s.step(1 / 60); for (const e of s.events) if (e.type === 'hit' && e.charge && e.target === victim) lost += e.amount; s.events.length = 0; impact = !o().charge; }
    return { key: victim.key, lost: Math.round(lost) };
  };
  const stay = dodgeRun(false), go = dodgeRun(true);
  const dodgeOk = stay && go && !stay.none && go.lost < stay.lost * 0.5;
  console.log('drag dodge:', dodgeOk ? 'OK' : 'FAIL', JSON.stringify({ stay, go }));
  if (!dodgeOk) fail++;
}
// 장비: 생성 규칙 3,000개 + 강화 + 능력치 합산
{
  const rng = makeRng(99), p = EQ.newProfile();
  const errs = [];
  const G = EQ.G;
  for (let n = 0; n < 3000; n++) {
    const base = EQ.DB.items[n % EQ.DB.items.length], grade = EQ.GRADES[Math.floor(rng() * 8)];
    const it = EQ.rollItem(rng, p, { base: base.id, grade });
    const g = G[grade];
    if (it.opts.length !== g.opt) errs.push(`opt count ${grade} ${it.opts.length}`);
    if (new Set(it.opts.map((o) => o.stat)).size !== it.opts.length) errs.push('dup option');
    if (it.gems.length < g.gem[0] || it.gems.length > g.gem[1]) errs.push(`gem slots ${grade} ${it.gems.length}`);
    if (grade === 'E' && !it.cls) errs.push('E without class stat');
    if (grade === 'L' && it.cls && it.sb.length) errs.push('L with both class stat and skill bonus');
    if (it.sb.length > g.skill[1]) errs.push('skill bonus count');
    if ((base.slot === 'armor') !== !!it.passive) errs.push('passive only on armor');
    if (it.passive && G[it.passive.grade].idx > g.idx) errs.push('passive grade above item grade');
    if (it.passive && G[EQ.PASSIVE[it.passive.key].min].idx > G[it.passive.grade].idx) errs.push('passive below its min grade');
  }
  // 강화: 확률 표, 장인의 기운이 차면 확정 성공, 한도
  const it = EQ.rollItem(rng, p, { base: 'melee_weapon_1', grade: 'UR' });
  p.stones = 1e6; p.gold = 1e9;
  let tries = 0;
  while (it.enh < 15 && tries < 5000) { EQ.tryEnhance(p, it, rng); tries++; }
  if (it.enh !== 15) errs.push('could not reach +15');
  if (EQ.tryEnhance(p, it, rng).reason !== 'max') errs.push('enhance past cap');
  const t2 = EQ.rollItem(rng, p, { base: 'melee_weapon_1', grade: 'UR' }); t2.enh = 14;
  const never = () => 0.999999; let n2 = 0; // 항상 실패하는 rng → 장인의 기운으로만 성공
  while (t2.enh < 15 && n2 < 200) { EQ.tryEnhance(p, t2, never); n2++; }
  if (t2.enh !== 15) errs.push('artisan energy never guaranteed success');
  const uc = EQ.rollItem(rng, p, { base: 'melee_weapon_1', grade: 'UC' }); uc.enh = 5;
  if (EQ.enhanceInfo(uc) !== null) errs.push('UC cap should be +5');
  // 능력치 합산: 장착 → maxHp·atk 증가, 같은 패시브는 최고 등급 하나만
  const q = EQ.newProfile();
  const w = EQ.rollItem(rng, q, { base: 'melee_weapon_1', grade: 'SR' }); q.inv.push(w); EQ.equip(q, 'danbi', w);
  const ar = EQ.rollItem(rng, q, { base: 'melee_armor_1', grade: 'SR' }); q.inv.push(ar); EQ.equip(q, 'danbi', ar);
  const lo = EQ.heroLoadout(q, 'danbi');
  if (!(lo.maxHp > HEROES.danbi.hp) || !(lo.mods.atk > 0)) errs.push('loadout does not add stats');
  const w15 = Object.assign({}, w, { enh: 15 });
  if (!(EQ.mainStats(w15)[0].v > EQ.mainStats(w)[0].v * 1.85)) errs.push('enhance main stat +90% at +15');
  console.log('equipment:', errs.length ? 'FAIL ' + [...new Set(errs)].join(' | ') : 'OK', `(3000 items, +15 in ${tries} tries, pity success after ${n2} fails)`);
  if (errs.length) fail++;
}
// 캐릭터: 15명 × 필살기 6종 시전 + 핵심 효과 검증 + 소환/돌파
{
  const errs = [];
  const strat0 = JSON.parse(JSON.stringify(AI_PRESETS));
  const mk = (ids, waves, ult) => new BattleSim({ seed: 11, stage: 2, waves: waves || [['orc', 'goblin']], strategy: strat0, partySize: ids.length,
    heroes: ids.map((id) => ({ id, hp: HEROES[id].hp, maxHp: HEROES[id].hp, upgrades: {}, ultDef: ult && ult[id] ? ultDefFor(id, ult[id], 5) : null })) });
  const run = (sim, sec) => { for (let i = 0; i < Math.round(sec * 60); i++) sim.step(1 / 60); };
  const ready = (sim) => { run(sim, 1.2); sim.autoMode = false; for (const h of sim.heroes) { h.ult = 100; h.castLock = 0; h.actLock = 0; } };
  if (CHARACTERS.length < 16) errs.push('character count');
  for (const role of ['tank', 'melee', 'ranged', 'mage', 'support']) if (CHARACTERS.filter((c) => c.role === role).length < 3) errs.push('3+ per class: ' + role);
  // 90개 전부 시전
  for (const c of CHARACTERS) for (const k of ['A', 'A2', 'B', 'B2', 'C', 'C2']) {
    const sim = mk([c.id, 'tobi'], null, { [c.id]: k }); ready(sim);
    const h = sim.heroes[0], sk = sim.skillDef(h, 'ult');
    try { const sp = sim.resolveTarget(h, 'ult') || (sk.target === 'ally' ? { unit: h } : {}); if (!sim.cast(h, 'ult', sp)) errs.push('cast refused ' + c.id + k); run(sim, 3.5); }
    catch (e) { errs.push(`${c.id} ${k}: ${e.message}`); }
  }
  // 긴 시전: 시전 중 피해 없음 + 이동 불가, 끝나면 큰 피해
  { const sim = mk(['haram'], [['orc']], { haram: 'A' }); ready(sim); const h = sim.heroes[0], e = sim.enemies[0]; e.hp = e.maxHp = 99999;
    sim.cast(h, 'ult', { unit: e }); run(sim, 0.8); const mid = e.maxHp - e.hp; const x0 = h.x; sim.command(h, { type: 'move', x: 60, y: 400 }); run(sim, 0.5);
    if (Math.abs(h.x - x0) > 0.5) errs.push('moved while casting'); run(sim, 0.6); if (!(e.maxHp - e.hp > mid + 150)) errs.push('delayed snipe did not land'); }
  // 처형: HP 낮은 적에게 배율
  { const sim = mk(['kai'], [['goblin', 'goblin']], { kai: 'A' }); ready(sim); const h = sim.heroes[0]; const [lo, hi] = sim.enemies; lo.maxHp = hi.maxHp = 9000; lo.hp = 2000; hi.hp = 9000;
    const sk = sim.skillDef(h, 'ult'); h.def = Object.assign({}, h.def, { traits: [] }); sim._critChance = () => 0;
    const a = sim._skillHit(h, sk, lo, 100), b = sim._skillHit(h, sk, hi, 100); if (!(a > b * 2)) errs.push(`execute ${a} vs ${b}`); }
  // 그로기 배율
  { const sim = mk(['bran'], [['ogre']], { bran: 'C' }); ready(sim); const h = sim.heroes[0], e = sim.enemies[0]; sim._critChance = () => 0; const sk = sim.skillDef(h, 'ult');
    e.hp = e.maxHp = 99999; const n = sim._skillHit(h, sk, e, 100); e.broken = 5; const br = sim._skillHit(h, sk, e, 100); if (!(br > n * 4)) errs.push(`brokenMult ${br} vs ${n}`); }
  // 부활
  { const sim = mk(['bori', 'danbi'], null, { bori: 'C' }); ready(sim); const d = sim.heroes[1]; d.alive = false; d.hp = 0; sim.cast(sim.heroes[0], 'ult', {}); run(sim, 0.5);
    if (!d.alive || d.hp < d.maxHp * 0.35) errs.push('revive'); }
  // 보호막
  { const sim = mk(['sera', 'danbi'], null, { sera: 'B' }); ready(sim); const d = sim.heroes[1]; sim.cast(sim.heroes[0], 'ult', { unit: d }); run(sim, 0.3);
    if (!(d.statuses.shield && d.statuses.shield.value > 0)) errs.push('shield'); const hp = d.hp; sim._damage(sim.enemies[0], d, 30, {}); if (d.hp !== hp) errs.push('shield did not absorb'); }
  // 독 폭발
  { const sim = mk(['mir'], [['orc']], { mir: 'C' }); ready(sim); const e = sim.enemies[0]; e.hp = e.maxHp = 99999; e.statuses.poison = { t: 8, dps: 20, src: sim.heroes[0] };
    sim.cast(sim.heroes[0], 'ult', {}); run(sim, 0.6); if (e.statuses.poison && e.statuses.poison.t > 7) errs.push('poison not detonated'); if (!(e.maxHp - e.hp > 100)) errs.push('detonate damage ' + (e.maxHp - e.hp)); }
  // 쿨타임 감소 + 필살기 게이지 지급
  { const sim = mk(['lumi', 'danbi'], null, { lumi: 'B' }); ready(sim); const d = sim.heroes[1]; d.cds.s1 = 6; d.cds.s2 = 9; d.ult = 0; sim.cast(sim.heroes[0], 'ult', {});
    if (!(Math.abs(d.cds.s1 - 2) < 0.01 && Math.abs(d.cds.s2 - 5) < 0.01)) errs.push(`cdReduce ${d.cds.s1} ${d.cds.s2}`); if (!(d.ult >= 15)) errs.push('ultGive'); }
  // 소환: 소환권 소모, 신규/돌파/초과 처리, 돌파에 따른 변주 해금
  { const p = GACHA.ensure(EQ.newProfile()); const r = makeRng(1);
    if (GACHA.ownedIds(p).length !== 5 + CHARACTERS.filter((c) => c.gift).length || p.tickets !== GACHA.START_TICKETS) errs.push('starter chars/tickets');
    p.tickets = 200; const own0 = GACHA.ownedIds(p).length; const res = GACHA.pull(p, r, 200);
    if (res.length !== 200 || p.tickets !== 0) errs.push('pull count');
    const heroes = res.filter((x) => x.kind === 'hero').length; if (heroes < 2 || heroes > 18) errs.push('hero rate ' + heroes);
    const sh = Object.values(p.shards || {}).reduce((a, b) => a + b, 0); if (sh < 400 || sh > 900) errs.push('shard total ' + sh);
    if (GACHA.ownedIds(p).length > own0 + 18) errs.push('too many new heroes');
    if (Object.values(p.chars).some((c) => c.bt > 0)) errs.push('pull should not break through');
    p.shards.kai = 0; if (GACHA.owned(p, 'kai')) delete p.chars.kai; GACHA.addShards(p, 'kai', 39); if (GACHA.unlock(p, 'kai')) errs.push('unlock with 39');
    GACHA.addShards(p, 'kai', 1 + 20); if (!GACHA.unlock(p, 'kai') || GACHA.shards(p, 'kai') !== 20) errs.push('unlock 40');
    if (!GACHA.breakthrough(p, 'kai') || p.chars.kai.bt !== 1 || GACHA.shards(p, 'kai') !== 0) errs.push('bt1 cost 20');
    if (GACHA.breakthrough(p, 'kai')) errs.push('bt2 without 30');
    if (GACHA.pull(p, r, 1) !== null) errs.push('pull without tickets');
    if (ultChoices('kai', 0).length !== 3 || ultChoices('kai', 5).length !== 6) errs.push('variant unlocks');
    if (!(ultDefFor('kai', 'A', 1).power > ultDefFor('kai', 'A', 0).power)) errs.push('bt1 boost'); }
  console.log('characters:', errs.length ? 'FAIL ' + [...new Set(errs)].slice(0, 8).join(' | ') : 'OK', '(chars × 6 ultimates cast, mechanics, soul-shard gacha)');
  if (errs.length) fail++;
}
// 그로기 역할 분담 규칙 (흔들림 · 끊기 합산 · 점감 · 반복 그로기 · 보스 기믹)
{
  const errs = [];
  const st0 = JSON.parse(JSON.stringify(AI_PRESETS));
  const mk = (waves, ids) => { const sim = new BattleSim({ seed: 5, stage: 5, waves, strategy: st0, autoMode: false, partySize: 3, heroes: (ids || ['tobi', 'byeolbi', 'danbi']).map((id) => ({ id, hp: 9999, maxHp: 9999, upgrades: {} })) }); for (let i = 0; i < 90; i++) sim.step(1 / 60); return sim; };
  const boss = (sim, k) => sim.enemies.find((e) => e.key === k);
  const startCharge = (sim, b) => { b.x = 700; b.charge = { t: 3, total: 3, cx: 300, cy: 380, r: 80, mult: 1 }; };
  // 1) 끊기 합산: 원딜 60 단독 실패(절반은 그로기), 60+50은 성공
  { const sim = mk([['ogre_chief']]); const b = boss(sim, 'ogre_chief'); const [, by, db] = sim.heroes;
    startCharge(sim, b); const p0 = b.poise; sim._interrupt(by, b, 2);
    if (!b.charge) errs.push('2 pips alone cancelled'); for (let i = 0; i < 150; i++) sim.step(1 / 60);
    if (!(b.poise < p0 - 20)) errs.push('failed interrupt gave no poise');
    startCharge(sim, b); b.intr = null; sim._interrupt(by, b, 2); sim._interrupt(by, b, 2);
    if (!b.charge) errs.push('same role stacked'); sim._interrupt(db, b, 1);
    if (b.charge) errs.push('2+1 pips did not cancel'); if (!(b.shaken > 0)) errs.push('cancel did not shake'); }
  // 2) 흔들림 중 회복 정지, 끝나면 지연 후 회복
  { const sim = mk([['ogre_chief']]); const b = boss(sim, 'ogre_chief'); for (const h of sim.heroes) h.atkTimer = 1e9; b.poise = 100; sim._shake(b, 8); for (let i = 0; i < 60 * 4; i++) sim.step(1 / 60);
    if (Math.abs(b.poise - 100) > 25) errs.push('regen during shake ' + b.poise); for (let i = 0; i < 60 * 7; i++) sim.step(1 / 60); if (!(b.poise > 110)) errs.push('no regen after shake'); }
  // 3) 기절 점감 0.6 → 0.3
  { const sim = mk([['ogre_chief']]); const b = boss(sim, 'ogre_chief'); const t = sim.heroes[0]; const p = []; b.poise = 220;
    for (let i = 0; i < 3; i++) { const before = b.poise; sim._applyStatus(t, b, { status: 'stun', dur: 2 }); p.push(Math.round(before - b.poise)); delete b.statuses.stun; b.shaken = 0; }
    if (!(p[1] < p[0] * 0.7 && p[2] < p[0] * 0.4)) errs.push('stun DR ' + p.join('/')); }
  // 4) 반복 그로기: 최대치 증가 (상한 1.3배) + 종료 후 3초 잠금
  { const sim = mk([['ogre_chief']]); const b = boss(sim, 'ogre_chief'); const t = sim.heroes[0];
    sim._poiseHit(t, b, 999, 'skill'); if (!(b.broken > 0) || Math.abs(b.poiseMax - 220 * 1.15) > 1) errs.push('growth ' + b.poiseMax);
    for (let i = 0; i < 60 * 6.2; i++) sim.step(1 / 60); const pz = b.poise; sim._poiseHit(t, b, 50, 'skill'); if (b.poise !== pz) errs.push('lock after break');
    for (let n = 0; n < 4; n++) { b.breakLock = 0; b.broken = 0; sim._poiseHit(t, b, 999, 'skill'); } if (b.poiseMax > 220 * 1.3 + 0.1) errs.push('growth cap'); }
  // 5) 늪거북: 기절로 차지가 끊기지 않음 / 사슴왕: 정면 그로기 ×0.3, 2페이즈 기절 면역
  { const sim = mk([['swamp_turtle']]); const b = boss(sim, 'swamp_turtle'); startCharge(sim, b); sim._applyStatus(sim.heroes[0], b, { status: 'stun', dur: 2 }); sim.step(1 / 60);
    if (!b.charge) errs.push('turtle charge cancelled by stun'); }
  { const sim = mk([['mist_stag']]); const b = boss(sim, 'mist_stag'); b.face = -1; const h = sim.heroes[1]; h.x = b.x - 100; b.poise = 200; b.shaken = 0;
    sim._poiseHit(h, b, 50, 'skill'); const front = 200 - b.poise; h.x = b.x + 100; b.poise = 200; sim._poiseHit(h, b, 50, 'skill'); const back = 200 - b.poise;
    if (!(Math.abs(front - 15) < 1 && Math.abs(back - 50) < 1)) errs.push(`stag front/back ${front}/${back}`);
    b.hp = b.maxHp * 0.45; sim.step(1 / 60); sim._applyStatus(h, b, { status: 'stun', dur: 2 }); if (b.statuses.stun) errs.push('stag phase2 stunnable'); }
  // 6) 가시덩굴 여왕: 꽃봉오리 3개가 동시에 호출, 범위 끊기 한 번으로 모두 끊김
  { const sim = mk([['thorn_queen']], ['tobi', 'soldam', 'bori']); const q = boss(sim, 'thorn_queen');
    for (let i = 0; i < 60 * 8 && !sim.enemies.some((e) => e.key === 'thorn_bud' && e.call); i++) sim.step(1 / 60);
    const buds = sim.enemies.filter((e) => e.key === 'thorn_bud' && e.alive);
    if (buds.length !== 3 || !buds.every((b) => b.call)) errs.push('buds not calling together ' + buds.length);
    const so = sim.heroes.find((h) => h.key === 'soldam'); so.cds.s2 = 0; so.castLock = 0;
    const sp = sim.resolveTarget(so, 's2'); sim.cast(so, 's2', sp); for (let i = 0; i < 60; i++) sim.step(1 / 60);
    if (buds.some((b) => b.call)) errs.push('area interrupt missed a bud'); }
  console.log('break roles:', errs.length ? 'FAIL ' + errs.join(' | ') : 'OK', '(interrupt sum, shake, stun DR, break growth/lock, turtle, stag, queen buds)');
  if (errs.length) fail++;
}
// 보스 압박 (짓누름 · 탱커 위협 · 덮치기) + 레벨 차이 + 서포터 평타
{
  const errs = [];
  const st0 = JSON.parse(JSON.stringify(AI_PRESETS));
  const mk = (ids, opts) => { const sim = new BattleSim(Object.assign({ seed: 9, stage: 5, waves: [['ogre_chief']], strategy: st0, autoMode: false, partySize: ids.length, heroes: ids.map((id) => ({ id, hp: 9999, maxHp: 9999, upgrades: {} })) }, opts || {})); for (let i = 0; i < 90; i++) sim.step(1 / 60); return sim; };
  const avgHit = (sim, b, h, n) => { let s = 0; for (let i = 0; i < n; i++) { const hp = h.hp; sim._damage(b, h, 100, { basic: true, noCrit: true }); s += hp - h.hp; } return s / n; };
  // 1) 짓누름: 근딜은 맞을수록 크게 아프고, 탱커는 거의 그대로, 버티는 중이면 쌓이지 않음
  { const sim = mk(['tobi', 'danbi', 'bori']); const b = sim.enemies[0]; const [t, d] = sim.heroes;
    const d1 = avgHit(sim, b, d, 1), d6 = avgHit(sim, b, d, 6), t1 = avgHit(sim, b, t, 1), t6 = avgHit(sim, b, t, 6);
    if (!(d.statuses.crush && d.statuses.crush.n === 5)) errs.push('crush cap');
    if (!(d6 / d1 > 1.8)) errs.push('crush too weak on melee ' + (d6 / d1).toFixed(2)); if (!(t6 / t1 < 1.3)) errs.push('crush too strong on tank ' + (t6 / t1).toFixed(2));
    const g = sim.heroes[2]; g.statuses.guard = { t: 3, value: 0 }; sim._damage(b, g, 100, { basic: true }); if (g.statuses.crush) errs.push('crush stacked while guarding'); }
  // 2) 보스는 가까운 탱커를 먼저 노린다 / 짓누름 쌓인 동료를 탱커가 도발로 구한다
  { const sim = mk(['danbi', 'tobi', 'bori']); const b = sim.enemies[0]; b.retarget = 0; b.target = null; sim.step(1 / 60); if (!b.target || b.target.role !== 'tank') errs.push('boss ignored tank ' + (b.target && b.target.key)); }
  { const sim = mk(['tobi', 'danbi', 'bori']); const b = sim.enemies[0]; const [t, d] = sim.heroes; b.chargeCd = 9; b.target = d; d.statuses.crush = { t: 8, n: 3 };
    if (!sim.checkCond(t, 's1', { cond: 'saveForCharge' })) errs.push('tank did not peel crushed ally'); }
  // 3) 멀리서 끌기만 하면 보스가 덮친다
  { const sim = mk(['byeolbi']); const b = sim.enemies[0]; const h = sim.heroes[0]; b.x = 700; h.x = 60; b.target = h; b.retarget = 99; b.speed = 0; let leap = false;
    for (let i = 0; i < 60 * 8 && !leap; i++) { sim.step(1 / 60); leap = sim.events.some((e) => e.type === 'bossLeap'); sim.events.length = 0; } if (!leap) errs.push('no boss leap'); }
  // 4) 레벨 차이: 낮으면 불리, 높으면 유리, 단조
  { const L = ctx.levelGapMult || vm.runInContext('levelGapMult', ctx); let pd = 0, pt = 9;
    for (let g = -40; g <= 80; g += 5) { const m = L(g); if (m.dealt < pd || m.taken > pt) errs.push('gap not monotonic at ' + g); pd = m.dealt; pt = m.taken; }
    if (!(L(-10).taken > 1.2 && L(30).dealt > 1.8 && L(30).taken < 0.3 + 0.01 + 0.25)) errs.push('gap curve');
    const s0 = mk(['danbi']), s1 = mk(['danbi'], { levelGap: 20 }); const hit = (s) => { const b = s.enemies[0], h = s.heroes[0]; const hp = b.hp; s._damage(h, b, 100, { noCrit: true }); return hp - b.hp; };
    if (!(hit(s1) > hit(s0) * 1.4)) errs.push('levelGap not applied'); }
  // 5) 전투 레벨: 장비 등급·강화로 오른다
  { const p = EQ.newProfile(); const r = makeRng(3); if (EQ.heroLevel(p, 'tobi') !== 1) errs.push('no-gear level ' + EQ.heroLevel(p, 'tobi'));
    for (const slot of EQ.SLOTS) { const base = Object.values(EQ.BASE).find((b) => b.slot === slot && (b.cls === 'tank' || b.cls === 'common')); const it = EQ.rollItem(r, p, { base: base.id, grade: 'C' }); it.enh = 4; p.inv.push(it); p.equip.tobi[slot] = it.uid; }
    if (EQ.gearLevel(p, 'tobi') !== 24) errs.push('gear level ' + EQ.gearLevel(p, 'tobi')); if (EQ.tierLevel(2) !== CHAR_LV.recByTier[2] + 25) errs.push('tier level ' + EQ.tierLevel(2));
    const lo = EQ.heroLoadout(p, 'tobi'); if (lo.skills.s1 !== GEAR_SKILLS[EQ.findItem(p, p.equip.tobi.armor).base] || lo.skillRank.s2 !== 1) errs.push('gear skills ' + JSON.stringify(lo.skills)); }
  // 6) 서포터도 평타 사거리 안에서 싸운다
  { const st = JSON.parse(JSON.stringify(AI_PRESETS)); const sim = new BattleSim({ seed: 3, stage: 5, waves: [['ogre_chief']], strategy: st, partySize: 3, heroes: ['tobi', 'danbi', 'bori'].map((id) => ({ id, hp: HEROES[id].hp, maxHp: HEROES[id].hp, upgrades: {} })) });
    let shots = 0; while (!sim.outcome && sim.time < 24) { sim.step(1 / 60); shots += sim.events.filter((e) => e.type === 'projectile' && e.from.key === 'bori').length; sim.events.length = 0; }
    if (shots < 10) errs.push('support rarely attacks ' + shots); }
  console.log('boss pressure:', errs.length ? 'FAIL ' + errs.join(' | ') : 'OK', '(crush, tank aggro/peel, leap, level gap, gear level, support attacks)');
  if (errs.length) fail++;
}
// 장비 스킬 풀 (갑옷 → ①, 무기 → ②) · 랭크 · 자동 전략 · 그로기 역할 유지 + 캐릭터 레벨
{
  const errs = [];
  const st0 = JSON.parse(JSON.stringify(AI_PRESETS));
  const ids = Object.keys(GEAR_SKILLS);
  if (ids.length !== 100 || new Set(Object.values(GEAR_SKILLS)).size !== 100) errs.push('100 distinct gear skills');
  // 직업별 그로기 역할: 어떤 조합이든 끊기/기절/공명 수단이 남는다
  const role = { tank: (sk) => sk.effects.some((e) => e.status === 'stun'), melee: (sk) => sk.interrupt >= 2, ranged: (sk) => sk.interrupt >= 2, mage: (sk) => sk.interrupt >= 1, support: (sk) => sk.effects.some((e) => e.status === 'resonance'), rogue: (sk) => sk.interrupt >= 1, monk: (sk) => sk.interrupt >= 2, warlock: (sk) => sk.interrupt >= 1, demon: (sk) => sk.interrupt >= 1, necro: (sk) => !!(sk.summon || sk.interrupt || sk.shieldPct) };
  const roleSlot = { tank: 'weapon', melee: 'armor', ranged: 'armor', mage: 'weapon', support: 'armor', rogue: 'armor', monk: 'armor', warlock: 'armor', demon: 'armor', necro: 'armor' };
  for (const cls in role) for (const n of [1, 2, 3]) { const sid = GEAR_SKILLS[`${cls}_${roleSlot[cls]}_${n}`]; if (!role[cls](SKILLS[sid])) errs.push('role lost ' + sid); }
  // 모든 장비 스킬이 실제로 시전되고 오류가 없다
  const mk = (id, skills, rank) => { const sim = new BattleSim({ seed: 11, stage: 5, waves: [['ogre_chief', 'goblin', 'goblin']], strategy: st0, autoMode: false, partySize: 3, heroes: [id, 'tobi', 'bori'].filter((x, i, a) => a.indexOf(x) === i).map((x) => ({ id: x, hp: 9999, maxHp: 9999, upgrades: {}, skills: x === id ? skills : null, skillRank: x === id ? rank : null })) }); for (let i = 0; i < 150; i++) sim.step(1 / 60); return sim; };
  const clsHero = { tank: 'tobi', melee: 'kai', ranged: 'mir', mage: 'nox', support: 'lumi', rogue: 'ruka', monk: 'soha', warlock: 'risha', demon: 'roa', necro: 'bella' };
  for (const it of ids) {
    const [cls, kind] = it.split('_'); const slot = kind === 'armor' ? 's1' : 's2'; const hid = clsHero[cls];
    try {
      const sim = mk(hid, { [slot]: GEAR_SKILLS[it] }, { [slot]: 0 }); const h = sim.heroes.find((x) => x.key === hid);
      if (sim.skillDef(h, slot) !== SKILLS[GEAR_SKILLS[it]]) { errs.push('skillDef ' + it); continue; }
      sim.heroes.forEach((x) => { x.hp = x.maxHp * 0.5; }); h.cds[slot] = 0; h.castLock = 0;
      for (const e of sim.enemies) { e.x = h.x + 60; e.y = h.y; }
      const sp = sim.resolveTarget(h, slot); if (!sp) { errs.push('no target ' + it); continue; }
      if (!sim.cast(h, slot, sp)) { errs.push('cast ' + it); continue; } for (let i = 0; i < 120; i++) sim.step(1 / 60);
      if (!(h.cds[slot] > 0)) errs.push('cd ' + it);
    } catch (e) { errs.push(it + ' ' + e.message); }
  }
  // 랭크: 같은 스킬, 높은 등급이 더 아프다
  { const hit = (rank) => { const sim = mk('kai', { s1: 'gs_melee_s1_c' }, { s1: rank }); const h = sim.heroes.find((x) => x.key === 'kai'); const e = sim.enemies.find((x) => x.key === 'goblin'); e.hp = e.maxHp = 1e6; sim.rng = () => 0.5; h.cds.s1 = 0; h.castLock = 0; sim.cast(h, 's1', { unit: e }); for (let i = 0; i < 30; i++) sim.step(1 / 60); return 1e6 - e.hp; };
    if (!(hit(7) > hit(0) * 1.2)) errs.push('rank'); }
  // 자동 전략: 바꾼 스킬의 기본 조건을 따른다
  { const sim = mk('bori', { s2: 'gs_support_s2_b' }); const b = sim.heroes.find((x) => x.key === 'bori'); const c = sim.aiConfig(b, 's2', st0.bori.s2); if (c.cond !== 'always' || c.target !== 'focus') errs.push('ai override ' + JSON.stringify(c)); }
  // 가시 반격
  { const sim = mk('tobi', { s1: 'gs_tank_s1_c' }); const t = sim.heroes[0]; const g = sim.enemies.find((x) => x.key === 'goblin'); t.statuses.reflect = { t: 4, value: 0.6 }; const hp = g.hp; sim._damage(g, t, 100, { basic: true }); for (let i = 0; i < 10; i++) sim.step(1 / 60); if (!(g.hp < hp)) errs.push('reflect'); }
  // 캐릭터 레벨: 경험치 → 레벨업 → 필살기 배움, 잠긴 필살기는 못 고름
  { const p = GACHA.ensure(EQ.newProfile()); const st = p.chars.danbi;
    if (st.lv !== 1 || ultChoices('danbi', 0, 1).join() !== 'A') errs.push('lv1 ults');
    GACHA.setUlt(p, 'danbi', 'B'); if (st.ult !== 'A') errs.push('locked ult equipped');
    let need = 0; for (let l = 1; l < 10; l++) need += CHAR_LV.expNext(l);
    const r = GACHA.addExp(p, 'danbi', need); if (st.lv !== 10 || !r.learned.includes('B')) errs.push('levelup ' + JSON.stringify(r));
    GACHA.setUlt(p, 'danbi', 'B'); if (st.ult !== 'B' || GACHA.ultFor(p, 'danbi') !== SKILLS.danbi_ult_B) errs.push('ult B');
    GACHA.addExp(p, 'danbi', 1e9); if (st.lv !== CHAR_LV.max || st.exp !== 0) errs.push('max level');
    if (!(GACHA.ultFor(p, 'danbi').power > SKILLS.danbi_ult_B.power)) errs.push('mastery');
    if (ultChoices('danbi', 0, 70).length !== 3 || ultChoices('danbi', 5, 70).length !== 6) errs.push('variants need bt');
    if (EQ.heroLevel(p, 'danbi') !== 70) errs.push('combat level'); }
  console.log('gear skills & growth:', errs.length ? 'FAIL ' + [...new Set(errs)].slice(0, 10).join(' | ') : 'OK', '(48 skills cast, roles kept, rank, AI, reflect, char level/ults)');
  if (errs.length) fail++;
}
// 자동 길찾기: 자동 모드로 계속 가면 1~5층 계단과 보스 방에 닿는다 (방은 다 깬 것으로 가정, 기믹은 방에 들르면 채움)
{
  const errs = [];
  for (let seed = 1; seed <= 200; seed++) for (let floor = 1; floor <= DUNGEON.BOSS_FLOOR; floor++) {
    const f = genFloor(seed, floor); let steps = 0, done = false;
    while (steps++ < 60) {
      const here = f.rooms[f.at.room]; here.visited = true; here.cleared = true;
      if (['key', 'lever', 'seal'].includes(here.type) && !here.used) { here.used = true; f.have++; }
      if (here.type === 'stairs' || here.type === 'boss') { done = true; break; }
      const nx = dungeonNextStep(f); if (nx === null) break;
      f.at = { room: nx };
    }
    if (!done) errs.push(`stuck seed ${seed} floor ${floor}`);
  }
  console.log('dungeon autopilot:', errs.length ? 'FAIL ' + errs.slice(0, 5).join(' | ') : 'OK', '(200 seeds × 6 floors reach stairs / boss)');
  if (errs.length) fail++;
}
// 넓은 전장: 고정 영역 1440에서 걷던 자리 그대로 시작, 적은 오른쪽, 영역 밖으로 나가지 않음
{
  const errs = [];
  const st = JSON.parse(JSON.stringify(AI_PRESETS)); const heroPos = [{ x: 600, y: 342 }, { x: 554, y: 372 }, { x: 508, y: 402 }];
  const sim = new BattleSim({ seed: 3, stage: 2, waves: encounterFor({ type: 'battle', stage: 2, enc: 1 }), strategy: st, partySize: 3, fieldW: 1440, heroPos, enemySpawnX: 850, heroes: ['tobi', 'danbi', 'bori'].map((id) => ({ id, hp: HEROES[id].hp, maxHp: HEROES[id].hp, upgrades: {} })) });
  if (Math.round(sim.heroes[0].x) !== 600) errs.push('heroPos');
  let minX = 1e9, maxX = -1e9;
  while (!sim.outcome && sim.time < 120) { sim.step(1 / 60); for (const u of sim.heroes.concat(sim.enemies)) if (u.alive && !(u.side === 'enemy' && u.x > sim.W)) { minX = Math.min(minX, u.x); maxX = Math.max(maxX, u.x); } }
  if (minX < sim.X0 - 1 || maxX > sim.X1 + 1) errs.push(`out of field ${minX}..${maxX}`);
  if (sim.outcome !== 'win') errs.push('wide battle outcome ' + sim.outcome);
  console.log('fixed arena:', errs.length ? 'FAIL ' + errs.join(' | ') : 'OK', '(1440 wide, start positions, bounds)');
  if (errs.length) fail++;
}
// 새 몬스터 (궁수·주술사·방패 오크·폭탄 고블린) · 정예 변이 · 기습
{
  const errs = [];
  const st0 = JSON.parse(JSON.stringify(AI_PRESETS));
  const mk = (waves, opts) => { const sim = new BattleSim(Object.assign({ seed: 21, stage: 2, waves, strategy: st0, autoMode: false, partySize: 3, heroes: ['tobi', 'danbi', 'bori'].map((id) => ({ id, hp: 9999, maxHp: 9999, upgrades: {} })) }, opts || {})); return sim; };
  const steps = (sim, sec) => { for (let i = 0; i < sec * 60; i++) sim.step(1 / 60); };
  // 궁수: 원거리, 사거리 밖에서 쏜다
  { const sim = mk([['goblin_archer']]); const a = sim.enemies[0]; if (a.melee || a.reach !== 200) errs.push('archer not ranged'); let shot = false; for (let i = 0; i < 60 * 8 && !shot; i++) { sim.step(1 / 60); shot = sim.events.some((e) => e.type === 'projectile' && e.from === a); sim.events.length = 0; } if (!shot) errs.push('archer never shot'); }
  // 주술사: 영창이 끝나면 다친 동료 치유, 끊으면 치유 없음
  { const sim = mk([['goblin_shaman', 'orc']]); steps(sim, 2); const [sh, orc] = sim.enemies; orc.hp = orc.maxHp * 0.3; sh.callCd = 0; let healed = false;
    for (let i = 0; i < 60 * 4 && !healed; i++) { sim.step(1 / 60); healed = sim.events.some((e) => e.type === 'enemyHeal'); sim.events.length = 0; } if (!healed || !(orc.hp > orc.maxHp * 0.5)) errs.push('shaman heal');
    orc.hp = orc.maxHp * 0.3; sh.callCd = 0; sim.step(1 / 60); if (!sh.call) errs.push('shaman no cast'); else { sim._interrupt(sim.heroes[1], sh, 1); const hp = orc.hp; steps(sim, 3); if (orc.hp > hp + 1) errs.push('interrupted heal still healed'); } }
  // 방패 오크: 정면 피해 -65%, 등 뒤는 그대로
  { const sim = mk([['orc_shield']]); steps(sim, 0.5); const o = sim.enemies[0], h = sim.heroes[1]; o.face = -1; sim.rng = () => 0.5;
    h.x = o.x - 50; let hp = o.hp; sim._damage(h, o, 100, { noCrit: true }); const front = hp - o.hp; h.x = o.x + 50; hp = o.hp; sim._damage(h, o, 100, { noCrit: true }); const back = hp - o.hp;
    if (!(front < back * 0.45)) errs.push(`shield front/back ${front}/${back}`); }
  // 폭탄 고블린: 다가와 영창 후 자폭 (본인 사망), 끊으면 자폭 안 함
  { const sim = mk([['goblin_bomber']]); let boom = false; for (let i = 0; i < 60 * 15 && !boom; i++) { sim.step(1 / 60); boom = sim.events.some((e) => e.type === 'explode'); sim.events.length = 0; }
    if (!boom || sim.enemies[0].alive) errs.push('bomber did not explode'); }
  { const sim = mk([['goblin_bomber']]); let cast = false; for (let i = 0; i < 60 * 15 && !cast; i++) { sim.step(1 / 60); cast = !!sim.enemies[0].charge; }
    if (!cast) errs.push('bomber no fuse'); else { sim._interrupt(sim.heroes[0], sim.enemies[0], 1); if (sim.enemies[0].charge) errs.push('bomber fuse not cancelled'); } }
  // 정예 변이: 가장 큰 적에게 붙고 HP +25%
  for (const key of Object.keys(ELITE_AFFIXES)) { const sim = mk(encounterFor({ type: 'elite', stage: 2, enc: 0 }), { eliteAffix: key }); const w = sim.waves.length; for (let i = 0; i < 60 * 60 && !sim.enemies.some((e) => e.affix); i++) { sim.step(1 / 60); if (sim.waveIndex === 0 && sim.time > 1) for (const e of sim.enemies) if (!e.affix) e.hp = 0, e.alive = false; }
    const a = sim.enemies.find((e) => e.affix); if (!a || a.affix !== key || !a.name.startsWith(ELITE_AFFIXES[key].name)) errs.push('affix ' + key); }
  // 기습: 파티가 잠깐 굳는다
  { const sim = mk([['goblin', 'goblin']], { surprise: true }); if (!sim.heroes.every((h) => h.actLock >= 1.5)) errs.push('surprise lock'); }
  console.log('new enemies:', errs.length ? 'FAIL ' + errs.join(' | ') : 'OK', '(archer, shaman heal/cancel, shield front, bomber, elite affixes, ambush)');
  if (errs.length) fail++;
}
// 보스 스킬·전멸기: 체력 60%에서 시전, 대응하면 저지, 못 하면 최대 HP 90% 고정 피해
{
  const errs = [];
  const st0 = JSON.parse(JSON.stringify(AI_PRESETS)); for (const k in st0) { st0[k].s2.auto = true; st0[k].ult.auto = true; st0[k].ult.cond = 'auto'; }
  const bossOf = { quake: 'ogre_chief', bloom: 'thorn_queen', mist: 'mist_stag', tide: 'swamp_turtle' };
  const mk = (key, autoMode, smartAuto) => new BattleSim({ seed: 31, smartAuto, stage: 5, waves: [[key]], strategy: st0, autoMode, partySize: 3, fieldW: 1440, heroes: ['tobi', 'danbi', 'bori'].map((id) => ({ id, hp: 2000, maxHp: 2000, upgrades: {}, ultDef: ultDefFor(id, 'A', 0) })) });
  const run = (sim, sec, until) => { for (let i = 0; i < sec * 60 && !sim.outcome; i++) { sim.step(1 / 60); if (until && until()) return true; } return false; };
  for (const [wk, key] of Object.entries(bossOf)) {
    if (!BOSS_KITS[key] || BOSS_KITS[key].wipe.key !== wk) { errs.push('kit ' + key); continue; }
    // 손 놓은 파티(수동, 명령 없음): 전멸기를 맞는다
    { const sim = mk(key, false); run(sim, 3); const b = sim.enemies[0]; b.hp = b.maxHp * (WIPE_AT[0] - 0.01);
      if (!run(sim, 2, () => b.wipe)) { errs.push(wk + ' no cast'); continue; }
      const hp0 = sim.heroes.map((h) => h.hp); run(sim, 12, () => sim.wipeLog.length);
      const log = sim.wipeLog[0]; if (!log) errs.push(wk + ' never resolved');
      else if (wk !== 'bloom' && wk !== 'tide' && log.ok) errs.push(wk + ' stopped without answer');
      else if (!log.ok && !sim.heroes.some((h, i) => hp0[i] - h.hp >= h.maxHp * 0.25)) errs.push(wk + ' no damage'); }
    // 잘 컨트롤하면(smartAuto: 즉시 회피 + 꽃봉오리 집중) 대부분 저지
    { let ok = 0; for (let s = 0; s < 4; s++) { const sim = mk(key, true, true); sim.rng = makeRng(77 + s); run(sim, 3); const b = sim.enemies[0]; b.hp = b.maxHp * (WIPE_AT[0] - 0.01); run(sim, 16, () => sim.wipeLog.length); const lg = sim.wipeLog[0]; ok += lg && (lg.ok || (wk === 'bloom' && lg.mult <= BOSS_KITS[key].wipe.per + 1e-9)) ? 1 : 0; }
      if (ok < 2) errs.push(`${wk} smart stopped ${ok}/4`); }
  }
  // 자동은 장판을 늦게 알아챈다 (AUTO_REACT), 컨트롤 흉내는 바로
  for (const smart of [false, true]) { const sim = mk('ogre_chief', true, smart); run(sim, 2); const h = sim.heroes[2];
    const z = { kind: 'impact', x: h.x, y: h.y, r: 75, t: 1.6 - AUTO_REACT.impact * 0.5, total: 1.6, dmg: 1, src: sim.enemies[0] }; sim.zones.push(z);
    const early = sim._zoneMove(h); z.t = 1.6 - AUTO_REACT.impact - 0.05; const late = sim._zoneMove(h);
    if (early !== smart || !late) errs.push(`react smart=${smart} early=${early} late=${late}`); }
  // 보스 일반 스킬: 일정 시간 안에 한 번은 쓴다
  for (const key of Object.keys(BOSS_KITS)) { const sim = mk(key, true); let used = false; run(sim, 25, () => (used = used || sim.events.some((e) => e.type === 'bossSkill'), sim.events.length = 0, used)); if (!used) errs.push('skill ' + key); }
  console.log('boss kits:', errs.length ? 'FAIL ' + errs.join(' | ') : 'OK', '(4 wipes cast/hit, stopped by good control, auto reacts late, boss skills)');
  if (errs.length) fail++;
}
// 사냥터: 등급표(합 1, 높은 등급 극악), 방치 사냥 10분 (처치·정예·드랍 슬롯·경계·결정성)
{
  const errs = [];
  for (const lv of [1, 5, 15, 35, 70]) {
    const tb = huntGradeTable(lv, false), sum = tb.reduce((a, [, p]) => a + p, 0), b = Math.min(7, Math.floor(lv / 10));
    if (Math.abs(sum - 1) > 1e-9) errs.push('table sum ' + lv);
    for (let i = b + 1; i < tb.length; i++) if (!(tb[i][1] < tb[i - 1][1])) errs.push(`table not decreasing ${lv}/${i}`);
    if (b + 2 < tb.length && tb[b + 2][1] > 0.005) errs.push(`two grades up too common ${lv}: ${tb[b + 2][1]}`);
    const te = huntGradeTable(lv, true); if (b + 1 < te.length && !(te[b + 1][1] > tb[b + 1][1])) errs.push('elite tail not better ' + lv);
  }
  if (huntExpMult(HUNT_FIELDS.meadow, 5) !== 1 || !(huntExpMult(HUNT_FIELDS.meadow, 20) < 0.5)) errs.push('overlevel exp');
  const run10 = (seed) => {
    const p = GACHA.ensure(EQ.newProfile()); for (const id in p.chars) p.chars[id].lv = 5;
    const sim = new HuntSim({ field: HUNT_FIELDS.meadow, seed, heroes: ['tobi', 'danbi', 'bori'].map((id) => huntHeroFrom(p, id)) });
    for (let i = 0; i < 10 * 60 * 30; i++) { sim.step(1 / 30); sim.events.length = 0; }
    return sim;
  };
  const a = run10(3), b2 = run10(3), F = HUNT_FIELDS.meadow;
  if (JSON.stringify(a.stats) !== JSON.stringify(b2.stats)) errs.push('nondeterministic');
  const k = a.stats.kills;
  if (k.trash + k.normal < 30) errs.push('too few kills ' + JSON.stringify(k));
  if (k.elite < 1) errs.push('no elite killed in 10 min');
  if (a.mobs.filter((m) => m.alive && m.cls === 'elite').length > 1) errs.push('more than one elite');
  if (a.stats.drops.some((d) => !HUNT.ACC_SLOTS.includes(d.slot))) errs.push('non-accessory drop');
  if (a.heroes.concat(a.mobs).some((u) => !(u.x >= 0 && u.x <= F.W && u.y >= 0 && u.y <= F.H) || !isFinite(u.hp))) errs.push('out of bounds / NaN');
  console.log('hunt field:', errs.length ? 'FAIL ' + errs.join(' | ') : 'OK', `(grade tables, 10 min idle: kills ${k.trash}/${k.normal}/${k.elite}, exp ${Math.round(a.stats.exp)}, drops ${a.stats.drops.length})`);
  if (errs.length) fail++;
}
// 반격의 기사 엘린: 특성 반격(근접 평타 30% 되돌림), 반사 all(원거리까지), 응징(최근 받은 피해 추가)
{
  const errs = [];
  const st0 = JSON.parse(JSON.stringify(AI_PRESETS));
  const mk = (waves) => new BattleSim({ seed: 5, stage: 2, waves, strategy: st0, autoMode: false, partySize: 3, heroes: ['elin', 'danbi', 'bori'].map((id) => ({ id, hp: 3000, maxHp: 3000, upgrades: {}, ultDef: id === 'elin' ? ultDefFor('elin', 'A', 0) : null })) });
  { const sim = mk([['orc']]); for (let i = 0; i < 90; i++) sim.step(1 / 60); const e = sim.enemies[0], h = sim.heroes[0], hp0 = e.hp; sim._damage(e, h, 100, { basic: true, noCrit: true }); for (let i = 0; i < 10; i++) sim.step(1 / 60); if (!(hp0 - e.hp >= 12)) errs.push('trait counter ' + (hp0 - e.hp)); }
  { const sim = mk([['goblin_archer']]); for (let i = 0; i < 90; i++) sim.step(1 / 60); const e = sim.enemies[0], h = sim.heroes[0]; h.ult = 100; sim.cast(h, 'ult', {}); const hp0 = e.hp; sim._damage(e, h, 100, { noCrit: true }); for (let i = 0; i < 10; i++) sim.step(1 / 60); if (!(hp0 - e.hp > 20)) errs.push('reflect all ranged ' + (hp0 - e.hp)); }
  { const a = mk([['ogre']]), b = mk([['ogre']]); for (const s of [a, b]) for (let i = 0; i < 90; i++) s.step(1 / 60);
    a.heroes[0].recentTaken = 600; const sk = SKILLS.elin_ult_C, ea = a.enemies[0], eb = b.enemies[0]; ea.x = eb.x = a.heroes[0].x + 40; ea.y = eb.y = a.heroes[0].y;
    a.heroes[0].ultDef = b.heroes[0].ultDef = sk; a.heroes[0].ult = b.heroes[0].ult = 100; const ha = ea.hp, hb = eb.hp;
    a.cast(a.heroes[0], 'ult', {}); b.cast(b.heroes[0], 'ult', {}); for (let i = 0; i < 30; i++) { a.step(1 / 60); b.step(1 / 60); }
    if (!(ha - ea.hp > (hb - eb.hp) + 200)) errs.push(`vengeance ${ha - ea.hp} vs ${hb - eb.hp}`); }
  console.log('counter knight:', errs.length ? 'FAIL ' + errs.join(' | ') : 'OK', '(trait counter, reflect-all ult, vengeance)');
  if (errs.length) fail++;
}
// 특성 트리: 직업마다 두 갈래, 점수 = 레벨-1, 단 잠금, 효과가 장비처럼 loadout에 들어간다
{
  const errs = [];
  for (const role in TALENTS) { if (TALENTS[role].length !== 2) errs.push('branches ' + role); for (const br of TALENTS[role]) if (br.nodes.filter((n) => n.cap).length !== 1) errs.push('cap ' + br.key); }
  const p = GACHA.ensure(EQ.newProfile()); p.chars.tobi.lv = 21;
  if (talentPoints(p, 'tobi') !== 20) errs.push('points');
  if (talentAdd(p, 'tobi', 'guardian', 't_s1')) errs.push('tier lock not enforced');
  for (let i = 0; i < 5; i++) talentAdd(p, 'tobi', 'guardian', 't_hp');
  if (!talentAdd(p, 'tobi', 'guardian', 't_cc')) errs.push('tier 2 should open at 5');
  const hp0 = EQ.heroLoadout(GACHA.ensure(EQ.newProfile()), 'tobi').maxHp, hp1 = EQ.heroLoadout(p, 'tobi').maxHp;
  if (!(hp1 > hp0 * 1.14)) errs.push(`hp talent ${hp0}->${hp1}`);
  for (let i = 0; i < 30; i++) talentAdd(p, 'tobi', 'avenger', 't_thorn');
  if (talentSpent(p, 'tobi') > talentPoints(p, 'tobi')) errs.push('overspent');
  talentReset(p, 'tobi'); if (talentSpent(p, 'tobi') !== 0) errs.push('reset');
  console.log('talents:', errs.length ? 'FAIL ' + errs.join(' | ') : 'OK', '(2 branches × 6 classes, points, tier locks, loadout)');
  if (errs.length) fail++;
}
// 도적 (v0.35): 시작 은신 · 은신 중 적이 노리지 않음 · 기습 · 중독 중첩 · 독 폭발 · 후열 노리기
{
  const errs = [];
  const st0 = JSON.parse(JSON.stringify(AI_PRESETS));
  const mk = (waves, ids) => new BattleSim({ seed: 7, stage: 2, waves, strategy: st0, autoMode: false, partySize: 3, heroes: (ids || ['yeon', 'tobi', 'bori']).map((id) => ({ id, hp: 3000, maxHp: 3000, upgrades: {}, ultDef: null })) });
  { const sim = mk([['orc', 'goblin_archer']]); const y = sim.heroes[0];
    if (!y.statuses.stealth) errs.push('no opening stealth');
    for (let i = 0; i < 60 * 3; i++) sim.step(1 / 60);
    if (sim.enemies.some((e) => e.alive && e.target === y && !e.statuses.taunt && y.statuses.stealth)) errs.push('enemy targets stealthed rogue');
    if (y.target && y.target.key !== 'goblin_archer' && sim.enemies.find((e) => e.key === 'goblin_archer').alive) errs.push('rogue not targeting backline ' + (y.target && y.target.key)); }
  { const sim = mk([['ogre']]); for (let i = 0; i < 90; i++) sim.step(1 / 60); const y = sim.heroes[0], e = sim.enemies[0];
    y.statuses.stealth = { t: 3 }; const h0 = e.hp; sim._damage(y, e, 100, { basic: true }); const amb = h0 - e.hp;
    if (y.statuses.stealth) errs.push('stealth not consumed');
    const h1 = e.hp; sim._damage(y, e, 100, { basic: true, noCrit: true }); if (!(amb > (h1 - e.hp) * 2)) errs.push(`ambush ${amb} vs ${h1 - e.hp}`);
    for (let i = 0; i < 7; i++) sim._applyStatus(y, e, { status: 'poison', dur: 8, dps: 0.2 });
    if (e.statuses.poison.n !== 5) errs.push('poison stacks ' + e.statuses.poison.n);
    const ph = e.hp; y.ult = 100; y.ultDef = SKILLS.yeon_ult; y.castLock = 0; sim.cast(y, 'ult', { unit: e }); for (let i = 0; i < 40; i++) sim.step(1 / 60);
    if (e.statuses.poison) errs.push('detonate left poison'); if (!(ph - e.hp > 250)) errs.push('detonate dmg ' + (ph - e.hp));
    if (!y.statuses.stealth) errs.push('ult stealth after hit'); }
  { const p = GACHA.ensure(EQ.newProfile()); if (!p.chars.yeon) errs.push('yeon not gifted'); if (TALENTS[HEROES.yeon.role].length !== 2) errs.push('rogue talents');
    if (!EQ.DB.items.some((it) => it.cls === 'rogue' && it.slot === 'weapon' && it.line === 4)) errs.push('rogue gear'); }
  console.log('rogue class:', errs.length ? 'FAIL ' + errs.join(' | ') : 'OK', '(opening stealth, untargetable, ambush, poison 5 stacks, detonate, backline, gear/talents)');
  if (errs.length) fail++;
}
// 새 직업 (v0.52): 수도승 기·회피 / 흑마술사 저주 전이·파멸·계약 / 네크로맨서 소환·시체
{
  const errs = [];
  const st0 = JSON.parse(JSON.stringify(AI_PRESETS));
  const mk = (waves, ids) => new BattleSim({ seed: 5, stage: 2, waves, strategy: st0, autoMode: false, partySize: 3, heroes: ids.map((id) => ({ id, hp: 3000, maxHp: 3000, upgrades: {}, ultDef: null })) });
  // 수도승: 평타 적중 → 기, 기를 쓰면 위력 ↑, 평정 회피
  { const sim = mk([['ogre']], ['mujin', 'tobi', 'bori']); for (let i = 0; i < 90; i++) sim.step(1 / 60); const m = sim.heroes[0], e = sim.enemies[0]; e.hp = e.maxHp = 1e6;
    m.x = e.x - 50; m.y = e.y; m.atkTimer = 0; m.target = e; for (let i = 0; i < 30; i++) sim.step(1 / 60);
    if (!(m.statuses.ki && m.statuses.ki.n >= 1)) errs.push('no ki from basic');
    sim.rng = () => 0.5; const hit = (n) => { if (n) m.statuses.ki = { t: Infinity, n }; else delete m.statuses.ki; m.cds.s2 = 0; m.castLock = 0; const h0 = e.hp; delete e.statuses.stun; e.stunHist = []; sim.cast(m, 's2', { unit: e }); if (m.statuses.ki) errs.push('ki not consumed'); for (let i = 0; i < 30; i++) sim.step(1 / 60); return h0 - e.hp; };
    const d0 = hit(0), d5 = hit(5); if (!(d5 > d0 * 2)) errs.push(`ki spend ${d0} -> ${d5}`);
    sim.rng = () => 0.01; const hp = m.hp; sim._damage(e, m, 100, { basic: true }); if (m.hp !== hp) errs.push('serene dodge'); }
  // 흑마술사: 저주(회복 -50%) → 쓰러지면 옮는다, 파멸 폭발, 계약 회복
  { const sim = mk([['orc', 'orc', 'goblin']], ['daon', 'tobi', 'bori']); for (let i = 0; i < 90; i++) sim.step(1 / 60); const w = sim.heroes[0], [a, b] = sim.enemies; b.x = a.x + 40; b.y = a.y;
    sim._applyStatus(w, a, { status: 'curse', dur: 8, dps: 0.3 }); if (!a.statuses.curse) errs.push('no curse');
    const hh = a.hp; a.hp -= 100; const healed = sim._heal(null, a, 100, true); if (healed > 55) errs.push('curse heal cut ' + healed); a.hp = hh;
    w.hp = 1000; const whp = w.hp; for (let i = 0; i < 120; i++) sim.step(1 / 60); if (!(w.hp > whp)) errs.push('pact heal');
    sim._damage(w, a, 1e7, { noCrit: true }); if (!(b.statuses.curse)) errs.push('curse spread');
    const d = sim.enemies[2]; d.hp = d.maxHp = 1e6; const h0 = d.hp; w.ult = 100; w.castLock = 0; sim.cast(w, 'ult', { unit: d }); for (let i = 0; i < 60 * 3; i++) sim.step(1 / 60); const mid = h0 - d.hp; for (let i = 0; i < 60 * 2; i++) sim.step(1 / 60);
    if (!(h0 - d.hp > mid + sim._atkOf(w) * 3)) errs.push(`doom boom ${mid} -> ${h0 - d.hp}`); }
  // 네크로맨서: 해골 소환 · 적이 병사를 노림 · 시체 쌓임/소모 · 만료
  { const sim = mk([['orc', 'goblin', 'goblin']], ['myoyeon', 'bori']); for (let i = 0; i < 90; i++) sim.step(1 / 60); const n = sim.heroes[0];
    n.cds.s1 = 0; n.castLock = 0; sim.cast(n, 's1', {}); if (sim.minions.filter((u) => u.alive).length !== 1) errs.push('summon 1 ' + sim.minions.length);
    sim._damage(n, sim.enemies[2], 1e7, { noCrit: true }); if (sim.corpses !== 1) errs.push('corpse ' + sim.corpses);
    n.cds.s1 = 0; n.castLock = 0; sim.cast(n, 's1', {}); if (sim.minions.filter((u) => u.alive).length !== 3 || sim.corpses !== 0) errs.push('summon with corpse ' + sim.minions.length + '/' + sim.corpses);
    for (let i = 0; i < 60 * 4; i++) sim.step(1 / 60);
    if (!sim.enemies.some((e) => e.alive && e.target && e.target.minion)) errs.push('enemies ignore minions');
    if (!sim.minions.some((u) => u.stats === n.stats) || !(n.stats.dealt > 0)) errs.push('minion dmg not credited');
    for (let i = 0; i < 60 * 16; i++) sim.step(1 / 60); if (sim.minions.some((u) => u.alive && u.life < -0.5)) errs.push('minion did not expire'); }
  { const p = GACHA.ensure(EQ.newProfile()); for (const [id, role] of [['mujin', 'monk'], ['daon', 'warlock'], ['seren', 'demon'], ['myoyeon', 'necro']]) {
      if (!p.chars[id]) errs.push(id + ' not gifted'); if (TALENTS[role].length !== 2) errs.push(role + ' talents');
      if (!EQ.DB.items.some((it) => it.cls === role && it.slot === 'weapon' && it.line === 4)) errs.push(role + ' gear');
      if (CHARACTERS.filter((c) => c.role === role).length !== 3) errs.push(role + ' chars'); } }
  // 모든 새 필살기(변주 포함)가 오류 없이 시전된다
  for (const id of ['mujin', 'soha', 'baekun', 'daon', 'risha', 'kali', 'seren', 'roa', 'maha', 'myoyeon', 'bella', 'kamu']) for (const k of ['A', 'B', 'C', 'A2', 'B2', 'C2']) {
    try { const sim = mk([['ogre', 'goblin', 'goblin']], [id, 'tobi', 'bori']); for (let i = 0; i < 90; i++) sim.step(1 / 60); sim.corpses = 3; const h = sim.heroes[0]; h.ultDef = SKILLS[`${id}_ult_${k}`]; h.ult = 100; h.castLock = 0; h.statuses.ki = { t: Infinity, n: 3 };
      for (const e of sim.enemies) { e.x = h.x + 70; e.y = h.y; }
      const sp = sim.resolveTarget(h, 'ult') || {}; if (!sim.cast(h, 'ult', sp)) errs.push('ult cast ' + id + k); for (let i = 0; i < 60 * 5; i++) sim.step(1 / 60); } catch (e) { errs.push(id + k + ' ' + e.message); }
  }
  // 흑마술사(악마): 상시 악마 · 레벨 해금 · 특수 능력 · 지옥불정령 · 악마 지배 · 다시 불러내기
  { const p = GACHA.ensure(EQ.newProfile()); if (!p.chars.seren) errs.push('seren not gifted');
    if (GACHA.petFor(p, 'seren') !== 'imp') errs.push('lv1 pet'); p.chars.seren.lv = 25; if (GACHA.petFor(p, 'seren') !== 'succubus') errs.push('lv25 best pet'); p.chars.seren.pet = 'voidwalker'; if (GACHA.petFor(p, 'seren') !== 'voidwalker') errs.push('pet choice'); p.chars.seren.pet = 'felhunter'; if (GACHA.petFor(p, 'seren') !== 'succubus') errs.push('locked pet'); }
  for (const kind of ['imp', 'voidwalker', 'succubus', 'felhunter']) {
    const sim = new BattleSim({ seed: 8, stage: 2, waves: [['ogre', 'goblin']], strategy: st0, autoMode: true, partySize: 2, heroes: [{ id: 'seren', hp: 3000, maxHp: 3000, upgrades: {}, ultDef: null, pet: kind }, { id: 'tobi', hp: 3000, maxHp: 3000, upgrades: {}, ultDef: null }] });
    const pet = sim.petOf(sim.heroes[0]); if (!pet || pet.key !== 'minion_' + kind || pet.life !== Infinity) { errs.push('pet spawn ' + kind); continue; }
    let sp = 0; sim.events.length = 0; for (let i = 0; i < 60 * 25 && !sim.outcome; i++) { sim.step(1 / 60); sp += sim.events.filter((e) => e.type === 'petSkill').length; sim.events.length = 0; }
    if (kind !== 'imp' && kind !== 'felhunter' && !sp) errs.push('pet special ' + kind);
    if (!(sim.heroes[0].stats.dealt > 0)) errs.push('pet/owner dmg ' + kind); }
  { const sim = new BattleSim({ seed: 8, stage: 2, waves: [['ogre', 'goblin', 'goblin']], strategy: st0, autoMode: false, partySize: 2, heroes: [{ id: 'seren', hp: 3000, maxHp: 3000, upgrades: {}, ultDef: null, pet: 'imp' }, { id: 'tobi', hp: 3000, maxHp: 3000, upgrades: {}, ultDef: null }] });
    for (let i = 0; i < 90; i++) sim.step(1 / 60); const w = sim.heroes[0], pet = sim.petOf(w);
    pet.hp = 10; w.cds.s2 = 0; w.castLock = 0; sim.cast(w, 's2', {}); if (!(pet.hp > 10) || !pet.statuses.inspire) errs.push('pet buff');
    sim._damage(sim.enemies[0], pet, 1e6, { noCrit: true, trueDmg: true }); if (sim.petOf(w)) errs.push('pet not dead'); for (let i = 0; i < 60 * 16; i++) sim.step(1 / 60); if (!sim.petOf(w)) errs.push('pet respawn');
    const e = sim.enemies.find((x) => x.alive); w.ult = 100; w.castLock = 0; const n0 = sim.minions.filter((u) => u.alive).length; sim.cast(w, 'ult', { x: e.x, y: e.y }); for (let i = 0; i < 40; i++) sim.step(1 / 60);
    if (!sim.minions.some((u) => u.alive && u.key === 'minion_infernal')) errs.push('infernal'); if (!sim.enemies.some((x) => x.alive && x.statuses.stun) && sim.enemies.some((x) => x.alive)) errs.push('infernal stun'); }
  console.log('new classes:', errs.length ? 'FAIL ' + errs.join(' | ') : 'OK', '(monk ki/dodge, warlock curse spread/doom/pact, necro minions/corpses, gifts, gear, talents, 54 ults)');
  if (errs.length) fail++;
}
// 장비·스킬 다양화 (v0.53): 다섯 번째 라인 · 끌어오기 · 시체 먹기 · 새 장신구(회피·흡수·가시) · 새 패시브
{
  const errs = [];
  const st0 = JSON.parse(JSON.stringify(AI_PRESETS));
  for (const c of ['tank', 'melee', 'rogue', 'monk', 'ranged', 'mage', 'warlock', 'demon', 'necro', 'support']) for (const s of ['armor', 'weapon']) if (!EQ.BASE[`${c}_${s}_5`] || !GEAR_SKILLS[`${c}_${s}_5`]) errs.push('line5 ' + c + s);
  const mk = (ids, waves) => new BattleSim({ seed: 3, stage: 2, waves, strategy: st0, autoMode: false, partySize: 3, heroes: ids.map((id) => ({ id, hp: 3000, maxHp: 3000, upgrades: {}, ultDef: null, skills: id === 'tobi' ? { s1: 'tobi_s1', s2: 'gs_tank_s2_e' } : id === 'myoyeon' ? { s1: 'gs_necro_s1_e', s2: 'myoyeon_s2' } : null })) });
  { const sim = mk(['tobi', 'myoyeon', 'bori'], [['goblin_archer', 'ogre_chief']]); for (let i = 0; i < 90; i++) sim.step(1 / 60); const t = sim.heroes[0], a = sim.enemies[0], boss = sim.enemies[1];
    const ax = a.x; t.cds.s2 = 0; t.castLock = 0; sim.cast(t, 's2', { unit: a }); if (!(Math.abs(a.x - t.x) < Math.abs(ax - t.x) - 50)) errs.push('pull'); for (let i = 0; i < 20; i++) sim.step(1 / 60); if (!a.statuses.taunt) errs.push('pull taunt');
    const bx = boss.x; t.cds.s2 = 0; t.castLock = 0; sim.cast(t, 's2', { unit: boss }); if (boss.x !== bx) errs.push('boss pulled');
    const n = sim.heroes[1]; for (const h of sim.heroes) h.hp = 1500; sim.corpses = 3; n.cds.s1 = 0; n.castLock = 0; sim.cast(n, 's1', {}); if (sim.corpses !== 0 || !(sim.heroes[2].hp > 1500)) errs.push('corpse heal ' + sim.corpses + ' ' + sim.heroes[2].hp); }
  { const rng = makeRng(4), p = GACHA.ensure(EQ.newProfile());
    for (const [base, who] of [['common_belt_4', 'mujin'], ['common_ring_5', 'mujin'], ['common_belt_5', 'daon']]) { const it = EQ.rollItem(rng, p, { base, grade: 'SR' }); if (!p.inv.includes(it)) p.inv.push(it); EQ.equip(p, who, it); }
    const lo = EQ.heroLoadout(p, 'mujin'); for (const k of ['dodge', 'drain']) if (!(lo.mods[k] > 0)) errs.push('acc stat ' + k); if (!(EQ.heroLoadout(p, 'daon').mods.thorns > 0)) errs.push('acc stat thorns');
    const sim = new BattleSim({ seed: 1, stage: 1, waves: [['goblin']], strategy: st0, autoMode: false, partySize: 1, heroes: [{ id: 'mujin', hp: 500, maxHp: lo.maxHp, mods: lo.mods, upgrades: {}, ultDef: null }] }); for (let i = 0; i < 90; i++) sim.step(1 / 60);
    const m = sim.heroes[0], g = sim.enemies[0]; m.mods.drain = 0.5; m.hp = Math.round(m.maxHp * 0.5); const hp = m.hp; sim._damage(m, g, 40, { noCrit: true }); if (!(m.hp > hp)) errs.push('drain heal');
    if (!EQ.PASSIVE.nimble || !EQ.PASSIVE.vampire) errs.push('new passives'); }
  console.log('gear variety:', errs.length ? 'FAIL ' + errs.join(' | ') : 'OK', '(18 line-5 skills, pull, corpse heal, dodge/drain/thorns accessories, passives)');
  if (errs.length) fail++;
}
// 던전 4개 · 필드 지역 (v0.55): 조우표 유효 · 난이도 계단 · 해금 순서 · 보스 키트
{
  const errs = [];
  const S = vm.runInContext('DUNGEON_SITES', ctx), W = vm.runInContext('WORLD', ctx);
  const keys = ['cave', 'mine', 'crypt', 'abyss'];
  if (Object.keys(S).join() !== keys.join()) errs.push('sites ' + Object.keys(S));
  for (let i = 1; i < keys.length; i++) { const a = S[keys[i - 1]].scale, b = S[keys[i]].scale; if (!(b.hp >= a.hp * 1.4 && b.atk >= a.atk * 1.25)) errs.push('steep ' + keys[i]); }
  if (!(S.cave.scale.hp < 1 && S.cave.enc.boss[5].length === 1)) errs.push('tutorial cave');
  for (const k of keys) { const E = S[k].enc; for (const kind of ['battle', 'elite', 'small', 'boss']) for (const st in E[kind]) for (const enc of E[kind][st]) for (const w of (kind === 'small' ? [enc] : enc)) for (const id of w) if (!ENEMIES[id]) errs.push(`${k} ${kind} ${id}`);
    for (const enc of E.boss[5]) { const b = enc[0][0]; if (!BOSS_KITS[b]) errs.push('kit ' + b); } }
  const p = GACHA.ensure(EQ.newProfile());
  if (S.mine.unlock(p) || S.crypt.unlock(p) || S.abyss.unlock(p)) errs.push('locked at start');
  const run = { party: ['tobi'], heroes: { tobi: {} }, oaths: [], site: 'cave' };
  achBossWin(p, run, 'ogre_chief'); if (!S.mine.unlock(p) || S.crypt.unlock(p)) errs.push('cave -> mine');
  run.site = 'mine'; achBossWin(p, run, 'stone_golem'); if (!S.crypt.unlock(p) || S.abyss.unlock(p)) errs.push('mine -> crypt');
  run.site = 'crypt'; achBossWin(p, run, 'lich_king'); if (!S.abyss.unlock(p)) errs.push('crypt -> abyss');
  if (W.zones.map((z) => z.site).join() !== keys.join()) errs.push('world zones');
  // 새 보스 2종 전투가 오류 없이 돌아간다 (전멸기 포함)
  const st0 = JSON.parse(JSON.stringify(AI_PRESETS));
  for (const b of ['lich_king', 'pit_lord']) { try { const sim = new BattleSim({ seed: 3, stage: 5, waves: [[b]], strategy: st0, autoMode: true, smartAuto: true, partySize: 3, heroes: ['tobi', 'danbi', 'bori'].map((id) => ({ id, hp: 9000, maxHp: 9000, upgrades: {} })) }); sim.enemies[0].hp = Math.round(sim.enemies[0].maxHp * 0.58); for (let i = 0; i < 60 * 60 && !sim.outcome && !sim.wipeLog.length; i++) sim.step(1 / 60); if (!sim.wipeLog.length) errs.push('no wipe ' + b); } catch (e) { errs.push(b + ' ' + e.message); } }
  console.log('dungeons & world:', errs.length ? 'FAIL ' + errs.join(' | ') : 'OK', '(4 sites steep scale, tutorial cave, unlock chain, encounters valid, new bosses)');
  if (errs.length) fail++;
}
// 구역 확보 (v0.56): 거점 확보 · 수입 · 지역 확보 보너스 · 습격 · 거점 전투 구성
{
  const errs = [];
  const p = { gold: 0, stones: 0, chars: { tobi: { lv: 1 }, danbi: { lv: 1 } }, shards: {} };
  const t0 = 1e12; terrState(p).last = t0;
  if (terrPending(p, t0 + 3600e3).gold !== 0) errs.push('no posts → no income');
  capturePost(p, 'outskirts', 0); terrState(p).last = t0;
  let pd = terrPending(p, t0 + 2 * 3600e3); if (pd.gold !== 60 || pd.stones !== 2) errs.push('1 post 2h ' + JSON.stringify(pd));
  pd = terrPending(p, t0 + 30 * 3600e3); if (pd.gold !== 30 * TERRITORY.capHours) errs.push('cap ' + pd.gold);
  if (zoneSecured(p, 'outskirts')) errs.push('secured early');
  capturePost(p, 'outskirts', 1); capturePost(p, 'outskirts', 2); terrState(p).last = t0;
  if (!zoneSecured(p, 'outskirts')) errs.push('not secured'); if (terrRate(p).gold !== 30 * 3 * 1.5) errs.push('secured +50% ' + terrRate(p).gold);
  if (terrBonus(p).gold !== 0.1 || terrBonus(p).exp !== 0) errs.push('bonus ' + JSON.stringify(terrBonus(p)));
  capturePost(p, 'marsh', 0); terrState(p).last = t0; p.gold = 0; p.stones = 0;
  const g = terrCollect(p, t0 + 3600e3, makeRng(4)); if (p.gold !== g.gold || g.shards !== 2 || p.stones !== g.stones) errs.push('collect ' + JSON.stringify(g) + ' ' + p.gold);
  if (terrPending(p, t0 + 3600e3).gold !== 0) errs.push('collect resets');
  let inv = 0; for (let i = 0; i < 400; i++) { const q = JSON.parse(JSON.stringify(p)); if (terrMaybeInvade(q, makeRng(i))) inv++; }
  if (inv < 400 * TERRITORY.invadeChance * 0.6 || inv > 400 * TERRITORY.invadeChance * 1.4) errs.push('invade rate ' + inv);
  { const q = JSON.parse(JSON.stringify(p)); let k = null; for (let i = 0; !k && i < 50; i++) k = terrMaybeInvade(q, makeRng(i)); const [zk, pi] = k.split(':');
    if (!postInfo(q, zk, +pi).contested || terrRate(q).gold >= terrRate(p).gold) errs.push('contested no income');
    capturePost(q, zk, +pi); if (postInfo(q, zk, +pi).contested) errs.push('retake'); }
  for (let zi = 0; zi < 4; zi++) for (let i = 0; i < 3; i++) { const w = postWaves(zi, i, makeRng(zi * 7 + i)); if (!w.length || w.some((wv) => !wv.length || wv.some((id) => !ENEMIES[id]))) errs.push(`postWaves ${zi}/${i}`); }
  console.log('territory:', errs.length ? 'FAIL ' + errs.join(' | ') : 'OK', '(posts income/cap, zone secured +50%, bonus, collect shards, invade & retake, post waves)');
  if (errs.length) fail++;
}
// 연계 효과 (v0.37): 독연 폭발 · 동결 · 상처 벌리기
{
  const errs = [];
  const st0 = JSON.parse(JSON.stringify(AI_PRESETS));
  const mk = () => new BattleSim({ seed: 9, stage: 2, waves: [['orc', 'orc', 'goblin']], strategy: st0, autoMode: false, partySize: 3, heroes: ['soldam', 'yeon', 'bori'].map((id) => ({ id, hp: 3000, maxHp: 3000, upgrades: {}, ultDef: null })) });
  { const sim = mk(); for (let i = 0; i < 90; i++) sim.step(1 / 60); const [a, b] = sim.enemies; b.x = a.x + 30; b.y = a.y; const m = sim.heroes[0], y = sim.heroes[1];
    sim._applyStatus(m, a, { status: 'burn', dur: 5, dps: 0.3 }); const ha = a.hp, hb = b.hp; sim._applyStatus(y, a, { status: 'poison', dur: 8, dps: 0.2 });
    if (a.statuses.burn) errs.push('burn not consumed'); if (!(ha - a.hp > 20 && hb - b.hp > 10)) errs.push(`blast ${ha - a.hp}/${hb - b.hp}`);
    if (!b.statuses.poison) errs.push('poison not spread'); if (!sim.events.some((e) => e.type === 'combo' && e.name === '독연 폭발')) errs.push('no blast event'); }
  { const sim = mk(); for (let i = 0; i < 90; i++) sim.step(1 / 60); const e = sim.enemies[2], m = sim.heroes[0];
    sim._applyStatus(m, e, { status: 'slow', dur: 4, value: 0.3 }); sim._applyStatus(m, e, { status: 'stun', dur: 1 }); sim.step(1 / 60);
    if (!(e.statuses.stun && e.statuses.stun.t > 1.4)) errs.push('freeze ' + (e.statuses.stun && e.statuses.stun.t)); }
  { const run = (vuln) => { const sim = mk(); for (let i = 0; i < 90; i++) sim.step(1 / 60); const e = sim.enemies[0]; e.hp = e.maxHp = 99999; const y = sim.heroes[1]; for (const h of sim.heroes) h.atkTimer = 99;
      sim._applyStatus(y, e, { status: 'bleed', dur: 4, dps: 0.4 }); if (vuln) e.statuses.vuln = { t: 9 }; const h0 = e.hp; for (let i = 0; i < 60; i++) { sim._tickUnit(e, 1 / 60); } return h0 - e.hp; };
    const a = run(false), b = run(true); if (!(b > a * 1.6)) errs.push(`wound ${a} vs ${b}`); }
  console.log('combos:', errs.length ? 'FAIL ' + errs.join(' | ') : 'OK', '(poison×burn blast + spread, slow×stun freeze, bleed×vuln wound)');
  if (errs.length) fail++;
}
// 원정 맹세 (v0.37)
{
  const errs = [];
  const run = { oaths: ['iron', 'fury', 'hunger', 'gloom', 'hunt'], food: 3, potions: 2, torch: CONST.TORCH_MAX };
  const sc = oathScale(run); if (Math.abs(sc.hp - 1.25) > 1e-9 || Math.abs(sc.atk - 1.2) > 1e-9) errs.push('scale ' + JSON.stringify(sc));
  if (Math.abs(oathReward(run) - 1.2) > 1e-9) errs.push('reward ' + oathReward(run));
  oathApplyStart(run); if (run.food !== 1 || run.potions !== 1 || run.torch !== Math.round(CONST.TORCH_MAX / 2)) errs.push('start ' + JSON.stringify(run));
  const w = oathWaves(run, { type: 'battle' }, [['goblin'], ['orc']]); if (w[0].length !== 2 || w[0][1] !== 'goblin_stalker' || w[1].length !== 1) errs.push('waves');
  if (oathWaves(run, { type: 'boss' }, [['ogre_chief']])[0].length !== 1) errs.push('boss untouched');
  if (oathReward({}) !== 0) errs.push('no oaths');
  console.log('oaths:', errs.length ? 'FAIL ' + errs.join(' | ') : 'OK', '(scale, reward, start penalties, hunter waves)');
  if (errs.length) fail++;
}
// 그림자 왕 (v0.38): 그림자 습격 = 사라짐(무적) → 먼 영웅 자리 예고 → 나타남
{
  const errs = [];
  const st0 = JSON.parse(JSON.stringify(AI_PRESETS));
  const sim = new BattleSim({ seed: 4, stage: 5, waves: [['shadow_king']], strategy: st0, autoMode: false, partySize: 3, heroes: ['tobi', 'yeon', 'bori'].map((id) => ({ id, hp: 5000, maxHp: 5000, upgrades: {}, ultDef: null })) });
  for (let i = 0; i < 60 * 2; i++) sim.step(1 / 60);
  const b = sim.enemies[0]; b.skillCd = 0; sim.step(1 / 60);
  if (!b.vanished) errs.push('not vanished'); const z = sim.zones.find((q) => q.kind === 'impact' && q.src === b); if (!z) errs.push('no impact zone');
  const h0 = b.hp; sim._damage(sim.heroes[0], b, 500, { noCrit: true }); if (b.hp !== h0) errs.push('hit while vanished');
  for (let i = 0; i < 60 * 1.5; i++) sim.step(1 / 60);
  if (b.vanished) errs.push('still vanished'); if (z && Math.abs(b.x - z.x) > 90) errs.push('did not reappear near target');
  if (!ENCOUNTERS.boss[5].some((w) => w[0][0] === 'shadow_king')) errs.push('not in boss pool');
  console.log('shadow king:', errs.length ? 'FAIL ' + errs.join(' | ') : 'OK', '(vanish, untargetable, telegraph, reappear, boss pool)');
  if (errs.length) fail++;
}
// 업적 (v0.40): 보스 처치 기록 → 달성 → 보상 1회
{
  const errs = [];
  const p = GACHA.ensure(EQ.newProfile()); const t0 = p.tickets, g0 = p.gold;
  if (achCheck(p, true).length) errs.push('fresh profile unlocked something');
  const run = { party: ['tobi', 'danbi', 'bori'], heroes: { tobi: {}, danbi: {}, bori: {} }, oaths: ['iron', 'fury', 'hunger'] };
  achBossWin(p, run, 'shadow_king');
  const got = achCheck(p, true).map((a) => a.id).sort().join(',');
  if (got !== 'boss_shadow_king,first_clear,flawless,oath3') errs.push('got ' + got);
  if (p.tickets !== t0 + 2 + 2 + 2 || p.gold !== g0 + 150) errs.push(`reward t${p.tickets - t0} g${p.gold - g0}`);
  if (achCheck(p, true).length) errs.push('granted twice');
  for (const k of ['ogre_chief', 'thorn_queen', 'mist_stag', 'swamp_turtle', 'stone_golem', 'lich_king', 'pit_lord']) achAdd(p, 'boss_' + k);
  if (!achCheck(p, true).some((a) => a.id === 'boss_all')) errs.push('boss_all');
  if (ACHIEVEMENTS.some((a) => !a.prog(p) || a.prog(p).length !== 2)) errs.push('prog');
  console.log('achievements:', errs.length ? 'FAIL ' + errs.join(' | ') : 'OK', `(${ACHIEVEMENTS.length} achievements, boss/oath/flawless, rewards once)`);
  if (errs.length) fail++;
}
// 두 번째 던전 (v0.44): 광산 조우표가 모두 유효한 적 · 층 1~4 · 보스 5종 · 해금 조건
{
  const errs = [];
  for (const type of ['battle', 'elite', 'small']) for (const st of [1, 2, 3, 4]) { const t = ENCOUNTERS_MINE[type][st]; if (!t || !t.length) errs.push(`${type}${st} empty`); for (const w of t) for (const k of (type === 'small' ? w : w.flat())) if (!ENEMIES[k]) errs.push('unknown ' + k); }
  if (ENCOUNTERS_MINE.boss[5].length !== 7 || !ENCOUNTERS_MINE.boss[5].some((w) => w[0][0] === 'stone_golem')) errs.push('boss pool');
  { const sim = new BattleSim({ seed: 3, stage: 5, waves: [['stone_golem']], strategy: JSON.parse(JSON.stringify(AI_PRESETS)), autoMode: false, partySize: 3, heroes: ['tobi', 'danbi', 'bori'].map((id) => ({ id, hp: 5000, maxHp: 5000, upgrades: {}, ultDef: null })) }); for (let i = 0; i < 120; i++) sim.step(1 / 60); const b = sim.enemies[0]; b.skillCd = 0; sim.step(1 / 60); if (sim.zones.filter((z) => z.kind === 'impact' && z.src === b).length !== 3) errs.push('rockfall zones ' + sim.zones.length); }
  for (const w of ENCOUNTERS_MINE.boss[5]) if (!ENEMIES[w[0][0]].abilities.includes('boss')) errs.push('boss first ' + w[0][0]);
  const p = GACHA.ensure(EQ.newProfile()); if (DUNGEON_SITES.mine.unlock(p)) errs.push('mine open on fresh profile'); p.clears = { 0: 1 }; if (!DUNGEON_SITES.mine.unlock(p)) errs.push('mine not unlocked after clear');
  console.log('second dungeon:', errs.length ? 'FAIL ' + errs.join(' | ') : 'OK', '(mine encounters valid, boss pool, unlock)');
  if (errs.length) fail++;
}
// 교착 방지 (v0.46): 트롤 재생 한도 · 4분 넘은 일반 전투 광폭
{
  const errs = [];
  const sim = new BattleSim({ seed: 2, stage: 3, waves: [['cave_troll']], strategy: JSON.parse(JSON.stringify(AI_PRESETS)), autoMode: false, partySize: 1, heroes: [{ id: 'bori', hp: 99999, maxHp: 99999, upgrades: {}, ultDef: null }] });
  const t = sim.enemies[0];
  for (let i = 0; i < 60 * 30; i++) { sim.step(1 / 60); if (t.hp > t.maxHp * 0.5) t.hp = t.maxHp * 0.5; }
  if (!(t.regenUsed >= t.maxHp * CONST.REGEN_CAP - 1)) errs.push('regen cap not reached ' + Math.round(t.regenUsed));
  const h0 = t.hp; for (let i = 0; i < 60 * 5; i++) sim.step(1 / 60); if (t.hp > h0 + 1) errs.push('regen after cap');
  const a0 = sim._atkOf(t); sim.time = CONST.STALL_ENRAGE + 25; if (!(sim._atkOf(t) > a0 * 1.25)) errs.push('stall enrage');
  console.log('stalemate guard:', errs.length ? 'FAIL ' + errs.join(' | ') : 'OK', '(troll regen cap, long battle enrage)');
  if (errs.length) fail++;
}
process.exit(fail ? 1 : 0);
