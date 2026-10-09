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
  boss: { 5: [ [['shadow_king', 'goblin_stalker', 'goblin_archer']], [['swamp_turtle', 'cave_troll']], [['ogre_chief', 'orc_berserker']], [['mist_stag', 'goblin_stalker']], [['thorn_queen', 'orc_hunter']] ] },
};
const DUNGEON_SITES = {
  cave: { name: '고블린 굴', desc: '굴의 주인을 찾아 6층까지', enc: ENCOUNTERS, scale: { hp: 1, atk: 1 }, reward: 0, tint: null },
  mine: { name: '버려진 광산', desc: '적 체력 +25%·공격 +15% · 보스 호위 · 보상 +50%', enc: ENCOUNTERS_MINE, scale: { hp: 1.25, atk: 1.15 }, reward: 0.5, tint: 'rgba(130,75,20,0.22)', unlock: (p) => (p.ach && p.ach.c && p.ach.c.boss > 0) || Object.values(p.clears || {}).some((n) => n > 0) },
};
function siteOf(run) { return DUNGEON_SITES[(run && run.site) || 'cave'] || DUNGEON_SITES.cave; }
// 지금 원정의 조우표 (전역 Game이 없으면 고블린 굴 — 로직 검증용)
function siteEnc() { return (typeof Game !== 'undefined' && Game.run && siteOf(Game.run).enc) || ENCOUNTERS; }
function siteTint(ctx) { const s = typeof Game !== 'undefined' && Game.run && siteOf(Game.run); if (s && s.tint) { ctx.fillStyle = s.tint; ctx.fillRect(0, 0, CONST.VIEW_W, CONST.VIEW_H); } }
