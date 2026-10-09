// 두 번째 던전 확인: node tools/dev/mine_shot.mjs
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, dungeon: 1, map: 1, battle: 1, break: 1, charge: 1, crush: 1 }; G.scenes.title.start(9); G.profile.clears = { 0: 1 }; const F = G.scene; F.interact(F.interactables().find((x) => x.key === 'portal')); });
await p.waitForTimeout(300); await p.click('#site-mine'); await p.waitForTimeout(200); await p.screenshot({ path: 'test-output/mine_portal.png' });
await p.click('#portal-yes'); await p.waitForTimeout(800); await p.screenshot({ path: 'test-output/mine_dungeon.png' });
await p.evaluate(() => { const G = window.GAME.Game; G.go('battle', { node: { stage: 2, row: 0, type: 'battle', enc: 1 }, explore: { fieldW: 1440, heroPos: null, enemySpawnX: 900, worldX: 0, theme: 2 } }); });
await p.waitForTimeout(1500); await p.screenshot({ path: 'test-output/mine_battle.png' });
console.log(JSON.stringify(await p.evaluate(() => window.GAME.Game.scene.sim.enemies.map((e) => e.key))), errs); await b.close();
