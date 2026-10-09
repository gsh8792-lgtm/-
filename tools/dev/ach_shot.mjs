// 업적 확인: node tools/dev/ach_shot.mjs
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, battle: 1, break: 1, charge: 1, crush: 1 }; G.scenes.title.start(9);
  G.run.party = ['tobi', 'yeon', 'bori']; window.GAME.refreshRunLoadout(G.run); G.run.oaths = ['iron', 'fury', 'hunt'];
  G.go('battle', { node: { stage: 5, row: 0, type: 'boss', waves: [['shadow_king']] } }); });
await p.waitForTimeout(1500);
await p.evaluate(() => { const s = window.GAME.Game.scene.sim; s.enemies[0].hp = 1; s._damage(s.heroes[0], s.enemies[0], 999, { trueDmg: true }); });
await p.waitForFunction(() => window.GAME.Game.sceneName === 'result', null, { timeout: 15000 });
await p.waitForTimeout(500); await p.screenshot({ path: 'test-output/ach_result.png' });
await p.evaluate(() => { const G = window.GAME.Game; G.go('field'); }); await p.waitForTimeout(300); await p.click('#btn-codex'); await p.waitForTimeout(200); await p.click('#codex-ach'); await p.waitForTimeout(300);
await p.screenshot({ path: 'test-output/ach_list.png' });
console.log(JSON.stringify(await p.evaluate(() => window.GAME.Game.profile.ach)), errs); await b.close();
