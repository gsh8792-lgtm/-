// ===== 09b_inventory.js : 장비창(보관함), 대장간(강화), 아이템 아이콘, 전투 보상·정산 =====

// ---------------------------------------------------------------- 프로필 접근
function profile() { return Game.profile; }
function saveProfile() { EQ.saveProfile(Game.profile); }

// 원정 중 영웅 최대 HP를 장비에 맞춰 다시 계산 (HP 비율 유지, 던전 입장 전이면 가득)
function refreshRunLoadout(run) {
  if (!run) return;
  const fresh = run.path.length === 0;
  for (const id of HERO_ORDER) {
    const h = run.heroes[id];
    const lo = EQ.heroLoadout(Game.profile, id);
    const ratio = h.maxHp ? h.hp / h.maxHp : 1;
    h.maxHp = lo.maxHp;
    h.hp = h.dead ? 0 : fresh ? lo.maxHp : Math.max(1, Math.round(lo.maxHp * ratio));
  }
}

// 장비 외형(무기 발광·갑옷 오라)은 캐릭터 에셋 확정 후 구현 — 구상은 docs/GAME_DESIGN.md 3-3

// ---------------------------------------------------------------- 아이템 아이콘 (코드 드로잉, 임시 에셋)
const WEAPON_SHAPE = { tank: 'mace', melee: 'sword', ranged: 'bow', mage: 'staff', support: 'holy' };
function drawItemIcon(ctx, item, s) {
  const base = EQ.BASE[item.base], g = EQ.G[item.grade];
  const col = g.color;
  ctx.clearRect(0, 0, s, s);
  const bg = ctx.createRadialGradient(s / 2, s * 0.42, s * 0.05, s / 2, s / 2, s * 0.7);
  bg.addColorStop(0, col); bg.addColorStop(0.55, 'rgba(40,30,55,0.95)'); bg.addColorStop(1, '#1a1424');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, s, s);
  ctx.save();
  ctx.translate(s / 2, s / 2); ctx.scale(s / 64, s / 64);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const metal = '#d8dde6', dark = '#3a2e44', wood = '#8a5a34', gold = '#f0c860';
  const stroke = (c, w) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke(); };
  const fill = (c) => { ctx.fillStyle = c; ctx.fill(); };
  const slot = base.slot;
  if (slot === 'weapon') {
    const shape = WEAPON_SHAPE[base.cls];
    ctx.rotate(-Math.PI / 4);
    if (shape === 'sword') {
      ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(5, -20); ctx.lineTo(5, 10); ctx.lineTo(-5, 10); ctx.lineTo(-5, -20); ctx.closePath(); fill(metal); stroke(dark, 2);
      ctx.beginPath(); ctx.rect(-12, 10, 24, 4); fill(gold); stroke(dark, 1.5);
      ctx.beginPath(); ctx.rect(-2.5, 14, 5, 12); fill(wood);
    } else if (shape === 'mace') {
      ctx.beginPath(); ctx.rect(-2.5, -6, 5, 32); fill(wood); stroke(dark, 1.5);
      ctx.beginPath(); ctx.arc(0, -14, 11, 0, Math.PI * 2); fill(metal); stroke(dark, 2);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 10, -14 + Math.sin(a) * 10); ctx.lineTo(Math.cos(a) * 16, -14 + Math.sin(a) * 16); stroke(metal, 4); }
    } else if (shape === 'bow') {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath(); ctx.arc(-6, 0, 24, -1.2, 1.2); stroke(wood, 5);
      ctx.beginPath(); ctx.moveTo(-6 + Math.cos(-1.2) * 24, Math.sin(-1.2) * 24); ctx.lineTo(-6 + Math.cos(1.2) * 24, Math.sin(1.2) * 24); stroke('#eee', 1.2);
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(18, 0); stroke(metal, 2); ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(12, -4); ctx.lineTo(12, 4); ctx.closePath(); fill(metal);
    } else {
      ctx.beginPath(); ctx.rect(-2.5, -14, 5, 40); fill(wood); stroke(dark, 1.5);
      if (shape === 'holy') { ctx.beginPath(); ctx.arc(0, -20, 9, 0, Math.PI * 2); stroke(gold, 4); ctx.beginPath(); ctx.arc(0, -20, 4.5, 0, Math.PI * 2); fill('#9fe0ff'); }
      else { ctx.beginPath(); ctx.arc(0, -20, 8, 0, Math.PI * 2); fill('#b48cff'); stroke(dark, 2); ctx.beginPath(); ctx.arc(-2.5, -22.5, 2.5, 0, Math.PI * 2); fill('rgba(255,255,255,0.8)'); }
    }
  } else if (slot === 'armor') {
    ctx.beginPath(); ctx.moveTo(-18, -18); ctx.lineTo(-8, -22); ctx.quadraticCurveTo(0, -14, 8, -22); ctx.lineTo(18, -18); ctx.lineTo(22, -2); ctx.lineTo(14, 0); ctx.lineTo(14, 22); ctx.lineTo(-14, 22); ctx.lineTo(-14, 0); ctx.lineTo(-22, -2); ctx.closePath();
    fill(base.cls === 'support' || base.cls === 'mage' ? '#7e6ab0' : base.cls === 'ranged' ? '#6a8a4a' : metal); stroke(dark, 2);
    ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, 22); stroke('rgba(0,0,0,0.25)', 2);
    ctx.beginPath(); ctx.rect(-14, 8, 28, 4); fill(wood);
  } else if (slot === 'medal') {
    ctx.beginPath(); ctx.moveTo(-10, -26); ctx.lineTo(-2, -4); ctx.lineTo(2, -4); ctx.lineTo(10, -26); fill('#c84a5a');
    ctx.beginPath(); ctx.arc(0, 8, 15, 0, Math.PI * 2); fill(gold); stroke(dark, 2);
    ctx.beginPath(); ctx.arc(0, 8, 9, 0, Math.PI * 2); fill(col); stroke('rgba(0,0,0,0.3)', 1.5);
  } else if (slot === 'ring') {
    ctx.beginPath(); ctx.ellipse(0, 6, 16, 14, 0, 0, Math.PI * 2); stroke(gold, 6); stroke(dark, 1);
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(8, -10); ctx.lineTo(0, -2); ctx.lineTo(-8, -10); ctx.closePath(); fill('#9fe0ff'); stroke(dark, 1.5);
  } else if (slot === 'necklace') {
    ctx.beginPath(); ctx.arc(0, -10, 20, 0.15 * Math.PI, 0.85 * Math.PI); stroke(gold, 3);
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(9, 16); ctx.lineTo(0, 28); ctx.lineTo(-9, 16); ctx.closePath(); fill('#ff7aa0'); stroke(dark, 1.5);
  } else if (slot === 'belt') {
    ctx.beginPath(); ctx.rect(-26, -6, 52, 14); fill(wood); stroke(dark, 2);
    ctx.beginPath(); ctx.rect(-9, -9, 18, 20); stroke(gold, 4);
  }
  ctx.restore();
  ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, s / 24); ctx.strokeRect(1, 1, s - 2, s - 2);
}
function itemIcon(item, size) {
  const wrap = el('div', `ic gl-${item.grade}`);
  wrap.style.setProperty('--glow', (0.3 + item.enh / 15 * 0.7).toFixed(2));
  const c = el('canvas'); c.width = size * 2; c.height = size * 2; c.style.width = size + 'px'; c.style.height = size + 'px';
  drawItemIcon(c.getContext('2d'), item, size * 2);
  wrap.appendChild(c);
  if (item.enh) wrap.appendChild(el('span', 'ic-enh', '+' + item.enh));
  wrap.appendChild(el('span', 'ic-grade', item.grade));
  return wrap;
}
function gemBadge(gem) { return `<span class="gem-badge" style="background:${EQ.GEM[gem.key].color}">${EQ.GEM[gem.key].name} <small>${gem.grade}</small></span>`; }

// ---------------------------------------------------------------- 아이템 상세 HTML
function itemDetailHtml(item, heroId) {
  const p = profile(), base = EQ.BASE[item.base];
  const cls = base.cls === 'common' ? '공통' : (EQ.DB.classes.find((c) => c.key === base.cls) || {}).name;
  const lines = [];
  lines.push(`<div class="id-name g-${item.grade}">${EQ.itemName(item)}</div>`);
  lines.push(`<div class="id-sub">${EQ.G[item.grade].name} · ${EQ.SLOT_NAME[base.slot]} · ${cls}${item.enh || EQ.enhanceCap(item) ? ` · 강화 ${item.enh}/${EQ.enhanceCap(item)}` : ''}</div>`);
  const sec = (title, arr) => { if (arr.length) lines.push(`<div class="id-sec"><b>${title}</b>${arr.map((x) => `<div>${x}</div>`).join('')}</div>`); };
  sec('주 스탯', EQ.mainStats(item).map((m) => EQ.fmtStat(m.stat, m.v)));
  if (base.slot === 'armor' || base.slot === 'weapon') sec(base.slot === 'armor' ? '① 스킬 (갑옷)' : '② 스킬 (무기)', [skillOf(item)]);
  if (item.passive) sec('패시브', [`<span class="psv g-${item.passive.grade}">「${EQ.PASSIVE[item.passive.key].name}」 ${item.passive.grade}</span> ${EQ.passiveText(item.passive)}`]);
  sec('추가 옵션', item.opts.map((o) => EQ.fmtStat(o.stat, o.v)));
  const extra = [];
  if (item.cls) {
    const ck = base.cls !== 'common' ? base.cls : heroId ? EQ.heroClass(heroId) : null;
    if (ck) { const cs = EQ.DB.classStat[ck]; extra.push('특성: ' + EQ.fmtStat(cs.stat, cs[item.grade])); } else extra.push('특성 스탯 (착용자 직업 기준)');
  }
  for (const b of item.sb) extra.push(EQ.fmtStat(b.key, b.v));
  sec('L·E 효과', extra);
  if (item.gems.length) sec('보석', item.gems.map((gu, i) => { const g = gu && EQ.findGem(p, gu); return g ? `${i + 1}. ${gemBadge(g)} ${EQ.gemEffects(g).map((e) => EQ.fmtStat(e.stat, e.v)).join(', ')}` : `${i + 1}. <span class="muted">빈 슬롯</span>`; }));
  return lines.join('');
}
function skillOf(item) {
  const sk = SKILLS[GEAR_SKILLS[item.base]];
  const rank = EQ.G[item.grade].idx;
  return `<b>${sk.name}</b> <small class="muted">랭크 ${item.grade}${rank ? ` · 위력·회복 +${Math.round(rank * GEAR_SKILL_RANK * 100)}%` : ''} · 쿨 ${sk.cd}초</small><br><small>${sk.desc}</small>`;
}
// 영웅이 지금 쓰는 스킬 (갑옷 → ①, 무기 → ②, 필살기 = 고른 것)
function heroSkill(id, slot) {
  if (slot === 'ult') return GACHA.ultFor(Game.profile, id);
  return SKILLS[EQ.heroLoadout(Game.profile, id).skills[slot]];
}

// ---------------------------------------------------------------- 장비창
function openInventory(opts) {
  opts = opts || {};
  const st = { hero: opts.hero || (Game.run ? partyIds(Game.run)[0] : HERO_ORDER[0]), slot: null, sel: null };
  const render = () => {
    const p = profile();
    const box = el('div', 'inv-box');
    // 머리
    const head = el('div', 'inv-head');
    head.appendChild(el('div', 'modal-title', '장비'));
    head.appendChild(el('div', 'inv-res', `<span>● ${p.gold}</span><span>💎 강화석 ${p.stones}</span><span>가방 ${p.inv.length}</span>`));
    head.appendChild(btn('닫기', 'ghost small', () => { Game.closeModal(); refreshRunLoadout(Game.run); if (opts.onClose) opts.onClose(); }, { sfx: 'back', id: 'inv-close' }));
    box.appendChild(head);
    const body = el('div', 'inv-body');
    // 영웅 탭
    const tabs = el('div', 'inv-tabs');
    for (const id of GACHA.ownedIds(profile())) {
      const t = el('button', 'inv-tab' + (id === st.hero ? ' on' : '')); t.type = 'button'; t.id = 'inv-hero-' + id;
      t.appendChild(portraitCanvas(HEROES[id].sprite, 40));
      t.appendChild(el('span', '', HEROES[id].name));
      t.addEventListener('click', () => { Sfx.play('click'); st.hero = id; st.sel = null; render(); });
      tabs.appendChild(t);
    }
    body.appendChild(tabs);
    // 영웅 패널: 능력치 + 6칸
    const hp = el('div', 'inv-hero');
    const lo = EQ.heroLoadout(p, st.hero), def = HEROES[st.hero];
    const atk = def.atk * (1 + (lo.mods.atk_pct || 0)) + (lo.mods.atk || 0);
    const statLines = Object.keys(lo.mods).filter((k) => k !== 'atk' && k !== 'atk_pct' && k !== 'passives' && Math.abs(lo.mods[k]) > 1e-6).map((k) => EQ.fmtStat(k, lo.mods[k]));
    const psv = Object.values(lo.passives).map((ps) => `「${EQ.PASSIVE[ps.key].name}」`);
    hp.appendChild(el('div', 'inv-stats', `<div class="is-name">${def.name} <small>${def.roleName} · 전투 Lv ${EQ.heroLevel(p, st.hero)}</small></div><div class="is-main"><span>HP <b>${lo.maxHp}</b></span><span>공격력 <b>${Math.round(atk)}</b></span></div><div class="is-list">${statLines.concat(psv).join(' · ') || '<span class="muted">장비 없음</span>'}</div>`));
    const grid = el('div', 'inv-slots');
    for (const s of EQ.SLOTS) {
      const uid = p.equip[st.hero][s], item = uid && EQ.findItem(p, uid);
      const b = el('button', 'inv-slot' + (st.slot === s ? ' on' : '')); b.type = 'button'; b.id = 'inv-slot-' + s;
      if (item) b.appendChild(itemIcon(item, 44)); else b.appendChild(el('div', 'ic empty', ''));
      b.appendChild(el('span', '', item ? EQ.itemName(item) : EQ.SLOT_NAME[s]));
      b.addEventListener('click', () => { Sfx.play('click'); st.slot = st.slot === s ? null : s; st.sel = item ? item.uid : null; render(); });
      grid.appendChild(b);
    }
    hp.appendChild(grid);
    body.appendChild(hp);
    // 목록 또는 상세
    const right = el('div', 'inv-right');
    const sel = st.sel && EQ.findItem(p, st.sel);
    if (sel) right.appendChild(detailPanel(sel));
    else right.appendChild(listPanel());
    body.appendChild(right);
    box.appendChild(body);
    Game.modal(box, { dim: true, cls: 'inv-modal' });
  };
  const listPanel = () => {
    const p = profile();
    const wrap = el('div', 'inv-list');
    let items = p.inv.filter((it) => EQ.usableBy(it, st.hero) && (!st.slot || EQ.BASE[it.base].slot === st.slot));
    items = items.map((it) => ({ it, sc: EQ.itemScore(p, it, st.hero) })).sort((a, b) => b.sc - a.sc);
    wrap.appendChild(el('div', 'il-head', `${st.slot ? EQ.SLOT_NAME[st.slot] : '전체'} ${items.length}개 <small class="muted">${HEROES[st.hero].name} 착용 가능</small>`));
    if (!items.length) wrap.appendChild(el('div', 'muted il-empty', '아직 장비가 없어요. 던전에서 얻을 수 있어요.'));
    for (const { it, sc } of items) {
      const r = el('button', 'inv-item'); r.type = 'button'; r.dataset.uid = it.uid;
      r.appendChild(itemIcon(it, 36));
      const owner = EQ.equippedBy(p, it.uid);
      r.appendChild(el('div', 'ii-txt', `<b class="g-${it.grade}">${EQ.itemName(it)}</b><small>${EQ.SLOT_NAME[EQ.BASE[it.base].slot]} · 점수 ${sc}${owner ? ` · <span class="eqd">${HEROES[owner].name} 장착</span>` : ''}</small>`));
      r.addEventListener('click', () => { Sfx.play('click'); st.sel = it.uid; render(); });
      wrap.appendChild(r);
    }
    return wrap;
  };
  const detailPanel = (item) => {
    const p = profile();
    const wrap = el('div', 'inv-detail'); wrap.id = 'inv-detail';
    const top = el('div', 'id-top');
    top.appendChild(itemIcon(item, 56));
    top.appendChild(el('div', 'id-txt', itemDetailHtml(item, st.hero)));
    wrap.appendChild(top);
    const slot = EQ.BASE[item.base].slot;
    const curUid = p.equip[st.hero][slot];
    const usable = EQ.usableBy(item, st.hero);
    if (curUid && curUid !== item.uid && usable) { // 비교
      const cur = EQ.findItem(p, curUid);
      const d = EQ.itemScore(p, item, st.hero) - EQ.itemScore(p, cur, st.hero);
      wrap.appendChild(el('div', 'id-cmp ' + (d >= 0 ? 'up' : 'down'), `지금 장비 <b>${EQ.itemName(cur)}</b> 대비 점수 ${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}`));
    }
    const row = el('div', 'btn-row');
    row.appendChild(btn('◀ 목록', 'ghost small', () => { st.sel = null; render(); }, { sfx: 'back', id: 'inv-back' }));
    if (curUid === item.uid) row.appendChild(btn('해제', 'small', () => { EQ.unequip(p, st.hero, slot); saveProfile(); render(); }, { id: 'inv-unequip' }));
    else if (usable) row.appendChild(btn('장착', 'primary small', () => { EQ.equip(p, st.hero, item); saveProfile(); Sfx.play('coin'); render(); }, { id: 'inv-equip' }));
    if (item.gems.length) item.gems.forEach((gu, i) => row.appendChild(btn(gu ? `보석 ${i + 1} 빼기` : `보석 ${i + 1} 넣기`, 'small', () => { if (gu) { EQ.unsocket(p, item, i); saveProfile(); render(); } else pickGem(item, i); }, { id: 'inv-sock-' + i })));
    row.appendChild(btn('분해', 'danger small', () => confirmDismantle(item), { id: 'inv-dismantle' }));
    wrap.appendChild(row);
    return wrap;
  };
  const pickGem = (item, idx) => {
    const p = profile();
    const box = el('div', 'pick-box');
    box.appendChild(el('div', 'modal-title', '보석 선택'));
    const free = p.gems.filter((g) => !g.inItem);
    if (!free.length) box.appendChild(el('p', 'muted', '끼울 수 있는 보석이 없어요. 보스를 쓰러뜨리면 얻을 수 있어요.'));
    for (const g of free) {
      const b = btn(`${gemBadge(g)} ${EQ.gemEffects(g).map((e) => EQ.fmtStat(e.stat, e.v)).join(', ')}`, 'choice gem-pick', () => { EQ.socket(p, item, idx, g); saveProfile(); render(); });
      b.dataset.uid = g.uid; box.appendChild(b);
    }
    box.appendChild(btn('취소', 'ghost', () => render(), { sfx: 'back', id: 'gem-cancel' }));
    Game.modal(box, { dim: true });
  };
  const confirmDismantle = (item) => {
    const box = el('div', 'confirm-box');
    box.appendChild(el('div', 'modal-title', `${EQ.itemName(item)} 분해`));
    box.appendChild(el('p', '', `강화석 ${EQ.DB.dismantle[item.grade] + item.enh}개를 얻어요. 끼워 둔 보석은 돌려받아요.`));
    const row = el('div', 'btn-row');
    row.appendChild(btn('취소', 'ghost', () => render(), { sfx: 'back', id: 'dis-no' }));
    row.appendChild(btn('분해', 'danger', () => { const n = EQ.dismantle(profile(), item); saveProfile(); Game.toast(`강화석 +${n}`); st.sel = null; render(); }, { id: 'dis-yes' }));
    box.appendChild(row);
    Game.modal(box, { dim: true });
  };
  render();
}

// ---------------------------------------------------------------- 대장간 (강화)
function openBlacksmith(onClose) {
  const st = { sel: null, last: null };
  const rng = makeRng((Date.now() ^ 0x5bd1e995) >>> 0);
  const render = () => {
    const p = profile();
    const box = el('div', 'inv-box bs-box');
    const head = el('div', 'inv-head');
    head.appendChild(el('div', 'modal-title', '⚒ 대장간'));
    head.appendChild(el('div', 'inv-res', `<span>● ${p.gold}</span><span>💎 강화석 ${p.stones}</span>`));
    head.appendChild(btn('닫기', 'ghost small', () => { Game.closeModal(); refreshRunLoadout(Game.run); if (onClose) onClose(); }, { sfx: 'back', id: 'bs-close' }));
    box.appendChild(head);
    const body = el('div', 'inv-body');
    const list = el('div', 'inv-list bs-list');
    const items = p.inv.slice().sort((a, b) => (EQ.equippedBy(p, b.uid) ? 1 : 0) - (EQ.equippedBy(p, a.uid) ? 1 : 0) || EQ.G[b.grade].idx - EQ.G[a.grade].idx || b.enh - a.enh);
    if (!items.length) list.appendChild(el('div', 'muted il-empty', '강화할 장비가 없어요.'));
    for (const it of items) {
      const r = el('button', 'inv-item bs-item' + (st.sel === it.uid ? ' on' : '')); r.type = 'button'; r.dataset.uid = it.uid;
      r.appendChild(itemIcon(it, 36));
      const owner = EQ.equippedBy(p, it.uid);
      r.appendChild(el('div', 'ii-txt', `<b class="g-${it.grade}">${EQ.itemName(it)}</b><small>강화 ${it.enh}/${EQ.enhanceCap(it)}${owner ? ` · ${HEROES[owner].name} 장착` : ''}</small>`));
      r.addEventListener('click', () => { Sfx.play('click'); st.sel = it.uid; st.last = null; render(); });
      list.appendChild(r);
    }
    body.appendChild(list);
    const right = el('div', 'inv-right bs-panel');
    const item = st.sel && EQ.findItem(p, st.sel);
    if (!item) right.appendChild(el('div', 'muted il-empty', '강화할 장비를 고르세요.'));
    else {
      const top = el('div', 'id-top');
      top.appendChild(itemIcon(item, 64));
      top.appendChild(el('div', 'id-txt', `<div class="id-name g-${item.grade}">${EQ.itemName(item)}</div><div class="id-sub">주 스탯 ${EQ.mainStats(item).map((m) => EQ.fmtStat(m.stat, m.v)).join(', ')}</div>`));
      right.appendChild(top);
      const info = EQ.enhanceInfo(item);
      if (!info) right.appendChild(el('div', 'bs-max', `최대 강화 (+${EQ.enhanceCap(item)})`));
      else {
        const vis = EQ.DB.enhance.visualTiers.find((v) => v > item.enh);
        right.appendChild(el('div', 'bs-info', `
          <div class="bs-target">+${item.enh} → <b>+${info.target}</b> <small>주 스탯 +${Math.round(EQ.DB.enhance.mainPerLevel * 100)}%${vis ? ` · +${vis}에서 외형 강화` : ''}</small></div>
          <div class="bs-rate">성공 확률 <b>${Math.round(info.rate * 1000) / 10}%</b>${info.rate > info.base && !info.guaranteed ? ` <small>(기본 ${Math.round(info.base * 1000) / 10}% + 실패 보정)</small>` : ''}</div>
          <div class="bs-art">장인의 기운 <div class="bar art"><div class="fill" style="width:${info.artisan * 100}%"></div></div> ${Math.round(info.artisan * 1000) / 10}%${info.guaranteed ? ' <b class="ok">다음 강화는 반드시 성공</b>' : ''}</div>
          <div class="bs-cost">비용 💎 ${info.stones} · ● ${info.gold}</div>`));
        const can = p.stones >= info.stones && p.gold >= info.gold;
        const b = btn('강화', 'primary big', () => {
          const r = EQ.tryEnhance(p, item, rng);
          if (!r.ok) { Game.toast(r.reason === 'stones' ? '강화석이 부족해요' : '골드가 부족해요'); return; }
          saveProfile();
          st.last = r.success ? 'ok' : 'fail';
          Sfx.play(r.success ? 'coin' : 'back');
          render();
        }, { id: 'bs-enhance' });
        b.disabled = !can;
        right.appendChild(b);
        if (!can) right.appendChild(el('div', 'muted', p.stones < info.stones ? '강화석이 부족해요. 전투 보상이나 분해로 얻을 수 있어요.' : '골드가 부족해요.'));
      }
      if (st.last) right.appendChild(el('div', 'bs-result ' + st.last, st.last === 'ok' ? `성공! +${item.enh}` : '실패… 장인의 기운이 쌓였어요'));
    }
    body.appendChild(right);
    box.appendChild(body);
    Game.modal(box, { dim: true, cls: 'inv-modal' });
  };
  render();
}

// ---------------------------------------------------------------- 전투 보상: 강화석 + 정예/보스 장비, 보스 보석
function grantBattleLoot(run, node) {
  const p = Game.profile;
  const rng = makeRng(hashSeed(run.seed, 'loot', node.stage, node.row, run.stats.battles));
  const src = node.type === 'boss' ? 'boss' : node.type === 'elite' ? 'elite' : 'battle';
  const stones = EQ.DB.stoneReward[src];
  p.stones += stones; run.stonesGot += stones;
  const got = [];
  if (src !== 'battle') { const it = EQ.dropItem(rng, p, src, run.tier, partyIds(run)); p.inv.push(it); got.push({ kind: 'item', uid: it.uid }); }
  if (src === 'boss') { const g = EQ.dropGem(rng, p, run.tier); p.gems.push(g); got.push({ kind: 'gem', uid: g.uid }); p.tickets += GACHA.BOSS_TICKETS; got.push({ kind: 'ticket', n: GACHA.BOSS_TICKETS }); }
  // 경험치: 출전한 캐릭터 모두 (쓰러진 캐릭터는 절반), 난이도가 높을수록 많이
  const expBase = CHAR_LV.reward[src] * (1 + CHAR_LV.tierMult * (run.tier || 0));
  const exp = [];
  for (const id of partyIds(run)) { const r = GACHA.addExp(p, id, expBase * (run.heroes[id].dead ? CHAR_LV.deadMult : 1)); if (r) exp.push(r); }
  run.expGot = (run.expGot || 0) + Math.round(expBase);
  run.loot.push(...got);
  run.lastLoot = { stones, got, exp };
  saveProfile();
}
function lootHtml(entries) {
  const p = profile();
  return entries.map((e) => {
    if (e.kind === 'ticket') return `<span class="loot ticket">🎟 소환권 ×${e.n}</span>`;
    if (e.kind === 'item') { const it = EQ.findItem(p, e.uid); return it ? `<span class="loot g-${it.grade}">${it.grade} ${EQ.itemName(it)}</span>` : ''; }
    const g = EQ.findGem(p, e.uid); return g ? gemBadge(g) : '';
  }).join(' ');
}
// 원정 종료 정산: 골드를 마을로 가져가고, 보스를 잡으면 다음 난이도 해금
function settleRun(run) {
  if (run.settled) return null;
  run.settled = true;
  const p = Game.profile;
  p.gold += run.gold;
  let unlocked = null;
  if (run.result === 'victory') {
    p.clears[run.tier] = (p.clears[run.tier] || 0) + 1;
    if (run.tier >= p.unlockedTier && run.tier < EQ.DB.tiers.length) { p.unlockedTier = run.tier + 1; unlocked = EQ.tierInfo(p.unlockedTier); }
  }
  saveProfile();
  return { gold: run.gold, unlocked };
}
