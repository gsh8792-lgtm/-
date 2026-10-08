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
  const col = { shield: '#7ab8f0', bash: '#7ab8f0', slash: '#ff8a6a', heal: '#7fe0a0', tree: '#7fe0a0', star: '#ffd34a', arrow: '#f0c070', wall: '#9ad0ff', meteor: '#ffb04a' }[kind];
  const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r); g.addColorStop(0, '#5a4f8a'); g.addColorStop(1, '#2a2244');
  x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fillStyle = g; x.fill(); x.strokeStyle = col; x.lineWidth = 2; x.stroke();
  x.save(); x.translate(cx, cy); x.scale(r / 14, r / 14); x.fillStyle = col; x.strokeStyle = col; x.lineWidth = 2.4; x.lineCap = 'round';
  if (kind === 'shield' || kind === 'wall') { x.beginPath(); x.moveTo(0, -8); x.quadraticCurveTo(8, -7, 8, -4); x.quadraticCurveTo(7, 5, 0, 9); x.quadraticCurveTo(-7, 5, -8, -4); x.quadraticCurveTo(-8, -7, 0, -8); x.fill(); }
  if (kind === 'bash') { x.beginPath(); x.moveTo(-7, 6); x.lineTo(6, -7); x.stroke(); x.beginPath(); x.arc(5, -5, 4, 0, 7); x.fill(); }
  if (kind === 'slash') { x.beginPath(); x.moveTo(-7, 7); x.lineTo(7, -7); x.stroke(); x.beginPath(); x.moveTo(-3, -6); x.quadraticCurveTo(8, -2, 6, 6); x.stroke(); }
  if (kind === 'heal' || kind === 'tree') { x.fillRect(-2.5, -8, 5, 16); x.fillRect(-8, -2.5, 16, 5); }
  if (kind === 'star' || kind === 'meteor') { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? 3.5 : 8.5; x.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } x.fill(); }
  if (kind === 'arrow') { x.beginPath(); x.moveTo(-8, 8); x.lineTo(7, -7); x.stroke(); x.beginPath(); x.moveTo(7, -7); x.lineTo(1, -6); x.lineTo(6, -1); x.fill(); }
  x.restore();
}
function cdRing(cx, cy, r, frac, col) { x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); x.closePath(); x.fillStyle = 'rgba(10,8,18,0.72)'; x.fill(); }

// ---- 얼굴 카드 (= 필살기 버튼)
function card(i, hero, opt) {
  const px = 12 + i * 112, py = 412, w = 104, h = 118;
  const ready = opt.ready;
  if (ready) { const g = x.createRadialGradient(px + w / 2, py + h / 2, 10, px + w / 2, py + h / 2, 90); g.addColorStop(0, 'rgba(255,211,74,0.45)'); g.addColorStop(1, 'rgba(255,211,74,0)'); x.fillStyle = g; x.fillRect(px - 40, py - 40, w + 80, h + 80); }
  rr(px, py, w, h, 14, 'rgba(46,37,69,0.96)', ready ? '#ffd34a' : '#4a3f68', ready ? 3.5 : 2);
  if (opt.dragging) rr(px, py, w, h, 14, 'rgba(255,255,255,0.12)', '#9cf0a8', 3);
  const pc = document.createElement('canvas'); pc.width = 160; pc.height = 160; drawPortrait(pc, hero.sprite, {});
  x.save(); x.beginPath(); x.roundRect(px + 6, py + 6, w - 12, 66, 10); x.fillStyle = '#3a3052'; x.fill(); x.clip(); x.drawImage(pc, px + w / 2 - 40, py - 2, 80, 80); x.restore();
  // 필살기 아이콘 (우상단 크게)
  icon(opt.ult, px + w - 16, py + 16, 15); if (!ready) cdRing(px + w - 16, py + 16, 15, opt.ultFrac, '#000');
  if (!ready) txt(opt.ultTxt, px + w - 16, py + 21, 12, '#fff', 'center', 900);
  // 자동 스킬 (좌상단 작게, AUTO)
  icon(opt.auto, px + 15, py + 15, 10); cdRing(px + 15, py + 15, 10, opt.autoFrac);
  txt('AUTO', px + 15, py + 33, 8, '#9fd0ff', 'center', 900);
  // HP / 이름
  x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(px + 8, py + 78, w - 16, 8); x.fillStyle = opt.hp < 0.35 ? '#e0a040' : '#6fd86a'; x.fillRect(px + 9, py + 79, (w - 18) * opt.hp, 6);
  txt(hero.name, px + w / 2, py + 104, 14, '#f3ead8', 'center', 900);
  txt(hero.role, px + w / 2, py + 115, 9, '#a99cc0', 'center', 700);
  if (ready) { rr(px + 18, py - 14, w - 36, 20, 10, '#ffd34a'); txt(opt.readyTxt || '탭!', px + w / 2, py + 1, 12, '#2b1d10', 'center', 900); }
  return { cx: px + w / 2, cy: py + 40 };
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
function orders(sel) {
  const labels = ['돌격', '대형', '후퇴'];
  txt('작전', 662, 438, 12, '#a99cc0', 'left');
  labels.forEach((l, i) => { const px = 660 + i * 84, py = 446; rr(px, py, 76, 64, 12, i === sel ? '#ffd96a' : 'rgba(46,37,69,0.96)', i === sel ? '#fff0a0' : '#4a3f68', 2); txt(l, px + 38, py + 40, 17, i === sel ? '#2b1d10' : '#f3ead8', 'center', 900); });
  rr(916, 446, 34, 64, 10, 'rgba(46,37,69,0.96)', '#4a3f68'); txt('🧪', 933, 484, 15, '#fff', 'center');
}
function hudBase() {
  const g = x.createLinearGradient(0, 400, 0, 540); g.addColorStop(0, 'rgba(14,10,22,0)'); g.addColorStop(0.35, 'rgba(14,10,22,0.55)'); g.addColorStop(1, 'rgba(14,10,22,0.85)'); x.fillStyle = g; x.fillRect(0, 380, W, 160);
}
function reticle(px, py, r, col) { x.strokeStyle = col; x.lineWidth = 3; x.beginPath(); x.arc(px, py, r, 0, 7); x.stroke(); for (const a of [0, 1.57, 3.14, 4.71]) { x.beginPath(); x.moveTo(px + Math.cos(a) * (r - 6), py + Math.sin(a) * (r - 6)); x.lineTo(px + Math.cos(a) * (r + 8), py + Math.sin(a) * (r + 8)); x.stroke(); } }
function dashTo(x0, y0, x1, y1, col, w) { x.setLineDash([8, 6]); x.strokeStyle = col; x.lineWidth = w || 2; x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 50, x1, y1); x.stroke(); x.setLineDash([]); }

const HERO = { knight: { name: '토비', role: '탱커', sprite: 'knight' }, sword: { name: '단비', role: '근딜', sprite: 'sword' }, priest: { name: '보리', role: '서포터', sprite: 'priest' } };

// =============================================== 화면 그리기 (논리 960×540)
function frame(kind) {
  background();
  if (kind === 'normal') {
    // 자유 이동 난전: 탱커는 오크와 맞붙고, 검사는 옆으로 돌아 고블린, 사제는 뒤에서
    unit('ogre', 800, 352, { flip: true, hp: 0.8, enemy: true, bw: 54, sc: 2.4 });
    unit('goblin', 640, 404, { flip: true, hp: 0.35, enemy: true });
    unit('orc', 560, 376, { flip: true, hp: 0.6, enemy: true, ring: '#ff4d6d', ringW: 1.3 });
    unit('goblinHorn', 690, 338, { flip: true, hp: 0.9, enemy: true });
    unit('priest', 250, 360, { hp: 0.9, ring: null });
    unit('knight', 510, 382, { hp: 0.7 });
    unit('sword', 600, 420, { hp: 0.8 });
    slash(560, 352); pop('48', 610, 300, '#fff', 22); pop('112!', 640, 344, '#ffd34a', 28);
    reticle(560, 330, 34, '#ff4d6d'); stxt('집중 공격', 560, 280, 15, '#ff8aa0');
    dashTo(250, 290, 520, 336, 'rgba(140,240,170,0.7)', 2); pop('+64', 510, 290, '#6fe08a', 20);
    topBar('던전 3/5 · 웨이브 1/2');
    chips([['orc', 0.6], ['goblin', 0.35], ['goblinHorn', 0.9], ['ogre', 0.8]], 0);
    hudBase();
    card(0, HERO.knight, { ult: 'bash', auto: 'shield', ultFrac: 0.55, ultTxt: '7', autoFrac: 0.3, hp: 0.7 });
    card(1, HERO.sword, { ult: 'slash', auto: 'slash', ultFrac: 0, ultTxt: '', autoFrac: 0.7, hp: 0.8, ready: true, readyTxt: '탭!' });
    card(2, HERO.priest, { ult: 'tree', auto: 'heal', ultFrac: 0.8, ultTxt: '12', autoFrac: 0.1, hp: 0.9 });
    orders(1);
    badge(1, 30, 400); badge(2, 616, 52); badge(3, 600, 318); badge(4, 650, 432); badge(5, 770, 29); badge(6, 116, 448);
  }
  if (kind === 'drag') {
    unit('ogre', 800, 352, { flip: true, hp: 0.8, enemy: true, bw: 54, sc: 2.4 });
    unit('goblin', 640, 404, { flip: true, hp: 0.35, enemy: true });
    unit('orc', 560, 376, { flip: true, hp: 0.25, enemy: true });
    unit('priest', 250, 360, { hp: 0.9 });
    unit('knight', 470, 382, { hp: 0.22, ring: '#9cf0a8', ringW: 1.6 });
    unit('sword', 600, 420, { hp: 0.3, ring: '#9cf0a8', ringW: 1.4 });
    // 슬로모션 표시
    x.fillStyle = 'rgba(30,60,90,0.28)'; x.fillRect(0, 0, W, H);
    // 범위 원
    x.fillStyle = 'rgba(120,240,150,0.18)'; x.beginPath(); x.ellipse(535, 400, 110, 34, 0, 0, 7); x.fill();
    x.setLineDash([8, 6]); x.strokeStyle = '#9cf0a8'; x.lineWidth = 2.5; x.beginPath(); x.ellipse(535, 400, 110, 34, 0, 0, 7); x.stroke(); x.setLineDash([]);
    topBar('던전 3/5 · 웨이브 1/2');
    chips([['orc', 0.25], ['goblin', 0.35], ['ogre', 0.8]], -1);
    hudBase();
    card(0, HERO.knight, { ult: 'bash', auto: 'shield', ultFrac: 0.4, ultTxt: '5', autoFrac: 0.6, hp: 0.22 });
    card(1, HERO.sword, { ult: 'slash', auto: 'slash', ultFrac: 0.7, ultTxt: '14', autoFrac: 0.2, hp: 0.3 });
    const c = card(2, HERO.priest, { ult: 'tree', auto: 'heal', ultFrac: 0, hp: 0.9, ready: true, readyTxt: '끄는 중', dragging: true });
    // 끌기 경로 + 손가락
    x.strokeStyle = 'rgba(156,240,168,0.95)'; x.lineWidth = 5; x.setLineDash([2, 10]); x.lineCap = 'round';
    x.beginPath(); x.moveTo(c.cx, c.cy - 30); x.quadraticCurveTo(380, 330, 530, 396); x.stroke(); x.setLineDash([]);
    icon('tree', 535, 396, 20);
    x.font = '34px sans-serif'; x.textAlign = 'center'; x.fillText('👆', 552, 440);
    stxt('생명의 나무 — 놓으면 시전 / 카드로 되돌리면 취소', 500, 456, 14, '#c8ffd2');
    rr(330, 120, 300, 40, 20, 'rgba(20,30,60,0.92)', '#7ab8f0', 2); txt('⏸  슬로모션 0.25x  ·  대상 지정 중', 480, 146, 15, '#cfe6ff', 'center', 900);
    orders(1);
  }
  if (kind === 'danger') {
    // 위험 범위
    x.fillStyle = 'rgba(220,40,30,0.32)'; x.beginPath(); x.ellipse(520, 395, 190, 46, 0, 0, 7); x.fill();
    x.setLineDash([8, 5]); x.strokeStyle = '#ff7a5a'; x.lineWidth = 3; x.beginPath(); x.ellipse(520, 395, 190, 46, 0, 0, 7); x.stroke(); x.setLineDash([]);
    x.fillStyle = 'rgba(255,60,40,0.3)'; x.beginPath(); x.ellipse(520, 395, 120, 29, 0, 0, 7); x.fill();
    unit('goblin', 680, 410, { flip: true, hp: 0.6, enemy: true });
    unit('ogre', 720, 356, { flip: true, hp: 0.7, enemy: true, bw: 54, sc: 2.4, tint: 'white' });
    stxt('!', 720, 222, 44, '#ffd34a');
    unit('priest', 250, 360, { hp: 0.8 });
    unit('sword', 470, 410, { hp: 0.7 });
    unit('knight', 560, 382, { hp: 0.8, ring: '#ffd34a', ringW: 1.3 });
    // 화면 테두리 붉은 경고
    const g = x.createRadialGradient(480, 270, 240, 480, 270, 560); g.addColorStop(0, 'rgba(200,0,0,0)'); g.addColorStop(1, 'rgba(200,0,0,0.35)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    topBar('던전 4/5 · 웨이브 2/2');
    chips([['ogre', 0.7, 0.6], ['goblin', 0.6]], -1);
    rr(250, 116, 460, 58, 14, 'rgba(90,10,10,0.92)', '#ff8a6a', 2.5);
    txt('⚠ 오우거 차지 공격!  1.4초', 480, 145, 21, '#ffd2c4', 'center', 900);
    txt('슬로모션 0.5x · 기절시키면 캔슬', 480, 165, 13, '#ffb0a0', 'center', 700);
    hudBase();
    card(0, HERO.knight, { ult: 'bash', auto: 'shield', ultFrac: 0, hp: 0.8, ready: true, readyTxt: '지금 탭!' });
    card(1, HERO.sword, { ult: 'slash', auto: 'slash', ultFrac: 0.5, ultTxt: '9', autoFrac: 0.4, hp: 0.7 });
    card(2, HERO.priest, { ult: 'tree', auto: 'heal', ultFrac: 0.3, ultTxt: '4', autoFrac: 0.8, hp: 0.8 });
    dashTo(68, 396, 700, 290, 'rgba(255,211,74,0.9)', 3);
    stxt('방패 강타 → 차지 중인 적 자동 지정', 380, 236, 15, '#ffe9a0');
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
    normal: ['① 평상시 전투 — 자유 이동 난전 + 얼굴 카드 3장', [
      [1, '얼굴 카드 = 필살기 버튼. 빛나면 탭 한 번으로 시전 (대상 자동)'], [2, '적 칩: 탭하면 파티 전원 집중 공격 대상 지정'],
      [3, '캐릭터들이 자유롭게 움직이며 겹쳐 싸움 (집중 대상 표시)'], [4, '작전 명령 3개: 돌격 / 대형 유지 / 후퇴'],
      [5, '전략 ON: 자동 스킬(AUTO)은 설정한 규칙대로 알아서 사용'], [6, '카드 좌상단 작은 아이콘 = 자동 스킬 쿨타임, 우상단 = 필살기']]],
    drag: ['② 얼굴 카드를 끌어서 원하는 곳에 시전', [
      [0, '카드를 길게 누르고 끌면 슬로모션(0.25x) → 놓는 곳에 범위/대상 지정'], [0, '카드 위로 되돌리면 취소. 탭만 하면 자동 대상으로 즉시 시전'],
      [0, '범위 안에 들어오는 아군에 초록 링 표시'], [0, '버튼을 찾을 필요 없이 "누구의 스킬을, 어디에"만 고민']]],
    danger: ['③ 위험 순간 — 경고 + 슬로모션으로 반응 시간 확보', [
      [0, '오우거가 번쩍이며 차지 → 바닥에 위험 범위, 화면 가장자리 붉게'], [0, '자동으로 0.5x 슬로모션 + 남은 시간 표시 (평소 전투 속도는 그대로)'],
      [0, '대응 가능한 카드(토비 방패 강타)가 "지금 탭!"으로 강조'], [0, '탭하면 차지 중인 적에게 자동 지정 → 기절로 캔슬']]],
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
