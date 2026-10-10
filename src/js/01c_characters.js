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
    { bt: 4, text: '두·세 번째 필살기 위력 +15%', boost: { B: 0.15, C: 0.15 } },
    { bt: 5, text: '세 번째 필살기 변주 해금', unlock: 'C2' },
  ],
};

// 직업 기본(기존 5인)이 ①② 스킬과 기본 능력치의 기준
const CLASS_BASE = { tank: 'tobi', melee: 'danbi', rogue: 'yeon', monk: 'mujin', ranged: 'byeolbi', mage: 'soldam', warlock: 'daon', necro: 'myoyeon', support: 'bori' };

// stat: 기준 대비 배율 { hp, atk, aspd(공격 간격 배율의 역수), ms }
const CHARACTERS = [
  // ---------------- 탱커
  { id: 'tobi', name: '토비', role: 'tank', title: '철벽 수호자', sprite: 'knight', trait: 'sturdy', starter: true,
    desc: '파티 전체를 지키는 정통 방어형. 차지 공격도 몸으로 받아낸다.',
    ults: {
      A: { base: 'tobi_ult', v: { name: '반격 철벽', fx: 'wall', effects: [{ status: 'guard', dur: 8, value: 0.5, to: 'party' }, { status: 'invuln', dur: 1.5, to: 'self' }, { status: 'taunt', dur: 3, to: 'all_enemies' }], desc: '8초간 파티 받는 피해 -50%. 토비 1.5초 무적 + 3초 도발.' } },
      B: { name: '대지 방벽', target: 'self', fx: 'wall', effects: [{ status: 'guard', dur: 5, value: 0.7, to: 'self' }, { status: 'taunt', dur: 4, to: 'all_enemies' }], desc: '5초간 토비 받는 피해 -70% + 4초 도발. 차지 공격도 받아낸다.',
        v: { name: '흔들리지 않는 산', effects: [{ status: 'guard', dur: 7, value: 0.8, to: 'self' }, { status: 'taunt', dur: 5, to: 'all_enemies' }, { status: 'regen', dur: 6, value: 0.02, to: 'party' }], desc: '7초간 토비 받는 피해 -80% + 5초 도발 + 6초간 파티 재생(초당 2%).' } },
      C: { name: '고목의 수호', target: 'party', fx: 'tree', effects: [{ status: 'inspire', dur: 6, value: 0.3, to: 'party' }, { status: 'vuln', dur: 6, to: 'self' }], desc: '6초간 파티 공격력 +30%. 대신 토비가 6초간 취약.',
        v: { name: '천년 고목', effects: [{ status: 'inspire', dur: 7, value: 0.4, to: 'party' }], desc: '7초간 파티 공격력 +40%. 토비 취약 없음.' } },
    } },
  { id: 'elin', name: '엘린', role: 'tank', title: '반격의 기사', sprite: 'knightElin', trait: 'counter', gift: true, stat: { hp: 1.05, atk: 1.2 },
    desc: '맞을수록 강해지는 반격 탱커. 받은 피해를 되돌리고, 쌓인 분노를 응징의 일격으로 터뜨린다.',
    ults: {
      A: { name: '반격의 맹세', target: 'self', fx: 'wall', effects: [{ status: 'reflect', dur: 6, value: 0.8, all: true, to: 'self' }, { status: 'guard', dur: 6, value: 0.35, to: 'self' }, { status: 'taunt', dur: 3, to: 'all_enemies' }], desc: '6초간 받은 모든 피해의 80%를 되돌림(원거리·차지 포함) + 받는 피해 -35% + 도발.',
        v: { name: '거울 성채', effects: [{ status: 'reflect', dur: 8, value: 1.2, all: true, to: 'self' }, { status: 'guard', dur: 8, value: 0.45, to: 'self' }, { status: 'taunt', dur: 4, to: 'all_enemies' }], desc: '8초간 받은 모든 피해의 120%를 되돌림 + 받는 피해 -45% + 도발.' } },
      B: { name: '칼날 방벽', target: 'party', fx: 'wall', shieldPct: 0.15, effects: [{ status: 'reflect', dur: 6, value: 0.45, to: 'party' }], desc: '파티 전원 최대 HP 15% 보호막 + 6초간 근접 평타 피해 45% 반사. 사냥꾼에게 물린 후열을 지킨다.',
        v: { name: '서리 칼날 방벽', shieldPct: 0.2, effects: [{ status: 'reflect', dur: 7, value: 0.6, all: true, to: 'party' }], desc: '파티 전원 20% 보호막 + 7초간 모든 피해 60% 반사.' } },
      C: { name: '응징의 일섬', target: 'self_area', areaR: 115, fx: 'spin', power: 1.6, vengeance: 0.8, poise: 50, effects: [{ status: 'stun', dur: 1 }], desc: '주변 적을 베어 낸다. 최근 6초간 받은 피해의 80%를 더한다 + 1초 기절 + 그로기 감소.',
        v: { name: '심판의 폭풍', areaR: 140, power: 2.0, vengeance: 1.2, poise: 70, effects: [{ status: 'stun', dur: 1.5 }], desc: '넓은 범위 강타. 최근 6초간 받은 피해의 120% 추가 + 1.5초 기절.' } },
    } },
  { id: 'leon', name: '레온', role: 'tank', title: '성기사', sprite: 'knight_b', trait: 'gentle', stat: { hp: 0.95, atk: 1.1 },
    desc: '방어와 회복을 겸하는 탱커. 적을 내리칠수록 파티가 회복된다.',
    ults: {
      A: { name: '신성한 방패', target: 'party', fx: 'wall', healPct: 0.12, effects: [{ status: 'guard', dur: 5, value: 0.3, to: 'party' }], desc: '파티 HP 12% 회복 + 5초간 받는 피해 -30%.',
        v: { name: '축복의 방패', healPct: 0.18, cleanse: true, effects: [{ status: 'guard', dur: 6, value: 0.35, to: 'party' }], desc: '파티 HP 18% 회복 + 해로운 효과 해제 + 6초간 받는 피해 -35%.' } },
      B: { name: '심판의 망치', target: 'enemy', fx: 'bash', power: 2.6, poise: 60, partyHeal: 0.3, effects: [{ status: 'stun', dur: 2 }], desc: '강타 + 2초 기절 + 그로기 게이지 대량 감소. 준 피해의 30%로 파티 회복.',
        v: { name: '천벌', target: 'area_enemy', areaR: 90, fx: 'meteor', power: 2.0, poise: 40, partyHeal: 0.3, effects: [{ status: 'stun', dur: 1.5 }], desc: '범위 강타 + 1.5초 기절 + 그로기 게이지 감소. 준 피해의 30%로 파티 회복.' } },
      C: { name: '성역', target: 'party', fx: 'tree', healPct: 0.08, effects: [{ status: 'regen', dur: 8, value: 0.03, to: 'party' }, { status: 'guard', dur: 8, value: 0.2, to: 'party' }], desc: '파티 HP 8% 회복 + 8초간 재생(초당 3%), 받는 피해 -20%.',
        v: { name: '불굴의 성역', effects: [{ status: 'regen', dur: 8, value: 0.04, to: 'party' }, { status: 'guard', dur: 8, value: 0.3, to: 'party' }, { status: 'invuln', dur: 1, to: 'party' }], desc: '파티 HP 8% 회복 + 8초간 재생(초당 4%), 받는 피해 -30% + 1초 무적.' } },
    } },
  { id: 'gor', name: '고르', role: 'tank', title: '망자 기사', sprite: 'knight_c', trait: 'brave', stat: { hp: 1.15, atk: 0.9 },
    desc: '쓰러지지 않는 망자 탱커. 적을 약화·중독시키고 흡혈로 버틴다.',
    ults: {
      A: { name: '불사의 맹세', target: 'self', fx: 'wall', effects: [{ status: 'invuln', dur: 3, to: 'self' }, { status: 'taunt', dur: 3, to: 'all_enemies' }, { status: 'lifesteal', dur: 8, value: 0.4, to: 'self' }], desc: '3초 무적 + 3초 도발 + 8초간 흡혈 40%.',
        v: { name: '죽음을 거부한 자', effects: [{ status: 'invuln', dur: 4, to: 'self' }, { status: 'taunt', dur: 4, to: 'all_enemies' }, { status: 'lifesteal', dur: 10, value: 0.6, to: 'self' }], desc: '4초 무적 + 4초 도발 + 10초간 흡혈 60%.' } },
      B: { name: '부식의 외침', target: 'all_enemies', fx: 'nova', power: 0.6, effects: [{ status: 'weaken', dur: 6, value: 0.3 }, { status: 'poison', dur: 6, dps: 0.3 }], desc: '적 전체 6초 약화(주는 피해 -30%) + 6초 중독.',
        v: { name: '역병의 외침', effects: [{ status: 'weaken', dur: 8, value: 0.35 }, { status: 'vuln', dur: 8 }, { status: 'poison', dur: 8, dps: 0.45 }], desc: '적 전체 8초 약화(-35%) + 취약 + 강한 중독.' } },
      C: { name: '망자의 행진', target: 'self_area', fx: 'spin', areaR: 100, power: 1.4, hits: 3, lifesteal: 0.5, effects: [{ status: 'slow', dur: 4, value: 0.4 }], desc: '주변 적 3연타 + 4초 둔화. 준 피해의 50% 흡혈.',
        v: { name: '묘지의 군주', hits: 5, lifesteal: 0.7, desc: '주변 적 5연타 + 4초 둔화. 준 피해의 70% 흡혈.' } },
    } },
  // ---------------- 근딜
  { id: 'danbi', name: '단비', role: 'melee', title: '출혈 검사', sprite: 'sword', trait: 'brave', starter: true,
    desc: '출혈을 쌓으며 오래 싸울수록 강해지는 검사.',
    ults: {
      A: { base: 'danbi_ult', v: { name: '천 갈래 칼날', target: 'self_area', areaR: 110, fx: 'spin', power: 0.7, hits: 6, brokenMult: 1.5, effects: [{ status: 'bleed', dur: 6, dps: 0.5 }], desc: '주변 적 6연타 + 6초 강한 출혈. 그로기 적에게 1.5배.' } },
      B: { name: '회오리 칼날', target: 'self_area', areaR: 100, fx: 'spin', power: 1.0, hits: 4, effects: [{ status: 'bleed', dur: 4, dps: 0.3 }], desc: '주변 적 4연타 + 4초 출혈.',
        v: { name: '피의 회오리', hits: 5, lifesteal: 0.3, desc: '주변 적 5연타 + 4초 출혈. 준 피해의 30% 흡혈.' } },
      C: { name: '결전의 일격', target: 'enemy', fx: 'slash', power: 3.0, brokenMult: 2.2, desc: '강력한 일격. 그로기 적에게 2.2배.',
        v: { name: '종결의 일격', power: 3.2, brokenMult: 2.6, execute: { below: 0.35, mult: 1.8 }, desc: '더 강력한 일격. 그로기 적에게 2.6배, HP 35% 이하 적에게 1.8배.' } },
    } },
  { id: 'kai', name: '카이', role: 'melee', title: '그림자 암살자', sprite: 'sword_b', trait: 'keen', stat: { hp: 0.85, atk: 1.2, aspd: 1.1 },
    desc: '빈사의 적을 마무리하는 처형자. 연막으로 위기를 넘긴다.',
    ults: {
      A: { name: '그림자 일격', target: 'enemy', fx: 'slash', power: 2.2, execute: { below: 0.4, mult: 2.5 }, desc: '강력한 일격. HP 40% 이하 적에게 2.5배.',
        v: { name: '심판의 그림자', execute: { below: 0.5, mult: 3 }, desc: '강력한 일격. HP 50% 이하 적에게 3배.' } },
      B: { name: '연막', target: 'self', fx: 'wall', effects: [{ status: 'invuln', dur: 2, to: 'self' }, { status: 'inspire', dur: 4, value: 0.5, to: 'self' }], desc: '2초 무적 + 4초간 공격력 +50%.',
        v: { name: '그림자 춤', effects: [{ status: 'invuln', dur: 2.5, to: 'self' }, { status: 'inspire', dur: 5, value: 0.6, to: 'self' }, { status: 'lifesteal', dur: 5, value: 0.25, to: 'self' }], desc: '2.5초 무적 + 5초간 공격력 +60%, 흡혈 25%.' } },
      C: { name: '사신의 춤', target: 'multi_enemy', fx: 'flurry', count: 3, power: 1.6, execute: { below: 0.3, mult: 2.5 }, desc: 'HP 비율이 낮은 적부터 3명 연속 공격. HP 30% 이하 적에게 2.5배.',
        v: { name: '죽음의 연무', count: 5, desc: 'HP 비율이 낮은 적부터 5명 연속 공격. HP 30% 이하 적에게 2.5배.' } },
    } },
  { id: 'bran', name: '브란', role: 'melee', title: '파쇄 투사', sprite: 'sword_c', trait: 'sturdy', stat: { hp: 1.2, atk: 1.05, aspd: 0.85 },
    desc: '그로기 게이지를 부수는 데 특화된 투사. 덩치 큰 적 공략의 핵심.',
    ults: {
      A: { name: '대지 가르기', target: 'enemy', fx: 'bash', power: 2.0, poise: 90, effects: [{ status: 'stun', dur: 1 }], desc: '강타 + 1초 기절 + 그로기 게이지 대량 감소.',
        v: { name: '산 가르기', poise: 130, effects: [{ status: 'stun', dur: 1.5 }], desc: '강타 + 1.5초 기절 + 그로기 게이지 초대량 감소.' } },
      B: { name: '분쇄 연타', target: 'enemy', fx: 'flurry', power: 0.55, hits: 6, poise: 18, desc: '6연타. 매 타격마다 그로기 게이지 감소.',
        v: { name: '멈추지 않는 주먹', hits: 9, desc: '9연타. 매 타격마다 그로기 게이지 감소.' } },
      C: { name: '거인 사냥', target: 'enemy', fx: 'slash', power: 2.0, brokenMult: 3.0, desc: '강력한 일격. 그로기 적에게 3배.',
        v: { name: '거신 처형', brokenMult: 3.5, effects: [{ status: 'inspire', dur: 4, value: 0.2, to: 'party' }], desc: '그로기 적에게 3.5배 + 4초간 파티 공격력 +20%.' } },
    } },
  { id: 'hwa', name: '화연', role: 'melee', title: '쌍검 무희', sprite: 'sword_d', trait: 'keen', stat: { hp: 0.9, atk: 0.95, aspd: 1.15, ms: 1.1 },
    desc: '쉬지 않고 베는 쌍검 무희. 출혈과 취약을 함께 걸어 「상처 벌리기」를 만든다.',
    ults: {
      A: { name: '칼날 춤', target: 'self_area', areaR: 100, fx: 'spin', power: 0.6, hits: 5, effects: [{ status: 'bleed', dur: 5, dps: 0.35 }, { status: 'vuln', dur: 5 }], desc: '주변 적 5연타 + 출혈 + 5초 취약 (연계: 상처 벌리기).',
        v: { name: '피의 무도', hits: 7, desc: '주변 적 7연타 + 출혈 + 5초 취약.' } },
      B: { name: '흩날리는 꽃잎', target: 'multi_enemy', fx: 'flurry', count: 4, power: 1.2, effects: [{ status: 'bleed', dur: 5, dps: 0.3 }], desc: 'HP 비율 낮은 적부터 4명 베기 + 출혈.',
        v: { name: '꽃보라', count: 6, desc: 'HP 비율 낮은 적부터 6명 베기 + 출혈.' } },
      C: { name: '일섬', target: 'enemy', behind: true, fx: 'slash', power: 3.4, brokenMult: 1.8, desc: '등 뒤로 돌아 한 번에 베기. 그로기 적에게 1.8배.',
        v: { name: '무명 일섬', power: 3.9, brokenMult: 2.2, desc: '등 뒤로 돌아 한 번에 베기. 그로기 적에게 2.2배.' } },
    } },
  // ---------------- 도적 (v0.35): 은신 · 기습 · 중독. 적 후열(원거리·사냥꾼)부터 파고든다
  { id: 'yeon', name: '연', role: 'rogue', title: '독칼 도적', sprite: 'rogue', trait: 'shadow', gift: true,
    desc: '독을 겹겹이 쌓고 한 번에 터뜨린다. 연막으로 몸을 숨겨 후열을 노린다.',
    ults: {
      A: { base: 'yeon_ult', v: { name: '맹독 연쇄', power: 2.4, detonate: { status: 'poison', mult: 2.1 }, desc: '강타 + 중독을 한꺼번에 터뜨림(남은 독 피해 ×2.1). 그 뒤 2초 은신.' } },
      B: { name: '그림자 분신', target: 'self', fx: 'smoke', effects: [{ status: 'stealth', dur: 5, to: 'self' }, { status: 'inspire', dur: 6, value: 0.4, to: 'self' }], desc: '5초 은신 + 6초간 공격력 +40%. 은신 중 첫 공격은 기습.',
        v: { name: '그림자 군무', effects: [{ status: 'stealth', dur: 6, to: 'self' }, { status: 'inspire', dur: 7, value: 0.5, to: 'self' }, { status: 'lifesteal', dur: 7, value: 0.2, to: 'self' }], desc: '6초 은신 + 7초간 공격력 +50%, 흡혈 20%.' } },
      C: { name: '독무', target: 'self_area', areaR: 110, fx: 'spin', power: 0.6, hits: 3, effects: [{ status: 'poison', dur: 8, dps: 0.3 }], desc: '주변 적 3연타 + 중독 1겹.',
        v: { name: '독의 춤', hits: 4, power: 0.7, effects: [{ status: 'poison', dur: 10, dps: 0.4 }], desc: '주변 적 4연타 + 강한 중독 1겹.' } },
    } },
  { id: 'ruka', name: '루카', role: 'rogue', title: '그림자 추적자', sprite: 'rogue_b', trait: 'keen', stat: { hp: 0.9, atk: 1.15, aspd: 1.05 },
    desc: '적 등 뒤에 나타나 급소를 꿰뚫는다. 차지·호출 끊기의 달인.',
    ults: {
      A: { name: '급소 꿰기', target: 'enemy', behind: true, fx: 'slash', power: 2.4, interrupt: 3, effects: [{ status: 'stun', dur: 1.5 }], desc: '등 뒤에서 강타 + 1.5초 기절. 끊기 ●●●.',
        v: { name: '심장 꿰기', power: 2.8, effects: [{ status: 'stun', dur: 2 }, { status: 'vuln', dur: 5 }], desc: '등 뒤에서 강타 + 2초 기절 + 5초 취약. 끊기 ●●●.' } },
      B: { name: '그림자 습격', target: 'multi_enemy', fx: 'flurry', count: 3, power: 1.4, effects: [{ status: 'vuln', dur: 4 }], desc: 'HP 비율 낮은 적부터 3명 습격 + 4초 취약.',
        v: { name: '그림자 폭풍', count: 4, power: 1.6, desc: 'HP 비율 낮은 적부터 4명 습격 + 4초 취약.' } },
      C: { name: '암살', target: 'enemy', behind: true, fx: 'slash', power: 3.0, execute: { below: 0.35, mult: 2.2 }, effects: [{ status: 'stealth', dur: 3, to: 'self', after: true }], desc: '일격 — HP 35% 이하 적에게 2.2배. 그 뒤 3초 은신.',
        v: { name: '완벽한 암살', execute: { below: 0.45, mult: 2.6 }, desc: '일격 — HP 45% 이하 적에게 2.6배. 그 뒤 3초 은신.' } },
    } },
  { id: 'nera', name: '네라', role: 'rogue', title: '독술사', sprite: 'rogue_c', trait: 'shadow', stat: { hp: 1.0, atk: 0.95, aspd: 1.1 },
    desc: '독 안개로 무리를 한꺼번에 중독시키고, 쌓인 독을 연쇄로 터뜨린다.',
    ults: {
      A: { name: '역병 구름', target: 'area_enemy', areaR: 105, fx: 'poison', power: 0.8, hits: 3, effects: [{ status: 'poison', dur: 10, dps: 0.3 }], desc: '지점 범위 3연타 + 중독 1겹. 회복을 막는다.',
        v: { name: '죽음의 역병', effects: [{ status: 'poison', dur: 10, dps: 0.42 }, { status: 'weaken', dur: 5, value: 0.25 }], desc: '지점 범위 3연타 + 강한 중독 + 5초간 주는 피해 -25%.' } },
      B: { name: '독칼 나누기', target: 'party', fx: 'venom', effects: [{ status: 'inspire', dur: 6, value: 0.25, to: 'party' }], desc: '6초간 파티 공격력 +25%.',
        v: { name: '맹독 축제', effects: [{ status: 'inspire', dur: 7, value: 0.3, to: 'party' }, { status: 'lifesteal', dur: 7, value: 0.12, to: 'party' }], desc: '7초간 파티 공격력 +30%, 흡혈 12%.' } },
      C: { name: '연쇄 폭발', target: 'all_enemies', fx: 'nova', power: 0.8, detonate: { status: 'poison', mult: 1.4 }, desc: '모든 적 타격 + 각자의 중독을 터뜨림(×1.4).',
        v: { name: '독의 심판', power: 1.0, detonate: { status: 'poison', mult: 1.9 }, desc: '모든 적 타격 + 각자의 중독을 터뜨림(×1.9).' } },
    } },
  // ---------------- 수도승 (v0.52): 기(평타·①로 모음) → ②·③으로 터뜨린다. 회피 · 끊기 · 그로기
  { id: 'mujin', name: '무진', role: 'monk', title: '권법 수도승', sprite: 'monk', trait: 'serene', gift: true,
    desc: '주먹으로 기를 모아 한 번에 터뜨린다. 근접 평타를 흘려 내며 앞줄에서 버틴다.',
    ults: {
      A: { base: 'mujin_ult', v: { name: '백보신권', power: 0.5, hits: 12, ki: 0.15, desc: '12연타 — 기 1개당 위력 +15% + 5초 취약. 타격마다 그로기 게이지 감소.' } },
      B: { name: '금강불괴', target: 'self', fx: 'wall', kiGain: 5, effects: [{ status: 'invuln', dur: 2, to: 'self' }, { status: 'guard', dur: 6, value: 0.4, to: 'self' }, { status: 'taunt', dur: 3, to: 'all_enemies' }], desc: '2초 무적 + 6초간 받는 피해 -40% + 3초 도발 + 기 가득.',
        v: { name: '금강역사', effects: [{ status: 'invuln', dur: 3, to: 'self' }, { status: 'guard', dur: 8, value: 0.5, to: 'self' }, { status: 'taunt', dur: 4, to: 'all_enemies' }, { status: 'reflect', dur: 6, value: 0.5, to: 'self' }], desc: '3초 무적 + 8초간 받는 피해 -50% + 4초 도발 + 근접 평타 50% 반사 + 기 가득.' } },
      C: { name: '기공파', target: 'area_enemy', areaR: 110, fx: 'bash', power: 2.0, ki: 0.2, poise: 40, effects: [{ status: 'stun', dur: 1.2 }], desc: '지점에 기공파 — 기 1개당 위력 +20% + 1.2초 기절 + 그로기 감소.',
        v: { name: '천지 기공파', areaR: 135, power: 2.4, poise: 60, effects: [{ status: 'stun', dur: 1.5 }], desc: '넓은 범위 기공파 — 기 1개당 위력 +20% + 1.5초 기절 + 그로기 대량 감소.' } },
    } },
  { id: 'soha', name: '소하', role: 'monk', title: '바람 발차기', sprite: 'monk_b', trait: 'keen', stat: { hp: 0.9, atk: 1.05, aspd: 1.1, ms: 1.15 },
    desc: '바람처럼 적 사이를 누비는 발차기 수도승. 여러 적을 차례로 걷어찬다.',
    ults: {
      A: { name: '질풍각', target: 'multi_enemy', fx: 'flurry', count: 4, power: 1.3, ki: 0.1, effects: [{ status: 'vuln', dur: 4 }], desc: 'HP 비율 낮은 적부터 4명 걷어차기 + 4초 취약. 기 1개당 위력 +10%.',
        v: { name: '천풍각', count: 6, power: 1.4, desc: 'HP 비율 낮은 적부터 6명 걷어차기 + 4초 취약.' } },
      B: { name: '선풍각', target: 'self_area', areaR: 100, fx: 'spin', power: 0.7, hits: 4, effects: [{ status: 'stun', dur: 0.6 }], desc: '주변 적 4연타 + 0.6초 기절.',
        v: { name: '대선풍', hits: 6, effects: [{ status: 'stun', dur: 0.8 }], desc: '주변 적 6연타 + 0.8초 기절.' } },
      C: { name: '비연', target: 'enemy', behind: true, fx: 'slash', power: 3.2, ki: 0.25, execute: { below: 0.35, mult: 1.8 }, desc: '등 뒤로 날아 일격 — 기 1개당 위력 +25%. HP 35% 이하 적에게 1.8배.',
        v: { name: '비연참', power: 3.8, ki: 0.3, desc: '더 강한 일격 — 기 1개당 위력 +30%. HP 35% 이하 적에게 1.8배.' } },
    } },
  { id: 'baekun', name: '백운', role: 'monk', title: '금강 수행자', sprite: 'monk_c', trait: 'sturdy', stat: { hp: 1.25, atk: 0.9, aspd: 0.9 },
    desc: '쇠처럼 단단한 수행자. 파티를 지키고, 한 손가락으로 거인을 무너뜨린다.',
    ults: {
      A: { name: '금종조', target: 'party', fx: 'wall', shieldPct: 0.1, effects: [{ status: 'guard', dur: 6, value: 0.3, to: 'party' }, { status: 'taunt', dur: 3, to: 'all_enemies' }], desc: '파티 최대 HP 10% 보호막 + 6초간 받는 피해 -30% + 3초 도발.',
        v: { name: '금강종', shieldPct: 0.15, effects: [{ status: 'guard', dur: 7, value: 0.4, to: 'party' }, { status: 'taunt', dur: 4, to: 'all_enemies' }], desc: '파티 15% 보호막 + 7초간 받는 피해 -40% + 4초 도발.' } },
      B: { name: '반탄강기', target: 'self', fx: 'wall', effects: [{ status: 'reflect', dur: 6, value: 0.7, all: true, to: 'self' }, { status: 'guard', dur: 6, value: 0.3, to: 'self' }, { status: 'taunt', dur: 3, to: 'all_enemies' }], desc: '6초간 받은 모든 피해 70% 반사 + 받는 피해 -30% + 도발.',
        v: { name: '호체신강', effects: [{ status: 'reflect', dur: 8, value: 1.0, all: true, to: 'self' }, { status: 'guard', dur: 8, value: 0.4, to: 'self' }, { status: 'taunt', dur: 4, to: 'all_enemies' }], desc: '8초간 받은 모든 피해 100% 반사 + 받는 피해 -40% + 도발.' } },
      C: { name: '일지선', target: 'enemy', fx: 'bash', power: 2.6, ki: 0.2, poise: 90, effects: [{ status: 'stun', dur: 1.5 }], desc: '손가락 하나로 찌르기 — 기 1개당 위력 +20% + 1.5초 기절 + 그로기 대량 감소.',
        v: { name: '탄지신통', poise: 120, effects: [{ status: 'stun', dur: 2 }], desc: '기 1개당 위력 +20% + 2초 기절 + 그로기 초대량 감소.' } },
    } },
  // ---------------- 원딜
  { id: 'byeolbi', name: '별비', role: 'ranged', title: '명사수', sprite: 'archer', trait: 'keen', starter: true,
    desc: '단일·광역 사격을 고루 갖춘 원딜. 어느 파티에나 잘 어울린다.',
    ults: {
      A: { base: 'byeolbi_ult', v: { name: '꿰뚫는 별', power: 4.6, poise: 40, effects: [{ status: 'vuln', dur: 8 }], desc: '더 강력한 단일 사격 + 8초 취약 + 그로기 게이지 감소.' } },
      B: { name: '화살 폭풍', target: 'all_enemies', fx: 'arrowrain', power: 1.2, hits: 3, desc: '적 전체 3연사.',
        v: { name: '하늘을 덮는 화살', hits: 5, desc: '적 전체 5연사.' } },
      C: { name: '관통 일제 사격', target: 'area_enemy', fx: 'arrowrain', areaR: 120, power: 2.2, effects: [{ status: 'vuln', dur: 5 }], desc: '넓은 범위 사격 + 5초 취약.',
        v: { name: '폭풍 일제 사격', power: 2.6, effects: [{ status: 'vuln', dur: 6 }, { status: 'slow', dur: 4, value: 0.3 }], desc: '넓은 범위 강한 사격 + 6초 취약 + 4초 둔화.' } },
    } },
  { id: 'haram', name: '하람', role: 'ranged', title: '저격수', sprite: 'archer_b', trait: 'cautious', stat: { hp: 0.85, atk: 1.25, aspd: 0.75 },
    desc: '조준은 길지만 한 방은 누구보다 강하다. 그로기 순간을 노리는 저격수.',
    ults: {
      A: { name: '별똥 저격', target: 'enemy', fx: 'snipe', delay: 1.5, power: 6.5, desc: '1.5초 조준 후 초강력 저격.',
        v: { name: '유성 저격', delay: 1.2, power: 7.5, desc: '1.2초 조준 후 더 강한 저격.' } },
      B: { name: '표식 사냥', target: 'enemy', fx: 'pierce', power: 1.0, effects: [{ status: 'vuln', dur: 8 }, { status: 'weaken', dur: 8, value: 0.2 }], desc: '표식을 남겨 8초간 취약 + 약화(-20%).',
        v: { name: '사냥꾼의 낙인', effects: [{ status: 'vuln', dur: 10 }, { status: 'weaken', dur: 10, value: 0.25 }, { status: 'slow', dur: 6, value: 0.4 }], desc: '10초간 취약 + 약화(-25%) + 6초 둔화.' } },
      C: { name: '일격필살', target: 'enemy', fx: 'snipe', delay: 2.5, power: 6.0, brokenMult: 2.5, desc: '2.5초 조준 후 초강력 저격. 그로기 적에게 2.5배.',
        v: { name: '신의 화살', delay: 2.0, power: 7.0, brokenMult: 3.0, desc: '2초 조준 후 더 강한 저격. 그로기 적에게 3배.' } },
    } },
  { id: 'mir', name: '미르', role: 'ranged', title: '독침 사냥꾼', sprite: 'archer_c', trait: 'keen', stat: { atk: 0.95, aspd: 1.15 },
    desc: '중독과 약화로 적을 서서히 무너뜨린다. 쌓인 독은 한 번에 터뜨릴 수 있다.',
    ults: {
      A: { name: '독안개', target: 'area_enemy', fx: 'aoeheal', areaR: 120, power: 0.4, effects: [{ status: 'poison', dur: 8, dps: 0.5 }, { status: 'weaken', dur: 6, value: 0.25 }], desc: '범위 8초 중독 + 6초 약화(-25%).',
        v: { name: '죽음의 안개', effects: [{ status: 'poison', dur: 10, dps: 0.7 }, { status: 'weaken', dur: 8, value: 0.3 }], desc: '범위 10초 강한 중독 + 8초 약화(-30%).' } },
      B: { name: '마비 화살', target: 'enemy', fx: 'pierce', power: 1.4, poise: 30, effects: [{ status: 'stun', dur: 2.5 }], desc: '2.5초 기절 + 그로기 게이지 감소. 차지 공격을 끊는다.',
        v: { name: '신경독', effects: [{ status: 'stun', dur: 3 }, { status: 'slow', dur: 5, value: 0.5 }], desc: '3초 기절 + 5초 둔화(-50%) + 그로기 게이지 감소.' } },
      C: { name: '맹독 폭발', target: 'all_enemies', fx: 'nova', power: 0.8, detonate: { status: 'poison', mult: 1.0 }, desc: '적 전체 피해 + 남은 중독 피해를 한 번에 터뜨림.',
        v: { name: '연쇄 폭발', detonate: { status: 'poison', mult: 1.5 }, effects: [{ status: 'poison', dur: 6, dps: 0.3 }], desc: '남은 중독 피해를 1.5배로 터뜨린 뒤 다시 6초 중독.' } },
    } },
  { id: 'dal', name: '달래', role: 'ranged', title: '화약 사수', sprite: 'archer_d', trait: 'brave', stat: { hp: 0.95, atk: 1.1, aspd: 0.9 },
    desc: '폭발 화살로 무리를 태운다. 도적의 독과 만나면 「독연 폭발」.',
    ults: {
      A: { name: '폭발 화살', target: 'area_enemy', areaR: 95, fx: 'meteor', power: 1.9, effects: [{ status: 'burn', dur: 6, dps: 0.35 }], desc: '지점 폭발 + 6초 화상 (연계: 독연 폭발).',
        v: { name: '화약고', power: 2.3, areaR: 115, desc: '더 큰 폭발 + 6초 화상.' } },
      B: { name: '연막 사격', target: 'area_enemy', areaR: 110, fx: 'arrowrain', power: 0.8, hits: 2, interrupt: 2, effects: [{ status: 'slow', dur: 5, value: 0.4 }, { status: 'vuln', dur: 5 }], desc: '범위 2연사 + 5초 둔화·취약. 범위 안 끊기 ●●.',
        v: { name: '눈먼 사격', hits: 3, desc: '범위 3연사 + 5초 둔화·취약. 범위 안 끊기 ●●.' } },
      C: { name: '저격 일발', target: 'enemy', ranged: true, fx: 'snipe', power: 4.6, execute: { below: 0.3, mult: 2 }, desc: '한 발 저격. HP 30% 이하 적에게 2배.',
        v: { name: '심장 저격', power: 5.4, desc: '더 강한 한 발. HP 30% 이하 적에게 2배.' } },
    } },
  // ---------------- 매지션
  { id: 'soldam', name: '솔담', role: 'mage', title: '화염 마법사', sprite: 'mage', trait: 'cautious', starter: true,
    desc: '광역 화염 마법사. 졸개가 많은 전투에 강하다.',
    ults: {
      A: { base: 'soldam_ult', v: { name: '대화염진', power: 3.0, effects: [{ status: 'burn', dur: 6, dps: 0.45 }], desc: '적 전체 큰 피해 + 6초 강한 화상.' } },
      B: { name: '유성 낙하', target: 'area_enemy', fx: 'meteor', delay: 1.0, areaR: 120, power: 3.2, effects: [{ status: 'burn', dur: 4, dps: 0.3 }], desc: '1초 시전 후 넓은 범위에 운석 + 4초 화상.',
        v: { name: '유성군', areaR: 150, power: 3.6, desc: '1초 시전 후 더 넓은 범위에 더 강한 운석 + 4초 화상.' } },
      C: { name: '화염 정령', target: 'all_enemies', fx: 'nova', power: 0.5, effects: [{ status: 'burn', dur: 10, dps: 0.6 }, { status: 'inspire', dur: 8, value: 0.3, to: 'self' }], desc: '적 전체 10초 화상 + 8초간 솔담 공격력 +30%.',
        v: { name: '불사조', effects: [{ status: 'burn', dur: 10, dps: 0.6 }, { status: 'inspire', dur: 8, value: 0.2, to: 'party' }], desc: '적 전체 10초 화상 + 8초간 파티 공격력 +20%.' } },
    } },
  { id: 'seori', name: '서리', role: 'mage', title: '빙결술사', sprite: 'mage_b', trait: 'cautious', stat: { hp: 1.05, atk: 0.9 },
    desc: '얼리고 늦추는 제어형 매지션. 차지 끊기와 그로기에 강하다.',
    ults: {
      A: { name: '얼음 감옥', target: 'area_enemy', fx: 'meteor', areaR: 100, power: 1.0, poise: 30, effects: [{ status: 'stun', dur: 2 }], desc: '범위 2초 빙결(기절) + 그로기 게이지 감소.',
        v: { name: '빙하 감옥', areaR: 130, effects: [{ status: 'stun', dur: 2.5 }], desc: '더 넓은 범위 2.5초 빙결(기절) + 그로기 게이지 감소.' } },
      B: { name: '눈보라', target: 'area_enemy', fx: 'arrowrain', areaR: 140, power: 0.5, hits: 4, effects: [{ status: 'slow', dur: 5, value: 0.5 }], desc: '넓은 범위 4연타 + 5초 둔화(-50%).',
        v: { name: '한파', hits: 6, effects: [{ status: 'slow', dur: 6, value: 0.5 }, { status: 'vuln', dur: 6 }], desc: '넓은 범위 6연타 + 6초 둔화(-50%) + 6초 취약.' } },
      C: { name: '절대영도', target: 'all_enemies', fx: 'nova', power: 1.2, poise: 60, effects: [{ status: 'stun', dur: 2 }], desc: '적 전체 2초 빙결 + 그로기 게이지 대량 감소.',
        v: { name: '영원한 겨울', poise: 80, brokenMult: 1.5, effects: [{ status: 'stun', dur: 2.5 }], desc: '적 전체 2.5초 빙결 + 그로기 게이지 대량 감소. 그로기 적에게 1.5배.' } },
    } },
  { id: 'nox', name: '녹스', role: 'mage', title: '저주술사', sprite: 'mage_c', trait: 'brave', stat: { hp: 0.95, atk: 1.05 },
    desc: '저주와 지연 폭발의 매지션. 준비는 길지만 적중하면 판을 뒤집는다.',
    ults: {
      A: { name: '저주', target: 'all_enemies', fx: 'nova', power: 0.5, effects: [{ status: 'weaken', dur: 8, value: 0.3 }, { status: 'vuln', dur: 8 }], desc: '적 전체 8초 약화(-30%) + 취약.',
        v: { name: '심연의 저주', effects: [{ status: 'weaken', dur: 10, value: 0.4 }, { status: 'vuln', dur: 10 }, { status: 'slow', dur: 6, value: 0.3 }], desc: '적 전체 10초 약화(-40%) + 취약 + 6초 둔화.' } },
      B: { name: '영혼 착취', target: 'enemy', fx: 'starbolt', power: 2.2, partyHeal: 0.5, effects: [{ status: 'poison', dur: 8, dps: 0.6 }], desc: '단일 피해 + 8초 중독. 준 피해의 50%로 파티 회복.',
        v: { name: '영혼 포식', partyHeal: 0.8, ultGive: 15, desc: '단일 피해 + 8초 중독. 준 피해의 80%로 파티 회복 + 다른 아군 필살기 게이지 +15.' } },
      C: { name: '파멸의 낙인', target: 'enemy', fx: 'snipe', delay: 3.0, power: 7.0, brokenMult: 1.5, desc: '3초 시전 후 낙인 폭발. 그로기 적에게 1.5배.',
        v: { name: '종말의 낙인', power: 8.5, execute: { below: 0.4, mult: 1.5 }, desc: '3초 시전 후 더 큰 폭발. 그로기 적, HP 40% 이하 적에게 각각 1.5배.' } },
    } },
  { id: 'eun', name: '은하', role: 'mage', title: '번개술사', sprite: 'mage_d', trait: 'keen', stat: { hp: 0.95, atk: 1.05, aspd: 1.05 },
    desc: '연쇄 번개로 여러 적을 잠깐씩 멈춘다. 둔화된 적이면 「동결」로 더 오래.',
    ults: {
      A: { name: '연쇄 번개', target: 'multi_enemy', fx: 'nova', count: 4, power: 1.4, interrupt: 1, effects: [{ status: 'stun', dur: 0.8 }], desc: '적 4명에게 번개 + 0.8초 기절 (연계: 동결). 끊기 ●.',
        v: { name: '천둥 사슬', count: 6, effects: [{ status: 'stun', dur: 1 }], desc: '적 6명에게 번개 + 1초 기절. 끊기 ●.' } },
      B: { name: '폭풍의 눈', target: 'all_enemies', fx: 'nova', power: 0.5, hits: 3, effects: [{ status: 'slow', dur: 5, value: 0.35 }], desc: '모든 적 3연타 + 5초 둔화.',
        v: { name: '대폭풍', hits: 4, effects: [{ status: 'slow', dur: 6, value: 0.45 }], desc: '모든 적 4연타 + 6초 강한 둔화.' } },
      C: { name: '뇌신 강림', target: 'enemy', fx: 'starbolt', power: 3.8, poise: 70, effects: [{ status: 'stun', dur: 1.5 }], desc: '거대한 벼락 + 1.5초 기절 + 그로기 게이지 감소.',
        v: { name: '뇌신의 심판', power: 4.4, poise: 100, effects: [{ status: 'stun', dur: 2 }], desc: '더 큰 벼락 + 2초 기절 + 그로기 게이지 대량 감소.' } },
    } },
  // ---------------- 흑마술사 (v0.52): 저주(옮는 지속 피해) · 생명력 흡수 · 파멸(지연 폭발) · HP를 바치는 계약
  { id: 'daon', name: '다온', role: 'warlock', title: '계약의 흑마술사', sprite: 'warlock', trait: 'pact', gift: true,
    desc: '저주를 퍼뜨리고 그 고통으로 산다. 파멸의 낙인은 몇 초 뒤 크게 터진다.',
    ults: {
      A: { base: 'daon_ult', v: { name: '종말', effects: [{ status: 'doom', dur: 3.5, boom: 6.5 }, { status: 'curse', dur: 10, dps: 0.5 }], desc: '강한 저주 + 3.5초 뒤 종말 폭발(공격력 ×6.5).' } },
      B: { name: '역병의 계약', target: 'all_enemies', fx: 'curse', selfCost: 0.15, power: 0.6, effects: [{ status: 'curse', dur: 10, dps: 0.45 }], desc: 'HP 15%를 바쳐 모든 적에게 강한 저주 10초.',
        v: { name: '피의 역병', effects: [{ status: 'curse', dur: 12, dps: 0.55 }, { status: 'weaken', dur: 8, value: 0.25 }], desc: 'HP 15%를 바쳐 모든 적에게 강한 저주 12초 + 8초 약화(-25%).' } },
      C: { name: '영혼 수확', target: 'all_enemies', fx: 'nova', power: 1.0, partyHeal: 0.35, desc: '모든 적에게 피해 — 준 피해의 35%로 파티 회복.',
        v: { name: '영혼 포식', power: 1.3, partyHeal: 0.5, desc: '모든 적에게 더 큰 피해 — 준 피해의 50%로 파티 회복.' } },
    } },
  { id: 'risha', name: '리샤', role: 'warlock', title: '혈마술사', sprite: 'warlock_b', trait: 'brave', stat: { hp: 1.1, atk: 1.05 },
    desc: '자기 피를 대가로 힘을 끌어낸다. 위험할수록 강해지는 흡혈 마술사.',
    ults: {
      A: { name: '피의 계약', target: 'self', fx: 'curse', selfCost: 0.2, effects: [{ status: 'inspire', dur: 8, value: 0.6, to: 'self' }, { status: 'lifesteal', dur: 8, value: 0.3, to: 'self' }], desc: 'HP 20%를 바쳐 8초간 공격력 +60% · 흡혈 30%.',
        v: { name: '피의 군주', effects: [{ status: 'inspire', dur: 9, value: 0.8, to: 'self' }, { status: 'lifesteal', dur: 9, value: 0.4, to: 'self' }], desc: 'HP 20%를 바쳐 9초간 공격력 +80% · 흡혈 40%.' } },
      B: { name: '혈창', target: 'enemy', fx: 'snipe', selfCost: 0.1, power: 4.0, brokenMult: 1.5, desc: 'HP 10%를 바쳐 피의 창 — 그로기 적에게 1.5배.',
        v: { name: '심홍의 창', power: 4.8, desc: 'HP 10%를 바쳐 더 강한 피의 창 — 그로기 적에게 1.5배.' } },
      C: { name: '핏빛 안개', target: 'area_enemy', areaR: 110, fx: 'poison', power: 0.6, hits: 3, lifesteal: 0.5, effects: [{ status: 'curse', dur: 8, dps: 0.3 }], desc: '범위 3연타 + 저주. 준 피해의 50% 흡혈.',
        v: { name: '피의 폭풍', hits: 4, lifesteal: 0.7, desc: '범위 4연타 + 저주. 준 피해의 70% 흡혈.' } },
    } },
  { id: 'kali', name: '칼리', role: 'warlock', title: '파멸술사', sprite: 'warlock_c', trait: 'cautious', stat: { hp: 0.9, atk: 1.15, aspd: 0.9 },
    desc: '여러 적에게 파멸의 낙인을 새기고, 쌓인 저주를 한꺼번에 터뜨린다.',
    ults: {
      A: { name: '연쇄 파멸', target: 'multi_enemy', fx: 'curse', count: 3, power: 0.4, effects: [{ status: 'doom', dur: 4, boom: 3.0 }], desc: '적 3명에게 파멸의 낙인 — 4초 뒤 각각 폭발(공격력 ×3).',
        v: { name: '파멸의 비', count: 5, desc: '적 5명에게 파멸의 낙인 — 4초 뒤 각각 폭발(공격력 ×3).' } },
      B: { name: '공포', target: 'all_enemies', fx: 'nova', power: 0.3, effects: [{ status: 'stun', dur: 1.2 }, { status: 'weaken', dur: 6, value: 0.3 }], desc: '모든 적 1.2초 기절 + 6초 약화(-30%).',
        v: { name: '심연의 공포', effects: [{ status: 'stun', dur: 1.6 }, { status: 'weaken', dur: 8, value: 0.35 }, { status: 'vuln', dur: 6 }], desc: '모든 적 1.6초 기절 + 8초 약화(-35%) + 6초 취약.' } },
      C: { name: '저주 폭발', target: 'all_enemies', fx: 'nova', power: 0.6, detonate: { status: 'curse', mult: 1.5 }, desc: '모든 적 타격 + 각자의 저주를 한꺼번에 터뜨림(남은 저주 피해 ×1.5).',
        v: { name: '저주의 심판', power: 0.8, detonate: { status: 'curse', mult: 2.2 }, desc: '모든 적 타격 + 저주를 터뜨림(×2.2).' } },
    } },
  // ---------------- 네크로맨서 (v0.52): 해골 병사 소환 · 시체(쓰러진 적) 활용
  { id: 'myoyeon', name: '묘연', role: 'necro', title: '망자의 군주', sprite: 'necro', trait: 'grave', gift: true,
    desc: '해골 병사를 일으켜 앞을 막는다. 쓰러진 적의 시체는 더 많은 병사나 폭발이 된다.',
    ults: {
      A: { base: 'myoyeon_ult', v: { name: '불멸의 군단', summon: { n: 4, corpse: 2, hp: 0.55, atk: 0.85, dur: 20 }, desc: '해골 병사 4 소환 (시체 2구까지 써서 더) — 20초.' } },
      B: { name: '죽음의 손아귀', target: 'all_enemies', fx: 'bone', power: 0.5, corpsePow: { per: 0.3, max: 4 }, effects: [{ status: 'slow', dur: 5, value: 0.5 }, { status: 'weaken', dur: 6, value: 0.25 }], desc: '모든 적 5초 둔화(-50%) + 6초 약화(-25%) — 시체 1구당 위력 +30%(최대 4구).',
        v: { name: '무덤의 손아귀', effects: [{ status: 'slow', dur: 6, value: 0.5 }, { status: 'weaken', dur: 8, value: 0.3 }, { status: 'stun', dur: 1 }], desc: '모든 적 1초 기절 + 6초 둔화 + 8초 약화(-30%).' } },
      C: { name: '뼈 갑옷', target: 'party', fx: 'wall', shieldPct: 0.18, desc: '파티 전원 최대 HP 18% 뼈 보호막.',
        v: { name: '망자의 갑주', shieldPct: 0.26, effects: [{ status: 'guard', dur: 6, value: 0.15, to: 'party' }], desc: '파티 전원 26% 보호막 + 6초 받는 피해 -15%.' } },
    } },
  { id: 'bella', name: '벨라', role: 'necro', title: '뼈 조각사', sprite: 'necro_b', trait: 'gentle', stat: { hp: 1.05, atk: 0.95 },
    desc: '뼈를 깎아 거대한 골렘을 세운다. 골렘이 적을 붙잡는 동안 뼈 창으로 끊는다.',
    ults: {
      A: { name: '뼈 골렘', target: 'self', fx: 'bone', summon: { n: 1, kind: 'golem', hp: 1.2, atk: 1.0, dur: 20, taunt: 3 }, desc: '뼈 골렘 소환 — 20초. 나타날 때 주변 적 3초 도발.',
        v: { name: '거대 뼈 골렘', summon: { n: 1, kind: 'golem', hp: 1.7, atk: 1.3, dur: 25, taunt: 4 }, desc: '더 큰 뼈 골렘 소환 — 25초. 주변 적 4초 도발.' } },
      B: { name: '뼈 창', target: 'multi_enemy', fx: 'bone', count: 3, power: 1.5, interrupt: 1, effects: [{ status: 'slow', dur: 3, value: 0.4 }], desc: '시전 중인 적부터 3명 뼈 창 + 3초 둔화. 끊기 ●.',
        v: { name: '뼈 창 폭우', count: 5, power: 1.6, desc: '5명 뼈 창 + 둔화. 끊기 ●.' } },
      C: { name: '망자의 축복', target: 'self', fx: 'bone', summon: { n: 1, hp: 0.4, atk: 0.6, dur: 14 }, minionBuff: { heal: 0.6, inspire: 0.5, dur: 8 }, desc: '해골 병사 1 소환 + 모든 병사 HP 60% 회복 · 8초간 공격력 +50%.',
        v: { name: '망자의 행진곡', summon: { n: 2, hp: 0.4, atk: 0.6, dur: 14 }, minionBuff: { heal: 1, inspire: 0.7, dur: 10 }, desc: '병사 2 소환 + 모든 병사 완전 회복 · 10초간 공격력 +70%.' } },
    } },
  { id: 'kamu', name: '카무', role: 'necro', title: '역병 사령술사', sprite: 'necro_c', trait: 'cautious', stat: { hp: 0.9, atk: 1.1 },
    desc: '시체를 역병으로 바꾼다. 물어뜯는 구울 무리가 독을 옮긴다.',
    ults: {
      A: { name: '역병 시체', target: 'area_enemy', areaR: 110, fx: 'poison', power: 0.9, corpsePow: { per: 0.5, max: 3 }, effects: [{ status: 'poison', dur: 8, dps: 0.35 }], desc: '지점 역병 폭발 + 중독 1겹 — 시체 1구당 위력 +50%(최대 3구).',
        v: { name: '대역병', power: 1.1, effects: [{ status: 'poison', dur: 10, dps: 0.45 }, { status: 'weaken', dur: 6, value: 0.25 }], desc: '더 강한 역병 + 강한 중독 + 6초 약화(-25%).' } },
      B: { name: '구울 무리', target: 'self', fx: 'bone', summon: { n: 2, kind: 'ghoul', hp: 0.3, atk: 0.7, dur: 12, poison: 0.15 }, desc: '구울 2 소환 — 12초. 물 때마다 중독 1겹.',
        v: { name: '구울 군단', summon: { n: 3, kind: 'ghoul', hp: 0.32, atk: 0.75, dur: 14, poison: 0.18 }, desc: '구울 3 소환 — 14초. 물 때마다 중독.' } },
      C: { name: '죽음의 행진', target: 'all_enemies', fx: 'nova', power: 0.6, hits: 2, summon: { n: 1, hp: 0.35, atk: 0.55, dur: 12 }, desc: '모든 적 2연타 + 해골 병사 1 소환.',
        v: { name: '망자의 대행진', hits: 3, summon: { n: 2, hp: 0.35, atk: 0.55, dur: 12 }, desc: '모든 적 3연타 + 해골 병사 2 소환.' } },
    } },
  // ---------------- 서포터
  { id: 'bori', name: '보리', role: 'support', title: '생명의 사제', sprite: 'priest', trait: 'gentle', starter: true,
    desc: '광역 회복 특화. 장기전을 버티게 하는 파티의 중심.',
    ults: {
      A: { base: 'bori_ult', v: { name: '세계수', effects: [{ status: 'regen', dur: 10, value: 0.06, to: 'party' }, { status: 'guard', dur: 10, value: 0.15, to: 'party' }], desc: '10초간 파티 재생(초당 6%) + 받는 피해 -15%.' } },
      B: { name: '꽃비', target: 'party', fx: 'aoeheal', heal: 1.5, healPct: 0.2, desc: '파티 즉시 회복(최대 HP 20% + 공격력 비례).',
        v: { name: '치유의 폭우', healPct: 0.3, cleanse: true, desc: '파티 즉시 회복(최대 HP 30% + 공격력 비례) + 해로운 효과 해제.' } },
      C: { name: '부활의 씨앗', target: 'party', fx: 'tree', revive: 0.4, healPct: 0.1, desc: '쓰러진 동료 1명을 HP 40%로 부활 + 파티 HP 10% 회복.',
        v: { name: '윤회', revive: 0.6, healPct: 0.15, effects: [{ status: 'invuln', dur: 2, to: 'party' }], desc: '쓰러진 동료 1명을 HP 60%로 부활 + 파티 HP 15% 회복 + 2초 무적.' } },
    } },
  { id: 'lumi', name: '루미', role: 'support', title: '축복의 음유시인', sprite: 'priest_b', trait: 'gentle', stat: { hp: 0.95, atk: 1.15 },
    desc: '파티를 강하게 만드는 버퍼. 공격력 강화와 쿨타임 가속이 특기.',
    ults: {
      A: { name: '용기의 노래', target: 'party', fx: 'tree', effects: [{ status: 'inspire', dur: 8, value: 0.25, to: 'party' }, { status: 'regen', dur: 8, value: 0.02, to: 'party' }], desc: '8초간 파티 공격력 +25% + 재생(초당 2%).',
        v: { name: '영웅의 노래', effects: [{ status: 'inspire', dur: 8, value: 0.35, to: 'party' }, { status: 'regen', dur: 8, value: 0.03, to: 'party' }], desc: '8초간 파티 공격력 +35% + 재생(초당 3%).' } },
      B: { name: '재촉의 가락', target: 'party', fx: 'wall', cdReduce: 4, ultGive: 15, desc: '다른 아군 스킬 쿨타임 -4초 + 필살기 게이지 +15.',
        v: { name: '질풍의 가락', cdReduce: 6, ultGive: 25, desc: '다른 아군 스킬 쿨타임 -6초 + 필살기 게이지 +25.' } },
      C: { name: '결전의 찬가', target: 'party', fx: 'wall', effects: [{ status: 'inspire', dur: 6, value: 0.4, to: 'party' }, { status: 'lifesteal', dur: 6, value: 0.2, to: 'party' }], desc: '6초간 파티 공격력 +40% + 흡혈 20%.',
        v: { name: '승리의 찬가', effects: [{ status: 'inspire', dur: 6, value: 0.5, to: 'party' }, { status: 'lifesteal', dur: 6, value: 0.3, to: 'party' }, { status: 'guard', dur: 6, value: 0.15, to: 'party' }], desc: '6초간 파티 공격력 +50% + 흡혈 30% + 받는 피해 -15%.' } },
    } },
  { id: 'sera', name: '세라', role: 'support', title: '수호 치유사', sprite: 'priest_c', trait: 'gentle', stat: { hp: 1.05, atk: 0.9 },
    desc: '한 명을 확실히 살리는 단일 회복 특화. 보호막과 희생으로 위기를 넘긴다.',
    ults: {
      A: { name: '기적', target: 'ally', fx: 'heal', heal: 3.0, healPct: 0.45, effects: [{ status: 'invuln', dur: 1.5 }], desc: '아군 1명 대량 회복(최대 HP 45% + 공격력 비례) + 1.5초 무적.',
        v: { name: '성스러운 기적', healPct: 0.6, effects: [{ status: 'invuln', dur: 2.5 }], desc: '아군 1명 초대량 회복(최대 HP 60% + 공격력 비례) + 2.5초 무적.' } },
      B: { name: '빛의 보호막', target: 'ally', fx: 'heal', shieldPct: 0.45, cleanse: true, desc: '아군 1명에게 8초간 최대 HP 45% 보호막 + 해로운 효과 해제.',
        v: { name: '빛의 장막', target: 'party', fx: 'wall', shieldPct: 0.22, desc: '파티 전원에게 8초간 최대 HP 22% 보호막 + 해로운 효과 해제.' } },
      C: { name: '희생', target: 'ally', fx: 'heal', healPct: 0.7, cleanse: true, selfCost: 0.2, desc: '세라 HP 20%를 바쳐 아군 1명 HP 70% 회복 + 해로운 효과 해제.',
        v: { name: '성녀의 희생', healPct: 1.0, partyHealPct: 0.15, selfCost: 0.15, desc: '세라 HP 15%를 바쳐 아군 1명 완전 회복 + 해제, 파티 HP 15% 회복.' } },
    } },
  { id: 'narae', name: '나래', role: 'support', title: '전쟁 북잡이', sprite: 'priest_d', trait: 'brave', stat: { hp: 1.05, atk: 1.1 },
    desc: '북소리로 파티의 손을 빠르게 한다. 회복은 적지만 쿨타임과 공격력을 끌어올린다.',
    ults: {
      A: { name: '전쟁의 북', target: 'party', fx: 'venom', cdReduce: 3, effects: [{ status: 'inspire', dur: 6, value: 0.25, to: 'party' }], desc: '파티 쿨타임 3초 감소 + 6초간 공격력 +25%.',
        v: { name: '진군의 북', cdReduce: 5, effects: [{ status: 'inspire', dur: 7, value: 0.3, to: 'party' }], desc: '파티 쿨타임 5초 감소 + 7초간 공격력 +30%.' } },
      B: { name: '수호의 노래', target: 'party', fx: 'wall', shieldPct: 0.14, desc: '파티 전원 최대 HP 14% 보호막.',
        v: { name: '불굴의 합창', shieldPct: 0.2, effects: [{ status: 'guard', dur: 5, value: 0.2, to: 'party' }], desc: '파티 전원 20% 보호막 + 5초 받는 피해 -20%.' } },
      C: { name: '영웅의 찬가', target: 'party', fx: 'aoeheal', ultGive: 25, healPct: 0.08, desc: '다른 동료 필살기 게이지 +25 + 파티 HP 8% 회복.',
        v: { name: '전설의 찬가', ultGive: 40, healPct: 0.12, desc: '다른 동료 필살기 게이지 +40 + 파티 HP 12% 회복.' } },
    } },
];
const CHAR = {}; CHARACTERS.forEach((c) => { CHAR[c.id] = c; });

// HEROES / AI_PRESETS / HERO_ORDER / SKILLS 에 등록 (기존 5인은 그대로 두고 속성만 보강)
(function registerCharacters() {
  const order = ['tank', 'melee', 'rogue', 'monk', 'ranged', 'mage', 'warlock', 'necro', 'support'];
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

// 캐릭터 레벨: 필살기는 레벨로 배우고(10레벨마다), 변주는 돌파까지 해야 쓴다. 60·70레벨은 필살기 숙련(위력 +5%씩)
// 전투 레벨 = 캐릭터 레벨 + 장비 레벨 (04b_equip.heroLevel). 캐릭터 10레벨 ≈ 장비 1등급
const CHAR_LV = {
  max: 70,
  ultUnlock: { A: 1, B: 10, C: 20, A2: 30, B2: 40, C2: 50 },
  mastery: [{ lv: 60, boost: 0.05 }, { lv: 70, boost: 0.05 }],
  recByTier: [1, 3, 12, 22, 32, 40, 50, 60, 70], // 난이도 단계별 권장 캐릭터 레벨
  expNext(lv) { return Math.round(20 + 10 * Math.pow(Math.max(0, lv - 1), 1.3)); },
  reward: { battle: 12, elite: 30, boss: 80 }, tierMult: 0.6, deadMult: 0.5,
};
// 쓸 수 있는 필살기 (돌파 + 레벨). lv를 빼면 레벨 제한 없이 (검증 도구용)
function ultChoices(id, bt, lv) {
  const out = ['A', 'B', 'C'];
  for (const s of BREAKTHROUGH.steps) if (s.unlock && bt >= s.bt) out.push(s.unlock);
  return out.filter((k) => lv === undefined || lv >= CHAR_LV.ultUnlock[k]).sort();
}
// 실제 전투용 필살기 정의 (돌파 위력 보너스 반영)
function ultDefFor(id, choice, bt, lv) {
  const sk = SKILLS[`${id}_ult_${choice}`] || SKILLS[`${id}_ult_A`];
  let boost = 0;
  for (const s of BREAKTHROUGH.steps) if (s.boost && bt >= s.bt && s.boost[choice[0]]) boost += s.boost[choice[0]];
  if (lv) for (const m of CHAR_LV.mastery) if (lv >= m.lv) boost += m.boost;
  if (!boost) return sk;
  const m = 1 + boost, out = Object.assign({}, sk);
  for (const k of ['power', 'heal', 'healPct', 'shieldPct', 'partyHealPct']) if (out[k]) out[k] = +(out[k] * m).toFixed(3);
  out.boosted = boost;
  return out;
}
