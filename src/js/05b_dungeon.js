// ===== 05b_dungeon.js : 던전 층 생성 (다키스트 던전처럼 방 + 복도) =====
// 한 원정 = 1~5층 + 보스 층(6층). 층마다 방 3~5개(보스 층 5개)가 격자 위에 놓이고 복도로 이어진다.
// 입구 방에서 시작해 계단 방(입구에서 가장 먼 방)을 찾아 내려간다.
// 보스 층: 보스 방은 잠겨 있고, 열쇠 / 레버 / 봉인석 중 하나의 기믹을 풀어야 열린다.

const DUNGEON = {
  FLOORS: 5, BOSS_FLOOR: 6,
  GRID_W: 5, GRID_H: 3,
  ROOMS: [3, 5],           // 1~5층 방 수 (입구·계단 포함)
  BOSS_ROOMS: 5,           // 가장 깊은 곳 방 수
  NAMED: [0.08, 0.02],     // 복도 네임드 정예 확률: 8% + 층×2% (2층부터)
  STAIRS_HEAL: 0.2,        // 계단을 내려가며 숨 돌리기: 최대 HP 20% 회복
  CORR_LEN: 2200,          // 복도 길이 (px) — 짧게
  ROOM_W: 1200,            // 방 화면 폭
  FIELD_W: 1440,           // 전투 영역 (고정, 화면 1.5배)
};

// 방 종류
const ROOM_KINDS = {
  start:    { name: '입구', icon: '⌂', color: '#8a8a9a' },
  combat:   { name: '적의 소굴', icon: '⚔', color: '#b05a4a' },
  elite:    { name: '정예의 방', icon: '☠', color: '#d0503a' },
  camp:     { name: '야영지', icon: '♨', color: '#e09a3a' },
  treasure: { name: '보물 방', icon: '◆', color: '#e8c040' },
  stairs:   { name: '계단', icon: '▼', color: '#6ab0e0' },
  boss:     { name: '보스 방', icon: '♛', color: '#c03a5a' },
  key:      { name: '열쇠 방', icon: '⚷', color: '#e0d060' },
  lever:    { name: '레버 방', icon: '⫯', color: '#a0c060' },
  seal:     { name: '봉인석 방', icon: '◎', color: '#a070e0' },
};
// 보스 층 기믹: 무엇을 몇 개 모아야 보스 방이 열리는가
const BOSS_GIMMICKS = {
  key:   { name: '열쇠', need: 1, kind: 'key', text: '보스 방이 잠겨 있다. 정예가 지키는 열쇠를 찾아야 한다.' },
  lever: { name: '레버', need: 2, kind: 'lever', text: '보스 방 문이 굳게 닫혀 있다. 층 어딘가의 레버 2개를 모두 내려야 한다.' },
  seal:  { name: '봉인석', need: 3, kind: 'seal', text: '보스 방에 봉인이 걸려 있다. 봉인석 3개를 지키는 적을 쓰러뜨리고 부숴야 한다.' },
};
// 복도의 네임드 정예 이름
const NAMED_ELITES = ['붉은 송곳니', '외눈 바르크', '뼈 수집가 그롬', '늪의 우그', '쇠사슬 크락', '피 묻은 도끼', '굴 지기 모르그'];

// 층 번호 → 조우 테이블 단계 (1~4)
function floorStage(floor) { return Math.max(1, Math.min(4, floor)); }

function genFloor(seed, floor) {
  const rng = makeRng(hashSeed(seed, 'floor', floor));
  const boss = floor === DUNGEON.BOSS_FLOOR;
  const n = boss ? DUNGEON.BOSS_ROOMS : rng.int(DUNGEON.ROOMS[0], DUNGEON.ROOMS[1]);
  const W = DUNGEON.GRID_W, H = DUNGEON.GRID_H;
  const cells = {}, rooms = [], edges = [];
  const key = (x, y) => x + ',' + y;
  const add = (x, y, parent) => { const r = { id: rooms.length, gx: x, gy: y, type: 'combat', visited: false, cleared: false }; rooms.push(r); cells[key(x, y)] = r; if (parent) edges.push([parent.id, r.id]); return r; };
  add(0, rng.int(0, H - 1), null);
  // 방을 하나씩 이웃 칸에 붙여 나간다 (오른쪽으로 뻗어 나가기 쉽게)
  for (let guard = 0; rooms.length < n && guard < 500; guard++) {
    const from = rooms[rng.int(0, rooms.length - 1)];
    const dirs = rng.shuffle([[1, 0], [1, 0], [0, 1], [0, -1], [-1, 0]]);
    for (const [dx, dy] of dirs) {
      const x = from.gx + dx, y = from.gy + dy;
      if (x < 0 || y < 0 || x >= W || y >= H || cells[key(x, y)]) continue;
      add(x, y, from); break;
    }
  }
  // 고리 몇 개 (이웃한 방 사이에 복도 추가)
  for (const r of rooms) for (const [dx, dy] of [[1, 0], [0, 1]]) {
    const o = cells[key(r.gx + dx, r.gy + dy)];
    if (o && !edges.some((e) => (e[0] === r.id && e[1] === o.id) || (e[0] === o.id && e[1] === r.id)) && rng() < 0.3) edges.push([r.id, o.id]);
  }
  // 입구에서의 거리
  const adj = rooms.map(() => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  const dist = rooms.map(() => Infinity); dist[0] = 0;
  const q = [0];
  while (q.length) { const c = q.shift(); for (const o of adj[c]) if (dist[o] === Infinity) { dist[o] = dist[c] + 1; q.push(o); } }
  const far = rooms.slice(1).sort((a, b) => dist[b.id] - dist[a.id] || b.gx - a.gx)[0];
  rooms[0].type = 'start'; rooms[0].visited = true; rooms[0].cleared = true;
  const fl = { floor, seed, rooms, corridors: [], at: { room: 0 }, gimmick: null, have: 0 };
  if (boss) {
    far.type = 'boss';
    const gk = rng.pick(Object.keys(BOSS_GIMMICKS)), G = BOSS_GIMMICKS[gk];
    fl.gimmick = gk;
    const cand = rng.shuffle(rooms.filter((r) => r.type === 'combat' && dist[r.id] >= 1));
    cand.slice(0, G.need).forEach((r) => { r.type = G.kind; });
  } else {
    far.type = 'stairs';
    for (const r of rooms) if (r.type === 'combat') {
      const v = rng();
      r.type = v < 0.2 && floor >= 2 ? 'elite' : v < 0.32 ? 'camp' : v < 0.46 ? 'treasure' : 'combat';
    }
    // 2층부터는 야영지가 최소 하나 (긴 원정에서 숨 돌릴 곳)
    if (floor >= 2 && !rooms.some((r) => r.type === 'camp')) { const c = rooms.filter((r) => r.type === 'combat' || r.type === 'treasure'); const c2 = c.length ? c : rooms.filter((r) => r.type === 'elite'); if (c2.length) rng.pick(c2).type = 'camp'; }
  }
  // 방 안의 적
  const st = floorStage(floor);
  for (const r of rooms) {
    if (['combat', 'stairs', 'lever', 'seal'].includes(r.type)) r.fight = { type: 'battle', enc: rng.int(0, 99) };
    if (r.type === 'elite' || r.type === 'key') r.fight = { type: 'elite', enc: rng.int(0, 99), affix: rng.pick(Object.keys(ELITE_AFFIXES)) };
    if (r.type === 'boss') r.fight = { type: 'boss', enc: rng.int(0, 99) };
    if (!r.fight) r.cleared = r.type === 'start';
  }
  // 복도: 작은 적 무리 2번 (가끔 하나가 네임드 정예) + 함정·보급 최대 2개
  edges.forEach(([a, b], i) => {
    const L = DUNGEON.CORR_LEN, items = [];
    let uid = 0;
    const fx = [Math.round(L * 0.3 + rng.int(-80, 80)), Math.round(L * 0.68 + rng.int(-80, 80))];
    fx.forEach((x, k) => {
      const named = k === 1 && floor >= 2 && rng() < DUNGEON.NAMED[0] + floor * DUNGEON.NAMED[1];
      items.push(named
        ? { id: ++uid, kind: 'elite', x, enc: rng.int(0, 99), affix: rng.pick(Object.keys(ELITE_AFFIXES)), named: rng.pick(NAMED_ELITES), done: false }
        : { id: ++uid, kind: 'fight', x, small: true, enc: rng.int(0, 99), done: false });
    });
    const extras = rng.int(0, 2);
    const spots = rng.shuffle([Math.round(L * 0.14), Math.round(L * 0.5), Math.round(L * 0.86)]).slice(0, extras);
    for (const x of spots) items.push({ id: ++uid, kind: rng() < 0.45 ? 'trap' : 'supply', x, done: false });
    items.sort((p, q2) => p.x - q2.x);
    fl.corridors.push({ id: i, a, b, len: L, items, walked: false });
  });
  void st;
  return fl;
}

// 방에 붙은 복도와 이웃 방
function floorNeighbors(fl, roomId) {
  return fl.corridors.filter((c) => c.a === roomId || c.b === roomId).map((c) => ({ corr: c, room: fl.rooms[c.a === roomId ? c.b : c.a] }));
}
// 지도에 보이는가: 가 본 방 + 그 이웃 (이웃은 종류를 모른다)
function roomKnown(fl, r) { return r.visited; }
function roomSeen(fl, r) { return r.visited || floorNeighbors(fl, r.id).some((n) => n.room.visited); }
// 보스 방이 열렸는가
function bossOpen(fl) { return !fl.gimmick || fl.have >= BOSS_GIMMICKS[fl.gimmick].need; }
// 복도 안의 것들을 걷는 방향 기준 좌표로 (from 방에서 출발)
function corridorTrack(c, fromId) {
  const fwd = c.a === fromId;
  return c.items.map((it) => ({ it, x: fwd ? it.x : c.len - it.x })).sort((p, q) => p.x - q.x);
}
// 조우 웨이브
function corridorWaves(fl, it) {
  const st = floorStage(fl.floor);
  if (it.kind === 'elite') return encounterFor({ type: 'elite', stage: st, enc: it.enc });
  const t = ENCOUNTERS.small[st];
  return [t[it.enc % t.length]];
}
