// 3D 배경·소품 확인: node tools/dev/env3d_shot.mjs → test-output/env3d_*.png
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, battle: 1, dungeon: 1, break: 1, charge: 1, crush: 1, map: 1 }; G.scenes.title.start(21); });
await p.waitForTimeout(800);
for (const [k, x, y] of [['village', 660, 600], ['village2', 400, 420], ['village3', 1100, 500]]) { await p.evaluate(([x, y]) => { const S = window.GAME.Game.scene; S.leader.x = x; S.leader.y = y; }, [x, y]); await p.waitForTimeout(600); await p.screenshot({ path: `test-output/env3d_${k}.png` }); }
for (const zi of [0, 1, 2, 3]) { await p.evaluate((zi) => { window.GAME.goWorld(zi, 'waypoint'); }, zi); await p.waitForTimeout(700); await p.screenshot({ path: `test-output/env3d_world${zi}.png` }); }
await p.evaluate(() => { const S = window.GAME.Game.scene; S.leader.x = S.gate.x - 100; S.leader.y = S.gate.y + 60; }); await p.waitForTimeout(600); await p.screenshot({ path: 'test-output/env3d_gate.png' });
await p.evaluate(() => { const S = window.GAME.Game.scene; const pt = S.posts[0]; S.leader.x = pt.x - 200; S.leader.y = pt.y + 80; }); await p.waitForTimeout(600); await p.screenshot({ path: 'test-output/env3d_post.png' });
for (const site of ['cave', 'mine', 'crypt', 'abyss']) {
  await p.evaluate((site) => { const G = window.GAME.Game; G.run.site = site; G.run.autoMode = false; window.GAME.enterDungeon(G.run); }, site);
  await p.waitForTimeout(700);
  await p.waitForTimeout(500); await p.screenshot({ path: `test-output/env3d_dg_${site}.png` });
}
console.log('errors', errs); await b.close();
