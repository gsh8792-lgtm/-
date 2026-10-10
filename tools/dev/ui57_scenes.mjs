// v0.57 테마가 다른 화면을 깨지 않는지: node tools/dev/ui57_scenes.mjs → test-output/ui57s_*.png
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(400);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, battle: 1, break: 1, charge: 1, crush: 1, dungeon: 1, map: 1 }; G.scenes.title.start(21); window.GAME.goWorld(0, 'start'); });
await p.waitForTimeout(600); await p.screenshot({ path: 'test-output/ui57s_world.png' });
await p.evaluate(() => { const G = window.GAME; G.openDungeonGate('cave', G.Game.scene); }); await p.waitForTimeout(300); await p.screenshot({ path: 'test-output/ui57s_gate.png' });
await p.click('#portal-yes'); await p.waitForTimeout(600); await p.screenshot({ path: 'test-output/ui57s_dungeon.png' });
await p.evaluate(() => { const G = window.GAME.Game; G.go('battle', { node: { stage: 2, row: 0, type: 'battle', waves: [['orc', 'goblin', 'goblin_archer']] } }); }); await p.waitForTimeout(1500);
await p.screenshot({ path: 'test-output/ui57s_battle.png' });
await p.click('#btn-pause').catch(() => {}); await p.waitForTimeout(300); await p.screenshot({ path: 'test-output/ui57s_pause.png' });
console.log(errs); await b.close();
