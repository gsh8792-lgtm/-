// ===== 09e_codex.js : 적 도감 — 만난 적, 능력, 그리고 "정답" =====
// 전투에서 처음 보는 적이 나오면 도감에 등록되고(보상 골드), 화면에 대응법이 잠깐 뜬다.
// 처치 수는 전투가 끝날 때 기록. 저장: profile.codex = { key: { seen: 1, kills: n } }
const ENEMY_CODEX = {
  goblin:         { tags: ['떼'], answer: '약하지만 떼로 온다. 범위 스킬(회전 베기·화살비·독 폭탄)로 한꺼번에.' },
  goblin_archer:  { tags: ['원거리'], answer: '뒤에서 쏜다. 도적·근딜이 파고들거나 원딜로 맞불.' },
  goblin_caller:  { tags: ['호출'], answer: '나팔(호출) 영창을 끊기 스킬로 끊는다. 놓치면 적이 늘어난다.' },
  goblin_shaman:  { tags: ['치유', '원거리'], answer: '동료를 치유하는 영창을 건다. 끊기로 끊고 최우선으로 처치.' },
  goblin_bomber:  { tags: ['자폭'], answer: '가까이 오면 1.4초 뒤 자폭. 예고 범위에서 빠지거나 멀리서 먼저 잡는다.' },
  goblin_stalker: { tags: ['도발 무시', '사냥꾼'], answer: '도발이 안 듣고 가장 약한 영웅을 노린다. 원딜·도적으로 먼저 잡는다.' },
  goblin_trapper: { tags: ['덫', '원거리'], answer: '후열 발밑에 끈끈이 덫(둔화+독). 덫에서 빼내고 덫사냥꾼부터 잡는다.' },
  orc:            { tags: ['방어 태세', '광폭'], answer: '그로기로 방어 태세를 깨고 몰아친다. 광폭(HP 50%) 뒤엔 탱커가 받아낸다.' },
  orc_shield:     { tags: ['정면 방패'], answer: '정면 피해 65% 감소. 등 뒤로 돌아가거나(도적·그림자 걸음) 지속 피해로.' },
  orc_hunter:     { tags: ['도발 무시', '원거리', '사냥꾼'], answer: '멀리서 서포터를 노린다. 도적·원딜로 먼저 처리한다.' },
  orc_berserker:  { tags: ['도발 무시', '도약'], answer: '멀리 있는 약한 영웅에게 1초 예고 후 도약. 기절로 끊거나 대상을 빼낸다.' },
  cave_troll:     { tags: ['재생'], answer: '화상·출혈·중독이 없으면 빠르게 재생한다(전투당 최대 HP만큼까지). 지속 피해를 유지하며 몰아친다.' },
  ogre:           { tags: ['차지'], answer: '빨간 예고 범위에서 빠지거나 끊기 칸을 채워 기절시킨다. 등 뒤에서 치면 끊기가 쉽다.' },
  orc_captain:    { tags: ['함성', '차지', '광폭'], answer: '정예의 핵심. 함성 전에 그로기를 만들고, 차지는 끊거나 피한다.' },
  ogre_chief:     { tags: ['보스', '짓누름', '전멸기'], answer: '평타가 짓누름을 쌓는다 — 탱커가 앞에서 받는다. 전멸기는 화면 안내대로 끊거나 피한다.' },
  thorn_queen:    { tags: ['보스', '꽃봉오리', '전멸기'], answer: '꽃봉오리부터 끊고, 독꽃 전멸기는 원거리 화력으로 빠르게 부순다.' },
  thorn_bud:      { tags: ['호출', '끊기 저항'], answer: '고블린을 부른다. 끊기 저항 — 두 직업 이상이 함께 끊어야 한다.' },
  wipe_bud:       { tags: ['전멸기'], answer: '시간 안에 모두 부숴야 한다. 근접은 직접 집중 공격을 지시.' },
  mist_stag:      { tags: ['보스', '후열 사냥', '안개'], answer: '정면 원거리 피해가 줄어든다. 등 뒤에서 치고, HP 50% 아래(2페이즈)부터는 후열을 사냥하니 탱커가 도발로 붙잡는다.' },
  stone_golem:    { tags: ['보스', '광산', '낙석', '피난처'], answer: '낙석은 여러 영웅 발밑에 동시에 떨어진다 — 예고를 보고 흩어진다. 갱도 붕괴는 무너지지 않는 자리(빛나는 원)로.' },
  shadow_king:    { tags: ['보스', '순간이동', '분신'], answer: '사라졌다가 가장 먼 영웅 곁에 나타나 벤다 — 예고 범위에서 빼낸다. 월식은 망토(보호막)를 몰아서 찢는다.' },
  skel_warrior:   { tags: ['방어'], answer: '단단하지만 느리다. 탱커가 붙잡고 범위 스킬로 같이 깎는다.' },
  skel_archer:    { tags: ['원거리'], answer: '뒤에서 쏜다. 도적·근딜이 파고들거나 원딜로 맞불.' },
  wraith:         { tags: ['도발 무시', '사냥꾼'], answer: '서포터를 노린다. 원딜·도적으로 먼저 잡거나 서포터 앞을 막는다.' },
  crypt_ghoul:    { tags: ['중독'], answer: '물 때마다 중독. 빨리 잡거나 서포터의 해제로 씻는다.' },
  lich_acolyte:   { tags: ['호출', '원거리'], answer: '해골 전사를 부른다. 호출 영창을 끊는다.' },
  bone_giant:     { tags: ['정예', '차지'], answer: '차지는 끊거나 피한다. 그로기로 무너뜨린다.' },
  lich_king:      { tags: ['보스', '묘지', '저주 웅덩이', '방벽'], answer: '저주 웅덩이에서 빠져나온다. 뼈 방벽은 화력을 몰아 부순다.' },
  fiend_imp:      { tags: ['원거리', '화상'], answer: '화염탄은 화상을 남긴다. 떼로 오면 범위로.' },
  hellhound:      { tags: ['도발 무시', '도약'], answer: '약한 영웅에게 뛰어든다. 기절로 끊거나 탱커 쪽으로 빼낸다.' },
  felguard:       { tags: ['차지', '광폭'], answer: '차지를 끊고 그로기에 몰아친다. 광폭 뒤엔 탱커가 받는다.' },
  temptress:      { tags: ['도발 무시', '약화'], answer: '서포터를 노리고 약화시킨다. 먼저 잡는다.' },
  demon_caller:   { tags: ['호출'], answer: '임프 둘을 부른다. 영창을 끊는다.' },
  doom_lord:      { tags: ['정예', '함성', '차지'], answer: '함성 전에 그로기를 만들고 차지를 끊는다.' },
  pit_lord:       { tags: ['보스', '심연', '지옥불 비', '피난처'], answer: '지옥불은 여러 곳에 동시에 떨어진다 — 흩어진다. 심연 폭발은 안전한 원 안으로.' },
  swamp_turtle:   { tags: ['보스', '그로기 재생'], answer: '그로기 게이지가 다시 찬다. 끊기·기절을 몰아서 한 번에 깨고 그로기에 화력 집중.' },
};
const codexKind = (key) => { const d = ENEMIES[key]; return d.abilities.includes('boss') ? '보스' : (d.poise || 0) >= 120 || d.hp >= 500 ? '정예' : '일반'; };
const codexReward = (key) => ({ 보스: 120, 정예: 40, 일반: 15 })[codexKind(key)];
const COMBO_INFO = [
  { name: '독연 폭발', how: '화상 걸린 적에게 중독', fx: '주변 폭발(공격력 ×1.3) + 주변 적에게 중독 1겹 · 화상 소모' },
  { name: '동결', how: '둔화된 적을 기절', fx: '기절 +0.6초' },
  { name: '상처 벌리기', how: '출혈 + 취약', fx: '출혈 피해 ×1.5' },
  { name: '역병', how: '저주 + 중독 (저주술사 × 도적·네크로맨서)', fx: '중독 +2겹' },
];
function codexState(p) { return (p.codex = p.codex || {}); }
// 처음 보면 true (보상 지급)
function codexSee(p, key) {
  if (!ENEMY_CODEX[key]) return false;
  const c = codexState(p);
  if (c[key]) return false;
  c[key] = { seen: 1, kills: 0 };
  p.gold += codexReward(key);
  return true;
}
// v0.59 미지의 적: 처치해야 이름이 밝혀지고, 패턴은 전투에서 겪어야 하나씩 파악된다. 패턴을 모두 파악하면 공략(정답)이 열린다.
function codexKnown(p, key) { const s = codexState(p)[key]; return !!(s && s.kills > 0); }
function codexPats(p, key) { const s = codexState(p)[key]; return (s && s.pats) || {}; }
function codexComplete(p, key) { const pats = codexPats(p, key); return enemyPatterns(key).every((x) => pats[x.k]); }
const patReward = (key) => ({ 보스: 40, 정예: 15, 일반: 5 })[codexKind(key)];
// 패턴 파악 (새로 알게 되면 { info, complete } — 골드 보상)
function codexReveal(p, key, k) {
  if (!ENEMY_CODEX[key]) return null;
  const c = codexState(p); c[key] = c[key] || { seen: 1, kills: 0 }; c[key].pats = c[key].pats || {};
  if (c[key].pats[k]) return null;
  const info = enemyPatterns(key).find((x) => x.k === k); if (!info) return null;
  c[key].pats[k] = 1; p.gold += patReward(key);
  return { info, complete: codexComplete(p, key), gold: patReward(key) };
}
// 정찰: 아직 모르는 패턴 하나를 알아낸다
function codexScout(p, key, rng) { const pats = codexPats(p, key), left = enemyPatterns(key).filter((x) => !pats[x.k]); if (!left.length) return null; const x = left[Math.floor((rng || Math.random)() * left.length)]; return codexReveal(p, key, x.k); }
function enemyLabel(p, key) { return codexKnown(p, key) ? ENEMIES[key].name : '???'; }
function codexKill(p, key, n) { const c = codexState(p); if (!ENEMY_CODEX[key]) return; c[key] = c[key] || { seen: 1, kills: 0 }; c[key].kills += n || 1; }

function openCodex(onClose) {
  const p = Game.profile, c = codexState(p);
  const keys = Object.keys(ENEMY_CODEX);
  const found = keys.filter((k) => c[k]).length;
  const box = el('div', 'inv-box codex-box');
  const head = el('div', 'inv-head');
  head.appendChild(el('div', 'modal-title', `📖 적 도감 <small>${found} / ${keys.length}</small>`));
  head.appendChild(el('div', 'inv-res', '<span class="muted">미지의 적과 싸우며 패턴을 하나씩 파악한다 · 모두 파악하면 공략이 열린다</span>'));
  head.appendChild(btn('🏆 업적', 'small', () => openAchievements(onClose), { id: 'codex-ach', sfx: 'click' }));
  head.appendChild(btn('닫기', 'small', () => { Game.closeModal(); if (onClose) onClose(); }, { id: 'codex-close', sfx: 'back' }));
  box.appendChild(head);
  box.appendChild(el('div', 'codex-combo', '<b>⚡ 연계 효과</b> — 서로 다른 직업의 상태이상이 만나면 터진다<br>' + COMBO_INFO.map((c) => `<span><b>${c.name}</b> ${c.how} → ${c.fx}</span>`).join('')));
  const grid = el('div', 'codex-grid');
  const order = ['일반', '정예', '보스'];
  for (const k of keys.slice().sort((a, b) => order.indexOf(codexKind(a)) - order.indexOf(codexKind(b)))) {
    const d = ENEMIES[k], e = ENEMY_CODEX[k], s = c[k], kind = codexKind(k);
    const card = el('div', 'codex-card' + (s ? '' : ' unknown') + (kind === '보스' ? ' boss' : kind === '정예' ? ' elite' : ''));
    card.id = 'cx-' + k;
    const pc = portraitCanvas(d.sprite, 64); if (!s) pc.style.filter = 'brightness(0) opacity(.55)';
    card.appendChild(pc);
    const pl = enemyPatterns(k), pats = (s && s.pats) || {}, nf = pl.filter((x) => pats[x.k]).length, known = s && s.kills > 0, done = nf === pl.length;
    const pHtml = `<div class="cx-pats">${pl.map((x) => pats[x.k] ? `<span class="on" title="${x.c}">🔍 ${x.n}</span>` : '<span>❔ ???</span>').join('')}</div>`;
    card.appendChild(el('div', 'cx-txt', s
      ? `<b>${known ? d.name : '???'}</b> <span class="cx-kind">${kind}</span><small>${known ? `HP ${d.hp} · 공격 ${d.atk}${d.reach ? ' · 원거리' : ''} · 처치 ${s.kills}` : '처치하면 이름이 밝혀진다'} · 패턴 ${nf}/${pl.length}</small>${pHtml}<div class="cx-ans">${done ? '📖 ' + e.answer : `<span class="muted">패턴을 모두 파악하면 공략이 열린다 (파악 1개당 ● ${patReward(k)})</span>`}</div>`
      : `<b>???</b> <span class="cx-kind">${kind}</span><small>아직 만나지 못한 적 · 등록 보상 ● ${codexReward(k)} · 패턴 ?/${pl.length}</small>`));
    if (s && done) card.classList.add('done');
    grid.appendChild(card);
  }
  box.appendChild(grid);
  Game.closeModal(); Game.modal(box, { dim: true, cls: 'inv-modal' });
}
