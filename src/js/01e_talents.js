// ===== 01e_talents.js : 특성 트리 (직업별 두 갈래 전문화) =====
// 캐릭터 레벨 1당 특성 점수 1 (Lv 2부터). 갈래마다 4단: 1~3단은 노드 2개(최대 5랭크), 4단은 핵심 특성(1랭크).
// 단을 열려면 같은 갈래에 점수를 쌓아야 한다: 2단 5점 · 3단 10점 · 핵심 18점.
// 효과는 장비와 같은 능력치(mods)로 들어간다 → 04b_equip.heroLoadout. 핵심 특성은 장비 패시브 훅도 쓴다.

const TALENT_TIER_NEED = [0, 5, 10, 18];
const T = (id, name, stat, v, tier, max) => ({ id, name, stat, v, tier, max: max || 5 });
const TALENTS = {
  tank: [
    { key: 'guardian', name: '수호자', desc: '버티고 지킨다', nodes: [
      T('t_hp', '강철 체력', 'hp_pct', 0.03, 0), T('t_dr', '두꺼운 갑옷', 'dr', 0.012, 0),
      T('t_cc', '굳건한 의지', 'ccdur', 0.04, 1), T('t_crush', '버티는 발', 'crushres', 0.05, 1),
      T('t_s1', '맹세 강화', 's1pow', 0.04, 2), T('t_ult', '수호의 기운', 'ultgain', 0.03, 2),
      { id: 't_cap1', name: '불굴', tier: 3, max: 1, cap: true, desc: 'HP 25% 아래로 떨어지면 1.5초 무적(전투당 1회) + 받는 피해 -5%', fx: [['dr', 0.05]], passive: ['stubborn', 1.5] } ] },
    { key: 'avenger', name: '반격자', desc: '맞은 만큼 되갚는다', nodes: [
      T('t_thorn', '가시 갑주', 'thorns', 0.05, 0), T('t_atk', '반격의 팔', 'atk_pct', 0.02, 0),
      T('t_counter', '받아치기', 'counter', 0.03, 1), T('t_hp2', '피의 대가', 'hp_pct', 0.02, 1),
      T('t_s2', '응징 연마', 's2pow', 0.04, 2), T('t_break', '방패 밀치기', 'breakdmg', 0.03, 2),
      { id: 't_cap2', name: '거울 갑주', tier: 3, max: 1, cap: true, desc: '반사·가시가 원거리·차지 피해에도 적용 + 반격 확률 +10%', fx: [['counter', 0.1], ['thornsAll', 1]] } ] },
  ],
  melee: [
    { key: 'blade', name: '검귀', desc: '빠르고 날카롭게', nodes: [
      T('m_crit', '급소 찌르기', 'crit', 0.012, 0), T('m_aspd', '연속 베기', 'aspd', 0.015, 0),
      T('m_cd', '피의 갈증', 'critdmg', 0.05, 1), T('m_ms', '날렵한 발', 'mspd', 0.03, 1),
      T('m_s1', '끊기 숙련', 's1pow', 0.04, 2), T('m_atk', '검의 무게', 'atk_pct', 0.02, 2),
      { id: 'm_cap1', name: '검무', tier: 3, max: 1, cap: true, desc: '전투 시작 시 필살기 게이지 +25, 치명타 확률 +8%', fx: [['crit', 0.08]], passive: ['first_breath', 25] } ] },
    { key: 'breaker', name: '파쇄자', desc: '그로기를 만들고 끝낸다', nodes: [
      T('m_brk', '부수는 일격', 'breakdmg', 0.04, 0), T('m_hp', '단단한 몸', 'hp_pct', 0.03, 0),
      T('m_vb', '마무리', 'vsbroken', 0.04, 1), T('m_dr', '맞받아치기', 'dr', 0.01, 1),
      T('m_s2', '파쇄 숙련', 's2pow', 0.04, 2), T('m_ult', '전투의 열기', 'ultgain', 0.03, 2),
      { id: 'm_cap2', name: '산산조각', tier: 3, max: 1, cap: true, desc: '적이 그로기가 되면 ② 쿨타임 30% 감소 + 그로기 적에게 피해 +15%', fx: [['vsbroken', 0.15]], passive: ['hunter_rain', 0.3] } ] },
  ],
  rogue: [
    { key: 'assassin', name: '암살자', desc: '숨어서 한 방', nodes: [
      T('k_crit', '급소 감각', 'crit', 0.012, 0), T('k_ms', '그림자 발', 'mspd', 0.03, 0),
      T('k_amb', '기습 연마', 'ambush', 0.1, 1), T('k_back', '등 뒤 노리기', 'backstab', 0.04, 1),
      T('k_s1', '단검 숙련', 's1pow', 0.04, 2), T('k_atk', '날 세우기', 'atk_pct', 0.02, 2),
      { id: 'k_cap1', name: '그림자 군주', tier: 3, max: 1, cap: true, desc: '전투 시작 시 은신 +2초(특성이 없어도 은신) + 기습 피해 +40%', fx: [['ambush', 0.4]], passive: ['shadow_open', 2] } ] },
    { key: 'venom', name: '독술사', desc: '쌓고 터뜨린다', nodes: [
      T('k_dot', '독 조합', 'dotdmg', 0.06, 0), T('k_hp', '내성', 'hp_pct', 0.03, 0),
      T('k_cdr', '빠른 손', 'cdr', 0.012, 1), T('k_s2', '독 숙련', 's2pow', 0.04, 1),
      T('k_ult', '독의 순환', 'ultgain', 0.03, 2), T('k_ultp', '독의 정수', 'ultpow', 0.03, 2),
      { id: 'k_cap2', name: '맹독 심장', tier: 3, max: 1, cap: true, desc: '중독 최대 겹 +3 + 지속 피해 +25%', fx: [['dotdmg', 0.25], ['poisonstack', 3]] } ] },
  ],
  ranged: [
    { key: 'sniper', name: '저격수', desc: '한 발의 무게', nodes: [
      T('r_cd', '정조준', 'critdmg', 0.05, 0), T('r_crit', '매의 눈', 'crit', 0.012, 0),
      T('r_sk', '관통 화살', 'skilldmg', 0.03, 1), T('r_vb', '약점 사격', 'vsbroken', 0.04, 1),
      T('r_s2', '저격 숙련', 's2pow', 0.04, 2), T('r_atk', '강궁', 'atk_pct', 0.02, 2),
      { id: 'r_cap1', name: '심안', tier: 3, max: 1, cap: true, desc: '치명타 피해 +30%, 스킬 피해 +10%', fx: [['critdmg', 0.3], ['skilldmg', 0.1]] } ] },
    { key: 'ranger', name: '사냥꾼', desc: '끊고 움직인다', nodes: [
      T('r_aspd', '속사', 'aspd', 0.02, 0), T('r_ms', '바람걸음', 'mspd', 0.04, 0),
      T('r_s1', '견제 숙련', 's1pow', 0.04, 1), T('r_cdr', '빠른 장전', 'cdr', 0.012, 1),
      T('r_hp', '질긴 가죽', 'hp_pct', 0.03, 2), T('r_ult', '사냥 본능', 'ultgain', 0.03, 2),
      { id: 'r_cap2', name: '반딧불 화살', tier: 3, max: 1, cap: true, desc: '차지·호출을 끊으면 필살기 게이지 +12, 공격 속도 +10%', fx: [['aspd', 0.1]], passive: ['firefly', 12] } ] },
  ],
  mage: [
    { key: 'elemental', name: '원소술사', desc: '태우고 터뜨린다', nodes: [
      T('g_sk', '마력 증폭', 'skilldmg', 0.03, 0), T('g_dot', '불씨', 'dotdmg', 0.06, 0),
      T('g_atk', '마나 흐름', 'atk_pct', 0.02, 1), T('g_crit', '불꽃 눈', 'crit', 0.01, 1),
      T('g_s1', '화염 숙련', 's1pow', 0.04, 2), T('g_s2', '번개 숙련', 's2pow', 0.04, 2),
      { id: 'g_cap1', name: '대화재', tier: 3, max: 1, cap: true, desc: '지속 피해 +40%, 스킬 피해 +10%', fx: [['dotdmg', 0.4], ['skilldmg', 0.1]] } ] },
    { key: 'chrono', name: '시간술사', desc: '흐름을 지배한다', nodes: [
      T('g_cdr', '시간 단축', 'cdr', 0.012, 0), T('g_ult', '마력 축적', 'ultgain', 0.04, 0),
      T('g_cc', '정지 연장', 'ccdur', 0.05, 1), T('g_brk', '균열', 'breakdmg', 0.03, 1),
      T('g_hp', '마나 방벽', 'hp_pct', 0.03, 2), T('g_ultp', '시간 왜곡', 'ultpow', 0.03, 2),
      { id: 'g_cap2', name: '영겁', tier: 3, max: 1, cap: true, desc: '쿨타임 -8%, 필살기 충전 +20%', fx: [['cdr', 0.08], ['ultgain', 0.2]] } ] },
  ],
  support: [
    { key: 'healer', name: '치유사', desc: '쓰러지지 않게', nodes: [
      T('s_heal', '치유의 손', 'heal', 0.04, 0), T('s_hp', '생명력', 'hp_pct', 0.03, 0),
      T('s_s1', '치유 숙련', 's1pow', 0.04, 1), T('s_s2', '광역 숙련', 's2pow', 0.04, 1),
      T('s_cdr', '기도의 흐름', 'cdr', 0.012, 2), T('s_ult', '은총', 'ultgain', 0.03, 2),
      { id: 's_cap1', name: '기적', tier: 3, max: 1, cap: true, desc: '회복량 +20%, HP 25% 아래에서 1.5초 무적(전투당 1회)', fx: [['heal', 0.2]], passive: ['stubborn', 1.5] } ] },
    { key: 'oracle', name: '예언자', desc: '흐름을 앞당긴다', nodes: [
      T('o_ult', '예지', 'ultgain', 0.04, 0), T('o_brk', '공명 증폭', 'breakdmg', 0.04, 0),
      T('o_atk', '빛의 심판', 'atk_pct', 0.025, 1), T('o_dr', '가호', 'dr', 0.012, 1),
      T('o_ultp', '계시', 'ultpow', 0.04, 2), T('o_cdr', '빠른 기도', 'cdr', 0.012, 2),
      { id: 'o_cap2', name: '첫 계시', tier: 3, max: 1, cap: true, desc: '전투 시작 시 필살기 게이지 +30, 필살기 위력 +10%', fx: [['ultpow', 0.1]], passive: ['first_breath', 30] } ] },
  ],
};
// 노드 설명 문구 (랭크당)
const TALENT_STAT_NAME = { hp_pct: '최대 HP', dr: '받는 피해 감소', ccdur: '기절·도발 지속', crushres: '짓누름 저항', s1pow: '① 스킬 위력', s2pow: '② 스킬 위력', ultgain: '필살기 충전', ultpow: '필살기 위력', thorns: '근접 평타 반사', atk_pct: '공격력', counter: '반격 확률', breakdmg: '그로기 피해', crit: '치명타 확률', aspd: '공격 속도', critdmg: '치명타 피해', mspd: '이동 속도', vsbroken: '그로기 적 피해', skilldmg: '스킬 피해', cdr: '쿨타임 감소', dotdmg: '지속 피해', heal: '회복량', ambush: '기습 피해', backstab: '등 뒤 평타 피해', poisonstack: '중독 최대 겹' };
function talentPoints(p, id) { const lv = EQ.charLevel(p, id); return Math.max(0, lv - 1); }
function talentState(p, id) { p.talents = p.talents || {}; return (p.talents[id] = p.talents[id] || {}); }
function talentSpent(p, id) { const s = talentState(p, id); return Object.values(s).reduce((a, v) => a + v, 0); }
function talentBranchSpent(p, id, br) { const s = talentState(p, id); return br.nodes.reduce((a, n) => a + (s[n.id] || 0), 0); }
function talentTree(id) { const role = HEROES[id] && HEROES[id].role; return TALENTS[role] || []; }
// 이 노드에 1점 더 찍을 수 있나
function talentCanAdd(p, id, br, node) {
  const s = talentState(p, id);
  if ((s[node.id] || 0) >= node.max) return false;
  if (talentSpent(p, id) >= talentPoints(p, id)) return false;
  return talentBranchSpent(p, id, br) >= TALENT_TIER_NEED[node.tier];
}
function talentAdd(p, id, brKey, nodeId) {
  const br = talentTree(id).find((b) => b.key === brKey), node = br && br.nodes.find((n) => n.id === nodeId);
  if (!node || !talentCanAdd(p, id, br, node)) return false;
  const s = talentState(p, id); s[node.id] = (s[node.id] || 0) + 1; return true;
}
function talentReset(p, id) { p.talents = p.talents || {}; p.talents[id] = {}; }
// 능력치 합계 { stat: v, passives: { key: v } }
function talentMods(p, id) {
  const s = (p.talents && p.talents[id]) || {}, out = { passives: {} };
  for (const br of talentTree(id)) for (const n of br.nodes) {
    const r = s[n.id] || 0; if (!r) continue;
    if (n.cap) { for (const [k, v] of n.fx) out[k] = (out[k] || 0) + v; if (n.passive) out.passives[n.passive[0]] = n.passive[1]; }
    else out[n.stat] = (out[n.stat] || 0) + n.v * r;
  }
  return out;
}
