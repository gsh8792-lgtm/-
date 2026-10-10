// 새 직업 3종 확인: node tools/dev/newclass_shot.mjs
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
for (const party of [['mujin', 'daon', 'myoyeon'], ['soha', 'risha', 'bella'], ['baekun', 'kali', 'kamu']]) {
  await p.evaluate((pt) => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, battle: 1, break: 1, charge: 1, crush: 1 }; if (G.sceneName === 'title') G.scenes.title.start(9);
    for (const id of pt) G.profile.chars[id] = G.profile.chars[id] || window.GAME.GACHA.newChar();
    G.run.party = pt; window.GAME.refreshRunLoadout(G.run);
    G.go('battle', { node: { stage: 3, row: 0, type: 'battle', waves: [['orc', 'goblin', 'goblin', 'goblin_archer']] } }); }, party);
  await p.waitForTimeout(2600); await p.screenshot({ path: `test-output/cls3_fight_${party[0]}.png` });
  for (let i = 0; i < 3; i++) {
    await p.evaluate((i) => { const S = window.GAME.Game.scene, h = S.sim.heroes[i]; h.ult = 100; S.sim.cast(h, 'ult', S.sim.resolveTarget(h, 'ult')); }, i);
    await p.waitForTimeout(1400); await p.screenshot({ path: `test-output/cls3_${party[i]}.png` });
  }
}
await p.evaluate(() => { const G = window.GAME.Game; G.go('field'); window.GAME.openRoster({}); }); await p.waitForTimeout(400); await p.screenshot({ path: 'test-output/cls3_roster.png' });
console.log(errs); await b.close();
