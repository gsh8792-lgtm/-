// Q3D/GLB 캐릭터 → 게임용 동작 프레임 시트 (2D로 미리 굽기)
// node tools/q3d/bake_q3d.mjs <glb> <spriteName> [yaw=-40] [frameH=240] [head=1 (머리 배율, 치비는 1.5)] [toon|pbr]
// 결과: src/js/02b_sprite_sheets.js (SPRITE_SHEETS[spriteName] = webp 데이터 + 동작별 줄)
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { MOTIONS, motionFrame } from './motions.mjs';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const [glb, name, yawArg, fhArg, headArg, styleArg] = process.argv.slice(2);
const TOON = (styleArg || 'toon') === 'toon'; // 기본 카툰 렌더링 (실사 음영은 'pbr')
if (!glb || !name) { console.log('usage: node tools/q3d/bake_q3d.mjs <glb> <spriteName> [yaw] [frameH]'); process.exit(1); }
const YAW = +(yawArg || -40), FH = +(fhArg || 240), PITCH = 8, HEAD = +(headArg || 1);
// 동작: tools/q3d/motions.mjs에서 직접 만든 6종 (에셋 클립은 쓰지 않는다)
const ANIMS = Object.keys(MOTIONS);
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = u === '/model.glb' ? path.resolve(glb) : path.join(root, u);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const port = server.address().port;
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage();
p.on('pageerror', (e) => console.log('pageerror', e.message));
await p.goto(`http://localhost:${port}/tools/q3d/render.html?glb=/model.glb&toon=${TOON ? 1 : 0}`);
await p.waitForFunction(() => window.READY, null, { timeout: 180000 });
const clips = Object.fromEntries((await p.evaluate(() => window.INFO.clips)));
const shots = [];
void clips;
for (const key of ANIMS) {
  const M = MOTIONS[key], row = [];
  for (let i = 0; i < M.n; i++) { const f = motionFrame(key, i); row.push(await p.evaluate(([pz, o, y, pt, hd]) => window.POSESHOT(pz, o, y, pt, hd), [f.pose, f.off, YAW, PITCH, HEAD])); }
  shots.push({ key, n: M.n, fps: M.n / M.dur, row, loop: !!M.loop, hold: !!M.hold });
}
// 페이지 안에서: 모든 프레임의 공통 경계로 잘라 한 장의 시트(webp)로
const out = await p.evaluate(async ([shots, FH, TOON_F]) => {
  const load = (src) => new Promise((r) => { const im = new Image(); im.onload = () => r(im); im.src = src; });
  const ims = []; for (const s of shots) { s.ims = []; for (const d of s.row) { const im = await load(d); s.ims.push(im); ims.push(im); } }
  const W = ims[0].width, H = ims[0].height, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true });
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (const im of ims) { x.clearRect(0, 0, W, H); x.drawImage(im, 0, 0); const a = x.getImageData(0, 0, W, H).data;
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (a[(yy * W + xx) * 4 + 3] > 8) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; } }
  // 발 = 아래 경계. 좌우는 몸 중심(전체 폭 중앙)이 프레임 중앙에 오게
  const cx = W / 2, half = Math.max(cx - x0, x1 - cx) + 4, top = y0 - 4, bot = y1 + 2;
  const k = FH / (bot - top), fw = Math.ceil(half * 2 * k), fh = FH;
  const n = Math.max(...shots.map((s) => s.n));
  const sh = document.createElement('canvas'); sh.width = fw * n; sh.height = fh * shots.length;
  const sx = sh.getContext('2d'); sx.imageSmoothingQuality = 'high';
  // 게임 화풍에 맞춤: 채도·대비 약간 올리고, 진한 잉크 외곽선(치비 그림처럼)
  const fr = document.createElement('canvas'); fr.width = fw; fr.height = fh; const fx = fr.getContext('2d');
  const ink = document.createElement('canvas'); ink.width = fw; ink.height = fh; const ix = ink.getContext('2d');
  shots.forEach((s, r) => s.ims.forEach((im, i) => {
    fx.clearRect(0, 0, fw, fh); fx.filter = TOON_F; fx.drawImage(im, cx - half, top, half * 2, bot - top, 0, 0, fw, fh); fx.filter = 'none';
    ix.clearRect(0, 0, fw, fh); ix.globalCompositeOperation = 'source-over'; ix.drawImage(fr, 0, 0); ix.globalCompositeOperation = 'source-in'; ix.fillStyle = '#2b1a14'; ix.fillRect(0, 0, fw, fh);
    const ox = i * fw, oy = r * fh, L = TOON_F === 'saturate(1.1)' ? 2.1 : 1.6; // 카툰은 외곽선 조금 굵게
    for (let a = 0; a < 8; a++) sx.drawImage(ink, ox + Math.cos(a * Math.PI / 4) * L, oy + Math.sin(a * Math.PI / 4) * L);
    sx.drawImage(fr, ox, oy);
  }));
  return { src: sh.toDataURL('image/webp', 0.86), fw, fh, anims: Object.fromEntries(shots.map((s, r) => [s.key, { row: r, n: s.n, fps: +s.fps.toFixed(2), loop: s.loop, hold: s.hold }])) };
}, [shots.map(({ key, n, fps, row, loop, hold }) => ({ key, n, fps, row, loop, hold })), FH, TOON ? 'saturate(1.1)' : 'saturate(1.3) contrast(1.08) brightness(0.97)']);
await b.close(); server.close();
const file = path.join(root, 'src/js/02b_sprite_sheets.js');
let sheets = {};
if (fs.existsSync(file)) { const m = fs.readFileSync(file, 'utf8').match(/const SPRITE_SHEETS = (\{[\s\S]*\});/); if (m) sheets = JSON.parse(m[1]); }
sheets[name] = Object.assign(out, { from: path.basename(glb), yaw: YAW, head: HEAD, style: TOON ? 'toon' : 'pbr' });
fs.writeFileSync(file, `// ===== 02b_sprite_sheets.js : 3D 모델을 미리 구운 동작 프레임 시트 (tools/q3d/bake_q3d.mjs가 생성 — 직접 고치지 말 것) =====\n// SPRITE_SHEETS[스프라이트 이름] = { src(webp), fw, fh, anims: { idle|walk|cast: { row, n, fps } } } — 발 중앙 = 프레임 아래 중앙\nconst SPRITE_SHEETS = ${JSON.stringify(sheets)};\n`);
fs.writeFileSync(path.join(root, `test-output/sheet_${name}.webp`), Buffer.from(out.src.split(',')[1], 'base64'));
console.log(`${name}: ${out.fw}x${out.fh} × ${Object.values(out.anims).map((a) => a.n).join('/')} frames, ${(out.src.length / 1024).toFixed(0)} KB`);
