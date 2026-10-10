// 엘린 달리기 좌우 반전 확인: node tools/dev/elin_flip_shot.mjs → test-output/elin_flip.png
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1400, height: 500 } })).newPage();
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(800);
await p.evaluate(() => { const c = document.createElement('canvas'); window.GAME.drawSprite(c.getContext('2d'), 'knightElin', 0, 0, { scale: 2, t: 0, anim: 'walk' }); });
await p.waitForTimeout(1500);
await p.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 1400; c.height = 500; c.style.position = 'fixed'; c.style.left = 0; c.style.top = 0; c.style.zIndex = 9999; c.style.background = '#556'; document.body.appendChild(c);
  const ctx = c.getContext('2d');
  for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) {
    const x = 110 + i * 220, y = 220 + row * 240;
    ctx.strokeStyle = 'red'; ctx.beginPath(); ctx.moveTo(x, y - 200); ctx.lineTo(x, y + 10); ctx.stroke();
    window.GAME.drawSprite(ctx, 'knightElin', x, y, { scale: 2, t: i / 12 + 0.001, flip: row === 1, anim: 'walk' });
  }
});
await p.screenshot({ path: 'test-output/elin_flip.png' });
await b.close();
