// 전술 정지 + 후열 사냥꾼 화면: node tools/dev/tac_shot.mjs
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, battle: 1, break: 1, charge: 1, crush: 1 }; G.scenes.title.start(9);
  G.go('battle', { node: { stage: 2, row: 0, type: 'battle', waves: [['orc_shield', 'goblin_stalker', 'orc_hunter', 'goblin_shaman']] } }); });
await p.waitForTimeout(4500);
await p.click('#btn-tac'); await p.waitForTimeout(300);
await p.screenshot({ path: 'test-output/tac_pause.png' });
const t0 = await p.evaluate(() => window.GAME.Game.scene.sim.time); await p.waitForTimeout(1000); const t1 = await p.evaluate(() => window.GAME.Game.scene.sim.time);
console.log('paused time frozen:', t0 === t1);
console.log('errors', errs); await b.close();
