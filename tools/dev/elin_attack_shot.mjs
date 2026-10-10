// 엘린 3연격(평타마다 한 베기) 확인: node tools/dev/elin_attack_shot.mjs → test-output/elin_atk_*.png
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, battle: 1, break: 1, charge: 1, crush: 1, dungeon: 1, map: 1 }; G.scenes.title.start(9);
  G.run.party = ['elin', 'bori']; window.GAME.refreshRunLoadout(G.run); });
await p.waitForTimeout(400);
await p.evaluate(() => { const G = window.GAME.Game; G.go('battle', { node: { stage: 1, row: 0, type: 'battle', waves: [['orc_shield']] } }); });
await p.waitForTimeout(3500);
const segs = [];
for (let i = 0; i < 24; i++) {
  const st = await p.evaluate(() => { const s = window.GAME.Game.scene; const e = Object.values(s.atkSeg || {})[0]; return e ? e.i : null; });
  segs.push(st);
  if (i % 3 === 0) await p.screenshot({ path: `test-output/elin_atk_${i / 3}.png` });
  await p.waitForTimeout(120);
}
console.log('segs', segs.join(','), errs); await b.close();
