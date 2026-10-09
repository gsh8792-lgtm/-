import { chromium } from 'playwright';
import path from 'path';
const URL = 'file://' + path.resolve('dist/forest_expedition.html');
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(URL); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, map: 1, battle: 1, charge: 1, break: 1, explore: 1, crush: 1 }; G.scenes.title.start(4242); G.go('map'); });
await p.click('.map-node.reachable >> nth=0'); await p.click('#btn-node-go'); await p.waitForTimeout(2500);
await p.screenshot({ path: 'test-output/ex_walk.png' });
await p.evaluate(() => { window.GAME.Game.debug.simMult = 8; });
const sc = async () => p.evaluate(() => window.GAME.Game.sceneName);
const seen = [];
for (let i = 0; i < 400; i++) {
  const s = await sc(); if (seen[seen.length - 1] !== s) seen.push(s);
  if (s === 'map' || s === 'result') break;
  const fork = await p.evaluate(() => { const S = window.GAME.Game.scene, r = window.GAME.Game.run.room; return !!(r && r.chosen < 0 && r.x >= r.forkX - 180 && S.doorPick == null && S.forkSeen); });
  if (fork) { await p.waitForTimeout(300); await p.screenshot({ path: 'test-output/ex_fork.png' }); await p.click('#btn-walk'); await p.waitForTimeout(500); await p.screenshot({ path: 'test-output/ex_fork_walk.png' }); continue; }
  if (s === 'explore' && await p.locator('#ex-go').isVisible().catch(() => false)) { await p.screenshot({ path: 'test-output/ex_poi.png' }); await p.click('#ex-go'); continue; }
  if (s === 'reward') { if (await p.locator('#reward-0').count()) { await p.click('#reward-0'); await p.click('#btn-reward-confirm'); } else await p.click('#btn-continue'); continue; }
  if (['event', 'shop', 'rest', 'tree'].includes(s)) { await p.screenshot({ path: `test-output/ex_${s}.png` }); const c = p.locator('#btn-continue, #tree-leave'); if (s === 'event') { const n = p.locator('.event-choices .btn:not([disabled])'); if (await n.count()) await n.first().click(); } await c.first().click(); continue; }
  if (await p.locator('#hint-ok').count()) await p.click('#hint-ok');
  await p.waitForTimeout(150);
}
console.log('flow', seen.join(' > '));
console.log('errors', errs);
await b.close();
