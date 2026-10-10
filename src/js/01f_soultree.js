// ===== 01f_soultree.js : 소울트리 (v0.57) — 패스 오브 엑자일식 하나로 이어진 원형 패시브 트리 =====
// 10개 직업이 원 둘레에 자리를 잡는다. 캐릭터는 자기 직업의 「영혼석」(시작점)에서 출발해 이웃한 노드만 찍어 나간다.
// 직업 구역: 두 갈래(옛 특성 트리의 두 전문화) — 작은 노드 · 이름 있는 노드(주요) · 끝의 핵심(키스톤).
// 구역 사이에는 공용 노드 다리가 있어 이웃 직업 구역으로 건너갈 수도 있다 (먼 길 · 점수 많이 든다).
// 점수: 캐릭터 레벨 1당 1점 (Lv 2부터) — 01e 의 talentPoints 그대로. 효과는 장비와 같은 mods 로 → 04b_equip.heroLoadout.

const SOUL_CLASSES = ['tank', 'melee', 'rogue', 'monk', 'ranged', 'mage', 'warlock', 'demon', 'necro', 'support'];
const SOUL_CLASS_NAME = { tank: '수호', melee: '검', rogue: '그림자', monk: '기', ranged: '활', mage: '비전', warlock: '저주', demon: '악마', necro: '죽음', support: '빛' };
const SOUL_GENERIC = [['hp_pct', 0.02], ['atk_pct', 0.015], ['aspd', 0.012], ['crit', 0.008], ['dr', 0.008], ['cdr', 0.01], ['ultgain', 0.02], ['skilldmg', 0.015]];
const SOUL_R0 = 118, SOUL_STEP = 33, SOUL_PATH = 16; // 시작점 반지름 · 갈래 노드 간격 · 갈래 노드 수

const SOUL = (() => {
  const nodes = {}, links = {};
  const add = (n) => { nodes[n.id] = n; links[n.id] = links[n.id] || []; return n; };
  const link = (a, b) => { if (!links[a].includes(b)) links[a].push(b); if (!links[b].includes(a)) links[b].push(a); };
  const pos = (ang, r) => ({ x: Math.round(Math.cos(ang) * r), y: Math.round(Math.sin(ang) * r) });
  const deg = Math.PI / 180, sector = 360 / SOUL_CLASSES.length;
  let gi = 0; const gen = (id, ang, r) => { const [k, v] = SOUL_GENERIC[gi++ % SOUL_GENERIC.length]; return add(Object.assign({ id, type: 'small', generic: true, stats: [[k, v]], name: TALENT_STAT_NAME[k] || k }, pos(ang, r))); };
  const ang = (k) => (k * sector - 90) * deg;
  SOUL_CLASSES.forEach((cls, k) => {
    const th = ang(k), brs = TALENTS[cls] || [];
    add(Object.assign({ id: `${cls}:start`, type: 'start', cls, stats: [], name: `${SOUL_CLASS_NAME[cls]}의 영혼석` }, pos(th, SOUL_R0)));
    brs.forEach((br, b) => {
      const side = b ? 1 : -1, nd = br.nodes, tiers = [0, 1, 2].map((t) => nd.filter((n) => n.tier === t)), cap = nd.find((n) => n.cap);
      const seq = [];
      for (let t = 0; t < 3; t++) { const [a, c] = tiers[t]; seq.push(['s', a], ['s', c], ['s', a], ['s', c], ['n', a, c]); }
      seq.push(['k', cap]);
      let prev = `${cls}:start`;
      seq.forEach((s, i) => {
        const r = SOUL_R0 + SOUL_STEP * (i + 2) + (s[0] === 'k' ? 22 : 0), a = th + side * (7 + (i % 2 ? 1.6 : 0) + i * 0.15) * deg, id = `${cls}:${b}:${i}`;
        let n;
        if (s[0] === 's') n = { id, type: 'small', stats: [[s[1].stat, s[1].v]], name: s[1].name };
        else if (s[0] === 'n') n = { id, type: 'notable', stats: [[s[1].stat, s[1].v * 1.5], [s[2].stat, s[2].v * 1.5]], name: s[1].name };
        else n = { id, type: 'keystone', stats: s[1].fx.slice(), passive: s[1].passive || null, name: s[1].name, desc: s[1].desc };
        add(Object.assign(n, { cls, branch: br.key, branchName: br.name }, pos(a, r)));
        link(prev, id); prev = id;
      });
    });
    // 갈래 사이 다리 (주요 노드 1·2단을 잇는 공용 노드)
    if (brs.length === 2) for (const i of [4, 9]) { const r = SOUL_R0 + SOUL_STEP * (i + 2); const g = gen(`${cls}:x${i}`, th, r); link(`${cls}:0:${i}`, g.id); link(`${cls}:1:${i}`, g.id); }
  });
  // 이웃 직업 구역 다리: 안쪽 영혼 고리(시작점끼리) + 바깥 다리 두 줄
  SOUL_CLASSES.forEach((cls, k) => {
    const nx = SOUL_CLASSES[(k + 1) % SOUL_CLASSES.length], mid = ang(k) + sector / 2 * deg;
    const ring = gen(`ring:${k}`, mid, SOUL_R0 - 4); link(`${cls}:start`, ring.id); link(ring.id, `${nx}:start`);
    for (const i of [2, 10]) {
      const r = SOUL_R0 + SOUL_STEP * (i + 2) + 10;
      const g1 = gen(`bridge:${k}:${i}:a`, mid - 4.5 * deg, r), g2 = gen(`bridge:${k}:${i}:b`, mid + 4.5 * deg, r);
      link(`${cls}:1:${i}`, g1.id); link(g1.id, g2.id); link(g2.id, `${nx}:0:${i}`);
    }
  });
  return { nodes, links };
})();

function soulStart(heroId) { return `${HEROES[heroId].role}:start`; }
function soulState(p, id) { p.soul = p.soul || {}; return (p.soul[id] = p.soul[id] || []); }
function soulHas(p, id, nid) { return nid === soulStart(id) || soulState(p, id).includes(nid); }
// 이웃 노드가 이미 찍혀 있어야 찍을 수 있다
function soulCanAdd(p, id, nid) {
  const n = SOUL.nodes[nid]; if (!n || n.type === 'start' || soulHas(p, id, nid)) return false;
  if (talentSpent(p, id) >= talentPoints(p, id)) return false;
  return SOUL.links[nid].some((m) => soulHas(p, id, m));
}
function soulAdd(p, id, nid) { if (!soulCanAdd(p, id, nid)) return false; soulState(p, id).push(nid); return true; }
// 빼도 나머지가 시작점과 이어져 있어야 뺄 수 있다 (POE처럼)
function soulCanRemove(p, id, nid) {
  const s = soulState(p, id); if (!s.includes(nid)) return false;
  const rest = new Set(s.filter((x) => x !== nid)), seen = new Set([soulStart(id)]), q = [soulStart(id)];
  while (q.length) { const c = q.pop(); for (const m of SOUL.links[c]) if (rest.has(m) && !seen.has(m)) { seen.add(m); q.push(m); } }
  return seen.size - 1 === rest.size;
}
function soulRemove(p, id, nid) { if (!soulCanRemove(p, id, nid)) return false; const s = soulState(p, id); s.splice(s.indexOf(nid), 1); return true; }
// 시작점에서 가장 가까운 길 (찍지 않은 노드 수) — 길 미리보기 · 「여기까지 찍기」
function soulPathTo(p, id, nid) {
  if (soulHas(p, id, nid)) return [];
  const prev = {}, q = [], seen = new Set();
  for (const s of [soulStart(id)].concat(soulState(p, id))) { seen.add(s); q.push(s); }
  for (let qi = 0; qi < q.length; qi++) { const c = q[qi]; if (c === nid) break; for (const m of SOUL.links[c]) if (!seen.has(m) && SOUL.nodes[m].type !== 'start') { seen.add(m); prev[m] = c; q.push(m); } }
  if (!seen.has(nid)) return null;
  const path = []; for (let c = nid; c && !soulHas(p, id, c); c = prev[c]) path.unshift(c);
  return path;
}
// 노드 설명
function soulNodeText(n) {
  if (n.type === 'start') return '이 직업의 출발점';
  if (n.type === 'keystone') return n.desc;
  return n.stats.map(([k, v]) => `${TALENT_STAT_NAME[k] || k} +${k === 'poisonstack' || k === 'kimax' || k === 'minioncap' || k === 'corpseextra' ? v : Math.round(v * 1000) / 10 + '%'}`).join(' · ');
}

// ---- 옛 특성 API 를 소울트리로 (04b_equip · 화면이 그대로 쓴다)
function talentSpent(p, id) { return soulState(p, id).length; }
function talentReset(p, id) { p.soul = p.soul || {}; p.soul[id] = []; }
function talentMods(p, id) {
  const out = { passives: {} };
  for (const nid of soulState(p, id)) {
    const n = SOUL.nodes[nid]; if (!n) continue;
    for (const [k, v] of n.stats) out[k] = (out[k] || 0) + v;
    if (n.passive) out.passives[n.passive[0]] = n.passive[1];
  }
  return out;
}
// v0.57 이전 특성 → 소울트리: 찍은 점수는 모두 돌려준다 (레벨로 다시 계산)
function soulMigrate(p) {
  if (p.soulVer === 1) return false;
  const had = p.talents && Object.values(p.talents).some((s) => Object.values(s || {}).some((v) => v > 0));
  p.talents = {}; p.soul = p.soul || {}; p.soulVer = 1;
  return !!had;
}
