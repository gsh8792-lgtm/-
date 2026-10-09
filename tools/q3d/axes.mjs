// 뼈 축 조사: node tools/q3d/axes.mjs — 뼈마다 x/y/z +30도 회전 시 끝점이 월드에서 움직이는 방향 (동작 만들 때 참고)
import { chromium } from 'playwright'; import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..'), glb = process.argv[2] || '../SWI/Deliverables/CleanCharacter/Character.glb';
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split('?')[0]); const f = u === '/model.glb' ? glb : path.join(root, u); if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }).listen(0);
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage();
p.on('pageerror', (e) => console.log('E', e.message));
await p.goto(`http://localhost:${server.address().port}/tools/q3d/render.html?glb=/model.glb`); await p.waitForFunction(() => window.READY, null, { timeout: 180000 });
console.log(JSON.stringify(await p.evaluate(() => window.HIPINFO()))); const a = await p.evaluate(() => window.AXES()); for (const n in a) console.log(n.padEnd(11), '→', a[n].child.padEnd(10), 'dir', JSON.stringify(a[n].dir), 'x', JSON.stringify(a[n].x), 'y', JSON.stringify(a[n].y), 'z', JSON.stringify(a[n].z));
await b.close(); server.close();
