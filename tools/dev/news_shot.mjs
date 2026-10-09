// 타이틀 · 새 소식 확인: node tools/dev/news_shot.mjs
import { chromium } from 'playwright';
import path from 'path';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(500);
await p.screenshot({ path: 'test-output/title.png' });
await p.click('#btn-news'); await p.waitForTimeout(300); await p.screenshot({ path: 'test-output/news.png' });
await p.click('#news-close');
console.log(errs); await b.close();
