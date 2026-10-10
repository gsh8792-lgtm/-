// 필드 지역·웨이포인트 확인: node tools/dev/world_shot.mjs → test-output/world_*.png
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, battle: 1, break: 1, charge: 1, crush: 1, dungeon: 1, map: 1 }; G.scenes.title.start(21); });
await p.waitForTimeout(400);
await p.evaluate(() => { const F = window.GAME.Game.scene; F.interact(F.interactables().find((x) => x.key === 'portal')); }); await p.waitForTimeout(300);
await p.screenshot({ path: 'test-output/world_waypoints.png' });
await p.click('#wp-walk'); await p.waitForTimeout(800); await p.screenshot({ path: 'test-output/world_outskirts.png' });
// 무리 하나에 닿기 → 전투 → 승리 처리 후 복귀
const pk = await p.evaluate(() => { const S = window.GAME.Game.scene; const k = S.packs[0]; S.leader.x = k.x - 30; S.leader.y = k.y; return k.id; });
await p.waitForTimeout(700); const sc1 = await p.evaluate(() => window.GAME.Game.sceneName); await p.screenshot({ path: 'test-output/world_fight.png' });
await p.evaluate(() => { const S = window.GAME.Game.scene; for (const e of S.sim.enemies) { e.hp = 0; e.alive = false; } }); await p.waitForTimeout(2500);
const back = await p.evaluate(() => ({ scene: window.GAME.Game.sceneName, cleared: window.GAME.Game.run.world && window.GAME.Game.run.world.cleared }));
await p.click('#btn-gate').catch(() => {}); await p.waitForTimeout(6000);
await p.screenshot({ path: 'test-output/world_gate.png' });
const gate = await p.locator('#portal-yes').count();
for (const zi of [1, 2, 3]) { await p.evaluate((zi) => { window.GAME.Game.closeModal(); window.GAME.goWorld(zi, 'waypoint'); }, zi); await p.waitForTimeout(700); await p.screenshot({ path: `test-output/world_zone${zi}.png` }); }
console.log(JSON.stringify({ pk, sc1, back, gate }), errs); await b.close();
