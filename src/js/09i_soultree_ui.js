// ===== 09i_soultree_ui.js : 소울트리 창 (v0.57) — 끌어서 이동 · 확대/축소 · 노드를 눌러 찍기/빼기 · 「여기까지 찍기」 =====
const SOUL_COLORS = { tank: '#6aa8e8', melee: '#e8765a', rogue: '#a07ae8', monk: '#e8b44a', ranged: '#7ad46a', mage: '#5ac8e8', warlock: '#b45ae8', demon: '#e84a6a', necro: '#8ae0b4', support: '#f0e08a' };
const soulUI = { st: null };

function openSoulTree(heroId, onClose) {
  const p = Game.profile, owned = GACHA.ownedIds(p);
  if (!owned.includes(heroId)) heroId = owned[0];
  const role = HEROES[heroId].role, start = SOUL.nodes[soulStart(heroId)];
  const prev = soulUI.st && soulUI.st.hero === heroId ? soulUI.st : null;
  const st = soulUI.st = { hero: heroId, sel: prev ? prev.sel : null, zoom: prev ? prev.zoom : 0.8, cx: prev ? prev.cx : start.x * 2.6, cy: prev ? prev.cy : start.y * 2.6, t: 0, raf: 0, drag: null, onClose };
  const box = el('div', 'soul-box');
  const head = el('div', 'soul-head');
  const pts = talentPoints(p, heroId), spent = talentSpent(p, heroId);
  head.appendChild(el('div', 'fx-title', `🔮 소울트리 <small>${HEROES[heroId].name} · ${HEROES[heroId].roleName}</small>`));
  const nav = el('div', 'soul-nav');
  const step = (d) => { const i = owned.indexOf(heroId); openSoulTree(owned[(i + d + owned.length) % owned.length], onClose); };
  nav.appendChild(btn('◀', 'ghost small icon', () => step(-1), { id: 'soul-prev' }));
  nav.appendChild(el('div', 'soul-pts' + (spent < pts ? ' has' : ''), `남은 점수 <b>${pts - spent}</b><small>찍음 ${spent} / ${pts} (Lv당 1점)</small>`));
  nav.appendChild(btn('▶', 'ghost small icon', () => step(1), { id: 'soul-next' }));
  head.appendChild(nav);
  head.appendChild(btn('초기화', 'ghost small', () => { talentReset(p, heroId); saveProfile(); refreshRunLoadout(Game.run); st.sel = null; openSoulTree(heroId, onClose); }, { id: 'talent-reset', sfx: 'back' }));
  head.appendChild(btn('닫기', 'small', () => { cancelAnimationFrame(st.raf); soulUI.st = null; Game.closeModal(); refreshRunLoadout(Game.run); if (onClose) onClose(); }, { id: 'talent-close', sfx: 'back' }));
  box.appendChild(head);
  const wrap = el('div', 'soul-wrap');
  const cv = el('canvas', 'soul-cv'); cv.id = 'soul-cv';
  const W = 876, H = 404, DPR = 2; cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  wrap.appendChild(cv);
  const zoomBox = el('div', 'soul-zoom');
  zoomBox.appendChild(btn('＋', 'ghost small icon', () => { st.zoom = Math.min(2.2, st.zoom * 1.25); }, { id: 'soul-zin' }));
  zoomBox.appendChild(btn('－', 'ghost small icon', () => { st.zoom = Math.max(0.28, st.zoom / 1.25); }, { id: 'soul-zout' }));
  zoomBox.appendChild(btn('◎', 'ghost small icon', () => { st.zoom = 0.8; st.cx = start.x * 2.6; st.cy = start.y * 2.6; }, { id: 'soul-home' }));
  wrap.appendChild(zoomBox);
  const info = el('div', 'soul-info fx-parch'); info.id = 'soul-info';
  wrap.appendChild(info);
  wrap.appendChild(el('div', 'soul-legend', '<span><i class="lg small"></i>작은 노드</span><span><i class="lg notable"></i>주요 노드</span><span><i class="lg key"></i>핵심</span><span><i class="lg on"></i>찍음</span>'));
  box.appendChild(wrap);
  Game.modal(box, { dim: true, cls: 'soul-modal' });

  // ---- 좌표 변환 (트리 → 화면)
  const S = SOUL.nodes, toScr = (n) => ({ x: W / 2 + (n.x - st.cx) * st.zoom, y: H / 2 + (n.y - st.cy) * st.zoom });
  st.toScreen = (nid) => { const q = toScr(S[nid]); const r = cv.getBoundingClientRect(); return { x: r.left + q.x * r.width / W, y: r.top + q.y * r.height / H }; };
  const nodeR = (n) => (n.type === 'start' ? 20 : n.type === 'keystone' ? 16 : n.type === 'notable' ? 11 : 6.5);
  const hit = (mx, my) => { let best = null, bd = 1e9; for (const id in S) { const q = toScr(S[id]), d = Math.hypot(q.x - mx, q.y - my); if (d < Math.max(14, nodeR(S[id]) * st.zoom + 6) && d < bd) { bd = d; best = id; } } return best; };
  const local = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); const q = local(e); st.drag = { x: q.x, y: q.y, cx: st.cx, cy: st.cy, moved: 0 }; });
  cv.addEventListener('pointermove', (e) => { if (!st.drag) return; const q = local(e), dx = q.x - st.drag.x, dy = q.y - st.drag.y; st.drag.moved = Math.max(st.drag.moved, Math.hypot(dx, dy)); st.cx = st.drag.cx - dx / st.zoom; st.cy = st.drag.cy - dy / st.zoom; });
  cv.addEventListener('pointerup', (e) => { const d = st.drag; st.drag = null; if (d && d.moved < 8) { const q = local(e), id = hit(q.x, q.y); st.sel = id; Sfx.play(id ? 'click' : 'back'); showInfo(); } });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); st.zoom = clamp(st.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.28, 2.2); }, { passive: false });

  const reopen = () => { saveProfile(); refreshRunLoadout(Game.run); openSoulTree(heroId, onClose); };
  const showInfo = () => {
    info.innerHTML = '';
    const n = st.sel && S[st.sel];
    if (!n) { info.appendChild(el('div', 'si-hint', `노드를 눌러 살펴보세요. <b>${SOUL_CLASS_NAME[role]}의 영혼석</b>에서 시작해 이어진 노드만 찍을 수 있어요. 끌어서 이동 · ＋/－ 확대.`)); info.classList.add('empty'); return; }
    info.classList.remove('empty');
    const has = soulHas(p, heroId, n.id), path = has ? [] : soulPathTo(p, heroId, n.id), left = talentPoints(p, heroId) - talentSpent(p, heroId);
    const kind = { start: '영혼석', small: '작은 노드', notable: '주요 노드', keystone: '핵심' }[n.type];
    const where = n.cls ? `${SOUL_CLASS_NAME[n.cls]} 구역${n.branchName ? ' · ' + n.branchName : ''}${n.cls !== role ? ' <span class="warn">(다른 직업)</span>' : ''}` : '공용 다리';
    info.appendChild(el('div', 'si-name', `<b class="t-${n.type}">${n.name}</b><small>${kind} · ${where}</small>`));
    info.appendChild(el('div', 'si-txt', soulNodeText(n)));
    const row = el('div', 'si-row');
    if (n.type === 'start') row.appendChild(el('span', 'muted', n.id === soulStart(heroId) ? '여기서 출발' : '다른 직업의 출발점'));
    else if (has) { const b = btn('빼기', 'ghost small', () => { if (soulRemove(p, heroId, n.id)) { Sfx.play('back'); reopen(); } }, { id: 'soul-remove' }); if (!soulCanRemove(p, heroId, n.id)) { b.disabled = true; row.appendChild(el('span', 'muted', '바깥 노드부터 빼야 해요')); } row.appendChild(b); }
    else if (soulCanAdd(p, heroId, n.id)) row.appendChild(btn('찍기 <small>1점</small>', 'primary small', () => { if (soulAdd(p, heroId, n.id)) { Sfx.play('ult'); reopen(); } }, { id: 'soul-add' }));
    else if (path && path.length) { const b = btn(`여기까지 찍기 <small>${path.length}점</small>`, 'primary small', () => { for (const id of path) soulAdd(p, heroId, id); Sfx.play('ult'); reopen(); }, { id: 'soul-path' }); if (path.length > left) { b.disabled = true; row.appendChild(el('span', 'warn', `점수 ${path.length - left} 부족`)); } row.appendChild(b); }
    info.appendChild(row);
  };
  showInfo();

  // ---- 그리기
  const ctx = cv.getContext('2d');
  const bg = (() => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const gr = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.7); gr.addColorStop(0, '#1c1430'); gr.addColorStop(1, '#07050c'); g.fillStyle = gr; g.fillRect(0, 0, W, H); const r = makeRng(77); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${0.1 + r() * 0.5})`; g.fillRect(r() * W, r() * H, r() < 0.1 ? 2 : 1, r() < 0.1 ? 2 : 1); } return c; })();
  const draw = () => {
    if (!document.body.contains(cv)) return;
    st.t += 1 / 60; const t = st.t, z = st.zoom;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.drawImage(bg, 0, 0);
    const avail = new Set(); for (const id in S) if (!soulHas(p, heroId, id) && S[id].type !== 'start' && SOUL.links[id].some((m) => soulHas(p, heroId, m))) avail.add(id);
    const pathSet = new Set(st.sel && !soulHas(p, heroId, st.sel) ? soulPathTo(p, heroId, st.sel) || [] : []);
    // 직업 구역 빛 · 이름
    SOUL_CLASSES.forEach((c) => { const s0 = S[`${c}:start`], q = toScr({ x: s0.x * 3.4, y: s0.y * 3.4 }); const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 320 * z); g.addColorStop(0, SOUL_COLORS[c] + '22'); g.addColorStop(1, SOUL_COLORS[c] + '00'); ctx.fillStyle = g; ctx.fillRect(q.x - 320 * z, q.y - 320 * z, 640 * z, 640 * z); });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // 연결선
    for (const a in SOUL.links) for (const b of SOUL.links[a]) {
      if (a > b) continue; const A = S[a], B = S[b], qa = toScr(A), qb = toScr(B);
      if (Math.max(qa.x, qb.x) < -20 || Math.min(qa.x, qb.x) > W + 20 || Math.max(qa.y, qb.y) < -20 || Math.min(qa.y, qb.y) > H + 20) continue;
      const on = soulHas(p, heroId, a) && soulHas(p, heroId, b), pv = (pathSet.has(a) || soulHas(p, heroId, a) || a === st.sel) && (pathSet.has(b) || soulHas(p, heroId, b) || b === st.sel) && (pathSet.has(a) || pathSet.has(b));
      ctx.strokeStyle = on ? '#ffd86a' : pv ? 'rgba(140,220,255,0.85)' : 'rgba(150,130,180,0.28)'; ctx.lineWidth = (on ? 3.2 : pv ? 2.6 : 1.6) * Math.max(0.6, z);
      if (on) { ctx.shadowColor = '#ffb030'; ctx.shadowBlur = 8; }
      ctx.beginPath(); ctx.moveTo(qa.x, qa.y); ctx.lineTo(qb.x, qb.y); ctx.stroke(); ctx.shadowBlur = 0;
    }
    // 노드
    for (const id in S) {
      const n = S[id], q = toScr(n), r = nodeR(n) * Math.max(0.55, z); if (q.x < -30 || q.x > W + 30 || q.y < -30 || q.y > H + 30) continue;
      const on = soulHas(p, heroId, id), av = avail.has(id), col = n.cls ? SOUL_COLORS[n.cls] : '#b8b0c8', sel = id === st.sel, inPath = pathSet.has(id);
      if (n.type === 'start') {
        ctx.fillStyle = '#120c1a'; ctx.beginPath(); ctx.arc(q.x, q.y, r + 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2); ctx.stroke();
        for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + t * 0.4; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(q.x + Math.cos(a) * r, q.y + Math.sin(a) * r, 2.2, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = id === soulStart(heroId) ? col : col + '66'; ctx.font = `bold ${Math.round(r * 0.9)}px sans-serif`; ctx.fillText(SOUL_CLASS_NAME[n.cls][0], q.x, q.y + 1);
        if (z > 0.45) { ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = 'rgba(255,240,210,0.85)'; ctx.fillText(SOUL_CLASS_NAME[n.cls], q.x, q.y + r + 12); }
        continue;
      }
      if (av || inPath) { ctx.strokeStyle = inPath ? 'rgba(140,220,255,0.9)' : `rgba(255,220,120,${0.45 + 0.35 * Math.sin(t * 4)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, r + 4, 0, Math.PI * 2); ctx.stroke(); }
      if (n.type === 'keystone') { // 핵심: 이중 테 + 톱니
        ctx.fillStyle = '#1a1020'; ctx.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, rr = k % 2 ? r + 2 : r + 6; ctx.lineTo(q.x + Math.cos(a) * rr, q.y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
        ctx.strokeStyle = on ? '#ffd86a' : '#8a7a5a'; ctx.lineWidth = 2; ctx.stroke();
      }
      const g = ctx.createRadialGradient(q.x - r * 0.3, q.y - r * 0.4, 1, q.x, q.y, r);
      g.addColorStop(0, on ? '#fff6d0' : col + (av ? 'ee' : '88')); g.addColorStop(1, on ? '#c88a20' : '#241a30');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = on ? '#ffe9a0' : n.type === 'notable' ? '#c8a860' : 'rgba(200,190,220,0.55)'; ctx.lineWidth = n.type === 'small' ? 1.2 : 2.2; ctx.stroke();
      if (sel) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(q.x, q.y, r + 8, t * 2, t * 2 + Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      if (z > 0.75 && n.type !== 'small') { ctx.font = 'bold 11px sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(n.name, q.x, q.y + r + 11); ctx.fillStyle = on ? '#ffe9a0' : '#e8e0f0'; ctx.fillText(n.name, q.x, q.y + r + 11); }
    }
    // 가운데 영혼의 핵
    const c0 = toScr({ x: 0, y: 0 }), cr = 46 * Math.max(0.5, z);
    const cg = ctx.createRadialGradient(c0.x, c0.y, 2, c0.x, c0.y, cr); cg.addColorStop(0, `rgba(200,170,255,${0.55 + 0.15 * Math.sin(t * 2)})`); cg.addColorStop(1, 'rgba(120,80,200,0)'); ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(c0.x, c0.y, cr, 0, Math.PI * 2); ctx.fill();
    st.raf = requestAnimationFrame(draw);
  };
  st.raf = requestAnimationFrame(draw);
}
