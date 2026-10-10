// 엘린 대기·달리기 확인: node tools/dev/elin_move_shot.mjs
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, battle: 1, break: 1, charge: 1, crush: 1, dungeon: 1, map: 1 }; G.scenes.title.start(9);
  G.run.party = ['elin', 'danbi', 'bori']; window.GAME.refreshRunLoadout(G.run); G.rebuildParty && G.rebuildParty(); G.scene.rebuildParty && G.scene.rebuildParty(); });
await p.waitForTimeout(600); await p.screenshot({ path: 'test-output/elin_field.png' });
await p.evaluate(() => { const G = window.GAME.Game; G.go('battle', { node: { stage: 2, row: 0, type: 'battle', waves: [['orc', 'goblin']] } }); });
await p.waitForTimeout(900); await p.screenshot({ path: 'test-output/elin_run.png' });
await p.waitForTimeout(2600); await p.screenshot({ path: 'test-output/elin_fight.png' });
for (let i = 0; i < 6; i++) { await p.waitForTimeout(170); await p.screenshot({ path: `test-output/elin_fight_${i}.png`, clip: { x: 200, y: 200, width: 700, height: 420 } }); }
console.log(errs); await b.close();
