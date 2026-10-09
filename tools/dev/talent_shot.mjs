// 특성 트리 창: node tools/dev/talent_shot.mjs
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1 }; G.scenes.title.start(9); G.profile.chars.elin.lv = 25; window.GAME.openRoster({ id: 'elin' }); });
await p.waitForTimeout(300); await p.click('#btn-talent'); await p.waitForTimeout(200);
for (let i = 0; i < 5; i++) await p.click('#tn-t_thorn');
for (let i = 0; i < 5; i++) await p.click('#tn-t_counter');
for (let i = 0; i < 5; i++) await p.click('#tn-t_atk');
for (let i = 0; i < 3; i++) await p.click('#tn-t_s2');
await p.click('#tn-t_cap2');
await p.screenshot({ path: 'test-output/talents.png' });
const m = await p.evaluate(() => { const lo = window.GAME.EQ.heroLoadout(window.GAME.Game.profile, 'elin'); return { thorns: lo.mods.thorns, counter: lo.mods.counter, atk_pct: lo.mods.atk_pct, thornsAll: lo.mods.thornsAll }; });
console.log(JSON.stringify(m)); console.log('errors', errs); await b.close();
