// 헤드리스 밸런스 측정: node tools/balance.cjs
const fs = require('fs'), vm = require('vm');
const code = ['00_util.js', '01_data.js', '06_battle_sim.js'].map((f) => fs.readFileSync(__dirname + '/../src/js/' + f, 'utf8')).join('\n');
const ctx = {}; vm.createContext(ctx); vm.runInContext(code + '\nthis.BattleSim=BattleSim;this.ENCOUNTERS=ENCOUNTERS;this.HEROES=HEROES;this.HERO_ORDER=HERO_ORDER;this.AI_PRESETS=AI_PRESETS;this.CONST=CONST;', ctx);
if (process.env.HPM) vm.runInContext(`CONST.ENEMY_HP_MULT=${process.env.HPM};CONST.ENEMY_ATK_MULT=${process.env.ATM||1};CONST.HEAL_MULT=${process.env.HLM||1};`, ctx);
const { BattleSim, ENCOUNTERS, HEROES, HERO_ORDER, AI_PRESETS } = ctx;
const COMPS = [['tobi','danbi','bori'],['tobi','soldam','bori'],['tobi','byeolbi','soldam'],['danbi','byeolbi','bori']];
let COMP = COMPS[0];
const party = (hpPct) => HERO_ORDER.filter((id) => COMP.includes(id)).map((id) => ({ id, hp: Math.round(HEROES[id].hp * hpPct), maxHp: HEROES[id].hp, upgrades: {} }));
const strat = JSON.parse(JSON.stringify(AI_PRESETS));
const ultAuto = process.argv.includes('--ult');
for (const k in strat) strat[k].ult.auto = ultAuto;
const rows = [];
for (const type of ['battle', 'elite', 'boss']) for (const st in ENCOUNTERS[type]) ENCOUNTERS[type][st].forEach((waves, i) => {
  let wins = 0, t = 0, hpLeft = 0, deaths = 0; const N = 30;
  for (let s = 0; s < N; s++) {
    COMP = COMPS[s % COMPS.length];
    const sim = BattleSim.runHeadless({ seed: 1000 + s, stage: +st, waves, heroes: party(type === 'boss' ? 0.75 : 0.85), strategy: strat });
    if (sim.outcome === 'win') wins++;
    t += sim.time; deaths += sim.heroes.filter((h) => !h.alive).length;
    hpLeft += sim.heroes.reduce((a, h) => a + h.hp, 0) / sim.heroes.reduce((a, h) => a + h.maxHp, 0);
  }
  rows.push(`${type.padEnd(6)} s${st} #${i}  win ${(wins / N * 100).toFixed(0).padStart(3)}%  time ${(t / N).toFixed(1).padStart(5)}s  hpLeft ${(hpLeft / N * 100).toFixed(0)}%  deaths/fight ${(deaths / N).toFixed(2)}`);
});
console.log(rows.join('\n'));
