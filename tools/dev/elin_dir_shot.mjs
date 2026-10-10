// 엘린 좌우 달리기 비교: node tools/dev/elin_dir_shot.mjs → test-output/elin_dir_{right,left}.png
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1 }; G.scenes.title.start(9); G.run.party = ['elin']; window.GAME.refreshRunLoadout(G.run); G.scene.rebuildParty && G.scene.rebuildParty(); });
await p.waitForTimeout(500);
for (const dir of ['right', 'left']) {
  await p.evaluate((dir) => { const S = window.GAME.Game.scene; const L = S.leader; L.x = 700; S.target = { x: dir === 'right' ? 1600 : 0, y: L.y }; }, dir);
  await p.waitForTimeout(300);
  for (let i = 0; i < 8; i++) {
    const box = await p.evaluate(() => { const S = window.GAME.Game.scene, L = S.leader; return { x: L.x, y: L.y, cam: S.cam || 0 }; });
    await p.screenshot({ path: `test-output/elin_dir_${dir}_${i}.png` });
    await p.waitForTimeout(70);
  }
}
await b.close();
