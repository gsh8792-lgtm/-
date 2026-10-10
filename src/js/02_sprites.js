// ===== 02_sprites.js : 페인터리 치비 캐릭터 아트 (코드 드로잉) =====
// 목표 화풍: 2.5등신 판타지 치비(갑옷·가죽·천 재질감, 큰 눈, 탁하고 따뜻한 팔레트).
// - 모든 캐릭터/몬스터는 같은 재질 함수(metal/cloth/leather/skin/gold)와 같은 조명
//   (좌상단 광원 + 하단 앰비언트 그림자)으로 그려 화풍을 통일한다.
// - 단위 좌표계: 발 중앙이 (0,0), 위가 음수. 영웅 키 ≈ 100 단위.
// - 레이어: back(망토/포니테일/화살통) · body · head(머리+얼굴+모자). 아이들 애니메이션은 레이어별 오프셋.
// - 실제 이미지 에셋으로 교체: SPRITE_IMAGE_OVERRIDES[name] = 'path/or/dataURI.png' 를 지정하면
//   해당 PNG(발 중앙 하단 기준)를 그린다. (언리얼 이식 시 Paper2D/텍스처로 대응)

const SPRITE_IMAGE_OVERRIDES = {};
const UNIT_TO_PX = 0.36; // 기존 scale 인자(3 = 전투)와 호환: 높이 100단위 × 0.36 × 3 ≈ 108px

// ---------------------------------------------------------------- 색 유틸
function hexRgb(hex) { const v = parseInt(hex.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
function mix(hex, k, to) {
  const [r, g, b] = hexRgb(hex);
  const t = to === 'w' ? [255, 248, 235] : [28, 16, 22];
  return `rgb(${Math.round(r + (t[0] - r) * k)},${Math.round(g + (t[1] - g) * k)},${Math.round(b + (t[2] - b) * k)})`;
}
const LT = (h, k) => mix(h, k, 'w');
const DK = (h, k) => mix(h, k, 'k');
const INK = '#2b1a14';

// ---------------------------------------------------------------- 재질 그리기 헬퍼
// 외형 변형: 그리는 동안 색 교체표(_CS)와 얼굴 덮어쓰기(_FO)를 적용 (SPRITE_VARIANTS)
let _CS = null, _FO = null;
const SW = (c) => (_CS && typeof c === 'string' && _CS[c.toLowerCase()]) || c;
function paint(ctx, path, base, bb, kind, opt) {
  opt = opt || {};
  base = SW(base);
  if (opt.ink) opt = Object.assign({}, opt, { ink: SW(opt.ink) });
  const [x0, y0, x1, y1] = bb;
  const w = x1 - x0, h = y1 - y0;
  let g;
  if (kind === 'metal') {
    g = ctx.createLinearGradient(x0, y0, x0 + w * 0.35, y1);
    g.addColorStop(0, LT(base, 0.55)); g.addColorStop(0.28, LT(base, 0.12)); g.addColorStop(0.5, DK(base, 0.28));
    g.addColorStop(0.68, LT(base, 0.25)); g.addColorStop(1, DK(base, 0.45));
  } else {
    const cx = x0 + w * (opt.lx !== undefined ? opt.lx : 0.32), cy = y0 + h * (opt.ly !== undefined ? opt.ly : 0.25);
    g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * (kind === 'skin' ? 0.95 : 1.05));
    const hi = kind === 'skin' ? 0.22 : kind === 'leather' ? 0.16 : kind === 'gold' ? 0.5 : 0.2;
    const lo = kind === 'skin' ? 0.22 : kind === 'leather' ? 0.42 : kind === 'gold' ? 0.45 : 0.38;
    g.addColorStop(0, LT(base, hi)); g.addColorStop(0.45, base); g.addColorStop(1, DK(base, lo));
  }
  ctx.beginPath(); path(ctx);
  ctx.fillStyle = g; ctx.fill();
  if (opt.outline !== false) {
    ctx.lineJoin = 'round'; ctx.lineWidth = opt.lw || 1.5;
    ctx.strokeStyle = opt.ink || DK(base, 0.72);
    ctx.stroke();
  }
  if (kind === 'metal' && opt.shine !== false) {
    ctx.save(); ctx.beginPath(); path(ctx); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x0 + w * 0.22, y0 + h * 0.12); ctx.lineTo(x0 + w * 0.3, y0 + h * 0.55); ctx.stroke();
    ctx.restore();
  }
}
const ell = (cx, cy, rx, ry, rot) => (c) => c.ellipse(cx, cy, rx, ry, rot || 0, 0, Math.PI * 2);
const poly = (pts) => (c) => { c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); };
const rrect = (x, y, w, h, r) => (c) => { if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); };
function blob(ctx, cx, cy, rx, ry, base, kind, opt) { paint(ctx, ell(cx, cy, rx, ry, opt && opt.rot), base, [cx - rx, cy - ry, cx + rx, cy + ry], kind, opt); }
function shape(ctx, pts, base, kind, opt) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < pts.length; i += 2) { x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]); y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]); }
  paint(ctx, opt && opt.smooth ? smoothPath(pts) : poly(pts), base, [x0, y0, x1, y1], kind, opt);
}
function smoothPath(pts) {
  return (c) => {
    const n = pts.length / 2;
    const P = (i) => [pts[(i % n) * 2], pts[(i % n) * 2 + 1]];
    c.moveTo((P(0)[0] + P(1)[0]) / 2, (P(0)[1] + P(1)[1]) / 2);
    for (let i = 1; i <= n; i++) {
      const p = P(i), q = P(i + 1);
      c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    c.closePath();
  };
}
function line(ctx, pts, color, w, cap) {
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.strokeStyle = SW(color); ctx.lineWidth = w; ctx.lineCap = cap || 'round'; ctx.stroke();
}
function curve(ctx, x0, y0, cx, cy, x1, y1, color, w) {
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.strokeStyle = SW(color); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke();
}
function rivets(ctx, pts, r) { for (let i = 0; i < pts.length; i += 2) { ctx.fillStyle = '#f0e6d0'; ctx.beginPath(); ctx.arc(pts[i], pts[i + 1], r || 0.9, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(40,20,10,0.5)'; ctx.beginPath(); ctx.arc(pts[i] + 0.4, pts[i + 1] + 0.4, (r || 0.9) * 0.5, 0, 7); ctx.fill(); } }
function stitch(ctx, pts, color) { ctx.save(); ctx.setLineDash([1.6, 1.4]); line(ctx, pts, color || 'rgba(255,235,200,0.55)', 0.7); ctx.restore(); }

// ---------------------------------------------------------------- 공용 신체 파츠
const SKIN = '#f1c8a2';

// 눈. style: big(크고 둥근) | sharp(날카롭게 올라간) | gentle(처진 순한) | sleepy(반쯤 감긴) | narrow(작고 가는) | round(아이같이 동그란)
function eye(ctx, cx, cy, w, h, iris, opt) {
  opt = opt || {};
  const st = opt.style || 'big';
  const tilt = st === 'sharp' ? -0.9 : st === 'gentle' ? 0.8 : 0;        // 눈꼬리 기울기
  if (st === 'narrow') h *= 0.55;
  if (st === 'sharp') h *= 0.72;
  if (st === 'round') { w *= 1.08; h *= 1.05; }
  if (opt.blink) { curve(ctx, cx - w, cy + 0.5, cx, cy + h * 0.6 + 0.6, cx + w, cy + 0.2 + tilt, INK, 1.4); return; }
  ctx.save();
  ctx.beginPath();
  // 흰자: 바깥 눈꼬리를 tilt만큼 올리고/내린다
  ctx.moveTo(cx - w, cy);
  ctx.bezierCurveTo(cx - w, cy - h * 1.25, cx + w, cy - h * 1.25 + tilt, cx + w, cy + tilt * 0.6);
  ctx.bezierCurveTo(cx + w, cy + h * 1.2, cx - w, cy + h * 1.2, cx - w, cy);
  ctx.fillStyle = opt.sclera || '#fffaf2'; ctx.fill();
  ctx.clip();
  const ir = st === 'narrow' ? 0.6 : st === 'round' ? 0.86 : 0.78;
  const g = ctx.createLinearGradient(cx, cy - h, cx, cy + h);
  g.addColorStop(0, DK(iris, 0.6)); g.addColorStop(0.55, iris); g.addColorStop(1, LT(iris, 0.5));
  ctx.beginPath(); ctx.ellipse(cx + w * 0.12, cy + h * 0.12, w * ir, h * (st === 'narrow' ? 1.3 : 0.9), 0, 0, 7); ctx.fillStyle = g; ctx.fill();
  ctx.fillStyle = DK(iris, 0.82);
  if (opt.slit) { ctx.beginPath(); ctx.ellipse(cx + w * 0.12, cy + h * 0.1, w * 0.18, h * 0.75, 0, 0, 7); ctx.fill(); }
  else { ctx.beginPath(); ctx.ellipse(cx + w * 0.15, cy + h * 0.15, w * ir * 0.45, h * 0.45, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#ffffff';
  const hl = st === 'round' ? 1.3 : st === 'narrow' ? 0.6 : 1;
  ctx.beginPath(); ctx.ellipse(cx - w * 0.2, cy - h * 0.28, w * 0.28 * hl, h * 0.24 * hl, 0, 0, 7); ctx.fill();
  if (st !== 'narrow') { ctx.beginPath(); ctx.arc(cx + w * 0.4, cy + h * 0.45, w * 0.13 * hl, 0, 7); ctx.fill(); }
  // 반쯤 감긴 눈꺼풀
  if (st === 'sleepy' || st === 'gentle') {
    ctx.fillStyle = opt.skin || SKIN;
    ctx.beginPath(); ctx.rect(cx - w * 1.2, cy - h * 1.4, w * 2.4, h * (st === 'sleepy' ? 0.95 : 0.55)); ctx.fill();
  }
  ctx.restore();
  // 윗 속눈썹
  const lidY = st === 'sleepy' ? cy - h * 0.45 : st === 'gentle' ? cy - h * 0.85 : cy - h * 1.15;
  ctx.beginPath(); ctx.moveTo(cx - w * 1.1, cy - h * 0.2);
  ctx.quadraticCurveTo(cx, lidY - (st === 'sleepy' ? 0 : h * 0.15), cx + w * 1.15, cy - h * 0.45 + tilt);
  ctx.strokeStyle = opt.lash || INK; ctx.lineWidth = opt.lashW || (st === 'narrow' ? 1.3 : 1.7); ctx.lineCap = 'round'; ctx.stroke();
  if (!opt.noTail && st !== 'narrow') line(ctx, [cx + w * 1.0, cy - h * 0.5 + tilt, cx + w * 1.5, cy - h * 0.75 + tilt * 1.4], opt.lash || INK, 1.1);
  if (opt.lowerLash !== false) curve(ctx, cx - w * 0.7, cy + h * 0.95, cx, cy + h * 1.15, cx + w * 0.8, cy + h * 0.85 + tilt * 0.3, 'rgba(60,30,30,0.45)', 0.6);
}

// 얼굴형 경로 (머리 중심 ≈ (2,-80), 턱 끝 ≈ y -57)
const FACE_SHAPES = {
  round:  (c) => { c.moveTo(-19, -84); c.bezierCurveTo(-20, -105, 23, -107, 23, -84); c.bezierCurveTo(24, -68, 16, -59.5, 4, -59); c.bezierCurveTo(-8, -59, -18, -66, -19, -84); },
  square: (c) => { c.moveTo(-19, -86); c.bezierCurveTo(-20, -106, 24, -108, 24, -86); c.lineTo(23, -70); c.quadraticCurveTo(21, -60, 12, -57.5); c.lineTo(-2, -57.5); c.quadraticCurveTo(-15, -60, -18, -70); c.closePath(); },
  long:   (c) => { c.moveTo(-17, -86); c.bezierCurveTo(-18, -106, 21, -108, 21, -86); c.bezierCurveTo(22, -70, 14, -57, 4, -55); c.bezierCurveTo(-6, -55, -16, -64, -17, -86); },
  sharp:  (c) => { c.moveTo(-18, -84); c.bezierCurveTo(-19, -104, 22, -106, 22, -84); c.bezierCurveTo(22, -72, 14, -61, 6, -56.5); c.bezierCurveTo(0, -57, -16, -67, -18, -84); },
  child:  (c) => { c.moveTo(-20, -84); c.bezierCurveTo(-21, -108, 24, -110, 24, -84); c.bezierCurveTo(24, -69, 15, -61, 3, -61); c.bezierCurveTo(-9, -61, -19, -68, -20, -84); },
};

// 사람 얼굴. f = { skin, hair, iris, shape, eye, brow, mouth, extras:[...] }
// brow: thick(굵고 일자) | thin(가늘게 아치) | angry(치켜올라감) | worried(八자)
// mouth: smile | smirk | flat | open | grin | gentle
// extras: freckles | stubble | scar | bandage | glasses | mole | wrinkles | blushBig
function humanFace(ctx, f, blink) {
  if (_FO) f = Object.assign({}, f, _FO);
  f = Object.assign({}, f, { skin: SW(f.skin), hair: SW(f.hair), iris: SW(f.iris) });
  const skin = f.skin || SKIN;
  const shape = FACE_SHAPES[f.shape || 'round'];
  const chinY = { round: -59, square: -57.5, long: -55, sharp: -56.5, child: -61 }[f.shape || 'round'];
  blob(ctx, -18.5, -74, 3.6, 5, skin, 'skin', { ink: DK(skin, 0.6) });
  paint(ctx, shape, skin, [-20, -108, 24, chinY], 'skin', { lx: 0.55, ly: 0.35, ink: DK(skin, 0.62) });
  const has = (x) => f.extras && f.extras.includes(x);
  // 볼 터치
  ctx.fillStyle = has('blushBig') ? 'rgba(240,110,100,0.42)' : 'rgba(236,120,104,0.28)';
  ctx.beginPath(); ctx.ellipse(-6, -67.5, has('blushBig') ? 5 : 4, 2.3, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(17.5, -68, has('blushBig') ? 4 : 3.2, 2, 0, 0, 7); ctx.fill();
  if (has('stubble')) { ctx.fillStyle = 'rgba(70,45,30,0.32)'; ctx.beginPath(); shape(ctx); ctx.save(); ctx.clip(); ctx.fillRect(-20, -66, 46, 12); ctx.restore(); for (let i = 0; i < 26; i++) { ctx.fillStyle = 'rgba(60,35,20,0.45)'; ctx.fillRect(-12 + (i * 7.3) % 32, -63 + (i * 3.1) % 6, 0.6, 0.6); } }
  if (has('freckles')) { ctx.fillStyle = 'rgba(170,90,50,0.6)'; for (const [x, y] of [[-8, -70], [-5, -71.5], [-3, -69.5], [14, -71], [17, -70], [19, -71.8]]) { ctx.beginPath(); ctx.arc(x, y, 0.55, 0, 7); ctx.fill(); } }
  if (has('wrinkles')) { curve(ctx, -10, -66, -8, -63, -6, -61, 'rgba(120,70,50,0.5)', 0.7); curve(ctx, 18, -66, 17, -63, 15, -61, 'rgba(120,70,50,0.5)', 0.7); line(ctx, [-6, -90, 12, -90.5], 'rgba(120,70,50,0.35)', 0.6); }
  // 눈썹
  const bc = DK(f.hair, 0.4);
  const bw = f.brow === 'thick' ? 2.6 : f.brow === 'thin' ? 0.9 : 1.4;
  const B = {
    thick:   [[-10, -86, -4, -87, 1, -85.5], [7, -85.5, 13, -87.5, 20, -86]],
    thin:    [[-9, -85, -4, -88.5, 0, -86.5], [8, -86.5, 13, -89.5, 19, -87]],
    angry:   [[-9, -87, -4, -86, 0.5, -83.5], [7.5, -83.5, 13, -86, 19.5, -87.5]],
    worried: [[-9, -84, -4, -86, 0, -87.5], [8, -87.5, 13, -86.5, 19, -84]],
  }[f.brow || 'thin'];
  for (const b of B) curve(ctx, b[0], b[1], b[2], b[3], b[4], b[5], bc, bw);
  const big = f.eye === 'round' ? 1.12 : f.eye === 'narrow' ? 0.9 : 1;
  eye(ctx, -4, -76, 3.6 * big, 4.8 * big, f.iris, { blink, style: f.eye, skin });
  eye(ctx, 12.5, -76, 4.3 * big, 5.3 * big, f.iris, { blink, style: f.eye, skin });
  if (has('mole')) { ctx.fillStyle = '#5a3020'; ctx.beginPath(); ctx.arc(17.5, -70.5, 0.7, 0, 7); ctx.fill(); }
  if (has('scar')) { line(ctx, [18.5, -70.5, 21.5, -63.5], 'rgba(170,70,60,0.75)', 1); line(ctx, [18.6, -68, 21, -68.6], 'rgba(170,70,60,0.6)', 0.7); line(ctx, [19.6, -65.5, 22, -66.1], 'rgba(170,70,60,0.6)', 0.7); }
  if (has('glasses')) {
    ctx.strokeStyle = '#6a4a20'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(-4, -75.5, 6.2, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(12.5, -75.5, 6.8, 0, 7); ctx.stroke();
    line(ctx, [2.2, -76, 5.7, -76], '#6a4a20', 1.1); line(ctx, [-10, -77, -18, -78], '#6a4a20', 1);
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.ellipse(10, -79, 2.5, 1.4, -0.5, 0, 7); ctx.fill();
  }
  // 코
  if (f.shape === 'square' || f.nose === 'big') { curve(ctx, 7, -73, 9.5, -69, 7, -67.5, 'rgba(140,70,50,0.65)', 1); }
  else line(ctx, [7.5, -70.5, 8.6, -68.6], 'rgba(150,80,60,0.6)', 0.9);
  if (has('bandage')) { paint(ctx, poly([4, -69.5, 12, -71, 12.5, -68.2, 4.5, -66.8]), '#efe2c8', [4, -71, 12.5, -66.8], 'cloth', { lw: 0.6, ink: '#a08a6a' }); line(ctx, [6.8, -69.8, 7.1, -67.4], 'rgba(160,130,100,0.6)', 0.5); line(ctx, [9.8, -70.3, 10.1, -67.9], 'rgba(160,130,100,0.6)', 0.5); }
  // 입
  const my = chinY + (f.shape === 'long' ? 7.5 : 5.6);
  if (has('mask')) { // 도적 복면: 코 아래를 천으로 가린다
    const mc = f.mask || '#2a3a2e';
    ctx.save(); ctx.beginPath(); shape(ctx); ctx.clip();
    ctx.fillStyle = mc; ctx.fillRect(-24, -70, 52, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(-24, -70, 52, 1.8);
    ctx.restore();
    curve(ctx, -19, -69.5, 3, -71.5, 24, -70.5, DK(mc, 0.45), 1.1);
    curve(ctx, 2, -64, 7, -62, 12, -64.5, DK(mc, 0.65), 0.8);
    return;
  }
  switch (f.mouth || 'smile') {
    case 'flat': line(ctx, [3.5, my, 9.5, my - 0.2], '#7a3a30', 1.1); break;
    case 'smirk': curve(ctx, 3, my + 0.2, 7, my + 0.6, 10.5, my - 1.4, '#7a3a30', 1.1); break;
    case 'open': paint(ctx, (c) => { c.moveTo(3, my - 0.8); c.quadraticCurveTo(6.5, my + 4, 10, my - 0.8); c.closePath(); }, '#a8443c', [3, my - 1, 10, my + 3], 'skin', { ink: '#5a2a24', lw: 0.8 }); break;
    case 'grin': paint(ctx, (c) => { c.moveTo(2, my - 1); c.quadraticCurveTo(6.5, my + 3.6, 11.5, my - 1.2); c.closePath(); }, '#ffffff', [2, my - 1, 11.5, my + 3], 'cloth', { ink: '#5a2a24', lw: 0.9 }); break;
    case 'gentle': curve(ctx, 4, my - 0.4, 6.8, my + 1.2, 9.4, my - 0.6, '#9a4a40', 0.9); break;
    default: curve(ctx, 3.5, my - 0.2, 6.5, my + 1.4, 9.5, my - 0.4, '#7a3a30', 1);
  }
}

function drawBoot(ctx, x, base, h) {
  h = h || 12;
  shape(ctx, [x - 5, -h, x + 5, -h, x + 6, -4, x + 9.5, -2.5, x + 9.5, 0.6, x - 5.5, 0.6], base, 'leather');
  line(ctx, [x - 5, -h + 2.5, x + 5, -h + 2.5], DK(base, 0.5), 0.8);
}
function arm(ctx, sx, sy, ex, ey, base, kind, width) {
  const w = width || 4.6;
  const a = Math.atan2(ey - sy, ex - sx) + Math.PI / 2;
  const dx = Math.cos(a) * w, dy = Math.sin(a) * w;
  shape(ctx, [sx - dx, sy - dy, sx + dx, sy + dy, ex + dx * 0.85, ey + dy * 0.85, ex - dx * 0.85, ey - dy * 0.85], base, kind || 'cloth', { smooth: true });
}
function hand(ctx, x, y, skin, r) { blob(ctx, x, y, r || 3.4, (r || 3.4) * 0.9, skin || SKIN, 'skin', { ink: DK(skin || SKIN, 0.62), lw: 1.2 }); }
function hairStrands(ctx, pts, color) { for (let i = 0; i < pts.length; i += 6) curve(ctx, pts[i], pts[i + 1], pts[i + 2], pts[i + 3], pts[i + 4], pts[i + 5], color, 0.8); }
function glow(ctx, x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// ---------------------------------------------------------------- 캐릭터 정의
// top: 머리 꼭대기 높이(단위). box: 렌더 경계 [x0,y0,x1,y1]. headBox: 초상화 영역
const ART = {
  // ===== 토비 — 수호기사 (탱커)
  knight: {
    build: { sx: 1.18, sy: 1.1, hs: 0.95 }, // 크고 떡 벌어진 체격
    top: 106, box: [-46, -116, 50, 6], headBox: [-26, -108, 30, -52],
    back(ctx) {
      shape(ctx, [-16, -56, -6, -56, -10, -18, -22, -8, -30, -14, -26, -40], '#8e2c2c', 'cloth', { smooth: true });
      line(ctx, [-24, -38, -26, -16], 'rgba(0,0,0,0.25)', 1.2);
    },
    body(ctx) {
      shape(ctx, [-10, -30, -1, -30, -1, -10, -10, -10], '#4a3a32', 'cloth');
      shape(ctx, [2, -30, 11, -30, 11, -10, 2, -10], '#4a3a32', 'cloth');
      for (const x of [-5.5, 6.5]) { paint(ctx, poly([x - 6, -14, x + 5, -14, x + 7, -5, x + 10, -3, x + 10, 0.6, x - 6, 0.6]), '#8d96a3', [x - 6, -14, x + 10, 0.6], 'metal'); line(ctx, [x - 6, -8, x + 7, -8], 'rgba(30,30,40,0.5)', 0.8); }
      arm(ctx, -15, -52, -21, -36, '#8d96a3', 'metal', 4.4);
      blob(ctx, -21.5, -34, 4, 3.6, '#7a838f', 'metal');
      paint(ctx, (c) => { c.moveTo(-15, -59); c.lineTo(15, -59); c.quadraticCurveTo(18, -42, 13, -30); c.lineTo(-13, -30); c.quadraticCurveTo(-18, -42, -15, -59); }, '#97a0ad', [-18, -59, 18, -30], 'metal');
      line(ctx, [0, -58, 0, -33], 'rgba(255,255,255,0.35)', 1);
      shape(ctx, [-8, -52, 8, -52, 9, -14, 0, -10, -9, -14], '#a83434', 'cloth', { ink: '#4a1414' });
      line(ctx, [-8.5, -15, 0, -11, 8.5, -15], '#d8b048', 1.4);
      paint(ctx, poly([0, -46, 4, -40, 0, -34, -4, -40]), '#e6c25a', [-4, -46, 4, -34], 'gold', { lw: 0.9 });
      shape(ctx, [-14, -33, 14, -33, 14, -29, -14, -29], '#5a3a24', 'leather', { lw: 1 });
      paint(ctx, rrect(-2.5, -33.5, 5, 5, 1), '#e0bc52', [-2.5, -33.5, 2.5, -28.5], 'gold', { lw: 0.8 });
      for (const x of [-16, 16]) {
        blob(ctx, x, -55, 10, 7.5, '#8d96a3', 'metal');
        blob(ctx, x, -52, 8.5, 5, '#a2abb7', 'metal', { shine: false });
        rivets(ctx, [x - 5, -53, x + 5, -53], 0.8);
      }
      const sh = (c) => { c.moveTo(6, -62); c.quadraticCurveTo(20, -64, 32, -60); c.quadraticCurveTo(34, -32, 19, -14); c.quadraticCurveTo(5, -32, 6, -62); };
      paint(ctx, sh, '#8d96a3', [6, -64, 34, -14], 'metal', { lw: 1.8 });
      const shIn = (c) => { c.moveTo(9.5, -59); c.quadraticCurveTo(20, -60.5, 29.5, -57.5); c.quadraticCurveTo(30.5, -34, 19, -18.5); c.quadraticCurveTo(8.5, -34, 9.5, -59); };
      paint(ctx, shIn, '#9a2f2f', [9, -61, 31, -18], 'cloth', { ink: '#3a1010', lw: 1 });
      paint(ctx, poly([19.5, -54, 22.5, -44, 19.5, -28, 16.5, -44]), '#e6c25a', [16, -54, 23, -28], 'gold', { lw: 0.8 });
      paint(ctx, poly([12.5, -45, 26.5, -45, 26.5, -42, 12.5, -42]), '#e6c25a', [12, -45, 27, -42], 'gold', { lw: 0.8 });
      rivets(ctx, [9, -60, 30.5, -58.5, 31, -42, 13, -26, 7.5, -42], 0.9);
      hand(ctx, 9, -40, '#7a838f', 3.6);
    },
    head(ctx, blink) {
      shape(ctx, [-19, -86, -14, -93, 20, -93, 23, -84, 18, -80, 10, -86, 0, -82, -10, -84, -16, -76], '#6a4128', 'cloth', { smooth: true });
      humanFace(ctx, { skin: '#e4b48a', hair: '#4e2e1c', iris: '#6a4a30', shape: 'square', eye: 'narrow', brow: 'thick', mouth: 'flat', extras: ['stubble', 'bandage'] }, blink);
      shape(ctx, [-12, -92, 22, -92, 22, -84, 17, -86, 14, -82, 9, -86, 4, -83, -1, -87, -8, -84, -14, -86], '#6a4128', 'cloth', { smooth: true });
      paint(ctx, (c) => { c.moveTo(-22, -84); c.bezierCurveTo(-24, -112, 26, -114, 25, -86); c.lineTo(20, -89); c.quadraticCurveTo(0, -95, -17, -88); c.closePath(); }, '#8d96a3', [-24, -112, 26, -84], 'metal', { lw: 1.8 });
      paint(ctx, (c) => { c.moveTo(-21, -88); c.quadraticCurveTo(1, -97, 24, -89); c.lineTo(24.5, -85.5); c.quadraticCurveTo(1, -93, -21.5, -84.5); c.closePath(); }, '#d8b048', [-22, -97, 25, -84], 'gold', { lw: 0.9 });
      line(ctx, [1, -111, 1, -93], 'rgba(255,255,255,0.4)', 1.4);
      rivets(ctx, [-14, -90, -4, -92.5, 8, -93, 18, -91.5], 0.8);
      paint(ctx, poly([-22, -86, -16, -86, -16, -70, -21, -72]), '#7a838f', [-22, -86, -16, -70], 'metal', { lw: 1.2 });
    },
  },

  // ===== 단비 — 검사 (근딜)
  sword: {
    build: { sx: 0.95, sy: 1.04, hs: 0.97 }, // 탄탄하고 날렵
    top: 104, box: [-46, -122, 58, 6], headBox: [-26, -106, 30, -52],
    back(ctx) {
      shape(ctx, [-12, -96, -6, -94, -14, -78, -22, -60, -30, -50, -32, -60, -28, -76, -20, -92], '#9a4a2a', 'cloth', { smooth: true, ink: '#4a1e10' });
      hairStrands(ctx, [-16, -90, -24, -76, -28, -56, -12, -90, -18, -74, -24, -58], 'rgba(60,20,10,0.5)');
    },
    body(ctx) {
      shape(ctx, [-9, -26, -2, -26, -2, -12, -9, -12], '#3a2c34', 'cloth');
      shape(ctx, [2, -26, 9, -26, 9, -12, 2, -12], '#3a2c34', 'cloth');
      drawBoot(ctx, -5.5, '#6e4a30', 15); drawBoot(ctx, 5.5, '#6e4a30', 15);
      arm(ctx, -12, -52, -17, -36, '#e8dcc8', 'cloth', 3.8);
      shape(ctx, [-20, -40, -14, -40, -14, -33, -20, -33], '#6e4a30', 'leather', { lw: 1 });
      hand(ctx, -17, -31);
      shape(ctx, [-13, -36, 13, -36, 17, -20, 6, -17, -6, -18, -17, -20], '#a8383a', 'cloth', { smooth: true, ink: '#4a1414' });
      line(ctx, [-16, -21, -6, -18.5, 6, -17.5, 16, -21], '#d8b048', 1.2);
      shape(ctx, [-12, -57, 12, -57, 12, -46, -12, -46], '#ece2cf', 'cloth', { smooth: true });
      paint(ctx, (c) => { c.moveTo(-11, -50); c.lineTo(11, -50); c.lineTo(10, -34); c.lineTo(-10, -34); c.closePath(); }, '#7a5236', [-11, -50, 11, -34], 'leather');
      for (let i = 0; i < 3; i++) line(ctx, [-2, -47 + i * 4, 2, -45 + i * 4], '#e8d0a0', 0.7);
      stitch(ctx, [-9, -48, -8.5, -36]); stitch(ctx, [9, -48, 8.5, -36]);
      shape(ctx, [-11, -59, 11, -59, 9, -54, 2, -52, -9, -54], '#4f7a4a', 'cloth', { smooth: true });
      blob(ctx, 12, -54, 6.5, 5, '#8d96a3', 'metal');
      arm(ctx, 12, -52, 17, -40, '#e8dcc8', 'cloth', 3.8);
      shape(ctx, [14, -44, 21, -42, 20, -36, 13, -38], '#6e4a30', 'leather', { lw: 1 });
      if (_FO && _FO.fist) { // 수도승: 붕대 감은 주먹
        blob(ctx, 19, -40.5, 5.2, 4.6, '#f3cba6', 'skin', { lw: 1.1 });
        for (let i = 0; i < 3; i++) line(ctx, [15.5, -43 + i * 2.4, 22.5, -42 + i * 2.4], _FO.fist === true ? '#e8e0d0' : _FO.fist, 1.2);
      } else if (_FO && _FO.dagger) { // 도적: 짧은 단검
        paint(ctx, poly([20, -40, 23.5, -43, 36, -72, 34, -76, 31, -71]), '#c3cad4', [20, -76, 36, -40], 'metal', { lw: 1.3 });
        line(ctx, [22, -42.5, 33.5, -72], 'rgba(90,100,120,0.6)', 0.7);
        if (_FO.dagger !== true) line(ctx, [23.5, -46, 33, -70], _FO.dagger, 1.4); // 독 바른 날
      } else {
      paint(ctx, poly([20, -40, 23, -43, 47, -104, 45.5, -106, 43, -103]), '#c3cad4', [20, -106, 47, -40], 'metal', { lw: 1.3 });
      line(ctx, [22, -42.5, 44.5, -102], 'rgba(90,100,120,0.6)', 0.7);
      }
      if (!(_FO && _FO.fist)) {
      paint(ctx, poly([14, -42, 28, -47, 29, -44.5, 15, -39.5]), '#d8b048', [14, -47, 29, -39], 'gold', { lw: 0.9 });
      paint(ctx, poly([18, -38, 21, -39, 17.5, -30, 15, -31]), '#4a2e1c', [15, -39, 21, -30], 'leather', { lw: 0.8 });
      blob(ctx, 15.8, -29.5, 1.8, 1.8, '#d8b048', 'gold', { lw: 0.7 });
      hand(ctx, 19, -40.5);
      }
    },
    head(ctx, blink) {
      shape(ctx, [-20, -82, -20, -98, -8, -106, 12, -106, 24, -96, 24, -80, 20, -70, 18, -82, -16, -82, -18, -66], '#9a4a2a', 'cloth', { smooth: true, ink: '#4a1e10' });
      humanFace(ctx, { skin: '#f3cba6', hair: '#9a4a2a', iris: '#3e7a5a', shape: 'sharp', eye: 'sharp', brow: 'angry', mouth: 'smirk', extras: ['scar'] }, blink);
      shape(ctx, [-18, -94, -6, -104, 14, -104, 25, -94, 24, -84, 20, -88, 15, -83, 12, -90, 5, -84, 2, -91, -6, -85, -10, -91, -17, -82], '#9a4a2a', 'cloth', { smooth: true, ink: '#4a1e10' });
      hairStrands(ctx, [-6, -100, 0, -96, 2, -90, 8, -101, 12, -96, 13, -89], 'rgba(60,20,10,0.45)');
      line(ctx, [-4, -101, 10, -103], 'rgba(255,220,180,0.45)', 1.6);
      curve(ctx, -19, -93, 2, -104, 24, -94, '#c03a36', 2.6);
      shape(ctx, [-20, -93, -26, -88, -27, -82, -22, -88], '#c03a36', 'cloth', { lw: 0.9 });
    },
  },

  // ===== 별비 — 궁수 (원딜)
  archer: {
    build: { sx: 0.88, sy: 1.0, hs: 0.97 }, // 마른 체형
    top: 110, box: [-46, -118, 50, 6], headBox: [-26, -110, 30, -52],
    back(ctx) {
      paint(ctx, poly([-22, -66, -15, -69, -5, -32, -12, -29]), '#7a5236', [-22, -69, -5, -29], 'leather');
      for (const [x, c] of [[-20, '#e8e0d0'], [-17, '#c84a3a'], [-14, '#e8e0d0']]) { line(ctx, [x, -66, x - 2, -76], '#5e4024', 0.8); shape(ctx, [x - 2, -76, x - 4, -82, x, -80], c, 'cloth', { lw: 0.6 }); }
      shape(ctx, [-14, -58, -4, -58, -8, -14, -18, -8, -26, -16, -22, -40], '#3e5a34', 'cloth', { smooth: true });
    },
    body(ctx) {
      shape(ctx, [-9, -28, -2, -28, -2, -12, -9, -12], '#6a5038', 'cloth');
      shape(ctx, [2, -28, 9, -28, 9, -12, 2, -12], '#6a5038', 'cloth');
      drawBoot(ctx, -5.5, '#5a3e28', 14); drawBoot(ctx, 5.5, '#5a3e28', 14);
      arm(ctx, -12, -52, -16, -36, '#4f6b3a', 'cloth', 3.8);
      hand(ctx, -16, -33);
      shape(ctx, [-12, -58, 12, -58, 14, -24, 0, -21, -14, -24], '#4f6b3a', 'cloth', { smooth: true });
      paint(ctx, (c) => { c.moveTo(-11, -55); c.lineTo(-2, -55); c.lineTo(-1, -32); c.lineTo(-11, -33); c.closePath(); c.moveTo(2, -55); c.lineTo(11, -55); c.lineTo(11, -33); c.lineTo(1, -32); c.closePath(); }, '#8a6040', [-11, -55, 11, -32], 'leather');
      stitch(ctx, [-9.5, -53, -9.5, -35]); stitch(ctx, [9.5, -53, 9.5, -35]);
      shape(ctx, [-13, -35, 13, -35, 13, -31, -13, -31], '#4a2e1c', 'leather', { lw: 1 });
      paint(ctx, rrect(-9, -33, 6, 6, 1), '#7a5236', [-9, -33, -3, -27], 'leather', { lw: 0.8 });
      shape(ctx, [-14, -60, 14, -60, 12, -54, 0, -51, -12, -54], '#3e5a34', 'cloth', { smooth: true });
      arm(ctx, 11, -53, 20, -48, '#4f6b3a', 'cloth', 3.6);
      ctx.beginPath(); ctx.moveTo(24, -94); ctx.quadraticCurveTo(40, -50, 24, -8);
      ctx.strokeStyle = '#3a2414'; ctx.lineWidth = 4.4; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = '#9a6a3a'; ctx.lineWidth = 2.6; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,220,170,0.5)'; ctx.lineWidth = 0.8; ctx.stroke();
      line(ctx, [24, -94, 24, -8], 'rgba(240,235,220,0.9)', 0.6);
      paint(ctx, rrect(28, -54, 5.5, 9, 1.5), '#5a3420', [28, -54, 33.5, -45], 'leather', { lw: 0.8 });
      hand(ctx, 30.5, -49);
    },
    head(ctx, blink) {
      shape(ctx, [-24, -70, -24, -98, -10, -112, 12, -112, 26, -100, 27, -80, 22, -66, 14, -88, -14, -88, -18, -64], '#3e5a34', 'cloth', { smooth: true });
      shape(ctx, [-18, -84, -16, -98, 20, -98, 22, -80, 18, -70, -14, -70], '#d8b060', 'cloth', { smooth: true, ink: '#6a4a18' });
      humanFace(ctx, { skin: '#f6d6b6', hair: '#c8a050', iris: '#5a8ab8', shape: 'long', eye: 'sleepy', brow: 'thin', mouth: 'flat', extras: ['freckles'] }, blink);
      shape(ctx, [-17, -92, -8, -102, 12, -102, 23, -92, 22, -84, 17, -89, 13, -84, 9, -91, 3, -85, -2, -92, -10, -86, -15, -88], '#e0b866', 'cloth', { smooth: true, ink: '#6a4a18' });
      line(ctx, [-6, -99, 10, -100], 'rgba(255,250,220,0.6)', 1.4);
      for (let i = 0; i < 5; i++) blob(ctx, 20 + (i % 2) * 1.2, -78 + i * 4.5, 2.8, 2.6, '#d8b060', 'cloth', { ink: '#6a4a18', lw: 0.8 });
      blob(ctx, 20.5, -55, 1.6, 1.6, '#3e7a4a', 'cloth', { lw: 0.6 });
      ctx.beginPath(); ctx.moveTo(-23, -72); ctx.quadraticCurveTo(-24, -110, 2, -110); ctx.quadraticCurveTo(26, -110, 26, -80);
      ctx.strokeStyle = '#2e4426'; ctx.lineWidth = 2.4; ctx.stroke();
    },
  },

  // ===== 솔담 — 마법사 (매지션)
  mage: {
    build: { sx: 0.9, sy: 0.8, hs: 1.07 }, // 작은 소년 마법사
    top: 128, box: [-46, -140, 52, 6], headBox: [-28, -114, 30, -50],
    back(ctx) { shape(ctx, [-18, -54, 14, -54, 20, -6, 0, 0, -22, -6], '#3a2c62', 'cloth', { smooth: true }); },
    body(ctx) {
      paint(ctx, (c) => { c.moveTo(-12, -58); c.lineTo(12, -58); c.quadraticCurveTo(17, -30, 21, -2); c.quadraticCurveTo(0, 2, -21, -2); c.quadraticCurveTo(-17, -30, -12, -58); }, '#4a3a7a', [-21, -58, 21, 2], 'cloth');
      line(ctx, [-20.5, -2.5, -10, -0.5, 10, -0.5, 20.5, -2.5], '#d8b048', 1.8);
      shape(ctx, [-3, -56, 3, -56, 4, -1, -4, -1], '#5a4a90', 'cloth', { lw: 0.8 });
      line(ctx, [-3.6, -50, -3.6, -2], '#d8b048', 0.9); line(ctx, [3.6, -50, 3.6, -2], '#d8b048', 0.9);
      for (let i = 0; i < 4; i++) paint(ctx, poly([0, -46 + i * 11, 2, -43 + i * 11, 0, -40 + i * 11, -2, -43 + i * 11]), '#e6c25a', [-2, -46 + i * 11, 2, -40 + i * 11], 'gold', { lw: 0.5 });
      shape(ctx, [-12, -36, 12, -36, 12, -32, -12, -32], '#5a3420', 'leather', { lw: 0.9 });
      shape(ctx, [-11, -56, -20, -40, -24, -30, -14, -30, -10, -44], '#4a3a7a', 'cloth', { smooth: true });
      hand(ctx, -18, -29);
      shape(ctx, [-14, -60, 14, -60, 13, -53, 0, -49, -13, -53], '#e8dcc8', 'cloth', { smooth: true });
      paint(ctx, ell(0, -51, 2.6, 2.6), '#c0392b', [-2.6, -53.6, 2.6, -48.4], 'gold', { lw: 0.7 });
      paint(ctx, poly([22, -94, 25, -94, 24, 0, 21, 0]), '#7a5230', [21, -94, 25, 0], 'leather', { lw: 1.1 });
      for (const y of [-80, -60]) line(ctx, [21.5, y, 24.5, y + 3], '#4a2e1c', 1);
      shape(ctx, [16, -96, 23.5, -92, 31, -96, 30, -104, 23.5, -100, 17, -104], '#6a4224', 'leather', { smooth: true, lw: 1 });
      if (_FO && _FO.skull) { // 네크로맨서: 해골 지팡이
        glow(ctx, 23.5, -104, 15, _FO.skull, 0.5);
        blob(ctx, 23.5, -105, 6, 5.6, '#ece6d6', 'cloth', { ink: '#5a5444', lw: 1 });
        shape(ctx, [20, -101, 27, -101, 26, -97, 21, -97], '#ddd6c4', 'cloth', { lw: 0.8, ink: '#5a5444' });
        ctx.fillStyle = `rgb(${_FO.skull})`; ctx.fillRect(20.6, -106.5, 2.2, 2.2); ctx.fillRect(24.6, -106.5, 2.2, 2.2);
      } else {
      glow(ctx, 23.5, -104, 16, (_FO && _FO.orb) || '255,180,80', 0.55);
      blob(ctx, 23.5, -104, 5.2, 5.2, _FO && _FO.orb ? `rgb(${_FO.orb})` : '#ffb84a', 'gold', { ink: _FO && _FO.orb ? '#2a1438' : '#a85a10', lw: 1, lx: 0.3, ly: 0.3 });
      ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(21.8, -106, 1.6, 0, 7); ctx.fill();
      }
      shape(ctx, [10, -55, 16, -50, 22, -42, 18, -38, 9, -46], '#4a3a7a', 'cloth', { smooth: true });
      hand(ctx, 22.5, -43);
    },
    head(ctx, blink) {
      shape(ctx, [-23, -70, -23, -98, 23, -98, 25, -70, 19, -66, 16, -80, -17, -80, -18, -66], '#2e3a62', 'cloth', { smooth: true, ink: '#141a30' });
      humanFace(ctx, { skin: '#f8d8bc', hair: '#2e3a62', iris: '#8a5ab0', shape: 'child', eye: 'round', brow: 'worried', mouth: 'open', extras: ['glasses', 'blushBig'] }, blink);
      shape(ctx, [-18, -92, 22, -92, 22, -82, 17, -86, 12, -82, 7, -88, 2, -83, -4, -88, -10, -83, -16, -86], '#2e3a62', 'cloth', { smooth: true, ink: '#141a30' });
      line(ctx, [-6, -90, 8, -90.5], 'rgba(180,200,255,0.4)', 1.2);
      paint(ctx, ell(1, -92, 34, 8, -0.04), '#43306e', [-33, -100, 35, -84], 'cloth', { ink: '#1e1238' });
      paint(ctx, (c) => { c.moveTo(-17, -93); c.quadraticCurveTo(-12, -116, 6, -128); c.quadraticCurveTo(14, -134, 26, -130); c.quadraticCurveTo(16, -124, 15, -114); c.quadraticCurveTo(19, -104, 21, -93); c.closePath(); }, '#4e3a80', [-17, -134, 26, -93], 'cloth', { ink: '#1e1238' });
      paint(ctx, (c) => { c.moveTo(-17.5, -96); c.quadraticCurveTo(2, -101, 21.5, -96); c.lineTo(21, -92); c.quadraticCurveTo(2, -97, -17, -92); c.closePath(); }, '#d8b048', [-18, -101, 22, -92], 'gold', { lw: 0.8 });
      paint(ctx, poly([10, -101, 12, -97, 16, -96.5, 12.5, -94.5, 13.5, -90.5, 10, -92.8, 6.5, -90.5, 7.5, -94.5, 4, -96.5, 8, -97]), '#ffe07a', [4, -101, 16, -90], 'gold', { lw: 0.6 });
    },
  },

  // ===== 보리 — 사제 (서포터)
  priest: {
    build: { sx: 0.9, sy: 1.12, hs: 0.94 }, // 키 크고 가녀림
    top: 108, box: [-46, -122, 50, 6], headBox: [-26, -106, 30, -52],
    back(ctx) {
      shape(ctx, [-22, -86, -14, -92, -12, -60, -18, -30, -26, -34, -26, -60], '#f0c4bc', 'cloth', { smooth: true, ink: '#8a4a4a' });
      shape(ctx, [-14, -58, 12, -58, 18, -6, 0, -3, -20, -6], '#d8d2e8', 'cloth', { smooth: true });
    },
    body(ctx) {
      paint(ctx, (c) => { c.moveTo(-12, -58); c.lineTo(12, -58); c.quadraticCurveTo(16, -30, 19, -3); c.quadraticCurveTo(0, 0, -19, -3); c.quadraticCurveTo(-16, -30, -12, -58); }, '#f2ece0', [-19, -58, 19, 0], 'cloth', { ink: '#7a6a5a' });
      line(ctx, [-18.6, -3.5, -8, -1.2, 8, -1.2, 18.6, -3.5], '#d8b048', 2);
      shape(ctx, [-4.5, -50, 4.5, -50, 5, -2, -5, -2], '#3e6aa8', 'cloth', { lw: 0.8 });
      paint(ctx, poly([0, -26, 3.5, -21, 0, -16, -3.5, -21]), '#e6c25a', [-3.5, -26, 3.5, -16], 'gold', { lw: 0.6 });
      shape(ctx, [-12, -38, 12, -38, 12, -34, -12, -34], '#d8b048', 'gold', { lw: 0.8 });
      shape(ctx, [-11, -56, -20, -42, -24, -30, -13, -31, -9, -44], '#f2ece0', 'cloth', { smooth: true, ink: '#7a6a5a' });
      line(ctx, [-24, -30.5, -13, -31.5], '#d8b048', 1.2);
      hand(ctx, -18, -29);
      shape(ctx, [-15, -60, 15, -60, 16, -50, 0, -46, -16, -50], '#ffffff', 'cloth', { smooth: true, ink: '#7a6a5a' });
      curve(ctx, -15, -51, 0, -45, 15.5, -51, '#d8b048', 1.4);
      paint(ctx, ell(0, -49.5, 2.4, 2.4), '#5aa0e0', [-2.4, -52, 2.4, -47], 'gold', { lw: 0.6 });
      paint(ctx, poly([22, -88, 24.5, -88, 24, -2, 21.5, -2]), '#e8d8b0', [21.5, -88, 24.5, -2], 'leather', { lw: 1, ink: '#7a6a4a' });
      glow(ctx, 23, -98, 18, '170,230,255', 0.45);
      ctx.beginPath(); ctx.arc(23, -98, 7.5, 0, 7); ctx.strokeStyle = '#8a6a20'; ctx.lineWidth = 3.4; ctx.stroke();
      ctx.strokeStyle = '#ecc85a'; ctx.lineWidth = 2; ctx.stroke();
      blob(ctx, 23, -98, 2.8, 3.6, '#7ad0ff', 'gold', { ink: '#2a5a8a', lw: 0.8 });
      paint(ctx, poly([18, -90, 28, -90, 25, -86, 21, -86]), '#ecc85a', [18, -90, 28, -86], 'gold', { lw: 0.6 });
      shape(ctx, [10, -55, 16, -50, 22, -42, 18, -38, 9, -46], '#f2ece0', 'cloth', { smooth: true, ink: '#7a6a5a' });
      hand(ctx, 22.5, -43);
    },
    head(ctx, blink) {
      shape(ctx, [-21, -66, -22, -96, 22, -98, 24, -66, 20, -56, 17, -80, -16, -80, -17, -58], '#f2bfb8', 'cloth', { smooth: true, ink: '#8a4a4a' });
      humanFace(ctx, { skin: '#f8dcc8', hair: '#c88a8a', iris: '#4a9a7a', shape: 'long', eye: 'gentle', brow: 'thin', mouth: 'gentle', extras: ['mole'] }, blink);
      shape(ctx, [-18, -92, -6, -104, 14, -104, 24, -92, 23, -82, 18, -87, 14, -81, 9, -88, 4, -83, -1, -89, -8, -83, -14, -87, -18, -82], '#f2bfb8', 'cloth', { smooth: true, ink: '#8a4a4a' });
      hairStrands(ctx, [-4, -100, 2, -95, 3, -89, 10, -101, 13, -95, 13, -88], 'rgba(150,80,80,0.4)');
      line(ctx, [-6, -100, 10, -101.5], 'rgba(255,255,255,0.6)', 1.6);
      curve(ctx, -19, -90, 2, -100, 23.5, -90, '#d8b048', 1.8);
      paint(ctx, poly([2, -101, 5, -97.5, 2, -94, -1, -97.5]), '#5aa0e0', [-1, -101, 5, -94], 'gold', { lw: 0.7, ink: '#8a6a20' });
    },
  },

  // ===== 고블린
  goblin: {
    build: { sx: 1.0, sy: 0.9, hs: 1.1, neck: -46 }, // 작고 구부정, 큰 머리
    top: 82, box: [-52, -96, 52, 6], headBox: [-34, -88, 34, -40], skin: '#7e9150',
    body(ctx) { goblinBody(ctx, this.skin, false); },
    head(ctx, blink) { goblinHead(ctx, this.skin, blink, false); },
  },
  goblinHorn: {
    build: { sx: 1.25, sy: 0.95, hs: 1.04, neck: -46 }, // 뚱뚱한 나팔수
    top: 92, box: [-52, -116, 56, 6], headBox: [-34, -96, 34, -40], skin: '#879a56',
    body(ctx) { goblinBody(ctx, this.skin, true); },
    head(ctx, blink) { goblinHead(ctx, this.skin, blink, true); },
  },
  // ===== 오크 / 오크 대장
  orc: {
    build: { sx: 1.08, sy: 1.05, hs: 1.0, neck: -60 },
    top: 112, box: [-56, -124, 66, 6], headBox: [-30, -116, 34, -56], skin: '#6f8258',
    body(ctx) { orcBody(ctx, this.skin, false); },
    head(ctx, blink) { orcHead(ctx, this.skin, blink, false); },
  },
  orcCaptain: {
    build: { sx: 1.15, sy: 1.1, hs: 1.0, neck: -60 },
    top: 124, box: [-60, -136, 72, 6], headBox: [-30, -122, 34, -56], skin: '#64784e',
    back(ctx) { shape(ctx, [-20, -66, 16, -66, 24, -6, 2, 0, -28, -4], '#8a2424', 'cloth', { smooth: true, ink: '#3a0c0c' }); },
    body(ctx) { orcBody(ctx, this.skin, true); },
    head(ctx, blink) { orcHead(ctx, this.skin, blink, true); },
  },
  // ===== 오우거 / 오우거 대족장
  ogre: {
    top: 150, box: [-78, -172, 92, 8], headBox: [-36, -158, 40, -94], skin: '#bf9068',
    body(ctx) { ogreBody(ctx, this.skin, false); },
    head(ctx, blink) { ogreHead(ctx, this.skin, blink, false); },
  },
  ogreChief: {
    build: { sx: 1.08, sy: 1.06, hs: 1.0, neck: -96 },
    top: 170, box: [-82, -182, 96, 8], headBox: [-36, -176, 40, -94], skin: '#b4835c',
    back(ctx) { shape(ctx, [-34, -116, 30, -118, 44, -20, 4, -8, -46, -16], '#6a4a30', 'leather', { smooth: true, ink: '#2a1a10' }); hairStrands(ctx, [-30, -60, -36, -40, -40, -20, 30, -70, 36, -50, 38, -26], 'rgba(30,15,5,0.5)'); },
    body(ctx) { ogreBody(ctx, this.skin, true); },
    head(ctx, blink) { ogreHead(ctx, this.skin, blink, true); },
  },
  // ===== 안내 NPC (늙은 길잡이)
  guide: {
    top: 104, box: [-40, -110, 44, 6], headBox: [-26, -100, 30, -50],
    body(ctx) {
      paint(ctx, (c) => { c.moveTo(-13, -60); c.lineTo(13, -60); c.quadraticCurveTo(17, -30, 19, -2); c.quadraticCurveTo(0, 1, -19, -2); c.quadraticCurveTo(-17, -30, -13, -60); }, '#7a6450', [-19, -60, 19, 1], 'cloth');
      shape(ctx, [-12, -36, 12, -36, 12, -32, -12, -32], '#4a2e1c', 'leather', { lw: 0.9 });
      paint(ctx, poly([18, -76, 20.5, -76, 20.5, 0, 18, 0]), '#6a4224', [18, -76, 20.5, 0], 'leather', { lw: 1 });
      glow(ctx, 24, -60, 16, '255,190,90', 0.6);
      paint(ctx, rrect(20, -66, 8, 11, 2), '#e8b040', [20, -66, 28, -55], 'gold', { lw: 1 });
      hand(ctx, 17, -45);
    },
    head(ctx, blink) {
      shape(ctx, [-22, -64, -24, -94, -8, -106, 12, -106, 26, -94, 26, -66, 18, -58, -16, -58], '#6a5440', 'cloth', { smooth: true });
      humanFace(ctx, { skin: '#e8c0a0', hair: '#d8d4dc', iris: '#6a7a8a', shape: 'long', eye: 'gentle', brow: 'thick', mouth: 'flat', extras: ['wrinkles'] }, blink);
      shape(ctx, [-12, -70, -6, -66, 6, -66, 18, -70, 18, -60, 10, -48, 2, -44, -6, -50, -12, -60], '#e8e4ec', 'cloth', { smooth: true, ink: '#7a7480' });
      shape(ctx, [-16, -90, 22, -90, 20, -84, -14, -84], '#e8e4ec', 'cloth', { smooth: true, ink: '#7a7480', lw: 0.9 });
      ctx.beginPath(); ctx.moveTo(-22, -66); ctx.quadraticCurveTo(-24, -104, 2, -104); ctx.quadraticCurveTo(26, -104, 26, -66);
      ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 2; ctx.stroke();
    },
  },
};

// ---------------------------------------------------------------- 몬스터 공용 파츠
function monsterEyes(ctx, l, r, y, w, h, iris, blink) {
  eye(ctx, l, y, w * 0.85, h * 0.85, iris, { blink, slit: true, sclera: '#fff0b0', noTail: true });
  eye(ctx, r, y, w, h, iris, { blink, slit: true, sclera: '#fff0b0', noTail: true });
}

function goblinHead(ctx, skin, blink, horn) {
  const ink = DK(skin, 0.72);
  shape(ctx, [-16, -66, -44, -78, -48, -84, -36, -82, -14, -76], skin, 'skin', { smooth: true, ink });
  shape(ctx, [-18, -72, -40, -80, -30, -79], '#d89a8a', 'skin', { outline: false });
  shape(ctx, [20, -66, 46, -80, 50, -86, 38, -84, 18, -76], skin, 'skin', { smooth: true, ink });
  shape(ctx, [22, -72, 42, -81, 34, -80], '#d89a8a', 'skin', { outline: false });
  paint(ctx, (c) => { c.moveTo(-17, -66); c.bezierCurveTo(-22, -96, 24, -98, 22, -68); c.bezierCurveTo(22, -54, 12, -46, 2, -46); c.bezierCurveTo(-10, -46, -17, -54, -17, -66); }, skin, [-22, -96, 24, -46], 'skin', { ink });
  curve(ctx, -8, -80, 2, -83, 10, -80, DK(skin, 0.4), 0.8);
  monsterEyes(ctx, -5, 11, -70, 4.4, 4.2, '#e8c030', blink);
  line(ctx, [-11, -76, -1, -73], DK(skin, 0.6), 1.8); line(ctx, [16, -76, 7, -73], DK(skin, 0.6), 1.8);
  shape(ctx, [3, -70, 9, -66, 12, -58, 6, -59], LT(skin, 0.05), 'skin', { smooth: true, ink, lw: 1.1 });
  paint(ctx, (c) => { c.moveTo(-6, -56); c.quadraticCurveTo(4, -48, 15, -56); c.quadraticCurveTo(4, -52, -6, -56); }, '#3a1a14', [-6, -56, 15, -50], 'cloth', { lw: 0.8 });
  for (const x of [-2, 3, 8, 12]) shape(ctx, [x, -55, x + 2, -55, x + 1, -52.5], '#f4ecd8', 'cloth', { lw: 0.4 });
  if (horn) {
    for (const [a, c] of [[-0.5, '#c84a3a'], [-0.2, '#e8c050'], [0.15, '#4a8ac0']]) {
      ctx.save(); ctx.translate(2, -92); ctx.rotate(a);
      shape(ctx, [0, 0, -3, -12, 0, -22, 3, -12], c, 'cloth', { smooth: true, lw: 0.8 });
      ctx.restore();
    }
    shape(ctx, [-14, -90, 16, -90, 14, -85, -12, -85], '#8a4a2a', 'leather', { lw: 0.9 });
  }
}
function goblinBody(ctx, skin, horn) {
  const ink = DK(skin, 0.72);
  for (const x of [-7, 6]) {
    shape(ctx, [x - 3.5, -24, x + 3.5, -24, x + 3, -4, x - 3, -4], skin, 'skin', { ink });
    shape(ctx, [x - 4, -5, x + 6, -5, x + 9, 0, x - 4, 0.5], DK(skin, 0.1), 'skin', { ink, lw: 1 });
  }
  arm(ctx, -9, -42, -16, -26, skin, 'skin', 3);
  hand(ctx, -16, -24, skin, 3);
  shape(ctx, [-11, -46, 11, -46, 13, -26, 8, -20, 4, -25, 0, -19, -4, -24, -9, -19, -13, -26], horn ? '#8a3a30' : '#7a6046', 'leather', { ink: '#2a1a10' });
  stitch(ctx, [-6, -42, -5, -30]);
  line(ctx, [-12, -30, 12, -30], '#c8a870', 1.3);
  if (horn) {
    ctx.save(); ctx.translate(18, -38); ctx.rotate(-0.5);
    paint(ctx, (c) => { c.moveTo(-4, -2); c.quadraticCurveTo(8, -8, 16, -14); c.lineTo(20, -6); c.quadraticCurveTo(10, 0, -3, 2); c.closePath(); }, '#d8a440', [-4, -14, 20, 2], 'gold', { lw: 1 });
    blob(ctx, 18, -10, 2.6, 4.6, '#7a4a10', 'leather', { lw: 0.7, rot: 0.5 });
    ctx.restore();
    arm(ctx, 9, -42, 15, -34, skin, 'skin', 3);
    hand(ctx, 16, -33, skin, 3);
  } else {
    arm(ctx, 9, -42, 16, -30, skin, 'skin', 3);
    paint(ctx, poly([17, -32, 20, -34, 30, -58, 27, -57]), '#a8a49a', [17, -58, 30, -32], 'metal', { lw: 1 });
    ctx.fillStyle = 'rgba(140,70,30,0.5)'; ctx.fillRect(22, -45, 2, 3);
    line(ctx, [14, -34, 22, -30], '#4a2e1c', 2.4);
    hand(ctx, 17, -31, skin, 3);
  }
}

function orcHead(ctx, skin, blink, captain) {
  const ink = DK(skin, 0.72);
  blob(ctx, -22, -82, 5, 7, skin, 'skin', { ink, rot: -0.4 });
  paint(ctx, (c) => { c.moveTo(-20, -84); c.bezierCurveTo(-24, -112, 28, -114, 26, -84); c.bezierCurveTo(28, -66, 18, -58, 4, -58); c.bezierCurveTo(-12, -58, -20, -68, -20, -84); }, skin, [-24, -112, 28, -58], 'skin', { ink });
  monsterEyes(ctx, -5, 13, -84, 4, 3.6, '#e05030', blink);
  line(ctx, [-12, -91, 0, -87], DK(skin, 0.65), 2.4); line(ctx, [20, -91, 8, -87], DK(skin, 0.65), 2.4);
  shape(ctx, [3, -82, 9, -76, 5, -74], DK(skin, 0.1), 'skin', { ink, lw: 0.9 });
  curve(ctx, -4, -66, 4, -63, 14, -66, '#2a1810', 1.4);
  shape(ctx, [-3, -66, 0, -66, -1, -73], '#f2e8d0', 'cloth', { lw: 0.8, ink: '#6a5a40' });
  shape(ctx, [11, -66, 14, -66, 13, -73], '#f2e8d0', 'cloth', { lw: 0.8, ink: '#6a5a40' });
  paint(ctx, (c) => { c.moveTo(-22, -88); c.bezierCurveTo(-24, -118, 30, -120, 28, -88); c.quadraticCurveTo(4, -96, -22, -88); }, captain ? '#9a8a6a' : '#7d8692', [-24, -118, 30, -88], 'metal', { lw: 1.7 });
  paint(ctx, poly([3, -96, 7, -96, 6, -80, 4, -80]), captain ? '#c8a040' : '#6a727e', [3, -96, 7, -80], 'metal', { lw: 1 });
  rivets(ctx, [-16, -94, -6, -97, 14, -97, 22, -94], 0.9);
  if (captain) {
    for (const s of [-1, 1]) {
      const bx = s < 0 ? -20 : 26;
      paint(ctx, (c) => { c.moveTo(bx, -104); c.quadraticCurveTo(bx + s * 16, -110, bx + s * 14, -128); c.quadraticCurveTo(bx + s * 6, -114, bx - s * 2, -110); c.closePath(); }, '#ece0c4', [bx - 16, -128, bx + 16, -104], 'cloth', { ink: '#6a5a40' });
    }
    paint(ctx, (c) => { c.moveTo(-22, -92); c.quadraticCurveTo(4, -100, 28, -92); c.lineTo(28, -88); c.quadraticCurveTo(4, -96, -22, -88); c.closePath(); }, '#d8b048', [-22, -100, 28, -88], 'gold', { lw: 0.8 });
  }
}
function orcBody(ctx, skin, captain) {
  for (const x of [-9, 9]) {
    shape(ctx, [x - 6, -34, x + 6, -34, x + 5, -12, x - 5, -12], '#4a3a30', 'cloth');
    drawBoot(ctx, x, '#3a2a20', 14);
  }
  arm(ctx, -18, -62, -26, -38, skin, 'skin', 6);
  shape(ctx, [-30, -44, -21, -44, -21, -36, -30, -36], '#5a3a24', 'leather', { lw: 1 });
  hand(ctx, -26, -33, skin, 4.6);
  paint(ctx, (c) => { c.moveTo(-20, -66); c.lineTo(20, -66); c.quadraticCurveTo(26, -46, 18, -30); c.lineTo(-18, -30); c.quadraticCurveTo(-24, -46, -20, -66); }, captain ? '#7d8692' : '#6a4a30', [-24, -66, 26, -30], captain ? 'metal' : 'leather');
  rivets(ctx, [-12, -58, 0, -58, 12, -58, -12, -46, 12, -46], 1);
  shape(ctx, [-19, -36, 19, -36, 19, -30, -19, -30], captain ? '#8a2424' : '#3a2418', 'leather', { lw: 1 });
  paint(ctx, rrect(-4, -37, 8, 8, 1.5), '#c8a040', [-4, -37, 4, -29], 'gold', { lw: 0.9 });
  shape(ctx, [-16, -30, 16, -30, 14, -18, 4, -20, -4, -18, -14, -20], captain ? '#8a2424' : '#5a3a24', 'leather');
  for (let i = 0; i < 9; i++) blob(ctx, -20 + i * 5, -66 + Math.sin(i * 1.7) * 1.5, 4.4, 3.6, captain ? '#e8dcc8' : '#8a7458', 'cloth', { lw: 0.8, ink: captain ? '#7a6a5a' : '#3a2a18' });
  blob(ctx, 20, -62, 9, 7, '#7d8692', 'metal');
  rivets(ctx, [16, -62, 24, -62], 0.9);
  arm(ctx, 19, -58, 26, -42, skin, 'skin', 5.4);
  paint(ctx, poly([28, -36, 31, -36, 34, -104, 31, -104]), '#6a4224', [28, -104, 34, -36], 'leather', { lw: 1.1 });
  const big = captain ? 1.25 : 1;
  paint(ctx, (c) => { c.moveTo(32, -100); c.quadraticCurveTo(32 + 26 * big, -104 - 8 * big, 34 + 22 * big, -72); c.quadraticCurveTo(40, -80, 33, -80); c.closePath(); }, '#a6aeb8', [32, -112, 34 + 26 * big, -72], 'metal', { lw: 1.5 });
  line(ctx, [36, -96, 32 + 18 * big, -80], 'rgba(255,255,255,0.5)', 1);
  if (captain) paint(ctx, (c) => { c.moveTo(32, -98); c.quadraticCurveTo(14, -100, 16, -84); c.quadraticCurveTo(24, -88, 32, -86); c.closePath(); }, '#a6aeb8', [14, -100, 32, -84], 'metal', { lw: 1.3 });
  hand(ctx, 29.5, -46, skin, 4.6);
}

function ogreHead(ctx, skin, blink, chief) {
  const ink = DK(skin, 0.72);
  blob(ctx, -26, -126, 6, 8, skin, 'skin', { ink, rot: -0.3 });
  blob(ctx, 34, -126, 5, 7, skin, 'skin', { ink, rot: 0.3 });
  paint(ctx, (c) => { c.moveTo(-26, -128); c.bezierCurveTo(-30, -164, 38, -166, 34, -128); c.bezierCurveTo(36, -106, 24, -96, 4, -96); c.bezierCurveTo(-16, -96, -26, -106, -26, -128); }, skin, [-30, -164, 38, -96], 'skin', { ink });
  shape(ctx, [-20, -134, -4, -128, 4, -131, 14, -128, 30, -134, 28, -138, 4, -136, -18, -138], DK(skin, 0.18), 'skin', { smooth: true, ink, lw: 1 });
  monsterEyes(ctx, -7, 16, -126, 3.6, 3.2, '#d8a020', blink);
  shape(ctx, [2, -126, 10, -122, 12, -114, 4, -113, 0, -118], LT(skin, 0.05), 'skin', { smooth: true, ink, lw: 1.1 });
  paint(ctx, (c) => { c.moveTo(-10, -106); c.quadraticCurveTo(6, -98, 22, -106); c.quadraticCurveTo(6, -102, -10, -106); }, '#3a1a14', [-10, -106, 22, -100], 'cloth', { lw: 1 });
  shape(ctx, [-8, -105, -4, -105, -6, -114], '#f2e8d0', 'cloth', { lw: 0.9, ink: '#6a5a40' });
  shape(ctx, [16, -105, 20, -105, 18, -115], '#f2e8d0', 'cloth', { lw: 0.9, ink: '#6a5a40' });
  hairStrands(ctx, [-8, -158, -10, -164, -6, -168, 6, -160, 6, -166, 10, -169], '#4a3020');
  line(ctx, [20, -148, 26, -138], 'rgba(120,50,40,0.6)', 1.2);
  if (chief) {
    paint(ctx, poly([-16, -150, -14, -168, -6, -158, 2, -174, 10, -158, 18, -168, 22, -150]), '#e0b040', [-16, -174, 22, -150], 'gold', { lw: 1.4, ink: '#6a4a10' });
    for (const [x, c] of [[-10, '#d83a3a'], [2, '#3a8ad8'], [14, '#d83a3a']]) blob(ctx, x, -154, 2.2, 2.2, c, 'gold', { lw: 0.6 });
  }
}
function ogreBody(ctx, skin, chief) {
  const ink = DK(skin, 0.72);
  for (const x of [-15, 15]) {
    shape(ctx, [x - 10, -44, x + 10, -44, x + 9, -8, x - 9, -8], skin, 'skin', { ink });
    shape(ctx, [x - 11, -10, x + 10, -10, x + 14, 0, x - 11, 1], '#4a3020', 'leather', { lw: 1.2 });
  }
  arm(ctx, -30, -92, -44, -54, skin, 'skin', 9);
  hand(ctx, -45, -48, skin, 7);
  paint(ctx, (c) => { c.moveTo(-30, -96); c.quadraticCurveTo(0, -104, 30, -96); c.bezierCurveTo(48, -70, 40, -40, 22, -36); c.lineTo(-22, -36); c.bezierCurveTo(-40, -40, -46, -70, -30, -96); }, skin, [-46, -104, 46, -36], 'skin', { ink, lx: 0.45, ly: 0.35 });
  curve(ctx, -14, -72, 0, -66, 18, -72, DK(skin, 0.3), 1);
  blob(ctx, 4, -58, 1.6, 2, DK(skin, 0.35), 'skin', { outline: false });
  shape(ctx, [-28, -46, 30, -46, 30, -40, -28, -40], '#a08050', 'leather', { lw: 1 });
  for (let i = -24; i < 28; i += 5) line(ctx, [i, -46, i + 3, -40], '#6a5030', 0.8);
  shape(ctx, [-24, -40, 26, -40, 22, -14, 6, -18, -8, -14, -22, -18], chief ? '#9a2a2a' : '#6a4a30', 'leather', { ink: '#2a1a10' });
  if (chief) for (let i = 0; i < 5; i++) { const yy = -84 + Math.abs(i - 2) * 3; blob(ctx, -16 + i * 8, yy, 3.6, 3.2, '#ece0c8', 'cloth', { lw: 0.8, ink: '#5a4a30' }); ctx.fillStyle = '#2a1a10'; ctx.fillRect(-17.5 + i * 8, yy - 1, 1.2, 1.2); ctx.fillRect(-15 + i * 8, yy - 1, 1.2, 1.2); }
  for (let i = 0; i < 6; i++) blob(ctx, 18 + i * 4, -98 + i * 2.5, 6, 5, chief ? '#5a4030' : '#7a6044', 'cloth', { lw: 0.8, ink: '#2a1a10' });
  arm(ctx, 32, -90, 44, -60, skin, 'skin', 8.4);
  ctx.save(); ctx.translate(46, -58); ctx.rotate(0.35);
  paint(ctx, (c) => { c.moveTo(-3, 4); c.lineTo(3, 4); c.quadraticCurveTo(12, -50, 10, -96); c.quadraticCurveTo(0, -104, -10, -96); c.quadraticCurveTo(-12, -50, -3, 4); }, '#7a5230', [-12, -104, 12, 4], 'leather', { lw: 1.6 });
  for (const [x, y] of [[-9, -80], [9, -70], [-8, -60], [8, -90], [0, -100]]) shape(ctx, [x, y, x + (x < 0 ? -6 : 6), y - 2, x, y - 4], '#b8b0a0', 'metal', { lw: 0.8, shine: false });
  ctx.restore();
  hand(ctx, 45, -56, skin, 7);
}

// ---------------------------------------------------------------- 외형 변형 (가챠 캐릭터용 임시 외형: 기본 5종의 색·체형·얼굴만 바꿈)
const SPRITE_VARIANTS = {
  knight_b: { base: 'knight', build: { sx: 1.12, sy: 1.12, hs: 0.95 }, face: { shape: 'long', eye: 'gentle', brow: 'thin', mouth: 'gentle', extras: [] },
    swap: { '#8e2c2c': '#2c4a8e', '#a83434': '#3a5ab0', '#9a2f2f': '#2f4a9a', '#4a1414': '#141e4a', '#e4b48a': '#f0caa4', '#4e2e1c': '#e8d488', '#6a4128': '#e8d488' } },
  knight_c: { base: 'knight', build: { sx: 1.22, sy: 1.04, hs: 1.0 }, face: { shape: 'square', eye: 'narrow', brow: 'angry', mouth: 'flat', extras: ['scar'] },
    swap: { '#8e2c2c': '#3a4a2c', '#a83434': '#4a5a32', '#9a2f2f': '#45542e', '#4a1414': '#1e2614', '#8d96a3': '#6a7266', '#97a0ad': '#727a6c', '#a2abb7': '#7e8676', '#7a838f': '#5a6256', '#e4b48a': '#a8b89a', '#4e2e1c': '#3a3a3a', '#6a4128': '#3a3a3a', '#e6c25a': '#9a8a6a', '#d8b048': '#8a7a5a' } },
  sword_b: { base: 'sword', build: { sx: 0.9, sy: 1.08, hs: 0.95 }, face: { shape: 'sharp', eye: 'narrow', brow: 'thin', mouth: 'flat', extras: [] },
    swap: { '#9a4a2a': '#22222e', '#c03a36': '#3a3a52', '#a8383a': '#30304a', '#4a1414': '#141420', '#6e4a30': '#2e2a36', '#f3cba6': '#e8c0a0', '#3e7a5a': '#a03a5a' } },
  sword_c: { base: 'sword', build: { sx: 1.12, sy: 1.0, hs: 0.98 }, face: { shape: 'square', eye: 'big', brow: 'thick', mouth: 'smirk', extras: ['stubble'] },
    swap: { '#9a4a2a': '#d06a2a', '#c03a36': '#8a6a3a', '#a8383a': '#7a5a30', '#4a1414': '#3a2410', '#f3cba6': '#d8a07a', '#3e7a5a': '#7a5a3a' } },
  rogue: { base: 'sword', build: { sx: 0.9, sy: 1.0, hs: 1.0 }, face: { shape: 'sharp', eye: 'sharp', brow: 'thin', mouth: 'smirk', extras: ['mask'], mask: '#2e4a32', dagger: 'rgba(140,220,80,0.8)' },
    swap: { '#9a4a2a': '#2a2a30', '#c03a36': '#3e5a3a', '#a8383a': '#344e32', '#4a1414': '#142014', '#6e4a30': '#3a3428', '#3e7a5a': '#c8a030' } },
  rogue_b: { base: 'sword', build: { sx: 0.88, sy: 1.06, hs: 0.96 }, face: { shape: 'long', eye: 'narrow', brow: 'angry', mouth: 'flat', extras: ['scar', 'mask'], mask: '#1e1a2a', dagger: true },
    swap: { '#9a4a2a': '#d8d8e0', '#c03a36': '#2e2440', '#a8383a': '#281e38', '#4a1414': '#100a18', '#6e4a30': '#24202e', '#f3cba6': '#e8c8b0', '#3e7a5a': '#c03a5a' } },
  rogue_c: { base: 'sword', build: { sx: 0.92, sy: 0.96, hs: 1.03 }, face: { shape: 'child', eye: 'sleepy', brow: 'thin', mouth: 'smirk', extras: ['mole'], dagger: 'rgba(170,110,230,0.8)' },
    swap: { '#9a4a2a': '#5a3a7a', '#c03a36': '#3a7a6a', '#a8383a': '#2e6a5a', '#4a1414': '#0e2a24', '#6e4a30': '#2a3a34', '#3e7a5a': '#8ad03a' } },
  // 수도승 (v0.52): 검사 체형에 주먹(붕대) · 도복 색
  monk: { base: 'sword', build: { sx: 1.0, sy: 1.0, hs: 1.0 }, face: { shape: 'round', eye: 'gentle', brow: 'thick', mouth: 'smile', extras: [], fist: true },
    swap: { '#9a4a2a': '#2a2420', '#c03a36': '#e0a030', '#a8383a': '#d8822a', '#4a1414': '#6a3a10', '#6e4a30': '#4a3424', '#ece2cf': '#f0e4c8', '#7a5236': '#c86a2a', '#4f7a4a': '#8a4a1a', '#3e7a5a': '#5a4a3a' } },
  monk_b: { base: 'sword', build: { sx: 0.9, sy: 1.04, hs: 0.98 }, face: { shape: 'sharp', eye: 'sharp', brow: 'thin', mouth: 'grin', extras: ['blushBig'], fist: '#8ad0e0' },
    swap: { '#9a4a2a': '#4ab0c0', '#c03a36': '#e8f0f0', '#a8383a': '#3a8a9a', '#4a1414': '#1a3a44', '#6e4a30': '#2a4a54', '#7a5236': '#2a6a7a', '#4f7a4a': '#e8f0f0', '#3e7a5a': '#2a7a8a' } },
  monk_c: { base: 'sword', build: { sx: 1.18, sy: 1.0, hs: 0.98 }, face: { shape: 'square', eye: 'narrow', brow: 'thick', mouth: 'flat', extras: ['stubble', 'scar'], fist: '#d8b048' },
    swap: { '#9a4a2a': '#e0c8a8', '#c03a36': '#8a6a2a', '#a8383a': '#6a5a3a', '#4a1414': '#2a2414', '#6e4a30': '#3a3020', '#ece2cf': '#d8b048', '#7a5236': '#8a3a2a', '#4f7a4a': '#d8b048', '#f3cba6': '#e0b088', '#3e7a5a': '#3a3020' } },
  sword_d: { base: 'sword', build: { sx: 0.9, sy: 1.04, hs: 0.98 }, face: { shape: 'long', eye: 'gentle', brow: 'thin', mouth: 'smile', extras: ['blushBig'] },
    swap: { '#9a4a2a': '#e8e0f0', '#c03a36': '#d04a8a', '#a8383a': '#c03a7a', '#4a1414': '#4a1430', '#6e4a30': '#5a3a4a', '#3e7a5a': '#d04a8a' } },
  archer_d: { base: 'archer', build: { sx: 1.02, sy: 1.0, hs: 1.0 }, face: { shape: 'square', eye: 'sharp', brow: 'thick', mouth: 'grin', extras: ['freckles'] },
    swap: { '#3e5a34': '#7a3a2a', '#4f6b3a': '#8a4a30', '#6a4a18': '#3a2a1a', '#c8a050': '#e86a3a', '#5a8ab8': '#e0a040' } },
  archer_b: { base: 'archer', build: { sx: 0.94, sy: 1.1, hs: 0.95 }, face: { shape: 'long', eye: 'narrow', brow: 'thin', mouth: 'flat', extras: [] },
    swap: { '#3e5a34': '#d8d4cc', '#4f6b3a': '#e8e4dc', '#6a4a18': '#8a8a9a', '#c8a050': '#e8eef8', '#5a8ab8': '#6a5ab8' } },
  archer_c: { base: 'archer', build: { sx: 0.96, sy: 0.98, hs: 1.02 }, face: { shape: 'child', eye: 'sharp', brow: 'angry', mouth: 'smirk', extras: [] },
    swap: { '#3e5a34': '#4a2e5a', '#4f6b3a': '#5e3a70', '#6a4a18': '#3a5a3a', '#c8a050': '#7ad070', '#5a8ab8': '#c8a030' } },
  mage_b: { base: 'mage', build: { sx: 0.95, sy: 1.08, hs: 0.96 }, face: { shape: 'long', eye: 'sleepy', brow: 'thin', mouth: 'flat', extras: [] },
    swap: { '#4a3a7a': '#3a6a9a', '#2e3a62': '#d8e8f8', '#141a30': '#2a4a6a', '#1e1238': '#1e3a58', '#3a2c62': '#2e5a82', '#5a4a90': '#5a8ab8', '#8a5ab0': '#5ab0d0', '#43306e': '#2a5a86', '#4e3a80': '#3a7aa8' } },
  mage_c: { base: 'mage', build: { sx: 0.92, sy: 1.12, hs: 0.94 }, face: { shape: 'sharp', eye: 'sharp', brow: 'angry', mouth: 'smirk', extras: [] },
    swap: { '#4a3a7a': '#2a1a2e', '#2e3a62': '#1a1a1a', '#141a30': '#140a18', '#1e1238': '#1a0e1e', '#3a2c62': '#2e1a34', '#5a4a90': '#5a2a4a', '#8a5ab0': '#d03a5a', '#d8b048': '#9a3a5a', '#f8d8bc': '#e8d0d0', '#43306e': '#241426', '#4e3a80': '#30182e' } },
  mage_d: { base: 'mage', build: { sx: 0.96, sy: 1.04, hs: 0.98 }, face: { shape: 'round', eye: 'sharp', brow: 'thin', mouth: 'smirk', extras: [] },
    swap: { '#4a3a7a': '#2a3a6a', '#2e3a62': '#f0e070', '#141a30': '#1a2440', '#1e1238': '#1a2448', '#3a2c62': '#2a3a72', '#5a4a90': '#4a6ac0', '#8a5ab0': '#f0d040', '#43306e': '#22306a', '#4e3a80': '#3048a0' } },
  // 저주술사 (v0.52): 마법사 체형에 보라·검정, 어둠의 구슬
  warlock: { base: 'mage', build: { sx: 0.94, sy: 1.08, hs: 0.96 }, face: { shape: 'sharp', eye: 'sleepy', brow: 'thin', mouth: 'smirk', extras: [], orb: '176,90,240' },
    swap: { '#4a3a7a': '#2a1a3a', '#2e3a62': '#e8e0f0', '#141a30': '#1a0e24', '#1e1238': '#140a1e', '#3a2c62': '#2e1a42', '#5a4a90': '#6a2a8a', '#8a5ab0': '#c04ae0', '#43306e': '#22122e', '#4e3a80': '#3a1a52', '#d8b048': '#9a6ad0' } },
  warlock_b: { base: 'mage', build: { sx: 0.96, sy: 1.04, hs: 0.98 }, face: { shape: 'long', eye: 'sharp', brow: 'angry', mouth: 'smirk', extras: ['mole'], orb: '230,50,70' },
    swap: { '#4a3a7a': '#5a1420', '#2e3a62': '#2a1a1e', '#141a30': '#1a0a0e', '#1e1238': '#2a0a10', '#3a2c62': '#4a1018', '#5a4a90': '#8a1a2a', '#8a5ab0': '#e03a4a', '#43306e': '#3a0e14', '#4e3a80': '#6a1420', '#f8d8bc': '#f0d8d8', '#d8b048': '#c03a4a' } },
  warlock_c: { base: 'mage', build: { sx: 0.92, sy: 1.12, hs: 0.94 }, face: { shape: 'child', eye: 'narrow', brow: 'worried', mouth: 'flat', extras: [], orb: '120,240,150' },
    swap: { '#4a3a7a': '#1a2a24', '#2e3a62': '#f0f0f0', '#141a30': '#0a1410', '#1e1238': '#0e1a14', '#3a2c62': '#16302a', '#5a4a90': '#2a5a4a', '#8a5ab0': '#7ae0a0', '#43306e': '#10221c', '#4e3a80': '#1e3e34', '#d8b048': '#6ac08a' } },
  // 흑마술사 (v0.54): 악마 계약자 — 붉은 지옥불 구슬
  demonist: { base: 'mage', build: { sx: 0.95, sy: 1.06, hs: 0.97 }, face: { shape: 'sharp', eye: 'sharp', brow: 'angry', mouth: 'smirk', extras: [], orb: '255,90,40' },
    swap: { '#4a3a7a': '#3a0e14', '#2e3a62': '#1a1a1a', '#141a30': '#140608', '#1e1238': '#1e080c', '#3a2c62': '#4a1218', '#5a4a90': '#7a1a20', '#8a5ab0': '#ff6a3a', '#43306e': '#2e0a10', '#4e3a80': '#5a1218', '#d8b048': '#e0803a' } },
  demonist_b: { base: 'mage', build: { sx: 0.96, sy: 1.0, hs: 1.02 }, face: { shape: 'child', eye: 'big', brow: 'thin', mouth: 'grin', extras: ['freckles'], orb: '255,160,40' },
    swap: { '#4a3a7a': '#6a2a10', '#2e3a62': '#ff9a3a', '#141a30': '#2a0e04', '#1e1238': '#3a1206', '#3a2c62': '#5a2208', '#5a4a90': '#a0401a', '#8a5ab0': '#ffc040', '#43306e': '#3a1406', '#4e3a80': '#7a2e10', '#d8b048': '#ffd060' } },
  demonist_c: { base: 'mage', build: { sx: 1.02, sy: 1.08, hs: 0.96 }, face: { shape: 'long', eye: 'narrow', brow: 'thick', mouth: 'flat', extras: ['scar'], orb: '120,90,255' },
    swap: { '#4a3a7a': '#1a1440', '#2e3a62': '#c8c0e8', '#141a30': '#0a0820', '#1e1238': '#100c2a', '#3a2c62': '#241c56', '#5a4a90': '#3a2e8a', '#8a5ab0': '#8a6aff', '#43306e': '#14103a', '#4e3a80': '#2a2068', '#d8b048': '#8a7ae0' } },
  // 네크로맨서 (v0.52): 해골 지팡이 · 수의 색
  necro: { base: 'mage', build: { sx: 0.95, sy: 1.08, hs: 0.97 }, face: { shape: 'long', eye: 'narrow', brow: 'thin', mouth: 'flat', extras: [], skull: '120,230,140' },
    swap: { '#4a3a7a': '#2a3a32', '#2e3a62': '#d8dcd4', '#141a30': '#121a16', '#1e1238': '#101a14', '#3a2c62': '#22322a', '#5a4a90': '#3a5a4a', '#8a5ab0': '#9ad08a', '#43306e': '#1a2620', '#4e3a80': '#2a4436', '#f8d8bc': '#e8e4dc', '#d8b048': '#a8b0a0' } },
  necro_b: { base: 'mage', build: { sx: 1.02, sy: 1.0, hs: 1.0 }, face: { shape: 'round', eye: 'big', brow: 'thick', mouth: 'grin', extras: ['freckles'], skull: '240,220,150' },
    swap: { '#4a3a7a': '#5a4a3a', '#2e3a62': '#c87a3a', '#141a30': '#2a2014', '#1e1238': '#2a2018', '#3a2c62': '#4a3a2a', '#5a4a90': '#7a6a52', '#8a5ab0': '#e8d8a0', '#43306e': '#3a2e20', '#4e3a80': '#5a4a36', '#d8b048': '#e8d8a0' } },
  necro_c: { base: 'mage', build: { sx: 0.9, sy: 1.1, hs: 0.95 }, face: { shape: 'sharp', eye: 'sleepy', brow: 'angry', mouth: 'smirk', extras: ['scar'], skull: '170,230,60' },
    swap: { '#4a3a7a': '#3a4a1a', '#2e3a62': '#2a2a24', '#141a30': '#141a0a', '#1e1238': '#161e0a', '#3a2c62': '#2e3a16', '#5a4a90': '#5a6a2a', '#8a5ab0': '#b0e040', '#43306e': '#242e10', '#4e3a80': '#3a4a1a', '#f8d8bc': '#d8dcc0', '#d8b048': '#8aa030' } },
  priest_d: { base: 'priest', build: { sx: 1.04, sy: 1.0, hs: 1.0 }, face: { shape: 'square', eye: 'big', brow: 'thick', mouth: 'grin', extras: [] },
    swap: { '#f2ece0': '#e8d8c0', '#5aa0e0': '#c04a3a', '#3e6aa8': '#8a2a20', '#c88a8a': '#3a2a20', '#f2bfb8': '#d8a060', '#8a4a4a': '#2a1a10', '#4a9a7a': '#c06a2a' } },
  priest_b: { base: 'priest', build: { sx: 0.98, sy: 0.98, hs: 1.02 }, face: { shape: 'child', eye: 'big', brow: 'worried', mouth: 'open', extras: ['blushBig'] },
    swap: { '#f2ece0': '#e8f0d8', '#5aa0e0': '#6ac08a', '#3e6aa8': '#3a8a5a', '#c88a8a': '#d89a40', '#f2bfb8': '#f0d070', '#8a4a4a': '#8a5a20', '#4a9a7a': '#b07a3a' } },
  priest_c: { base: 'priest', build: { sx: 0.96, sy: 1.08, hs: 0.95 }, face: { shape: 'long', eye: 'sleepy', brow: 'thin', mouth: 'gentle', extras: [] },
    swap: { '#f2ece0': '#e0e8f8', '#5aa0e0': '#8a9ae8', '#3e6aa8': '#4a5aa8', '#d8b048': '#c8d0e0', '#ecc85a': '#d8e0f0', '#c88a8a': '#9aa8d0', '#f2bfb8': '#c8d4f0', '#8a4a4a': '#4a5a8a', '#4a9a7a': '#5a6ab8' } },
};
// 보스 임시 외형: 기존 보스·몬스터 그림에 색 필터
Object.assign(SPRITE_VARIANTS, {
  thornQueen: { base: 'ogreChief', filter: 'hue-rotate(75deg) saturate(1.3)', swap: {} },
  mistStag: { base: 'ogreChief', filter: 'grayscale(0.7) brightness(1.2) hue-rotate(180deg)', swap: {} },
  stoneGolem: { base: 'ogreChief', filter: 'grayscale(0.92) brightness(0.8) contrast(1.25) sepia(0.15)', swap: {} },
  shadowKing: { base: 'orcCaptain', filter: 'hue-rotate(230deg) saturate(0.7) brightness(0.62) contrast(1.15)', swap: {} },
  swampTurtle: { base: 'ogreChief', filter: 'hue-rotate(40deg) saturate(0.7) brightness(0.9)', swap: {} },
  thornBud: { base: 'goblinHorn', filter: 'hue-rotate(250deg) saturate(1.4)', swap: {} },
  goblinArcher: { base: 'goblin', filter: 'hue-rotate(35deg) saturate(0.8) brightness(1.05)', swap: {} },
  goblinShaman: { base: 'goblinHorn', filter: 'hue-rotate(200deg) saturate(1.2)', swap: {} },
  orcShield: { base: 'orc', filter: 'grayscale(0.6) brightness(1.1) hue-rotate(160deg)', swap: {} },
  goblinBomber: { base: 'goblin', filter: 'hue-rotate(-70deg) saturate(1.5)', swap: {} },
  goblinStalker: { base: 'goblin', filter: 'hue-rotate(220deg) saturate(1.6) brightness(0.8)', swap: {} }, // 도발 무시 · 가장 약한 아군을 노린다
  orcHunter: { base: 'orc', filter: 'hue-rotate(-50deg) saturate(1.3) brightness(1.05)', swap: {} },          // 도발 무시 · 서포터를 노린다 (원거리)
  caveTroll: { base: 'ogre', filter: 'hue-rotate(70deg) saturate(0.55) brightness(0.85)', swap: {} },
  orcBerserker: { base: 'orc', filter: 'hue-rotate(-35deg) saturate(1.9) brightness(1.05)', swap: {} },
  goblinTrapper: { base: 'goblinHorn', filter: 'hue-rotate(110deg) saturate(0.85)', swap: {} },
  knightElin: { base: 'knight', swap: {} },
  imp: { base: 'goblin', filter: 'hue-rotate(-95deg) saturate(1.8) brightness(0.95)', swap: {} },                 // 흑마술사 악마들 (임시 외형)
  voidwalker: { base: 'ogre', filter: 'hue-rotate(200deg) saturate(1.3) brightness(0.7) contrast(1.2)', swap: {} },
  succubus: { base: 'goblinStalker', filter: 'hue-rotate(110deg) saturate(1.4) brightness(1.05)', swap: {} },
  felhunter: { base: 'goblin', filter: 'hue-rotate(40deg) saturate(2) brightness(0.8) contrast(1.2)', swap: {} },
  infernal: { base: 'ogre', filter: 'hue-rotate(-80deg) saturate(1.6) brightness(0.75) contrast(1.4)', swap: {} },
  doomguard: { base: 'orcCaptain', filter: 'hue-rotate(-120deg) saturate(1.8) brightness(0.7) contrast(1.3)', swap: {} },
  voidlord: { base: 'ogreChief', filter: 'hue-rotate(210deg) saturate(1.2) brightness(0.6) contrast(1.3)', swap: {} },
  // v0.55 언데드 · 악마 (임시 외형: 기존 그림 색 변형)
  skelWarrior: { base: 'orc', filter: 'grayscale(1) sepia(0.2) brightness(1.4) contrast(1.4)', swap: {} },
  skelArcher: { base: 'goblinArcher', filter: 'grayscale(1) sepia(0.25) brightness(1.4) contrast(1.35)', swap: {} },
  wraith: { base: 'goblinStalker', filter: 'grayscale(0.6) hue-rotate(180deg) brightness(1.5) opacity(0.75)', swap: {} },
  ghoulE: { base: 'goblin', filter: 'hue-rotate(70deg) saturate(0.45) brightness(0.7) contrast(1.25)', swap: {} },
  lichAcolyte: { base: 'goblinShaman', filter: 'grayscale(0.7) hue-rotate(170deg) brightness(1.2)', swap: {} },
  boneGiant: { base: 'ogre', filter: 'grayscale(1) sepia(0.15) brightness(1.5) contrast(1.35)', swap: {} },
  lichKing: { base: 'ogreChief', filter: 'grayscale(0.85) hue-rotate(190deg) brightness(1.15) contrast(1.3)', swap: {} },
  impE: { base: 'goblin', filter: 'hue-rotate(-100deg) saturate(2) brightness(0.9)', swap: {} },
  hellhound: { base: 'orcBerserker', filter: 'hue-rotate(-30deg) saturate(1.6) brightness(0.65) contrast(1.3)', swap: {} },
  felguard: { base: 'orcCaptain', filter: 'hue-rotate(60deg) saturate(1.5) brightness(0.8) contrast(1.2)', swap: {} },
  temptress: { base: 'goblinStalker', filter: 'hue-rotate(120deg) saturate(1.5) brightness(1.1)', swap: {} },
  demonCaller: { base: 'goblinShaman', filter: 'hue-rotate(-40deg) saturate(1.6) brightness(0.8)', swap: {} },
  doomLord: { base: 'orcCaptain', filter: 'hue-rotate(-60deg) saturate(1.8) brightness(0.6) contrast(1.4)', swap: {} },
  pitLord: { base: 'ogreChief', filter: 'hue-rotate(-50deg) saturate(1.9) brightness(0.6) contrast(1.4)', swap: {} },
  skeleton: { base: 'goblin', filter: 'grayscale(1) sepia(0.25) brightness(1.45) contrast(1.4)', swap: {} },         // 네크로맨서 해골 병사
  ghoul: { base: 'goblin', filter: 'hue-rotate(60deg) saturate(0.5) brightness(0.75) contrast(1.2)', swap: {} }, // 구울
  boneGolem: { base: 'ogre', filter: 'grayscale(1) brightness(1.55) contrast(1.3) sepia(0.2)', swap: {} },    // 뼈 골렘 // 반격의 기사: 그림은 시트(02b), 이 항목은 크기 기준용
  merchant: { base: 'guide', filter: 'hue-rotate(150deg) saturate(1.4)', swap: {} }, // 마을 잡화점 상인 (임시: 길잡이 색 바꿈)
});
for (const name in SPRITE_VARIANTS) {
  const v = SPRITE_VARIANTS[name], b = ART[v.base];
  const swap = {}; for (const k in v.swap) swap[k.toLowerCase()] = v.swap[k];
  ART[name] = Object.assign(Object.create(b), { box: b.box.slice(), headBox: b.headBox.slice(), top: b.top, build: b.build || v.build ? Object.assign({}, b.build, v.build) : undefined, swap, face: v.face, filter: v.filter });
}

// 체형(build)에 맞춰 box/top/headBox를 보정 (모듈 로드 시 1회)
(function normalizeBuilds() {
  for (const name in ART) {
    const d = ART[name], bd = d.build;
    if (!bd) continue;
    const neck = bd.neck || -58;
    const hy = (y) => neck * bd.sy + (y - neck) * bd.hs;
    const [x0, y0, x1, y1] = d.box;
    d.box = [Math.min(x0 * bd.sx, x0 * bd.hs) - 2, Math.min(y0 * bd.sy, hy(y0)) - 2, Math.max(x1 * bd.sx, x1 * bd.hs) + 2, Math.max(y1, y1 * bd.sy)];
    d.top = -hy(-d.top);
    const [hx0, hy0, hx1, hy1] = d.headBox;
    d.headBox = [hx0 * bd.hs, hy(hy0), hx1 * bd.hs, hy(hy1)];
  }
})();

// ---------------------------------------------------------------- 캐시 & 그리기
const SpriteCache = {};
const _imgCache = {};

function getSprite(name) {
  const d = ART[name], sh = spriteSheetFor(name);
  return { w: (d.box[2] - d.box[0]) * UNIT_TO_PX * 0.7, h: d.top * UNIT_TO_PX * (sh ? (sh.barMul || sh.hMul || 1.18) * 0.92 : 1) }; // 3D 시트는 키가 더 크다 (머리 위 표시 위치)
}

function renderLayer(name, layer, variant, k) {
  const d = ART[name];
  const fn = d[layer];
  if (!fn) return null;
  const [x0, y0, x1, y1] = d.box;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil((x1 - x0) * k); cv.height = Math.ceil((y1 - y0) * k);
  const c = cv.getContext('2d');
  c.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
  const bd = d.build;
  if (bd) { // 체형: 몸은 (sx, sy), 머리는 목 기준으로 hs 배율
    const neck = bd.neck || -58;
    if (layer === 'head') { c.translate(0, neck * bd.sy); c.scale(bd.hs, bd.hs); c.translate(0, -neck); }
    else c.scale(bd.sx, bd.sy);
  }
  _CS = d.swap || null; _FO = d.face || null;
  if (d.filter) c.filter = d.filter;
  try { fn.call(d, c, variant === 'blink'); } finally { _CS = null; _FO = null; }
  // 통일 조명: 위 따뜻한 빛 / 아래 차가운 그림자 (모든 캐릭터 공통)
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-atop';
  const g = c.createLinearGradient(0, 0, cv.width * 0.3, cv.height);
  g.addColorStop(0, 'rgba(255,236,200,0.16)'); g.addColorStop(0.55, 'rgba(255,236,200,0)'); g.addColorStop(1, 'rgba(30,20,50,0.28)');
  c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
  if (variant === 'white' || variant === 'red' || variant === 'dark') {
    c.fillStyle = variant === 'white' ? '#ffffff' : variant === 'red' ? '#ff3a2a' : '#000000';
    c.fillRect(0, 0, cv.width, cv.height);
  }
  c.globalCompositeOperation = 'source-over';
  return cv;
}
function layerCanvas(name, layer, variant, k) {
  const key = `${name}|${layer}|${variant}|${k}`;
  if (!(key in SpriteCache)) SpriteCache[key] = renderLayer(name, layer, variant, k);
  return SpriteCache[key];
}

// 영웅마다 고정된 애니메이션 위상 — 위치(x)에 묶으면 왼쪽으로 달릴 때 동작이 느려져 미끄러져 보인다 (v0.58)
function heroPhase(id) { let h = 7; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973; return (h % 600) / 100; }
// opt: { scale, flip, t, phase, blinking, tint:'white'|'red'|'dark', tintAlpha, squash, alpha }
function drawSprite(ctx, name, x, y, opt) {
  const d = ART[name];
  const sc = opt.scale || 3;
  const ppu = sc * UNIT_TO_PX;
  const dpr = Math.max(1, Math.min(2, (typeof Game !== 'undefined' && Game.pixelRatio) || 1));
  const k = Math.ceil(ppu * dpr * 2) / 2;
  const t = opt.t || 0, ph = opt.phase || 0;
  const breathe = Math.sin(t * 2.6 + ph);
  const sy = (1 + breathe * 0.018) * (opt.squash || 1);
  const sx = (1 - breathe * 0.008) / (opt.squash ? Math.sqrt(opt.squash) : 1);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.translate(x, y);
  if (opt.flip) ctx.scale(-1, 1);
  ctx.scale(sx * ppu / k, sy * ppu / k);
  if (opt.alpha !== undefined) ctx.globalAlpha = opt.alpha;
  const sheet = spriteSheetFor(name);
  if (sheet) { // 3D 모델을 구운 동작 시트: idle / walk / cast
    const img = sheetImage(sheet);
    if (img.complete && img.naturalWidth) {
      const an = sheet.anims[opt.anim] || sheet.anims.idle;
      const f = opt.frame !== undefined && opt.anim === 'attack' && an === sheet.anims.attack ? clamp(opt.frame, 0, an.n - 1) : !an.loop && opt.animK !== undefined ? clamp(Math.floor(opt.animK * an.n), 0, an.n - 1) : Math.floor((t + ph * 0.37) * an.fps) % an.n; // 한 번짜리 동작은 진행도(animK)로
      const h = d.top * k * (sheet.hMul || 1.18), w = sheet.fw / sheet.fh * h;
      ctx.scale(1 / sx, 1 / sy); // 숨쉬기 변형은 동작 프레임이 대신한다 (찌그러짐만 유지)
      if (opt.squash) ctx.scale(1, opt.squash);
      const tintF = opt.tint === 'white' ? 'brightness(2.4) saturate(0)' : opt.tint === 'dark' ? 'brightness(0)' : opt.tint === 'red' && opt.tintAlpha ? `sepia(1) saturate(4) hue-rotate(-30deg) opacity(${1 - opt.tintAlpha * 0.5})` : '';
      if (tintF) ctx.filter = tintF;
      const fy = sheet.footY ? sheet.footY / sheet.fh : 1; // 발끝 = 프레임 안의 바닥 위치
      ctx.drawImage(img, f * sheet.fw, an.row * sheet.fh, sheet.fw, sheet.fh, -w / 2, -h * fy, w, h);
      ctx.restore(); return;
    }
  }
  const ovr = SPRITE_IMAGE_OVERRIDES[name];
  if (ovr) {
    let img = _imgCache[ovr];
    if (!img) { img = _imgCache[ovr] = new Image(); img.src = ovr; }
    if (img.complete && img.naturalWidth) { const h = d.top * k * 1.1, w = img.naturalWidth / img.naturalHeight * h; ctx.drawImage(img, -w / 2, -h, w, h); ctx.restore(); return; }
  }
  const ox = d.box[0] * k, oy = d.box[1] * k;
  const headDy = Math.sin(t * 2.6 + ph - 0.6) * 0.7 * k;
  const backDx = Math.sin(t * 2.0 + ph) * 1.1 * k;
  const v = opt.tint === 'white' ? 'white' : opt.tint === 'dark' ? 'dark' : null;
  const draw = (layer, dx, dy, vv) => { const cv = layerCanvas(name, layer, vv, k); if (cv) ctx.drawImage(cv, ox + dx, oy + dy); };
  draw('back', backDx, 0, v || 'normal');
  draw('body', 0, 0, v || 'normal');
  draw('head', 0, headDy, v || (opt.blinking ? 'blink' : 'normal'));
  if (opt.tint === 'red' && opt.tintAlpha) {
    ctx.globalAlpha = (opt.alpha === undefined ? 1 : opt.alpha) * opt.tintAlpha;
    draw('back', backDx, 0, 'red'); draw('body', 0, 0, 'red'); draw('head', 0, headDy, 'red');
  }
  ctx.restore();
}

// 3D 시트 사용 여부: SPRITE_SHEETS에 있고, 설정에서 켰을 때 (Game.settings.q3d)
function spriteSheetFor(name) {
  const s = typeof SPRITE_SHEETS !== 'undefined' && SPRITE_SHEETS[name];
  return s && (s.always || (typeof Game !== 'undefined' && Game.settings && Game.settings.q3d)) ? s : null;
}
function sheetImage(sheet) { let img = _imgCache[sheet.src]; if (!img) { img = _imgCache[sheet.src] = new Image(); img.src = sheet.src; } return img; }

// 초상화: 머리 영역(headBox)을 잘라 그린다
function drawPortrait(canvas, name, opts) {
  const d = ART[name];
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);
  const sheet = spriteSheetFor(name);
  if (sheet) { // 시트 첫 프레임의 머리 부분 (위 25%)
    const img = sheetImage(sheet), draw = () => {
      c.clearRect(0, 0, canvas.width, canvas.height); c.save();
      if (opts && opts.dead) c.filter = 'grayscale(1) brightness(0.55)';
      if (opts && opts.flip) { c.translate(canvas.width, 0); c.scale(-1, 1); }
      const P = sheet.portrait || { x: 0.53 - 0.25, y: 0, w: 0.5, h: 0.25 }, sw = sheet.fw * P.w, sh = sheet.fh * P.h, s = Math.min(canvas.width / sw, canvas.height / sh);
      c.drawImage(img, sheet.fw * P.x, sheet.fh * ((P.row || 0) + P.y), sw, sh, (canvas.width - sw * s) / 2, (canvas.height - sh * s) / 2, sw * s, sh * s);
      c.restore();
    };
    if (img.complete && img.naturalWidth) draw(); else img.addEventListener('load', draw, { once: true });
    return;
  }
  const [hx0, hy0, hx1, hy1] = d.headBox;
  const k = Math.min(canvas.width / (hx1 - hx0), canvas.height / (hy1 - hy0));
  const kk = Math.ceil(k * 4) / 2; // 2배 슈퍼샘플
  c.save();
  c.imageSmoothingEnabled = true;
  if (opts && opts.dead) c.filter = 'grayscale(1) brightness(0.55)';
  if (opts && opts.flip) { c.translate(canvas.width, 0); c.scale(-1, 1); }
  c.translate((canvas.width - (hx1 - hx0) * k) / 2, (canvas.height - (hy1 - hy0) * k) / 2);
  c.scale(k / kk, k / kk);
  const ox = (d.box[0] - hx0) * kk, oy = (d.box[1] - hy0) * kk;
  for (const layer of ['back', 'body', 'head']) { const cv = layerCanvas(name, layer, 'normal', kk); if (cv) c.drawImage(cv, ox, oy); }
  c.restore();
}
