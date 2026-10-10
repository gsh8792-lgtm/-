// 엘린 좌·우 달리기 비교: node tools/dev/elin_lr_check.mjs [dist파일] → 1초 동안 보인 서로 다른 동작 수 + test-output/elin_lr.png
import { chromium } from 'playwright';
import path from 'path';
import crypto from 'crypto';
const file = process.argv[2] || 'dist/forest_expedition.html';
import fs from 'fs';
const KE = (() => { const d = JSON.parse(fs.readFileSync('src/js/02b_sprite_sheets.js', 'utf8').match(/const SPRITE_SHEETS = (\{.*\});/s)[1]).knightElin; return { fw: d.fw, wy: d.anims.walk.row * d.fh }; })();
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
await p.goto('file://' + path.resolve(file)); await p.waitForTimeout(400);
await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1 }; G.scenes.title.start(3); G.run.party = ['elin', 'danbi', 'bori']; G.scene.rebuildParty(); G.scene.followers = []; });
await p.waitForTimeout(800);
// 실제로 그려지는 달리기 프레임 번호를 기록 (drawSprite 에 넘어가는 t·phase 로 시트 프레임 계산)
await p.evaluate(({ fw, wy }) => { window.__fw = fw; window.__wy = wy; const c = document.getElementById('cv').getContext('2d'), o = c.drawImage; window.__fr = [];
  c.drawImage = function (img, sx, sy, sw, sh2) { if (arguments.length === 9 && img.src && img.src.length > 1e5 && sw === window.__fw && sy === window.__wy) window.__fr.push(Math.round(sx / sw)); return o.apply(this, arguments); }; }, KE);
const run = async (dir) => {
  await p.evaluate((dir) => { const S = window.GAME.Game.scene; S.leader.x = dir > 0 ? 700 : 1500; S.leader.y = 900; S.target = null; S.joy = { dx: dir * 56, dy: 0 }; }, dir);
  await p.waitForTimeout(300); await p.evaluate(() => { window.__fr = []; }); await p.waitForTimeout(1000);
  const fr = await p.evaluate(() => window.__fr.slice()); await p.evaluate(() => { window.GAME.Game.scene.joy = null; });
  let adv = 0; for (let i = 1; i < fr.length; i++) adv += (fr[i] - fr[i - 1] + 12) % 12;
  return { distinct: new Set(fr).size, framesAdvancedPerSec: adv };
};
const R = await run(1), L = await run(-1);
console.log(JSON.stringify({ right: R, left: L }));
await b.close();
