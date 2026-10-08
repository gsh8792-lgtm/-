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
  TORCH_PER_MOVE: 20,
  TORCH_REST_GAIN: 40,
  TORCH_DARK_ELITE_CHANCE: 0.35,     // 횃불 0일 때 일반 전투가 정예로 변할 확률
  TORCH_DARK_CRIT_PENALTY: 0.10,
  BASE_CRIT: 0.10,
  CRIT_MULT: 1.6,
  ULT_GAIN_DEAL: 0.055,              // 가한 피해 1당 궁극기 게이지(%)
  ULT_GAIN_TAKE: 0.09,               // 받은 피해 1당
  ULT_GAIN_TIME: 1.6,                // 초당
  HITSTOP_MS: 60,
  CONFIRM_SLOWMO_SEC: 0.2,           // 확정 후 감속 시간(실시간)
  CONFIRM_SLOWMO_SCALE: 0.25,
  BATTLE_GROUND_Y: 352,              // 전투 바닥 기준선(논리 px)
  HERO_FRONT_X: 400, HERO_SPACING: 66,
  ENEMY_FRONT_X: 545, ENEMY_SPACING: 64,
  SPRITE_SCALE: 3,
  WAVE_DELAY: 1.2,
  BATTLE_INTRO: 1.0,
  // 전역 밸런스 배율 (초안 수치는 테이블에 그대로 두고 여기서 조정)
  ENEMY_HP_MULT: 1.7,
  ENEMY_ATK_MULT: 0.6,
  HEAL_MULT: 0.85,
};

// 스테이지별 적 능력치 배율 (스테이지 1..5)
const STAGE_SCALE = [1.0, 1.15, 1.3, 1.5, 1.5];

// ---------------------------------------------------------------- 상태이상
const STATUS = {
  stun:   { name: '기절', short: '기', color: '#ffd34a', desc: '행동 불가. 차지 공격을 캔슬한다.' },
  bleed:  { name: '출혈', short: '출', color: '#e0524a', desc: '초당 지속 피해.' },
  burn:   { name: '화상', short: '화', color: '#ff8a2a', desc: '지속 피해 + 받는 회복량 -50%.' },
  taunt:  { name: '도발', short: '도', color: '#c86af0', desc: '도발한 자를 강제로 공격한다.' },
  vuln:   { name: '취약', short: '취', color: '#f07ab0', desc: '받는 피해 +25%.' },
  guard:  { name: '철벽', short: '철', color: '#7ab8f0', desc: '받는 피해 감소.' },
  regen:  { name: '재생', short: '재', color: '#6fd88a', desc: '초당 회복.' },
  enrage: { name: '광폭', short: '광', color: '#ff4a3a', desc: '공격 속도 증가.' },
  fruit:  { name: '열매', short: '열', color: '#ff9ad0', desc: '고목의 열매: 공격력 증가.' },
  warcry: { name: '함성', short: '함', color: '#ffb04a', desc: '공격력 증가.' },
};

// ---------------------------------------------------------------- 영웅
// order: 대형 기본 순서(0 = 앞열). traits: TRAITS의 id.
const HEROES = {
  tobi:  { name: '토비',   species: '수호기사', role: 'tank',    roleName: '탱커',   hp: 520, atk: 22, atkInterval: 1.7, range: 'melee',  def: 0.15, order: 0, skills: ['tobi_s1', 'tobi_s2'], ult: 'tobi_ult', traits: ['sturdy'],           portraitColor: '#9a6232', accent: '#e98a80', sprite: 'knight' },
  danbi: { name: '단비',   species: '검사',     role: 'melee',   roleName: '근딜',   hp: 300, atk: 40, atkInterval: 1.35, range: 'melee', def: 0.05, order: 1, skills: ['danbi_s1', 'danbi_s2'], ult: 'danbi_ult', traits: ['brave'],          portraitColor: '#9a958f', accent: '#6fb08a', sprite: 'sword' },
  byeolbi: { name: '별비', species: '궁수',     role: 'ranged',  roleName: '원딜',   hp: 260, atk: 36, atkInterval: 1.5, range: 'ranged', def: 0.0, order: 2, skills: ['byeolbi_s1', 'byeolbi_s2'], ult: 'byeolbi_ult', traits: ['keen'],     portraitColor: '#a49c92', accent: '#e8a83a', sprite: 'archer' },
  soldam: { name: '솔담',  species: '마법사',   role: 'mage',    roleName: '매지션', hp: 240, atk: 44, atkInterval: 1.9, range: 'ranged', def: 0.0, order: 3, skills: ['soldam_s1', 'soldam_s2'], ult: 'soldam_ult', traits: ['cautious'],    portraitColor: '#8a5a34', accent: '#8cc3a0', sprite: 'mage' },
  bori:  { name: '보리',   species: '사제',     role: 'support', roleName: '서포터', hp: 280, atk: 16, atkInterval: 1.9, range: 'ranged', def: 0.0, order: 4, skills: ['bori_s1', 'bori_s2'], ult: 'bori_ult', traits: ['gentle'],           portraitColor: '#fff4e0', accent: '#8cc3a0', sprite: 'priest' },
};
const HERO_ORDER = ['tobi', 'danbi', 'byeolbi', 'soldam', 'bori']; // 앞열 → 뒷열 (로스터)
const DEFAULT_PARTY = ['tobi', 'danbi', 'bori'];
// 출전 인원별 적 체력 배율 (3인 기준 1.0)
const PARTY_ENEMY_SCALE = { 1: 0.45, 2: 0.72, 3: 1.0 };

const TRAITS = {
  brave:    { name: '용감함', desc: 'HP가 낮을수록 공격력 증가 (최대 +40%).' },
  cautious: { name: '신중함', desc: '차지 공격 피해 -50%. 화상 지속 +1초.' },
  sturdy:   { name: '든든함', desc: '차지 공격 피해 -40%. 범위 안에 있으면 동료가 받는 차지 피해 -60%.' },
  keen:     { name: '예리함', desc: '치명타 확률 +10%.' },
  gentle:   { name: '다정함', desc: '주는 회복량 +15%.' },
};

// ---------------------------------------------------------------- 스킬
// target: enemy(단일) | ally(단일 아군) | area_enemy | area_ally | self | party | all_enemies
// power: 공격력 배율. areaW: 범위 가로폭(논리 px). fx: 연출 키
const SKILLS = {
  tobi_s1:  { name: '도발',       target: 'self',      cd: 9,  power: 0,   effects: [{ status: 'taunt', dur: 3, to: 'all_enemies' }, { status: 'guard', dur: 3, value: 0.2, to: 'self' }], fx: 'taunt', desc: '3초간 모든 적이 토비를 공격.' },
  tobi_s2:  { name: '방패 강타',  target: 'enemy',     cd: 8,  power: 1.3, effects: [{ status: 'stun', dur: 2 }], fx: 'bash', desc: '대상을 2초 기절. 차지 캔슬.' },
  tobi_ult: { name: '철벽',       target: 'party',     cd: 0,  power: 0,   effects: [{ status: 'guard', dur: 7, value: 0.45, to: 'party' }], fx: 'wall', desc: '7초간 파티 받는 피해 -45%.' },

  danbi_s1: { name: '급소 베기',  target: 'enemy',     cd: 6,  power: 1.7, effects: [{ status: 'bleed', dur: 5, dps: 0.35 }], fx: 'slash', desc: '강타 + 출혈.' },
  danbi_s2: { name: '회전 베기',  target: 'area_enemy', cd: 9, power: 1.2, areaW: 150, melee: true, effects: [], fx: 'spin', desc: '근거리 범위 베기.' },
  danbi_ult:{ name: '난도질',     target: 'enemy',     cd: 0,  power: 0.85, hits: 6, effects: [{ status: 'bleed', dur: 6, dps: 0.5 }], fx: 'flurry', desc: '6연속 베기 + 강한 출혈.' },

  byeolbi_s1: { name: '관통 사격', target: 'enemy',     cd: 6,  power: 1.5, effects: [{ status: 'vuln', dur: 5 }], fx: 'pierce', desc: '대상 취약(받는 피해 +25%).' },
  byeolbi_s2: { name: '화살비',    target: 'area_enemy', cd: 10, power: 1.1, areaW: 190, effects: [], fx: 'arrowrain', desc: '지정 범위 화살비.' },
  byeolbi_ult:{ name: '집중 사격', target: 'enemy',     cd: 0,  power: 4.2, effects: [{ status: 'vuln', dur: 6 }], fx: 'snipe', desc: '단일 대상 초강력 사격.' },

  soldam_s1: { name: '별빛 탄',   target: 'enemy',      cd: 5,  power: 1.4, effects: [{ status: 'burn', dur: 5, dps: 0.3 }], fx: 'starbolt', desc: '화상 부여.' },
  soldam_s2: { name: '유성우',    target: 'area_enemy', cd: 11, power: 1.6, areaW: 200, effects: [{ status: 'burn', dur: 3, dps: 0.2 }], fx: 'meteor', desc: '지정 범위에 유성우.' },
  soldam_ult:{ name: '대마법',    target: 'all_enemies', cd: 0, power: 2.6, effects: [{ status: 'burn', dur: 5, dps: 0.3 }], fx: 'nova', desc: '적 전체에 큰 피해.' },

  bori_s1:  { name: '치유',       target: 'ally',      cd: 5,  heal: 2.0, healPct: 0.12, effects: [], fx: 'heal', desc: '아군 1명 회복.' },
  bori_s2:  { name: '광역 치유',  target: 'area_ally', cd: 10, heal: 1.3, healPct: 0.08, areaW: 200, effects: [], fx: 'aoeheal', desc: '범위 내 아군 회복.' },
  bori_ult: { name: '생명의 나무', target: 'party',    cd: 0,  heal: 0,   effects: [{ status: 'regen', dur: 8, value: 0.045, to: 'party' }], fx: 'tree', desc: '8초간 파티 지속 회복 (초당 최대HP 4.5%).' },
};

// ---------------------------------------------------------------- 자동 전략 규칙
const AI_CONDITIONS = {
  always:       { name: '항상',           param: null },
  allyHpBelow:  { name: '아군 HP ≤ X%',   param: [30, 50, 60, 70, 80] },
  enemyHpBelow: { name: '적 HP ≤ X%',     param: [20, 30, 50, 70] },
  enemyCharging:{ name: '적이 차지 중',    param: null },
  enemyCountGte:{ name: '적 N마리 이상',   param: [2, 3, 4] },
  ultReady:     { name: '궁극기 가능',     param: null },
};
const AI_SKILL_SLOTS = { s1: '스킬1', s2: '스킬2', ult: '궁극기' };
const AI_TARGET_RULES = {
  weakest:    { name: '가장 약한 적' },
  nearest:    { name: '가장 가까운 적' },
  charging:   { name: '차지 중인 적' },
  lowestAlly: { name: 'HP 낮은 아군' },
  tank:       { name: '탱커' },
};
// 직업별 기본 프리셋
const AI_PRESETS = {
  tobi:    { rules: [ { cond: 'enemyCharging', skill: 's2', target: 'charging' }, { cond: 'allyHpBelow', param: 60, skill: 's1', target: 'tank' }, { cond: 'always', skill: 's2', target: 'nearest' } ], ultAuto: false, ultTarget: 'tank' },
  danbi:   { rules: [ { cond: 'enemyCountGte', param: 3, skill: 's2', target: 'nearest' }, { cond: 'enemyHpBelow', param: 50, skill: 's1', target: 'weakest' }, { cond: 'always', skill: 's1', target: 'nearest' } ], ultAuto: false, ultTarget: 'weakest' },
  byeolbi: { rules: [ { cond: 'enemyCountGte', param: 3, skill: 's2', target: 'nearest' }, { cond: 'enemyCharging', skill: 's1', target: 'charging' }, { cond: 'always', skill: 's1', target: 'weakest' } ], ultAuto: false, ultTarget: 'weakest' },
  soldam:  { rules: [ { cond: 'enemyCountGte', param: 2, skill: 's2', target: 'nearest' }, { cond: 'always', skill: 's1', target: 'nearest' }, { cond: 'enemyHpBelow', param: 30, skill: 's1', target: 'weakest' } ], ultAuto: false, ultTarget: 'nearest' },
  bori:    { rules: [ { cond: 'allyHpBelow', param: 50, skill: 's2', target: 'lowestAlly' }, { cond: 'allyHpBelow', param: 70, skill: 's1', target: 'lowestAlly' }, { cond: 'allyHpBelow', param: 30, skill: 's1', target: 'lowestAlly' } ], ultAuto: false, ultTarget: 'lowestAlly' },
};

// ---------------------------------------------------------------- 적
// ability: caller(동료 호출) | enrage(HP 50% 광폭) | charge(차지 공격) | warcry | boss
const ENEMIES = {
  goblin:        { name: '고블린',        hp: 90,   atk: 14, atkInterval: 1.15, def: 0,    size: 1,   sprite: 'goblin',  color: '#7cc050', gold: 4,  abilities: [] },
  goblin_caller: { name: '고블린 나팔수', hp: 110,  atk: 12, atkInterval: 1.3,  def: 0,    size: 1,   sprite: 'goblinHorn', color: '#8ad060', gold: 6, abilities: ['caller'], callEvery: 9, callCast: 1.6, callCount: 1 },
  orc:           { name: '오크',          hp: 260,  atk: 26, atkInterval: 1.7,  def: 0.1,  size: 1.2, sprite: 'orc',     color: '#5a8a4a', gold: 10, abilities: ['enrage'], enrageAt: 0.5, enrageSpeed: 0.6 },
  ogre:          { name: '오우거',        hp: 620,  atk: 48, atkInterval: 2.4,  def: 0.1,  size: 1.6, sprite: 'ogre',    color: '#d29a68', gold: 20, abilities: ['charge'], chargeEvery: 8, chargeTime: 3, chargeMult: 2.4, chargeZone: 2 },
  orc_captain:   { name: '오크 대장',     hp: 820,  atk: 32, atkInterval: 1.6,  def: 0.15, size: 1.4, sprite: 'orcCaptain', color: '#4a7a3a', gold: 40, abilities: ['enrage', 'warcry', 'charge'], enrageAt: 0.5, enrageSpeed: 0.65, warcryEvery: 11, chargeEvery: 10, chargeTime: 2.6, chargeMult: 2.0, chargeZone: 1 },
  ogre_chief:    { name: '오우거 대족장', hp: 3000, atk: 46, fixedScale: true, atkInterval: 2.2,  def: 0.15, size: 2.0, sprite: 'ogreChief', color: '#c88a58', gold: 0, abilities: ['charge', 'boss'], chargeEvery: 9, chargeTime: 3, chargeMult: 1.9, chargeZone: 2,
                   phases: [ // HP 비율 이하가 되면 진입
                     { at: 0.66, name: '2페이즈: 대지 강타', summon: ['goblin', 'goblin_caller'], chargeZone: 5, chargeTime: 3.2, chargeEvery: 10, chargeMult: 1.4 },
                     { at: 0.33, name: '3페이즈: 분노', summon: ['goblin', 'goblin'], chargeTime: 2.4, chargeEvery: 8, chargeMult: 1.7, enrage: true },
                   ] },
};

// 조우 테이블: 스테이지 → 웨이브 배열 목록 (하나를 시드로 선택)
const ENCOUNTERS = {
  battle: {
    1: [ [['goblin', 'goblin', 'goblin'], ['goblin', 'orc', 'goblin']], [['goblin', 'goblin_caller', 'goblin'], ['orc', 'goblin', 'goblin']], [['orc', 'goblin', 'goblin'], ['goblin', 'goblin', 'goblin', 'goblin']] ],
    2: [ [['orc', 'goblin', 'goblin_caller'], ['orc', 'orc', 'goblin']], [['goblin', 'goblin', 'goblin', 'goblin'], ['ogre', 'goblin']], [['orc', 'goblin', 'goblin'], ['orc', 'goblin_caller', 'goblin']] ],
    3: [ [['ogre', 'goblin', 'goblin'], ['orc', 'orc', 'goblin_caller']], [['orc', 'orc', 'goblin'], ['ogre', 'goblin', 'goblin']], [['goblin', 'goblin', 'goblin_caller', 'goblin'], ['ogre', 'orc']] ],
    4: [ [['ogre', 'orc', 'goblin'], ['ogre', 'goblin', 'goblin_caller']], [['orc', 'orc', 'goblin', 'goblin'], ['ogre', 'orc']], [['ogre', 'goblin', 'goblin', 'goblin'], ['orc', 'orc', 'goblin_caller']] ],
  },
  elite: {
    2: [ [['goblin', 'goblin'], ['orc_captain', 'goblin', 'goblin']] ],
    3: [ [['goblin', 'goblin_caller', 'goblin'], ['orc_captain', 'goblin', 'goblin']] ],
    4: [ [['orc', 'goblin', 'goblin'], ['orc_captain', 'goblin', 'goblin_caller']] ],
  },
  boss: { 5: [ [['ogre_chief', 'goblin', 'goblin']] ] },
};

// ---------------------------------------------------------------- 지도 노드
const NODE_TYPES = {
  battle: { name: '일반 전투', short: '전', color: '#5a4f8a', weight: 40, combat: true,  desc: '적 무리와 전투. 보상 3택1.' },
  elite:  { name: '정예',      short: '정', color: '#b2453f', weight: 16, combat: true,  desc: '오크 대장과 호위. 큰 보상.' },
  event:  { name: '이벤트',    short: '?',  color: '#2f8a8a', weight: 18, combat: false, desc: '무슨 일이 일어날지 모른다.' },
  shop:   { name: '상점',      short: '상', color: '#c8a03a', weight: 10, combat: false, maxPerStage: 1, desc: '던전 상인. 골드로 보급품 구매.' },
  rest:   { name: '휴식',      short: '휴', color: '#3f9a5a', weight: 10, combat: false, maxPerStage: 1, desc: '캠프. 식량을 써서 회복.' },
  tree:   { name: '고목',      short: '수', color: '#7a4a2a', weight: 7,  combat: false, desc: '피의 거래. HP를 바쳐 열매를 얻는다.' },
  boss:   { name: '보스',      short: '보', color: '#9a2a2a', weight: 0,  combat: true,  desc: '오우거 대족장.' },
};

// ---------------------------------------------------------------- 유물 (패시브)
const RELICS = {
  acorn:    { name: '따뜻한 빵', icon: '🥖', price: 70, desc: '전투 시작 시 아군 HP 10% 회복.' },
  whetstone:{ name: '날카로운 숫돌', icon: '🗡', price: 75, desc: '출혈 피해 +50%.' },
  ember:    { name: '불씨 깃털',     icon: '🔥', price: 75, desc: '화상 피해 +30%, 지속 +2초.' },
  bark:     { name: '단단한 나무껍질', icon: '🛡', price: 80, desc: '탱커가 받는 피해 -15%.' },
  clover:   { name: '행운의 클로버', icon: '🍀', price: 80, desc: '치명타 확률 +10%.' },
  stardust: { name: '별가루 주머니', icon: '✨', price: 85, desc: '궁극기 게이지 충전 +30%.' },
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
  food:   { name: '식량',   price: 25, desc: '휴식 때 소모. HP 40% 회복.' },
  torch:  { name: '횃불',   price: 20, desc: '횃불 게이지 +40.' },
};

// ---------------------------------------------------------------- 이벤트
// 선택지 outcome은 09_scenes.js의 EVENT_EFFECTS 키로 처리 (로직/데이터 분리)
const EVENTS = {
  cart: {
    title: '부러진 수레', art: 'cart',
    text: '바퀴가 부러진 보급 수레가 길을 막고 있다. 짐칸 안쪽에서 무언가 반짝인다… 바닥의 흙이 묘하게 새로 덮여 있다.',
    choices: [
      { label: '짐칸을 뒤진다', hint: '보급품? 혹은 함정', outcome: 'cart_search' },
      { label: '토비가 먼저 밟아본다', hint: '탱커가 함정을 대신 맞음', outcome: 'cart_tank', require: 'tobi' },
      { label: '지나간다', hint: '', outcome: 'leave' },
    ],
  },
  well: {
    title: '속삭이는 우물', art: 'well',
    text: '이끼 낀 우물 바닥에서 누군가 이름을 부르는 것 같다. "동전 하나면… 소원 하나…"',
    choices: [
      { label: '동전을 던진다 (20골드)', hint: '소원을 빈다', outcome: 'well_coin', cost: { gold: 20 } },
      { label: '물을 길어 마신다', hint: '시원할까, 차가울까', outcome: 'well_drink' },
      { label: '귀를 막고 지나간다', hint: '', outcome: 'leave' },
    ],
  },
  goblin_merchant: {
    title: '떠돌이 고블린 상인', art: 'gmerchant',
    text: '보따리를 멘 고블린이 히죽 웃는다. "반짝이, 반짝이 있어! 금화 주면 줌. 싸움은 싫어, 아니 좋아?"',
    choices: [
      { label: '거래한다 (45골드)', hint: '무작위 유물', outcome: 'gm_trade', cost: { gold: 45 } },
      { label: '보따리를 뺏는다', hint: '전투 발생, 이기면 골드', outcome: 'gm_fight' },
      { label: '무시한다', hint: '', outcome: 'leave' },
    ],
  },
  wounded: {
    title: '길 잃은 부상병', art: 'wounded',
    text: '다친 다람쥐 정찰병이 벽에 기대 앉아 있다. "배가… 너무 고파요. 아니면 상처라도…"',
    choices: [
      { label: '식량을 나눠준다 (식량 1)', hint: '보답이 있을지도', outcome: 'wd_food', cost: { food: 1 } },
      { label: '보리가 치료해준다', hint: '보리 HP 20% 소모', outcome: 'wd_heal', require: 'bori' },
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
  field:  '화면을 탭하거나 왼쪽 아래 조이스틱으로 이동하세요. 보급 상자에서 식량을 챙기고, 포털로 던전에 들어가요.',
  map:    '같은 줄이나 바로 위·아래 줄의 다음 방만 갈 수 있어요. 방 종류는 미리 보여요.',
  battle: '스킬 버튼을 누르면 시간이 멈춰요. 적 칩/아군 초상화를 탭하고 [확정]. 범위 스킬은 바닥 범위를 드래그!',
  charge: '오우거가 차지 중! 붉은 범위에 큰 피해가 옵니다. 토비의 방패 강타(기절)로 캔슬하세요.',
};
