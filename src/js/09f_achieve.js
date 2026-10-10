// ===== 09f_achieve.js : 업적 — 긴 목표와 보상 (소환권·골드·강화석) =====
// 저장: profile.ach = { done: { id: true }, c: { 카운터: n } }. 달성 검사는 마을·결과 화면·전투 끝·사냥터 정예 처치 때.
const achCnt = (p, k) => ((p.ach && p.ach.c && p.ach.c[k]) || 0);
function achAdd(p, k, n) { p.ach = p.ach || { done: {}, c: {} }; p.ach.c = p.ach.c || {}; p.ach.c[k] = (p.ach.c[k] || 0) + (n || 1); }
const BOSS_KEYS = ['ogre_chief', 'thorn_queen', 'mist_stag', 'swamp_turtle', 'shadow_king', 'stone_golem'];
const ACHIEVEMENTS = [
  { id: 'first_clear', name: '첫 원정 성공', desc: '보스를 처음 쓰러뜨린다', prog: (p) => [achCnt(p, 'boss'), 1], reward: { tickets: 2 } },
  ...BOSS_KEYS.map((k) => ({ id: 'boss_' + k, name: `${ENEMIES[k].name} 토벌`, desc: `${ENEMIES[k].name}을(를) 쓰러뜨린다`, prog: (p) => [achCnt(p, 'boss_' + k), 1], reward: { gold: 150 } })),
  { id: 'boss_all', name: '굴의 주인들', desc: `보스 ${BOSS_KEYS.length}종을 모두 쓰러뜨린다`, prog: (p) => [BOSS_KEYS.filter((k) => achCnt(p, 'boss_' + k)).length, BOSS_KEYS.length], reward: { tickets: 5 } },
  { id: 'mine_clear', name: '광산의 빛', desc: '버려진 광산의 보스를 쓰러뜨린다', prog: (p) => [achCnt(p, 'mine'), 1], reward: { tickets: 3 } },
  { id: 'flawless', name: '무사 귀환', desc: '아무도 쓰러지지 않고 보스를 쓰러뜨린다', prog: (p) => [achCnt(p, 'flawless'), 1], reward: { tickets: 2 } },
  { id: 'tier2', name: '숙련 원정대', desc: '난이도 T2를 연다', prog: (p) => [Math.min(p.unlockedTier || 0, 2), 2], reward: { stones: 10 } },
  { id: 'oath3', name: '맹세의 무게', desc: '맹세를 3개 이상 걸고 보스를 쓰러뜨린다', prog: (p) => [achCnt(p, 'oath3'), 1], reward: { tickets: 2 } },
  { id: 'oath5', name: '모든 맹세', desc: '맹세 5개를 전부 걸고 보스를 쓰러뜨린다', prog: (p) => [achCnt(p, 'oath5'), 1], reward: { tickets: 5 } },
  { id: 'retreat', name: '살아 돌아왔다', desc: '계단에서 후퇴해 마을로 돌아온다', prog: (p) => [achCnt(p, 'retreat'), 1], reward: { gold: 100 } },
  { id: 'combo50', name: '연계의 달인', desc: '연계 효과를 50번 일으킨다', prog: (p) => [achCnt(p, 'combo'), 50], reward: { stones: 10 } },
  { id: 'codex10', name: '관찰자', desc: '적 도감에 10종 등록', prog: (p) => [Object.keys(p.codex || {}).length, 10], reward: { gold: 300 } },
  { id: 'codex_all', name: '적 박사', desc: '적 도감을 모두 채운다', prog: (p) => [Object.keys(p.codex || {}).filter((k) => ENEMY_CODEX[k]).length, Object.keys(ENEMY_CODEX).length], reward: { tickets: 3 } },
  { id: 'chars10', name: '원정대 확장', desc: '캐릭터 15명을 모은다', prog: (p) => [GACHA.ownedIds(p).length, 15], reward: { tickets: 2 } },
  { id: 'talent_cap', name: '전문가', desc: '특성 트리의 핵심 특성을 하나 연다', prog: (p) => [Object.values(p.talents || {}).some((s) => Object.keys(s).some((k) => /_cap\d$/.test(k) && s[k] > 0)) ? 1 : 0, 1], reward: { stones: 10 } },
  { id: 'hunt_elite10', name: '사냥터의 주인', desc: '사냥터 정예를 10마리 쓰러뜨린다', prog: (p) => [achCnt(p, 'huntElite'), 10], reward: { gold: 500 } },
];
const ACH_REWARD_TXT = (r) => [r.tickets ? `🎟 ${r.tickets}` : '', r.gold ? `● ${r.gold}` : '', r.stones ? `💎 ${r.stones}` : ''].filter(Boolean).join(' ');
// 새로 달성한 업적에 보상을 주고 알린다
function achCheck(p, silent) {
  p.ach = p.ach || { done: {}, c: {} }; p.ach.done = p.ach.done || {};
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (p.ach.done[a.id]) continue;
    const [cur, need] = a.prog(p);
    if (cur < need) continue;
    p.ach.done[a.id] = true; got.push(a);
    const r = a.reward; p.tickets = (p.tickets || 0) + (r.tickets || 0); p.gold += r.gold || 0; p.stones += r.stones || 0;
  }
  if (got.length) { saveProfile(); if (!silent && typeof Game !== 'undefined' && Game.toast) { Sfx.play('ult'); Game.toast(got.map((a) => `🏆 업적 달성: <b>${a.name}</b> (${ACH_REWARD_TXT(a.reward)})`).join('<br>'), 3200); } }
  return got;
}
// 보스 처치 기록 (BattleScene.finish에서)
function achBossWin(p, run, bossKey) {
  achAdd(p, 'boss'); if (bossKey) achAdd(p, 'boss_' + bossKey); if (run.site === 'mine') achAdd(p, 'mine');
  const n = typeof oathList === 'function' ? oathList(run).length : 0;
  if (n >= 3) achAdd(p, 'oath3'); if (n >= 5) achAdd(p, 'oath5');
  if (run.party.every((id) => !run.heroes[id] || !run.heroes[id].dead)) achAdd(p, 'flawless');
}

function openAchievements(onClose) {
  const p = Game.profile; achCheck(p, true);
  const done = ACHIEVEMENTS.filter((a) => p.ach.done[a.id]).length;
  const box = el('div', 'inv-box ach-box');
  const head = el('div', 'inv-head');
  head.appendChild(el('div', 'modal-title', `🏆 업적 <small>${done} / ${ACHIEVEMENTS.length}</small>`));
  head.appendChild(el('div', 'inv-res', '<span class="muted">달성하면 보상이 바로 들어온다</span>'));
  head.appendChild(btn('📖 도감', 'small', () => openCodex(onClose), { id: 'ach-codex', sfx: 'click' }));
  head.appendChild(btn('닫기', 'small', () => { Game.closeModal(); if (onClose) onClose(); }, { id: 'ach-close', sfx: 'back' }));
  box.appendChild(head);
  const grid = el('div', 'codex-grid');
  for (const a of ACHIEVEMENTS) {
    const ok = !!p.ach.done[a.id], [cur, need] = a.prog(p);
    const card = el('div', 'ach-card' + (ok ? ' done' : '')); card.id = 'ach-' + a.id;
    card.appendChild(el('div', 'ach-icon', ok ? '🏆' : '🔒'));
    card.appendChild(el('div', 'cx-txt', `<b>${a.name}</b><small>${a.desc}</small><div class="ach-bar"><i style="width:${Math.min(100, cur / need * 100)}%"></i></div><small>${Math.min(cur, need)} / ${need} · 보상 ${ACH_REWARD_TXT(a.reward)}</small>`));
    grid.appendChild(card);
  }
  box.appendChild(grid);
  Game.closeModal(); Game.modal(box, { dim: true, cls: 'inv-modal' });
}
