// 사냥터 방치 효율 측정: node tools/hunt_sim.cjs [분=30] [캐릭터 레벨=1,5,10] [필드=meadow]
// 파티(토비·단비·보리, 장비 없음 — env GEAR=R ENH=5 로 무기·갑옷 지급)를 자동 사냥으로 돌려 분당 처치·경험치·골드·장신구·전멸을 잰다.
const fs = require('fs'), vm = require('vm');
const code = ['00_util.js', '01_data.js', '01b_equip_db.js', '01c_characters.js', '01d_gear_skills.js', '04b_equip.js', '04c_gacha.js', '05c_hunt.js'].map((f) => fs.readFileSync(__dirname + '/../src/js/' + f, 'utf8')).join('\n');
const ctx = { console, safeStorageGet: () => null, safeStorageSet: () => {} }; vm.createContext(ctx);
vm.runInContext(code + '\nthis.X={HuntSim,HUNT_FIELDS,huntHeroFrom,huntGradeTable,EQ,GACHA,CHAR_LV};', ctx);
const { HuntSim, HUNT_FIELDS, huntHeroFrom, huntGradeTable, EQ, GACHA, CHAR_LV } = ctx.X;
const MIN = +(process.argv[2] || 30), LVS = (process.argv[3] || '1,5,10').split(',').map(Number), F = HUNT_FIELDS[process.argv[4] || 'meadow'];
console.log(`${F.name} Lv ${F.level} · 장신구 등급표: ` + huntGradeTable(F.level, false).map(([g, p]) => `${g} ${(p * 100).toPrecision(2)}%`).join(' · '));
for (const lv of LVS) {
  const p = GACHA.ensure(EQ.newProfile());
  for (const id in p.chars) p.chars[id].lv = lv;
  if (process.env.GEAR) for (const id of ['tobi', 'danbi', 'bori']) for (const slot of ['weapon', 'armor']) { // GEAR=R: 무기·갑옷 지급 (강화 ENH)
    const base = EQ.DB.items.find((it) => it.cls === EQ.heroClass(id) && it.slot === slot && it.line === 1); const it = EQ.rollItem(() => 0.5, p, { base: base.id, grade: process.env.GEAR }); it.enh = +(process.env.ENH || 0); p.inv.push(it); p.equip[id][slot] = it.uid; }
  const sim = new HuntSim({ field: F, seed: 7 + lv, heroes: ['tobi', 'danbi', 'bori'].map((id) => huntHeroFrom(p, id)) });
  for (let i = 0; i < MIN * 60 * 20; i++) { sim.step(1 / 20); sim.events.length = 0; }
  const s = sim.stats, k = s.kills, tot = k.trash + k.normal + k.elite;
  const lvUp = (() => { let L = lv, e = s.exp; while (e >= CHAR_LV.expNext(L)) { e -= CHAR_LV.expNext(L); L++; } return L; })();
  const g = {}; for (const d of s.drops) g[d.grade] = (g[d.grade] || 0) + 1;
  console.log(`캐릭터 Lv ${String(lv).padStart(2)} · ${MIN}분: 처치 ${tot} (잡몹 ${k.trash} · 일반 ${k.normal} · 정예 ${k.elite}) = 분당 ${(tot / MIN).toFixed(1)} · 경험치 분당 ${(s.exp / MIN).toFixed(1)} (Lv ${lv}→${lvUp}) · 골드 분당 ${(s.gold / MIN).toFixed(0)} · 강화석 ${s.stones} · 장신구 ${s.drops.length} ${JSON.stringify(g)} · 전멸 ${s.wipes}`);
}
