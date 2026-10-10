// 던전 시야 1.2배 확인: node tools/dev/zoom_shot.mjs → test-output/zoom_*.png
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(400);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, battle: 1, break: 1, charge: 1, crush: 1, dungeon: 1, map: 1 }; G.scenes.title.start(8); window.GAME.enterDungeon(G.run); });
await p.waitForTimeout(800); await p.screenshot({ path: 'test-output/zoom_room.png' });
const tap = await p.evaluate(() => { const fl = window.GAME.Game.run.dungeon; const n = window.GAME.floorNeighbors(fl, 0)[0].room; return { x: 600 + 6 + n.gx * 64 + 32, y: 112 + 24 + n.gy * 46 + 23 }; });
await p.mouse.click(tap.x * 1280 / 960, tap.y * 720 / 540); await p.waitForTimeout(1500); await p.screenshot({ path: 'test-output/zoom_corridor.png' });
await p.evaluate(() => { const G = window.GAME.Game; G.go('battle', { node: { stage: 2, row: 0, type: 'battle', waves: [['orc', 'goblin', 'goblin_archer']] }, explore: { fieldW: 1440, heroPos: [{ x: 400, y: 342 }, { x: 354, y: 372 }, { x: 308, y: 402 }], enemySpawnX: 850, worldX: 0, theme: 1 } }); });
await p.waitForTimeout(2500); await p.screenshot({ path: 'test-output/zoom_battle.png' });
console.log(errs, await p.evaluate(() => ({ cam: window.GAME.Game.scene.camX, z: window.GAME.Game.scene.zoom })));
await b.close();
