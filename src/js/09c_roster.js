// ===== 09c_roster.js : 캐릭터 도감(보유·돌파·필살기 선택) + 소환(뽑기) 화면 =====

function ultChoiceLabel(choice) { return { A: '첫 번째', B: '두 번째', C: '세 번째' }[choice[0]] + (choice.length > 1 ? ' 변주' : ''); }
// 잠긴 이유: 레벨 · 돌파
function ultUnlockText(choice, cs) {
  const s = BREAKTHROUGH.steps.find((x) => x.unlock === choice), need = [];
  if ((cs.lv || 1) < CHAR_LV.ultUnlock[choice]) need.push(`Lv ${CHAR_LV.ultUnlock[choice]}`);
  if (s && cs.bt < s.bt) need.push(`${s.bt}돌파`);
  return need.length ? need.join(' + ') + ' 필요' : '';
}

// ---------------------------------------------------------------- 영웅 창 (v0.57: 목록 · 인물 카드 · 능력치/필살기/스킬/악마 탭)
const ROLE_ICON = { tank: '🛡', melee: '⚔', rogue: '🗡', monk: '👊', ranged: '🏹', mage: '🔥', warlock: '☠', demon: '👿', necro: '💀', support: '✚' };
const STAT_GROUPS = [
  ['공격', ['crit', 'critdmg', 'aspd', 'skilldmg', 's1pow', 's2pow', 'ultpow', 'ultgain', 'cdr', 'dotdmg', 'breakdmg', 'vsbroken', 'nonbroken', 'ambush', 'backstab', 'kipow', 'kimax', 'poisonstack', 'bloodlust']],
  ['방어', ['dr', 'dodge', 'counter', 'thorns', 'thornsAll', 'drain', 'ccdur', 'crushres', 'heal', 'mspd']],
  ['소환', ['minionhp', 'minionatk', 'miniondur', 'minioncap', 'minionboom', 'corpsepow', 'corpseextra', 'petcdr', 'curseSpread']],
];
function statLine(k, v) {
  const t = EQ.fmtStat(k, v);
  if (!t.startsWith(k)) return t;
  const n = (typeof TALENT_STAT_NAME !== 'undefined' && TALENT_STAT_NAME[k]) || k;
  return ['poisonstack', 'kimax', 'minioncap', 'corpseextra'].includes(k) ? `${n} +${v}` : `${n} ${v < 0 ? '-' : '+'}${Math.round(Math.abs(v) * 1000) / 10}%`;
}
// 스탯창: 장비 + 소울트리 + 기본 능력치
function heroStatSheet(id) {
  const p = Game.profile, d = HEROES[id], lo = EQ.heroLoadout(p, id), m = lo.mods;
  const atk = d.atk * (1 + (m.atk_pct || 0)) + (m.atk || 0), aps = 1 / (d.atkInterval / (1 + (m.aspd || 0)));
  const wrap = el('div', 'hs-sheet');
  wrap.appendChild(el('div', 'hs-main', `<div><small>최대 HP</small><b>${lo.maxHp}</b></div><div><small>공격력</small><b>${Math.round(atk)}</b></div><div><small>초당 공격</small><b>${aps.toFixed(2)}</b></div><div><small>방어</small><b>${Math.round((d.def || 0) * 100)}%</b></div><div><small>이동</small><b>${Math.round(d.moveSpeed * (1 + (m.mspd || 0)))}</b></div><div><small>사거리</small><b>${d.range === 'melee' ? '근접' : '원거리'}</b></div>`));
  const used = new Set(['atk', 'atk_pct', 'hp', 'hp_pct', 'passives']);
  const groups = STAT_GROUPS.map(([name, keys]) => { const ls = keys.filter((k) => m[k] && Math.abs(m[k]) > 1e-6).map((k) => { used.add(k); return statLine(k, m[k]); }); return [name, ls]; });
  const rest = Object.keys(m).filter((k) => !used.has(k) && typeof m[k] === 'number' && Math.abs(m[k]) > 1e-6).map((k) => statLine(k, m[k]));
  if (rest.length) groups.push(['기타', rest]);
  const psv = Object.keys(lo.mods.passives || {}).map((k) => (EQ.PASSIVE && EQ.PASSIVE[k] ? `「${EQ.PASSIVE[k].name}」` : `「${k}」`));
  if (psv.length) groups.push(['특수 효과', psv]);
  const cols = el('div', 'hs-groups'), shown = groups.filter(([, ls]) => ls.length);
  if (!shown.length) cols.appendChild(el('div', 'muted hs-none', '추가 능력치 없음 — 🎒 장비와 🔮 소울트리로 붙는다'));
  for (const [name, ls] of shown) cols.appendChild(el('div', 'hs-group', `<div class="hs-gh">${name}</div>${ls.length ? ls.map((x) => `<div>${x}</div>`).join('') : '<div class="muted">—</div>'}`));
  wrap.appendChild(cols);
  wrap.appendChild(el('div', 'hs-src muted', `장비 ${EQ.SLOTS.filter((s) => p.equip[id] && p.equip[id][s]).length}/${EQ.SLOTS.length}칸 · 소울트리 ${talentSpent(p, id)}점 · 전투 Lv ${EQ.heroLevel(p, id)}`));
  return wrap;
}
function openRoster(opts) {
  opts = opts || {};
  const p = Game.profile;
  const st = { sel: opts.id || openRoster.last || GACHA.ownedIds(p)[0], tab: opts.tab || openRoster.tab || 'stats', role: openRoster.role || 'all' };
  const render = () => {
    openRoster.last = st.sel; openRoster.tab = st.tab; openRoster.role = st.role;
    const box = el('div', 'inv-box hero-box');
    const head = el('div', 'inv-head');
    head.appendChild(el('div', 'fx-title', `영웅 <small>보유 ${GACHA.ownedIds(p).length}/${CHARACTERS.length} · 🎟 ${p.tickets}</small>`));
    head.appendChild(btn('닫기', 'ghost small', () => { Game.closeModal(); if (opts.onClose) opts.onClose(); }, { sfx: 'back', id: 'roster-close' }));
    box.appendChild(head);
    const body = el('div', 'hero-body');
    // 1) 목록: 직업 필터 + 카드
    const left = el('div', 'hero-list fx-panel');
    const roles = el('div', 'hl-roles');
    for (const r of ['all'].concat(SOUL_CLASSES)) { const b = el('button', 'hl-role' + (st.role === r ? ' on' : ''), r === 'all' ? '전체' : ROLE_ICON[r]); b.type = 'button'; b.id = 'hr-' + r; b.title = r; b.addEventListener('click', () => { Sfx.play('click'); st.role = r; render(); }); roles.appendChild(b); }
    left.appendChild(roles);
    const grid = el('div', 'roster-grid');
    for (const id of HERO_ORDER) {
      if (st.role !== 'all' && HEROES[id].role !== st.role) continue;
      const own = GACHA.owned(p, id), c = CHAR[id];
      const b = el('button', 'rg-card' + (own ? '' : ' locked') + (st.sel === id ? ' on' : '')); b.type = 'button'; b.id = 'rc-' + id;
      b.appendChild(portraitCanvas(HEROES[id].sprite, 46, { dead: !own }));
      b.appendChild(el('span', 'rg-name', c.name));
      if (own) b.appendChild(el('span', 'rg-lv', 'Lv ' + p.chars[id].lv));
      if (own && p.chars[id].bt) b.appendChild(el('span', 'rg-bt', '★' + p.chars[id].bt));
      const sh = GACHA.shards(p, id); if (sh) b.appendChild(el('span', 'rg-sh' + (GACHA.canUnlock(p, id) || GACHA.canBreak(p, id) ? ' ready' : ''), '◆' + sh));
      if (own && talentSpent(p, id) < talentPoints(p, id)) b.appendChild(el('span', 'rg-pt', '●'));
      b.addEventListener('click', () => { Sfx.play('click'); st.sel = id; render(); });
      grid.appendChild(b);
    }
    left.appendChild(grid);
    body.appendChild(left);
    // 2) 인물 카드 (양피지)
    body.appendChild(card(st.sel));
    // 3) 탭
    const right = el('div', 'hero-tabs');
    const tabs = el('div', 'fx-tabs');
    const list = [['stats', '능력치'], ['ult', '필살기'], ['skill', '스킬']].concat(HEROES[st.sel].role === 'demon' ? [['pet', '악마']] : []);
    if (!list.some((x) => x[0] === st.tab)) st.tab = 'stats';
    for (const [k, n] of list) { const t = el('button', 'fx-tab' + (st.tab === k ? ' on' : ''), n); t.type = 'button'; t.id = 'ht-' + k; t.addEventListener('click', () => { Sfx.play('click'); st.tab = k; render(); }); tabs.appendChild(t); }
    right.appendChild(tabs);
    const tb = el('div', 'fx-tabbody');
    tb.appendChild(st.tab === 'ult' ? ultTab(st.sel) : st.tab === 'skill' ? skillTab(st.sel) : st.tab === 'pet' ? petTab(st.sel) : (GACHA.owned(p, st.sel) ? heroStatSheet(st.sel) : el('div', 'muted hs-locked', '아직 합류하지 않은 영웅이에요. 영혼 조각을 모아 합류시키세요.')));
    right.appendChild(tb);
    body.appendChild(right);
    box.appendChild(body);
    const cur = Game.modalOpen && document.querySelector('.hero-box');
    if (cur) cur.replaceWith(box); else Game.modal(box, { dim: true, cls: 'inv-modal' });
  };
  const card = (id) => {
    const c = CHAR[id], d = HEROES[id], own = GACHA.owned(p, id), cs = own ? p.chars[id] : GACHA.newChar();
    const wrap = el('div', 'hero-card fx-parch');
    const pc = el('div', 'hc-portrait'); pc.appendChild(portraitCanvas(d.sprite, 104, { dead: !own })); pc.appendChild(el('span', 'hc-role', `${ROLE_ICON[d.role]} ${d.roleName}`)); wrap.appendChild(pc);
    const stars = '★'.repeat(cs.bt) + '☆'.repeat(BREAKTHROUGH.max - cs.bt);
    wrap.appendChild(el('div', 'hc-name', `<b>${c.name}</b><small>${c.title}</small>`));
    wrap.appendChild(el('div', 'hc-lv', own ? `Lv <b>${cs.lv}</b>${cs.lv < CHAR_LV.max ? `<span class="hc-exp"><i style="width:${Math.round(cs.exp / CHAR_LV.expNext(cs.lv) * 100)}%"></i></span>` : ' <small>MAX</small>'}<span class="hc-stars">${stars}</span>` : '<span class="muted">미보유</span>'));
    // 영혼 조각: 합류 · 돌파
    const sh = GACHA.shards(p, id), need = own ? GACHA.btCost(p, id) : GACHA.SHARD.unlock;
    const row = el('div', 'rd-shard');
    row.appendChild(el('div', 'rd-sh-txt', need === null ? `<b>◆ ${sh}</b> <small>최대 돌파</small>` : `<b>◆ ${sh} / ${need}</b> <small>${own ? `${cs.bt + 1}돌파` : '합류'}</small><span class="rd-sh-bar"><i style="width:${Math.min(100, sh / need * 100)}%"></i></span>`));
    if (!own) { const b = btn('합류', 'small' + (GACHA.canUnlock(p, id) ? ' primary' : ''), () => { if (GACHA.unlock(p, id)) { Sfx.play('ult'); saveProfile(); if (Game.run) refreshRunLoadout(Game.run); Game.toast(`✨ ${c.name} 합류!`, 1600); render(); } else { Sfx.play('back'); Game.toast(`영혼 조각이 ${GACHA.SHARD.unlock}개 필요해요`, 1200); } }, { id: 'btn-unlock' }); row.appendChild(b); }
    else if (need !== null) { const b = btn(`돌파 ★${cs.bt + 1}`, 'small' + (GACHA.canBreak(p, id) ? ' primary' : ''), () => { const stp = GACHA.breakthrough(p, id); if (stp) { Sfx.play('ult'); saveProfile(); if (Game.run) refreshRunLoadout(Game.run); Game.toast(`★ ${c.name} ${stp.bt}돌파 — ${stp.text}`, 2000); render(); } else { Sfx.play('back'); Game.toast(`영혼 조각이 ${need}개 필요해요`, 1200); } }, { id: 'btn-bt' }); row.appendChild(b); }
    wrap.appendChild(row);
    if (own) {
      const acts = el('div', 'hc-acts');
      const tp = talentPoints(p, id), ts = talentSpent(p, id);
      acts.appendChild(btn(`🔮 소울트리 <small>${ts}/${tp}</small>`, 'small' + (ts < tp ? ' primary' : ''), () => openSoulTree(id, () => openRoster(Object.assign({}, opts, { id }))), { id: 'btn-talent' }));
      acts.appendChild(btn('🎒 장비', 'small', () => openInventory({ hero: id, onClose: () => openRoster(Object.assign({}, opts, { id })) }), { id: 'btn-hero-gear' }));
      wrap.appendChild(acts);
    }
    return wrap;
  };
  const ultTab = (id) => {
    const own = GACHA.owned(p, id), cs = own ? p.chars[id] : GACHA.newChar();
    const list = el('div', 'rd-ults');
    const choices = ultChoices(id, cs.bt, cs.lv);
    for (const k of ['A', 'A2', 'B', 'B2', 'C', 'C2']) {
      const sk = ultDefFor(id, k, cs.bt, cs.lv), open = own && choices.includes(k), on = own && cs.ult === k;
      const b = el('button', 'rd-ult' + (open ? '' : ' locked') + (on ? ' on' : '') + (k.length > 1 ? ' var' : '')); b.type = 'button'; b.id = 'ult-' + k;
      b.innerHTML = `<b>${sk.name}${sk.boosted ? ` <span class="boost">+${Math.round(sk.boosted * 100)}%</span>` : ''}</b><small>${ultChoiceLabel(k)}${open ? '' : ' · 🔒 ' + (own ? ultUnlockText(k, cs) : '미보유')}${on ? ' · <span class="ok">장착 중</span>' : ''}</small><span>${sk.desc}</span>`;
      b.addEventListener('click', () => {
        if (!open) { Sfx.play('back'); Game.toast(own ? ultUnlockText(k, cs) : '보유하지 않은 캐릭터예요', 900); return; }
        Sfx.play('click'); GACHA.setUlt(p, id, k); saveProfile(); render();
      });
      list.appendChild(b);
    }
    const wrap = el('div', ''); wrap.appendChild(list);
    wrap.appendChild(el('div', 'rd-steps', `<span class="muted">습득: 두 번째 Lv10 · 세 번째 Lv20 · 변주 Lv30/40/50(+돌파) · Lv60·70 숙련 +5%</span>` + BREAKTHROUGH.steps.map((s, i) => `<span class="${cs.bt >= s.bt ? 'ok' : 'muted'}">${s.bt}돌파 (◆${GACHA.SHARD.bt[i]}): ${s.text}</span>`).join('')));
    return wrap;
  };
  const skillTab = (id) => {
    const d = HEROES[id], own = GACHA.owned(p, id), pool = gearSkillPool(d.role), lo = own ? EQ.heroLoadout(p, id) : null, cur = lo ? lo.skills : {};
    const wrap = el('div', 'hs-skills');
    for (const slot of ['s1', 's2']) {
      const sid = cur[slot] || d.skills[slot === 's1' ? 0 : 1], sk = SKILLS[sid];
      wrap.appendChild(el('div', 'hs-skill fx-panel', `<div class="hk-h"><span class="hk-slot">${slot === 's1' ? '①' : '②'}</span><b>${sk.name}</b><small>${slot === 's1' ? '갑옷이 정한다' : '무기가 정한다'} · 쿨 ${sk.cd}초${lo && lo.skillRank[slot] ? ` · 랭크 +${Math.round(lo.skillRank[slot] * GEAR_SKILL_RANK * 100)}%` : ''}</small></div><div class="hk-d">${sk.desc}</div><div class="hk-pool">${pool[slot].map((x) => `<span class="${x === sid ? 'on' : ''}" title="${SKILLS[x].desc}">${SKILLS[x].name}</span>`).join('')}</div>`));
    }
    const u = own ? GACHA.ultFor(p, id) : SKILLS[d.ult];
    if (u) wrap.appendChild(el('div', 'hs-skill fx-panel', `<div class="hk-h"><span class="hk-slot ult">③</span><b>${u.name}</b><small>필살기 · 「필살기」 탭에서 고른다</small></div><div class="hk-d">${u.desc}</div>`));
    return wrap;
  };
  const petTab = (id) => {
    const own = GACHA.owned(p, id), cs = own ? p.chars[id] : GACHA.newChar(), cur = GACHA.petFor(p, id) || 'imp', pets = el('div', 'rd-pets');
    pets.appendChild(el('div', 'rd-pets-h', '<b>상시 악마</b> <small>전투 시작부터 함께 싸운다 · 레벨로 해금</small>'));
    for (const pt of DEMON_PETS) {
      const open = own && (cs.lv || 1) >= pt.lv, on = own && cur === pt.key;
      const b = el('button', 'rd-pet' + (open ? '' : ' locked') + (on ? ' on' : '')); b.type = 'button'; b.id = 'pet-' + pt.key;
      b.innerHTML = `<b>${pt.name}</b><small>${open ? (on ? '<span class="ok">함께하는 중</span>' : '') : '🔒 Lv ' + pt.lv}</small><span>${pt.desc}</span>`;
      b.addEventListener('click', () => { if (!open) { Sfx.play('back'); Game.toast(own ? `Lv ${pt.lv}에 해금` : '보유하지 않은 캐릭터예요', 900); return; } Sfx.play('click'); p.chars[id].pet = pt.key; saveProfile(); render(); });
      pets.appendChild(b);
    }
    return pets;
  };
  render();
}

// ---------------------------------------------------------------- 소환
function openGacha(onClose) {
  const p = Game.profile;
  const rng = makeRng((Date.now() ^ 0x2f6b9a1d) >>> 0);
  let last = null;
  const render = () => {
    const box = el('div', 'gacha-box');
    const head = el('div', 'inv-head');
    head.appendChild(el('div', 'modal-title', '✨ 소환'));
    head.appendChild(el('div', 'inv-res', `<span>🎟 소환권 <b id="gacha-tickets">${p.tickets}</b></span><span class="muted">${GACHA.RATE_NOTE} · 조각 ${GACHA.SHARD.unlock}개로 합류 · 돌파 ${GACHA.SHARD.bt.join('/')}개</span>`));
    head.appendChild(btn('닫기', 'ghost small', () => { Game.closeModal(); if (onClose) onClose(); }, { sfx: 'back', id: 'gacha-close' }));
    box.appendChild(head);
    const res = el('div', 'gacha-results');
    if (!last) res.appendChild(el('div', 'muted gacha-empty', '보스를 쓰러뜨리면 소환권을 얻어요. 소환은 대부분 캐릭터의 영혼 조각을 줘요 — 조각을 모아 캐릭터 화면에서 합류·돌파해요.'));
    else last.forEach((r, i) => {
      const c = CHAR[r.id];
      const card = el('div', 'gr-card' + (r.isNew ? ' new' : r.kind === 'hero' ? ' hero' : r.big ? ' big' : ' shard'));
      card.style.animationDelay = (i * 0.12) + 's';
      card.appendChild(portraitCanvas(HEROES[r.id].sprite, 72, { dead: !GACHA.owned(p, r.id) }));
      card.appendChild(el('div', 'gr-txt', `<b>${c.name}</b><small>${HEROES[r.id].roleName} · ${c.title}</small>${r.isNew ? '<span class="gr-tag new">NEW! 합류</span>' : r.kind === 'hero' ? `<span class="gr-tag bt">영웅 · 조각 +${r.n}</span>` : `<span class="gr-tag${r.big ? ' bt' : ''}">◆ 영혼 조각 +${r.n}</span>`}<small>◆ ${GACHA.shards(p, r.id)}${GACHA.owned(p, r.id) ? (GACHA.btCost(p, r.id) !== null ? ' / ' + GACHA.btCost(p, r.id) : '') : ' / ' + GACHA.SHARD.unlock}</small>`));
      res.appendChild(card);
    });
    box.appendChild(res);
    const row = el('div', 'btn-row');
    const b1 = btn('1회 소환 <small>🎟 1</small>', 'primary', () => doPull(1), { id: 'gacha-1' });
    const b5 = btn('5회 소환 <small>🎟 5</small>', 'primary', () => doPull(5), { id: 'gacha-5' });
    b1.disabled = p.tickets < 1; b5.disabled = p.tickets < 5;
    row.appendChild(btn('캐릭터 보기', '', () => openRoster({ id: last && last[0] ? last[0].id : undefined, onClose: () => render() }), { id: 'gacha-roster' }));
    row.appendChild(b1); row.appendChild(b5);
    box.appendChild(row);
    Game.modal(box, { dim: true });
  };
  const doPull = (n) => {
    const r = GACHA.pull(p, rng, n);
    if (!r) { Game.toast('소환권이 부족해요'); return; }
    saveProfile();
    if (Game.run) refreshRunLoadout(Game.run);
    last = r;
    Sfx.play(r.some((x) => x.isNew) ? 'ult' : 'coin');
    render();
  };
  render();
}

// ---------------------------------------------------------------- 특성 → 소울트리 (v0.57)
function openTalents(id, onClose) { openSoulTree(id, onClose); }
