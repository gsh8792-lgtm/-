// 보스 비교 측정: node tools/boss_compare.cjs [시드 수=12]
// env PARTIES=tobi+danbi+bori;... BOSS=mist_stag 로 좁힐 수 있다.
// 6층(던전 배율 포함) 보스 5종을 Lv 5 · UC 무기/갑옷 파티로 '잘하는 플레이(smartAuto)'와 '자동'으로 싸워 승률·시간·사망을 잰다.
const fs = require('fs'), vm = require('vm');
const code = ['00_util.js', '01_data.js', '01b_equip_db.js', '01c_characters.js', '01d_gear_skills.js', '01e_talents.js', '01g_patterns.js', '04b_equip.js', '04c_gacha.js', '05b_dungeon.js', '05e_sites.js', '06_battle_sim.js'].map((f) => fs.readFileSync(__dirname + '/../src/js/' + f, 'utf8')).join('\n');
const ctx = { console, safeStorageGet: () => null, safeStorageSet: () => {} }; vm.createContext(ctx);
vm.runInContext(code + '\nthis.X={BattleSim,ENCOUNTERS,AI_PRESETS,EQ,GACHA,DUNGEON,makeRng,DUNGEON_SITES};', ctx);
const { BattleSim, ENCOUNTERS, AI_PRESETS, EQ, GACHA, DUNGEON, makeRng, DUNGEON_SITES } = ctx.X;
const SITE = process.env.SITE ? DUNGEON_SITES[process.env.SITE] : null; // SITE=cave|mine|crypt|abyss: 그 던전의 보스 풀 · 배율
const LV = +(process.env.LV || 5), GRADE = process.env.GRADE || 'UC'; // 캐릭터 레벨 · 무기/갑옷 등급
const N = +(process.argv[2] || 12);
const PARTIES = process.env.PARTIES ? process.env.PARTIES.split(';').map((x) => x.split('+')) : [['tobi', 'danbi', 'bori'], ['tobi', 'yeon', 'bori'], ['tobi', 'soldam', 'bori'], ['tobi', 'byeolbi', 'bori']];
const ONLY = process.env.BOSS || '';
const p = GACHA.ensure(EQ.newProfile()); for (const id in p.chars) p.chars[id].lv = LV; if (process.env.PET) for (const id in p.chars) p.chars[id].pet = process.env.PET;
for (const id of [...new Set(PARTIES.flat())]) for (const slot of ['weapon', 'armor']) { const base = EQ.DB.items.find((it) => it.cls === EQ.heroClass(id) && it.slot === slot && it.line === 1); const it = EQ.rollItem(makeRng(1), p, { base: base.id, grade: GRADE }); p.inv.push(it); p.equip[id][slot] = it.uid; }
if (process.env.FULL) for (const id of [...new Set(PARTIES.flat())]) for (const slot of ['medal', 'ring', 'necklace', 'belt']) { const base = EQ.DB.items.find((it) => (it.cls === EQ.heroClass(id) || it.cls === 'common') && it.slot === slot); const it = EQ.rollItem(makeRng(2), p, { base: base.id, grade: GRADE }); it.enh = Math.min(10, EQ.enhanceCap(it)); p.inv.push(it); p.equip[id][slot] = it.uid; } // FULL=1: 장신구·메달까지 같은 등급 +10
const st = JSON.parse(JSON.stringify(AI_PRESETS)); for (const k in st) { st[k].s2.auto = true; st[k].ult.auto = true; st[k].ult.cond = 'auto'; }
const f = 1 + DUNGEON.FLOOR_SCALE * 5;
const POOL = SITE ? SITE.enc.boss[5] : ENCOUNTERS.boss[5].concat(ONLY && !ENCOUNTERS.boss[5].some((w) => w[0][0] === ONLY) ? [[[ONLY]]] : []); // 광산 전용 보스는 BOSS=로
const MS = SITE ? SITE.scale : process.env.MINE ? { hp: 1.25, atk: 1.15 } : { hp: 1, atk: 1 }; // MINE=1: 예전 광산 배율
for (const waves of POOL) {
  if (ONLY && waves[0][0] !== ONLY) continue;
  for (const smart of [true, false]) {
    let win = 0, t = 0, dead = 0;
    for (let s = 0; s < N; s++) {
      const party = PARTIES[s % PARTIES.length];
      const heroes = party.map((id) => { const lo = EQ.heroLoadout(p, id); return { id, hp: Math.round(lo.maxHp * 0.85), maxHp: lo.maxHp, mods: lo.mods, skills: lo.skills, skillRank: lo.skillRank, upgrades: {}, ultDef: null, pet: GACHA.petFor(p, id) }; });
      const sim = new BattleSim({ seed: 500 + s, stage: 5, waves, heroes, strategy: st, autoMode: true, smartAuto: smart, partySize: 3, tier: { hp: f * MS.hp, atk: f * MS.atk } });
      let guard = 0; while (!sim.outcome && guard++ < 60 * 400) sim.step(1 / 60);
      if (sim.outcome === 'win') win++; t += sim.time; dead += sim.heroes.filter((h) => !h.alive).length;
      if (process.env.VERBOSE) console.log('   ', party.join('+'), sim.outcome, Math.round(sim.time) + 's', 'boss', Math.round(sim.enemies[0].hp / sim.enemies[0].maxHp * 100) + '%', sim.heroes.map((h) => h.key + ':' + Math.round(h.hp)).join(' '));
    }
    console.log(`${waves[0][0].padEnd(13)} ${smart ? '잘함' : '자동'}  승리 ${win}/${N} · 평균 ${(t / N).toFixed(0)}초 · 사망 ${(dead / N).toFixed(1)}`);
  }
}
