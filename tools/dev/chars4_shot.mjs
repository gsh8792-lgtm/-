// 새 캐릭터 4명 확인: node tools/dev/chars4_shot.mjs
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
for (const party of [['hwa', 'dal', 'narae'], ['eun', 'yeon', 'narae']]) {
  await p.evaluate((pt) => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, battle: 1, break: 1, charge: 1, crush: 1 }; if (G.sceneName === 'title') G.scenes.title.start(9);
    for (const id of pt) G.profile.chars[id] = G.profile.chars[id] || window.GAME.GACHA.newChar();
    G.run.party = pt; window.GAME.refreshRunLoadout(G.run);
    G.go('battle', { node: { stage: 3, row: 0, type: 'battle', waves: [['orc', 'goblin', 'goblin', 'goblin_archer']] } }); }, party);
  await p.waitForTimeout(2600);
  for (let i = 0; i < 3; i++) {
    await p.evaluate((i) => { const S = window.GAME.Game.scene, h = S.sim.heroes[i]; h.ult = 100; S.sim.cast(h, 'ult', S.sim.resolveTarget(h, 'ult')); }, i);
    await p.waitForTimeout(1400); await p.screenshot({ path: `test-output/char4_${party[i]}.png` });
  }
}
await p.evaluate(() => { const G = window.GAME.Game; G.go('field'); window.GAME.openRoster({}); }); await p.waitForTimeout(400); await p.screenshot({ path: 'test-output/char4_roster.png' });
console.log(errs); await b.close();
