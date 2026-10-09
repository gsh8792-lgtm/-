// ===== 01_data.js : 모든 데이터 테이블 (언리얼 DataTable 이식 대비) =====
// 로직 코드는 이 테이블의 id만 참조한다. 수치 조정은 여기서만.

const CONST = {
  VIEW_W: 960, VIEW_H: 540,          // 가로 16:9 논리 해상도
  PARTY_SIZE: 3,                     // 최대 출전 인원 (로스터 5명 중 선택)
  SIM_DT: 1 / 60,                    // 고정 타임스텝
  STAGES: 5,                         // 경로 지도 스테이지 수 (5 = 보스)
  ROWS: 3,                           // 스테이지 1~4의 갈래 수
  START_GOLD: 50,
  START_FOOD: 1,
  SUPPLY_BOX_FOOD: 2,                // 필드 보급 상자에서 얻는 식량
  REST_HEAL_PCT: 0.40,               // 식량 소모 휴식 회복량
  REST_HUNGRY_HEAL_PCT: 0.10,        // 식량 없이 휴식
  TORCH_MAX: 100,
  TORCH_PER_MOVE: 6,                  // 방을 옮길 때
  TORCH_PER_TILE: 1.2,                // 방 안에서 한 칸(900px) 걸을 때마다
  TORCH_REST_GAIN: 40,
  TORCH_DARK_ELITE_CHANCE: 0.35,     // 횃불 0일 때 일반 전투가 정예로 변할 확률
  TORCH_DARK_CRIT_PENALTY: 0.10,
  BASE_CRIT: 0.10,
  CRIT_MULT: 1.6,
  ULT_GAIN_DEAL: 0.055,              // 가한 피해 1당 필살기 게이지(%)
  ULT_GAIN_TAKE: 0.09,               // 받은 피해 1당
  ULT_GAIN_TIME: 1.6,                // 초당
  // 짓누름: 보스 평타가 같은 대상에 쌓이는 압박 (탱커가 아니면 오래 못 버팀)
  TAUNT_LINGER: 1.5,                  // 도발이 끝난 뒤에도 탱커를 노리는 시간
  TAUNT_SCALE: 0.67,                  // 도발 지속 배율 (3초 → 2초) — 탱커가 영원히 붙잡지 못한다
  TELEGRAPH_PCT: { big: 0.5, small: 0.3 }, // 예고 공격(붉은 원)의 최소 피해 = 맞은 영웅 최대 HP의 이만큼 (큰 적·보스 / 작은 적)
  BOSS_LEAP_AFTER: 4,                 // 보스가 대상을 이 시간(초) 넘게 못 따라잡으면 덮친다
  CRUSH_STEP: 0.4, CRUSH_MAX: 5, CRUSH_DUR: 8,
  CRUSH_RES: { tank: 0.85, sturdy: 0.6 },     // 스택 효과 감소 (직업 탱커 / 든든함 특성)
  // 레벨 차이 보정 (파티 전투 레벨 − 던전 레벨). 낮으면 크게 불리, 높으면 점점 딜찍누
  LEVEL_GAP: { dealtUp: 0.03, dealtUpMax: 3, takenUp: 0.025, takenUpMin: 0.3, dealtDown: 0.025, dealtDownMin: 0.35, takenDown: 0.03, takenDownMax: 2.5 },
  ULT_GAIN_HEAL: 0.08,               // 회복량 1당 (서포터 필살기도 제때 차도록)
  HITSTOP_MS: 60,
  CONFIRM_SLOWMO_SEC: 0.2,
  // 동작 고정: 공격/스킬 동작 중에는 이동으로 캔슬할 수 없다 (이동 명령은 동작이 끝난 뒤 실행)
  ACT_LOCK_ATTACK: 0.3,
  ACT_LOCK_SKILL: 0.5,
  ACT_LOCK_ULT: 0.9,           // 확정 후 감속 시간(실시간)
  CONFIRM_SLOWMO_SCALE: 0.25,
  // 실시간 자유 이동 전장 (바닥 영역, 논리 px)
  FIELD_X0: 40, FIELD_X1: 920, FIELD_Y0: 318, FIELD_Y1: 420,
  HERO_SPAWN_X: 150, ENEMY_SPAWN_X: 800,
  MELEE_RANGE: 46,                   // 근접 사거리(+대상 크기 보정)
  Y_WEIGHT: 1.8,                     // 깊이(y) 거리 가중치: 위아래로는 덜 닿는다
  SEPARATION: 16,                    // 같은 편끼리 살짝 밀어내는 거리 (겹침은 허용)
  RETARGET_SEC: 0.5,
  DANGER_SLOWMO: 0.5,                // 차지 범위 안에 아군이 있을 때 시간 배율
  DRAG_SLOWMO: 0.25,                 // 스킬 버튼을 끄는 동안 시간 배율
  SPRITE_SCALE: 3,
  WAVE_DELAY: 1.2,
  BATTLE_INTRO: 1.0,
  // 그로기(경직) 시스템: 큰 적은 평소 '방어 태세'(받는 피해 감소). 그로기 게이지를 깎아 무너뜨리면 무방비.
  // 게이지는 기절/스킬/차지 캔슬로 크게, 평타로는 조금 깎이고 계속 회복 → 딜만으로는 깨기 어렵다.
  BREAK_DUR: 6,          // 그로기 지속(초): 행동 불가 + 방어 해제
  BREAK_BONUS: 0.5,      // 그로기 중 받는 피해 +50%
  POISE_REGEN: 7,        // 초당 게이지 회복
  POISE_BASIC: 2,        // 평타 1회
  POISE_SKILL: 10,       // 피해 스킬 1타
  POISE_STUN: 55,        // 기절 부여
  POISE_CANCEL: 100,     // 차지/호출을 끊었을 때 추가 (카운터: 공략의 핵심)
  // 그로기 역할 분담 (docs/GAME_DESIGN.md · reports/그로기 역할 분담 설계.md)
  BREAK_V2: true,              // false면 이전 규칙 (비교 측정용)
  SHAKE_DUR: 8, SHAKE_MAX: 12, SHAKE_MULT: 1.5, SHAKE_REGEN_DELAY: 1.5, // 흔들림: 회복 0 + 그로기 ×1.5
  // 끊기 칸: 큰 적의 차지·호출은 3칸, 작은 적·꽃봉오리는 1칸. 2초 안에 채우면 끊김. 기절은 한 번에 전부
  INTERRUPT_RESIST: 3, INTERRUPT_RESIST_SMALL: 1, INTERRUPT_WINDOW: 2.0, INTERRUPT_PIP_POISE: 17, // 못 채운 칸은 1칸당 그로기 17
  INTERRUPT_SAME_ROLE: 0,      // 같은 직업은 한 번만 친다 → 직업을 섞어야 끊긴다
  STUN_DR_WINDOW: 15, STUN_DR: [1, 0.6, 0.3],   // 기절 점감
  BREAK_GROWTH: 0.15, BREAK_GROWTH_CAP: 1.3, BREAK_LOCK: 3, // 반복 그로기 임계 증가 · 그로기 후 잠금
  ULT_POISE_OUTSIDE: 0.5,      // 필살기 추가 그로기: 흔들림 밖에서는 절반
  UNBLOCKED_ENRAGE_FROM: 3, UNBLOCKED_ENRAGE_STACK: 0.1, // 끊지 못한 차지 3회째부터 격노 스택
  UNBLOCKED_CALL_ARMOR: 0.8, UNBLOCKED_CALL_DUR: 10,      // 끊지 못한 호출: 방어 태세 강화
  SOFT_ENRAGE_STEP: 0.05,      // 보스 소프트 인레이지: 10초마다 공격력 +5%
  // 장비 스탯 상한 (장비 DB 밸런스 분석 결과)
  STAT_CAPS: { dr: 0.5, cdr: 0.4, crit: 0.6, aspd: 0.5, mspd: 0.5, ultgain: 0.8 },
  // 전역 밸런스 배율 (초안 수치는 테이블에 그대로 두고 여기서 조정)
  ENEMY_HP_MULT: 1.4,
  ENEMY_ATK_MULT: 0.85,
  HEAL_MULT: 0.85,
};

// 스테이지별 적 능력치 배율 (스테이지 1..5)
// 레벨 차이(g = 파티 − 던전) → 주는 피해·받는 피해 배율
function levelGapMult(g) {
  const L = CONST.LEVEL_GAP;
  if (g >= 0) return { dealt: Math.min(L.dealtUpMax, 1 + L.dealtUp * g), taken: Math.max(L.takenUpMin, 1 - L.takenUp * g) };
  return { dealt: Math.max(L.dealtDownMin, 1 + L.dealtDown * g), taken: Math.min(L.takenDownMax, 1 - L.takenDown * g) };
}
const STAGE_SCALE = [1.0, 1.15, 1.3, 1.5, 1.5];

// ---------------------------------------------------------------- 상태이상
const STATUS = {
  crush:  { name: '짓누름', short: '짓', color: '#b0603a', desc: '보스 평타에 맞을 때마다 쌓임. 쌓일수록 보스 평타 피해 증가. 탱커는 거의 영향 없음.' },
  stun:   { name: '기절', short: '기', color: '#ffd34a', desc: '행동 불가. 차지·호출의 끊기 칸을 한 번에 채움.' },
  bleed:  { name: '출혈', short: '출', color: '#e0524a', desc: '매초 피해.' },
  burn:   { name: '화상', short: '화', color: '#ff8a2a', desc: '지속 피해 + 받는 회복량 -50%.' },
  taunt:  { name: '도발', short: '도', color: '#c86af0', desc: '도발한 대상만 공격.' },
  vuln:   { name: '취약', short: '취', color: '#f07ab0', desc: '받는 피해 +25%.' },
  guard:  { name: '철벽', short: '철', color: '#7ab8f0', desc: '받는 피해 감소.' },
  regen:  { name: '재생', short: '재', color: '#6fd88a', desc: '매초 HP 회복.' },
  enrage: { name: '광폭', short: '광', color: '#ff4a3a', desc: '공격 속도 증가.' },
  fruit:  { name: '열매', short: '열', color: '#ff9ad0', desc: '고목의 열매. 공격력 증가.' },
  resonance: { name: '공명', short: '공', color: '#ffe680', desc: '주는 그로기 피해 증가.' },
  invuln: { name: '무적', short: '무', color: '#fff6c0', desc: '받는 피해 없음.' },
  warcry: { name: '함성', short: '함', color: '#ffb04a', desc: '공격력 증가.' },
};

// ---------------------------------------------------------------- 영웅
// order: 대형 기본 순서(0 = 앞열). traits: TRAITS의 id.
const HEROES = {
  tobi:  { name: '토비',   species: '수호기사', role: 'tank',    roleName: '탱커',   hp: 520, atk: 22, atkInterval: 1.7, range: 'melee', reach: 0, moveSpeed: 72,  def: 0.15, order: 0, skills: ['tobi_s1', 'tobi_s2'], ult: 'tobi_ult', traits: ['sturdy'],           portraitColor: '#9a6232', accent: '#e98a80', sprite: 'knight' },
  danbi: { name: '단비',   species: '검사',     role: 'melee',   roleName: '근딜',   hp: 300, atk: 40, atkInterval: 1.35, range: 'melee', reach: 0, moveSpeed: 95, def: 0.05, order: 1, skills: ['danbi_s1', 'danbi_s2'], ult: 'danbi_ult', traits: ['brave'],          portraitColor: '#9a958f', accent: '#6fb08a', sprite: 'sword' },
  byeolbi: { name: '별비', species: '궁수',     role: 'ranged',  roleName: '원딜',   hp: 260, atk: 36, atkInterval: 1.5, range: 'ranged', reach: 220, moveSpeed: 78, def: 0.0, order: 2, skills: ['byeolbi_s1', 'byeolbi_s2'], ult: 'byeolbi_ult', traits: ['keen'],     portraitColor: '#a49c92', accent: '#e8a83a', sprite: 'archer' },
  soldam: { name: '솔담',  species: '마법사',   role: 'mage',    roleName: '매지션', hp: 240, atk: 44, atkInterval: 1.9, range: 'ranged', reach: 210, moveSpeed: 66, def: 0.0, order: 3, skills: ['soldam_s1', 'soldam_s2'], ult: 'soldam_ult', traits: ['cautious'],    portraitColor: '#8a5a34', accent: '#8cc3a0', sprite: 'mage' },
  bori:  { name: '보리',   species: '사제',     role: 'support', roleName: '서포터', hp: 280, atk: 16, atkInterval: 1.9, range: 'ranged', reach: 190, moveSpeed: 70, def: 0.0, order: 4, skills: ['bori_s1', 'bori_s2'], ult: 'bori_ult', traits: ['gentle'],           portraitColor: '#fff4e0', accent: '#8cc3a0', sprite: 'priest' },
};
const HERO_ORDER = ['tobi', 'danbi', 'byeolbi', 'soldam', 'bori']; // 앞열 → 뒷열 (로스터)
const DEFAULT_PARTY = ['tobi', 'danbi', 'bori'];
// 출전 인원별 적 체력 배율 (3인 기준 1.0)
const PARTY_ENEMY_SCALE = { 1: 0.45, 2: 0.72, 3: 1.0 };

const TRAITS = {
  brave:    { name: '용감함', desc: 'HP가 낮을수록 공격력 증가 (최대 +40%).' },
  cautious: { name: '신중함', desc: '차지 공격 피해 -50%. 화상 지속 +1초.' },
  sturdy:   { name: '든든함', desc: '차지 공격 피해 -40%. 같은 차지 범위 안 동료의 피해 -60%.' },
  keen:     { name: '예리함', desc: '치명타 확률 +10%.' },
  gentle:   { name: '다정함', desc: '주는 회복량 +15%.' },
  counter:  { name: '반격', desc: '받은 근접 평타 피해의 30%를 되돌린다. 막기(가드) 중에는 25% 확률로 즉시 반격 베기(공격력 ×1.4).' },
};

// ---------------------------------------------------------------- 스킬
// 슬롯: s1 = ① 기본(직업 주력기, 전략 ON이면 자동) / s2 = ② 상황(hint 조건일 때 추천) / ult = ③ 필살기
// target: enemy(단일) | ally(단일 아군) | area_enemy | area_ally(지점 원형) | self_area(시전자 주변) | self | party | all_enemies
// power: 공격력 배율. areaR: 원형 범위 반지름(논리 px). hint: ② 추천 조건(SKILL_HINTS). fx: 연출 키
const SKILLS = {
  tobi_s1:  { name: '도발',       target: 'self',      cd: 9,  power: 0,   effects: [{ status: 'taunt', dur: 3, to: 'all_enemies' }, { status: 'guard', dur: 3, value: 0.2, to: 'self' }], fx: 'taunt', desc: '3초간 모든 적 도발 + 받는 피해 -20%. 차지를 받아내면 동료 피해 -60%.' },
  tobi_s2:  { name: '방패 강타',  target: 'enemy',     cd: 11, hint: 'enemyCharging',  power: 1.3, effects: [{ status: 'stun', dur: 2 }], fx: 'bash', desc: '강타 + 2초 기절 (끊기 칸 전부).' },
  tobi_ult: { name: '철벽',       target: 'party',     cd: 0,  power: 0,   effects: [{ status: 'guard', dur: 7, value: 0.45, to: 'party' }], fx: 'wall', desc: '7초간 파티 받는 피해 -45%.' },

  danbi_s1: { name: '급소 베기',  target: 'enemy',     cd: 6,  power: 1.7, interrupt: 2, interruptBack: 0.5, effects: [{ status: 'bleed', dur: 5, dps: 0.35 }], fx: 'slash', desc: '강타 + 5초 출혈. 끊기 ●● (정면 ●).' },
  danbi_s2: { name: '회전 베기',  target: 'self_area', cd: 9, power: 1.3, areaR: 80, hint: 'nearEnemies', effects: [], fx: 'spin', desc: '주변 적 모두 베기.' },
  danbi_ult:{ name: '난도질',     target: 'enemy',     cd: 0,  power: 0.85, hits: 6, effects: [{ status: 'bleed', dur: 6, dps: 0.5 }], fx: 'flurry', desc: '6연속 베기 + 6초 강한 출혈.' },

  byeolbi_s1: { name: '관통 사격', target: 'enemy',     cd: 6,  power: 1.5, interrupt: 2, shakeExtend: 3, effects: [{ status: 'vuln', dur: 5 }], fx: 'pierce', desc: '5초 취약. 끊기 ●●, 흔들림 +3초.' },
  byeolbi_s2: { name: '화살비',    target: 'area_enemy', cd: 10, power: 1.1, areaR: 95, hint: 'cluster', effects: [], fx: 'arrowrain', desc: '지정한 범위에 화살비.' },
  byeolbi_ult:{ name: '집중 사격', target: 'enemy',     cd: 0,  power: 4.2, effects: [{ status: 'vuln', dur: 6 }], fx: 'snipe', desc: '적 1명에게 초강력 사격 + 6초 취약.' },

  soldam_s1: { name: '별빛 탄',   target: 'enemy',      cd: 5,  power: 1.4, effects: [{ status: 'burn', dur: 5, dps: 0.3 }], fx: 'starbolt', desc: '마법탄 + 5초 화상.' },
  soldam_s2: { name: '유성우',    target: 'area_enemy', cd: 11, power: 1.6, areaR: 100, hint: 'cluster', interrupt: 1, effects: [{ status: 'burn', dur: 3, dps: 0.2 }], fx: 'meteor', desc: '범위 유성우 + 3초 화상. 범위 안 모든 적 끊기 ●.' },
  soldam_ult:{ name: '대마법',    target: 'all_enemies', cd: 0, power: 2.6, effects: [{ status: 'burn', dur: 5, dps: 0.3 }], fx: 'nova', desc: '적 전체에 큰 피해 + 5초 화상.' },

  bori_s1:  { name: '치유',       target: 'ally',      cd: 5,  heal: 2.0, healPct: 0.12, effects: [{ status: 'resonance', dur: 5, value: 0.3 }], fx: 'heal', desc: '아군 1명 회복 + 5초간 그로기 피해 +30%.' },
  bori_s2:  { name: '광역 치유',  target: 'area_ally', cd: 10, heal: 1.3, healPct: 0.1, areaR: 110, hint: 'alliesHurt', effects: [], fx: 'aoeheal', desc: '범위 안 아군 회복.' },
  bori_ult: { name: '생명의 나무', target: 'party',    cd: 0,  heal: 0,   effects: [{ status: 'regen', dur: 8, value: 0.045, to: 'party' }], fx: 'tree', desc: '8초간 파티 지속 회복 (매초 최대 HP 4.5%).' },
};

// ---------------------------------------------------------------- ② 상황 스킬 추천 조건
const SKILL_HINTS = {
  enemyCharging: { name: '적이 차지·호출 중', urgent: true },   // "지금!" (위험 대응)
  nearEnemies:   { name: '주변에 적 2마리 이상' },
  cluster:       { name: '적 3마리 이상 뭉침' },
  alliesHurt:    { name: '아군 2명 이상 HP 70% 이하' },
};

// ---------------------------------------------------------------- 작전 명령 (파티 전체)
const ORDERS = {
  charge:  { name: '돌격', desc: '모두 앞으로. 원거리도 가까이 붙어 화력 집중.' },
  hold:    { name: '대형', desc: '탱커는 앞, 원거리·서포터는 뒤에서 거리 유지.' },
  retreat: { name: '후퇴', desc: '뒤로 물러남. 차지 피하기용. 사거리 안 적만 공격.' },
};

// ---------------------------------------------------------------- 자동 전략 (스킬별: 자동 여부 · 조건 · 대상)
const AI_CONDITIONS = {
  always:       { name: '쿨타임마다',     param: null },
  hint:         { name: '추천 상황일 때', param: null },
  allyHpBelow:  { name: '아군 HP ≤ X%',   param: [30, 50, 60, 70, 80] },
  enemyHpBelow: { name: '적 HP ≤ X%',     param: [20, 30, 50, 70] },
  enemyCharging:{ name: '적이 차지 중',    param: null },
  enemyCountGte:{ name: '적 N마리 이상',   param: [2, 3, 4] },
  breakWindow:  { name: '그로기 타이밍',   param: null },
  saveForCharge:{ name: '차지 대비 아껴두기', param: null },
  smartInterrupt:{ name: '끊기 타이밍 고려', param: null },
  auto:         { name: '필살기에 맞게 자동', param: null }, // 부활·회복·그로기 만들기·무방비 수확을 필살기 종류로 판단 // 다음 차지·호출 전에 쿨이 돌아오면 사용, 아니면 끊기용으로 아낌 // 차지/호출하는 적이 살아 있으면 그 순간까지 아낌   // 큰 적이 그로기일 때 (큰 적이 없으면 바로)
};
const AI_SKILL_SLOTS = { s1: '① 갑옷 스킬', s2: '② 무기 스킬', ult: '③ 필살기' };
const AI_TARGET_RULES = {
  focus:      { name: '집중 대상 우선' },
  nearest:    { name: '가장 가까운 적' },
  weakest:    { name: '가장 약한 적' },
  charging:   { name: '차지 중인 적' },
  lowestAlly: { name: 'HP 낮은 아군' },
  tank:       { name: '탱커' },
};
// 기본 프리셋: ① 자동 / ② 수동(추천 표시, 자동으로 켜면 추천 상황에 사용) / ③ 수동 대기
const AI_PRESETS = {
  tobi:    { s1: { auto: true, cond: 'saveForCharge', target: 'nearest' }, s2: { auto: false, cond: 'smartInterrupt', target: 'charging' }, ult: { auto: false, cond: 'allyHpBelow', param: 50, target: 'tank' } },
  danbi:   { s1: { auto: true, cond: 'smartInterrupt', target: 'focus' },  s2: { auto: false, cond: 'hint', target: 'nearest' }, ult: { auto: false, cond: 'breakWindow', target: 'focus' } },
  byeolbi: { s1: { auto: true, cond: 'smartInterrupt', target: 'focus' },  s2: { auto: false, cond: 'hint', target: 'nearest' }, ult: { auto: false, cond: 'breakWindow', target: 'focus' } },
  soldam:  { s1: { auto: true, cond: 'always', target: 'focus' },  s2: { auto: false, cond: 'hint', target: 'nearest' }, ult: { auto: false, cond: 'breakWindow', target: 'nearest' } },
  bori:    { s1: { auto: true, cond: 'always', target: 'lowestAlly' }, s2: { auto: false, cond: 'hint', target: 'lowestAlly' }, ult: { auto: false, cond: 'allyHpBelow', param: 50, target: 'lowestAlly' } },
};

// ---------------------------------------------------------------- 적
// ability: caller(동료 호출) | enrage(HP 50% 광폭) | charge(차지 공격) | warcry | boss
const ENEMIES = {
  goblin:        { name: '고블린', moveSpeed: 88,        hp: 90,   atk: 14, atkInterval: 1.15, def: 0,    size: 1,   sprite: 'goblin',  color: '#7cc050', gold: 4,  abilities: [] },
  goblin_caller: { name: '고블린 나팔수', moveSpeed: 70, hp: 110,  atk: 12, atkInterval: 1.3,  def: 0,    size: 1,   sprite: 'goblinHorn', color: '#8ad060', gold: 6, abilities: ['caller'], callEvery: 9, callCast: 1.6, callCount: 1 },
  orc:           { name: '오크', armor: 0.25, poise: 60, moveSpeed: 66,          hp: 260,  atk: 26, atkInterval: 1.7,  def: 0.1,  size: 1.2, sprite: 'orc',     color: '#5a8a4a', gold: 10, abilities: ['enrage'], enrageAt: 0.5, enrageSpeed: 0.6 },
  ogre:          { name: '오우거', armor: 0.5, poise: 120, moveSpeed: 46,        hp: 620,  atk: 48, atkInterval: 2.4,  def: 0.1,  size: 1.6, sprite: 'ogre',    color: '#d29a68', gold: 20, abilities: ['charge'], chargeEvery: 8, chargeTime: 3, chargeMult: 4.0, chargeR: 80 },
  orc_captain:   { name: '오크 대장', armor: 0.45, poise: 130, moveSpeed: 60,     hp: 820,  atk: 32, atkInterval: 1.6,  def: 0.15, size: 1.4, sprite: 'orcCaptain', color: '#4a7a3a', gold: 40, abilities: ['enrage', 'warcry', 'charge'], enrageAt: 0.5, enrageSpeed: 0.65, warcryEvery: 11, chargeEvery: 10, chargeTime: 2.6, chargeMult: 3.4, chargeR: 64 },
  ogre_chief:    { name: '오우거 대족장', armor: 0.7, poise: 220, moveSpeed: 40, hp: 3600, atk: 38, fixedScale: true, atkInterval: 2.2,  def: 0.15, size: 2.0, sprite: 'ogreChief', color: '#c88a58', gold: 0, abilities: ['charge', 'boss'], chargeEvery: 9, chargeTime: 3, chargeMult: 4.6, chargeR: 90, softEnrage: 110,
                   phases: [ // HP 비율 이하가 되면 진입
                     { at: 0.66, name: '2페이즈: 대지 강타', summon: ['goblin', 'goblin_caller'], chargeR: 170, chargeTime: 3.2, chargeEvery: 10, chargeMult: 3.5 },
                     { at: 0.33, name: '3페이즈: 분노', summon: ['goblin', 'goblin'], chargeTime: 2.4, chargeEvery: 8, chargeMult: 4.0, enrage: true },
                   ] },
  // ---- 역할을 요구하는 일반 몬스터
  // 궁수: 멀리서 후열을 쏜다 (근딜이 파고들거나 탱커가 도발) / 주술사: 동료 치유 영창 (끊으면 막힘)
  // 방패 오크: 정면 피해 -65% (등 뒤를 노리거나 범위 마법) / 폭탄 고블린: 다가와 짧게 영창 후 자폭 (피하거나 끊기)
  goblin_stalker: { name: '고블린 암살자', moveSpeed: 120, hp: 115, atk: 18, atkInterval: 1.0, def: 0, size: 1, sprite: 'goblinStalker', color: '#6a4a8a', gold: 8, abilities: [], ignoreTaunt: true, hunter: 'weakest' },
  orc_hunter:    { name: '오크 사냥꾼', moveSpeed: 62, hp: 180, atk: 24, atkInterval: 2.0, def: 0.05, size: 1.1, reach: 230, sprite: 'orcHunter', color: '#8a6a3a', gold: 12, abilities: [], ignoreTaunt: true, hunter: 'support' },
  goblin_archer: { name: '고블린 궁수', moveSpeed: 74, hp: 80, atk: 15, atkInterval: 1.7, def: 0, size: 1, reach: 200, sprite: 'goblinArcher', color: '#9ab050', gold: 5, abilities: [] },
  goblin_shaman: { name: '고블린 주술사', moveSpeed: 64, hp: 120, atk: 10, atkInterval: 1.6, def: 0, size: 1, reach: 170, sprite: 'goblinShaman', color: '#9a6ad0', gold: 8, abilities: ['caller'], callEvery: 8, callCast: 2.0, callHeal: 0.3 },
  orc_shield:    { name: '방패 오크', armor: 0.2, poise: 80, moveSpeed: 58, hp: 300, atk: 22, atkInterval: 1.9, def: 0.15, size: 1.25, sprite: 'orcShield', color: '#7a8a9a', gold: 12, abilities: [], frontGuard: 0.65 },
  goblin_bomber: { name: '폭탄 고블린', moveSpeed: 104, hp: 70, atk: 20, atkInterval: 1.2, def: 0, size: 1, sprite: 'goblinBomber', color: '#d06a4a', gold: 6, abilities: ['charge'], chargeEvery: 1, chargeTime: 1.4, chargeMult: 3.2, chargeR: 70, chargeTrigger: 80, selfDestruct: true },
  // ---- 보스 로테이션 (그로기 역할 분담 검증용)
  thorn_queen:   { name: '가시덩굴 여왕', armor: 0.7, poise: 220, moveSpeed: 36, hp: 2300, atk: 30, fixedScale: true, atkInterval: 2.0, def: 0.15, size: 2.0, sprite: 'thornQueen', color: '#6a9a4a', gold: 0, abilities: ['charge', 'boss', 'buds'], chargeEvery: 12, chargeTime: 3, chargeMult: 3.4, chargeR: 90, softEnrage: 150, budEvery: 13, budFirst: 6, budRegrow: 18, budCount: 3, calledArmor: 0.8, calledArmorDur: 10, calledHeal: 0.02 },
  wipe_bud:      { name: '독꽃 봉오리', moveSpeed: 0, hp: 120, atk: 1, atkInterval: 99, def: 0, size: 1.0, sprite: 'thornBud', color: '#e06ab0', gold: 0, abilities: [], immobile: true, fixedScale: true },
  thorn_bud:     { name: '가시 꽃봉오리', moveSpeed: 0, hp: 420, atk: 1, atkInterval: 99, def: 0.2, size: 1.2, sprite: 'thornBud', color: '#c86ab0', gold: 0, abilities: [], immobile: true, callEvery: 13, callCast: 2.6, callCount: 1, callUnit: 'goblin', interruptResist: 1 },
  mist_stag:     { name: '안개 사슴왕', armor: 0.8, poise: 220, moveSpeed: 52, hp: 3200, atk: 34, fixedScale: true, atkInterval: 2.0, def: 0.15, size: 2.0, sprite: 'mistStag', color: '#a8b8c8', gold: 0, abilities: ['charge', 'boss'], chargeEvery: 10, chargeTime: 2.8, chargeMult: 4.0, chargeR: 90, backOnly: 0.3, softEnrage: 120, huntsBackline: true, frontRangedDmg: 0.6,
                   phases: [{ at: 0.5, name: '2페이즈: 안개 장막', stunImmune: true, summon: ['goblin', 'goblin'] }] },
  swamp_turtle:  { name: '늪거북 장로', armor: 0.75, poise: 220, moveSpeed: 30, hp: 5600, atk: 38, fixedScale: true, atkInterval: 2.4, def: 0.2, size: 2.0, sprite: 'swampTurtle', color: '#5a7a4a', gold: 0, abilities: ['charge', 'boss'], chargeEvery: 12, chargeTime: 3.2, chargeMult: 3.8, chargeR: 100, poiseRegen: 20, regenHalfBelow: 0.5, markStopsRegen: true, stunMult: 0.4, stunNoCancel: true, softEnrage: 120 },
};

// 보스 패턴: 일반 스킬 1개 + 전멸기 1개 (HP 60%·25%에서 한 번씩, 이후 WIPE_EVERY초마다)
// 전멸기 대응 — break: 시전 중 그로기로 끊기 / buds: 함께 피는 꽃봉오리 부수기(남은 수만큼 피해) / safe: 빛나는 원 안으로 / shield: 껍질 보호막 깨기
const BOSS_KITS = {
  ogre_chief:   { skill: { key: 'rock', name: '바위 던지기', every: 11, first: 7, tele: 1.6, r: 80, mult: 3.2, target: 'far' },
                  wipe: { key: 'quake', name: '대지 분쇄', type: 'break', cast: 6, mult: 0.9, hint: '그로기로 끊어라!' } },
  thorn_queen:  { skill: { key: 'root', name: '덩굴 속박', every: 13, first: 8, dur: 3 },
                  wipe: { key: 'bloom', name: '꽃가루 만개', type: 'buds', cast: 9, per: 0.3, buds: 3, hint: '꽃봉오리를 부숴라!' } },
  mist_stag:    { skill: { key: 'gore', name: '뿔 찌르기', every: 10, first: 6, tele: 1.5, r: 85, mult: 2.8, target: 'random' },
                  wipe: { key: 'mist', name: '안개 폭풍', type: 'safe', cast: 6, mult: 0.9, safeR: 95, hint: '빛나는 원 안으로!' } },
  swamp_turtle: { skill: { key: 'spit', name: '독침', every: 10, first: 6, r: 90, dur: 7, dps: 0.45, target: 'random' },
                  wipe: { key: 'tide', name: '늪의 해일', type: 'shield', cast: 8, mult: 0.9, shield: 0.085, hint: '껍질을 깨라!' } },
};
const WIPE_AT = [0.6, 0.25], WIPE_EVERY = 70;
// 자동 모드의 늦은 반응 (초): 장판이 생기고 이만큼 지나야 피한다. 수동으로 직접 끌어 피하면 바로 — 컨트롤의 몫
const AUTO_REACT = { impact: 0.85, pool: 1.2, safe: 1.6, charge: 1.5 };

// 정예 변이: 정예 전투의 우두머리(가장 HP가 큰 적)에 하나가 붙는다 (HP +25%)
const ELITE_AFFIXES = {
  iron:  { name: '철갑의', desc: '방어 태세 강화 · 그로기 게이지 +30%' },
  fury:  { name: '광폭한', desc: '처음부터 광폭 (공격 속도 증가)' },
  regen: { name: '재생하는', desc: '매초 최대 HP 1.2% 회복' },
  leech: { name: '흡혈의', desc: '준 피해의 30% 회복' },
  swift: { name: '날쌘', desc: '이동 속도 +40% · 공격 간격 -20%' },
};
// 조우 테이블: 스테이지 → 웨이브 배열 목록 (하나를 시드로 선택)
const ENCOUNTERS = {
  // 방 전투: 전열(막는 놈) + 후열(쏘는 놈) + 지원(치유·호출) 구성. 2층부터 도발을 무시하는 사냥꾼(암살자·오크 사냥꾼)이 섞인다.
  // 3층부터 웨이브 3개. "먼저 잡을 놈"이 분명하게.
  battle: {
    1: [ [['goblin', 'goblin', 'goblin_archer'], ['orc', 'goblin_shaman', 'goblin']], [['goblin', 'goblin_bomber', 'goblin'], ['orc_shield', 'goblin_archer', 'goblin_archer']], [['goblin', 'goblin', 'goblin_caller'], ['goblin_stalker', 'orc', 'goblin']], [['goblin', 'goblin', 'goblin'], ['orc', 'goblin_archer', 'goblin_shaman']] ],
    2: [ [['orc_shield', 'goblin_archer', 'goblin_shaman'], ['goblin_stalker', 'goblin_stalker', 'goblin']], [['orc', 'goblin', 'goblin_caller'], ['orc_hunter', 'orc_shield', 'goblin_shaman']], [['goblin_bomber', 'goblin_bomber', 'goblin'], ['ogre', 'goblin_archer', 'goblin_stalker']], [['goblin', 'goblin', 'goblin_stalker'], ['orc', 'orc_hunter', 'goblin_shaman']] ],
    3: [ [['goblin', 'goblin', 'goblin_archer'], ['orc_shield', 'goblin_shaman', 'goblin_stalker'], ['ogre', 'orc_hunter']], [['goblin_bomber', 'goblin_bomber', 'goblin'], ['orc', 'orc_hunter', 'goblin_caller'], ['orc_shield', 'goblin_stalker', 'goblin_stalker']], [['orc', 'goblin', 'goblin_archer'], ['goblin_stalker', 'goblin_stalker', 'goblin_shaman'], ['ogre', 'orc_shield']], [['orc_shield', 'goblin_archer', 'goblin_archer'], ['orc', 'goblin_bomber', 'goblin_bomber'], ['orc_hunter', 'orc_hunter', 'goblin_shaman']] ],
    4: [ [['orc', 'orc', 'goblin_archer'], ['orc_shield', 'orc_hunter', 'goblin_shaman'], ['ogre', 'goblin_stalker', 'goblin_stalker']], [['goblin_bomber', 'goblin_bomber', 'goblin_bomber'], ['ogre', 'goblin_shaman', 'orc_hunter'], ['orc_shield', 'orc_shield', 'goblin_stalker']], [['orc_shield', 'goblin_archer', 'goblin_archer', 'goblin_caller'], ['goblin_stalker', 'goblin_stalker', 'orc'], ['ogre', 'orc_hunter', 'goblin_shaman']], [['ogre', 'goblin', 'goblin', 'goblin'], ['orc', 'orc_hunter', 'goblin_caller'], ['orc_shield', 'goblin_stalker', 'goblin_shaman']] ],
  },
  elite: {
    1: [ [['goblin', 'goblin'], ['orc', 'goblin_shaman', 'goblin']] ],
    2: [ [['goblin', 'goblin_stalker'], ['orc_captain', 'goblin', 'goblin']], [['goblin_archer', 'goblin_archer'], ['orc_captain', 'goblin_shaman', 'orc_hunter']] ],
    3: [ [['goblin', 'goblin_caller', 'goblin_stalker'], ['orc_captain', 'goblin', 'goblin_shaman']], [['orc_shield', 'goblin_bomber', 'goblin_bomber'], ['orc_captain', 'orc_hunter', 'goblin_archer']] ],
    4: [ [['orc', 'goblin_stalker', 'goblin_stalker'], ['orc_captain', 'goblin_shaman', 'goblin_caller']], [['orc_shield', 'orc_hunter', 'goblin_archer'], ['orc_captain', 'ogre', 'goblin_shaman']] ],
  },
  // 복도의 작은 적 무리 (웨이브 1개)
  small: {
    1: [['goblin', 'goblin', 'goblin'], ['goblin', 'goblin_archer', 'goblin'], ['goblin_bomber', 'goblin', 'goblin'], ['goblin_stalker', 'goblin']],
    2: [['goblin', 'goblin', 'goblin_archer', 'goblin_shaman'], ['orc', 'goblin', 'goblin_stalker'], ['orc_hunter', 'goblin', 'goblin'], ['goblin_bomber', 'goblin_bomber', 'goblin']],
    3: [['orc', 'goblin_archer', 'goblin_stalker'], ['orc_shield', 'orc_hunter', 'goblin'], ['goblin_bomber', 'goblin_bomber', 'goblin_stalker'], ['orc', 'goblin_shaman', 'goblin_archer']],
    4: [['orc', 'orc', 'goblin_stalker'], ['orc_shield', 'orc_hunter', 'goblin_archer'], ['ogre', 'goblin_stalker'], ['goblin_bomber', 'goblin_bomber', 'orc_hunter']],
  },
  // 보스 4종: 보스마다 우대 직업이 다르다 (오우거=탱커, 여왕=매지션, 사슴왕=근딜, 거북=원딜·서포터)
  boss: { 5: [ [['ogre_chief', 'goblin', 'goblin']], [['thorn_queen', 'goblin']], [['mist_stag', 'goblin', 'goblin']], [['swamp_turtle', 'goblin', 'goblin']] ] },
};

// ---------------------------------------------------------------- 지도 노드
const NODE_TYPES = {
  battle: { name: '일반 전투', short: '전', color: '#5a4f8a', weight: 40, combat: true,  desc: '적 무리와 전투. 보상 3개 중 1개 선택.' },
  elite:  { name: '정예',      short: '정', color: '#b2453f', weight: 16, combat: true,  desc: '오크 대장과 호위대. 큰 보상.' },
  event:  { name: '이벤트',    short: '?',  color: '#2f8a8a', weight: 18, combat: false, desc: '무슨 일이 일어날지 모른다.' },
  shop:   { name: '상점',      short: '상', color: '#c8a03a', weight: 10, combat: false, maxPerStage: 1, desc: '던전 상인. 골드로 보급품 구매.' },
  rest:   { name: '휴식',      short: '휴', color: '#3f9a5a', weight: 10, combat: false, maxPerStage: 1, desc: '모닥불. 식량을 먹고 회복.' },
  tree:   { name: '고목',      short: '수', color: '#7a4a2a', weight: 7,  combat: false, desc: '피의 거래. HP를 바쳐 열매를 얻는다.' },
  boss:   { name: '보스',      short: '보', color: '#9a2a2a', weight: 0,  combat: true,  desc: '굴의 주인. 원정의 마지막 방.' },
};

// ---------------------------------------------------------------- 유물 (패시브)
const RELICS = {
  acorn:    { name: '따뜻한 빵', icon: '🥖', price: 70, desc: '전투 시작 시 파티 HP 10% 회복.' },
  whetstone:{ name: '날카로운 숫돌', icon: '🗡', price: 75, desc: '출혈 피해 +50%.' },
  ember:    { name: '불씨 깃털',     icon: '🔥', price: 75, desc: '화상 피해 +30%, 지속 +2초.' },
  bark:     { name: '단단한 나무껍질', icon: '🛡', price: 80, desc: '탱커가 받는 피해 -15%.' },
  clover:   { name: '행운의 클로버', icon: '🍀', price: 80, desc: '치명타 확률 +10%.' },
  stardust: { name: '별가루 주머니', icon: '✨', price: 85, desc: '필살기 충전 +30%.' },
};

// ---------------------------------------------------------------- 보상/상점
const REWARD = {
  goldBattle: [28, 42], goldElite: [70, 90],
  skillUpgradePower: 0.3,  // 피해/회복 +30%
  skillUpgradeCd: 0.8,     // 쿨타임 ×0.8
  potionHealPct: 0.5,
};
const SHOP_ITEMS = {
  potion: { name: '회복약', price: 30, desc: '아군 1명 HP 50% 회복.' },
  food:   { name: '식량',   price: 25, desc: '휴식 때 먹으면 HP 40% 회복.' },
  torch:  { name: '횃불',   price: 20, desc: '횃불 게이지 +40.' },
};

// ---------------------------------------------------------------- 이벤트
// 선택지 outcome은 09_scenes.js의 EVENT_EFFECTS 키로 처리 (로직/데이터 분리)
const EVENTS = {
  cart: {
    title: '부러진 수레', art: 'cart',
    text: '바퀴가 부러진 보급 수레가 길을 막고 있다. 짐칸 안쪽에서 무언가 반짝인다. 그런데 주변 흙이 묘하게 새로 덮여 있다.',
    choices: [
      { label: '짐칸을 뒤진다', hint: '보급품일까, 함정일까', outcome: 'cart_search' },
      { label: '토비가 먼저 밟아 본다', hint: '함정은 탱커가 대신 맞는다', outcome: 'cart_tank', require: 'tobi' },
      { label: '그냥 지나간다', hint: '', outcome: 'leave' },
    ],
  },
  well: {
    title: '속삭이는 우물', art: 'well',
    text: '이끼 낀 우물 바닥에서 누군가 이름을 부르는 듯하다. "동전 하나면… 소원 하나…"',
    choices: [
      { label: '동전을 던진다 (20골드)', hint: '소원을 빈다', outcome: 'well_coin', cost: { gold: 20 } },
      { label: '물을 길어 마신다', hint: '시원할까, 서늘할까', outcome: 'well_drink' },
      { label: '귀를 막고 지나간다', hint: '', outcome: 'leave' },
    ],
  },
  goblin_merchant: {
    title: '떠돌이 고블린 상인', art: 'gmerchant',
    text: '보따리를 멘 고블린이 히죽 웃는다. "반짝이, 반짝이 있어! 금화 주면 줌. 싸움은 싫어, 아니 좋아?"',
    choices: [
      { label: '거래한다 (45골드)', hint: '무작위 유물', outcome: 'gm_trade', cost: { gold: 45 } },
      { label: '보따리를 뺏는다', hint: '전투! 이기면 골드', outcome: 'gm_fight' },
      { label: '무시한다', hint: '', outcome: 'leave' },
    ],
  },
  wounded: {
    title: '길 잃은 부상병', art: 'wounded',
    text: '다친 다람쥐 정찰병이 벽에 기대앉아 있다. "배가… 너무 고파요. 상처도 욱신거리고요…"',
    choices: [
      { label: '식량을 나눠준다 (식량 1)', hint: '보답이 있을지도', outcome: 'wd_food', cost: { food: 1 } },
      { label: '보리가 치료해 준다', hint: '보리 HP 20% 소모', outcome: 'wd_heal', require: 'bori' },
      { label: '지나친다', hint: '', outcome: 'leave' },
    ],
  },
};

// ---------------------------------------------------------------- 고목 (피의 거래)
const TREE_DEALS = [
  { id: 'small', label: '작은 거래', hpCost: 0.25, atkBonus: 0.20, battles: 3 },
  { id: 'large', label: '큰 거래',   hpCost: 0.45, atkBonus: 0.35, battles: 4 },
];

// ---------------------------------------------------------------- 튜토리얼 힌트 (첫 플레이)
const HINTS = {
  field:  '화면을 탭하거나 조이스틱으로 이동해요. 보급 상자를 챙긴 뒤 포털로 들어가세요.',
  map:    '같은 줄이나 바로 위·아래 줄의 다음 방으로 갈 수 있어요. 방에 무엇이 있는지는 들어가 봐야 알아요.',
  dungeon: '던전은 방과 복도로 이어져 있어요. 오른쪽 위 지도에서 이웃한 방을 탭하면 그쪽 복도로 걸어가요. 층마다 계단을 찾아 내려가고, 가장 깊은 곳에서 보스 방을 열어 쓰러뜨리면 원정 성공이에요. 자동 모드면 알아서 걷고, 수동이면 ▶을 누르고 있어야 걸어요.',
  explore: '파티가 앞으로 걸어가요. 적 무리를 만나면 그 자리에서 전투가 시작되고, 갈림길에서는 길을 골라요. 멈춤 버튼으로 언제든 멈출 수 있어요.',
  battle: '⏸ 전술 정지로 시간을 멈춘 채 명령할 수 있어요. 큰 전투에서 자동은 평타·① 스킬만 쓰니 ②·필살기·회피는 직접! 스킬 버튼을 탭하면 바로 쓰고, 끌면 원하는 곳에 써요. 캐릭터를 끌어다 놓으면 그 자리로 이동하거나, 놓은 곳의 적을 공격해요.',
  break: `덩치 큰 적은 방어 태세라 피해가 잘 안 들어가요. 차지·호출 위에 뜨는 ○○○ 끊기 칸을 2초 안에 채우면 끊기고 [흔들림]! 흔들리는 동안 파란 게이지를 깎으면 그로기예요. 탱커의 기절은 혼자 다 채우고, 다른 직업은 둘이 힘을 모아야 해요. 같은 직업은 한 번만 인정돼요.`,
  crush:  '보스 평타에 맞을수록 [짓누름]이 쌓여 점점 아파져요. 탱커는 거의 영향이 없어요. 탱커가 도발로 보스를 끌어가거나, 장비로 레벨을 올려 버텨 보세요.',
  charge: '붉은 원 안에 강한 공격이 떨어져요. 탱커의 기절로 끊거나 원 밖으로 피하세요.',
  hunt:   '사냥터에서는 파티가 알아서 몹을 찾아 싸워요(자동 사냥). 몹을 탭하면 그 몹을, 땅이나 지도를 탭하면 그쪽으로 가요. 경험치·골드·강화석과 가끔 장신구를 얻고, 쓰러져도 잠시 뒤 다시 일어나요. 주기적으로 정예가 한 마리 나타나요.',
};
