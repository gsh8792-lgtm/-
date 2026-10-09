// 3D 에셋(보리) 비교 화면: node tools/dev/q3d_shot.mjs
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
for (const on of [false, true]) {
  await p.evaluate((on) => { const G = window.GAME.Game; G.settings.q3d = on; G.settings.seenHints = { field: 1, map: 1, battle: 1, explore: 1, dungeon: 1, break: 1, charge: 1, crush: 1 }; G.scenes.title.start(9);
    G.go('battle', { node: { stage: 1, row: 0, type: 'battle', waves: [['goblin', 'goblin_archer', 'orc']] } }); }, on);
  await p.waitForTimeout(2600); await p.screenshot({ path: `test-output/q3d_battle_${on ? 'on' : 'off'}.png` });
}
await p.evaluate(() => { const G = window.GAME.Game; G.scenes.title.start(9); G.run.autoMode = false; window.GAME.enterDungeon(G.run); });
await p.waitForTimeout(800); await p.screenshot({ path: 'test-output/q3d_dungeon_on.png' });
console.log('errors', errs); await b.close();
