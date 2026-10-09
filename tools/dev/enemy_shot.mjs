import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, map: 1, battle: 1, explore: 1, break: 1, charge: 1, crush: 1 }; G.scenes.title.start(9);
  G.go('battle', { node: { stage: 3, row: 0, type: 'elite', affix: 'iron', waves: [['orc_shield', 'goblin_archer', 'goblin_shaman', 'goblin_bomber', 'orc_captain']] } }); });
await p.waitForTimeout(3500); await p.screenshot({ path: 'test-output/new_enemies.png' });
console.log('errors', errs); await b.close();
