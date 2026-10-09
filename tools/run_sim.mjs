// 원정 길이·난이도 측정: node tools/run_sim.mjs [runs=6] [simMult=16]
// 실제 게임(dist)을 자동 모드로 끝까지 돌려 층별 전투 수·전투 시간·이동 시간·사망·결과를 잰다.
// "1배속 체감 시간" = 전투 시뮬 시간 + 복도 걷기(210px/s) + 방 대기(1.4초) — 보상·야영 화면은 뺀 값.
import { chromium } from 'playwright';
import path from 'path';
const RUNS = +(process.argv[2] || 6), MULT = +(process.argv[3] || 16), SMART = process.argv[4] === 'smart'; // smart: 잘 컨트롤하는 플레이어 흉내
const LV = +(process.env.LV || 5), GEAR = process.env.GEAR || 'uc', PREP = process.env.PREP !== '0'; // PREP: 상인에게서 물약 4 · 상급 1 · 식량 3 · 함정 도구 1을 사 가고, 던전에서 HP 40% 아래 동료에게 쓴다 // 준비된 파티: 캐릭터 레벨 LV + 상인 UC 무기·갑옷 (GEAR=none이면 맨몸)
const PARTIES = [['tobi', 'danbi', 'bori'], ['tobi', 'soldam', 'bori'], ['tobi', 'byeolbi', 'bori']];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve('dist/forest_expedition.html')); await p.waitForTimeout(300);
const scene = () => p.evaluate(() => window.GAME.Game.sceneName);
const vis = async (sel) => (await p.locator(sel).count()) > 0 && (await p.locator(sel).first().isVisible());
const clickIf = async (sel) => { if (await vis(sel)) { await p.locator(sel).first().click(); await p.waitForTimeout(60); return true; } return false; };
// 계측: Game.go를 감싸 전투 시작/끝, 복도 진입을 기록
await p.evaluate(() => {
  const G = window.GAME.Game, go = G.go.bind(G);
  G.go = (name, params) => {
    const L = window.__log;
    if (L && G.sceneName === 'battle' && G.scene.sim) { const s = G.scene.sim, b = L.battles[L.battles.length - 1]; if (b && b.t === undefined) { b.t = s.time; b.out = s.outcome; b.dead = s.heroes.filter((h) => !h.alive).length; b.wipes = s.wipeLog ? s.wipeLog.map((w) => (w.ok ? 'O' : 'X')).join('') : ''; } }
    if (L && name === 'battle' && params && params.node) { const n = params.node; L.battles.push({ floor: G.run.dungeon ? G.run.dungeon.floor : 0, kind: n.type === 'boss' ? 'boss' : n.named ? 'named' : n.small ? 'small' : n.type === 'elite' ? 'elite' : 'room', waves: n.waves.length }); }
    return go(name, params);
  };
  setInterval(() => { const L = window.__log, fl = G.run && G.run.dungeon; if (!L || !fl) return; const k = fl.floor + ':' + (fl.at.corr !== undefined ? 'c' + fl.at.corr + ':' + fl.at.from : 'r' + fl.at.room); if (k !== L.lastK) { L.lastK = k; if (fl.at.corr !== undefined) L.corr[fl.floor] = (L.corr[fl.floor] || 0) + 1; else L.rooms[fl.floor] = (L.rooms[fl.floor] || 0) + 1; } }, 20);
});
const out = [];
for (let i = 0; i < RUNS; i++) {
  const party = PARTIES[i % PARTIES.length], seed = 1000 + i * 37;
  await p.evaluate(([s, M, SM]) => { const G = window.GAME.Game; window.__log = { battles: [], corr: {}, rooms: {} }; G.settings.seenHints = { field: 1, map: 1, battle: 1, charge: 1, break: 1, crush: 1, explore: 1, dungeon: 1 }; G.debug.simMult = M; G.debug.smartAuto = SM; G.scenes.title.start(s); for (const k in G.run.strategy) { G.run.strategy[k].s2.auto = true; G.run.strategy[k].ult.auto = true; } }, [seed, MULT, SMART]);
  await p.waitForTimeout(200);
  await p.evaluate((pt) => { window.GAME.Game.run.party = pt; window.GAME.Game.scene.rebuildParty(); }, party);
  await p.evaluate(([pt, lv, gear, prep]) => { const { Game, EQ, makeRng } = window.GAME, P = Game.profile;
    for (const id in P.chars) { P.chars[id].lv = lv; P.chars[id].exp = 0; }
    for (const id of pt) for (const s of EQ.SLOTS) P.equip[id][s] = null;
    if (gear === 'uc') for (const id of pt) for (const slot of ['weapon', 'armor']) { const base = EQ.DB.items.find((it) => it.cls === EQ.heroClass(id) && it.slot === slot && it.line === 1); const it = EQ.rollItem(makeRng(7 + id.length), P, { base: base.id, grade: 'UC' }); P.inv.push(it); P.equip[id][slot] = it.uid; }
    if (prep) Object.assign(Game.run, { potions: 4, bigPotions: 1, food: 3, trapKits: 1 });
  }, [party, LV, GEAR, PREP]);
  await p.evaluate(() => { const F = window.GAME.Game.scene; F.interact(F.interactables().find((x) => x.key === 'chest')); });
  await p.click('#btn-automove'); await p.waitForSelector('#portal-yes', { timeout: 20000 }); await p.click('#portal-yes');
  const t0 = Date.now();
  for (let step = 0; step < 6000 && Date.now() - t0 < 900000; step++) {
    for (let k = 0; k < 3; k++) if (!(await clickIf('#hint-ok'))) break;
    const sc = await scene();
    if (process.env.DEBUG && step % 40 === 0) console.log('dbg', Math.round((Date.now() - t0) / 1000) + 's', sc, await p.evaluate(() => { const G = window.GAME.Game, fl = G.run.dungeon, S = G.scene; return JSON.stringify({ modal: G.modalOpen, ov: G.modalOpen ? G.overlay.innerText.slice(0, 60) : '', floor: fl && fl.floor, at: fl && fl.at, sim: S.sim ? { t: Math.round(S.sim.time), out: S.sim.outcome } : null }); }));
    if (sc === 'result') break;
    if (sc === 'dungeon') {
      if (PREP) await p.evaluate(() => { const r = window.GAME.Game.run; for (const id of r.party) { const h = r.heroes[id]; if (h.dead || h.hp > h.maxHp * 0.4) continue; if (r.bigPotions > 0) { r.bigPotions--; h.hp = h.maxHp; } else if (r.potions > 0) { r.potions--; h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.5); } } });
      await p.waitForTimeout(120); continue;
    }
    if (sc === 'battle') { await p.waitForFunction(() => window.GAME.Game.sceneName !== 'battle' || !!document.querySelector('#hint-ok'), null, { timeout: 180000 }); continue; }
    if (sc === 'reward') { if (await vis('#reward-0')) { await p.click('#reward-0'); await p.click('#btn-reward-confirm'); } else await p.click('#btn-continue'); continue; }
    if (sc === 'event') { const n = await p.locator('.event-choices .btn:not([disabled])').count(); if (n) await p.locator('.event-choices .btn:not([disabled])').first().click(); await clickIf('#btn-continue'); continue; }
    if (sc === 'shop') { await clickIf('#btn-continue'); continue; }
    if (sc === 'rest') { if (!(await clickIf('#rest-food:not([disabled])'))) await clickIf('#rest-hungry'); await clickIf('#btn-continue'); continue; }
    await p.waitForTimeout(150);
  }
  const r = await p.evaluate(() => { const G = window.GAME.Game, r = G.run; return { result: r.result, floor: r.dungeon ? r.dungeon.floor : 0, log: window.__log, lv: r.party.map((id) => (G.profile.chars[id] || {}).lv), dead: Object.values(r.heroes).filter((h) => h.dead).length }; });
  const L = r.log, B = L.battles.filter((b) => b.t !== undefined);
  const corr = Object.values(L.corr).reduce((a, b) => a + b, 0), rooms = Object.values(L.rooms).reduce((a, b) => a + b, 0);
  const battleSec = B.reduce((a, b) => a + b.t, 0), walkSec = corr * 2200 / 210, roomSec = rooms * 1.4;
  const byKind = {}; for (const b of B) byKind[b.kind] = (byKind[b.kind] || 0) + 1;
  const byFloor = {}; for (const b of B) byFloor[b.floor] = (byFloor[b.floor] || 0) + 1;
  const boss = B.find((b) => b.kind === 'boss');
  const row = { seed, party: party.join('+'), result: r.result, floor: r.floor, battles: B.length, byKind, byFloor, corr, rooms, battleMin: +(battleSec / 60).toFixed(1), walkMin: +(walkSec / 60).toFixed(1), totalMin: +((battleSec + walkSec + roomSec) / 60).toFixed(1), avgBattle: Math.round(battleSec / Math.max(1, B.length)), boss: boss ? { t: Math.round(boss.t), out: boss.out, wipes: boss.wipes, dead: boss.dead } : null, deadHeroes: r.dead, lv: r.lv, losses: B.filter((b) => b.out === 'lose').map((b) => b.floor + b.kind) };
  out.push(row); console.log(JSON.stringify(row));
}
const wins = out.filter((r) => r.result === 'victory').length;
const avg = (k) => (out.reduce((a, r) => a + r[k], 0) / out.length).toFixed(1);
console.log(`\n승리 ${wins}/${out.length} · 평균 전투 ${avg('battles')}회 · 1배속 예상 ${avg('totalMin')}분 (전투 ${avg('battleMin')} + 이동 ${avg('walkMin')}) · 전투당 ${avg('avgBattle')}초`);
if (errs.length) console.log('errors', errs);
await browser.close();
