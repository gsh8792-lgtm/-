// 원정 맹세 확인: node tools/dev/oath_shot.mjs
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, dungeon: 1 }; G.scenes.title.start(9); const F = G.scene; F.interact(F.interactables().find((x) => x.key === 'portal')); });
await p.waitForTimeout(300); await p.click('#oath-iron'); await p.click('#oath-hunt'); await p.waitForTimeout(200);
await p.screenshot({ path: 'test-output/oath_portal.png' });
await p.click('#portal-yes'); await p.waitForTimeout(400);
console.log(JSON.stringify(await p.evaluate(() => ({ s: window.GAME.Game.sceneName, o: window.GAME.Game.run.oaths }))), errs); await b.close();
