// v0.53 장비 다양화 확인: node tools/dev/gear53_shot.mjs → test-output/gear53_*.png
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, battle: 1, break: 1, charge: 1, crush: 1 }; G.scenes.title.start(9); G.profile.gold = 9999; });
await p.waitForTimeout(500);
await p.evaluate(() => window.GAME.openRoster({ id: 'mujin' })); await p.waitForTimeout(400); await p.screenshot({ path: 'test-output/gear53_roster_mujin.png' });
await p.evaluate(() => window.GAME.openRoster({ id: 'myoyeon' })); await p.waitForTimeout(400); await p.screenshot({ path: 'test-output/gear53_roster_myoyeon.png' });
await p.evaluate(() => window.GAME.openTalents('daon')); await p.waitForTimeout(400); await p.screenshot({ path: 'test-output/gear53_talent_daon.png' });
await p.evaluate(() => window.GAME.openMerchant(null, 'gear')); await p.waitForTimeout(400); await p.screenshot({ path: 'test-output/gear53_merchant.png' });
console.log(errs); await b.close();
