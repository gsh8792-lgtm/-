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
};
// 기본 스킬의 자동 전략도 같은 형식으로 (스킬을 다시 기본으로 바꿨을 때 되돌릴 값)
for (const id of ['tobi', 'danbi', 'yeon', 'byeolbi', 'soldam', 'bori']) for (const [slot, i] of [['s1', 0], ['s2', 1]]) {
  const sk = SKILLS[HEROES[id].skills[i]], p = AI_PRESETS[id][slot];
  if (!sk.ai) sk.ai = { cond: p.cond, target: p.target, param: p.param };
}
// 직업 → 슬롯별 스킬 목록 (도감·설명용)
function gearSkillPool(cls) {
  return { s1: [1, 2, 3, 4].map((n) => GEAR_SKILLS[`${cls}_armor_${n}`]), s2: [1, 2, 3, 4].map((n) => GEAR_SKILLS[`${cls}_weapon_${n}`]) };
}
