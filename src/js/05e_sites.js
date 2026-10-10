// ===== 05e_sites.js : 던전 장소 — 고블린 굴 / 버려진 광산 =====
// 같은 층 생성기(05b)를 쓰고, 장소마다 조우표·적 배율·보상 배율·화면 색조가 다르다.
// 광산은 보스를 한 번 쓰러뜨리면 열린다. 선택은 profile.site → 입장 때 run.site.
const ENCOUNTERS_MINE = {
  // 오크·트롤 중심 + 후열 사냥꾼이 1층부터. "먼저 잡을 놈"이 둘씩.
  battle: {
    1: [ [['orc', 'goblin', 'goblin_archer'], ['orc_shield', 'goblin_shaman', 'goblin_stalker']], [['goblin_bomber', 'goblin_bomber', 'orc'], ['orc_hunter', 'goblin_archer', 'goblin']], [['orc', 'goblin_trapper', 'goblin'], ['cave_troll', 'goblin_shaman']] ],
    2: [ [['orc', 'orc_shield', 'goblin_archer'], ['orc_berserker', 'goblin_shaman', 'goblin_stalker']], [['cave_troll', 'goblin', 'goblin_archer'], ['orc_hunter', 'orc_shield', 'goblin_trapper']], [['goblin_bomber', 'goblin_bomber', 'goblin_bomber'], ['ogre', 'goblin_shaman', 'orc_hunter']] ],
    3: [ [['orc', 'orc', 'goblin_trapper'], ['cave_troll', 'goblin_shaman', 'goblin_stalker'], ['orc_berserker', 'orc_hunter']], [['orc_shield', 'orc_shield', 'goblin_archer'], ['ogre', 'goblin_stalker', 'goblin_stalker'], ['cave_troll', 'orc_hunter']] ],
    4: [ [['orc_shield', 'orc_berserker', 'goblin_archer'], ['cave_troll', 'cave_troll', 'goblin_shaman'], ['ogre', 'orc_hunter', 'goblin_stalker']], [['goblin_bomber', 'goblin_bomber', 'orc_berserker'], ['ogre', 'goblin_trapper', 'orc_hunter'], ['cave_troll', 'orc_shield', 'goblin_stalker']] ],
  },
  elite: {
    1: [ [['orc', 'goblin_stalker'], ['orc_captain', 'goblin_shaman', 'goblin']] ],
    2: [ [['cave_troll', 'goblin_archer'], ['orc_captain', 'orc_hunter', 'goblin_shaman']] ],
    3: [ [['orc_berserker', 'goblin_stalker', 'goblin_stalker'], ['orc_captain', 'cave_troll', 'goblin_shaman']] ],
    4: [ [['ogre', 'orc_hunter', 'goblin_trapper'], ['orc_captain', 'orc_berserker', 'goblin_shaman']] ],
  },
  small: {
    1: [['orc', 'goblin', 'goblin_archer'], ['goblin_stalker', 'goblin_stalker'], ['goblin_bomber', 'goblin_bomber']],
    2: [['orc_berserker', 'goblin'], ['cave_troll', 'goblin_archer'], ['orc_hunter', 'goblin_trapper', 'goblin']],
    3: [['orc_berserker', 'goblin_stalker', 'goblin'], ['cave_troll', 'goblin_shaman'], ['orc_shield', 'orc_hunter', 'goblin_trapper']],
    4: [['cave_troll', 'orc_berserker', 'goblin_stalker'], ['ogre', 'goblin_archer', 'goblin_archer'], ['orc_hunter', 'orc_hunter', 'orc_shield']],
  },
  boss: { 5: [ [['stone_golem', 'goblin_trapper', 'goblin_archer']], [['stone_golem', 'orc_shield']], [['shadow_king', 'goblin_stalker', 'goblin_archer']], [['swamp_turtle', 'cave_troll']], [['ogre_chief', 'orc_berserker']], [['mist_stag', 'goblin_stalker']], [['thorn_queen', 'orc_hunter']] ] },
};
// v0.55 저주받은 묘지 (언데드): 사냥꾼(망령) · 호출(리치 수련생) · 중독(구울) · 정예 뼈 거인
const ENCOUNTERS_CRYPT = {
  battle: {
    1: [ [['skel_warrior', 'skel_archer', 'crypt_ghoul'], ['skel_warrior', 'lich_acolyte', 'wraith']], [['crypt_ghoul', 'crypt_ghoul', 'skel_archer'], ['skel_warrior', 'skel_warrior', 'lich_acolyte']] ],
    2: [ [['skel_warrior', 'skel_archer', 'skel_archer'], ['wraith', 'lich_acolyte', 'crypt_ghoul']], [['crypt_ghoul', 'crypt_ghoul', 'wraith'], ['bone_giant', 'skel_archer']] ],
    3: [ [['skel_warrior', 'crypt_ghoul', 'skel_archer'], ['wraith', 'wraith', 'lich_acolyte'], ['bone_giant', 'skel_archer']], [['crypt_ghoul', 'crypt_ghoul', 'crypt_ghoul'], ['skel_warrior', 'lich_acolyte', 'wraith'], ['bone_giant', 'skel_warrior']] ],
    4: [ [['skel_warrior', 'skel_warrior', 'skel_archer'], ['bone_giant', 'wraith', 'lich_acolyte'], ['bone_giant', 'crypt_ghoul', 'wraith']], [['crypt_ghoul', 'crypt_ghoul', 'skel_archer'], ['wraith', 'wraith', 'lich_acolyte'], ['bone_giant', 'bone_giant']] ],
  },
  elite: {
    1: [ [['skel_warrior', 'crypt_ghoul'], ['bone_giant', 'skel_archer']] ], 2: [ [['wraith', 'skel_archer'], ['bone_giant', 'lich_acolyte', 'skel_warrior']] ],
    3: [ [['crypt_ghoul', 'crypt_ghoul', 'wraith'], ['bone_giant', 'lich_acolyte', 'skel_archer']] ], 4: [ [['bone_giant', 'wraith'], ['bone_giant', 'lich_acolyte', 'wraith']] ],
  },
  small: { 1: [['skel_warrior', 'skel_archer'], ['crypt_ghoul', 'crypt_ghoul'], ['wraith', 'skel_warrior']], 2: [['skel_warrior', 'skel_archer', 'crypt_ghoul'], ['wraith', 'lich_acolyte']], 3: [['bone_giant', 'skel_archer'], ['wraith', 'wraith', 'crypt_ghoul']], 4: [['bone_giant', 'wraith', 'skel_archer'], ['crypt_ghoul', 'crypt_ghoul', 'lich_acolyte']] },
  boss: { 5: [ [['lich_king', 'skel_archer', 'wraith']], [['lich_king', 'skel_warrior', 'skel_warrior']], [['mist_stag', 'wraith', 'skel_archer']] ] },
};
// v0.55 심연의 요새 (악마): 화상·약화 · 도약 사냥개 · 임프 호출 · 정예 파멸 군주
const ENCOUNTERS_ABYSS = {
  battle: {
    1: [ [['fiend_imp', 'fiend_imp', 'hellhound'], ['felguard', 'demon_caller', 'temptress']], [['hellhound', 'hellhound', 'fiend_imp'], ['felguard', 'fiend_imp', 'demon_caller']] ],
    2: [ [['felguard', 'fiend_imp', 'temptress'], ['hellhound', 'hellhound', 'demon_caller']], [['fiend_imp', 'fiend_imp', 'fiend_imp'], ['felguard', 'temptress', 'temptress']] ],
    3: [ [['felguard', 'hellhound', 'fiend_imp'], ['temptress', 'demon_caller', 'fiend_imp'], ['doom_lord', 'hellhound']], [['hellhound', 'hellhound', 'hellhound'], ['felguard', 'felguard', 'demon_caller'], ['doom_lord', 'temptress']] ],
    4: [ [['felguard', 'felguard', 'fiend_imp'], ['doom_lord', 'temptress', 'demon_caller'], ['doom_lord', 'hellhound', 'hellhound']], [['fiend_imp', 'fiend_imp', 'temptress'], ['felguard', 'hellhound', 'demon_caller'], ['doom_lord', 'doom_lord']] ],
  },
  elite: {
    1: [ [['hellhound', 'fiend_imp'], ['doom_lord', 'demon_caller']] ], 2: [ [['felguard', 'temptress'], ['doom_lord', 'fiend_imp', 'fiend_imp']] ],
    3: [ [['hellhound', 'hellhound', 'temptress'], ['doom_lord', 'felguard', 'demon_caller']] ], 4: [ [['doom_lord', 'hellhound'], ['doom_lord', 'felguard', 'temptress']] ],
  },
  small: { 1: [['fiend_imp', 'fiend_imp', 'hellhound'], ['felguard', 'fiend_imp']], 2: [['hellhound', 'temptress', 'fiend_imp'], ['felguard', 'demon_caller']], 3: [['doom_lord', 'fiend_imp'], ['hellhound', 'hellhound', 'temptress']], 4: [['doom_lord', 'hellhound', 'fiend_imp'], ['felguard', 'felguard', 'demon_caller']] },
  boss: { 5: [ [['pit_lord', 'fiend_imp', 'fiend_imp']], [['pit_lord', 'hellhound']], [['swamp_turtle', 'felguard', 'fiend_imp']] ] },
};
// 고블린 굴은 튜토리얼: 적이 약하고 보스는 오우거 대족장만
const ENCOUNTERS_CAVE = Object.assign({}, ENCOUNTERS, { boss: { 5: [ [['ogre_chief']] ] } });
const siteCleared = (p, k) => !!(p.ach && p.ach.c && p.ach.c['site_' + k] > 0);
const DUNGEON_SITES = {
  cave: { name: '고블린 굴', desc: '튜토리얼 — 적이 약하다 · 보스 오우거 대족장', enc: ENCOUNTERS_CAVE, scale: { hp: 0.45, atk: 0.5 }, reward: 0, tint: null, rank: 1 },
  mine: { name: '버려진 광산', desc: '적 체력 ×1.35 · 공격 ×1.25 · 보스 호위 · 보상 +50%', enc: ENCOUNTERS_MINE, scale: { hp: 1.35, atk: 1.25 }, reward: 0.5, tint: 'rgba(130,75,20,0.22)', rank: 2,
    unlock: (p) => siteCleared(p, 'cave') || (p.ach && p.ach.c && p.ach.c.boss > 0) || Object.values(p.clears || {}).some((n) => n > 0), lockText: '고블린 굴 보스를 쓰러뜨리면 열린다' },
  crypt: { name: '저주받은 묘지', desc: '언데드 · 적 체력 ×2.0 · 공격 ×1.55 · 보상 +100%', enc: ENCOUNTERS_CRYPT, scale: { hp: 2.0, atk: 1.55 }, reward: 1.0, tint: 'rgba(40,70,110,0.28)', rank: 3,
    unlock: (p) => siteCleared(p, 'mine') || !!(p.ach && p.ach.c && p.ach.c.mine > 0), lockText: '버려진 광산 보스를 쓰러뜨리면 열린다' },
  abyss: { name: '심연의 요새', desc: '악마 · 적 체력 ×3.0 · 공격 ×2.1 · 보상 +200%', enc: ENCOUNTERS_ABYSS, scale: { hp: 3.0, atk: 2.1 }, reward: 2.0, tint: 'rgba(140,30,20,0.26)', rank: 4,
    unlock: (p) => siteCleared(p, 'crypt'), lockText: '저주받은 묘지 보스를 쓰러뜨리면 열린다' },
};
function siteOf(run) { return DUNGEON_SITES[(run && run.site) || 'cave'] || DUNGEON_SITES.cave; }
// 지금 원정의 조우표 (전역 Game이 없으면 고블린 굴 — 로직 검증용)
function siteEnc() { return (typeof Game !== 'undefined' && Game.run && siteOf(Game.run).enc) || ENCOUNTERS; }
function siteTint(ctx) { const s = typeof Game !== 'undefined' && Game.run && siteOf(Game.run); if (s && s.tint) { ctx.fillStyle = s.tint; ctx.fillRect(0, 0, CONST.VIEW_W, CONST.VIEW_H); } }
