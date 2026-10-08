// ===== 04c_gacha.js : 캐릭터 보유·돌파·필살기 선택, 소환(뽑기) =====
// 데모: 현금 결제 없음. 소환권은 보스 격파 보상(5장). 확률은 15명 균등(1/15), 6번째 이후 중복은 강화석으로 전환.

const GACHA = {
  RATE_NOTE: '15명 모두 같은 확률 (각 6.7%)',
  BOSS_TICKETS: 5,          // 데모: 보스 격파 시 확정 지급
  START_TICKETS: 5,         // 데모: 첫 실행 지급
  OVERFLOW_STONES: 20,      // 최대 돌파 이후 중복 → 강화석

  // 프로필에 캐릭터 정보가 없으면 시작 캐릭터 5명 지급 (이전 저장 데이터 호환)
  ensure(p) {
    if (!p.chars) {
      p.chars = {};
      for (const c of CHARACTERS) if (c.starter) p.chars[c.id] = { bt: 0, ult: 'A' };
      p.tickets = (p.tickets || 0) + GACHA.START_TICKETS;
    }
    if (p.tickets === undefined) p.tickets = 0;
    for (const id of HERO_ORDER) if (!p.equip[id]) { p.equip[id] = {}; for (const s of EQ.SLOTS) p.equip[id][s] = null; }
    return p;
  },
  owned(p, id) { return !!(p.chars && p.chars[id]); },
  ownedIds(p) { return HERO_ORDER.filter((id) => GACHA.owned(p, id)); },
  // 전투에 쓸 필살기 정의 (선택한 필살기 + 돌파 위력 보너스)
  ultFor(p, id) {
    const st = (p.chars && p.chars[id]) || { bt: 0, ult: 'A' };
    const choice = ultChoices(id, st.bt).includes(st.ult) ? st.ult : 'A';
    return ultDefFor(id, choice, st.bt);
  },
  setUlt(p, id, choice) { const st = p.chars[id]; if (st && ultChoices(id, st.bt).includes(choice)) st.ult = choice; },
  // 소환 n회 (소환권 n장 소모). 결과: [{ id, isNew, bt, overflow }]
  pull(p, rng, n) {
    if ((p.tickets || 0) < n) return null;
    p.tickets -= n;
    const out = [];
    for (let i = 0; i < n; i++) {
      const c = CHARACTERS[Math.floor(rng() * CHARACTERS.length)];
      const st = p.chars[c.id];
      if (!st) { p.chars[c.id] = { bt: 0, ult: 'A' }; out.push({ id: c.id, isNew: true, bt: 0 }); }
      else if (st.bt < BREAKTHROUGH.max) { st.bt++; out.push({ id: c.id, isNew: false, bt: st.bt, step: BREAKTHROUGH.steps.find((s) => s.bt === st.bt) }); }
      else { p.stones += GACHA.OVERFLOW_STONES; out.push({ id: c.id, isNew: false, bt: st.bt, overflow: GACHA.OVERFLOW_STONES }); }
    }
    return out;
  },
};
