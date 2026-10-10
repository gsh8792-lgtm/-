// ===== 08e_territory.js : 구역 확보 — 필드 지역의 거점을 빼앗아 영지로 (v0.56) =====
// 지역마다 거점 3곳. 거점의 적(정예 무리)을 쓰러뜨리면 우리 영지가 되고 시간이 지나며 자원을 만든다(마을 「🏰 영지」에서 수확).
// 한 지역의 거점 3곳을 모두 확보하면 그 지역 「확보」 — 수입 +50% · 지역 효과(아래).
// 원정을 마치고 돌아오면 가끔 거점 하나가 습격당한다 — 다시 지켜 내기 전까지 그 거점은 수입이 없다.

const TERRITORY = {
  posts: [{ fx: 0.27, y: 300, name: '망루' }, { fx: 0.5, y: 760, name: '야영지' }, { fx: 0.7, y: 300, name: '요새' }],
  // 거점 1곳의 시간당 수입 (지역 순서대로 많아진다)
  income: [{ gold: 30, stones: 1, shards: 0 }, { gold: 55, stones: 2, shards: 1 }, { gold: 90, stones: 3, shards: 2 }, { gold: 140, stones: 5, shards: 3 }],
  capHours: 12,         // 쌓이는 최대 시간
  invadeChance: 0.35,   // 원정을 마칠 때 확보한 거점 하나가 습격당할 확률
  zoneBonus: ['원정 골드 +10%', '강화석 수입 ×2', '영혼 조각 수입 ×2', '원정 경험치 +10%'],
  postHeal: 0.35,       // 우리 거점에 들르면 파티 HP 회복 (최대 HP 비율 · 거점마다 들어올 때 한 번)
};
function terrState(p) { p.territory = p.territory || { posts: {}, last: Date.now() }; p.territory.posts = p.territory.posts || {}; return p.territory; }
const postKey = (zoneKey, i) => `${zoneKey}:${i}`;
function postInfo(p, zoneKey, i) { return terrState(p).posts[postKey(zoneKey, i)] || null; } // { owned, contested }
function zoneSecured(p, zoneKey) { return TERRITORY.posts.every((_, i) => { const s = postInfo(p, zoneKey, i); return s && s.owned && !s.contested; }); }
function capturePost(p, zoneKey, i) {
  const T = terrState(p); terrCollect(p); // 수입 계산을 지금 시점으로 맞춘 뒤 바꾼다
  T.posts[postKey(zoneKey, i)] = { owned: true, contested: false, at: Date.now() };
  achAdd(p, 'posts');
}
// 시간당 수입 합계 (확보한 지역은 +50%, 습격당한 거점은 0)
function terrRate(p) {
  const out = { gold: 0, stones: 0, shards: 0 };
  WORLD.zones.forEach((z, zi) => {
    const sec = zoneSecured(p, z.key), inc = TERRITORY.income[zi];
    TERRITORY.posts.forEach((_, i) => {
      const s = postInfo(p, z.key, i); if (!s || !s.owned || s.contested) return;
      const m = sec ? 1.5 : 1;
      out.gold += inc.gold * m; out.stones += inc.stones * m * (sec && zi === 1 ? 2 : 1); out.shards += inc.shards * m * (sec && zi === 2 ? 2 : 1);
    });
  });
  return out;
}
// 지금까지 쌓인 수입 (최대 capHours)
function terrPending(p, now) {
  const T = terrState(p), h = Math.min(TERRITORY.capHours, Math.max(0, ((now || Date.now()) - (T.last || Date.now())) / 3600000)), r = terrRate(p);
  return { hours: h, gold: Math.floor(r.gold * h), stones: Math.floor(r.stones * h), shards: Math.floor(r.shards * h) };
}
// 수확: 골드·강화석은 바로, 영혼 조각은 보유 캐릭터에게 무작위로 나눠 준다
function terrCollect(p, now, rng) {
  const T = terrState(p), got = terrPending(p, now);
  p.gold += got.gold; p.stones += got.stones;
  if (got.shards > 0) { const ids = GACHA.ownedIds(p); const r = rng || Math.random; for (let i = 0; i < got.shards; i++) GACHA.addShards(p, ids[Math.floor(r() * ids.length)], 1); }
  T.last = now || Date.now();
  return got;
}
// 원정이 끝났을 때 (settleRun): 확보한 거점 하나가 습격당할 수 있다
function terrMaybeInvade(p, rng) {
  const T = terrState(p), owned = Object.keys(T.posts).filter((k) => T.posts[k].owned && !T.posts[k].contested);
  if (!owned.length || rng() >= TERRITORY.invadeChance) return null;
  terrCollect(p);
  const k = owned[Math.floor(rng() * owned.length)]; T.posts[k].contested = true;
  return k;
}
// 지역 효과: 확보한 지역 수만큼
function terrBonus(p) { return { gold: zoneSecured(p, 'outskirts') ? 0.1 : 0, exp: zoneSecured(p, 'ashland') ? 0.1 : 0 }; }
// 거점 전투 (정예 무리 + 거점 우두머리)
function postWaves(zi, i, rng) {
  const Z = WORLD.zones[zi], E = DUNGEON_SITES[Z.site].enc, st = Math.min(4, Z.stage + i);
  const el = E.elite[st] || E.elite[1];
  return el[Math.floor(rng() * el.length)].map((w) => w.slice());
}

// 마을 「🏰 영지」 창
function openTerritory(onClose) {
  const p = Game.profile, now = Date.now(), pend = terrPending(p, now), rate = terrRate(p);
  const box = el('div', 'inv-box terr-box');
  const head = el('div', 'inv-head');
  head.appendChild(el('div', 'modal-title', '🏰 영지 <small>필드 거점을 확보하면 자원이 쌓인다</small>'));
  head.appendChild(el('div', 'inv-res', `<span>시간당 ● ${Math.round(rate.gold)} · 💎 ${rate.stones.toFixed(1)} · ◆ ${rate.shards.toFixed(1)}</span>`));
  head.appendChild(btn(`수확 <small>● ${pend.gold} · 💎 ${pend.stones} · ◆ ${pend.shards}</small>`, 'primary small', () => { const g = terrCollect(p); saveProfile(); Sfx.play('coin'); Game.toast(`🏰 영지 수확: 골드 +${g.gold} · 강화석 +${g.stones} · 영혼 조각 +${g.shards}`, 2000); openTerritory(onClose); }, { id: 'terr-collect' }));
  head.appendChild(btn('닫기', 'small', () => { Game.closeModal(); if (onClose) onClose(); }, { id: 'terr-close', sfx: 'back' }));
  box.appendChild(head);
  const grid = el('div', 'terr-grid');
  WORLD.zones.forEach((z, zi) => {
    const sec = zoneSecured(p, z.key), card = el('div', 'terr-zone' + (sec ? ' secured' : ''));
    const inc = TERRITORY.income[zi];
    card.appendChild(el('div', 'tz-head', `<b>${z.name}</b> <small>${DUNGEON_SITES[z.site].name}</small>${sec ? '<span class="tz-tag">확보</span>' : ''}`));
    card.appendChild(el('div', 'tz-posts', TERRITORY.posts.map((pt, i) => { const s = postInfo(p, z.key, i); const st = !s || !s.owned ? 'enemy' : s.contested ? 'contested' : 'ours'; return `<span class="tz-post ${st}">${st === 'ours' ? '🚩' : st === 'contested' ? '🔥' : '⚔'} ${pt.name}<small>${st === 'ours' ? '우리 땅' : st === 'contested' ? '습격 중!' : '적 거점'}</small></span>`; }).join('')));
    card.appendChild(el('div', 'tz-inc', `거점마다 시간당 ● ${inc.gold} · 💎 ${inc.stones}${inc.shards ? ` · ◆ ${inc.shards}` : ''} · 모두 확보: +50% · ${TERRITORY.zoneBonus[zi]}`));
    grid.appendChild(card);
  });
  box.appendChild(grid);
  box.appendChild(el('div', 'muted', `수입은 최대 ${TERRITORY.capHours}시간까지 쌓인다. 원정을 마치고 돌아오면 가끔 거점이 습격당한다 — 필드에서 다시 지켜 내자.`));
  Game.closeModal(); Game.modal(box, { dim: true, cls: 'inv-modal' });
}
