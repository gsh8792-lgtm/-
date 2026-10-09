// 호기심 물건 확인: node tools/dev/curio_shot.mjs
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, dungeon: 1, map: 1 }; G.scenes.title.start(9); G.run.party = ['tobi', 'yeon', 'bori']; window.GAME.refreshRunLoadout(G.run); G.run.autoMode = false; window.GAME.enterDungeon(G.run); });
await p.waitForTimeout(500);
const out = [];
for (const k of ['idol', 'cache', 'stele']) {
  await p.evaluate((k) => { const S = window.GAME.Game.scene; S.openCurio({ id: 0 }, { x: 500, it: { id: 7, curio: k } }); }, k);
  await p.waitForTimeout(250); await p.screenshot({ path: `test-output/curio_${k}.png` });
  await p.click('#curio-0'); await p.waitForTimeout(150);
  out.push(await p.evaluate(() => ({ pot: window.GAME.Game.run.potions, camp: window.GAME.Game.run.camp, amb: window.GAME.Game.run.ambushNext, fruit: window.GAME.Game.run.fruit })));
}
console.log(JSON.stringify(out), errs); await b.close();
