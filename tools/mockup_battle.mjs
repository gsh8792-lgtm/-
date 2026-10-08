// 전투 UI 목업: node tools/mockup_battle.mjs outDir
// 실제 게임 스프라이트로 "얼굴 = 스킬 버튼 + 작전 명령" 전투 화면을 3가지 상황으로 그린다.
import { chromium } from 'playwright';
import fs from 'fs';
const out = process.argv[2] || 'test-output';
const js = ['00_util.js', '01_data.js', '02_sprites.js'].map((f) => fs.readFileSync('src/js/' + f, 'utf8')).join('\n');

const MOCK = String.raw`
const Game = { pixelRatio: 3 };
const W = 960, H = 540, GY = 360;
const cv = document.getElementById('c'); const S = 1.5;
cv.width = 1600 * 2; cv.height = 1080 * 2; const x = cv.getContext('2d'); x.scale(2, 2);
function rr(px, py, w, h, r, fill, stroke, lw) { x.beginPath(); x.roundRect(px, py, w, h, r); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.strokeStyle = stroke; x.lineWidth = lw || 2; x.stroke(); } }
function txt(t, px, py, size, color, align, weight) { x.font = (weight || 800) + ' ' + size + 'px "Noto Sans KR","Apple SD Gothic Neo",sans-serif'; x.textAlign = align || 'left'; x.fillStyle = color; x.fillText(t, px, py); }
function stxt(t, px, py, size, color, align) { x.font = '900 ' + size + 'px "Noto Sans KR",sans-serif'; x.textAlign = align || 'center'; x.lineWidth = 4; x.strokeStyle = '#1a0f08'; x.strokeText(t, px, py); x.fillStyle = color; x.fillText(t, px, py); }
function badge(n, px, py) { x.beginPath(); x.arc(px, py, 13, 0, 7); x.fillStyle = '#ff4d6d'; x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 2.5; x.stroke(); txt(String(n), px, py + 5, 15, '#fff', 'center', 900); }

function background(t) {
  x.fillStyle = '#231c33'; x.fillRect(0, 0, W, H);
  for (let row = 0; row < 9; row++) { const y = 40 + row * 34, off = (row % 2) * 44; for (let px = -100 + off; px < W + 100; px += 88) { x.fillStyle = row % 3 ? '#2b2340' : '#2e2642'; x.fillRect(px, y, 84, 30); } }
  for (const tx of [110, 470, 850]) { const g = x.createRadialGradient(tx, 150, 6, tx, 150, 150); g.addColorStop(0, 'rgba(255,170,80,0.42)'); g.addColorStop(1, 'rgba(255,140,60,0)'); x.fillStyle = g; x.fillRect(tx - 170, 0, 340, 340); x.fillStyle = '#5e3a20'; x.fillRect(tx - 3, 150, 6, 26); x.fillStyle = '#ff9a2a'; x.fillRect(tx - 4, 134, 8, 14); x.fillStyle = '#ffe066'; x.fillRect(tx - 2, 140, 4, 8); }
  for (const px of [290, 690]) { x.fillStyle = '#3a3152'; x.fillRect(px - 16, 70, 32, 230); x.fillStyle = '#463c62'; x.fillRect(px - 16, 70, 8, 230); }
  // 넓은 바닥 (자유 이동 공간)
  const g2 = x.createLinearGradient(0, 280, 0, 540); g2.addColorStop(0, '#3b3150'); g2.addColorStop(1, '#241d32');
  x.fillStyle = g2; x.fillRect(0, 285, W, 255);
  x.strokeStyle = 'rgba(0,0,0,0.22)'; x.lineWidth = 2;
  for (let px = -300; px < W + 300; px += 80) { x.beginPath(); x.moveTo(px, 285); x.lineTo(px * 1.35 - 160, 540); x.stroke(); }
  for (const y of [320, 365, 420, 485]) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
}
function shadow(px, py, w) { x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(px, py + 2, w, 8, 0, 0, 7); x.fill(); }
function unit(name, px, py, opt) {
  opt = opt || {};
  const sc = opt.sc || 2.6;
  shadow(px, py, ART[name].box[2] * 0.45 * sc * 0.36 + 8);
  if (opt.ring) { x.strokeStyle = opt.ring; x.lineWidth = 2.5; x.beginPath(); x.ellipse(px, py + 2, 26 * (opt.ringW || 1), 9, 0, 0, 7); x.stroke(); }
  drawSprite(x, name, px, py, { scale: sc, flip: !!opt.flip, t: opt.t || 0.3, tint: opt.tint, tintAlpha: opt.tintAlpha });
  if (opt.hp !== undefined) { const top = py - ART[name].top * 0.36 * sc - 10; const bw = opt.bw || 34; x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(px - bw / 2 - 1, top, bw + 2, 6); x.fillStyle = opt.enemy ? '#e0524a' : '#6fd86a'; x.fillRect(px - bw / 2, top + 1, bw * opt.hp, 4); }
}
function slash(px, py) { x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 3; x.beginPath(); x.arc(px, py, 26, -1.1, 0.8); x.stroke(); for (let i = 0; i < 6; i++) { const a = i; x.fillStyle = '#fff6c0'; x.fillRect(px + Math.cos(a) * 18, py + Math.sin(a) * 14, 4, 4); } }
function pop(t, px, py, c, s) { stxt(t, px, py, s || 20, c || '#fff'); }

// ---- 스킬 아이콘 (단순 벡터)
function icon(kind, cx, cy, r) {
  const col = { spin: '#ff8a6a', flurry: '#ff6a6a', leaf: '#ffd34a', shield: '#7ab8f0', bash: '#7ab8f0', slash: '#ff8a6a', heal: '#7fe0a0', tree: '#7fe0a0', star: '#ffd34a', arrow: '#f0c070', wall: '#9ad0ff', meteor: '#ffb04a' }[kind];
  const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r); g.addColorStop(0, '#5a4f8a'); g.addColorStop(1, '#2a2244');
  x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fillStyle = g; x.fill(); x.strokeStyle = col; x.lineWidth = 2; x.stroke();
  x.save(); x.translate(cx, cy); x.scale(r / 14, r / 14); x.fillStyle = col; x.strokeStyle = col; x.lineWidth = 2.4; x.lineCap = 'round';
  if (kind === 'shield' || kind === 'wall') { x.beginPath(); x.moveTo(0, -8); x.quadraticCurveTo(8, -7, 8, -4); x.quadraticCurveTo(7, 5, 0, 9); x.quadraticCurveTo(-7, 5, -8, -4); x.quadraticCurveTo(-8, -7, 0, -8); x.fill(); }
  if (kind === 'bash') { x.beginPath(); x.moveTo(-7, 6); x.lineTo(6, -7); x.stroke(); x.beginPath(); x.arc(5, -5, 4, 0, 7); x.fill(); }
  if (kind === 'slash') { x.beginPath(); x.moveTo(-7, 7); x.lineTo(7, -7); x.stroke(); x.beginPath(); x.moveTo(-3, -6); x.quadraticCurveTo(8, -2, 6, 6); x.stroke(); }
  if (kind === 'heal' || kind === 'tree') { x.fillRect(-2.5, -8, 5, 16); x.fillRect(-8, -2.5, 16, 5); }
  if (kind === 'star' || kind === 'meteor') { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? 3.5 : 8.5; x.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } x.fill(); }
  if (kind === 'spin') { x.beginPath(); x.arc(0, 0, 7, 0.3, 5.6); x.stroke(); x.beginPath(); x.moveTo(7, -5); x.lineTo(9, 1); x.lineTo(3, -1); x.fill(); x.beginPath(); x.moveTo(-3, 3); x.lineTo(3, -3); x.stroke(); }
  if (kind === 'flurry') { for (const d of [-5, 0, 5]) { x.beginPath(); x.moveTo(-7 + d, 7); x.lineTo(5 + d, -7); x.stroke(); } }
  if (kind === 'leaf') { x.beginPath(); x.moveTo(0, 9); x.quadraticCurveTo(-10, 0, 0, -9); x.quadraticCurveTo(10, 0, 0, 9); x.fill(); x.strokeStyle = '#2a2244'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, 8); x.lineTo(0, -6); x.stroke(); }
  if (kind === 'arrow') { x.beginPath(); x.moveTo(-8, 8); x.lineTo(7, -7); x.stroke(); x.beginPath(); x.moveTo(7, -7); x.lineTo(1, -6); x.lineTo(6, -1); x.fill(); }
  x.restore();
}
function cdRing(cx, cy, r, frac, col) { x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); x.closePath(); x.fillStyle = 'rgba(10,8,18,0.72)'; x.fill(); }

// ---- 캐릭터 묶음: 얼굴 + ① 기본 ② 상황 ③ 필살기
// s: [{ icon, name, frac(남은 쿨 비율), txt, state: 'auto'|'ready'|'hint'|'cool'|'drag' }, x3], hp
function group(i, hero, s, hp) {
  const gx = 8 + i * 280, gy = 438, gw = 272, gh = 96;
  rr(gx, gy, gw, gh, 14, 'rgba(30,24,46,0.94)', '#4a3f68', 2);
  // 얼굴
  const pc = document.createElement('canvas'); pc.width = 160; pc.height = 160; drawPortrait(pc, hero.sprite, {});
  x.save(); x.beginPath(); x.roundRect(gx + 6, gy + 6, 58, 58, 10); x.fillStyle = '#3a3052'; x.fill(); x.clip(); x.drawImage(pc, gx + 2, gy + 2, 66, 66); x.restore();
  x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(gx + 7, gy + 69, 56, 7); x.fillStyle = hp < 0.35 ? '#e0a040' : '#6fd86a'; x.fillRect(gx + 8, gy + 70, 54 * hp, 5);
  txt(hero.name, gx + 35, gy + 90, 13, '#f3ead8', 'center', 900);
  const centers = [];
  s.forEach((k, j) => {
    const big = j === 2;
    const bw = big ? 70 : 64, bx = gx + 70 + j * 66 + (j === 2 ? 0 : 0), by = gy + 6;
    const col = j === 2 ? '#ffd34a' : j === 1 ? '#7ab8f0' : '#b8a8ff';
    const glow = k.state === 'ready' || k.state === 'hint' || k.state === 'drag';
    if (glow) { const g = x.createRadialGradient(bx + bw / 2, by + 32, 6, bx + bw / 2, by + 32, 60); g.addColorStop(0, k.state === 'hint' ? 'rgba(122,184,240,0.55)' : 'rgba(255,211,74,0.55)'); g.addColorStop(1, 'rgba(255,211,74,0)'); x.fillStyle = g; x.fillRect(bx - 30, by - 30, bw + 60, 130); }
    rr(bx, by, bw, 84, 12, j === 2 ? 'rgba(90,40,50,0.95)' : 'rgba(46,37,69,0.98)', glow ? (k.state === 'hint' ? '#9fd0ff' : '#ffd34a') : '#4a3f68', glow ? 3 : 2);
    icon(k.icon, bx + bw / 2, by + 30, 21);
    if (k.state === 'cool' || (k.state === 'auto' && k.frac > 0)) { cdRing(bx + bw / 2, by + 30, 21, k.frac); txt(k.txt || '', bx + bw / 2, by + 36, 15, '#fff', 'center', 900); }
    txt(k.name, bx + bw / 2, by + 66, 11, '#f3ead8', 'center', 800);
    if (k.state === 'auto') { rr(bx + 4, by + 70, bw - 8, 12, 6, 'rgba(120,160,255,0.25)'); txt('① AUTO', bx + bw / 2, by + 80, 9, '#9fd0ff', 'center', 900); }
    else txt(j === 0 ? '① 기본' : j === 1 ? '② 상황' : '③ 필살기', bx + bw / 2, by + 80, 9, col, 'center', 900);
    if (k.state === 'ready') { rr(bx + 8, by - 13, bw - 16, 18, 9, '#ffd34a'); txt(k.tag || '탭!', bx + bw / 2, by + 1, 11, '#2b1d10', 'center', 900); }
    if (k.state === 'hint') { rr(bx + 4, by - 13, bw - 8, 18, 9, '#9fd0ff'); txt(k.tag || '추천!', bx + bw / 2, by + 1, 11, '#10223a', 'center', 900); }
    if (k.state === 'drag') { rr(bx + 4, by - 13, bw - 8, 18, 9, '#9cf0a8'); txt('끄는 중', bx + bw / 2, by + 1, 11, '#0e2a14', 'center', 900); }
    centers.push({ cx: bx + bw / 2, cy: by + 30 });
  });
  return centers;
}
function topBar(stage, extra) {
  const g = x.createLinearGradient(0, 0, 0, 56); g.addColorStop(0, 'rgba(14,10,22,0.92)'); g.addColorStop(1, 'rgba(14,10,22,0.4)'); x.fillStyle = g; x.fillRect(0, 0, W, 56);
  txt(stage, 14, 32, 16, '#f3ead8');
  rr(420, 8, 120, 42, 10, null, null); txt('❚❚ 일시정지', 480, 36, 16, '#f3ead8', 'center');
  rr(722, 8, 54, 42, 10, '#2e2545', '#4a3f68'); txt('1x', 749, 35, 15, '#f3ead8', 'center');
  rr(784, 8, 164, 42, 10, '#15111f', '#4a3f68'); rr(788, 12, 78, 34, 8, '#ffd96a'); txt('전략 ON', 827, 35, 13, '#2b1d10', 'center', 900); txt('끄기', 905, 35, 13, '#a99cc0', 'center');
  if (extra) extra();
}
function chips(list, focusIdx) {
  txt('적', 556, 82, 13, '#a99cc0', 'right');
  list.forEach(([name, hp, charging], i) => {
    const px = 566 + i * 96, py = 62, w = 90, h = 40;
    rr(px, py, w, h, 9, 'rgba(36,28,54,0.94)', focusIdx === i ? '#ff4d6d' : charging ? '#ff5a3a' : '#4a3f68', focusIdx === i || charging ? 3 : 2);
    const pc = document.createElement('canvas'); pc.width = 64; pc.height = 64; drawPortrait(pc, name, { flip: true });
    x.drawImage(pc, px + 3, py + 4, 32, 32);
    x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(px + 38, py + 10, 46, 6); x.fillStyle = '#e0524a'; x.fillRect(px + 39, py + 11, 44 * hp, 4);
    if (charging) { x.fillStyle = '#ff5a3a'; x.fillRect(px + 38, py + 24, 46 * charging, 5); }
    if (focusIdx === i) txt('집중', px + 61, py + 33, 10, '#ff8aa0', 'center', 900);
  });
}
// 작전 명령: 오른쪽 세로
function orders(sel) {
  txt('작전', 916, 248, 12, '#a99cc0', 'center');
  ['돌격', '대형', '후퇴'].forEach((l, i) => { const px = 878, py = 256 + i * 58; rr(px, py, 76, 52, 12, i === sel ? '#ffd96a' : 'rgba(46,37,69,0.96)', i === sel ? '#fff0a0' : '#4a3f68', 2); txt(l, px + 38, py + 33, 16, i === sel ? '#2b1d10' : '#f3ead8', 'center', 900); });
}
function hudBase() {
  const g = x.createLinearGradient(0, 410, 0, 540); g.addColorStop(0, 'rgba(14,10,22,0)'); g.addColorStop(0.3, 'rgba(14,10,22,0.6)'); g.addColorStop(1, 'rgba(14,10,22,0.9)'); x.fillStyle = g; x.fillRect(0, 400, W, 140);
}
function topBarP(stage) { topBar(stage); rr(664, 8, 52, 42, 10, '#2e2545', '#4a3f68'); txt('🧪2', 690, 35, 14, '#fff', 'center'); }
function reticle(px, py, r, col) { x.strokeStyle = col; x.lineWidth = 3; x.beginPath(); x.arc(px, py, r, 0, 7); x.stroke(); for (const a of [0, 1.57, 3.14, 4.71]) { x.beginPath(); x.moveTo(px + Math.cos(a) * (r - 6), py + Math.sin(a) * (r - 6)); x.lineTo(px + Math.cos(a) * (r + 8), py + Math.sin(a) * (r + 8)); x.stroke(); } }
function dashTo(x0, y0, x1, y1, col, w) { x.setLineDash([8, 6]); x.strokeStyle = col; x.lineWidth = w || 2; x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 50, x1, y1); x.stroke(); x.setLineDash([]); }

const HERO = { knight: { name: '토비', role: '탱커', sprite: 'knight' }, sword: { name: '단비', role: '근딜', sprite: 'sword' }, priest: { name: '보리', role: '서포터', sprite: 'priest' } };
const SK = {
  tobi:  [{ icon: 'shield', name: '도발' }, { icon: 'bash', name: '방패 강타' }, { icon: 'wall', name: '철벽' }],
  danbi: [{ icon: 'slash', name: '급소 베기' }, { icon: 'spin', name: '회전 베기' }, { icon: 'flurry', name: '난도질' }],
  bori:  [{ icon: 'heal', name: '치유' }, { icon: 'tree', name: '광역 치유' }, { icon: 'leaf', name: '생명의 나무' }],
};
const st = (base, arr) => base.map((b, i) => Object.assign({}, b, arr[i]));

// =============================================== 화면 그리기 (논리 960×540)
function frame(kind) {
  background();
  if (kind === 'normal') {
    unit('ogre', 790, 352, { flip: true, hp: 0.8, enemy: true, bw: 54, sc: 2.4 });
    unit('goblin', 640, 398, { flip: true, hp: 0.35, enemy: true });
    unit('orc', 560, 372, { flip: true, hp: 0.6, enemy: true, ring: '#ff4d6d', ringW: 1.3 });
    unit('goblinHorn', 690, 334, { flip: true, hp: 0.9, enemy: true });
    unit('priest', 250, 356, { hp: 0.9 });
    unit('knight', 505, 378, { hp: 0.7 });
    unit('sword', 600, 414, { hp: 0.8 });
    slash(560, 348); pop('48', 610, 296, '#fff', 22); pop('112!', 640, 340, '#ffd34a', 28);
    reticle(560, 326, 34, '#ff4d6d'); stxt('집중 공격', 560, 276, 15, '#ff8aa0');
    dashTo(250, 286, 515, 332, 'rgba(140,240,170,0.7)', 2); pop('+64', 505, 286, '#6fe08a', 20);
    topBarP('던전 3/5 · 웨이브 1/2');
    chips([['orc', 0.6], ['goblin', 0.35], ['goblinHorn', 0.9], ['ogre', 0.8]], 0);
    hudBase();
    group(0, HERO.knight, st(SK.tobi, [{ state: 'auto', frac: 0.4, txt: '4' }, { state: 'cool', frac: 0.5, txt: '6' }, { state: 'cool', frac: 0.6, txt: '62%' }]), 0.7);
    group(1, HERO.sword, st(SK.danbi, [{ state: 'auto', frac: 0.7, txt: '3' }, { state: 'hint', tag: '적 3+ 추천' }, { state: 'ready', tag: '탭!' }]), 0.8);
    group(2, HERO.priest, st(SK.bori, [{ state: 'auto', frac: 0.2, txt: '1' }, { state: 'cool', frac: 0.3, txt: '4' }, { state: 'cool', frac: 0.8, txt: '20%' }]), 0.9);
    orders(1);
    badge(1, 86, 430); badge(2, 152, 430); badge(3, 222, 430); badge(4, 616, 52); badge(5, 868, 244); badge(6, 770, 29);
  }
  if (kind === 'drag') {
    unit('ogre', 790, 352, { flip: true, hp: 0.8, enemy: true, bw: 54, sc: 2.4 });
    unit('goblin', 650, 398, { flip: true, hp: 0.35, enemy: true });
    unit('orc', 560, 372, { flip: true, hp: 0.25, enemy: true });
    unit('priest', 250, 356, { hp: 0.9 });
    unit('knight', 470, 378, { hp: 0.22, ring: '#9cf0a8', ringW: 1.6 });
    unit('sword', 590, 414, { hp: 0.3, ring: '#9cf0a8', ringW: 1.4 });
    x.fillStyle = 'rgba(30,60,90,0.28)'; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(120,240,150,0.18)'; x.beginPath(); x.ellipse(530, 396, 110, 32, 0, 0, 7); x.fill();
    x.setLineDash([8, 6]); x.strokeStyle = '#9cf0a8'; x.lineWidth = 2.5; x.beginPath(); x.ellipse(530, 396, 110, 32, 0, 0, 7); x.stroke(); x.setLineDash([]);
    topBarP('던전 3/5 · 웨이브 1/2');
    chips([['orc', 0.25], ['goblin', 0.35], ['ogre', 0.8]], -1);
    rr(330, 120, 300, 40, 20, 'rgba(20,30,60,0.92)', '#7ab8f0', 2); txt('⏸  슬로모션 0.25x  ·  대상 지정 중', 480, 146, 15, '#cfe6ff', 'center', 900);
    hudBase();
    group(0, HERO.knight, st(SK.tobi, [{ state: 'auto', frac: 0.6, txt: '5' }, { state: 'cool', frac: 0.4, txt: '5' }, { state: 'cool', frac: 0.5, txt: '50%' }]), 0.22);
    group(1, HERO.sword, st(SK.danbi, [{ state: 'auto', frac: 0.2, txt: '1' }, { state: 'cool', frac: 0.7, txt: '9' }, { state: 'cool', frac: 0.3, txt: '70%' }]), 0.3);
    const c = group(2, HERO.priest, st(SK.bori, [{ state: 'auto', frac: 0.5, txt: '3' }, { state: 'drag' }, { state: 'cool', frac: 0.6, txt: '40%' }]), 0.9);
    x.strokeStyle = 'rgba(156,240,168,0.95)'; x.lineWidth = 5; x.setLineDash([2, 10]); x.lineCap = 'round';
    x.beginPath(); x.moveTo(c[1].cx, c[1].cy - 30); x.quadraticCurveTo(720, 330, 545, 396); x.stroke(); x.setLineDash([]);
    icon('tree', 530, 392, 20);
    x.font = '34px sans-serif'; x.textAlign = 'center'; x.fillText('👆', 548, 436);
    stxt('② 광역 치유 — 놓으면 시전 / 버튼으로 되돌리면 취소', 470, 240, 15, '#c8ffd2');
    orders(1);
  }
  if (kind === 'danger') {
    x.fillStyle = 'rgba(220,40,30,0.32)'; x.beginPath(); x.ellipse(520, 392, 190, 44, 0, 0, 7); x.fill();
    x.setLineDash([8, 5]); x.strokeStyle = '#ff7a5a'; x.lineWidth = 3; x.beginPath(); x.ellipse(520, 392, 190, 44, 0, 0, 7); x.stroke(); x.setLineDash([]);
    x.fillStyle = 'rgba(255,60,40,0.3)'; x.beginPath(); x.ellipse(520, 392, 120, 28, 0, 0, 7); x.fill();
    unit('goblin', 680, 404, { flip: true, hp: 0.6, enemy: true });
    unit('ogre', 720, 352, { flip: true, hp: 0.7, enemy: true, bw: 54, sc: 2.4, tint: 'white' });
    stxt('!', 720, 218, 44, '#ffd34a');
    unit('priest', 250, 356, { hp: 0.8 });
    unit('sword', 470, 404, { hp: 0.7 });
    unit('knight', 560, 378, { hp: 0.8, ring: '#ffd34a', ringW: 1.3 });
    const g = x.createRadialGradient(480, 270, 240, 480, 270, 560); g.addColorStop(0, 'rgba(200,0,0,0)'); g.addColorStop(1, 'rgba(200,0,0,0.35)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    topBarP('던전 4/5 · 웨이브 2/2');
    chips([['ogre', 0.7, 0.6], ['goblin', 0.6]], -1);
    rr(250, 116, 460, 58, 14, 'rgba(90,10,10,0.92)', '#ff8a6a', 2.5);
    txt('⚠ 오우거 차지 공격!  1.4초', 480, 145, 21, '#ffd2c4', 'center', 900);
    txt('슬로모션 0.5x · 기절시키면 캔슬', 480, 165, 13, '#ffb0a0', 'center', 700);
    hudBase();
    const c = group(0, HERO.knight, st(SK.tobi, [{ state: 'auto', frac: 0.3, txt: '2' }, { state: 'ready', tag: '지금!' }, { state: 'cool', frac: 0.4, txt: '60%' }]), 0.8);
    group(1, HERO.sword, st(SK.danbi, [{ state: 'auto', frac: 0.5, txt: '3' }, { state: 'cool', frac: 0.5, txt: '7' }, { state: 'cool', frac: 0.5, txt: '50%' }]), 0.7);
    group(2, HERO.priest, st(SK.bori, [{ state: 'auto', frac: 0.8, txt: '4' }, { state: 'cool', frac: 0.3, txt: '3' }, { state: 'cool', frac: 0.3, txt: '70%' }]), 0.8);
    dashTo(c[1].cx, c[1].cy - 30, 700, 280, 'rgba(255,211,74,0.9)', 3);
    stxt('② 방패 강타 → 차지 중인 적 자동 지정', 430, 236, 15, '#ffe9a0');
    orders(2);
  }
}

// =============================================== 시트 (화면 1.5배 + 설명)
function sheet(kind, title, notes) {
  x.fillStyle = '#efebe4'; x.fillRect(0, 0, 1600, 1080);
  txt(title, 80, 52, 30, '#3a2a3a', 'left', 900);
  x.save(); x.translate(80, 76); x.scale(S, S);
  x.beginPath(); x.rect(0, 0, W, H); x.clip();
  frame(kind);
  x.restore();
  x.strokeStyle = '#2a2236'; x.lineWidth = 4; x.strokeRect(80, 76, W * S, H * S);
  notes.forEach((n, i) => { const col = i % 2, row = Math.floor(i / 2); const px = 80 + col * 730, py = 922 + row * 46; if (n[0]) badge(n[0], px + 12, py - 6); txt(n[1], px + 34, py, 16, '#3a2a3a', 'left', 700); });
}
window.render = (kind) => {
  const T = {
    normal: ['① 평상시 전투 — 캐릭터마다 ① 기본 · ② 상황 · ③ 필살기', [
      [1, '① 기본 스킬: 직업 주력기. 쿨 짧음. 전략 ON이면 AUTO로 알아서 사용'], [2, '② 상황 스킬: 쓸 타이밍이 오면 "추천"으로 빛남 (예: 적 3마리 이상 → 회전 베기)'],
      [3, '③ 필살기: 게이지가 차면 금색으로 빛남 → 탭'], [4, '적 칩 탭 = 파티 전원 집중 공격 대상'],
      [5, '작전 명령(돌격/대형/후퇴)은 오른쪽 세로로 이동'], [6, '전략 ON/끄기: 끄면 ①도 직접 눌러서 사용']]],
    drag: ['② 버튼을 끌어서 원하는 곳에 시전', [
      [0, '스킬 버튼을 길게 누르고 끌면 슬로모션(0.25x) → 놓는 곳에 범위/대상 지정'], [0, '버튼 위로 되돌리면 취소. 탭만 하면 자동 대상으로 즉시 시전'],
      [0, '범위 안에 들어오는 아군에 초록 링 표시'], [0, '①②③ 모두 같은 방식: 탭 = 즉시, 끌기 = 직접 지정']]],
    danger: ['③ 위험 순간 — ② 상황 스킬이 "지금!"으로 강조', [
      [0, '오우거 차지 → 바닥 위험 범위 + 화면 가장자리 붉게 + 0.5x 슬로모션'], [0, '대응 스킬(토비 ② 방패 강타)만 "지금!"으로 강조, 남은 시간 표시'],
      [0, '탭하면 차지 중인 적에게 자동 지정 → 기절로 캔슬'], [0, '평소 전투 속도는 그대로, 위험 순간만 느려짐']]],
  }[kind];
  sheet(kind, T[0], T[1]);
};
`;

const html = `<html><head><meta charset="utf-8"><style>body{margin:0;background:#efebe4}canvas{width:1600px;height:1080px;display:block}</style></head><body><canvas id="c"></canvas><script>${js}\n${MOCK}</script></body></html>`;
const b = await chromium.launch();
for (const kind of ['normal', 'drag', 'danger']) {
  const p = await b.newPage({ viewport: { width: 1600, height: 1080 } });
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.setContent(html);
  await p.evaluate((k) => window.render(k), kind);
  await p.screenshot({ path: `${out}/mockup_${kind}.png` });
  await p.close();
}
await b.close();
console.log('ok');
