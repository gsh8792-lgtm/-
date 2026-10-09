// 보스 전멸기 화면 확인: node tools/dev/wipe_shot.mjs
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
for (const boss of ['ogre_chief', 'thorn_queen', 'mist_stag', 'swamp_turtle']) {
  await p.evaluate((boss) => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, map: 1, battle: 1, explore: 1, break: 1, charge: 1, crush: 1 }; G.scenes.title.start(9);
    G.go('battle', { node: { stage: 5, row: 0, type: 'boss', waves: [[boss]] } }); }, boss);
  await p.waitForTimeout(2500);
  await p.evaluate(() => { const s = window.GAME.Game.scene.sim, e = s.enemies[0]; e.hp = e.maxHp * 0.58; e.skillCd = 0; });
  await p.waitForTimeout(2200); await p.screenshot({ path: `test-output/wipe_${boss}.png` });
}
console.log('errors', errs); await b.close();
