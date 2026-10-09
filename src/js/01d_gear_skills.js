// ===== 01d_gear_skills.js : 장비가 정하는 ①② 스킬 (갑옷 → ①, 무기 → ②) =====
// 직업마다 갑옷 3종 · 무기 3종 = 스킬 6종. 1번 계열은 직업 기본 스킬(장비가 없을 때도 이것).
// 원칙: 어떤 조합이든 그 직업의 그로기 역할은 남는다 (탱커 ② 기절 · 근딜/원딜 ① 끊기 ●● · 매지션 ② 범위 끊기 ● · 서포터 ① 공명).
// ai: 스킬을 바꿔 끼웠을 때 자동 전략이 따르는 기본값 { cond, target, param }
// 장비 등급 = 스킬 랭크 (위력·회복 +GEAR_SKILL_RANK × 등급 순서)

Object.assign(STATUS, {
  reflect: { name: '반격', short: '반', color: '#c8a070', desc: '받은 근접 평타 피해의 일부를 되돌린다.' },
});

const GEAR_SKILL_RANK = 0.05;

Object.assign(SKILLS, {
  // ---------------- 탱커 ① 갑옷 (도발 계열)
  gs_tank_s1_b: { name: '맹세의 외침', target: 'party', cd: 10, power: 0, shieldPct: 0.15, effects: [{ status: 'taunt', dur: 3, to: 'all_enemies' }, { status: 'guard', dur: 3, value: 0.15, to: 'self' }], fx: 'taunt', desc: '3초 도발 + 파티 전원에게 최대 HP 15% 보호막.', ai: { cond: 'saveForCharge', target: 'nearest' } },
  gs_tank_s1_c: { name: '가시 반격', target: 'self', cd: 9, power: 0, effects: [{ status: 'taunt', dur: 3, to: 'all_enemies' }, { status: 'guard', dur: 3, value: 0.1, to: 'self' }, { status: 'reflect', dur: 4, value: 0.6, to: 'self' }], fx: 'taunt', desc: '3초 도발. 4초간 받은 근접 평타 피해의 60%를 되돌린다.', ai: { cond: 'saveForCharge', target: 'nearest' } },
  // ---------------- 탱커 ② 무기 (기절 = 끊기 칸 전부)
  gs_tank_s2_b: { name: '돌진 베기', target: 'enemy', cd: 9, hint: 'enemyCharging', power: 1.7, effects: [{ status: 'stun', dur: 1.2 }], fx: 'bash', desc: '돌진해 강타. 1.2초 기절 (끊기 칸 전부).', ai: { cond: 'smartInterrupt', target: 'charging' } },
  gs_tank_s2_c: { name: '대지 강타', target: 'self_area', cd: 11, hint: 'enemyCharging', power: 1.0, areaR: 95, effects: [{ status: 'stun', dur: 1.5 }], fx: 'spin', desc: '주변 모든 적 1.5초 기절 (끊기 칸 전부).', ai: { cond: 'smartInterrupt', target: 'charging' } },
  // ---------------- 근딜 ① 갑옷 (끊기 ●●)
  gs_melee_s1_b: { name: '발목 베기', target: 'enemy', cd: 5, power: 1.2, interrupt: 2, interruptBack: 0.5, effects: [{ status: 'slow', dur: 3, value: 0.4 }], fx: 'slash', desc: '둔화. 쿨이 짧다. 끊기 ●● (정면 ●).', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_melee_s1_c: { name: '피의 일격', target: 'enemy', cd: 7, power: 2.1, interrupt: 2, interruptBack: 0.5, selfCost: 0.04, effects: [{ status: 'bleed', dur: 5, dps: 0.5 }], fx: 'slash', desc: '자기 HP 4%를 써서 강타 + 깊은 출혈. 끊기 ●● (정면 ●).', ai: { cond: 'smartInterrupt', target: 'focus' } },
  // ---------------- 근딜 ② 무기
  gs_melee_s2_b: { name: '파쇄 일격', target: 'enemy', cd: 10, power: 2.0, brokenMult: 1.6, effects: [], fx: 'slash', desc: '강타. 그로기 적에게 1.6배.', ai: { cond: 'breakWindow', target: 'focus' } },
  gs_melee_s2_c: { name: '그림자 연격', target: 'enemy', cd: 8, power: 0.75, hits: 3, effects: [{ status: 'vuln', dur: 3 }], fx: 'slash', desc: '3연타 + 취약.', ai: { cond: 'always', target: 'focus' } },
  // ---------------- 원딜 ① 갑옷 (끊기 ●●)
  gs_ranged_s1_b: { name: '견제 사격', target: 'enemy', cd: 5, power: 1.1, interrupt: 2, effects: [{ status: 'slow', dur: 3, value: 0.35 }], fx: 'pierce', desc: '둔화. 쿨이 짧다. 끊기 ●●.', ai: { cond: 'smartInterrupt', target: 'focus' } },
  gs_ranged_s1_c: { name: '표식 사격', target: 'enemy', cd: 8, power: 1.3, interrupt: 2, shakeExtend: 2, effects: [{ status: 'vuln', dur: 8 }], fx: 'pierce', desc: '8초 취약. 끊기 ●●, 흔들림 +2초.', ai: { cond: 'smartInterrupt', target: 'focus' } },
  // ---------------- 원딜 ② 무기
  gs_ranged_s2_b: { name: '연사', target: 'enemy', cd: 8, power: 0.5, hits: 4, effects: [], fx: 'pierce', desc: '빠른 4연사.', ai: { cond: 'always', target: 'focus' } },
  gs_ranged_s2_c: { name: '저격', target: 'enemy', cd: 12, power: 3.4, delay: 1.0, brokenMult: 1.3, effects: [], fx: 'snipe', desc: '1초 조준 후 강한 한 발. 그로기 적에게 1.3배.', ai: { cond: 'breakWindow', target: 'focus' } },
  // ---------------- 매지션 ① 갑옷
  gs_mage_s1_b: { name: '화염 파동', target: 'area_enemy', cd: 6, power: 1.2, areaR: 65, effects: [{ status: 'burn', dur: 4, dps: 0.3 }], fx: 'nova', desc: '작은 범위 화염 + 화상.', ai: { cond: 'always', target: 'nearest' } },
  gs_mage_s1_c: { name: '마나 보호막', target: 'ally', cd: 8, power: 0, shieldPct: 0.3, effects: [{ status: 'inspire', dur: 6, value: 0.35 }], fx: 'heal', desc: '아군 1명에게 최대 HP 30% 보호막 + 6초간 공격력 +35% (위급한 아군이 없으면 가장 센 동료에게).', ai: { cond: 'always', target: 'lowestAlly' } },
  // ---------------- 매지션 ② 무기 (범위 끊기 ●)
  gs_mage_s2_b: { name: '번개 사슬', target: 'multi_enemy', count: 3, cd: 9, hint: 'cluster', power: 1.0, interrupt: 1, effects: [], fx: 'starbolt', desc: '시전 중인 적부터 3명 연쇄. 맞은 적마다 끊기 ●.', ai: { cond: 'hint', target: 'nearest' } },
  gs_mage_s2_c: { name: '빙결 고리', target: 'area_enemy', cd: 12, hint: 'cluster', power: 0.8, areaR: 115, interrupt: 1, effects: [{ status: 'slow', dur: 4, value: 0.5 }], fx: 'nova', desc: '넓은 범위 둔화. 범위 안 모든 적 끊기 ●.', ai: { cond: 'hint', target: 'nearest' } },
  // ---------------- 서포터 ① 갑옷 (공명)
  gs_support_s1_b: { name: '수호의 기도', target: 'ally', cd: 6, power: 0, shieldPct: 0.26, effects: [{ status: 'resonance', dur: 5, value: 0.3 }], fx: 'heal', desc: '아군 1명 보호막(최대 HP 26%) + 5초간 그로기 피해 +30%.', ai: { cond: 'always', target: 'lowestAlly' } },
  gs_support_s1_c: { name: '재생의 축복', target: 'ally', cd: 6, heal: 0.8, effects: [{ status: 'regen', dur: 6, value: 0.03 }, { status: 'resonance', dur: 5, value: 0.3 }], fx: 'heal', desc: '아군 1명 회복 + 6초 재생 + 5초간 그로기 피해 +30%.', ai: { cond: 'always', target: 'lowestAlly' } },
  // ---------------- 서포터 ② 무기
  gs_support_s2_b: { name: '빛의 심판', target: 'enemy', cd: 8, power: 1.9, effects: [{ status: 'vuln', dur: 4 }], fx: 'starbolt', desc: '빛으로 공격 + 4초 취약.', ai: { cond: 'always', target: 'focus' } },
  gs_support_s2_c: { name: '정화의 빛', target: 'party', cd: 12, healPct: 0.08, cleanse: true, effects: [], fx: 'aoeheal', desc: '파티 전원 회복(최대 HP 8%) + 해로운 효과 해제.', ai: { cond: 'allyHpBelow', param: 70, target: 'lowestAlly' } },
});

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
};
// 기본 스킬의 자동 전략도 같은 형식으로 (스킬을 다시 기본으로 바꿨을 때 되돌릴 값)
for (const id of ['tobi', 'danbi', 'byeolbi', 'soldam', 'bori']) for (const [slot, i] of [['s1', 0], ['s2', 1]]) {
  const sk = SKILLS[HEROES[id].skills[i]], p = AI_PRESETS[id][slot];
  if (!sk.ai) sk.ai = { cond: p.cond, target: p.target, param: p.param };
}
// 직업 → 슬롯별 스킬 목록 (도감·설명용)
function gearSkillPool(cls) {
  return { s1: [1, 2, 3].map((n) => GEAR_SKILLS[`${cls}_armor_${n}`]), s2: [1, 2, 3].map((n) => GEAR_SKILLS[`${cls}_weapon_${n}`]) };
}
