// ===== 09c_roster.js : 캐릭터 도감(보유·돌파·필살기 선택) + 소환(뽑기) 화면 =====

function ultChoiceLabel(choice) { return { A: '첫 번째', B: '두 번째', C: '세 번째' }[choice[0]] + (choice.length > 1 ? ' 변주' : ''); }
// 잠긴 이유: 레벨 · 돌파
function ultUnlockText(choice, cs) {
  const s = BREAKTHROUGH.steps.find((x) => x.unlock === choice), need = [];
  if ((cs.lv || 1) < CHAR_LV.ultUnlock[choice]) need.push(`Lv ${CHAR_LV.ultUnlock[choice]}`);
  if (s && cs.bt < s.bt) need.push(`${s.bt}돌파`);
  return need.length ? need.join(' + ') + ' 필요' : '';
}

// ---------------------------------------------------------------- 캐릭터 도감
function openRoster(opts) {
  opts = opts || {};
  const p = Game.profile;
  const st = { sel: opts.id || GACHA.ownedIds(p)[0] };
  const render = () => {
    const box = el('div', 'inv-box roster-box');
    const head = el('div', 'inv-head');
    head.appendChild(el('div', 'modal-title', '캐릭터'));
    head.appendChild(el('div', 'inv-res', `<span>보유 ${GACHA.ownedIds(p).length}/${CHARACTERS.length}</span><span>🎟 소환권 ${p.tickets}</span>`));
    head.appendChild(btn('닫기', 'ghost small', () => { Game.closeModal(); if (opts.onClose) opts.onClose(); }, { sfx: 'back', id: 'roster-close' }));
    box.appendChild(head);
    const body = el('div', 'roster-body');
    const grid = el('div', 'roster-grid');
    for (const id of HERO_ORDER) {
      const own = GACHA.owned(p, id), c = CHAR[id];
      const b = el('button', 'rg-card' + (own ? '' : ' locked') + (st.sel === id ? ' on' : '')); b.type = 'button'; b.id = 'rc-' + id;
      b.appendChild(portraitCanvas(HEROES[id].sprite, 52, { dead: !own }));
      b.appendChild(el('span', 'rg-name', c.name));
      if (own) b.appendChild(el('span', 'rg-lv', 'Lv ' + p.chars[id].lv));
      if (own && p.chars[id].bt) b.appendChild(el('span', 'rg-bt', '★' + p.chars[id].bt));
      const sh = GACHA.shards(p, id); if (sh) b.appendChild(el('span', 'rg-sh' + (GACHA.canUnlock(p, id) || GACHA.canBreak(p, id) ? ' ready' : ''), '◆' + sh));
      b.addEventListener('click', () => { Sfx.play('click'); st.sel = id; render(); });
      grid.appendChild(b);
    }
    body.appendChild(grid);
    body.appendChild(detail(st.sel));
    box.appendChild(body);
    Game.modal(box, { dim: true, cls: 'inv-modal' });
  };
  const detail = (id) => {
    const c = CHAR[id], d = HEROES[id], own = GACHA.owned(p, id), cs = own ? p.chars[id] : GACHA.newChar();
    const wrap = el('div', 'roster-detail');
    const top = el('div', 'rd-top');
    top.appendChild(portraitCanvas(d.sprite, 84, { dead: !own }));
    const stars = '★'.repeat(cs.bt) + '☆'.repeat(BREAKTHROUGH.max - cs.bt);
    top.appendChild(el('div', 'rd-txt', `<div class="rd-name">${c.name} <small>${d.roleName} · ${c.title}</small></div><div class="rd-bt">${own ? `Lv ${cs.lv}${cs.lv < CHAR_LV.max ? ` <span class="rd-exp"><i style="width:${Math.round(cs.exp / CHAR_LV.expNext(cs.lv) * 100)}%"></i></span> <small>${cs.exp}/${CHAR_LV.expNext(cs.lv)}</small>` : ' (최대)'} · 전투 Lv ${EQ.heroLevel(p, id)} · 돌파 ${stars}` : '<span class="muted">미보유 — 소환에서 얻을 수 있어요</span>'}</div><div class="rd-desc">${c.desc}</div><div class="rd-stat">HP ${d.hp} · 공격 ${d.atk} · 공격 간격 ${d.atkInterval}초 · 특성 「${TRAITS[c.trait].name}」 ${TRAITS[c.trait].desc}</div>`));
    wrap.appendChild(top);
    { // 영혼 조각: 모아서 합류 · 돌파
      const sh = GACHA.shards(p, id), need = own ? GACHA.btCost(p, id) : GACHA.SHARD.unlock;
      const row = el('div', 'rd-shard');
      row.appendChild(el('div', 'rd-sh-txt', need === null ? `<b>◆ 영혼 조각 ${sh}</b> <small>최대 돌파</small>` : `<b>◆ 영혼 조각 ${sh} / ${need}</b> <small>${own ? `${cs.bt + 1}돌파에 필요` : '모으면 합류'}</small><span class="rd-sh-bar"><i style="width:${Math.min(100, sh / need * 100)}%"></i></span>`));
      if (!own) { const b = btn('합류', 'small' + (GACHA.canUnlock(p, id) ? ' primary' : ''), () => { if (GACHA.unlock(p, id)) { Sfx.play('ult'); saveProfile(); if (Game.run) refreshRunLoadout(Game.run); Game.toast(`✨ ${c.name} 합류!`, 1600); render(); } else { Sfx.play('back'); Game.toast(`영혼 조각이 ${GACHA.SHARD.unlock}개 필요해요`, 1000); } }, { id: 'btn-unlock' }); row.appendChild(b); }
      else if (need !== null) { const b = btn(`돌파 ★${cs.bt + 1}`, 'small' + (GACHA.canBreak(p, id) ? ' primary' : ''), () => { const stp = GACHA.breakthrough(p, id); if (stp) { Sfx.play('ult'); saveProfile(); if (Game.run) refreshRunLoadout(Game.run); Game.toast(`★ ${c.name} ${stp.bt}돌파 — ${stp.text}`, 2000); render(); } else { Sfx.play('back'); Game.toast(`영혼 조각이 ${need}개 필요해요`, 1000); } }, { id: 'btn-bt' }); row.appendChild(b); }
      wrap.appendChild(row);
    }
    if (own) { const tp = talentPoints(p, id), ts = talentSpent(p, id); const tb = btn(`🌿 특성 <small>${ts}/${tp}</small>`, 'small' + (ts < tp ? ' primary' : ''), () => openTalents(id, () => openRoster(Object.assign({}, opts, { id }))), { id: 'btn-talent' }); wrap.appendChild(tb); }
    if (d.role === 'demon') { // 흑마술사: 상시 악마 고르기 (레벨로 해금)
      const cur = GACHA.petFor(p, id) || 'imp', pets = el('div', 'rd-pets');
      pets.appendChild(el('div', 'rd-pets-h', '<b>상시 악마</b> <small>전투 시작부터 함께 싸운다 · 레벨로 해금</small>'));
      for (const pt of DEMON_PETS) {
        const open = own && (cs.lv || 1) >= pt.lv, on = own && cur === pt.key;
        const b = el('button', 'rd-pet' + (open ? '' : ' locked') + (on ? ' on' : '')); b.type = 'button'; b.id = 'pet-' + pt.key;
        b.innerHTML = `<b>${pt.name}</b><small>${open ? (on ? '<span class="ok">함께하는 중</span>' : '') : '🔒 Lv ' + pt.lv}</small><span>${pt.desc}</span>`;
        b.addEventListener('click', () => { if (!open) { Sfx.play('back'); Game.toast(own ? `Lv ${pt.lv}에 해금` : '보유하지 않은 캐릭터예요', 900); return; } Sfx.play('click'); p.chars[id].pet = pt.key; saveProfile(); render(); });
        pets.appendChild(b);
      }
      wrap.appendChild(pets);
    }
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
    wrap.appendChild(list);
    // ①② = 장비가 정함 (직업 공통 스킬 풀)
    const pool = gearSkillPool(d.role), cur = own ? EQ.heroLoadout(p, id).skills : {};
    wrap.appendChild(el('div', 'rd-gear', ['s1', 's2'].map((slot) => `<div><b>${slot === 's1' ? '① 갑옷 스킬' : '② 무기 스킬'}</b> ${pool[slot].map((sid) => `<span class="${cur[slot] === sid ? 'ok' : 'muted'}" title="${SKILLS[sid].desc}">${SKILLS[sid].name}</span>`).join(' · ')}</div>`).join('')));
    wrap.appendChild(el('div', 'rd-steps', `<span class="muted">필살기 습득: 두 번째 Lv10 · 세 번째 Lv20 · 변주 Lv30/40/50(+돌파) · Lv60·70 숙련 +5%</span>` + BREAKTHROUGH.steps.map((s, i) => `<span class="${cs.bt >= s.bt ? 'ok' : 'muted'}">${s.bt}돌파 (◆${GACHA.SHARD.bt[i]}): ${s.text}</span>`).join('')));
    return wrap;
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

// ---------------------------------------------------------------- 특성 트리 창
function openTalents(id, onClose) {
  const p = Game.profile, tree = talentTree(id), st = talentState(p, id);
  const pts = talentPoints(p, id), spent = talentSpent(p, id);
  const box = el('div', 'inv-box talent-box');
  const head = el('div', 'inv-head');
  head.appendChild(el('div', 'modal-title', `${CHAR[id].name}의 특성 <small>${HEROES[id].roleName}</small>`));
  head.appendChild(el('div', 'inv-res', `<span>남은 점수 <b>${pts - spent}</b> / ${pts}</span><span class="muted">캐릭터 레벨 1당 1점</span>`));
  head.appendChild(btn('초기화', 'ghost small', () => { talentReset(p, id); saveProfile(); refreshRunLoadout(Game.run); openTalents(id, onClose); }, { id: 'talent-reset', sfx: 'back' }));
  head.appendChild(btn('닫기', 'small', () => { Game.closeModal(); if (onClose) onClose(); }, { id: 'talent-close', sfx: 'back' }));
  box.appendChild(head);
  const cols = el('div', 'talent-cols');
  for (const br of tree) {
    const col = el('div', 'talent-col');
    const bs = talentBranchSpent(p, id, br);
    col.appendChild(el('div', 'tc-head', `<b>${br.name}</b> <small>${br.desc} · ${bs}점</small>`));
    for (let tier = 0; tier < 4; tier++) {
      const row = el('div', 'tc-row' + (bs >= TALENT_TIER_NEED[tier] ? '' : ' locked'));
      row.appendChild(el('div', 'tc-need', tier ? `${TALENT_TIER_NEED[tier]}점` : ''));
      for (const n of br.nodes.filter((x) => x.tier === tier)) {
        const r = st[n.id] || 0, can = talentCanAdd(p, id, br, n);
        const b = el('button', 'tc-node' + (n.cap ? ' cap' : '') + (r ? ' on' : '') + (can ? ' can' : '')); b.type = 'button'; b.id = 'tn-' + n.id;
        const eff = n.cap ? n.desc : `${TALENT_STAT_NAME[n.stat] || n.stat} +${Math.round(n.v * 1000) / 10}%${n.stat === 'counter' || n.stat === 'thorns' ? '' : ''} / 랭크`;
        b.innerHTML = `<b>${n.name}</b><span class="tc-rank">${r}/${n.max}</span><small>${eff}</small>`;
        b.addEventListener('click', () => { if (talentAdd(p, id, br.key, n.id)) { Sfx.play('click'); saveProfile(); refreshRunLoadout(Game.run); openTalents(id, onClose); } else { Sfx.play('back'); Game.toast(talentSpent(p, id) >= pts ? '특성 점수가 없어요 (레벨을 올리면 생긴다)' : r >= n.max ? '이미 최대예요' : `이 단은 ${br.name}에 ${TALENT_TIER_NEED[n.tier]}점을 쓴 뒤 열려요`, 1100); } });
        row.appendChild(b);
      }
      col.appendChild(row);
    }
    cols.appendChild(col);
  }
  box.appendChild(cols);
  box.appendChild(el('div', 'muted', '두 갈래를 섞어 찍을 수 있다. 핵심 특성(4단)은 한 갈래에 18점을 쓰면 열린다. 효과는 장비처럼 바로 적용된다.'));
  const cur = Game.modalOpen && document.querySelector('.talent-box');
  if (cur) cur.replaceWith(box); else { Game.closeModal(); Game.modal(box, { dim: true, cls: 'inv-modal' }); }
}
