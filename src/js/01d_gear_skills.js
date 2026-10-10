// ===== 01d_gear_skills.js : 장비가 정하는 ①② 스킬 (갑옷 → ①, 무기 → ②) =====
// 직업마다 갑옷 3종 · 무기 3종 = 스킬 6종. 1번 계열은 직업 기본 스킬(장비가 없을 때도 이것).
// 원칙: 어떤 조합이든 그 직업의 그로기 역할은 남는다 (탱커 ② 기절 · 근딜/원딜 ① 끊기 ●● · 매지션 ② 범위 끊기 ● · 서포터 ① 공명).
// ai: 스킬을 바꿔 끼웠을 때 자동 전략이 따르는 기본값 { cond, target, param }
// 장비 등급 = 스킬 랭크 (위력·회복 +GEAR_SKILL_RANK × 등급 순서)

Object.assign(STATUS, {
  reflect: { name: '반격', short: '반', color: '#c8a070', desc: '받은 근접 평타 피해 일부를 되돌림.' },
});

const GEAR_SKILL_RANK = 0.05;

Object.assign(SKILLS, {
  // ---------------- 탱커 ① 갑옷 (도발 계열)
  gs_tank_s1_b: { name: '맹세의 외침', target: 'party', cd: 10, power: 0, shieldPct: 0.15, effects: [{ status: 'taunt', dur: 3, to: 'all_enemies' }, { status: 'guard', dur: 3, value: 0.15, to: 'self' }], fx: 'taunt', desc: '3초간 모든 적 도발 + 파티 전원에게 최대 HP 15% 보호막.', ai: { cond: 'saveForCharge', target: 'nearest' } },
  gs_tank_s1_c: { name: '가시 반격', target: 'self', cd: 9, power: 0, effects: [{ status: 'taunt', dur: 3, to: 'all_enemies' }, { status: 'guard', dur: 3, value: 0.1, to: 'self' }, { status: 'reflect', dur: 4, value: 0.6, to: 'self' }], fx: 'taunt', desc: '3초간 모든 적 도발. 4초간 받은 근접 평타 피해 60% 반격.', ai: { cond: 'saveForCharge', target: 'nearest' } },
  // ---------------- 탱커 ② 무기 (기절 = 끊기 칸 전부)
  gs_tank_s2_b: { name: '돌진 베기', target: 'enemy', cd: 9, hint: 'enemyCharging', power: 1.7, effects: [{ status: 'stun', dur: 1.2 }], fx: 'bash', desc: '돌진 강타 + 1.2초 기절 (끊기 칸 전부).', ai: { cond: 'smartInterrupt', target: 'charging' } },
  gs_tank_s2_c: { name: '대지 강타', target: 'self_area', cd: 11, hint: 'enemyCharging', power: 1.0, areaR: 95, effects: [{ status: 'stun', dur: 1.5 }], fx: 'spin', desc: '주변 모든 적 1.5초 기절 (끊기 칸 전부).', ai: { cond: 'smartInterrupt', target: 'charging' } },
  // ---------------- 근딜 ① 갑옷 (끊기 ●●)
  gs_melee_s1_b: { name: '발목 베기', target: 'enemy', cd: 5, power: 1.2, interrupt: 2, interruptBack: 0.5, effects: [{ status: 'slow', dur: 3, value: 0.4 }], fx: 'slash', desc: '강타 + 3초 둔화. 쿨타임 짧음. 끊기 ●● (정면 ●).', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_melee_s1_c: { name: '피의 일격', target: 'enemy', cd: 7, power: 2.1, interrupt: 2, interruptBack: 0.5, selfCost: 0.04, effects: [{ status: 'bleed', dur: 5, dps: 0.5 }], fx: 'slash', desc: '자기 HP 4% 소모. 강타 + 5초 깊은 출혈. 끊기 ●● (정면 ●).', ai: { cond: 'smartInterrupt', target: 'focus' } },
  // ---------------- 근딜 ② 무기
  gs_melee_s2_b: { name: '파쇄 일격', target: 'enemy', cd: 10, power: 2.0, brokenMult: 1.6, effects: [], fx: 'slash', desc: '강타. 그로기 적에게 1.6배.', ai: { cond: 'breakWindow', target: 'focus' } },
  gs_melee_s2_c: { name: '그림자 연격', target: 'enemy', cd: 8, power: 0.75, hits: 3, effects: [{ status: 'vuln', dur: 3 }], fx: 'slash', desc: '3연타 + 3초 취약.', ai: { cond: 'always', target: 'focus' } },
  // ---------------- 원딜 ① 갑옷 (끊기 ●●)
  gs_ranged_s1_b: { name: '견제 사격', target: 'enemy', cd: 5, power: 1.1, interrupt: 2, effects: [{ status: 'slow', dur: 3, value: 0.35 }], fx: 'pierce', desc: '3초 둔화. 쿨타임 짧음. 끊기 ●●.', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_ranged_s1_c: { name: '표식 사격', target: 'enemy', cd: 8, power: 1.3, interrupt: 2, shakeExtend: 2, effects: [{ status: 'vuln', dur: 8 }], fx: 'pierce', desc: '8초 취약. 끊기 ●●, 흔들림 +2초.', ai: { cond: 'smartInterrupt', target: 'focus' } },
  // ---------------- 원딜 ② 무기
  gs_ranged_s2_b: { name: '연사', target: 'enemy', cd: 8, power: 0.5, hits: 4, effects: [], fx: 'pierce', desc: '빠른 4연사.', ai: { cond: 'always', target: 'focus' } },
  gs_ranged_s2_c: { name: '저격', target: 'enemy', cd: 12, power: 3.4, delay: 1.0, brokenMult: 1.3, effects: [], fx: 'snipe', desc: '1초 조준 후 강력한 한 발. 그로기 적에게 1.3배.', ai: { cond: 'breakWindow', target: 'focus' } },
  // ---------------- 매지션 ① 갑옷
  gs_mage_s1_b: { name: '화염 파동', target: 'area_enemy', cd: 6, power: 1.2, areaR: 65, effects: [{ status: 'burn', dur: 4, dps: 0.3 }], fx: 'nova', desc: '좁은 범위 화염 + 4초 화상.', ai: { cond: 'always', target: 'nearest' } },
  gs_mage_s1_c: { name: '마나 보호막', target: 'ally', cd: 8, power: 0, shieldPct: 0.3, effects: [{ status: 'inspire', dur: 6, value: 0.35 }], fx: 'heal', desc: '아군 1명에게 최대 HP 30% 보호막 + 6초간 공격력 +35%. 위급한 아군이 없으면 가장 강한 동료에게.', ai: { cond: 'always', target: 'lowestAlly' } },
  // ---------------- 매지션 ② 무기 (범위 끊기 ●)
  gs_mage_s2_b: { name: '번개 사슬', target: 'multi_enemy', count: 3, cd: 9, hint: 'cluster', power: 1.0, interrupt: 1, effects: [], fx: 'starbolt', desc: '시전 중인 적부터 3명 연쇄. 맞은 적마다 끊기 ●.', ai: { cond: 'hint', target: 'nearest' } },
  gs_mage_s2_c: { name: '빙결 고리', target: 'area_enemy', cd: 12, hint: 'cluster', power: 0.8, areaR: 115, interrupt: 1, effects: [{ status: 'slow', dur: 4, value: 0.5 }], fx: 'nova', desc: '넓은 범위 4초 둔화. 범위 안 모든 적 끊기 ●.', ai: { cond: 'hint', target: 'nearest' } },
  // ---------------- 서포터 ① 갑옷 (공명)
  gs_support_s1_b: { name: '수호의 기도', target: 'ally', cd: 6, power: 0, shieldPct: 0.26, effects: [{ status: 'resonance', dur: 5, value: 0.3 }], fx: 'heal', desc: '아군 1명에게 최대 HP 26% 보호막 + 5초간 그로기 피해 +30%.', ai: { cond: 'always', target: 'lowestAlly' } },
  gs_support_s1_c: { name: '재생의 축복', target: 'ally', cd: 6, heal: 0.8, effects: [{ status: 'regen', dur: 6, value: 0.03 }, { status: 'resonance', dur: 5, value: 0.3 }], fx: 'heal', desc: '아군 1명 회복 + 6초 재생 + 5초간 그로기 피해 +30%.', ai: { cond: 'always', target: 'lowestAlly' } },
  // ---------------- 서포터 ② 무기
  gs_support_s2_b: { name: '빛의 심판', target: 'enemy', cd: 8, power: 1.9, effects: [{ status: 'vuln', dur: 4 }], fx: 'starbolt', desc: '빛의 일격 + 4초 취약.', ai: { cond: 'always', target: 'focus' } },
  gs_support_s2_c: { name: '정화의 빛', target: 'party', cd: 12, healPct: 0.08, cleanse: true, effects: [], fx: 'aoeheal', desc: '파티 전원 최대 HP 8% 회복 + 해로운 효과 해제.', ai: { cond: 'allyHpBelow', param: 70, target: 'lowestAlly' } },
});

// ---------------- v0.34: 직업별 네 번째 장비 라인 (무기·갑옷) → 새 스킬 10종
Object.assign(SKILLS, {
  gs_tank_s1_d: { name: '반격 자세', target: 'self', cd: 10, power: 0, effects: [{ status: 'taunt', dur: 3, to: 'all_enemies' }, { status: 'guard', dur: 3, value: 0.3, to: 'self' }, { status: 'reflect', dur: 3, value: 0.5, all: true, to: 'self' }], fx: 'taunt', desc: '3초간 도발 + 받는 피해 -30% + 받은 모든 피해(원거리 포함) 50% 반사.', ai: { cond: 'saveForCharge', target: 'nearest' } },
  gs_tank_s2_d: { name: '방패 투척', target: 'enemy', ranged: true, cd: 10, hint: 'enemyCharging', power: 1.2, effects: [{ status: 'stun', dur: 1.0 }, { status: 'taunt', dur: 3, force: true }], fx: 'bash', desc: '멀리 있는 적에게 방패를 던져 1초 기절(끊기 칸 전부) + 그 적을 3초 도발 (도발 무시 적도 끌어온다) — 후열을 노리는 사냥꾼 대응.', ai: { cond: 'smartInterrupt', target: 'charging' } },
  gs_melee_s1_d: { name: '그림자 걸음', target: 'enemy', behind: true, cd: 6, power: 1.3, interrupt: 2, effects: [{ status: 'vuln', dur: 3 }], fx: 'slash', desc: '적의 등 뒤로 순간 이동해 베기 + 3초 취약. 끊기 ●● (등 뒤라 정면 감소 없음).', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_melee_s2_d: { name: '회오리 베기', target: 'self_area', cd: 9, power: 0.8, hits: 3, areaR: 85, effects: [{ status: 'bleed', dur: 4, dps: 0.3 }], fx: 'spin', desc: '주변 적을 3번 베고 4초 출혈. 무리를 상대할 때.', ai: { cond: 'hint', target: 'nearest' }, hint: 'cluster' },
  gs_ranged_s1_d: { name: '덫 화살', target: 'area_enemy', cd: 6, power: 0.9, areaR: 60, interrupt: 2, effects: [{ status: 'slow', dur: 3, value: 0.6 }], fx: 'pierce', desc: '좁은 범위 3초 큰 둔화(-60%). 범위 안 적 끊기 ●●. 달려드는 암살자·광전사를 묶는다.', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_ranged_s2_d: { name: '폭발 화살', target: 'area_enemy', cd: 10, power: 1.6, areaR: 80, effects: [{ status: 'burn', dur: 4, dps: 0.35 }], fx: 'nova', desc: '범위 폭발 + 4초 화상 (트롤 재생 차단).', ai: { cond: 'hint', target: 'nearest' }, hint: 'cluster' },
  gs_mage_s1_d: { name: '서리 갑옷', target: 'ally', cd: 9, power: 0, shieldPct: 0.22, effects: [{ status: 'reflect', dur: 5, value: 0.4 }], fx: 'heal', desc: '아군 1명에게 최대 HP 22% 보호막 + 5초간 근접 평타 40% 반사. 물린 후열에게.', ai: { cond: 'allyHpBelow', param: 70, target: 'lowestAlly' } },
  gs_mage_s2_d: { name: '운석 낙하', target: 'area_enemy', cd: 14, hint: 'cluster', delay: 1.2, power: 3.0, areaR: 100, interrupt: 1, effects: [{ status: 'stun', dur: 1 }], fx: 'meteor', desc: '1.2초 영창 후 큰 범위 강타 + 1초 기절. 범위 안 끊기 ●.', ai: { cond: 'hint', target: 'nearest' } },
  gs_support_s1_d: { name: '공명의 노래', target: 'party', cd: 10, healPct: 0.06, effects: [{ status: 'resonance', dur: 4, value: 0.25, to: 'party' }], fx: 'aoeheal', desc: '파티 HP 6% 회복 + 4초간 파티 전원 그로기 피해 +25%. 그로기 타이밍에.', ai: { cond: 'breakWindow', target: 'lowestAlly' } },
  gs_support_s2_d: { name: '약화의 낙인', target: 'enemy', cd: 9, power: 1.0, effects: [{ status: 'weaken', dur: 6, value: 0.35 }], fx: 'starbolt', desc: '적 1명 6초간 주는 피해 -35%. 보스·광전사에게.', ai: { cond: 'always', target: 'focus' } },
});
// 장비 라인 4: 주 능력치는 1번 라인과 같고 고유 효과 대신 스킬이 특징
(function addGearLine4() {
  const names = { tank: ['반격자의 판금갑', '투척 방패'], melee: ['그림자 망토', '회오리 쌍검'], ranged: ['덫사냥꾼의 조끼', '화약 장궁'], mage: ['서리 로브', '유성 지팡이'], support: ['노래하는 성의', '낙인의 홀'] };
  for (const cls in names) for (const [i, slot] of [[0, 'armor'], [1, 'weapon']]) {
    const base = EQUIP_DB.items.find((it) => it.cls === cls && it.slot === slot && it.line === 1);
    if (!EQUIP_DB.items.some((it) => it.id === `${cls}_${slot}_4`)) EQUIP_DB.items.push(Object.assign({}, base, { id: `${cls}_${slot}_4`, name: names[cls][i], line: 4, innate: null }));
  }
})();

// 도적 직업 (v0.35): 장비 DB에 직업·장비 라인을 덧붙인다 (근딜 장비를 바탕으로 이름만 바꿈)
(function addRogueClass() {
  const DB = EQUIP_DB;
  if (DB.classes.some((c) => c.key === 'rogue')) return;
  DB.classes.push({ key: 'rogue', hero: 'yeon', name: '도적', heroName: '연', baseAtk: 37, baseHp: 250, trait: 'crit', traitName: '치명타 확률' });
  DB.classStat.rogue = Object.assign({}, DB.classStat.ranged);
  DB.skillBonus.rogue = JSON.parse(JSON.stringify(DB.skillBonus.melee));
  const names = { weapon: ['독 바른 단검', '쌍날 비수', '그림자 송곳', '맹독 쌍검'], armor: ['밤그림자 두건', '도둑의 가죽옷', '연막 망토', '독술사의 외투'], medal: ['그림자의 소울 메달', '맹독의 소울 메달'] };
  for (const slot in names) names[slot].forEach((name, i) => {
    const base = DB.items.find((it) => it.cls === 'melee' && it.slot === slot && it.line === (slot === 'medal' ? i + 1 : 1));
    DB.items.push(Object.assign({}, base, { id: `rogue_${slot}_${i + 1}`, name, cls: 'rogue', line: i + 1, innate: null }));
  });
})();
Object.assign(SKILLS, {
  gs_rogue_s1_b: { name: '목 긋기', target: 'enemy', behind: true, cd: 6, power: 1.5, interrupt: 2, effects: [{ status: 'bleed', dur: 5, dps: 0.3 }, { status: 'vuln', dur: 3 }], fx: 'slash', desc: '등 뒤에서 베기 + 5초 출혈 + 3초 취약. 끊기 ●●.', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_rogue_s1_c: { name: '독침 투척', target: 'enemy', ranged: true, cd: 4, power: 0.9, interrupt: 1, effects: [{ status: 'poison', dur: 8, dps: 0.2 }, { status: 'slow', dur: 3, value: 0.3 }], fx: 'pierce', desc: '멀리서 독침 — 중독 1겹 + 3초 둔화. 끊기 ●. 쿨이 짧아 독을 빨리 쌓는다.', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_rogue_s1_d: { name: '맹독 찌르기', target: 'enemy', behind: true, cd: 7, power: 0.8, hits: 2, interrupt: 2, effects: [{ status: 'poison', dur: 8, dps: 0.2 }], fx: 'flurry', desc: '등 뒤에서 2연타 — 중독 2겹. 끊기 ●●.', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_rogue_s2_b: { name: '독 폭탄', target: 'area_enemy', cd: 11, power: 0.9, areaR: 90, hint: 'cluster', effects: [{ status: 'poison', dur: 8, dps: 0.25 }], fx: 'poison', desc: '지점 범위 피해 + 모두 중독 1겹. 뭉친 적에게.', ai: { cond: 'hint', target: 'nearest' } },
  gs_rogue_s2_c: { name: '그림자 도약', target: 'enemy', behind: true, cd: 10, power: 1.6, effects: [{ status: 'stealth', dur: 3, to: 'self', after: true }], fx: 'slash', desc: '적 등 뒤로 도약해 베고 3초 은신 — 다음 공격은 기습.', ai: { cond: 'always', target: 'focus' } },
  gs_rogue_s2_d: { name: '독 터뜨리기', target: 'enemy', cd: 12, power: 1.0, detonate: { status: 'poison', mult: 1.0 }, effects: [], fx: 'flurry', desc: '타격 + 대상의 중독을 한꺼번에 터뜨림(남은 독 피해 전부). 5겹일 때 최고.', ai: { cond: 'always', target: 'focus' } },
});

// v0.52 새 직업 3종: 장비 DB에 직업·장비 라인 추가 (기준 직업 장비의 능력치를 쓰고 이름만 바꿈)
(function addNewClasses() {
  const DB = EQUIP_DB;
  const defs = [
    { key: 'monk', from: 'melee', hero: 'mujin', name: '수도승', heroName: '무진', baseAtk: 30, baseHp: 315, trait: 'critdmg', traitName: '치명타 피해',
      names: { weapon: ['강철 권갑', '바람의 각반', '금강저', '용의 손톱'], armor: ['수행자의 도복', '흐르는 물의 장삼', '쌍룡 무복', '금강 가사'], medal: ['백열의 소울 메달', '명경의 소울 메달'] } },
    { key: 'warlock', from: 'mage', hero: 'daon', name: '저주술사', heroName: '다온', baseAtk: 40, baseHp: 250, trait: 'dotdmg', traitName: '지속 피해',
      names: { weapon: ['저주받은 마도서', '피의 단검', '파멸의 수정구', '영혼 사슬'], armor: ['계약자의 로브', '고통의 망토', '사슬 로브', '심연의 외투'], medal: ['역병의 소울 메달', '파멸의 소울 메달'] } },
    { key: 'demon', from: 'mage', hero: 'seren', name: '흑마술사', heroName: '세렌', baseAtk: 38, baseHp: 255, trait: 'skilldmg', traitName: '스킬 피해',
      names: { weapon: ['악마의 홀', '지옥불 마도서', '공허의 수정', '혼돈의 지팡이', '계약의 단검'], armor: ['계약자의 로브', '지옥불 망토', '공허 장막 로브', '혼돈의 외투', '악마 가죽 갑옷'], medal: ['군주의 소울 메달', '계약의 소울 메달'] } },
    { key: 'necro', from: 'mage', hero: 'myoyeon', name: '네크로맨서', heroName: '묘연', baseAtk: 34, baseHp: 280, trait: 'skilldmg', traitName: '스킬 피해',
      names: { weapon: ['해골 지팡이', '시체 낫', '죽음의 홀', '영혼 등불'], armor: ['무덤지기 로브', '뼈 갑주', '수의', '망자의 외투'], medal: ['군단의 소울 메달', '시체의 소울 메달'] } },
  ];
  for (const d of defs) {
    if (DB.classes.some((c) => c.key === d.key)) continue;
    DB.classes.push({ key: d.key, hero: d.hero, name: d.name, heroName: d.heroName, baseAtk: d.baseAtk, baseHp: d.baseHp, trait: d.trait, traitName: d.traitName });
    DB.classStat[d.key] = d.trait === 'dotdmg' ? { stat: 'dotdmg', L: 0.18, E: 0.18 } : Object.assign({}, DB.classStat[d.from]);
    DB.skillBonus[d.key] = JSON.parse(JSON.stringify(DB.skillBonus[d.from]));
    for (const slot in d.names) d.names[slot].forEach((name, i) => {
      const base = DB.items.find((it) => it.cls === d.from && it.slot === slot && it.line === (slot === 'medal' ? i + 1 : 1));
      DB.items.push(Object.assign({}, base, { id: `${d.key}_${slot}_${i + 1}`, name, cls: d.key, line: i + 1, innate: null }));
    });
  }
})();
Object.assign(SKILLS, {
  // ---------------- 수도승 ① 갑옷 (끊기 + 기 모으기) / ② 무기 (기 쓰기)
  gs_monk_s1_b: { name: '철산고', target: 'enemy', cd: 6, power: 1.3, interrupt: 2, kiGain: 1, effects: [{ status: 'slow', dur: 2, value: 0.5 }], fx: 'bash', desc: '어깨로 들이받기 + 2초 둔화 + 기 +1. 끊기 ●●.', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_monk_s1_c: { name: '유수장', target: 'enemy', cd: 8, power: 1.0, interrupt: 2, kiGain: 2, selfHealPct: 0.06, effects: [{ status: 'guard', dur: 3, value: 0.25, to: 'self' }], fx: 'bash', desc: '흐르는 물처럼 받아치는 장 — HP 6% 회복 + 3초간 받는 피해 -25% + 기 +2. 끊기 ●●.', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_monk_s1_d: { name: '쌍룡각', target: 'enemy', behind: true, cd: 6, power: 0.8, hits: 2, interrupt: 2, kiGain: 2, effects: [{ status: 'vuln', dur: 3 }], fx: 'flurry', desc: '등 뒤로 돌아 2연속 발차기 + 3초 취약 + 기 +2. 끊기 ●●.', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_monk_s2_b: { name: '파산장', target: 'self_area', cd: 10, power: 1.1, areaR: 90, ki: 0.25, hint: 'nearEnemies', effects: [{ status: 'stun', dur: 0.8 }], fx: 'spin', desc: '주변 적 장타 + 0.8초 기절 — 기 1개당 위력 +25%.', ai: { cond: 'hint', target: 'nearest' } },
  gs_monk_s2_c: { name: '기혈 순환', target: 'self', cd: 12, power: 0, kiHeal: 0.05, effects: [{ status: 'inspire', dur: 6, value: 0.3, to: 'self' }], fx: 'heal', desc: '기를 모두 써서 기 1개당 HP 5% 회복 + 6초간 공격력 +30%.', ai: { cond: 'allyHpBelow', param: 60, target: 'nearest' } },
  gs_monk_s2_d: { name: '용권풍', target: 'enemy', cd: 11, power: 2.2, ki: 0.3, brokenMult: 1.6, effects: [], fx: 'slash', desc: '회오리 주먹 — 기 1개당 위력 +30%. 그로기 적에게 1.6배.', ai: { cond: 'breakWindow', target: 'focus' } },
  // ---------------- 저주술사 ① 갑옷 (저주 + 끊기 ●) / ② 무기
  gs_warlock_s1_b: { name: '쇠약의 저주', target: 'enemy', cd: 6, power: 0.6, interrupt: 1, effects: [{ status: 'weaken', dur: 6, value: 0.3 }, { status: 'curse', dur: 6, dps: 0.2 }], fx: 'curse', desc: '6초 약화(주는 피해 -30%) + 저주. 끊기 ●. 보스·광전사에게.', ai: { cond: 'always', target: 'focus' } },
  gs_warlock_s1_c: { name: '고통의 낙인', target: 'enemy', cd: 5, power: 0.7, interrupt: 1, effects: [{ status: 'curse', dur: 10, dps: 0.38 }], fx: 'curse', desc: '10초 강한 저주. 끊기 ●.', ai: { cond: 'always', target: 'focus' } },
  gs_warlock_s1_d: { name: '어둠의 사슬', target: 'multi_enemy', count: 2, cd: 7, power: 0.7, interrupt: 1, effects: [{ status: 'slow', dur: 3, value: 0.4 }, { status: 'curse', dur: 6, dps: 0.22 }], fx: 'curse', desc: '시전 중인 적부터 2명 사슬 — 3초 둔화 + 저주. 맞은 적마다 끊기 ●.', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_warlock_s2_b: { name: '영혼 화염', target: 'area_enemy', cd: 10, power: 1.2, areaR: 85, hint: 'cluster', effects: [{ status: 'curse', dur: 8, dps: 0.3 }], fx: 'poison', desc: '지점 범위 피해 + 모두 저주. 뭉친 적에게.', ai: { cond: 'hint', target: 'nearest' } },
  gs_warlock_s2_c: { name: '피의 대가', target: 'self', cd: 12, power: 0, selfCost: 0.1, ultSelf: 20, effects: [{ status: 'inspire', dur: 5, value: 0.3, to: 'self' }], fx: 'curse', desc: 'HP 10%를 바쳐 필살기 게이지 +20 + 5초간 공격력 +30%.', ai: { cond: 'always', target: 'nearest' } },
  gs_warlock_s2_d: { name: '파멸의 씨앗', target: 'enemy', cd: 12, power: 0.4, effects: [{ status: 'doom', dur: 3, boom: 2.4 }], fx: 'curse', desc: '3초 뒤 터지는 파멸의 씨앗(공격력 ×2.4).', ai: { cond: 'breakWindow', target: 'focus' } },
  // ---------------- 흑마술사(악마) ① 갑옷 (어둠 마법 · 끊기 ●) / ② 무기 (악마 다루기)
  gs_demon_s1_b: { name: '불타는 영혼', target: 'enemy', cd: 6, power: 1.0, interrupt: 1, effects: [{ status: 'burn', dur: 5, dps: 0.3 }], fx: 'starbolt', desc: '지옥불 + 5초 화상. 끊기 ●.', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_demon_s1_c: { name: '생명력 착취', target: 'enemy', cd: 7, power: 1.1, interrupt: 1, lifesteal: 0.5, effects: [], fx: 'curse', desc: '흡혈(50%) 어둠 화살. 끊기 ●.', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_demon_s1_d: { name: '혼돈의 화살', target: 'enemy', cd: 8, power: 1.8, interrupt: 1, brokenMult: 1.3, effects: [], fx: 'snipe', desc: '혼돈의 화살 — 그로기 적에게 1.3배. 끊기 ●.', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_demon_s1_e: { name: '악마의 손아귀', target: 'multi_enemy', count: 2, cd: 7, power: 0.8, interrupt: 1, effects: [{ status: 'slow', dur: 3, value: 0.4 }], fx: 'curse', desc: '시전 중인 적부터 2명 붙잡기 + 3초 둔화. 맞은 적마다 끊기 ●.', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_demon_s2_b: { name: '희생', target: 'self', cd: 12, power: 0, shieldPct: 0.28, petCost: 0.3, effects: [], fx: 'wall', desc: '내 악마의 HP 30%를 바쳐 자신에게 최대 HP 28% 보호막.', ai: { cond: 'allyHpBelow', param: 60, target: 'nearest' } },
  gs_demon_s2_c: { name: '지옥의 문', target: 'self', cd: 12, power: 0, summon: { n: 2, kind: 'imp', hp: 0.22, atk: 0.5, dur: 10 }, effects: [], fx: 'bone', desc: '작은 임프 2마리 10초 소환.', ai: { cond: 'always', target: 'nearest' } },
  gs_demon_s2_d: { name: '공포의 울부짖음', target: 'self_area', cd: 12, power: 0.4, areaR: 100, hint: 'nearEnemies', effects: [{ status: 'stun', dur: 1 }], fx: 'nova', desc: '주변 적 1초 기절(끊기 칸 전부). 붙은 적을 떼어 낸다.', ai: { cond: 'hint', target: 'nearest' } },
  gs_demon_s2_e: { name: '악마 변신', target: 'self', cd: 14, power: 0, effects: [{ status: 'inspire', dur: 8, value: 0.5, to: 'self' }, { status: 'guard', dur: 8, value: 0.2, to: 'self' }], petBuff: { heal: 0.3, inspire: 0.3, dur: 8 }, fx: 'curse', desc: '8초간 공격력 +50% · 받는 피해 -20% + 악마도 강해진다.', ai: { cond: 'breakWindow', target: 'nearest' } },
  // ---------------- 네크로맨서 ① 갑옷 / ② 무기
  gs_necro_s1_b: { name: '뼈 창', target: 'enemy', cd: 6, power: 1.2, interrupt: 1, effects: [{ status: 'slow', dur: 3, value: 0.3 }], fx: 'bone', desc: '뼈 창 + 3초 둔화. 끊기 ●.', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_necro_s1_c: { name: '구울 소환', target: 'self', cd: 9, power: 0, summon: { n: 2, kind: 'ghoul', hp: 0.25, atk: 0.5, dur: 10, poison: 0.12 }, effects: [], fx: 'bone', desc: '구울 2 소환 — 10초. 물 때마다 중독.', ai: { cond: 'always', target: 'nearest' } },
  gs_necro_s1_d: { name: '뼈 방패', target: 'ally', cd: 8, power: 0, shieldPct: 0.22, effects: [], fx: 'heal', desc: '아군 1명에게 최대 HP 22% 뼈 보호막. 물린 후열에게.', ai: { cond: 'always', target: 'lowestAlly' } },
  gs_necro_s2_b: { name: '시체 폭탄', target: 'area_enemy', cd: 12, power: 0.5, areaR: 105, hint: 'cluster', corpsePow: { per: 0.9, max: 4 }, effects: [], fx: 'bone', desc: '넓은 폭발 — 시체 1구당 위력 +90% (최대 4구). 시체가 쌓였을 때.', ai: { cond: 'hint', target: 'nearest' } },
  gs_necro_s2_c: { name: '죽음의 표식', target: 'enemy', cd: 10, power: 0.6, effects: [{ status: 'vuln', dur: 6 }, { status: 'deathmark', dur: 8 }], fx: 'curse', desc: '6초 취약 + 8초 죽음의 표식 — 해골 병사들이 이 적부터 노린다.', ai: { cond: 'always', target: 'focus' } },
  gs_necro_s2_d: { name: '영혼 흡수', target: 'all_enemies', cd: 14, power: 0.5, partyHeal: 0.3, effects: [], fx: 'nova', desc: '모든 적 피해 — 준 피해의 30%로 파티 회복.', ai: { cond: 'allyHpBelow', param: 70, target: 'nearest' } },
});

// ---------------- v0.53: 모든 직업에 다섯 번째 장비 라인 (무기·갑옷) → 새 스킬 18종 · 장신구 6종 · 패시브 2종
Object.assign(SKILLS, {
  gs_tank_s1_e: { name: '재생의 맹세', target: 'self', cd: 10, power: 0, selfHealPct: 0.1, effects: [{ status: 'taunt', dur: 3, to: 'all_enemies' }, { status: 'guard', dur: 3, value: 0.15, to: 'self' }], fx: 'taunt', desc: '3초간 모든 적 도발 + 받는 피해 -15% + HP 10% 회복.', ai: { cond: 'saveForCharge', target: 'nearest' } },
  gs_tank_s2_e: { name: '사슬 끌어오기', target: 'enemy', ranged: true, cd: 11, hint: 'enemyCharging', power: 1.0, pull: true, effects: [{ status: 'stun', dur: 0.8 }, { status: 'taunt', dur: 3, force: true }], fx: 'bash', desc: '사슬로 적을 앞으로 끌어와 0.8초 기절(끊기 칸 전부) + 3초 도발. 후열의 궁수·주술사를 끌어낸다 (보스·큰 적은 끌리지 않음).', ai: { cond: 'smartInterrupt', target: 'charging' } },
  gs_melee_s1_e: { name: '피의 맹세', target: 'enemy', cd: 6, power: 1.3, interrupt: 2, interruptBack: 0.5, lifesteal: 0.35, effects: [{ status: 'bleed', dur: 4, dps: 0.3 }], fx: 'slash', desc: '흡혈 베기(준 피해의 35% 회복) + 4초 출혈. 끊기 ●● (정면 ●).', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_melee_s2_e: { name: '처형', target: 'enemy', cd: 12, power: 1.8, execute: { below: 0.3, mult: 2.2 }, effects: [], fx: 'slash', desc: '강타 — HP 30% 이하 적에게 2.2배.', ai: { cond: 'enemyHpBelow', param: 30, target: 'weakest' } },
  gs_rogue_s1_e: { name: '맹독 표창', target: 'multi_enemy', count: 2, cd: 6, power: 0.7, interrupt: 1, effects: [{ status: 'poison', dur: 8, dps: 0.2 }], fx: 'pierce', desc: '시전 중인 적부터 2명에게 표창 — 중독 1겹. 맞은 적마다 끊기 ●.', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_rogue_s2_e: { name: '연막탄', target: 'area_enemy', cd: 12, power: 0.4, areaR: 95, hint: 'cluster', effects: [{ status: 'slow', dur: 3, value: 0.5 }, { status: 'weaken', dur: 4, value: 0.2 }, { status: 'stealth', dur: 2, to: 'self', after: true }], fx: 'smoke', desc: '지점 연막 — 3초 둔화(-50%) + 4초 약화(-20%), 그 뒤 2초 은신.', ai: { cond: 'hint', target: 'nearest' } },
  gs_monk_s1_e: { name: '진각', target: 'self_area', cd: 8, power: 0.9, areaR: 85, interrupt: 2, kiGain: 2, effects: [{ status: 'slow', dur: 2, value: 0.4 }], fx: 'spin', desc: '땅을 굴러 주변 적 타격 + 2초 둔화 + 기 +2. 범위 안 끊기 ●●.', ai: { cond: 'smartInterrupt', target: 'nearest' } },
  gs_monk_s2_e: { name: '천근추', target: 'enemy', cd: 12, power: 1.5, ki: 0.3, poise: 35, effects: [{ status: 'stun', dur: 0.6 }], fx: 'bash', desc: '무게를 실어 내리찍기 — 기 1개당 위력 +30% + 0.6초 기절 + 그로기 감소.', ai: { cond: 'smartInterrupt', target: 'charging' } },
  gs_ranged_s1_e: { name: '사냥꾼의 표식', target: 'enemy', cd: 7, power: 1.0, interrupt: 2, effects: [{ status: 'vuln', dur: 6 }, { status: 'deathmark', dur: 8 }], fx: 'pierce', desc: '6초 취약 + 8초 표식 (해골 병사가 이 적부터). 끊기 ●●.', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_ranged_s2_e: { name: '산탄 사격', target: 'multi_enemy', count: 3, cd: 9, power: 1.1, effects: [{ status: 'slow', dur: 2, value: 0.3 }], fx: 'pierce', desc: '적 3명에게 한꺼번에 사격 + 2초 둔화.', ai: { cond: 'enemyCountGte', param: 2, target: 'nearest' } },
  gs_mage_s1_e: { name: '시간 왜곡', target: 'all_enemies', cd: 12, power: 0.3, cdReduce: 2, effects: [{ status: 'slow', dur: 4, value: 0.35 }], fx: 'nova', desc: '모든 적 4초 둔화(-35%) + 동료 스킬 쿨타임 -2초.', ai: { cond: 'always', target: 'nearest' } },
  gs_mage_s2_e: { name: '화염 폭풍', target: 'area_enemy', cd: 13, hint: 'cluster', power: 0.55, hits: 3, areaR: 120, interrupt: 1, effects: [{ status: 'burn', dur: 4, dps: 0.25 }], fx: 'meteor', desc: '넓은 범위 3연타 + 4초 화상. 범위 안 끊기 ●.', ai: { cond: 'hint', target: 'nearest' } },
  gs_warlock_s1_e: { name: '영혼 사슬', target: 'enemy', cd: 7, power: 0.8, interrupt: 1, lifesteal: 0.3, effects: [{ status: 'curse', dur: 6, dps: 0.25 }, { status: 'slow', dur: 2, value: 0.3 }], fx: 'curse', desc: '흡혈(30%) + 저주 + 2초 둔화. 끊기 ●.', ai: { cond: 'always', target: 'focus' } },
  gs_warlock_s2_e: { name: '흡혼', target: 'all_enemies', cd: 15, power: 0.35, detonate: { status: 'curse', mult: 0.8 }, partyHeal: 0.3, effects: [], fx: 'nova', desc: '모든 적의 저주를 거둬들여 터뜨림(×0.8) — 준 피해의 30%로 파티 회복.', ai: { cond: 'allyHpBelow', param: 70, target: 'nearest' } },
  gs_necro_s1_e: { name: '시체 먹기', target: 'self', cd: 10, power: 0, corpseHeal: { per: 0.04, max: 3 }, summon: { n: 1, hp: 0.3, atk: 0.5, dur: 10 }, effects: [], fx: 'bone', desc: '해골 병사 1 소환 + 시체 1구당 파티 HP 4% 회복(최대 3구).', ai: { cond: 'always', target: 'nearest' } },
  gs_necro_s2_e: { name: '뼈 감옥', target: 'enemy', cd: 12, hint: 'enemyCharging', power: 0.5, effects: [{ status: 'stun', dur: 1.5 }, { status: 'vuln', dur: 4 }], fx: 'bone', desc: '뼈 감옥에 가둬 1.5초 기절(끊기 칸 전부) + 4초 취약.', ai: { cond: 'smartInterrupt', target: 'charging' } },
  gs_support_s1_e: { name: '희생의 기도', target: 'ally', cd: 7, heal: 1.4, healPct: 0.12, selfCost: 0.05, effects: [{ status: 'resonance', dur: 5, value: 0.35 }], fx: 'heal', desc: '자기 HP 5%를 바쳐 아군 1명 크게 회복 + 5초간 그로기 피해 +35%.', ai: { cond: 'always', target: 'lowestAlly' } },
  gs_support_s2_e: { name: '신성한 사슬', target: 'enemy', cd: 10, hint: 'enemyCharging', power: 1.0, effects: [{ status: 'stun', dur: 1 }, { status: 'weaken', dur: 5, value: 0.2 }], fx: 'starbolt', desc: '빛의 사슬로 1초 기절(끊기 칸 전부) + 5초 약화(-20%).', ai: { cond: 'smartInterrupt', target: 'charging' } },
});
(function addGearLine5() {
  const DB = EQUIP_DB;
  const names = { tank: ['재생의 판금갑', '사슬 철퇴'], melee: ['피의 맹세 경갑', '처형인의 대검'], rogue: ['표창 띠 조끼', '연막 단검'], monk: ['진각 도복', '천근 권갑'], ranged: ['사냥꾼의 망토', '산탄 석궁'],
    mage: ['시간술사의 로브', '화염 폭풍 지팡이'], warlock: ['영혼 사슬 로브', '흡혼의 마도서'], necro: ['시체 먹는 로브', '뼈 감옥 홀'], support: ['희생의 성의', '신성한 사슬 홀'] };
  for (const cls in names) for (const [i, slot] of [[0, 'armor'], [1, 'weapon']]) {
    const base = DB.items.find((it) => it.cls === cls && it.slot === slot && it.line === 1);
    if (!DB.items.some((it) => it.id === `${cls}_${slot}_5`)) DB.items.push(Object.assign({}, base, { id: `${cls}_${slot}_5`, name: names[cls][i], line: 5, innate: null }));
  }
  // 새 능력치 (수도승 회피 · 흡수 · 가시) → 장신구·패시브에서도
  const st = (key, name, pw, cap) => { if (!DB.stats.some((x) => x.key === key)) DB.stats.push(Object.assign({ key, name, unit: '%', pct: true, pw }, cap ? { cap } : {})); };
  st('dodge', '근접 평타 회피', 0.4, 0.4); st('drain', '피해 흡수', 0.5); st('thorns', '근접 피해 반사', 0.2);
  const acc = [
    ['common_ring_4', '독사의 반지', 'ring', 4, [['dotdmg', 0.08]]], ['common_ring_5', '흡혈귀의 반지', 'ring', 5, [['drain', 0.012]]],
    ['common_necklace_4', '사슬의 목걸이', 'necklace', 4, [['ccdur', 0.06]]], ['common_necklace_5', '처형인의 목걸이', 'necklace', 5, [['vsbroken', 0.05]]],
    ['common_belt_4', '바람의 띠', 'belt', 4, [['dodge', 0.02], ['mspd', 0.02]]], ['common_belt_5', '가시 벨트', 'belt', 5, [['thorns', 0.04], ['hp_pct', 0.01]]],
  ];
  for (const [id, name, slot, line, main] of acc) if (!DB.items.some((it) => it.id === id)) DB.items.push({ id, name, slot, cls: 'common', line, main: main.map(([stat, base]) => ({ stat, base })), innate: null });
  const pas = [
    { key: 'nimble', name: '날랜 몸', min: 'R', kind: 'stat', stat: 'dodge', v: 0.03, text: '근접 평타 회피 +{v}' },
    { key: 'vampire', name: '피의 갈증', min: 'SR', kind: 'stat', stat: 'drain', v: 0.015, text: '피해 흡수 +{v}' },
  ];
  for (const x of pas) if (!DB.passives.some((p) => p.key === x.key)) DB.passives.push(x);
})();

// 장비 종류(EQUIP_DB 아이템 id) → 스킬
const GEAR_SKILLS = {
  tank_armor_1: 'tobi_s1', tank_armor_2: 'gs_tank_s1_b', tank_armor_3: 'gs_tank_s1_c',
  tank_weapon_1: 'tobi_s2', tank_weapon_2: 'gs_tank_s2_b', tank_weapon_3: 'gs_tank_s2_c',
  melee_armor_1: 'danbi_s1', melee_armor_2: 'gs_melee_s1_b', melee_armor_3: 'gs_melee_s1_c',
  melee_weapon_1: 'danbi_s2', melee_weapon_2: 'gs_melee_s2_b', melee_weapon_3: 'gs_melee_s2_c',
  ranged_armor_1: 'byeolbi_s1', ranged_armor_2: 'gs_ranged_s1_b', ranged_armor_3: 'gs_ranged_s1_c',
  ranged_weapon_1: 'byeolbi_s2', ranged_weapon_2: 'gs_ranged_s2_b', ranged_weapon_3: 'gs_ranged_s2_c',
  mage_armor_1: 'soldam_s1', mage_armor_2: 'gs_mage_s1_b', mage_armor_3: 'gs_mage_s1_c',
  mage_weapon_1: 'soldam_s2', mage_weapon_2: 'gs_mage_s2_b', mage_weapon_3: 'gs_mage_s2_c',
  support_armor_1: 'bori_s1', support_armor_2: 'gs_support_s1_b', support_armor_3: 'gs_support_s1_c',
  support_weapon_1: 'bori_s2', support_weapon_2: 'gs_support_s2_b', support_weapon_3: 'gs_support_s2_c',
  tank_armor_4: 'gs_tank_s1_d', tank_weapon_4: 'gs_tank_s2_d', melee_armor_4: 'gs_melee_s1_d', melee_weapon_4: 'gs_melee_s2_d',
  ranged_armor_4: 'gs_ranged_s1_d', ranged_weapon_4: 'gs_ranged_s2_d', mage_armor_4: 'gs_mage_s1_d', mage_weapon_4: 'gs_mage_s2_d',
  support_armor_4: 'gs_support_s1_d', support_weapon_4: 'gs_support_s2_d',
  rogue_armor_1: 'yeon_s1', rogue_armor_2: 'gs_rogue_s1_b', rogue_armor_3: 'gs_rogue_s1_c', rogue_armor_4: 'gs_rogue_s1_d',
  rogue_weapon_1: 'yeon_s2', rogue_weapon_2: 'gs_rogue_s2_b', rogue_weapon_3: 'gs_rogue_s2_c', rogue_weapon_4: 'gs_rogue_s2_d',
  monk_armor_1: 'mujin_s1', monk_armor_2: 'gs_monk_s1_b', monk_armor_3: 'gs_monk_s1_c', monk_armor_4: 'gs_monk_s1_d',
  monk_weapon_1: 'mujin_s2', monk_weapon_2: 'gs_monk_s2_b', monk_weapon_3: 'gs_monk_s2_c', monk_weapon_4: 'gs_monk_s2_d',
  warlock_armor_1: 'daon_s1', warlock_armor_2: 'gs_warlock_s1_b', warlock_armor_3: 'gs_warlock_s1_c', warlock_armor_4: 'gs_warlock_s1_d',
  warlock_weapon_1: 'daon_s2', warlock_weapon_2: 'gs_warlock_s2_b', warlock_weapon_3: 'gs_warlock_s2_c', warlock_weapon_4: 'gs_warlock_s2_d',
  demon_armor_1: 'seren_s1', demon_armor_2: 'gs_demon_s1_b', demon_armor_3: 'gs_demon_s1_c', demon_armor_4: 'gs_demon_s1_d', demon_armor_5: 'gs_demon_s1_e',
  demon_weapon_1: 'seren_s2', demon_weapon_2: 'gs_demon_s2_b', demon_weapon_3: 'gs_demon_s2_c', demon_weapon_4: 'gs_demon_s2_d', demon_weapon_5: 'gs_demon_s2_e',
  necro_armor_1: 'myoyeon_s1', necro_armor_2: 'gs_necro_s1_b', necro_armor_3: 'gs_necro_s1_c', necro_armor_4: 'gs_necro_s1_d',
  necro_weapon_1: 'myoyeon_s2', necro_weapon_2: 'gs_necro_s2_b', necro_weapon_3: 'gs_necro_s2_c', necro_weapon_4: 'gs_necro_s2_d',
  tank_armor_5: 'gs_tank_s1_e', tank_weapon_5: 'gs_tank_s2_e',
  melee_armor_5: 'gs_melee_s1_e', melee_weapon_5: 'gs_melee_s2_e',
  rogue_armor_5: 'gs_rogue_s1_e', rogue_weapon_5: 'gs_rogue_s2_e',
  monk_armor_5: 'gs_monk_s1_e', monk_weapon_5: 'gs_monk_s2_e',
  ranged_armor_5: 'gs_ranged_s1_e', ranged_weapon_5: 'gs_ranged_s2_e',
  mage_armor_5: 'gs_mage_s1_e', mage_weapon_5: 'gs_mage_s2_e',
  warlock_armor_5: 'gs_warlock_s1_e', warlock_weapon_5: 'gs_warlock_s2_e',
  necro_armor_5: 'gs_necro_s1_e', necro_weapon_5: 'gs_necro_s2_e',
  support_armor_5: 'gs_support_s1_e', support_weapon_5: 'gs_support_s2_e',
};
// 기본 스킬의 자동 전략도 같은 형식으로 (스킬을 다시 기본으로 바꿨을 때 되돌릴 값)
for (const id of ['tobi', 'danbi', 'yeon', 'mujin', 'byeolbi', 'soldam', 'daon', 'seren', 'myoyeon', 'bori']) for (const [slot, i] of [['s1', 0], ['s2', 1]]) {
  const sk = SKILLS[HEROES[id].skills[i]], p = AI_PRESETS[id][slot];
  if (!sk.ai) sk.ai = { cond: p.cond, target: p.target, param: p.param };
}
// 직업 → 슬롯별 스킬 목록 (도감·설명용)
function gearSkillPool(cls) {
  return { s1: [1, 2, 3, 4, 5].map((n) => GEAR_SKILLS[`${cls}_armor_${n}`]), s2: [1, 2, 3, 4, 5].map((n) => GEAR_SKILLS[`${cls}_weapon_${n}`]) };
}
