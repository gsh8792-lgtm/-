import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, battle: 1, dungeon: 1, break: 1, charge: 1, crush: 1 }; G.scenes.title.start(4242); for (const k in G.run.strategy) { G.run.strategy[k].s2.auto = true; G.run.strategy[k].ult.auto = true; } window.enterDungeonTest = true; });
await p.evaluate(() => { const G = window.GAME.Game; G.run.autoMode = false; window.GAME.enterDungeon(G.run); });
await p.waitForTimeout(800); await p.screenshot({ path: 'test-output/dg_start.png' });
// 수동: 지도에서 이웃 방 탭
const tap = await p.evaluate(() => { const fl = window.GAME.Game.run.dungeon; const n = window.GAME.floorNeighbors(fl, 0)[0].room; const B = { x: 600, y: 112, cw: 64, ch: 46 }; return { x: B.x + 6 + n.gx * B.cw + B.cw / 2, y: B.y + 24 + n.gy * B.ch + B.ch / 2 }; });
const box = await p.locator('#cv').boundingBox(); const s = box.width / 960;
await p.mouse.click(box.x + tap.x * s, box.y + tap.y * s); await p.waitForTimeout(600);
// ▶ 누르고 있기
await p.locator('#btn-fwd').hover(); await p.mouse.down(); await p.waitForTimeout(1500); await p.screenshot({ path: 'test-output/dg_corridor.png' }); await p.mouse.up();
console.log('manual x', await p.evaluate(() => Math.round(window.GAME.Game.run.dungeon.at.x)));
// 자동 + 배속으로 진행
await p.evaluate(() => { const G = window.GAME.Game; G.run.autoMode = true; G.debug.simMult = 8; });
const seen = []; let shots = 0;
for (let i = 0; i < 900; i++) {
  const sc = await p.evaluate(() => window.GAME.Game.sceneName); if (seen[seen.length - 1] !== sc) seen.push(sc);
  if (sc === 'result') break;
  if (sc === 'battle' && shots < 1) { await p.waitForTimeout(400); await p.screenshot({ path: 'test-output/dg_battle.png' }); shots++; }
  if (sc === 'reward') { if (await p.locator('#reward-0').count()) { await p.click('#reward-0'); await p.click('#btn-reward-confirm'); } else await p.click('#btn-continue'); continue; }
  if (sc === 'rest') { await p.locator('#btn-continue').click(); continue; }
  if (await p.locator('#hint-ok').count()) await p.click('#hint-ok');
  const fl = await p.evaluate(() => { const d = window.GAME.Game.run.dungeon; return d ? d.floor : 0; });
  if (fl >= 2 && shots < 2) { await p.waitForTimeout(300); await p.screenshot({ path: 'test-output/dg_floor2.png' }); shots = 2; }
  await p.waitForTimeout(200);
}
console.log('flow', seen.join('>').slice(0, 400));
console.log('state', await p.evaluate(() => { const r = window.GAME.Game.run; return JSON.stringify({ floor: r.dungeon && r.dungeon.floor, result: r.result, battles: r.stats.battles, dead: Object.values(r.heroes).filter((h) => h.dead).length }); }));
console.log('errors', errs); await b.close();
