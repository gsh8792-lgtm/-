// 그로기 역할 분담 검증: node tools/break_lab.cjs [archetypes|chars|ults] [--n 60] [--v1]
//   archetypes : 보스 4종 × 조합 원형 × AI(기믹/딜만) 승률·그로기·기여 비율
//   chars      : 캐릭터 15명 × 필살기 6종(A/B/C 0돌파, 변주 5돌파) × 보스 4종 — 각 캐릭터를 기준 파티의 같은 직업 자리에 넣어 측정
//   --v1       : 이전 그로기 규칙(BREAK_V2=false)으로 비교
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
const files = ['00_util.js', '01_data.js', '01b_equip_db.js', '01c_characters.js', '06_battle_sim.js'];
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(files.map((f) => fs.readFileSync(path.join(ROOT, 'src/js', f), 'utf8')).join('\n') + '\nthis.X={BattleSim,HEROES,AI_PRESETS,ENCOUNTERS,ENEMIES,CHARACTERS,CHAR,ultDefFor,CONST};', ctx);
const { BattleSim, HEROES, AI_PRESETS, ENCOUNTERS, ENEMIES, CHARACTERS, CHAR, ultDefFor, CONST } = ctx.X;
const args = process.argv.slice(2);
const mode = args.find((a) => !a.startsWith('--')) || 'archetypes';
const N = +(args[args.indexOf('--n') + 1] || 0) || (mode === 'chars' ? 24 : 60);
if (args.includes('--v1')) CONST.BREAK_V2 = false;
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

function fight(ids, boss, seed, profile, ults) {
  const sim = new BattleSim({ seed, stage: 5, waves: bossWaves(boss), strategy: STRAT[profile], partySize: ids.length,
    heroes: ids.map((id) => { const u = (ults && ults[id]) || { k: 'A', bt: 0 }; return { id, hp: HEROES[id].hp, maxHp: HEROES[id].hp, upgrades: {}, ultDef: ultDefFor(id, u.k, u.bt) }; }) });
  // 끊기 놓친 시전 vs 끊은 시전
  let cancels = 0, casts = 0;
  while (!sim.outcome && sim.time < 260) {
    sim.step(1 / 60);
    for (const e of sim.events) { if (e.type === 'chargeCancel' || e.type === 'callCancel') cancels++; if (e.type === 'chargeStart' || e.type === 'callStart') casts++; }
    sim.events.length = 0;
  }
  const b = sim.enemies.find((e) => e.key === boss);
  return { win: sim.outcome === 'win', time: sim.time, breaks: sim.breakLog.length, first: sim.breakLog[0], poise: sim.poiseLog, cancels, casts, enrage: b ? b.enrageStacks : 0 };
}
function cell(ids, boss, profile, ults, n) {
  const r = { n, wins: 0, breaks: 0, firsts: [], zeroWins: 0, time: 0, poise: {}, cancels: 0, casts: 0 };
  for (let s = 0; s < n; s++) {
    const f = fight(ids, boss, 7000 + s * 13, profile, ults);
    r.wins += f.win; r.breaks += f.breaks; r.time += f.time; r.cancels += f.cancels; r.casts += f.casts;
    if (f.first !== undefined) r.firsts.push(f.first);
    if (f.win && !f.breaks) r.zeroWins++;
    for (const k in f.poise) r.poise[k] = (r.poise[k] || 0) + f.poise[k];
  }
  const tot = Object.values(r.poise).reduce((a, b) => a + b, 0) || 1;
  const share = {}; for (const k in r.poise) share[k] = +(r.poise[k] / tot).toFixed(3);
  const med = r.firsts.length ? r.firsts.sort((a, b) => a - b)[Math.floor(r.firsts.length / 2)] : null;
  return { win: +(r.wins / n).toFixed(3), breaks: +(r.breaks / n).toFixed(2), firstMed: med && +med.toFixed(1), zeroWin: +(r.zeroWins / Math.max(1, r.wins)).toFixed(3), time: +(r.time / n).toFixed(1), share, cancelRate: +(r.cancels / Math.max(1, r.casts)).toFixed(2) };
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

if (mode === 'chars') {
  // 기준 파티: 탱커 자리 → [X, danbi, bori] / 근딜 → [tobi, X, bori] / 원딜 → [tobi, X, bori] / 매지션 → [tobi, X, bori] / 서포터 → [tobi, danbi, X]
  // 탱커 없는 기준도 함께: [X(비탱커), byeolbi|danbi, bori]
  const base = (c) => c.role === 'tank' ? [c.id, 'danbi', 'bori'] : c.role === 'support' ? ['tobi', 'danbi', c.id] : ['tobi', c.id, 'bori'];
  const baseNT = (c) => c.role === 'tank' ? null : c.role === 'support' ? ['byeolbi', 'danbi', c.id] : [c.id, c.role === 'ranged' ? 'danbi' : 'byeolbi', 'bori'];
  const KS = [['A', 0], ['B', 0], ['C', 0], ['A2', 5], ['B2', 5], ['C2', 5]];
  const out = { v2: CONST.BREAK_V2, n: N, bosses: BOSSES, chars: [] };
  console.log(`캐릭터 × 필살기 × 보스 (셀당 ${N}판) — 승률 / 그로기 횟수\n`);
  for (const c of CHARACTERS) {
    const rec = { id: c.id, name: c.name, role: c.role, ults: {} };
    for (const [k, bt] of KS) {
      const ults = { [c.id]: { k, bt } };
      const r = { withTank: {}, noTank: {} };
      for (const b of BOSSES) {
        r.withTank[b] = cell(base(c), b, 'smart', ults, N);
        const nt = baseNT(c);
        if (nt) r.noTank[b] = cell(nt, b, 'smart', ults, N);
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
