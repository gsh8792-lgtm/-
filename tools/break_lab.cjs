// 그로기 역할 분담 검증: node tools/break_lab.cjs [archetypes|chars|ults] [--n 60] [--v1]
//   archetypes : 보스 4종 × 조합 원형 × AI(기믹/딜만) 승률·그로기·기여 비율
//   chars      : 캐릭터 15명 × 필살기 6종(A/B/C 0돌파, 변주 5돌파) × 보스 4종 — 각 캐릭터를 기준 파티의 같은 직업 자리에 넣어 측정
//   --v1       : 이전 그로기 규칙(BREAK_V2=false)으로 비교
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
const files = ['00_util.js', '01_data.js', '01b_equip_db.js', '01c_characters.js', '01d_gear_skills.js', '06_battle_sim.js'];
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(files.map((f) => fs.readFileSync(path.join(ROOT, 'src/js', f), 'utf8')).join('\n') + '\nthis.X={BattleSim,HEROES,AI_PRESETS,ENCOUNTERS,ENEMIES,CHARACTERS,CHAR,ultDefFor,CONST,GEAR_SKILLS,SKILLS};', ctx);
const { BattleSim, HEROES, AI_PRESETS, ENCOUNTERS, ENEMIES, CHARACTERS, CHAR, ultDefFor, CONST, GEAR_SKILLS, SKILLS } = ctx.X;
const args = process.argv.slice(2);
const mode = args.find((a) => !a.startsWith('--')) || 'archetypes';
const N = +(args[args.indexOf('--n') + 1] || 0) || (mode === 'chars' ? 24 : 60);
if (args.includes('--v1')) CONST.BREAK_V2 = false;
const GAP = args.includes('--gap') ? +args[args.indexOf('--gap') + 1] : 0;
const NO_CRUSH = args.includes('--nocrush'); if (NO_CRUSH) CONST.CRUSH_STEP = 0;
const BOSSES = ENCOUNTERS.boss[5].map((w) => w[0][0]);
const bossWaves = (b) => ENCOUNTERS.boss[5].find((w) => w[0][0] === b);

function strategy(profile) {
  const st = JSON.parse(JSON.stringify(AI_PRESETS));
  for (const k in st) {
    if (profile === 'smart') { st[k].s2.auto = true; st[k].ult.auto = true; st[k].ult.cond = 'auto'; }
    else for (const sl of ['s1', 's2', 'ult']) { st[k][sl].auto = true; st[k][sl].cond = 'always'; if (['charging', 'focus'].includes(st[k][sl].target)) st[k][sl].target = 'nearest'; }
  }
  return st;
}
const STRAT = { smart: strategy('smart'), brute: strategy('brute') };

function fight(ids, boss, seed, profile, ults, gap, gear) {
  const sim = new BattleSim({ seed, levelGap: gap === undefined ? GAP : gap, stage: 5, waves: bossWaves(boss), strategy: STRAT[profile], partySize: ids.length,
    heroes: ids.map((id) => { const u = (ults && ults[id]) || { k: 'A', bt: 0 }; return { id, hp: HEROES[id].hp, maxHp: HEROES[id].hp, upgrades: {}, ultDef: ultDefFor(id, u.k, u.bt), skills: gear && gear[id] || null }; }) });
  // 끊기 놓친 시전 vs 끊은 시전
  let cancels = 0, casts = 0;
  while (!sim.outcome && sim.time < 260) {
    sim.step(1 / 60);
    for (const e of sim.events) { if (e.type === 'chargeCancel' || e.type === 'callCancel') cancels++; if (e.type === 'chargeStart' || e.type === 'callStart') casts++; }
    sim.events.length = 0;
  }
  const b = sim.enemies.find((e) => e.key === boss);
  const sup = sim.heroes.find((h) => h.role === 'support');
  return { supDealt: sup ? sup.stats.dealt : 0, deaths: sim.heroes.filter((h) => !h.alive).length, win: sim.outcome === 'win', time: sim.time, breaks: sim.breakLog.length, first: sim.breakLog[0], poise: sim.poiseLog, cancels, casts, enrage: b ? b.enrageStacks : 0 };
}
function cell(ids, boss, profile, ults, n, gap, gear) {
  const r = { n, supDealt: 0, deaths: 0, wins: 0, breaks: 0, firsts: [], zeroWins: 0, time: 0, poise: {}, cancels: 0, casts: 0 };
  for (let s = 0; s < n; s++) {
    const f = fight(ids, boss, 7000 + s * 13, profile, ults, gap, gear);
    r.supDealt += f.supDealt; r.deaths += f.deaths;
    r.wins += f.win; r.breaks += f.breaks; r.time += f.time; r.cancels += f.cancels; r.casts += f.casts;
    if (f.first !== undefined) r.firsts.push(f.first);
    if (f.win && !f.breaks) r.zeroWins++;
    for (const k in f.poise) r.poise[k] = (r.poise[k] || 0) + f.poise[k];
  }
  const tot = Object.values(r.poise).reduce((a, b) => a + b, 0) || 1;
  const share = {}; for (const k in r.poise) share[k] = +(r.poise[k] / tot).toFixed(3);
  const med = r.firsts.length ? r.firsts.sort((a, b) => a - b)[Math.floor(r.firsts.length / 2)] : null;
  return { supDealt: Math.round(r.supDealt / n), deaths: +(r.deaths / n).toFixed(2), win: +(r.wins / n).toFixed(3), breaks: +(r.breaks / n).toFixed(2), firstMed: med && +med.toFixed(1), zeroWin: +(r.zeroWins / Math.max(1, r.wins)).toFixed(3), time: +(r.time / n).toFixed(1), share, cancelRate: +(r.cancels / Math.max(1, r.casts)).toFixed(2) };
}
const pct = (x) => (x * 100).toFixed(0).padStart(3) + '%';
const outDir = path.join(ROOT, 'data/balance'); fs.mkdirSync(outDir, { recursive: true });

if (mode === 'archetypes') {
  const COMPS = [
    ['T 탱커+딜+서포터', ['tobi', 'danbi', 'bori'], 'smart'],
    ['T 성기사+암살자+음유', ['leon', 'kai', 'lumi'], 'smart'],
    ['TT 탱커 2', ['tobi', 'gor', 'bori'], 'smart'],
    ['B 원딜+근딜+서포터', ['danbi', 'byeolbi', 'bori'], 'smart'],
    ['B 매지션+원딜+서포터', ['byeolbi', 'soldam', 'bori'], 'smart'],
    ['B 근딜+매지션+서포터', ['kai', 'seori', 'sera'], 'smart'],
    ['B 원딜2+서포터', ['haram', 'mir', 'lumi'], 'smart'],
    ['B 근딜+원딜+매지션', ['bran', 'byeolbi', 'seori'], 'smart'],
    ['B 원딜2 (미르 B 마비)', ['haram', 'mir', 'lumi'], 'smart', { mir: { k: 'B', bt: 0 } }],
    ['B 원딜2 (미르 B2 신경독)', ['haram', 'mir', 'lumi'], 'smart', { mir: { k: 'B2', bt: 5 } }],
    ['D 딜만 (탱커 조합)', ['tobi', 'danbi', 'bori'], 'brute'],
    ['D 딜만 (딜러 3)', ['danbi', 'byeolbi', 'soldam'], 'brute'],
  ];
  const out = { v2: CONST.BREAK_V2, n: N, bosses: BOSSES, rows: [] };
  console.log(`규칙 ${CONST.BREAK_V2 ? 'V2(흔들림·끊기 합산)' : 'V1(이전)'} · 셀당 ${N}판\n`);
  console.log('조합'.padEnd(22) + BOSSES.map((b) => ENEMIES[b].name.padStart(14)).join(''));
  for (const [name, ids, prof, ults] of COMPS) {
    const row = { name, ids, profile: prof, ults: ults || null, cells: {} };
    for (const b of BOSSES) row.cells[b] = cell(ids, b, prof, ults || null, N);
    out.rows.push(row);
    console.log(name.padEnd(22) + BOSSES.map((b) => { const c = row.cells[b]; return `${pct(c.win)} ${c.breaks.toFixed(1)}회`.padStart(14); }).join(''));
  }
  console.log('\n[상세: 첫 그로기(중앙값 초) / 그로기 0회 승리 비율 / 끊기 성공률 / 게이지 기여]');
  for (const row of out.rows) for (const b of BOSSES) {
    const c = row.cells[b];
    console.log(`${row.name.padEnd(22)} ${ENEMIES[b].name.padEnd(8)} 첫 ${String(c.firstMed ?? '-').padStart(5)}초 · 0회승 ${pct(c.zeroWin)} · 끊기 ${pct(c.cancelRate)} · ` + Object.entries(c.share).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(' '));
  }
  fs.writeFileSync(path.join(outDir, `break_lab_archetypes${CONST.BREAK_V2 ? '' : '_v1'}.json`), JSON.stringify(out, null, 1));
}

if (mode === 'pressure') {
  // 탱커 유무 × 레벨 차이 × 보스: 동레벨이면 탱커(또는 아주 단단한 근딜) 없이는 버티기 힘들고, 레벨 차가 크면 딜찍누
  const COMPS = [
    ['탱커+근딜+서포터', ['tobi', 'danbi', 'bori']],
    ['성기사+암살자+음유', ['leon', 'kai', 'lumi']],
    ['망자기사+원딜+치유사', ['gor', 'byeolbi', 'sera']],
    ['투사(단단한 근딜)+원딜+서포터', ['bran', 'byeolbi', 'bori']],
    ['근딜+원딜+서포터', ['danbi', 'byeolbi', 'bori']],
    ['매지션+원딜+서포터', ['byeolbi', 'soldam', 'bori']],
    ['딜러 3', ['danbi', 'byeolbi', 'soldam']],
  ];
  const GAPS = (process.env.GAPS || '-10,0,10,20,30').split(',').map(Number);
  const out = { n: N, bosses: BOSSES, gaps: GAPS, rows: [] };
  console.log(`레벨 차이 × 조합 (셀당 ${N}판, 보스 4종 평균 승률 · 판당 전사자)\n`);
  console.log('조합'.padEnd(24) + GAPS.map((g) => ((g > 0 ? '+' : '') + g).padStart(12)).join(''));
  for (const [name, ids] of COMPS) {
    const row = { name, ids, cells: {} };
    for (const g of GAPS) { row.cells[g] = {}; for (const b of BOSSES) row.cells[g][b] = cell(ids, b, 'smart', null, N, g); }
    out.rows.push(row);
    console.log(name.padEnd(24) + GAPS.map((g) => { const cs = BOSSES.map((b) => row.cells[g][b]); const w = cs.reduce((a, c) => a + c.win, 0) / cs.length, d = cs.reduce((a, c) => a + c.deaths, 0) / cs.length; return `${pct(w)} ${d.toFixed(1)}`.padStart(12); }).join(''));
    console.log(''.padEnd(24) + '  └ 보스별 (동레벨): ' + BOSSES.map((b) => `${ENEMIES[b].name} ${pct(row.cells[0] ? row.cells[0][b].win : 0)} 서포터딜 ${row.cells[0] ? row.cells[0][b].supDealt : '-'}`).join(' · '));
  }
  fs.writeFileSync(path.join(outDir, 'break_lab_pressure.json'), JSON.stringify(out, null, 1));
}

if (mode === 'gear') {
  // 직업별 ① 갑옷 3종 × ② 무기 3종 = 9조합, 기준 파티(탱커 있음)의 같은 직업 자리
  const base = { tank: ['tobi', 'danbi', 'bori'], melee: ['tobi', 'danbi', 'bori'], ranged: ['tobi', 'byeolbi', 'bori'], mage: ['tobi', 'soldam', 'bori'], support: ['tobi', 'danbi', 'bori'] };
  const who = { tank: 'tobi', melee: 'danbi', ranged: 'byeolbi', mage: 'soldam', support: 'bori' };
  const classes = (process.env.CLS || 'tank,melee,ranged,mage,support').split(',');
  const out = { n: N, bosses: BOSSES, classes: {} };
  for (const cls of classes) {
    const rows = [];
    for (let a = 1; a <= 3; a++) for (let w = 1; w <= 3; w++) {
      const sk = { s1: GEAR_SKILLS[`${cls}_armor_${a}`], s2: GEAR_SKILLS[`${cls}_weapon_${w}`] };
      const cells = {}; for (const b of BOSSES) cells[b] = cell(base[cls], b, 'smart', null, N, 0, { [who[cls]]: sk });
      rows.push({ s1: sk.s1, s2: sk.s2, cells });
      console.log(`${cls.padEnd(8)} ${SKILLS[sk.s1].name.padEnd(7)} + ${SKILLS[sk.s2].name.padEnd(7)}` + BOSSES.map((b) => `${pct(cells[b].win)} ${cells[b].breaks.toFixed(1)}회`.padStart(13)).join(''));
    }
    out.classes[cls] = rows;
  }
  fs.writeFileSync(path.join(outDir, `break_lab_gear${process.env.CLS ? '_' + process.env.CLS.replace(/,/g, '_') : ''}.json`), JSON.stringify(out, null, 1));
}

if (mode === 'chars') {
  // 기준 파티: 탱커 자리 → [X, danbi, bori] / 근딜 → [tobi, X, bori] / 원딜 → [tobi, X, bori] / 매지션 → [tobi, X, bori] / 서포터 → [tobi, danbi, X]
  // 탱커 없는 기준도 함께: [X(비탱커), byeolbi|danbi, bori]
  const base = (c) => c.role === 'tank' ? [c.id, 'danbi', 'bori'] : c.role === 'support' ? ['tobi', 'danbi', c.id] : ['tobi', c.id, 'bori'];
  const baseNT = (c) => c.role === 'tank' ? null : c.role === 'support' ? ['byeolbi', 'danbi', c.id] : [c.id, c.role === 'ranged' ? 'danbi' : 'byeolbi', 'bori'];
  const KS = [['A', 0], ['B', 0], ['C', 0], ['A2', 5], ['B2', 5], ['C2', 5]];
  const NT_GAP = +(process.env.NT_GAP || 15);
  const out = { v2: CONST.BREAK_V2, n: N, ntGap: NT_GAP, bosses: BOSSES, chars: [] };
  console.log(`캐릭터 × 필살기 × 보스 (셀당 ${N}판) — 승률 / 그로기 횟수\n`);
  for (const c of CHARACTERS) {
    const rec = { id: c.id, name: c.name, role: c.role, ults: {} };
    for (const [k, bt] of KS) {
      const ults = { [c.id]: { k, bt } };
      const r = { withTank: {}, noTank: {} };
      for (const b of BOSSES) {
        r.withTank[b] = cell(base(c), b, 'smart', ults, N);
        const nt = baseNT(c);
        if (nt) r.noTank[b] = cell(nt, b, 'smart', ults, N, NT_GAP); // 탱커 없는 파티는 동레벨로는 못 버티므로 '장비로 보완한' 레벨 차에서 잰다
      }
      rec.ults[k] = r;
      const sk = ultDefFor(c.id, k, bt);
      const line = BOSSES.map((b) => `${pct(r.withTank[b].win)}${r.noTank[b] ? '/' + pct(r.noTank[b].win).trim() : ''}`.padStart(11)).join('');
      console.log(`${c.name.padEnd(4)} ${k.padEnd(2)} ${sk.name.padEnd(10)}${line}`);
    }
    out.chars.push(rec);
    fs.writeFileSync(path.join(outDir, `break_lab_chars${CONST.BREAK_V2 ? '' : '_v1'}.json`), JSON.stringify(out, null, 1));
  }
  console.log('\n(각 칸: 탱커 있는 기준 파티 승률 / 탱커 없는 기준 파티 승률. 보스 순서: ' + BOSSES.map((b) => ENEMIES[b].name).join(', ') + ')');
}
