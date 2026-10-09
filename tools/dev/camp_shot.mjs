// 야영 활동 확인: node tools/dev/camp_shot.mjs
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, battle: 1, break: 1, charge: 1, crush: 1 }; G.scenes.title.start(9); G.run.heroes.tobi.injured = 1; window.GAME.refreshRunLoadout(G.run); G.go('rest', {}); });
await p.waitForTimeout(300); await p.click('#rest-food'); await p.click('#camp-guard'); await p.click('#camp-tend'); await p.waitForTimeout(200);
await p.screenshot({ path: 'test-output/camp.png' });
await p.evaluate(() => { const G = window.GAME.Game; G.run.camp.ult = 35; G.go('battle', { node: { stage: 2, row: 0, type: 'battle', waves: [['orc', 'goblin']] } }); });
await p.waitForTimeout(400);
console.log(JSON.stringify(await p.evaluate(() => { const s = window.GAME.Game.scene.sim; return { ult: s.heroes.map((h) => Math.round(h.ult)), sh: s.heroes.map((h) => !!h.statuses.shield), inj: window.GAME.Game.run.heroes.tobi.injured, camp: window.GAME.Game.run.camp }; })), errs); await b.close();
