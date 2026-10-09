// 마을 상인 확인: node tools/dev/merchant_shot.mjs
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1 }; G.scenes.title.start(5); G.profile.gold = 1000; const F = G.scene; F.interact(F.interactables().find((i) => i.key === 'merchant')); });
await p.waitForTimeout(400);
await p.click('#mc-buy-potion'); await p.click('#mc-tab-tools'); await p.click('#mc-buy-trapKit'); await p.click('#mc-buy-trapKit');
await p.screenshot({ path: 'test-output/merchant.png' });
await p.click('#mc-tab-gear'); await p.waitForTimeout(200); await p.screenshot({ path: 'test-output/merchant_gear.png' });
await p.click('#mc-tab-potions'); await p.click('#mc-buy-bigPotion'); await p.click('#mc-buy-feather');
await p.click('#mc-close');
const r = await p.evaluate(() => { const r = window.GAME.Game.run; return { potions: r.potions, big: r.bigPotions, feathers: r.feathers, kits: r.trapKits, gold: window.GAME.Game.profile.gold }; });
console.log(JSON.stringify(r));
// 상인 노점 화면
await p.evaluate(() => { const F = window.GAME.Game.scene; F.leader.x = 600; F.leader.y = 780; F.trail.forEach((q) => { q.x = 600; q.y = 780; }); });
await p.waitForTimeout(2500); await p.screenshot({ path: 'test-output/merchant_stall.png' });
console.log('errors', errs); await b.close();
