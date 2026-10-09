// 보상 화면 전투 기록 확인: node tools/dev/meter_shot.mjs
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, battle: 1, break: 1, charge: 1, crush: 1 }; G.scenes.title.start(9); G.debug.simMult = 16;
  G.go('battle', { node: { stage: 2, row: 0, type: 'battle', waves: [['orc', 'goblin', 'goblin_archer']] } }); });
await p.waitForFunction(() => window.GAME.Game.sceneName === 'reward', null, { timeout: 60000 });
await p.waitForTimeout(400); await p.screenshot({ path: 'test-output/reward_meter.png' });
console.log(errs); await b.close();
