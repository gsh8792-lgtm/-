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
    wrap.appendChild(el('div', 'rd-steps', `<span class="muted">필살기 습득: 두 번째 Lv10 · 세 번째 Lv20 · 변주 Lv30/40/50(+돌파) · Lv60·70 숙련 +5%</span>` + BREAKTHROUGH.steps.map((s) => `<span class="${cs.bt >= s.bt ? 'ok' : 'muted'}">${s.bt}돌파: ${s.text}</span>`).join('')));
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
    head.appendChild(el('div', 'inv-res', `<span>🎟 소환권 <b id="gacha-tickets">${p.tickets}</b></span><span class="muted">${GACHA.RATE_NOTE} · 최대 돌파 이후 중복은 강화석 ${GACHA.OVERFLOW_STONES}개</span>`));
    head.appendChild(btn('닫기', 'ghost small', () => { Game.closeModal(); if (onClose) onClose(); }, { sfx: 'back', id: 'gacha-close' }));
    box.appendChild(head);
    const res = el('div', 'gacha-results');
    if (!last) res.appendChild(el('div', 'muted gacha-empty', '보스를 쓰러뜨리면 소환권을 얻어요. 이미 있는 캐릭터가 나오면 돌파해 필살기가 강해지고 변주가 열려요.'));
    else last.forEach((r, i) => {
      const c = CHAR[r.id];
      const card = el('div', 'gr-card' + (r.isNew ? ' new' : ''));
      card.style.animationDelay = (i * 0.12) + 's';
      card.appendChild(portraitCanvas(HEROES[r.id].sprite, 72));
      card.appendChild(el('div', 'gr-txt', `<b>${c.name}</b><small>${HEROES[r.id].roleName} · ${c.title}</small>${r.isNew ? '<span class="gr-tag new">NEW!</span>' : r.overflow ? `<span class="gr-tag">강화석 +${r.overflow}</span>` : `<span class="gr-tag bt">${r.bt}돌파</span><small>${r.step ? r.step.text : ''}</small>`}`));
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
