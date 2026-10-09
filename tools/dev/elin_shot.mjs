// 반격의 기사 엘린 확인: node tools/dev/elin_shot.mjs
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, battle: 1, break: 1, charge: 1, crush: 1 }; G.scenes.title.start(9);
  G.run.party = ['elin', 'danbi', 'bori']; window.GAME.refreshRunLoadout(G.run);
  G.go('battle', { node: { stage: 2, row: 0, type: 'battle', waves: [['orc', 'goblin', 'goblin', 'orc_shield']] } }); });
await p.waitForTimeout(2500); await p.screenshot({ path: 'test-output/elin_battle.png' });
await p.evaluate(() => { const S = window.GAME.Game.scene, h = S.sim.heroes[0]; h.ult = 100; S.sim.cast(h, 'ult', {}); });
await p.waitForTimeout(600); await p.screenshot({ path: 'test-output/elin_ult.png' });
await p.waitForTimeout(6000);
const st = await p.evaluate(() => { const s = window.GAME.Game.scene.sim; return { t: Math.round(s.time), out: s.outcome, hp: s.heroes.map((h) => h.key + ':' + Math.round(h.hp)) }; });
console.log(JSON.stringify(st));
await p.evaluate(() => { const G = window.GAME.Game; G.go('field'); window.GAME.openRoster({}); }); await p.waitForTimeout(500); await p.screenshot({ path: 'test-output/elin_roster.png' });
console.log('errors', errs); await b.close();
