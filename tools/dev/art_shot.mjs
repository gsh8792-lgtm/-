// 일러스트 적용 확인: node tools/dev/art_shot.mjs → test-output/art_*.png
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(400);
await p.evaluate(() => { const G = window.GAME.Game, P = G.profile; for (const id of ['soldam', 'leon', 'danbi', 'daon', 'seori', 'kai']) { P.chars[id] = P.chars[id] || window.GAME.GACHA.newChar(); }
  G.settings.seenHints = { field: 1, battle: 1, break: 1, charge: 1, crush: 1, dungeon: 1, map: 1 }; G.scenes.title.start(8); G.run.party = ['tobi', 'danbi', 'soldam']; G.scene.rebuildParty(); });
await p.waitForTimeout(900); await p.screenshot({ path: 'test-output/art_village.png' });
await p.evaluate(() => { const G = window.GAME.Game; window.GAME.refreshRunLoadout(G.run); window.GAME.enterDungeon(G.run); }); await p.waitForTimeout(900); await p.screenshot({ path: 'test-output/art_dungeon.png' });
await p.evaluate(() => { const G = window.GAME.Game; G.go('battle', { node: { stage: 2, row: 0, type: 'battle', waves: [['orc', 'goblin', 'goblin_archer']] }, explore: { fieldW: 1440, heroPos: [{ x: 400, y: 342 }, { x: 354, y: 372 }, { x: 308, y: 402 }], enemySpawnX: 850, worldX: 0, theme: 1 } }); });
await p.waitForTimeout(3200); await p.screenshot({ path: 'test-output/art_battle.png' });
await p.evaluate(() => { const G = window.GAME.Game; G.run.dungeon = null; G.go('field'); }); await p.waitForTimeout(300);
await p.click('#btn-roster'); await p.click('#rc-soldam'); await p.waitForTimeout(400); await p.screenshot({ path: 'test-output/art_roster.png' });
console.log(errs); await b.close();
