// 장비 밸런스 분석: node tools/equip_balance.cjs [--quick]
// 입력: data/equipment/equipment_db.json  출력: data/equipment/balance_report.json
// 1) 등급별 풀세트(6부위) 기대 스탯 & 전투력(선형 근사) 구성비
// 2) 옵션 1줄당 전투력 가치(공정성), 최대치 누적 시 상한 필요 여부
// 3) 실제 전투 시뮬: 장비 등급(없음/UC~E) × 난이도(1~8) 승률·시간·남은 HP
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
const DB = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/equipment/equipment_db.json'), 'utf8'));
const QUICK = process.argv.includes('--quick');

const G = Object.fromEntries(DB.grades.map((g, i) => [g.code, Object.assign({ idx: i }, g)]));
const STAT = Object.fromEntries(DB.stats.map((s) => [s.key, s]));
const CLASS = Object.fromEntries(DB.classes.map((c) => [c.key, c]));
const GRADE_CODES = DB.grades.map((g) => g.code);

// ------------------------------------------------------------ 기대값 세트 계산
const add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
function optionExpectation(slot, grade) {
  // 해당 슬롯에 붙을 수 있는 옵션 풀의 가중 평균 → 옵션 1줄 기대 스탯 벡터
  const pool = DB.options.filter((o) => o.slots === '*' || o.slots.split(',').includes(slot));
  const W = pool.reduce((a, o) => a + o.weight, 0);
  const v = {};
  for (const o of pool) add(v, o.key, (o.weight / W) * ((o.min + o.max) / 2) * G[grade].optMult);
  return v;
}
function gemExpectation(grade) {
  // 보석 1개 기대 스탯: 본 효과(8종 평균) + 추가 효과 (n-1)개 × 60% (스탯 평균, 스킬 효과는 skill 전투력으로)
  const n = DB.gemEffectCount[grade], m = DB.gemMult[grade];
  const v = {}; let skillPw = 0;
  for (const g of DB.gems) add(v, g.stat, (g.base * m) / DB.gems.length);
  const extraPool = DB.gems.length + DB.gemSkillExtras.length;
  for (let i = 1; i < n; i++) {
    for (const g of DB.gems) add(v, g.stat, (g.base * m * DB.gemExtraRatio) / extraPool);
    for (const e of DB.gemSkillExtras) skillPw += (e.base * m * DB.gemExtraRatio * 100 * 0.4) / extraPool; // 스킬 위력% → 해당 스킬이 피해의 ~40%
  }
  return { v, skillPw };
}
function expectedSlotGems(grade) { const g = G[grade]; if (grade === 'L') return 1; if (grade === 'E') { const w = DB.eGemWeights; const W = Object.values(w).reduce((a, b) => a + b, 0); return Object.entries(w).reduce((a, [k, x]) => a + (+k) * x / W, 0); } return 0; }

// 직업 cls의 풀세트(무기·갑옷·메달 라인 평균 + 반지·목걸이·벨트 라인 평균)를 등급 grade로 맞춘 기대 스탯
function fullSet(cls, grade, opts) {
  opts = opts || {};
  const g = G[grade];
  const comp = { main: {}, innate: 0, options: {}, classStat: {}, skillPw: 0, gems: {}, gemSkillPw: 0 };
  for (const slot of ['weapon', 'armor', 'medal', 'ring', 'necklace', 'belt']) {
    const lines = DB.items.filter((it) => it.slot === slot && (it.cls === cls || it.cls === 'common'));
    for (const it of lines) for (const m of it.main) add(comp.main, m.stat, (m.base * g.main) / lines.length);
    const inn = lines.filter((it) => it.innate);
    for (const it of inn) comp.innate += (it.innate.pw * g.innate) / inn.length;
    const ov = optionExpectation(slot, grade);
    for (const k in ov) add(comp.options, k, ov[k] * g.opt);
    const classBound = slot === 'weapon' || slot === 'armor' || slot === 'medal';
    const sbList = classBound ? DB.skillBonus[cls] : DB.skillBonus.common;
    const sbAvgPw = sbList.reduce((a, b) => a + b.pw, 0) / sbList.length;
    const cs = DB.classStat[cls];
    if (grade === 'L') {
      const w = DB.lExtraWeights, W = w.none + w.cls + w.skill;
      add(comp.classStat, cs.stat, cs.L * w.cls / W);
      comp.skillPw += sbAvgPw * w.skill / W;
    }
    if (grade === 'E') {
      add(comp.classStat, cs.stat, cs.E);
      const w = DB.eSkillWeights, W = Object.values(w).reduce((a, b) => a + b, 0);
      const en = Object.entries(w).reduce((a, [k, x]) => a + (+k) * x / W, 0);
      comp.skillPw += sbAvgPw * DB.skillBonusERatio * en; // E 수치 = L × 비율
    }
    const ns = expectedSlotGems(grade);
    if (ns && !opts.noGems && !process.env.NOGEM) { const ge = gemExpectation(opts.gemGrade || grade); for (const k in ge.v) add(comp.gems, k, ge.v[k] * ns); comp.gemSkillPw += ge.skillPw * ns; }
  }
  const total = {};
  for (const part of [comp.main, comp.options, comp.classStat, comp.gems]) for (const k in part) add(total, k, part[k]);
  return { comp, total };
}

// 선형 전투력(%) 근사: Σ 스탯 × 가중치 (+ 고유효과/스킬보너스 전투력)
function statPower(cls, vec) {
  let p = 0;
  for (const k in vec) {
    if (k === 'atk') p += (vec[k] / CLASS[cls].baseAtk) * 100 * 0.5;
    else if (k === 'hp') p += (vec[k] / CLASS[cls].baseHp) * 100 * 0.5;
    else p += vec[k] * 100 * STAT[k].pw;
  }
  return p;
}
function powerBreakdown(cls, grade) {
  const { comp } = fullSet(cls, grade);
  const r = {
    main: statPower(cls, comp.main), innate: comp.innate, options: statPower(cls, comp.options),
    classStat: statPower(cls, comp.classStat), skillBonus: comp.skillPw, gems: statPower(cls, comp.gems) + comp.gemSkillPw,
  };
  r.total = Object.values(r).reduce((a, b) => a + b, 0);
  return r;
}

// ------------------------------------------------------------ 시뮬 준비
const code = ['00_util.js', '01_data.js', '01b_equip_db.js', '01c_characters.js', '01d_gear_skills.js', '06_battle_sim.js'].map((f) => fs.readFileSync(path.join(ROOT, 'src/js', f), 'utf8')).join('\n');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(code + '\nthis.S={BattleSim,ENCOUNTERS,HEROES,HERO_ORDER,AI_PRESETS,CONST};', ctx);
const { BattleSim, ENCOUNTERS, HEROES, HERO_ORDER, AI_PRESETS } = ctx.S;
const HERO2CLS = Object.fromEntries(DB.classes.map((c) => [c.hero, c.key]));

// 시뮬에 넣을 장비 보정치(mods): 고유효과·스킬보너스(전투력 %)는 공격력%와 체력%로 절반씩 환산 (근사, 미구현 효과 대체)
// 강화: 권장 강화 수치(ENH, 기본 +5, 등급 상한까지)만큼 주 스탯 증가
const ENH = +(process.env.ENH || 5);
const enhOf = (grade) => Math.min(ENH, DB.enhance.capByGrade[grade]);
// 전투 레벨 (04b_equip.heroLevel과 같은 식): 등급 순서 × 10 + 강화 / 던전 레벨: 권장 등급 × 10 + 5
const gearLevel = (grade) => grade ? (G[grade].idx + 1) * 10 + enhOf(grade) : 0;
const tierLevel = (t) => t && t.recGrade ? (G[t.recGrade].idx + 1) * 10 + 5 : 0;
function modsFor(heroId, grade) {
  if (!grade) return { mods: {}, hp: 0 };
  const cls = HERO2CLS[heroId];
  const { comp, total } = fullSet(cls, grade);
  const em = 1 + enhOf(grade) * DB.enhance.mainPerLevel;
  for (const k in comp.main) total[k] += comp.main[k] * (em - 1);
  const m = Object.assign({}, total);
  const extraPw = comp.innate + comp.skillPw + comp.gemSkillPw; // % 전투력
  m.atk_pct = (m.atk_pct || 0) + extraPw / 100;
  m.hp_pct = (m.hp_pct || 0) + extraPw / 100;
  const hp = (HEROES[heroId].hp * (1 + (m.hp_pct || 0)) + (m.hp || 0));
  return { mods: m, hp: Math.round(hp) };
}

const COMPS = [['tobi', 'danbi', 'bori'], ['tobi', 'soldam', 'bori'], ['tobi', 'byeolbi', 'soldam']];
const FIGHTS = [['battle', 4, 0, 'stage4'], ['elite', 4, 0, 'elite4'], ['boss', 5, 0, 'boss'], ['boss', 5, 1, 'boss'], ['boss', 5, 2, 'boss'], ['boss', 5, 3, 'boss']]; // 보스 4종은 평균
// AI 성향 2종: gimmick = 기믹 활용(② 추천 상황에만 사용, 차지 회피, 그로기 대상 집중) / brute = 딜만(쿨마다 아무 대상에게, 회피 없음)
// AI 성향 2종 (break_lab과 같음): gimmick = 끊기 타이밍·필살기 자동 판단 / brute = 모든 스킬을 쿨마다 가까운 적에게
const STRAT = { gimmick: JSON.parse(JSON.stringify(AI_PRESETS)), brute: JSON.parse(JSON.stringify(AI_PRESETS)) };
for (const k in STRAT.gimmick) { STRAT.gimmick[k].s2.auto = true; STRAT.gimmick[k].ult.auto = true; STRAT.gimmick[k].ult.cond = 'auto'; }
for (const k in STRAT.brute) for (const sl of ['s1', 's2', 'ult']) { STRAT.brute[k][sl].auto = true; STRAT.brute[k][sl].cond = 'always'; if (['charging', 'focus'].includes(STRAT.brute[k][sl].target)) STRAT.brute[k][sl].target = 'nearest'; }
let PROFILE = process.env.PROFILE || 'gimmick';

function simCell(grade, tier, seeds, profile, comps) {
  profile = profile || PROFILE;
  const gap = gearLevel(grade) - tierLevel(tier);
  const acc = {};
  for (const [type, st, i, label] of FIGHTS) {
    const a = acc[label] = acc[label] || { win: 0, t: 0, hp: 0, n: 0 };
    let win = 0, t = 0, hp = 0, n = 0;
    for (const comp of comps || COMPS) for (let s = 0; s < seeds; s++) {
      const heroes = HERO_ORDER.filter((id) => comp.includes(id)).map((id) => { const { mods, hp: mh } = modsFor(id, grade); return { id, hp: Math.round(mh ? mh * 0.85 : HEROES[id].hp * 0.85), maxHp: mh || HEROES[id].hp, upgrades: {}, mods, levelGap: gap }; });
      const sim = BattleSim.runHeadless({ seed: 9000 + s * 31 + st, stage: st, waves: ENCOUNTERS[type][st][i], strategy: STRAT[profile], heroes, partySize: 3, tier: { hp: tier.hp, atk: tier.atk }, aiProfile: profile }, 240);
      n++; if (sim.outcome === 'win') win++;
      t += sim.time; hp += sim.heroes.reduce((a, h) => a + Math.max(0, h.hp), 0) / sim.heroes.reduce((a, h) => a + h.maxHp, 0);
    }
    a.win += win; a.t += t; a.hp += hp; a.n += n;
  }
  const res = {};
  for (const k in acc) res[k] = { win: +(acc[k].win / acc[k].n).toFixed(3), time: +(acc[k].t / acc[k].n).toFixed(1), hpLeft: +(acc[k].hp / acc[k].n).toFixed(3) };
  return res;
}

// ------------------------------------------------------------ 실행
const report = { generatedFrom: 'tools/equip_balance.cjs', note: '선형 전투력은 근사치(스탯×가중치). 승률은 실제 전투 시뮬(헤드리스, 숙련 AI) 결과.' };

// 1) 옵션 1줄 가치 (R 기준 평균값 × 가중치)
report.optionValue = DB.options.map((o) => ({ stat: o.key, name: STAT[o.key].name, avgAtR: +((o.min + o.max) / 2).toFixed(4), powerPerLine: +(((o.min + o.max) / 2) * 100 * STAT[o.key].pw).toFixed(2) }));
// 2) 등급별 풀세트 전투력 구성 (직업별)
report.power = {};
for (const c of DB.classes) report.power[c.key] = Object.fromEntries(GRADE_CODES.map((g) => { const b = powerBreakdown(c.key, g); return [g, Object.fromEntries(Object.entries(b).map(([k, v]) => [k, +v.toFixed(1)]))]; }));
// 3) 풀세트 기대 스탯 (E 등급, 직업별) + 최악 누적 시나리오
report.expectedE = Object.fromEntries(DB.classes.map((c) => [c.key, Object.fromEntries(Object.entries(fullSet(c.key, 'E').total).map(([k, v]) => [k, +v.toFixed(4)]))]));
// 최대 누적: E 6부위 전부 같은 스탯 옵션 최대값 4줄... 단 중복 불가 → 부위당 1줄 + 보석 3개 본효과 + 메인/특성
function stackMax(stat) {
  const o = DB.options.find((x) => x.key === stat);
  let v = 0, src = [];
  for (const slot of ['weapon', 'armor', 'medal', 'ring', 'necklace', 'belt']) {
    if (o && (o.slots === '*' || o.slots.split(',').includes(slot))) { v += o.max * G.E.optMult; }
  }
  if (o) src.push('옵션(부위당 1줄)');
  const gem = DB.gems.find((g) => g.stat === stat);
  if (gem) { v += gem.base * DB.gemMult.E * 3 * 6; src.push('E 보석 3개×6부위'); }
  let best = 0;
  for (const it of DB.items) for (const m of it.main) if (m.stat === stat) best = Math.max(best, m.base * G.E.main);
  // 메인 스탯: 부위별 최대 1개씩
  const perSlot = {};
  for (const it of DB.items) for (const m of it.main) if (m.stat === stat) perSlot[it.slot] = Math.max(perSlot[it.slot] || 0, m.base * G.E.main);
  const mainSum = Object.values(perSlot).reduce((a, b) => a + b, 0);
  if (mainSum) { v += mainSum; src.push('주 스탯'); }
  for (const c of DB.classes) if (DB.classStat[c.key].stat === stat) { v += DB.classStat[c.key].E * 3; src.push('특성 스탯(무기·갑옷·메달)'); break; }
  return { stat, name: STAT[stat].name, max: +v.toFixed(3), cap: STAT[stat].cap || null, sources: src.join(' + ') };
}
report.stackMax = ['dr', 'cdr', 'crit', 'aspd', 'mspd', 'ultgain', 'critdmg', 'skilldmg', 'heal', 'atk_pct', 'hp_pct'].map(stackMax);

// 4) 시뮬 매트릭스
const seeds = process.argv.includes('--nosim') ? 0 : QUICK ? 2 : +(process.env.SEEDS || 4);
const gradesForSim = [null].concat(GRADE_CODES);
report.sim = { seedsPerComp: seeds, comps: COMPS.map((c) => c.join('+')), fights: FIGHTS.map((f) => f[3]), cells: [] };
const t0 = Date.now();
for (const tier of seeds ? DB.tiers : []) {
  for (const g of gradesForSim) for (const prof of ['gimmick', 'brute']) {
    const r = simCell(g, tier, seeds, prof);
    report.sim.cells.push({ tier: tier.tier, grade: g || '없음', profile: prof, ...r });
  }
  process.stdout.write(`tier ${tier.tier} done (${((Date.now() - t0) / 1000).toFixed(0)}s)\n`);
}
// 4b) 시뮬 보정: 등급별 '승률 85% 지점' 적 배율을 이분 탐색 → UC 기준 비율 = 난이도 배율 실측 제안
// 레벨 차이 0(권장 등급 +강화 ENH로 그 단계에 들어감)에서 승률 85% 지점 적 배율을 로그 이분 탐색.
// 병렬: CAL_GRADES=none,UC node tools/equip_balance.cjs --nosim --calibrate (등급마다 data/equipment/calib/<등급>.json)
// 합치기: node tools/equip_balance.cjs --nosim --calib-merge → 단계 배율 = 등급 배율 / 장비 없음 배율 (기본 던전과 같은 체감 난이도)
if (process.argv.includes('--calibrate')) {
  const target = +(process.env.CAL_TARGET || 0.85);
  const CS = +(process.env.CAL_SEEDS || 3);
  const score = (g, m) => { const r = simCell(g === 'none' ? null : g, { hp: m, atk: m, recGrade: g === 'none' ? null : g }, CS); return (r.stage4.win + r.elite4.win + r.boss.win * 2) / 4; };
  const dir = path.join(ROOT, 'data/equipment/calib'); fs.mkdirSync(dir, { recursive: true });
  for (const g of (process.env.CAL_GRADES ? process.env.CAL_GRADES.split(',') : ['none'].concat(GRADE_CODES))) {
    let lo = Math.log(0.4), hi = Math.log(14);
    for (let i = 0; i < +(process.env.CAL_ITERS || 8); i++) { const mid = (lo + hi) / 2; if (score(g, Math.exp(mid)) >= target) lo = mid; else hi = mid; }
    const m = +Math.exp((lo + hi) / 2).toFixed(3);
    fs.writeFileSync(path.join(dir, g + '.json'), JSON.stringify({ grade: g, mult: m, target, seeds: CS, enh: ENH }));
    console.log(`calib ${g}: 승률 ${target * 100}% 지점 적 배율 ${m}`);
  }
  process.exit(0);
}
if (process.argv.includes('--calib-merge')) {
  const dir = path.join(ROOT, 'data/equipment/calib');
  const c = Object.fromEntries(fs.readdirSync(dir).map((f) => { const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); return [j.grade, j.mult]; }));
  let prev = 1;
  const tiers = DB.tiers.map((t) => { const m = Math.max(prev + 0.05, +(c[t.recGrade] / c.none).toFixed(2)); prev = m; return { tier: t.tier, recGrade: t.recGrade, raw: +(c[t.recGrade] / c.none).toFixed(3), mult: +m.toFixed(2) }; });
  console.log('기준(장비 없음) 85% 지점:', c.none); for (const t of tiers) console.log(`T${t.tier} ${t.recGrade.padEnd(3)} 실측 ${t.raw} → 배율 ${t.mult}`);
  fs.writeFileSync(path.join(ROOT, 'data/equipment/calib_tiers.json'), JSON.stringify({ base: c.none, raw: c, tiers }, null, 1));
  process.exit(0);
}
// 단계 × 장비 등급(권장 −1 ~ +2) × 탱커 유무: 동레벨 탱커 파티 ~85%, 탱커 없으면 등급을 올려야(레벨 차) 깨지는가
if (process.argv.includes('--tier-matrix')) {
  const MS = +(process.env.SEEDS || 6);
  const TANK = [['tobi', 'danbi', 'bori'], ['tobi', 'byeolbi', 'soldam']], NOTANK = [['danbi', 'byeolbi', 'bori'], ['byeolbi', 'soldam', 'bori']];
  const out = { seeds: MS, enh: ENH, offsets: [-1, 0, 1, 2], rows: [] };
  const sc = (r) => (r.stage4.win + r.elite4.win + r.boss.win * 2) / 4;
  console.log(`단계 × 장비 등급 (권장 대비, +${ENH}강) — 탱커 파티 / 탱커 없는 파티. 칸 = (일반+정예+보스×2)/4 승률, 괄호 = 보스 승률`);
  for (const t of DB.tiers) {
    const gi = G[t.recGrade].idx, row = { tier: t.tier, recGrade: t.recGrade, mult: t.hp, cells: {} };
    for (const o of out.offsets) {
      const g = GRADE_CODES[gi + o]; if (!g) continue;
      const a = simCell(g, t, MS, 'gimmick', TANK), b = simCell(g, t, MS, 'gimmick', NOTANK);
      row.cells[o] = { grade: g, gap: gearLevel(g) - tierLevel(t), tank: +sc(a).toFixed(2), tankBoss: a.boss.win, noTank: +sc(b).toFixed(2), noTankBoss: b.boss.win };
    }
    out.rows.push(row);
    console.log(`T${t.tier} ${t.recGrade.padEnd(3)} ×${t.hp}  ` + out.offsets.map((o) => { const c = row.cells[o]; return c ? `${c.grade.padEnd(3)}(${c.gap >= 0 ? '+' : ''}${c.gap}) ${Math.round(c.tank * 100)}%(${Math.round(c.tankBoss * 100)}) / ${Math.round(c.noTank * 100)}%(${Math.round(c.noTankBoss * 100)})` : ''; }).map((x) => x.padEnd(34)).join(''));
  }
  fs.writeFileSync(path.join(ROOT, 'data/equipment/tier_matrix.json'), JSON.stringify(out, null, 1));
  process.exit(0);
}
// 5) 난이도 배율 제안: 권장 등급 풀세트 전투력 비율 (UC 기준) = 적 HP·공격력 배율
const avgP = (g) => DB.classes.reduce((a, c) => a + report.power[c.key][g].total, 0) / DB.classes.length;
report.tierSuggest = DB.tiers.map((t) => ({ tier: t.tier, recGrade: t.recGrade, power: +avgP(t.recGrade).toFixed(1), mult: +((1 + avgP(t.recGrade) / 100) / (1 + avgP('UC') / 100)).toFixed(3) }));
fs.writeFileSync(path.join(ROOT, 'data/equipment/balance_report.json'), JSON.stringify(report, null, 1));

// 콘솔 요약
console.log('\n[옵션 1줄 전투력 (R 평균)]'); for (const o of report.optionValue) console.log(`  ${o.name.padEnd(10)} ${o.powerPerLine}%`);
console.log('\n[풀세트 전투력 % (직업 평균) — main / innate / options / class / skill / gems = total]');
for (const g of GRADE_CODES) {
  const avg = (k) => DB.classes.reduce((a, c) => a + report.power[c.key][g][k], 0) / DB.classes.length;
  console.log(`  ${g.padEnd(4)} ${['main', 'innate', 'options', 'classStat', 'skillBonus', 'gems'].map((k) => avg(k).toFixed(1).padStart(6)).join(' ')}  = ${avg('total').toFixed(1)}   직업별: ${DB.classes.map((c) => report.power[c.key][g].total.toFixed(0)).join('/')}`);
}
console.log('\n[난이도 배율 제안]'); for (const t of report.tierSuggest) console.log(`  T${t.tier} ${t.recGrade} 전투력 +${t.power}% → 적 배율 ${t.mult}`);
console.log('\n[E 풀세트 기대 특성 스탯]'); for (const c of DB.classes) { const st = DB.classStat[c.key].stat; console.log(`  ${c.name} ${STAT[st].name} ${(report.expectedE[c.key][st] * 100).toFixed(1)}%`); }
console.log('\n[최대 누적 vs 상한]'); for (const s of report.stackMax) console.log(`  ${s.name.padEnd(10)} 최대 ${(s.max * 100).toFixed(0)}%  상한 ${s.cap ? (s.cap * 100) + '%' : '-'}`);
// 딜찍누 지수: 권장 등급(같은 등급)에서 기믹 활용 vs 딜만 / 딜만으로 이기려면 몇 등급 위가 필요한가
const avgWin = (c) => (c.stage4.win + c.elite4.win + c.boss.win) / 3;
report.bruteIndex = DB.tiers.map((t) => {
  const cell = (g, p) => report.sim.cells.find((c) => c.tier === t.tier && c.grade === g && c.profile === p);
  const gi = GRADE_CODES.indexOf(t.recGrade);
  const gim = cell(t.recGrade, 'gimmick'), bru = cell(t.recGrade, 'brute');
  if (!gim) return null;
  let need = null;
  for (let k = gi; k < GRADE_CODES.length; k++) { const c = cell(GRADE_CODES[k], 'brute'); if (c && avgWin(c) >= 0.85) { need = k - gi; break; } }
  return { tier: t.tier, recGrade: t.recGrade, gimmickWin: +avgWin(gim).toFixed(2), bruteWin: +avgWin(bru).toFixed(2), bruteNeedsGradesAbove: need };
}).filter(Boolean);
console.log('\n[딜찍누 지수: 같은 등급 기믹 vs 딜만, 딜만이 85% 넘으려면 필요한 등급 차이]');
for (const b of report.bruteIndex) console.log(`  T${b.tier} ${b.recGrade.padEnd(3)} 기믹 ${Math.round(b.gimmickWin * 100)}% / 딜만 ${Math.round(b.bruteWin * 100)}%  → 딜만 85%: ${b.bruteNeedsGradesAbove === null ? '장비 범위 밖' : '+' + b.bruteNeedsGradesAbove + '등급'}`);
fs.writeFileSync(path.join(ROOT, 'data/equipment/balance_report.json'), JSON.stringify(report, null, 1));
for (const prof of ['gimmick', 'brute']) {
console.log(`\n[시뮬 승률 ${prof}: 행=난이도, 열=장비 등급 (stage4 / elite4 / boss)]`);
console.log('     ' + gradesForSim.map((g) => (g || '없음').padStart(15)).join(''));
for (const tier of DB.tiers) {
  const row = report.sim.cells.filter((c) => c.tier === tier.tier && c.profile === prof);
  console.log(`T${tier.tier}(${tier.recGrade.padEnd(3)})` + row.map((c) => `${Math.round(c.stage4.win * 100)}/${Math.round(c.elite4.win * 100)}/${Math.round(c.boss.win * 100)}`.padStart(15)).join(''));
}
}
