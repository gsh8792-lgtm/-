// 캐릭터/몬스터 시안 시트: node tools/concept_sheet.mjs outDir
import { chromium } from 'playwright';
import fs from 'fs';
const out = process.argv[2] || 'test-output';
const js = ['00_util.js', '01_data.js', '02_sprites.js'].map((f) => fs.readFileSync('src/js/' + f, 'utf8')).join('\n');
const page = (body, h) => `<html><head><meta charset="utf-8"><style>
body{margin:0;font-family:"Noto Sans KR","Apple SD Gothic Neo",sans-serif;background:#f4f1ea}
.sheet{position:relative;width:1600px;height:${h}px;background:radial-gradient(ellipse at 50% 35%,#ffffff 0%,#ebe7df 55%,#cfcac0 100%);overflow:hidden}
h1{position:absolute;left:40px;top:22px;margin:0;font-size:34px;color:#4a3a4a;letter-spacing:1px}
h1 small{font-size:17px;color:#8a7a8a;margin-left:12px;font-weight:500}
.card{position:absolute;text-align:center;color:#3a2a2a}
.card b{display:block;font-size:22px}.card .r{font-size:14px;color:#a0522d;font-weight:700}.card p{margin:4px 0 0;font-size:13px;line-height:1.45;color:#5a4a4a}
canvas{position:absolute;left:0;top:0}
</style></head><body><div class="sheet" id="s"><canvas id="c" width="1600" height="${h}"></canvas>${body}</div><script>${js}
const Game={pixelRatio:2};const c=document.getElementById('c');const x=c.getContext('2d');
function ground(cx,cy,w){x.fillStyle='rgba(60,40,30,0.18)';x.beginPath();x.ellipse(cx,cy+4,w,14,0,0,7);x.fill();}
function ruler(y,label){x.strokeStyle='rgba(120,100,100,0.35)';x.setLineDash([6,6]);x.beginPath();x.moveTo(30,y);x.lineTo(1570,y);x.stroke();x.setLineDash([]);x.fillStyle='#9a8a8a';x.font='12px sans-serif';x.fillText(label,34,y-4);}
function portrait(name,px,py,s){const cv=document.createElement('canvas');cv.width=s;cv.height=s;drawPortrait(cv,name,{});x.save();x.beginPath();x.arc(px+s/2,py+s/2,s/2,0,7);x.fillStyle='#e9e2d6';x.fill();x.clip();x.drawImage(cv,px,py);x.restore();x.strokeStyle='#b89a6a';x.lineWidth=3;x.beginPath();x.arc(px+s/2,py+s/2,s/2,0,7);x.stroke();}
window.DRAW&&DRAW();
</script></body></html>`;

const heroes = [
  ['knight', '토비', '탱커 · 수호기사', '키 크고 떡 벌어진 체격<br>각진 턱, 가는 눈, 짙은 눈썹<br>수염 자국 · 코 반창고 · 과묵함'],
  ['sword', '단비', '근딜 · 검사', '날렵하고 탄탄한 체형<br>V라인, 치켜올라간 눈매<br>뺨 흉터 · 비웃는 입꼬리 · 승부욕'],
  ['archer', '별비', '원딜 · 궁수', '마른 체형, 긴 얼굴<br>반쯤 감긴 나른한 눈<br>주근깨 · 땋은 머리 · 무심함'],
  ['mage', '솔담', '매지션 · 소년 마법사', '가장 작은 키, 큰 머리<br>동그란 눈 + 둥근 안경<br>홍조 · 걱정 많은 수다쟁이'],
  ['priest', '보리', '서포터 · 사제', '키 크고 가녀린 체형<br>긴 얼굴, 처진 순한 눈<br>눈 밑 점 · 상냥한 미소'],
];
const monsters = [
  ['goblin', '고블린', '잡몹 · 다수 출현', '작고 구부정, 머리가 큼<br>긴 귀, 매부리코, 누런 이빨'],
  ['goblinHorn', '고블린 나팔수', '동료 호출', '뚱뚱한 체형, 깃털 장식<br>놋쇠 나팔을 분다'],
  ['orc', '오크', '중형 · 광폭화', '두꺼운 어깨, 엄니<br>쇠투구와 털 깃'],
  ['orcCaptain', '오크 대장', '정예', '더 큰 체격, 뿔 투구<br>판금 갑옷 · 붉은 망토'],
  ['ogre', '오우거', '대형 · 차지 공격', '거대한 배, 작은 눈<br>가시 몽둥이'],
  ['ogreChief', '오우거 대족장', '보스', '왕관 · 해골 목걸이<br>곰가죽 망토'],
];

const b = await chromium.launch();
let p;
const fresh = async () => { p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 }); p.on('pageerror', (e) => console.log('ERR', e.message)); };
// 1) 영웅 시안
let cards = heroes.map(([n, nm, r, d], i) => `<div class="card" style="left:${60 + i * 300}px;top:700px;width:260px"><b>${nm}</b><span class="r">${r}</span><p>${d}</p></div>`).join('');
await fresh(); await p.setContent(page(`<h1>영웅 시안 <small>직업별 키·체형·얼굴 차별화 (2.5등신 판타지 치비)</small></h1>` + cards, 1000));
await p.evaluate((H) => {
  const gy = 600;
  for (const [lab, hh] of [['키 기준선 (탱커)', 1], ['평균', 0]]) {}
  H.forEach(([n], i) => { const cx = 190 + i * 300; ground(cx, gy, 90); drawSprite(x, n, cx, gy, { scale: 11.5, t: 0.4 }); });
  const top = Math.min(...H.map(([n]) => ART[n].top));
  H.forEach(([n], i) => { const cx = 190 + i * 300; const h = (n === 'mage' ? 98 : ART[n].top) * 0.36 * 11.5; x.fillStyle = '#9a7a5a'; x.font = 'bold 14px sans-serif'; x.textAlign = 'center'; });
  // 얼굴 클로즈업
  H.forEach(([n], i) => portrait(n, 100 + i * 300 + 150, 60, 120));
}, heroes);
await p.locator('#s').screenshot({ path: `${out}/concept_heroes.png` });
// 2) 얼굴 비교 (크게)
await fresh(); await p.setContent(page(`<h1>얼굴 시안 <small>얼굴형 · 눈매 · 눈썹 · 입 · 특징을 캐릭터마다 다르게</small></h1>` +
  heroes.map(([n, nm, r], i) => `<div class="card" style="left:${40 + i * 310}px;top:420px;width:290px"><b>${nm}</b><span class="r">${r}</span></div>`).join('') +
  `<div class="card" style="left:40px;top:860px;width:1500px"><p>각 캐릭터 아래: 평상시 / 눈 깜빡임 프레임</p></div>`, 920));
await p.evaluate((H) => {
  H.forEach(([n], i) => {
    const cv = document.createElement('canvas'); cv.width = 280; cv.height = 280; drawPortrait(cv, n, {});
    x.fillStyle = '#e9e2d6'; x.beginPath(); x.roundRect(55 + i * 310, 100, 280, 300, 24); x.fill();
    x.drawImage(cv, 55 + i * 310, 110);
    // 깜빡임 프레임 (작게)
    const d = ART[n], k = 3.2; const hb = d.headBox;
    const c2 = layerCanvas(n, 'head', 'blink', k), c1 = layerCanvas(n, 'body', 'normal', k), c0 = layerCanvas(n, 'back', 'normal', k);
    x.fillStyle = '#e9e2d6'; x.beginPath(); x.roundRect(55 + i * 310, 500, 280, 340, 24); x.fill();
    x.save(); x.beginPath(); x.roundRect(55 + i * 310, 500, 280, 340, 24); x.clip();
    const ox = 55 + i * 310 + 140 + d.box[0] * k, oy = 820 + d.box[1] * k + (d.top > 140 ? 60 : 0);
    for (const cv2 of [c0, c1, c2]) if (cv2) x.drawImage(cv2, ox, oy);
    x.restore();
  });
}, heroes);
await p.locator('#s').screenshot({ path: `${out}/concept_faces.png` });
// 3) 몬스터 시안
cards = monsters.map(([n, nm, r, d], i) => `<div class="card" style="left:${30 + i * 260}px;top:770px;width:240px"><b>${nm}</b><span class="r">${r}</span><p>${d}</p></div>`).join('');
await fresh(); await p.setContent(page(`<h1>몬스터 시안 <small>영웅과 같은 재질·조명 · 귀엽지만 위협적으로</small></h1>` + cards, 1000));
await p.evaluate((M) => {
  const gy = 720;
  M.forEach(([n], i) => { const cx = 150 + i * 260; ground(cx, gy, 100); drawSprite(x, n, cx, gy, { scale: n.startsWith('ogre') ? 9 : 10, t: 0.4, flip: true }); });
}, monsters);
await p.locator('#s').screenshot({ path: `${out}/concept_monsters.png` });
// 4) 실제 게임 배율 라인업 (전투 화면 크기)
await fresh(); await p.setContent(page(`<h1>게임 내 크기 <small>전투 화면 배율 그대로 (키 차이 확인용)</small></h1>`, 420));
await p.evaluate(({ H }) => {
  const gy = 360; x.fillStyle = '#3b3150'; x.fillRect(0, 200, 1600, 220);
  [...H.map((h) => h[0]), 'goblin', 'goblinHorn', 'orc', 'orcCaptain', 'ogre', 'ogreChief'].forEach((n, i) => {
    const cx = 80 + i * 136; ground(cx, gy, 40); drawSprite(x, n, cx, gy, { scale: 3, t: 0.4, flip: i >= 5 });
  });
}, { H: heroes });
await p.locator('#s').screenshot({ path: `${out}/concept_ingame_scale.png` });
await b.close();
console.log('ok');
