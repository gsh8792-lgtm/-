// ===== 04c_gacha.js : 캐릭터 보유·돌파·필살기 선택, 소환(뽑기) =====
// 데모: 현금 결제 없음. 소환권은 보스 격파 보상(5장). 소환은 영혼 조각 위주 — 조각으로 캐릭터를 부르고 돌파한다 (v0.54).

const GACHA = {
  RATE_NOTE: '영웅 4% · 영혼 조각 5개 20% · 2개 76% (캐릭터는 모두 같은 확률)',
  BOSS_TICKETS: 5,          // 데모: 보스 격파 시 확정 지급
  START_TICKETS: 5,         // 데모: 첫 실행 지급
  OVERFLOW_STONES: 20,      // 최대 돌파 이후 중복 → 강화석

  // 프로필에 캐릭터 정보가 없으면 시작 캐릭터 5명 지급 (이전 저장 데이터 호환)
  ensure(p) {
    if (!p.chars) {
      p.chars = {};
      for (const c of CHARACTERS) if (c.starter) p.chars[c.id] = GACHA.newChar();
      p.tickets = (p.tickets || 0) + GACHA.START_TICKETS;
    }
    if (p.tickets === undefined) p.tickets = 0;
    for (const c of CHARACTERS) if (c.gift && !p.chars[c.id]) p.chars[c.id] = GACHA.newChar(); // 선물 캐릭터 (새 버전에서 추가된 캐릭터를 바로 써 볼 수 있게)
    for (const id in p.chars) { const st = p.chars[id]; if (!st.lv) { st.lv = 1; st.exp = 0; } }
    for (const id of HERO_ORDER) if (!p.equip[id]) { p.equip[id] = {}; for (const s of EQ.SLOTS) p.equip[id][s] = null; }
    return p;
  },
  newChar() { return { bt: 0, ult: 'A', lv: 1, exp: 0 }; },
  // 흑마술사 악마: 고른 악마가 해금됐으면 그것, 아니면 해금된 가장 강한 악마
  petFor(p, id) { if (!HEROES[id] || HEROES[id].role !== 'demon') return null; const st = (p.chars && p.chars[id]) || {}; const open = demonPetsFor(st.lv || 1); return (open.find((x) => x.key === st.pet) || open[open.length - 1]).key; },
  level(p, id) { return (p.chars && p.chars[id] && p.chars[id].lv) || 1; },
  // 경험치 지급 → 오른 레벨 수와 새로 배운 필살기
  addExp(p, id, n) {
    const st = p.chars && p.chars[id]; if (!st) return null;
    const from = st.lv; st.exp += Math.round(n);
    while (st.lv < CHAR_LV.max && st.exp >= CHAR_LV.expNext(st.lv)) { st.exp -= CHAR_LV.expNext(st.lv); st.lv++; }
    if (st.lv >= CHAR_LV.max) st.exp = 0;
    const learned = Object.keys(CHAR_LV.ultUnlock).filter((k) => CHAR_LV.ultUnlock[k] > from && CHAR_LV.ultUnlock[k] <= st.lv && ultChoices(id, st.bt).includes(k));
    return { id, exp: Math.round(n), from, to: st.lv, learned };
  },
  owned(p, id) { return !!(p.chars && p.chars[id]); },
  ownedIds(p) { return HERO_ORDER.filter((id) => GACHA.owned(p, id)); },
  // 전투에 쓸 필살기 정의 (선택한 필살기 + 돌파 위력 보너스)
  ultFor(p, id) {
    const st = (p.chars && p.chars[id]) || GACHA.newChar();
    const choice = ultChoices(id, st.bt, st.lv || 1).includes(st.ult) ? st.ult : 'A';
    return ultDefFor(id, choice, st.bt, st.lv || 1);
  },
  setUlt(p, id, choice) { const st = p.chars[id]; if (st && ultChoices(id, st.bt, st.lv || 1).includes(choice)) st.ult = choice; },
  // ---------------- 영혼 조각 (v0.54): 소환은 대부분 '영혼 조각'을 준다. 조각을 모아 캐릭터를 부르고(40) 돌파한다(20·30·50·70·100)
  SHARD: { unlock: 40, bt: [20, 30, 50, 70, 100], heroRate: 0.04, bigRate: 0.2, big: 5, small: 2, dupHero: 25, boss: 3 },
  shards(p, id) { return (p.shards && p.shards[id]) || 0; },
  addShards(p, id, n) { p.shards = p.shards || {}; p.shards[id] = (p.shards[id] || 0) + n; },
  btCost(p, id) { const st = p.chars && p.chars[id]; return st && st.bt < BREAKTHROUGH.max ? GACHA.SHARD.bt[st.bt] : null; },
  canUnlock(p, id) { return !GACHA.owned(p, id) && GACHA.shards(p, id) >= GACHA.SHARD.unlock; },
  canBreak(p, id) { const c = GACHA.btCost(p, id); return c !== null && GACHA.shards(p, id) >= c; },
  unlock(p, id) { if (!GACHA.canUnlock(p, id)) return false; p.shards[id] -= GACHA.SHARD.unlock; p.chars[id] = GACHA.newChar(); return true; },
  breakthrough(p, id) { if (!GACHA.canBreak(p, id)) return null; const st = p.chars[id]; p.shards[id] -= GACHA.SHARD.bt[st.bt]; st.bt++; return BREAKTHROUGH.steps.find((s) => s.bt === st.bt); },
  // 소환 n회 (소환권 n장 소모). 결과: [{ id, kind: 'hero'|'shard', n, isNew }]
  // 4% 영웅(없으면 합류, 있으면 조각 25) · 20% 조각 5 · 76% 조각 2
  pull(p, rng, n) {
    if ((p.tickets || 0) < n) return null;
    p.tickets -= n;
    const out = [], S = GACHA.SHARD;
    for (let i = 0; i < n; i++) {
      const c = CHARACTERS[Math.floor(rng() * CHARACTERS.length)], v = rng();
      if (v < S.heroRate) {
        if (!p.chars[c.id]) { p.chars[c.id] = GACHA.newChar(); out.push({ id: c.id, kind: 'hero', isNew: true }); }
        else { GACHA.addShards(p, c.id, S.dupHero); out.push({ id: c.id, kind: 'hero', n: S.dupHero }); }
      } else { const k = v < S.heroRate + S.bigRate ? S.big : S.small; GACHA.addShards(p, c.id, k); out.push({ id: c.id, kind: 'shard', n: k, big: k === S.big }); }
    }
    return out;
  },
};
