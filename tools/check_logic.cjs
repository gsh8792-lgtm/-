// 로직 검증 (브라우저 불필요): node tools/check_logic.cjs
// 1) 지도 생성 제약 1000시드  2) 같은 시드 → 같은 지도  3) 같은 시드 → 같은 전투 결과
const fs = require('fs'), vm = require('vm');
const code = ['00_util.js', '01_data.js', '01b_equip_db.js', '01c_characters.js', '04b_equip.js', '04c_gacha.js', '05_map.js', '06_battle_sim.js'].map((f) => fs.readFileSync(__dirname + '/../src/js/' + f, 'utf8')).join('\n');
const ctx = { console, safeStorageGet: () => null, safeStorageSet: () => {} }; vm.createContext(ctx);
vm.runInContext(code.replace(/const MapScene[\s\S]*?\n};\n/, '') + '\nthis.X={EQ,GACHA,CHARACTERS,ultDefFor,ultChoices,BREAKTHROUGH,makeRng,generateMap,validStage,canMoveTo,BattleSim,ENCOUNTERS,HEROES,AI_PRESETS,NODE_TYPES,EVENTS,encounterFor};', ctx);
const { EQ, GACHA, CHARACTERS, ultDefFor, ultChoices, BREAKTHROUGH, makeRng, generateMap, BattleSim, ENCOUNTERS, HEROES, AI_PRESETS, NODE_TYPES, encounterFor } = ctx.X;
let fail = 0;
const typeCount = {};
for (let seed = 1; seed <= 1000; seed++) {
  const m = generateMap(seed);
  if (m.stages.length !== 5) { fail++; console.log('stages', seed); }
  m.stages.forEach((st, i) => {
    const s = i + 1, types = st.map((n) => n.type);
    types.forEach((t) => (typeCount[t] = (typeCount[t] || 0) + 1));
    const c = (t) => types.filter((x) => x === t).length;
    const bad = (s <= 4 && st.length !== 3) || (s === 5 && (st.length !== 1 || types[0] !== 'boss'))
      || (s === 1 && c('elite')) || !types.some((t) => NODE_TYPES[t].combat) || c('shop') > 1 || c('rest') > 1
      || (s === 4 && c('rest') + c('tree') < 1);
    if (bad) { fail++; console.log('constraint fail seed', seed, 'stage', s, types); }
    for (const n of st) if (NODE_TYPES[n.type].combat && !encounterFor(n)) { fail++; console.log('no encounter', seed, s, n.type); }
  });
  if (JSON.stringify(generateMap(seed)) !== JSON.stringify(m)) { fail++; console.log('nondeterministic map', seed); }
}
console.log('map: 1000 seeds checked, failures =', fail, 'type distribution =', JSON.stringify(typeCount));
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
    const s = new BattleSim({ seed: 11, stage: 3, waves: [['ogre']], strategy: strat, heroes });
    const o = () => s.enemies.find((e) => e.key === 'ogre');
    for (let i = 0; i < 60 * 40 && !(o() && o().charge); i++) s.step(1 / 60);
    const c = o() && o().charge; if (!c) return null;
    const victim = s.heroes.find((h) => h.alive && h.key !== 'tobi' && s.inChargeZone(h, c)) || s.heroes.find((h) => h.alive && s.inChargeZone(h, c));
    if (!victim) return { none: true };
    s.heroes.filter((h) => h !== victim).forEach((h) => { h.cmd = null; });
    if (dodge) s.command(victim, { type: 'move', x: Math.max(50, c.cx - c.r - 60), y: victim.y });
    const hp0 = victim.hp; let impact = false;
    while (!impact && s.time < 200) { s.step(1 / 60); impact = !o().charge; }
    return { key: victim.key, lost: Math.round(hp0 - victim.hp) };
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
  if (CHARACTERS.length !== 15) errs.push('character count');
  for (const role of ['tank', 'melee', 'ranged', 'mage', 'support']) if (CHARACTERS.filter((c) => c.role === role).length !== 3) errs.push('3 per class: ' + role);
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
    if (GACHA.ownedIds(p).length !== 5 || p.tickets !== GACHA.START_TICKETS) errs.push('starter chars/tickets');
    p.tickets = 200; const res = GACHA.pull(p, r, 200);
    if (res.length !== 200 || p.tickets !== 0) errs.push('pull count');
    if (GACHA.ownedIds(p).length !== 15) errs.push('not all owned after 200 pulls');
    if (!res.some((x) => x.overflow)) errs.push('no overflow after max breakthrough');
    if (GACHA.pull(p, r, 1) !== null) errs.push('pull without tickets');
    if (ultChoices('kai', 0).length !== 3 || ultChoices('kai', 5).length !== 6) errs.push('variant unlocks');
    if (!(ultDefFor('kai', 'A', 1).power > ultDefFor('kai', 'A', 0).power)) errs.push('bt1 boost'); }
  console.log('characters:', errs.length ? 'FAIL ' + [...new Set(errs)].slice(0, 8).join(' | ') : 'OK', '(15 chars × 6 ultimates cast, mechanics, gacha)');
  if (errs.length) fail++;
}
process.exit(fail ? 1 : 0);
