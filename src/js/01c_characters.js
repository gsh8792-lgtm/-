// ===== 01c_characters.js : 가챠 캐릭터 15명 (직업 5 × 3) — 캐릭터 고유 필살기 풀 + 돌파 =====
// 캐릭터의 ①② 스킬은 직업 기본(추후 장비가 결정), 정체성은 고유 필살기 3종과 변주(돌파로 해금)에 있다.
// 필살기 효과 요소(06_battle_sim cast):
//   target, power, hits, heal, healPct, areaR, effects[{status,dur,value,dps,to}] (기존)
//   delay(시전 시간), poise(타당 그로기), brokenMult(그로기 적 배율), execute{below,mult}, lifesteal(피해 흡혈),
//   partyHeal(피해의 일부로 파티 회복), shieldPct(보호막=대상 최대 HP 비율), cleanse, revive(부활 HP 비율),
//   cdReduce(파티 쿨타임 감소 초), ultGive(다른 아군 필살기 게이지), selfCost(시전자 HP 비율 소모),
//   count(multi_enemy: HP 비율 낮은 적부터 연속 타격), detonate{status,mult}(지속 피해를 한 번에 터뜨림)

Object.assign(STATUS, {
  poison:   { name: '중독', short: '독', color: '#8ad04a', desc: '초당 지속 피해.' },
  weaken:   { name: '약화', short: '약', color: '#9a8ab0', desc: '주는 피해 감소.' },
  slow:     { name: '둔화', short: '둔', color: '#6ab0d0', desc: '이동·공격 속도 감소.' },
  shield:   { name: '보호막', short: '막', color: '#cfe6ff', desc: '피해를 대신 받는다.' },
  inspire:  { name: '고양', short: '고', color: '#ffb84a', desc: '공격력 증가.' },
  lifesteal:{ name: '흡혈', short: '흡', color: '#d04a6a', desc: '준 피해의 일부만큼 회복.' },
});

// 돌파(중복 획득) 규칙: 0~5돌파
const BREAKTHROUGH = {
  max: 5,
  steps: [
    { bt: 1, text: '첫 번째 필살기 위력 +20%', boost: { A: 0.2 } },
    { bt: 2, text: '첫 번째 필살기 변주 해금', unlock: 'A2' },
    { bt: 3, text: '두 번째 필살기 변주 해금', unlock: 'B2' },
    { bt: 4, text: '두 번째·세 번째 필살기 위력 +15%', boost: { B: 0.15, C: 0.15 } },
    { bt: 5, text: '세 번째 필살기 변주 해금', unlock: 'C2' },
  ],
};

// 직업 기본(기존 5인)이 ①② 스킬과 기본 능력치의 기준
const CLASS_BASE = { tank: 'tobi', melee: 'danbi', ranged: 'byeolbi', mage: 'soldam', support: 'bori' };

// stat: 기준 대비 배율 { hp, atk, aspd(공격 간격 배율의 역수), ms }
const CHARACTERS = [
  // ---------------- 탱커
  { id: 'tobi', name: '토비', role: 'tank', title: '철벽 수호자', sprite: 'knight', trait: 'sturdy', starter: true,
    desc: '순수 방어형. 파티 전체를 지키고 차지 공격을 몸으로 받아낸다.',
    ults: {
      A: { base: 'tobi_ult', v: { name: '반격 철벽', fx: 'wall', effects: [{ status: 'guard', dur: 8, value: 0.5, to: 'party' }, { status: 'invuln', dur: 1.5, to: 'self' }, { status: 'taunt', dur: 3, to: 'all_enemies' }], desc: '8초간 파티 피해 -50%, 토비 1.5초 무적 + 도발.' } },
      B: { name: '대지 방벽', target: 'self', fx: 'wall', effects: [{ status: 'guard', dur: 5, value: 0.7, to: 'self' }, { status: 'taunt', dur: 4, to: 'all_enemies' }], desc: '토비 받는 피해 -70% + 4초 도발. 차지 공격을 막아낸다.',
        v: { name: '흔들리지 않는 산', effects: [{ status: 'guard', dur: 7, value: 0.8, to: 'self' }, { status: 'taunt', dur: 5, to: 'all_enemies' }, { status: 'regen', dur: 6, value: 0.02, to: 'party' }], desc: '토비 받는 피해 -80%, 5초 도발, 파티 재생.' } },
      C: { name: '고목의 수호', target: 'party', fx: 'tree', effects: [{ status: 'inspire', dur: 6, value: 0.3, to: 'party' }, { status: 'vuln', dur: 6, to: 'self' }], desc: '6초간 파티 공격력 +30%. 대신 토비가 취약해진다.',
        v: { name: '천년 고목', effects: [{ status: 'inspire', dur: 7, value: 0.4, to: 'party' }], desc: '7초간 파티 공격력 +40%, 단점 없음.' } },
    } },
  { id: 'leon', name: '레온', role: 'tank', title: '성기사', sprite: 'knight_b', trait: 'gentle', stat: { hp: 0.95, atk: 1.1 },
    desc: '방어와 회복을 함께 하는 탱커. 때릴수록 파티가 회복된다.',
    ults: {
      A: { name: '신성한 방패', target: 'party', fx: 'wall', healPct: 0.12, effects: [{ status: 'guard', dur: 5, value: 0.3, to: 'party' }], desc: '파티 HP 12% 회복 + 5초간 피해 -30%.',
        v: { name: '축복의 방패', healPct: 0.18, cleanse: true, effects: [{ status: 'guard', dur: 6, value: 0.35, to: 'party' }], desc: '파티 HP 18% 회복, 해로운 효과 해제, 피해 -35%.' } },
      B: { name: '심판의 망치', target: 'enemy', fx: 'bash', power: 2.6, poise: 60, partyHeal: 0.3, effects: [{ status: 'stun', dur: 2 }], desc: '강타 + 2초 기절 + 그로기 대량. 준 피해의 30%로 파티 회복.',
        v: { name: '천벌', target: 'area_enemy', areaR: 90, fx: 'meteor', power: 2.0, poise: 40, partyHeal: 0.3, effects: [{ status: 'stun', dur: 1.5 }], desc: '범위 강타 + 기절. 준 피해로 파티 회복.' } },
      C: { name: '성역', target: 'party', fx: 'tree', healPct: 0.08, effects: [{ status: 'regen', dur: 8, value: 0.03, to: 'party' }, { status: 'guard', dur: 8, value: 0.2, to: 'party' }], desc: '8초간 파티 재생 + 피해 -20%.',
        v: { name: '불굴의 성역', effects: [{ status: 'regen', dur: 8, value: 0.04, to: 'party' }, { status: 'guard', dur: 8, value: 0.3, to: 'party' }, { status: 'invuln', dur: 1, to: 'party' }], desc: '파티 재생 + 피해 -30% + 1초 무적.' } },
    } },
  { id: 'gor', name: '고르', role: 'tank', title: '망자 기사', sprite: 'knight_c', trait: 'brave', stat: { hp: 1.15, atk: 0.9 },
    desc: '쓰러지지 않는 좀비 탱커. 적을 약화·중독시키며 흡혈로 버틴다.',
    ults: {
      A: { name: '불사의 맹세', target: 'self', fx: 'wall', effects: [{ status: 'invuln', dur: 3, to: 'self' }, { status: 'taunt', dur: 3, to: 'all_enemies' }, { status: 'lifesteal', dur: 8, value: 0.4, to: 'self' }], desc: '3초 무적 + 도발, 8초간 흡혈 40%.',
        v: { name: '죽음을 거부한 자', effects: [{ status: 'invuln', dur: 4, to: 'self' }, { status: 'taunt', dur: 4, to: 'all_enemies' }, { status: 'lifesteal', dur: 10, value: 0.6, to: 'self' }], desc: '4초 무적 + 도발, 10초간 흡혈 60%.' } },
      B: { name: '부식의 외침', target: 'all_enemies', fx: 'nova', power: 0.6, effects: [{ status: 'weaken', dur: 6, value: 0.3 }, { status: 'poison', dur: 6, dps: 0.3 }], desc: '적 전체 약화(주는 피해 -30%) + 중독.',
        v: { name: '역병의 외침', effects: [{ status: 'weaken', dur: 8, value: 0.35 }, { status: 'vuln', dur: 8 }, { status: 'poison', dur: 8, dps: 0.45 }], desc: '적 전체 약화 + 취약 + 강한 중독.' } },
      C: { name: '망자의 행진', target: 'self_area', fx: 'spin', areaR: 100, power: 1.4, hits: 3, lifesteal: 0.5, effects: [{ status: 'slow', dur: 4, value: 0.4 }], desc: '주변 3연타 + 둔화. 준 피해의 50% 흡혈.',
        v: { name: '묘지의 군주', hits: 5, lifesteal: 0.7, desc: '주변 5연타 + 둔화. 준 피해의 70% 흡혈.' } },
    } },
  // ---------------- 근딜
  { id: 'danbi', name: '단비', role: 'melee', title: '출혈 검사', sprite: 'sword', trait: 'brave', starter: true,
    desc: '출혈을 쌓아 오래 싸울수록 강해지는 검사.',
    ults: {
      A: { base: 'danbi_ult', v: { name: '천 갈래 칼날', target: 'self_area', areaR: 110, fx: 'spin', power: 0.7, hits: 6, brokenMult: 1.5, effects: [{ status: 'bleed', dur: 6, dps: 0.5 }], desc: '6연타가 주변 모든 적에게. 그로기 적에게 1.5배.' } },
      B: { name: '회오리 칼날', target: 'self_area', areaR: 100, fx: 'spin', power: 1.0, hits: 4, effects: [{ status: 'bleed', dur: 4, dps: 0.3 }], desc: '주변 4연타 + 출혈.',
        v: { name: '피의 회오리', hits: 5, lifesteal: 0.3, desc: '주변 5연타 + 출혈, 30% 흡혈.' } },
      C: { name: '결전의 일격', target: 'enemy', fx: 'slash', power: 3.0, brokenMult: 2.2, desc: '단일 강타. 그로기 적에게 2.2배.',
        v: { name: '끝맺음', power: 3.2, brokenMult: 2.6, execute: { below: 0.35, mult: 1.8 }, desc: '그로기 적 2.6배, HP 35% 이하 적 1.8배.' } },
    } },
  { id: 'kai', name: '카이', role: 'melee', title: '그림자 암살자', sprite: 'sword_b', trait: 'keen', stat: { hp: 0.85, atk: 1.2, aspd: 1.1 },
    desc: '빈사의 적을 끝내는 처형자. 연막으로 위험을 피한다.',
    ults: {
      A: { name: '그림자 일격', target: 'enemy', fx: 'slash', power: 2.2, execute: { below: 0.4, mult: 2.5 }, desc: '단일 강타. HP 40% 이하 적에게 2.5배.',
        v: { name: '심판의 그림자', execute: { below: 0.5, mult: 3 }, desc: 'HP 50% 이하 적에게 3배.' } },
      B: { name: '연막', target: 'self', fx: 'wall', effects: [{ status: 'invuln', dur: 2, to: 'self' }, { status: 'inspire', dur: 4, value: 0.5, to: 'self' }], desc: '2초 무적 + 4초간 공격력 +50%.',
        v: { name: '그림자 춤', effects: [{ status: 'invuln', dur: 2.5, to: 'self' }, { status: 'inspire', dur: 5, value: 0.6, to: 'self' }, { status: 'lifesteal', dur: 5, value: 0.25, to: 'self' }], desc: '2.5초 무적 + 공격력 +60% + 흡혈.' } },
      C: { name: '사신의 춤', target: 'multi_enemy', fx: 'flurry', count: 3, power: 1.6, execute: { below: 0.3, mult: 2.5 }, desc: 'HP 비율이 낮은 적부터 3명 연속 처형 공격.',
        v: { name: '죽음의 연무', count: 5, desc: 'HP 비율이 낮은 적부터 5명 연속 처형 공격.' } },
    } },
  { id: 'bran', name: '브란', role: 'melee', title: '파쇄 투사', sprite: 'sword_c', trait: 'sturdy', stat: { hp: 1.2, atk: 1.05, aspd: 0.85 },
    desc: '그로기 게이지를 부수는 데 특화된 투사. 큰 적 공략의 핵심.',
    ults: {
      A: { name: '대지 가르기', target: 'enemy', fx: 'bash', power: 2.0, poise: 90, effects: [{ status: 'stun', dur: 1 }], desc: '그로기 게이지 대량 감소 + 기절.',
        v: { name: '산 가르기', poise: 130, effects: [{ status: 'stun', dur: 1.5 }], desc: '그로기 게이지 초대량 감소 + 1.5초 기절.' } },
      B: { name: '분쇄 연타', target: 'enemy', fx: 'flurry', power: 0.55, hits: 6, poise: 18, desc: '6연타, 매 타마다 그로기 감소.',
        v: { name: '멈추지 않는 주먹', hits: 9, desc: '9연타, 매 타마다 그로기 감소.' } },
      C: { name: '거인 사냥', target: 'enemy', fx: 'slash', power: 2.0, brokenMult: 3.0, desc: '그로기 적에게 3배.',
        v: { name: '거신 처형', brokenMult: 3.5, effects: [{ status: 'inspire', dur: 4, value: 0.2, to: 'party' }], desc: '그로기 적에게 3.5배 + 파티 공격력 +20%.' } },
    } },
  // ---------------- 원딜
  { id: 'byeolbi', name: '별비', role: 'ranged', title: '명사수', sprite: 'archer', trait: 'keen', starter: true,
    desc: '안정적인 단일·광역 사격. 어느 파티에나 맞는 원거리 딜러.',
    ults: {
      A: { base: 'byeolbi_ult', v: { name: '꿰뚫는 별', power: 4.6, poise: 40, effects: [{ status: 'vuln', dur: 8 }], desc: '초강력 사격 + 그로기 감소 + 8초 취약.' } },
      B: { name: '화살 폭풍', target: 'all_enemies', fx: 'arrowrain', power: 1.2, hits: 3, desc: '적 전체 3연속 사격.',
        v: { name: '하늘을 덮는 화살', hits: 5, desc: '적 전체 5연속 사격.' } },
      C: { name: '관통 일제 사격', target: 'area_enemy', fx: 'arrowrain', areaR: 120, power: 2.2, effects: [{ status: 'vuln', dur: 5 }], desc: '넓은 범위 사격 + 취약.',
        v: { name: '꿰뚫는 비', power: 2.6, effects: [{ status: 'vuln', dur: 6 }, { status: 'slow', dur: 4, value: 0.3 }], desc: '넓은 범위 사격 + 취약 + 둔화.' } },
    } },
  { id: 'haram', name: '하람', role: 'ranged', title: '저격수', sprite: 'archer_b', trait: 'cautious', stat: { hp: 0.85, atk: 1.25, aspd: 0.75 },
    desc: '시전이 길지만 한 방이 가장 강하다. 그로기 타이밍을 노리는 극딜러.',
    ults: {
      A: { name: '별똥 저격', target: 'enemy', fx: 'snipe', delay: 1.5, power: 6.5, desc: '1.5초 조준 후 초강력 저격.',
        v: { name: '유성 저격', delay: 1.2, power: 7.5, desc: '1.2초 조준 후 더 강한 저격.' } },
      B: { name: '표식 사냥', target: 'enemy', fx: 'pierce', power: 1.0, effects: [{ status: 'vuln', dur: 8 }, { status: 'weaken', dur: 8, value: 0.2 }], desc: '표식: 8초간 취약 + 약화.',
        v: { name: '사냥꾼의 낙인', effects: [{ status: 'vuln', dur: 10 }, { status: 'weaken', dur: 10, value: 0.25 }, { status: 'slow', dur: 6, value: 0.4 }], desc: '10초간 취약 + 약화 + 둔화.' } },
      C: { name: '일격필살', target: 'enemy', fx: 'snipe', delay: 2.5, power: 6.0, brokenMult: 2.5, desc: '2.5초 조준. 그로기 적에게 2.5배.',
        v: { name: '신의 화살', delay: 2.0, power: 7.0, brokenMult: 3.0, desc: '2초 조준. 그로기 적에게 3배.' } },
    } },
  { id: 'mir', name: '미르', role: 'ranged', title: '독침 사냥꾼', sprite: 'archer_c', trait: 'keen', stat: { atk: 0.95, aspd: 1.15 },
    desc: '중독과 약화로 적을 서서히 무너뜨린다. 쌓은 독을 한 번에 터뜨릴 수 있다.',
    ults: {
      A: { name: '독안개', target: 'area_enemy', fx: 'aoeheal', areaR: 120, power: 0.4, effects: [{ status: 'poison', dur: 8, dps: 0.5 }, { status: 'weaken', dur: 6, value: 0.25 }], desc: '범위 중독 + 약화.',
        v: { name: '죽음의 안개', effects: [{ status: 'poison', dur: 10, dps: 0.7 }, { status: 'weaken', dur: 8, value: 0.3 }], desc: '강한 범위 중독 + 약화.' } },
      B: { name: '마비 화살', target: 'enemy', fx: 'pierce', power: 1.4, poise: 30, effects: [{ status: 'stun', dur: 2.5 }], desc: '2.5초 기절 + 그로기 감소. 차지를 끊는다.',
        v: { name: '신경독', effects: [{ status: 'stun', dur: 3 }, { status: 'slow', dur: 5, value: 0.5 }], desc: '3초 기절 + 둔화.' } },
      C: { name: '맹독 폭발', target: 'all_enemies', fx: 'nova', power: 0.8, detonate: { status: 'poison', mult: 1.0 }, desc: '적 전체의 남은 중독 피해를 한 번에 터뜨린다.',
        v: { name: '연쇄 폭발', detonate: { status: 'poison', mult: 1.5 }, effects: [{ status: 'poison', dur: 6, dps: 0.3 }], desc: '남은 중독 피해 1.5배로 터뜨리고 다시 중독.' } },
    } },
  // ---------------- 매지션
  { id: 'soldam', name: '솔담', role: 'mage', title: '화염 마법사', sprite: 'mage', trait: 'cautious', starter: true,
    desc: '광역 화염 마법. 졸개가 많은 전투에 강하다.',
    ults: {
      A: { base: 'soldam_ult', v: { name: '대화염진', power: 3.0, effects: [{ status: 'burn', dur: 6, dps: 0.45 }], desc: '적 전체 큰 피해 + 강한 화상.' } },
      B: { name: '유성 낙하', target: 'area_enemy', fx: 'meteor', delay: 1.0, areaR: 120, power: 3.2, effects: [{ status: 'burn', dur: 4, dps: 0.3 }], desc: '1초 뒤 넓은 범위에 운석.',
        v: { name: '유성군', areaR: 150, power: 3.6, desc: '1초 뒤 더 넓은 범위에 운석.' } },
      C: { name: '화염 정령', target: 'all_enemies', fx: 'nova', power: 0.5, effects: [{ status: 'burn', dur: 10, dps: 0.6 }, { status: 'inspire', dur: 8, value: 0.3, to: 'self' }], desc: '적 전체 긴 화상 + 솔담 공격력 +30%.',
        v: { name: '불사조', effects: [{ status: 'burn', dur: 10, dps: 0.6 }, { status: 'inspire', dur: 8, value: 0.2, to: 'party' }], desc: '적 전체 긴 화상 + 파티 공격력 +20%.' } },
    } },
  { id: 'seori', name: '서리', role: 'mage', title: '빙결술사', sprite: 'mage_b', trait: 'cautious', stat: { hp: 1.05, atk: 0.9 },
    desc: '얼리고 느리게 만드는 제어형 마법사. 차지 끊기와 그로기에 강하다.',
    ults: {
      A: { name: '얼음 감옥', target: 'area_enemy', fx: 'meteor', areaR: 100, power: 1.0, poise: 30, effects: [{ status: 'stun', dur: 2 }], desc: '범위 2초 빙결(기절) + 그로기 감소.',
        v: { name: '빙하 감옥', areaR: 130, effects: [{ status: 'stun', dur: 2.5 }], desc: '더 넓은 범위 2.5초 빙결.' } },
      B: { name: '눈보라', target: 'area_enemy', fx: 'arrowrain', areaR: 140, power: 0.5, hits: 4, effects: [{ status: 'slow', dur: 5, value: 0.5 }], desc: '넓은 범위 4연타 + 둔화.',
        v: { name: '한파', hits: 6, effects: [{ status: 'slow', dur: 6, value: 0.5 }, { status: 'vuln', dur: 6 }], desc: '6연타 + 둔화 + 취약.' } },
      C: { name: '절대영도', target: 'all_enemies', fx: 'nova', power: 1.2, poise: 60, effects: [{ status: 'stun', dur: 2 }], desc: '적 전체 빙결 + 그로기 대량 감소.',
        v: { name: '영원한 겨울', poise: 80, brokenMult: 1.5, effects: [{ status: 'stun', dur: 2.5 }], desc: '적 전체 2.5초 빙결 + 그로기 초대량 감소.' } },
    } },
  { id: 'nox', name: '녹스', role: 'mage', title: '저주술사', sprite: 'mage_c', trait: 'brave', stat: { hp: 0.95, atk: 1.05 },
    desc: '저주와 지연 폭발. 준비가 길지만 맞추면 판을 뒤집는다.',
    ults: {
      A: { name: '저주', target: 'all_enemies', fx: 'nova', power: 0.5, effects: [{ status: 'weaken', dur: 8, value: 0.3 }, { status: 'vuln', dur: 8 }], desc: '적 전체 약화 + 취약.',
        v: { name: '대저주', effects: [{ status: 'weaken', dur: 10, value: 0.4 }, { status: 'vuln', dur: 10 }, { status: 'slow', dur: 6, value: 0.3 }], desc: '적 전체 강한 약화 + 취약 + 둔화.' } },
      B: { name: '영혼 착취', target: 'enemy', fx: 'starbolt', power: 2.2, partyHeal: 0.5, effects: [{ status: 'poison', dur: 8, dps: 0.6 }], desc: '단일 피해 + 중독. 준 피해의 50%로 파티 회복.',
        v: { name: '영혼 포식', partyHeal: 0.8, ultGive: 15, desc: '준 피해 80%로 파티 회복 + 아군 필살기 게이지 +15.' } },
      C: { name: '파멸의 낙인', target: 'enemy', fx: 'snipe', delay: 3.0, power: 7.0, brokenMult: 1.5, desc: '3초 뒤 폭발하는 낙인. 그로기 순간에 맞추면 1.5배.',
        v: { name: '종말의 낙인', power: 8.5, execute: { below: 0.4, mult: 1.5 }, desc: '3초 뒤 더 큰 폭발. HP 40% 이하 적 1.5배.' } },
    } },
  // ---------------- 서포터
  { id: 'bori', name: '보리', role: 'support', title: '생명의 사제', sprite: 'priest', trait: 'gentle', starter: true,
    desc: '광역 회복 특화. 오래 버티는 전투의 중심.',
    ults: {
      A: { base: 'bori_ult', v: { name: '세계수', effects: [{ status: 'regen', dur: 10, value: 0.06, to: 'party' }, { status: 'guard', dur: 10, value: 0.15, to: 'party' }], desc: '10초간 파티 강한 재생 + 피해 -15%.' } },
      B: { name: '꽃비', target: 'party', fx: 'aoeheal', heal: 1.5, healPct: 0.2, desc: '파티 즉시 회복.',
        v: { name: '치유의 폭우', healPct: 0.3, cleanse: true, desc: '파티 큰 즉시 회복 + 해로운 효과 해제.' } },
      C: { name: '부활의 씨앗', target: 'party', fx: 'tree', revive: 0.4, healPct: 0.1, desc: '쓰러진 동료 1명을 HP 40%로 부활 + 파티 회복.',
        v: { name: '윤회', revive: 0.6, healPct: 0.15, effects: [{ status: 'invuln', dur: 2, to: 'party' }], desc: 'HP 60%로 부활 + 파티 2초 무적.' } },
    } },
  { id: 'lumi', name: '루미', role: 'support', title: '축복의 음유시인', sprite: 'priest_b', trait: 'gentle', stat: { hp: 0.95, atk: 1.15 },
    desc: '파티를 강하게 만드는 버퍼. 지속 회복과 쿨타임 가속.',
    ults: {
      A: { name: '용기의 노래', target: 'party', fx: 'tree', effects: [{ status: 'inspire', dur: 8, value: 0.25, to: 'party' }, { status: 'regen', dur: 8, value: 0.02, to: 'party' }], desc: '8초간 파티 공격력 +25% + 재생.',
        v: { name: '영웅의 노래', effects: [{ status: 'inspire', dur: 8, value: 0.35, to: 'party' }, { status: 'regen', dur: 8, value: 0.03, to: 'party' }], desc: '파티 공격력 +35% + 재생.' } },
      B: { name: '서두름의 가락', target: 'party', fx: 'wall', cdReduce: 4, ultGive: 15, desc: '아군 스킬 쿨타임 4초 감소 + 필살기 게이지 +15.',
        v: { name: '질풍의 가락', cdReduce: 6, ultGive: 25, desc: '아군 쿨타임 6초 감소 + 필살기 게이지 +25.' } },
      C: { name: '결전의 찬가', target: 'party', fx: 'wall', effects: [{ status: 'inspire', dur: 6, value: 0.4, to: 'party' }, { status: 'lifesteal', dur: 6, value: 0.2, to: 'party' }], desc: '6초간 파티 공격력 +40% + 흡혈.',
        v: { name: '승리의 찬가', effects: [{ status: 'inspire', dur: 6, value: 0.5, to: 'party' }, { status: 'lifesteal', dur: 6, value: 0.3, to: 'party' }, { status: 'guard', dur: 6, value: 0.15, to: 'party' }], desc: '파티 공격력 +50% + 흡혈 + 피해 감소.' } },
    } },
  { id: 'sera', name: '세라', role: 'support', title: '수호 치유사', sprite: 'priest_c', trait: 'gentle', stat: { hp: 1.05, atk: 0.9 },
    desc: '한 명을 확실히 살리는 단일 회복 특화. 보호막과 희생.',
    ults: {
      A: { name: '기적', target: 'ally', fx: 'heal', heal: 3.0, healPct: 0.45, effects: [{ status: 'invuln', dur: 1.5 }], desc: '아군 1명 대량 회복 + 1.5초 무적.',
        v: { name: '대기적', healPct: 0.6, effects: [{ status: 'invuln', dur: 2.5 }], desc: '아군 1명 초대량 회복 + 2.5초 무적.' } },
      B: { name: '빛의 보호막', target: 'ally', fx: 'heal', shieldPct: 0.45, cleanse: true, desc: '아군 1명에게 최대 HP 45% 보호막 + 해제.',
        v: { name: '삼중 보호막', target: 'party', fx: 'wall', shieldPct: 0.22, desc: '파티 전원에게 최대 HP 22% 보호막.' } },
      C: { name: '희생', target: 'ally', fx: 'heal', healPct: 0.7, cleanse: true, selfCost: 0.2, desc: '세라 HP 20%를 바쳐 아군 1명 HP 70% 회복.',
        v: { name: '성녀의 희생', healPct: 1.0, partyHealPct: 0.15, selfCost: 0.15, desc: '세라 HP 15%로 아군 1명 완전 회복 + 파티 15% 회복.' } },
    } },
];
const CHAR = {}; CHARACTERS.forEach((c) => { CHAR[c.id] = c; });

// HEROES / AI_PRESETS / HERO_ORDER / SKILLS 에 등록 (기존 5인은 그대로 두고 속성만 보강)
(function registerCharacters() {
  const order = ['tank', 'melee', 'ranged', 'mage', 'support'];
  HERO_ORDER.length = 0;
  for (const role of order) for (const c of CHARACTERS) if (c.role === role) HERO_ORDER.push(c.id);
  for (const c of CHARACTERS) {
    const base = HEROES[CLASS_BASE[c.role]];
    if (!HEROES[c.id]) {
      const st = c.stat || {};
      HEROES[c.id] = Object.assign({}, base, {
        name: c.name, species: c.title, hp: Math.round(base.hp * (st.hp || 1)), atk: Math.round(base.atk * (st.atk || 1)),
        atkInterval: +(base.atkInterval / (st.aspd || 1)).toFixed(2), moveSpeed: Math.round(base.moveSpeed * (st.ms || 1)),
        traits: [c.trait], sprite: c.sprite, ult: c.id + '_ult_A',
      });
      AI_PRESETS[c.id] = JSON.parse(JSON.stringify(AI_PRESETS[CLASS_BASE[c.role]]));
    }
    HEROES[c.id].title = c.title;
    AI_PRESETS[c.id].ult.cond = 'auto'; // 필살기를 바꿔 끼워도 알맞은 때 쓰도록
    // 필살기 풀: A/B/C + 변주 A2/B2/C2
    for (const k of ['A', 'B', 'C']) {
      const u = c.ults[k];
      const baseSk = u.base ? SKILLS[u.base] : u;
      const sk = Object.assign({ cd: 0, effects: [] }, baseSk);
      delete sk.v; delete sk.base;
      SKILLS[`${c.id}_ult_${k}`] = sk;
      SKILLS[`${c.id}_ult_${k}2`] = Object.assign({}, sk, u.v);
    }
    if (c.ults.A.base) HEROES[c.id].ult = c.id + '_ult_A';
  }
})();

// 돌파 단계에서 쓸 수 있는 필살기 선택지
function ultChoices(id, bt) {
  const out = ['A', 'B', 'C'];
  for (const s of BREAKTHROUGH.steps) if (s.unlock && bt >= s.bt) out.push(s.unlock);
  return out.sort();
}
// 실제 전투용 필살기 정의 (돌파 위력 보너스 반영)
function ultDefFor(id, choice, bt) {
  const sk = SKILLS[`${id}_ult_${choice}`] || SKILLS[`${id}_ult_A`];
  let boost = 0;
  for (const s of BREAKTHROUGH.steps) if (s.boost && bt >= s.bt && s.boost[choice[0]]) boost += s.boost[choice[0]];
  if (!boost) return sk;
  const m = 1 + boost, out = Object.assign({}, sk);
  for (const k of ['power', 'heal', 'healPct', 'shieldPct', 'partyHealPct']) if (out[k]) out[k] = +(out[k] * m).toFixed(3);
  out.boosted = boost;
  return out;
}
