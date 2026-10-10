// ===== 01g_patterns.js : 적 패턴 · 미지의 적 · 층 환경 (v0.59) =====
// 던전 세틀러즈처럼 "모르는 적과 싸우며 공략을 알아낸다":
//  - 처음 만난 적은 이름도 패턴도 모른다(???). 전투에서 패턴을 직접 겪으면 하나씩 파악되어 도감에 기록된다.
//  - 패턴을 모두 파악하면 그 적의 공략(정답)이 열린다. 처치하면 이름이 밝혀진다.
//  - 적마다 패턴 2~4개 (기존 능력 + 새 패턴), 정예·보스는 HP 구간마다 새 패턴을 드러낸다.
//  - 던전 층마다 환경 효과(어둠·독안개·불씨·서리·피의 달·축복)가 붙어 같은 적도 공략이 달라진다.

// 패턴 이름 · 공략 (도감에 기록되는 문구)
const PATTERN_INFO = {
  charge:     { n: '차지 공격', c: '빨간 예고 범위에서 빠지거나, 끊기를 채워 기절시킨다.' },
  leap:       { n: '도약', c: '1초 예고 뒤 멀리 있는 약한 영웅에게 뛰어든다 — 기절로 끊거나 대상을 빼낸다.' },
  caller:     { n: '호출 영창', c: '영창을 끊기 스킬로 끊는다. 놓치면 적이 늘어난다.' },
  warcry:     { n: '함성', c: '적 전체 공격력 +30% (6초) — 함성 전에 그로기를 만든다.' },
  enrage:     { n: '광폭', c: 'HP가 줄면 빨라진다 — 탱커가 받아낸다.' },
  regen:      { n: '재생', c: '화상·출혈·중독이 없으면 빠르게 재생한다 — 지속 피해를 유지한다.' },
  trap:       { n: '끈끈이 덫', c: '후열 발밑에 덫(둔화+피해) — 덫에서 빼내고 덫을 던지는 적부터.' },
  hunter:     { n: '후열 사냥', c: '도발이 안 듣고 약한 영웅을 노린다 — 원딜·도적으로 먼저 잡는다.' },
  frontGuard: { n: '정면 방패', c: '정면 피해가 크게 줄어든다 — 등 뒤로 돌아가거나 지속 피해로.' },
  frontRanged:{ n: '안개 장막', c: '정면 원거리 피해가 줄어든다 — 등 뒤에서 친다.' },
  poiseRegen: { n: '그로기 재생', c: '끊기 게이지가 다시 찬다 — 끊기·기절을 몰아서 한 번에.' },
  onHit:      { n: '독·화염·약화 평타', c: '맞을 때마다 상태이상 — 서포터의 해제로 씻거나 먼저 잡는다.' },
  bomb:       { n: '자폭', c: '가까이 오면 잠시 뒤 터진다 — 예고 범위에서 빠지거나 멀리서 먼저.' },
  phase:      { n: '페이즈 전환', c: 'HP가 줄면 패턴이 바뀌고 부하를 부른다 — 전환 직전에 화력을 아껴 둔다.' },
  // ---- v0.59 새 패턴
  reflect:    { n: '반격 자세', c: '자세(3초) 중 근접 평타 피해의 50%를 되돌려 주고 60%를 막는다 — 자세 동안 평타를 멈추고 스킬·원거리로.' },
  acid:       { n: '산성 침', c: '후열에 산성 웅덩이(지속 피해 + 받는 피해 증가) — 즉시 빠져나온다.' },
  guard:      { n: '수호 보호막', c: '가장 다친 동료에게 큰 보호막 — 이 적부터 잡거나 끊기로 영창을 끊는다.' },
  harden:     { n: '돌가죽', c: '4초간 받는 피해 -70% — 그로기로 깨거나 그동안 다른 적을 친다.' },
  blink:      { n: '그림자 걸음', c: '후열 곁으로 순간이동해 벤다 — 탱커 도발로 끌어오거나 후열을 지킨다.' },
  frenzy:     { n: '피의 갈증', c: '동료가 쓰러질 때마다 공격력 +20% (최대 3겹) — 이 적을 먼저, 아니면 마지막에 한꺼번에.' },
  aura:       { n: '저주 오라', c: '주변 영웅이 받는 회복 -50% — 멀리 끌어내 싸우거나 빨리 잡는다.' },
};
// 새 패턴 수치
const PAT = {
  reflect: { every: 11, first: 5, dur: 3, back: 0.5, block: 0.6 },
  acid: { every: 10, first: 4, r: 72, dur: 6, dps: 0.45, vuln: true },
  guard: { every: 13, first: 5, cast: 1.2, shield: 0.25 },
  harden: { every: 14, first: 6, dur: 4, cut: 0.7 },
  blink: { every: 12, first: 6, tele: 0.7, mult: 1.8 },
  frenzy: { step: 0.2, max: 3 },
  aura: { r: 150, cut: 0.5 },
};

AUTO_REACT.reflect = 1.2; // 자동 모드는 반격 자세를 1.2초 늦게 알아챈다

// 적에게 새 패턴을 붙인다 (기존 능력 + 새 패턴 = 2~4개). 보스·정예는 페이즈에 새 패턴.
const ENEMY_PATTERNS = {
  // 떼로 나오는 고블린은 하나만 (여럿이 동시에 순간이동하면 공략할 틈이 없다)
  goblin: ['frenzy'], goblin_archer: ['acid', 'frenzy'], goblin_shaman: ['guard'], goblin_stalker: ['blink'],
  orc: ['reflect'], orc_shield: ['reflect'], orc_hunter: ['acid'], orc_berserker: ['frenzy'], cave_troll: ['harden'],
  ogre: ['harden'], orc_captain: ['reflect'],
  skel_warrior: ['reflect', 'harden'], skel_archer: ['frenzy', 'acid'], wraith: ['blink', 'aura'], crypt_ghoul: ['frenzy'], lich_acolyte: ['guard', 'aura'], bone_giant: ['harden', 'reflect'],
  fiend_imp: ['frenzy'], hellhound: ['blink'], felguard: ['reflect', 'harden'], temptress: ['aura', 'blink'], demon_caller: ['guard'], doom_lord: ['reflect', 'aura'],
};
const BOSS_PHASE_PATTERNS = { // 보스: 몇 번째 페이즈(1부터)에 어떤 패턴을 새로 드러내나
  ogre_chief: { 1: ['reflect'], 2: ['harden'] }, thorn_queen: { 0: ['acid'] }, swamp_turtle: { 0: ['harden'] },
  shadow_king: { 1: ['blink'] }, stone_golem: { 1: ['harden'] }, lich_king: { 0: ['aura'], 1: ['guard'] }, pit_lord: { 1: ['aura', 'reflect'] },
};
(function attachPatterns() {
  for (const k in ENEMY_PATTERNS) if (ENEMIES[k]) ENEMIES[k].patterns = ENEMY_PATTERNS[k].slice();
  for (const k in BOSS_PHASE_PATTERNS) {
    const d = ENEMIES[k]; if (!d) continue; const m = BOSS_PHASE_PATTERNS[k];
    d.patterns = (m[0] || []).slice();
    (d.phases || []).forEach((ph, i) => { if (m[i + 1]) ph.patterns = m[i + 1].slice(); });
  }
})();

// 이 적이 가진 패턴 목록 (도감 · 발견 판정) — [{ k, n, c }]
function enemyPatterns(key) {
  const d = ENEMIES[key]; if (!d) return [];
  const out = [], add = (k, n, c) => { if (!out.some((x) => x.k === k)) out.push({ k, n: n || PATTERN_INFO[k].n, c: c || PATTERN_INFO[k].c }); };
  const kit = BOSS_KITS[key];
  if (d.abilities.includes('charge')) add('charge');
  if (d.leapEvery) add('leap');
  if (d.abilities.includes('caller')) add('caller');
  if (d.abilities.includes('warcry')) add('warcry');
  if (d.abilities.includes('enrage')) add('enrage');
  if (d.regen) add('regen');
  if (d.trapEvery) add('trap');
  if (d.hunter || d.ignoreTaunt) add('hunter');
  if (d.frontGuard) add('frontGuard');
  if (d.frontRangedDmg) add('frontRanged');
  if (d.poiseRegen) add('poiseRegen');
  if (d.onHit) add('onHit');
  if (d.selfDestruct) add('bomb');
  if (kit) { add('skill', kit.skill.name, '보스의 주기 기술 — 예고(장판·표시)를 보고 피하거나 대비한다.'); add('wipe', kit.wipe.name, kit.wipe.hint || '전멸기 — 화면 안내대로 끊거나 피한다.'); }
  if (d.phases && d.phases.length) add('phase');
  for (const k of d.patterns || []) add(k);
  for (const ph of d.phases || []) for (const k of ph.patterns || []) add(k);
  return out;
}

// ---------------------------------------------------------------- 층 환경 (던전 층마다 하나, 고블린 굴 1층은 없음)
const FLOOR_ENVS = {
  dark:    { n: '어둠', i: '🌑', d: '시야가 좁다 — 원거리 사거리 -25%, 화면이 어둡다', rangeMul: 0.75 },
  miasma:  { n: '독안개', i: '☁', d: '6초마다 영웅 모두 독(최대 HP 3%) — 서포터 해제·빠른 전투', every: 6, pct: 0.03 },
  embers:  { n: '불씨 바닥', i: '🔥', d: '8초마다 영웅 발밑에 불바닥 — 움직여 피한다', every: 8 },
  frost:   { n: '서리', i: '❄', d: '모두 느려진다 (이동 -25%, 공격 속도 -10%) — 차지 예고가 길게 느껴진다', move: 0.75, aspd: 0.9 },
  bloodmoon: { n: '피의 달', i: '🩸', d: '적 공격력 +20% · 대신 골드 +40%', atk: 0.2, gold: 0.4 },
  blessed: { n: '축복받은 땅', i: '✨', d: '영웅이 받는 회복 +25%', heal: 0.25 },
};
const SITE_ENVS = { cave: ['dark', 'blessed', 'embers'], mine: ['dark', 'embers', 'frost', 'bloodmoon', 'blessed'], crypt: ['dark', 'miasma', 'frost', 'bloodmoon', 'blessed'], abyss: ['embers', 'miasma', 'bloodmoon', 'dark', 'frost'] };
function rollFloorEnv(site, floor, rng) {
  if (site === 'cave' && floor <= 1) return null;
  const pool = SITE_ENVS[site] || SITE_ENVS.cave;
  if (rng() < (site === 'cave' ? 0.4 : 0.2)) return null; // 가끔은 평범한 층
  return pool[Math.floor(rng() * pool.length)];
}
