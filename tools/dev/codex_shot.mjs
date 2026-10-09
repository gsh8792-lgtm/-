// 도감 · 안개 늪 · 연계 확인: node tools/dev/codex_shot.mjs
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, battle: 1, break: 1, charge: 1, crush: 1, hunt: 1 }; G.scenes.title.start(9);
  G.run.party = ['soldam', 'yeon', 'bori']; window.GAME.refreshRunLoadout(G.run);
  G.go('battle', { node: { stage: 2, row: 0, type: 'battle', waves: [['cave_troll', 'goblin', 'goblin']] } }); });
await p.waitForTimeout(900); await p.screenshot({ path: 'test-output/codex_toast.png' });
await p.evaluate(() => { const s = window.GAME.Game.scene.sim, [m, y] = s.heroes, e = s.enemies[0]; s._applyStatus(m, e, { status: 'burn', dur: 5, dps: 0.3 }); s._applyStatus(y, e, { status: 'poison', dur: 8, dps: 0.2 }); });
await p.waitForTimeout(250); await p.screenshot({ path: 'test-output/combo_blast.png' });
await p.evaluate(() => { const G = window.GAME.Game; G.go('field'); window.GAME.Game.profile.codex.ogre_chief = { seen: 1, kills: 2 }; });
await p.waitForTimeout(300); await p.click('#btn-codex'); await p.waitForTimeout(300); await p.screenshot({ path: 'test-output/codex.png' });
await p.click('#codex-close');
await p.evaluate(() => { const G = window.GAME.Game; G.go('hunt', { field: 'swamp' }); }); await p.waitForTimeout(2500); await p.screenshot({ path: 'test-output/hunt_swamp.png' });
await p.evaluate(() => { const G = window.GAME.Game; G.go('field'); G.profile.chars.yeon.lv = 30; window.GAME.openTalents('yeon'); }); await p.waitForTimeout(400); await p.screenshot({ path: 'test-output/talent_head.png' });
console.log('errors', errs); await b.close();
