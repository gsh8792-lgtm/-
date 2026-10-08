// 로직 검증 (브라우저 불필요): node tools/check_logic.cjs
// 1) 지도 생성 제약 1000시드  2) 같은 시드 → 같은 지도  3) 같은 시드 → 같은 전투 결과
const fs = require('fs'), vm = require('vm');
const code = ['00_util.js', '01_data.js', '05_map.js', '06_battle_sim.js'].map((f) => fs.readFileSync(__dirname + '/../src/js/' + f, 'utf8')).join('\n');
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(code.replace(/const MapScene[\s\S]*?\n};\n/, '') + '\nthis.X={generateMap,validStage,canMoveTo,BattleSim,ENCOUNTERS,HEROES,AI_PRESETS,NODE_TYPES,EVENTS,encounterFor};', ctx);
const { generateMap, BattleSim, ENCOUNTERS, HEROES, AI_PRESETS, NODE_TYPES, encounterFor } = ctx.X;
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
process.exit(fail ? 1 : 0);
