// 헤드리스 E2E 검증: node tools/e2e.mjs [outDir]
// - 버튼 커버리지(모든 장면) / 5스테이지 완주 / 전멸 → 결과 화면 / 모바일 해상도 스크린샷 / 콘솔 에러 0
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const OUT = process.argv[2] || 'test-output';
fs.mkdirSync(OUT, { recursive: true });
const URL = 'file://' + path.resolve('dist/forest_expedition.html');
const report = { checks: [], errors: [], runs: [], fps: {} };
const ok = (name, pass, info) => { report.checks.push({ name, pass: !!pass, info: info || '' }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };

const browser = await chromium.launch();
async function newPage(vp) {
  const ctx = await browser.newContext({ viewport: vp || { width: 1280, height: 720 }, hasTouch: true, isMobile: !!(vp && vp.mobile) });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => report.errors.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') report.errors.push('console: ' + m.text()); });
  await p.goto(URL);
  await p.waitForTimeout(300);
  return p;
}
const scene = (p) => p.evaluate(() => window.GAME.Game.sceneName);
const vis = async (p, sel) => (await p.locator(sel).count()) > 0 && (await p.locator(sel).first().isVisible());
async function clickIf(p, sel) { if (await vis(p, sel)) { await p.locator(sel).first().click(); await p.waitForTimeout(80); return true; } return false; }
async function dismissHints(p) { for (let i = 0; i < 3; i++) if (!(await clickIf(p, '#hint-ok'))) break; }

// ---------------------------------------------------------------- 1. 한 판 자동 진행 (정책: 전투 우선, HP 낮으면 휴식)
async function playRun(p, seed, opts) {
  opts = opts || {};
  await p.evaluate((s) => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, map: 1, battle: 1, charge: 1, break: 1 }; G.debug.simMult = 16; G.debug.smartAuto = true; G.scenes.title.start(s); G.settings.seenHints.dungeon = 1; for (const k in G.run.strategy) { G.run.strategy[k].s2.auto = true; G.run.strategy[k].ult.auto = true; } }, seed);
  await p.waitForTimeout(200);
  if (opts.party) await p.evaluate((pt) => { window.GAME.Game.run.party = pt; window.GAME.Game.scene.rebuildParty(); }, opts.party);
  // 흐름 검증용: 사냥터·상인으로 준비를 마친 파티 (캐릭터 Lv 8 + UC 무기·갑옷)
  await p.evaluate(() => { const { Game, EQ, makeRng } = window.GAME, P = Game.profile, pt = Game.run.party;
    for (const id in P.chars) P.chars[id].lv = 8;
    for (const id of pt) for (const slot of ['weapon', 'armor']) { const base = EQ.DB.items.find((it) => it.cls === EQ.heroClass(id) && it.slot === slot && it.line === 1); const it = EQ.rollItem(makeRng(9), P, { base: base.id, grade: 'UC' }); P.inv.push(it); P.equip[id][slot] = it.uid; } });
  // 보급 상자 → 포털
  await p.evaluate(() => { const F = window.GAME.Game.scene; F.interact(F.interactables().find((i) => i.key === 'chest')); });
  // 궁극기 자동 사용 (게임 내 전략 설정 기능)
  await p.evaluate(() => { const r = window.GAME.Game.run; for (const k in r.strategy) r.strategy[k].ult.auto = true; });
  await p.click('#btn-automove');
  await p.waitForSelector('#portal-yes', { timeout: 20000 });
  await p.click('#portal-yes');
  const log = [];
  const t0 = Date.now();
  for (let step = 0; step < 4000 && Date.now() - t0 < 600000; step++) {
    await dismissHints(p);
    const sc = await scene(p);
    if (sc === 'result') break;
    if (sc === 'dungeon') { await p.waitForTimeout(150); continue; } // 자동 모드: 알아서 걷고 다음 방을 고른다
    if (sc === 'battle') {
      try { await p.waitForFunction(() => window.GAME.Game.sceneName !== 'battle' || !!document.querySelector('#hint-ok'), null, { timeout: 120000 }); }
      catch (e) { console.log('STUCK', await p.evaluate(() => { const G = window.GAME.Game, S = G.scene, sim = S.sim; return JSON.stringify({ modal: G.modalOpen, ov: G.overlay.innerText.slice(0, 80), paused: S.paused, tg: !!S.targeting, t: sim.time, out: sim.outcome, end: S.endTimer, wave: sim.waveIndex, en: sim.enemies.filter((e) => e.alive).map((e) => [e.key, Math.round(e.hp), Math.round(e.x)]), he: sim.heroes.map((h) => [h.key, Math.round(h.hp)]), err: G.lastError }); })); throw e; }
      await dismissHints(p);
      continue;
    }
    if (sc === 'reward') { if (await vis(p, '#reward-0')) { await p.click('#reward-0'); await p.click('#btn-reward-confirm'); } else await p.click('#btn-continue'); continue; }
    if (sc === 'event') {
      const n = await p.locator('.event-choices .btn:not([disabled])').count();
      if (n) { await p.locator('.event-choices .btn:not([disabled])').first().click(); await p.waitForTimeout(100); }
      await p.click('#btn-continue');
      continue;
    }
    if (sc === 'shop') { await clickIf(p, '#shop-buy-0'); await p.click('#btn-continue'); continue; }
    if (sc === 'rest') { if (!(await clickIf(p, '#rest-food:not([disabled])'))) await clickIf(p, '#rest-hungry'); await p.click('#btn-continue'); continue; }
    if (sc === 'tree') { await p.click('#tree-leave'); continue; }
    await p.waitForTimeout(200);
  }
  const res = await p.evaluate(() => { const r = window.GAME.Game.run; return { result: r.result, stage: r.dungeon ? r.dungeon.floor : r.pos.stage, nodes: r.stats.nodes, battles: r.stats.battles, dead: Object.values(r.heroes).filter((h) => h.dead).map((h) => h.id), sec: Math.round((performance.now() - r.stats.startTime) / 1000) }; });
  return Object.assign(res, { path: log.join(' → ') });
}

// ---------------------------------------------------------------- 실행
{
  const p = await newPage();
  // 완주: 여러 시드
  let wins = 0;
  for (const seed of [101, 202, 303]) {
    const r = await playRun(p, seed, { party: ['tobi', 'soldam', 'bori'] });
    report.runs.push(Object.assign({ seed, party: 'tobi+soldam+bori' }, r));
    console.log(`run seed=${seed}: ${r.result} stage=${r.stage} nodes=${r.nodes} battles=${r.battles} dead=[${r.dead}] path=${r.path}`);
    if (r.result === 'victory') wins++;
    if (seed === 101) await p.screenshot({ path: `${OUT}/run_result.png` });
  }
  ok('던전 완주 (6층 보스 격파) 최소 1회', wins >= 1, `${wins}/3 시드 승리 (자동 + 컨트롤 흉내, 시뮬 16배속)`);
  // 결과 화면 버튼
  await p.evaluate(() => { window.GAME.Game.run.result = 'victory'; window.GAME.Game.go('result'); });
  await p.click('#res-same'); ok('결과: 같은 시드로 다시 → 필드', (await scene(p)) === 'field');
  await p.evaluate(() => { window.GAME.Game.run.result = 'defeat'; window.GAME.Game.go('result'); });
  await p.click('#res-new'); ok('결과: 새 원정 → 필드', (await scene(p)) === 'field');
  await p.evaluate(() => window.GAME.Game.go('result'));
  await p.click('#res-title'); ok('결과: 타이틀', (await scene(p)) === 'title');
  await p.close();
}

// 전멸 → 결과 화면 (실제 전투에서 HP 1로 시작)
{
  const p = await newPage();
  await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, map: 1, battle: 1, charge: 1, break: 1 }; G.debug.simMult = 6; G.scenes.title.start(777); const r = G.run; for (const id of r.party) r.heroes[id].hp = 1; for (const k in r.strategy) for (const sl of ['s1', 's2', 'ult']) r.strategy[k][sl].auto = false; });
  await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints.dungeon = 1; window.GAME.enterDungeon(G.run); G.run.autoMode = true; });
  await p.waitForTimeout(200);
  if ((await scene(p)) !== 'battle') await p.evaluate(() => window.GAME.Game.go('battle', { node: { stage: 1, row: 0, type: 'battle', enc: 0 } }));
  await p.waitForFunction(() => window.GAME.Game.sceneName === 'result', null, { timeout: 60000 });
  const dead = await p.evaluate(() => ({ res: window.GAME.Game.run.result, dead: Object.values(window.GAME.Game.run.heroes).filter((h) => h.dead).length, title: document.querySelector('.result-title').textContent }));
  ok('전원 사망 → 결과 화면(패배)', dead.res === 'defeat' && dead.dead === 3, JSON.stringify(dead));
  await p.screenshot({ path: `${OUT}/defeat_result.png` });
  await p.close();
}

// ---------------------------------------------------------------- 2. 버튼 커버리지
{
  const p = await newPage();
  // 타이틀
  await p.click('#btn-seed'); await p.fill('#seed-input', '12345'); await p.click('#seed-ok');
  ok('타이틀: 시드 입력 적용', (await p.textContent('.title-seed')).includes('12345'));
  await p.click('#btn-seed'); await p.click('#seed-cancel');
  await p.click('#btn-title-help'); ok('타이틀: 규칙 안내 열림', await vis(p, '.help-box')); await p.click('#help-close');
  await p.click('#btn-news'); ok('타이틀: 새 소식', await vis(p, '.news-box') && (await p.locator('.news-item').count()) >= 5); await p.click('#news-close'); await p.waitForTimeout(150);
  await p.click('#btn-sound'); await p.click('#btn-sound');
  await p.click('#btn-start'); ok('타이틀 → 필드', (await scene(p)) === 'field');
  ok('필드: 첫 플레이 힌트 표시', await vis(p, '#hint-ok')); await p.click('#hint-ok');
  // 필드
  await p.click('#btn-party'); await p.click('#ps-tobi'); await p.click('#ps-byeolbi'); await p.click('#ps-soldam');
  await p.click('#ps-ok');
  ok('필드: 파티 편성 변경 (최대 3인)', JSON.stringify(await p.evaluate(() => window.GAME.Game.run.party)) === JSON.stringify(['danbi', 'bori', 'byeolbi']), JSON.stringify(await p.evaluate(() => window.GAME.Game.run.party)));
  await p.click('#btn-party'); await p.click('#ps-soldam');
  ok('필드: 4번째 선택 거부', (await p.evaluate(() => document.querySelectorAll('.ps-card.on').length)) === 3);
  await p.click('#ps-cancel');
  await p.click('#btn-f-strategy'); await p.click('#stab-bori'); await p.click('#sr-auto-s2'); await p.selectOption('#sr-cond-s2', 'always'); await p.click('#sr-auto-ult'); await p.click('#strat-reset'); await p.click('#strat-close');
  ok('필드: 전략 편집 열기/수정/기본값/닫기', !(await vis(p, '.strat-box')));
  // 길잡이 대화 (탭 → 자동 이동 → 대화)
  await p.evaluate(() => { const F = window.GAME.Game.scene; F.autoMove('guide'); });
  await p.waitForSelector('#guide-next', { timeout: 15000 });
  await p.click('#guide-next'); await p.click('#guide-next'); ok('필드: 길잡이 대화 3페이지', await vis(p, '#guide-close')); await p.click('#guide-close');
  await p.evaluate(() => { const F = window.GAME.Game.scene; F.autoMove('chest'); });
  await p.waitForFunction(() => window.GAME.Game.run.gotSupply, null, { timeout: 15000 });
  ok('필드: 보급 상자 → 식량 +2', (await p.evaluate(() => window.GAME.Game.run.food)) === 3);
  // 조이스틱 이동
  const bb = await p.locator('#cv').boundingBox(); const k = bb.width / 960;
  const before = await p.evaluate(() => ({ ...window.GAME.Game.scene.leader }));
  await p.mouse.move(bb.x + 104 * k, bb.y + 432 * k); await p.mouse.down(); await p.mouse.move(bb.x + 150 * k, bb.y + 432 * k, { steps: 4 });
  await p.waitForTimeout(700); await p.mouse.up();
  const after = await p.evaluate(() => ({ ...window.GAME.Game.scene.leader }));
  ok('필드: 가상 조이스틱 이동', after.x > before.x + 20, `x ${before.x.toFixed(0)} → ${after.x.toFixed(0)}`);
  // 탭 이동
  await p.mouse.click(bb.x + 600 * k, bb.y + 300 * k); await p.waitForTimeout(800);
  const after2 = await p.evaluate(() => ({ ...window.GAME.Game.scene.leader }));
  ok('필드: 탭 이동', Math.abs(after2.x - after.x) + Math.abs(after2.y - after.y) > 20);
  const fol = await p.evaluate(() => window.GAME.Game.scene.followers.length);
  ok('필드: 파티원 뒤따름 (리더 제외 2명)', fol === 2);
  await p.waitForTimeout(1500); await clickIf(p, '#guide-close'); await clickIf(p, '#portal-no');
  await p.screenshot({ path: `${OUT}/field.png` });
  await p.click('#btn-automove');
  await p.waitForSelector('#portal-no', { timeout: 20000 });
  await p.click('#portal-no');
  await p.click('#btn-interact'); await p.click('#portal-party'); await p.click('#ps-ok');
  await p.click('#portal-yes');
  ok('포털 → 던전 1층 입구', (await scene(p)) === 'dungeon' && await p.evaluate(() => window.GAME.Game.run.dungeon.floor === 1 && window.GAME.Game.run.dungeon.at.room === 0)); await dismissHints(p);
  // 던전 화면
  await p.click('#btn-strategy'); await p.click('#strat-close');
  await p.click('#btn-potion'); ok('던전: 회복약 대상 선택 창', await vis(p, '.pick-box')); await p.click('.pick-box .btn.ghost');
  await p.click('#btn-ex-speed'); ok('던전: 배속 2x', (await p.textContent('#btn-ex-speed')).includes('2x')); await p.click('#btn-ex-speed'); await p.click('#btn-ex-speed');
  await p.evaluate(() => { window.GAME.Game.run.autoMode = true; window.GAME.Game.scene.refreshAuto(); });
  await p.click('#btn-ex-auto'); ok('던전: 수동 전환', await p.evaluate(() => !window.GAME.Game.run.autoMode));
  await p.screenshot({ path: `${OUT}/dungeon.png` });
  // 지도에서 이웃 방 탭 → 복도, ▶ 누르고 있으면 걷는다
  { const tap = await p.evaluate(() => { const fl = window.GAME.Game.run.dungeon; const n = window.GAME.floorNeighbors(fl, 0)[0].room; return { x: 600 + 6 + n.gx * 64 + 32, y: 112 + 24 + n.gy * 46 + 23 }; });
    await p.mouse.click(bb.x + tap.x * k, bb.y + tap.y * k); await p.waitForTimeout(300);
    ok('던전: 지도에서 이웃 방 탭 → 복도', await p.evaluate(() => window.GAME.Game.run.dungeon.at.corr !== undefined));
    const x0 = await p.evaluate(() => window.GAME.Game.run.dungeon.at.x); await p.waitForTimeout(500);
    ok('던전: 수동이면 가만히 있다', (await p.evaluate(() => window.GAME.Game.run.dungeon.at.x)) === x0);
    await p.locator('#btn-fwd').hover(); await p.mouse.down(); await p.waitForTimeout(500); await p.mouse.up();
    ok('던전: ▶ 누르고 있으면 걷는다', (await p.evaluate(() => window.GAME.Game.run.dungeon.at.x)) > x0); }
  // 전투 (직접 진입: 차지 오우거 포함 조우)
  await p.evaluate(() => { const G = window.GAME.Game; G.run.party = ['tobi', 'danbi', 'bori']; G.go('battle', { node: { stage: 3, row: 0, type: 'battle', waves: [['ogre', 'goblin_caller', 'goblin']] } }); });
  await dismissHints(p);
  await p.waitForSelector('#hint-ok', { timeout: 15000 }).catch(() => {});
  ok('전투: 큰 적 등장 → 그로기 도움말', (await p.evaluate(() => document.querySelector('.hint-text')?.textContent || '')).includes('그로기'));
  await dismissHints(p);
  await p.click('#btn-speed'); ok('전투: 배속 2x', (await p.textContent('#btn-speed')).includes('2x'));
  await p.click('#btn-speed'); ok('전투: 배속 3x', (await p.textContent('#btn-speed')).includes('3x')); await p.click('#btn-speed');
  await p.click('#btn-manual'); ok('전투: 수동', await p.evaluate(() => !window.GAME.Game.run.autoMode && !window.GAME.Game.scene.sim.autoMode));
  // 회복약: 정지 후 아군 얼굴 탭
  await p.click('#btn-bpotion'); ok('전투: 회복약 → 정지 + 대상 선택', await p.evaluate(() => !!window.GAME.Game.scene.potionPick));
  await p.mouse.click(bb.x + 480 * k, bb.y + 120 * k); ok('전투: 회복약 빈 곳 탭 → 취소', await p.evaluate(() => !window.GAME.Game.scene.potionPick));
  await p.click('#btn-pause'); ok('전투: 일시정지 메뉴', await vis(p, '#pause-resume'));
  await p.click('#pause-sound'); await p.click('#pause-sound');
  await p.click('#pause-strategy'); await p.click('#strat-close');
  await p.click('#pause-giveup'); await p.click('#giveup-no'); await p.click('#pause-resume');
  // 작전 명령
  for (const o of ['charge', 'retreat', 'hold']) { await p.click('#btn-order-' + o); ok(`전투: 작전 [${o}]`, (await p.evaluate(() => window.GAME.Game.scene.sim.order)) === o); }
  // 집중 공격: 적 칩 탭 → 다시 탭하면 해제
  await p.waitForSelector('.chip', { timeout: 10000 });
  await p.locator('.chip').first().click();
  ok('전투: 적 칩 탭 → 집중 공격 지정', await p.evaluate(() => !!window.GAME.Game.scene.sim.focus));
  await p.waitForTimeout(800);
  ok('전투: 집중 대상으로 파티 대상 변경', await p.evaluate(() => { const s = window.GAME.Game.scene.sim; return s.aliveHeroes().every((h) => h.target === s.focus); }));
  await p.locator('.chip.focused').click(); ok('전투: 집중 해제', await p.evaluate(() => !window.GAME.Game.scene.sim.focus));
  // 실시간 이동 확인
  const pos0 = await p.evaluate(() => window.GAME.Game.scene.sim.heroes.map((h) => [h.x, h.y]));
  await p.waitForTimeout(700);
  const pos1 = await p.evaluate(() => window.GAME.Game.scene.sim.heroes.map((h) => [h.x, h.y]));
  ok('전투: 캐릭터 자유 이동', pos0.some((q, i) => Math.hypot(q[0] - pos1[i][0], q[1] - pos1[i][1]) > 3));
  // 캐릭터 끌기: 얼굴 → 지점 = 이동
  const fb = await p.locator('#face-danbi').boundingBox();
  await p.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2); await p.mouse.down();
  await p.mouse.move(bb.x + 260 * k, bb.y + 360 * k, { steps: 8 });
  ok('전투: 얼굴 끌기 → 슬로모션 명령 모드', await p.evaluate(() => !!window.GAME.Game.scene.cmdDrag));
  await p.screenshot({ path: `${OUT}/battle_cmd_drag.png` });
  await p.mouse.up();
  const mv = await p.evaluate(() => { const h = window.GAME.Game.scene.sim.heroes.find((u) => u.key === 'danbi'); return h.cmd && h.cmd.type === 'move' ? [Math.round(h.cmd.x), Math.round(h.cmd.y)] : null; });
  ok('전투: 얼굴 끌어 놓기 → 그 지점으로 이동 명령', !!mv && Math.abs(mv[0] - 260) < 4, JSON.stringify(mv));
  await p.waitForFunction(() => { const h = window.GAME.Game.scene.sim.heroes.find((u) => u.key === 'danbi'); return h.cmd && Math.hypot(h.x - h.cmd.x, h.y - h.cmd.y) < 12; }, null, { timeout: 8000 }).catch(() => {});
  ok('전투: 지정 지점 도착 후 대기', await p.evaluate(() => { const h = window.GAME.Game.scene.sim.heroes.find((u) => u.key === 'danbi'); return !!h.cmd && Math.hypot(h.x - h.cmd.x, h.y - h.cmd.y) < 12; }));
  // 전장의 캐릭터 → 적 = 공격 대상
  const dragPts = await p.evaluate(() => { const s = window.GAME.Game.scene.sim; const h = s.heroes.find((u) => u.key === 'danbi'); const e = s.aliveEnemies().find((u) => u.key !== 'ogre') || s.aliveEnemies()[0]; return { hx: h.x, hy: h.y - 30, ex: e.x, ey: e.y - 40, uid: e.uid }; });
  await p.mouse.move(bb.x + dragPts.hx * k, bb.y + dragPts.hy * k); await p.mouse.down();
  await p.mouse.move(bb.x + dragPts.ex * k, bb.y + dragPts.ey * k, { steps: 10 }); await p.mouse.up();
  ok('전투: 캐릭터를 적 위로 끌기 → 공격 대상 지정', await p.evaluate((uid) => { const h = window.GAME.Game.scene.sim.heroes.find((u) => u.key === 'danbi'); return !!h.cmd && h.cmd.type === 'attack' && h.cmd.unit.uid === uid && h.target.uid === uid; }, dragPts.uid));
  await p.click('#btn-order-hold');
  ok('전투: 작전 버튼 → 개별 명령 해제', await p.evaluate(() => window.GAME.Game.scene.sim.heroes.every((h) => !h.cmd)));
  // 회복약: 얼굴 탭으로 대상 선택
  await p.evaluate(() => { const s = window.GAME.Game.scene.sim; s.heroes.find((u) => u.key === 'bori').hp = 30; });
  const pots0 = await p.evaluate(() => window.GAME.Game.run.potions);
  await p.click('#btn-bpotion'); await p.click('#face-bori');
  ok('전투: 회복약 → 얼굴 탭으로 사용', (await p.evaluate(() => window.GAME.Game.run.potions)) === pots0 - 1 && (await p.evaluate(() => window.GAME.Game.scene.sim.heroes.find((u) => u.key === 'bori').hp > 30)));
  // 차지 → ② 방패 강타 "지금!" 탭 → 캔슬
  await p.waitForFunction(() => window.GAME.Game.scene.sim && window.GAME.Game.scene.sim.enemies.some((e) => e.alive && e.charge), null, { timeout: 30000 });
  await dismissHints(p);
  await p.evaluate(() => { window.GAME.Game.scene.sim.heroes.find((h) => h.key === 'tobi').cds.s2 = 0; });
  await p.waitForTimeout(120);
  ok('전투: 차지 중 ② 방패 강타에 "지금!" 표시', (await p.textContent('#sk-tobi-s2 .sk-tag')).includes('지금'));
  await p.screenshot({ path: `${OUT}/battle_charge.png` });
  await p.locator('#sk-tobi-s2').tap();
  await p.waitForTimeout(700);
  ok('전투: 탭 한 번 → 차지 중인 적 기절 → 캔슬', await p.evaluate(() => { const o = window.GAME.Game.scene.sim.enemies.find((e) => e.key === 'ogre'); return !o.charge && !!o.statuses.stun; }));
  // 끌어서 범위 지정 (보리 ② 광역 치유)
  await p.evaluate(() => { const s = window.GAME.Game.scene.sim; const b = s.heroes.find((h) => h.key === 'bori'); b.cds.s2 = 0; for (const h of s.heroes) h.hp = Math.round(h.maxHp * 0.5); });
  const sb = await p.locator('#sk-bori-s2').boundingBox();
  await p.mouse.move(sb.x + sb.width / 2, sb.y + 20); await p.mouse.down();
  await p.mouse.move(bb.x + 320 * k, bb.y + 330 * k, { steps: 8 });
  const dragOn = await p.evaluate(() => { const d = window.GAME.Game.scene.drag; return d && d.over; });
  const tA = await p.evaluate(() => window.GAME.Game.scene.sim.time); await p.waitForTimeout(400); const tB = await p.evaluate(() => window.GAME.Game.scene.sim.time);
  ok('전투: 버튼 끌기 → 슬로모션 지정 모드', dragOn, `0.4초 실시간 동안 시뮬 ${(tB - tA).toFixed(2)}초 진행`);
  await p.screenshot({ path: `${OUT}/battle_drag.png` });
  await p.mouse.up(); await p.waitForTimeout(200);
  ok('전투: 놓은 곳에 시전 (쿨타임 시작)', await p.evaluate(() => window.GAME.Game.scene.sim.heroes.find((h) => h.key === 'bori').cds.s2 > 0));
  // 끌다가 버튼 쪽으로 되돌리면 취소
  await p.evaluate(() => { window.GAME.Game.scene.sim.heroes.find((h) => h.key === 'danbi').cds.s1 = 0; });
  const sd = await p.locator('#sk-danbi-s1').boundingBox();
  await p.mouse.move(sd.x + sd.width / 2, sd.y + 20); await p.mouse.down();
  await p.mouse.move(bb.x + 600 * k, bb.y + 330 * k, { steps: 6 }); await p.mouse.move(sd.x + sd.width / 2, sd.y + 30, { steps: 6 }); await p.mouse.up();
  ok('전투: 끌기 → 버튼으로 되돌리면 취소', await p.evaluate(() => window.GAME.Game.scene.sim.heroes.find((h) => h.key === 'danbi').cds.s1 === 0 && !window.GAME.Game.scene.drag));
  // ③ 필살기 탭 (컷인)
  await p.evaluate(() => { window.GAME.Game.scene.sim.heroes.find((h) => h.key === 'bori').ult = 100; });
  await p.waitForTimeout(80);
  ok('전투: ③ 필살기 준비 → 버튼 빛남', await p.evaluate(() => document.querySelector('#sk-bori-ult').classList.contains('glow')));
  await p.locator('#sk-bori-ult').tap(); await p.waitForTimeout(250);
  ok('전투: ③ 필살기 컷인 연출', await p.evaluate(() => !!window.GAME.Game.scene.cutin));
  await p.screenshot({ path: `${OUT}/battle_ult.png` });
  await p.click('#btn-auto');
  // 플레이어 대신 ② 상황 스킬을 추천 시점에 사용 (힌트에 반응하는 플레이 재현)
  await p.evaluate(() => { const G = window.GAME.Game; for (const k in G.run.strategy) { G.run.strategy[k].s2.auto = true; G.run.strategy[k].ult.auto = true; } G.scene.sim.strategy = G.run.strategy; for (const h of G.scene.sim.heroes) if (h.alive) h.hp = h.maxHp; G.debug.simMult = 8; });
  await p.waitForFunction(() => window.GAME.Game.sceneName !== 'battle', null, { timeout: 120000 });
  ok('전투 승리 → 보상 화면', (await scene(p)) === 'reward', await scene(p));
  await p.evaluate(() => { window.GAME.Game.debug.simMult = 1; });
  await p.screenshot({ path: `${OUT}/reward.png` });
  await p.click('#reward-1'); ok('보상: 카드 선택 → 확정 활성', !(await p.locator('#btn-reward-confirm').isDisabled()));
  await p.click('#btn-reward-confirm'); ok('보상 확정 → 던전', (await scene(p)) === 'dungeon');
  // 이벤트 4종 (모든 선택지)
  for (const ev of ['cart', 'well', 'goblin_merchant', 'wounded']) {
    const n = await p.evaluate((e) => window.GAME.EVENTS[e].choices.length, ev);
    for (let i = 0; i < n; i++) {
      await p.evaluate((e) => { const G = window.GAME.Game; G.run.gold = 200; G.run.food = 3; G.go('event', { node: { stage: 2, row: 1, type: 'event', event: e } }); }, ev);
      const dis = await p.locator(`#event-choice-${i}`).isDisabled();
      if (dis) continue;
      await p.click(`#event-choice-${i}`);
      ok(`이벤트 ${ev} 선택지 ${i + 1} → 결과`, await vis(p, '.event-result'), (await p.textContent('.event-result')).slice(0, 40));
      if (ev === 'goblin_merchant' && i === 1) { await p.click('#btn-continue'); ok('이벤트 전투 진입', (await scene(p)) === 'battle'); await dismissHints(p); }
      else await p.click('#btn-continue');
    }
  }
  if ((await scene(p)) === 'battle') { await p.evaluate(() => { window.GAME.Game.debug.simMult = 8; }); await p.waitForFunction(() => window.GAME.Game.sceneName !== 'battle', null, { timeout: 120000 }); await p.evaluate(() => { window.GAME.Game.debug.simMult = 1; }); await clickIf(p, '#btn-continue'); }
  await p.screenshot({ path: `${OUT}/event.png` });
  // 상점
  await p.evaluate(() => { const G = window.GAME.Game; G.run.gold = 300; G.run.autoMode = false; G.go('shop', { node: { stage: 2, row: 2, type: 'shop' } }); });
  const g0 = await p.evaluate(() => window.GAME.Game.run.gold);
  for (const i of [0, 1, 2, 3]) await clickIf(p, `#shop-buy-${i}:not([disabled])`);
  ok('상점: 구매 (회복약/식량/횃불/유물)', (await p.evaluate(() => window.GAME.Game.run.gold)) < g0, `${g0} → ${await p.evaluate(() => window.GAME.Game.run.gold)}`);
  await p.click('#shop-usepotion'); await p.click('.pick-box .btn.ghost');
  await p.screenshot({ path: `${OUT}/shop.png` });
  await p.click('#btn-continue'); ok('상점 → 던전', (await scene(p)) === 'dungeon');
  // 휴식
  await p.evaluate(() => { const G = window.GAME.Game; for (const id of G.run.party) G.run.heroes[id].dead = false, G.run.heroes[id].hp = Math.round(G.run.heroes[id].maxHp * 0.3); G.go('rest', {}); });
  const f0 = await p.evaluate(() => window.GAME.Game.run.food);
  await p.click('#rest-food');
  const hp = await p.evaluate(() => { const r = window.GAME.Game.run; return r.party.map((id) => r.heroes[id].hp / r.heroes[id].maxHp); });
  ok('휴식: 식량 1 소모 + HP 40% 회복', (await p.evaluate(() => window.GAME.Game.run.food)) === f0 - 1 && hp.every((x) => Math.abs(x - 0.7) < 0.02), hp.map((x) => x.toFixed(2)).join(','));
  await p.click('#camp-guard'); await p.click('#camp-tales');
  ok('야영 활동: 둘 고르면 나머지 잠김 · 다음 전투 효과 예약', await p.evaluate(() => { const r = window.GAME.Game.run; return !!(r.camp && r.camp.guard && r.camp.ult === 35); }) && await p.locator('#camp-whet').isDisabled());
  await p.screenshot({ path: `${OUT}/rest.png` });
  await p.click('#rest-strategy'); await p.click('#strat-close');
  await p.click('#btn-continue');
  // 고목
  await p.evaluate(() => window.GAME.Game.go('tree', {}));
  await p.click('#tree-deal-small'); await p.locator('.tree-box .pcard.selectable').first().click(); await p.click('#tree-confirm');
  ok('고목: HP 희생 → 열매 버프', await p.evaluate(() => !!window.GAME.Game.run.fruit && window.GAME.Game.run.fruit.battles === 3));
  await p.screenshot({ path: `${OUT}/tree.png` });
  await p.click('#btn-continue');
  await p.close();
}

// ---------------------------------------------------------------- 3. 모바일 해상도 레이아웃
// ---------------------------------------------------------------- 장비 시스템 (마을·장비창·대장간·난이도·드랍·정산)
{
  const p = await newPage();
  await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, map: 1, battle: 1, charge: 1, break: 1 }; G.scenes.title.start(321); });
  await p.waitForTimeout(200);
  ok('마을: 장비 버튼', await vis(p, '#btn-inv'));
  // 시험용 장비 지급 (드랍 함수 그대로 사용)
  await p.evaluate(() => {
    const G = window.GAME.Game, EQ = window.GAME.EQ, P = G.profile, rng = window.GAME.makeRng(5);
    P.inv.push(EQ.rollItem(rng, P, { base: 'melee_weapon_1', grade: 'SR' }), EQ.rollItem(rng, P, { base: 'melee_weapon_2', grade: 'R' }), EQ.rollItem(rng, P, { base: 'melee_armor_1', grade: 'E' }));
    P.gems.push(EQ.rollGem(rng, P, 'SSR'));
    P.stones = 40; P.gold = 2000; EQ.saveProfile(P);
  });
  const hp0 = await p.evaluate(() => window.GAME.Game.run.heroes.danbi.maxHp);
  await p.click('#btn-inv'); await p.click('#inv-hero-danbi'); await p.click('#inv-slot-armor');
  ok('장비창: 부위 선택 → 쓸 수 있는 장비 목록', (await p.locator('.inv-item').count()) === 1);
  await p.locator('.inv-item').first().click(); await p.click('#inv-equip');
  ok('장비창: 장착', await p.evaluate(() => { const P = window.GAME.Game.profile; return !!P.equip.danbi.armor; }));
  ok('장비창: 갑옷 패시브 표시', (await p.textContent('#inv-detail')).includes('패시브'));
  await p.click('#inv-sock-0'); await p.locator('.gem-pick').first().click();
  ok('장비창: 보석 끼우기', await p.evaluate(() => { const P = window.GAME.Game.profile; const it = P.inv.find((i) => i.grade === 'E'); return !!it.gems[0] && P.gems[0].inItem === it.uid; }));
  await p.click('#inv-back'); await p.click('#inv-slot-weapon');
  await p.locator('.inv-item').first().click(); await p.click('#inv-equip');
  await p.click('#inv-back'); await p.locator('.inv-item').nth(1).click();
  ok('장비창: 지금 장비와 비교', await vis(p, '.id-cmp'));
  const st0 = await p.evaluate(() => window.GAME.Game.profile.stones);
  await p.click('#inv-dismantle'); await p.click('#dis-yes');
  ok('장비창: 분해 → 강화석', (await p.evaluate(() => window.GAME.Game.profile.stones)) > st0);
  await p.screenshot({ path: `${OUT}/inventory.png` });
  await p.click('#inv-close');
  ok('장착 → 원정 최대 HP 반영', (await p.evaluate(() => window.GAME.Game.run.heroes.danbi.maxHp)) > hp0);
  // 대장간: 걸어가서 상호작용
  await p.evaluate(() => window.GAME.Game.scene.autoMove('smith'));
  await p.waitForSelector('.bs-box', { timeout: 15000 });
  ok('마을: 대장간 → 강화 창', await vis(p, '.bs-box'));
  const wuid = await p.evaluate(() => window.GAME.Game.profile.equip.danbi.weapon);
  await p.click(`.bs-item[data-uid="${wuid}"]`);
  const before = await p.evaluate(() => { const P = window.GAME.Game.profile; const it = P.inv.find((i) => i.uid === P.equip.danbi.weapon); return { enh: it.enh, fail: it.fail, stones: P.stones }; });
  await p.click('#bs-enhance');
  const after = await p.evaluate(() => { const P = window.GAME.Game.profile; const it = P.inv.find((i) => i.uid === P.equip.danbi.weapon); return { enh: it.enh, fail: it.fail, stones: P.stones }; });
  ok('대장간: 강화 (재료 소모 + 단계 또는 실패 보정)', after.stones < before.stones && (after.enh > before.enh || after.fail > before.fail), JSON.stringify([before, after]));
  ok('대장간: 결과 표시', await vis(p, '.bs-result'));
  await p.screenshot({ path: `${OUT}/blacksmith.png` });
  await p.click('#bs-close');
  ok('장비 정보 저장 (새로고침 후 유지)', await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('fe_profile')); return !!s && !!s.equip.danbi.weapon; }));
  // 난이도 선택 (해금된 단계만)
  await p.evaluate(() => { const G = window.GAME.Game; G.profile.unlockedTier = 1; window.GAME.EQ.saveProfile(G.profile); G.scene.interact(G.scene.interactables().find((i) => i.key === 'portal')); });
  ok('포털: 해금된 난이도만 표시', (await vis(p, '#tier-1')) && !(await vis(p, '#tier-2')));
  await p.click('#tier-1');
  ok('포털: 난이도 선택', await p.evaluate(() => window.GAME.Game.run.tier === 1 && window.GAME.Game.profile.tier === 1));
  await p.click('#portal-yes');
  // 정예 전투 승리 → 장비 드랍 + 강화석
  await p.evaluate(() => { const G = window.GAME.Game; for (const k in G.run.strategy) { G.run.strategy[k].s2.auto = true; G.run.strategy[k].ult.auto = true; } G.debug.simMult = 8; G.go('battle', { node: { stage: 1, row: 0, type: 'elite', waves: [['goblin', 'goblin']] } }); });
  ok('전투: 난이도 배율 적용', await p.evaluate(() => window.GAME.Game.scene.sim.tier.hp === window.GAME.EQ.DB.tiers[0].hp));
  await p.waitForFunction(() => window.GAME.Game.sceneName !== 'battle', null, { timeout: 60000 });
  ok('정예 승리 → 보상에 장비·강화석 표시', (await scene(p)) === 'reward' && (await vis(p, '.reward-loot')) && (await p.textContent('.reward-loot')).includes('강화석'));
  ok('정예 승리 → 장비가 보관함에 들어감', await p.evaluate(() => window.GAME.Game.run.loot.length >= 1));
  await p.screenshot({ path: `${OUT}/reward_loot.png` });
  // 보상 3택1의 장비 카드
  const eqCard = await p.evaluate(() => { const G = window.GAME.Game, R = G.scenes.reward; for (let s = 0; s < 40; s++) { const o = R.makeOptions(G.run, window.GAME.makeRng(s), false).find((x) => x.kind === 'equip'); if (o) { const n = G.profile.inv.length; o.apply(); return G.profile.inv.length === n + 1; } } return false; });
  ok('보상: 장비 카드 선택 → 보관함', eqCard);
  // 원정 종료 정산: 골드 귀환 + 보스 격파 시 다음 난이도 해금
  const g0 = await p.evaluate(() => window.GAME.Game.profile.gold);
  await p.evaluate(() => { const G = window.GAME.Game; G.debug.simMult = 1; G.run.gold = 77; G.run.result = 'victory'; G.go('result'); });
  ok('결과: 골드를 마을로 가져감', (await p.evaluate(() => window.GAME.Game.profile.gold)) === g0 + 77);
  ok('결과: 다음 난이도 해금', (await p.evaluate(() => window.GAME.Game.profile.unlockedTier)) === 2 && (await p.textContent('.result-loot')).includes('해금'));
  await p.screenshot({ path: `${OUT}/result_loot.png` });
  await p.evaluate(() => { window.GAME.Game.go('result'); });
  ok('결과: 정산은 한 번만', (await p.evaluate(() => window.GAME.Game.profile.gold)) === g0 + 77);
  await p.close();
}

// ---------------------------------------------------------------- 마을 잡화점 상인
{
  const p = await newPage();
  await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, battle: 1, dungeon: 1 }; G.scenes.title.start(66); G.profile.gold = 1000; const F = G.scene; F.interact(F.interactables().find((i) => i.key === 'merchant')); });
  await p.waitForTimeout(300);
  ok('마을 상인: 창 열림', await vis(p, '.merchant-box'));
  await p.click('#mc-buy-potion'); await p.click('#mc-buy-bigPotion'); await p.click('#mc-buy-feather');
  ok('마을 상인: 부활의 깃털 한도 1', await p.locator('#mc-buy-feather').isDisabled());
  await p.click('#mc-tab-tools'); await p.click('#mc-buy-trapKit'); await p.click('#mc-buy-food');
  await p.click('#mc-tab-gear'); const inv0 = await p.evaluate(() => window.GAME.Game.profile.inv.length);
  await p.locator('.merchant-box .btn.buy').first().click();
  const st = await p.evaluate(() => { const G = window.GAME.Game, r = G.run; return { pot: r.potions, big: r.bigPotions, fe: r.feathers, kit: r.trapKits, food: r.food, gold: G.profile.gold, inv: G.profile.inv.length }; });
  ok('마을 상인: 물약·도구는 가방, 장비는 보관함, 마을 골드 차감', st.pot === 2 && st.big === 1 && st.fe === 1 && st.kit === 1 && st.inv === inv0 + 1 && st.gold === 1000 - 30 - 75 - 160 - 40 - 25 - 60, JSON.stringify(st));
  await p.click('#mc-close');
  // 상급 회복약은 전투에서 버튼이 따로 생긴다
  await p.evaluate(() => { const G = window.GAME.Game; G.go('battle', { node: { stage: 1, row: 0, type: 'battle', waves: [['goblin']] } }); });
  await p.waitForTimeout(400);
  ok('전투: 상급 회복약 버튼', await vis(p, '#btn-bpotion-big'));
  // 부활의 깃털: 쓰러진 동료를 일으킨다
  await p.evaluate(() => { const G = window.GAME.Game, r = G.run; r.heroes.danbi.dead = true; r.heroes.danbi.hp = 0; G.go('field'); window.GAME.usePotionFlow(r, null, 'feather'); });
  await p.waitForTimeout(200);
  await p.locator('.pick-box .pcard[data-hero="danbi"]').click();
  ok('부활의 깃털: 쓰러진 동료 부활', await p.evaluate(() => { const r = window.GAME.Game.run; return !r.heroes.danbi.dead && r.heroes.danbi.hp > 0 && r.feathers === 0; }));
  await p.close();
}

// ---------------------------------------------------------------- 사냥터 (방치 사냥)
{
  const p = await newPage();
  await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, hunt: 1 }; G.scenes.title.start(55); });
  await p.waitForTimeout(200);
  const gold0 = await p.evaluate(() => window.GAME.Game.profile.gold);
  await p.click('#btn-hunt'); await p.waitForSelector('#hunt-go-meadow', { timeout: 20000 }); await p.click('#hunt-go-meadow');
  await p.waitForFunction(() => window.GAME.Game.sceneName === 'hunt', null, { timeout: 30000 }).catch(() => {});
  ok('마을 남서쪽 출구 → 사냥터', (await scene(p)) === 'hunt');
  await clickIf(p, '#btn-hunt-speed');
  ok('사냥터: 배속 버튼', (await p.locator('#btn-hunt-speed').innerText()).includes('2x'));
  await p.evaluate(() => { window.GAME.Game.debug.simMult = 12; });
  await p.waitForTimeout(6000);
  await p.evaluate(() => { window.GAME.Game.debug.simMult = 1; });
  const st = await p.evaluate(() => { const S = window.GAME.Game.scene; return { kills: S.sim.stats.kills, gold: window.GAME.Game.profile.gold, log: document.querySelector('#hunt-log').innerText }; });
  const kills = st.kills.trash + st.kills.normal + st.kills.elite;
  ok('사냥터: 자동 사냥으로 몹 처치 · 골드 반영', kills >= 5 && st.gold > gold0, `처치 ${kills}, 골드 ${gold0}→${st.gold}`);
  ok('사냥터: 사냥 기록 표시', st.log.includes('처치'));
  await p.click('#btn-hunt-auto');
  ok('사냥터: 자동 사냥 끄기', (await p.locator('#btn-hunt-auto').innerText()).includes('끔'));
  await p.click('#btn-hunt-auto');
  await p.screenshot({ path: `${OUT}/hunt.png` });
  await p.click('#btn-hunt-back');
  ok('사냥터 → 마을 복귀', (await scene(p)) === 'field');
  await p.close();
}

// ---------------------------------------------------------------- 캐릭터 소환·돌파·필살기 선택
{
  const p = await newPage();
  await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, map: 1, battle: 1, charge: 1, break: 1 }; G.scenes.title.start(55); });
  await p.waitForTimeout(200);
  ok('시작: 기본 캐릭터 5명 + 선물 캐릭터 + 소환권 5장', await p.evaluate(() => { const P = window.GAME.Game.profile, C = window.GAME.CHARACTERS; return window.GAME.GACHA.ownedIds(P).length === C.filter((c) => c.starter || c.gift).length && P.tickets === 5; }));
  await p.click('#btn-gacha'); await p.click('#gacha-5');
  ok('소환 5회 → 결과 5장 + 소환권 소모', (await p.locator('.gr-card').count()) === 5 && (await p.evaluate(() => window.GAME.Game.profile.tickets)) === 0);
  await p.screenshot({ path: `${OUT}/gacha.png` });
  ok('소환권 없으면 소환 버튼 비활성', await p.locator('#gacha-1').isDisabled());
  await p.evaluate(() => { window.GAME.Game.profile.tickets = 40; });
  await p.click('#gacha-close'); await p.click('#btn-gacha');
  for (let i = 0; i < 8; i++) await p.click('#gacha-5');
  const st = await p.evaluate(() => { const P = window.GAME.Game.profile; const ids = window.GAME.GACHA.ownedIds(P); return { owned: ids.length, shards: Object.values(P.shards || {}).reduce((a, b) => a + b, 0), newcomer: ids.find((id) => !window.GAME.CHARACTERS.find((c) => c.id === id).starter) }; });
  ok('소환 → 영혼 조각 누적', st.shards >= 60, JSON.stringify(st));
  await p.click('#gacha-close');
  // 영혼 조각으로 돌파 (캐릭터 화면 버튼)
  await p.evaluate((id) => { const P = window.GAME.Game.profile; P.shards[id] = 20; }, st.newcomer);
  await p.click('#btn-roster'); await p.click(`#rc-${st.newcomer}`); await p.click('#btn-bt');
  ok('영혼 조각 20개 → 1돌파', await p.evaluate((id) => window.GAME.Game.profile.chars[id].bt === 1 && window.GAME.Game.profile.shards[id] === 0, st.newcomer));
  await p.click('#roster-close');
  // 도감: 새 캐릭터 선택 → 두 번째 필살기 장착
  await p.click('#btn-roster'); await p.click(`#rc-${st.newcomer}`);
  ok('도감: 필살기 6종 표시 (변주는 잠금)', (await p.locator('.rd-ult').count()) === 6);
  await p.click('#ult-B');
  ok('도감: Lv1은 두 번째 필살기 잠금', await p.evaluate((id) => window.GAME.Game.profile.chars[id].ult === 'A', st.newcomer));
  // 레벨을 올리면 배운다 (경험치 지급 → 도감 다시 열기)
  const lv = await p.evaluate((id) => { const G = window.GAME; G.GACHA.addExp(G.Game.profile, id, 5000); return G.Game.profile.chars[id].lv; }, st.newcomer);
  await p.click('#roster-close'); await p.click('#btn-roster'); await p.click(`#rc-${st.newcomer}`);
  await p.click('#ult-B');
  ok('도감: 레벨업 후 필살기 선택 저장' + ` (Lv ${lv})`, await p.evaluate((id) => window.GAME.Game.profile.chars[id].ult === 'B', st.newcomer));
  await p.screenshot({ path: `${OUT}/roster.png` });
  await p.click('#roster-close');
  // 파티 편성에 새 캐릭터 → 전투에 선택한 필살기 적용
  await p.click('#btn-party');
  ok('파티 편성: 소환한 캐릭터 표시', await vis(p, `#ps-${st.newcomer}`));
  await p.click('#ps-tobi'); await p.click(`#ps-${st.newcomer}`); await p.click('#ps-ok');
  ok('파티 편성: 새 캐릭터 출전', await p.evaluate((id) => window.GAME.Game.run.party.includes(id), st.newcomer));
  const ultName = await p.evaluate((id) => { const G = window.GAME.Game; G.go('battle', { node: { stage: 1, row: 0, type: 'battle', waves: [['goblin', 'goblin']] } }); const h = G.scene.sim.heroes.find((u) => u.key === id); return [h.def.name, G.scene.sim.skillDef(h, 'ult').name, window.GAME.GACHA.ultFor(G.profile, id).name]; }, st.newcomer);
  ok('전투: 새 캐릭터 + 선택한 필살기', ultName[1] === ultName[2], JSON.stringify(ultName));
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/battle_newchar.png` });
  // 보스 격파 보상: 소환권 5장
  const t0 = await p.evaluate(() => window.GAME.Game.profile.tickets);
  await p.evaluate(() => { const G = window.GAME.Game; window.GAME.grantBattleLoot(G.run, { stage: 5, row: 1, type: 'boss' }); });
  ok('보스 격파 → 소환권 5장', (await p.evaluate(() => window.GAME.Game.profile.tickets)) === t0 + 5);
  await p.close();
}

for (const vp of [{ width: 844, height: 390, name: 'iphone14_land' }, { width: 667, height: 375, name: 'iphoneSE_land' }, { width: 915, height: 412, name: 'galaxy_land' }, { width: 1920, height: 1080, name: 'fhd' }, { width: 390, height: 844, name: 'portrait' }]) {
  const p = await newPage(Object.assign({ mobile: vp.width < 1000 }, vp));
  await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, map: 1, battle: 1, charge: 1, break: 1 }; G.scenes.title.start(9); G.go('battle', { node: { stage: 2, row: 0, type: 'battle', waves: [['orc', 'goblin', 'goblin_caller']] } }); });
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `${OUT}/mobile_${vp.name}_battle.png` });
  // 터치 타겟 크기 (실제 화면 px): 전투/지도/필드의 모든 보이는 버튼·칩·초상화
  const measure = () => p.evaluate(() => {
    let min = 1e9, which = '';
    for (const e of document.querySelectorAll('#ui button, #ui select')) { const r = e.getBoundingClientRect(); if (!r.width || getComputedStyle(e).visibility === 'hidden' || e.offsetParent === null) continue; const m = Math.min(r.width, r.height); if (m < min) { min = m; which = e.id || e.className; } }
    return { min, which };
  });
  const tBattle = await measure();
  await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints.dungeon = 1; window.GAME.enterDungeon(G.run); }); await p.waitForTimeout(200);
  const tMap = await measure();
  await p.evaluate(() => window.GAME.Game.go('field')); await p.waitForTimeout(200);
  const tField = await measure();
  await p.evaluate(() => window.GAME.Game.go('battle', { node: { stage: 2, row: 0, type: 'battle', waves: [['orc', 'goblin', 'goblin_caller']] } })); await p.waitForTimeout(1500);
  const minTouch = [tBattle, tMap, tField].reduce((a, b) => (b.min < a.min ? b : a));
  if (vp.name !== 'portrait') ok(`모바일(${vp.name}): 터치 타겟 최소 ≥ 44px (전투·던전·필드)`, minTouch.min >= 43.5, `전투 ${tBattle.min.toFixed(1)} · 던전 ${tMap.min.toFixed(1)} · 필드 ${tField.min.toFixed(1)}px (최소: ${minTouch.which})`);
  // 레터박스: 스테이지가 화면 안에 있음
  const fit = await p.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight }; });
  ok(`해상도(${vp.name}): 16:9 레터박스 안에 맞음`, fit.l >= -1 && fit.t >= -1 && fit.r <= fit.w + 1 && fit.b <= fit.h + 1, JSON.stringify(fit));
  if (vp.name === 'portrait') ok('세로 화면: 회전 안내 표시', await vis(p, '#rotate'));
  // fps (헤드리스 소프트웨어 렌더 기준)
  await p.waitForTimeout(2000);
  report.fps[vp.name] = await p.evaluate(() => Math.round(window.GAME.Game.fps));
  await p.evaluate(() => { window.GAME.Game.go('dungeon'); }); await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/mobile_${vp.name}_dungeon.png` });
  await p.close();
}

// ---------------------------------------------------------------- 도적 · 적 도감 · 연계 (v0.35~v0.36)
{
  const p = await newPage();
  await p.evaluate(() => { const G = window.GAME.Game; G.settings.seenHints = { field: 1, battle: 1, break: 1, charge: 1, crush: 1 }; G.scenes.title.start(77); });
  await p.waitForTimeout(200);
  ok('도적 연: 선물로 보유', await p.evaluate(() => !!window.GAME.Game.profile.chars.yeon));
  const gold0 = await p.evaluate(() => window.GAME.Game.profile.gold);
  await p.evaluate(() => { const G = window.GAME.Game; G.run.party = ['tobi', 'yeon', 'bori']; window.GAME.refreshRunLoadout(G.run); G.go('battle', { node: { stage: 2, row: 0, type: 'battle', waves: [['goblin_archer', 'goblin']] } }); });
  await p.waitForTimeout(700);
  ok('도적: 전투 시작 은신', await p.evaluate(() => !!window.GAME.Game.scene.sim.heroes.find((h) => h.key === 'yeon').statuses.stealth));
  ok('도감: 처음 만난 적 등록 + 보상 골드', await p.evaluate((g0) => { const G = window.GAME.Game; return !!(G.profile.codex && G.profile.codex.goblin_archer) && G.profile.gold > g0; }, gold0));
  await p.evaluate(() => { const G = window.GAME.Game; G.debug.simMult = 16; });
  await p.waitForFunction(() => window.GAME.Game.sceneName !== 'battle', null, { timeout: 60000 }).catch(() => {});
  ok('도감: 전투 후 처치 수 기록', await p.evaluate(() => { const c = window.GAME.Game.profile.codex; return (c.goblin_archer && c.goblin_archer.kills >= 1) || (c.goblin && c.goblin.kills >= 1); }));
  await p.evaluate(() => { const G = window.GAME.Game; G.debug.simMult = 1; G.go('field'); });
  await p.waitForTimeout(300); await dismissHints(p);
  await p.click('#btn-codex'); await p.waitForTimeout(200);
  ok('도감: 열기 · 등록된 적 카드 · 연계 효과 안내', await vis(p, '#cx-goblin_archer') && !(await p.locator('#cx-goblin_archer').getAttribute('class')).includes('unknown') && (await p.locator('.codex-combo').innerText()).includes('독연 폭발'));
  await p.screenshot({ path: `${OUT}/codex.png` });
  await p.click('#codex-ach'); await p.waitForTimeout(150); ok('업적: 도감에서 열기 · 목록', await vis(p, '#ach-first_clear') && await vis(p, '#ach-boss_shadow_king'));
  await p.screenshot({ path: `${OUT}/achievements.png` }); await p.click('#ach-codex'); await p.waitForTimeout(150);
  await p.click('#codex-close'); ok('도감: 닫기', !(await vis(p, '.codex-box')));
  await p.evaluate(() => { const F = window.GAME.Game.scene; F.interact(F.interactables().find((x) => x.key === 'portal')); }); await p.waitForTimeout(200);
  await p.click('#oath-iron'); await p.waitForTimeout(100);
  ok('원정 맹세: 선택 → 보상 표시', (await p.locator('.oath-title').innerText()).includes('+25%'));
  ok('던전 장소: 처음엔 광산 잠김 · 고블린 굴 선택', await vis(p, '#site-mine.locked') && await vis(p, '#site-cave.on'));
  await p.click('#portal-yes'); await p.waitForTimeout(300);
  ok('원정 맹세: 입장 시 원정에 적용', await p.evaluate(() => (window.GAME.Game.run.oaths || []).includes('iron') && window.GAME.Game.sceneName === 'dungeon'));
  // 보스를 한 번 잡으면 광산이 열린다
  await p.evaluate(() => { const G = window.GAME.Game; G.profile.clears = { 0: 1 }; G.profile.oaths = []; G.go('field'); }); await p.waitForTimeout(300);
  await p.evaluate(() => { const F = window.GAME.Game.scene; F.interact(F.interactables().find((x) => x.key === 'portal')); }); await p.waitForTimeout(200);
  await p.click('#site-mine'); await p.waitForTimeout(150); await p.click('#portal-yes'); await p.waitForTimeout(400);
  ok('두 번째 던전: 버려진 광산 입장', await p.evaluate(() => window.GAME.Game.run.site === 'mine' && window.GAME.Game.sceneName === 'dungeon' && document.querySelector('.map-title').textContent.includes('버려진 광산')));
  await p.screenshot({ path: `${OUT}/mine.png` });
  await p.close();
}

await browser.close();
const errs = [...new Set(report.errors)];
ok('콘솔/페이지 에러 0건', errs.length === 0, errs.slice(0, 5).join(' | '));
const pass = report.checks.filter((c) => c.pass).length;
console.log(`\n${pass}/${report.checks.length} checks passed. fps(headless SW): ${JSON.stringify(report.fps)}`);
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
process.exit(pass === report.checks.length ? 0 : 1);
