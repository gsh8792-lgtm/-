// 그림자 왕 확인: node tools/dev/boss5_shot.mjs [html]
import { chromium } from 'playwright';
import path from 'path';
const file = process.argv[2] || path.resolve('dist/forest_expedition.html');
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + file); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, battle: 1, break: 1, charge: 1, crush: 1 }; G.scenes.title.start(9); G.profile.codex = { shadow_king: { seen: 1, kills: 0 }, goblin_archer: { seen: 1, kills: 0 }, goblin: { seen: 1, kills: 0 } };
  G.run.party = ['tobi', 'yeon', 'bori']; window.GAME.refreshRunLoadout(G.run);
  G.go('battle', { node: { stage: 5, row: 0, type: 'boss', waves: [['shadow_king', 'goblin_archer', 'goblin']] } }); });
await p.waitForTimeout(2600); await p.screenshot({ path: 'test-output/boss5.png' });
await p.evaluate(() => { const s = window.GAME.Game.scene.sim; s.enemies[0].skillCd = 0; });
await p.waitForTimeout(600); await p.screenshot({ path: 'test-output/boss5_step.png' });
await p.evaluate(() => { const s = window.GAME.Game.scene.sim; const b = s.enemies[0]; b.hp = b.maxHp * 0.59; });
await p.waitForTimeout(1500); await p.screenshot({ path: 'test-output/boss5_wipe.png' });
console.log(errs); await b.close();
