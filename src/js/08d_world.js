// ===== 08d_world.js : 필드 지역(월드 맵) — 마을에서 던전까지 걸어서 간다 (v0.55) =====
// 지역 4곳이 이어져 있다: 마을 → 마을 외곽 숲(고블린 굴) → 바위 언덕(버려진 광산) → 안개 늪지(저주받은 묘지) → 잿빛 황야(심연의 요새)
// 지역마다 떠도는 적 무리(닿으면 전투) · 던전 입구 · 웨이포인트(디아블로처럼: 한 번 닿으면 등록, 마을 포탈에서 바로 이동).
// 다음 지역으로 가는 길은 그 지역 던전의 보스를 쓰러뜨려야 열린다. 마을에 돌아가면 파티가 회복된다.

const WORLD = {
  H: 900,
  zones: [
    { key: 'outskirts', name: '마을 외곽 숲', site: 'cave', w: 2200, stage: 1, packs: 3, scale: { hp: 0.6, atk: 0.6 }, ground: ['#2f7a5a', '#2a7052', '#368460'], deco: 'tree', tint: null },
    { key: 'hills', name: '바위 언덕', site: 'mine', w: 2600, stage: 2, packs: 4, scale: { hp: 1.3, atk: 1.2 }, ground: ['#7a7050', '#6e6648', '#857a58'], deco: 'rock', tint: 'rgba(120,80,30,0.12)' },
    { key: 'marsh', name: '안개 늪지', site: 'crypt', w: 2800, stage: 3, packs: 5, scale: { hp: 2.0, atk: 1.7 }, ground: ['#3e5048', '#36463f', '#465a50'], deco: 'deadtree', tint: 'rgba(60,90,120,0.22)' },
    { key: 'ashland', name: '잿빛 황야', site: 'abyss', w: 3000, stage: 4, packs: 5, scale: { hp: 3.0, atk: 2.4 }, ground: ['#4e3c38', '#45342f', '#584440'], deco: 'spire', tint: 'rgba(150,40,20,0.18)' },
  ],
};
const zoneIdx = (key) => WORLD.zones.findIndex((z) => z.key === key);
function waypointOn(p, key) { return !!(p.waypoints && p.waypoints[key]); }
// 다음 지역 길: 이 지역 던전의 보스를 쓰러뜨렸거나 다음 던전이 이미 열렸으면
function zoneExitOpen(p, zi) { const nz = WORLD.zones[zi + 1]; if (!nz) return false; const s = DUNGEON_SITES[nz.site]; return !s.unlock || s.unlock(p); }

// 던전 입구 (지역의 동굴 앞 · 테스트용으로도 호출): 장소는 고정, 난이도 · 맹세 · 편성 후 입장
function openDungeonGate(siteKey, scene) {
  const run = Game.run, P = Game.profile, S = DUNGEON_SITES[siteKey];
  scene = scene || FieldScene;
  const reopen = () => openDungeonGate(siteKey, scene);
  const box = el('div', 'confirm-box');
  if (S.unlock && !S.unlock(P)) { box.appendChild(el('div', 'modal-title', `🔒 ${S.name}`)); box.appendChild(el('p', '', S.lockText || '아직 들어갈 수 없다')); box.appendChild(btn('닫기', 'primary', () => Game.closeModal(), { sfx: 'back', id: 'portal-no' })); Game.modal(box, { dim: true, closeOnBg: true }); return; }
  P.site = siteKey;
  box.appendChild(el('div', 'modal-title', `${S.name}에 들어갈까요?`));
  box.appendChild(el('div', 'site-desc', S.desc));
  box.appendChild(gateIntel(siteKey, reopen)); // v0.59 보스 정보 · 정찰
  box.appendChild(FieldScene.tierPicker.call(scene, reopen));
  box.appendChild(FieldScene.oathPicker.call(scene, reopen));
  box.appendChild(el('div', 'portal-party', partyIds(run).map((id) => `<span>${HEROES[id].name}<small>${HEROES[id].roleName}</small></span>`).join('')));
  box.appendChild(el('p', '', `파티 ${partyAlive(run).length}/${CONST.PARTY_SIZE}명 · 식량 ${run.food} · 회복약 ${run.potions} · 골드 ${run.gold}` + (run.gotSupply ? '' : '<br><b class="warn">마을 보급 상자를 아직 열지 않았어요!</b>')));
  const row = el('div', 'btn-row');
  row.appendChild(btn('조금 더 둘러보기', 'ghost', () => Game.closeModal(), { sfx: 'back', id: 'portal-no' }));
  row.appendChild(btn('👥 편성', '', () => openPartySelect(run, () => { if (scene.rebuildParty) scene.rebuildParty(); reopen(); }), { id: 'portal-party' }));
  row.appendChild(btn('입장 ▶', 'primary', () => { Game.closeModal(); Sfx.play('door'); run.tier = P.tier; run.site = siteKey; run.world = null; run.oaths = (P.oaths || []).slice(); oathApplyStart(run); refreshRunLoadout(run); enterDungeon(run); }, { id: 'portal-yes' }));
  box.appendChild(row);
  Game.modal(box, { dim: true, closeOnBg: true });
}

// 던전 입구의 보스 정보 (v0.59): 아는 만큼만 보인다 — 도감에서 파악한 패턴 · 📜 정찰 두루마리로 하나 더
function siteBosses(siteKey) { const out = []; for (const enc of (DUNGEON_SITES[siteKey].enc.boss || {})[5] || []) for (const w of enc) for (const id of w) if (ENEMIES[id] && ENEMIES[id].abilities.includes('boss') && !out.includes(id)) out.push(id); return out; }
function gateIntel(siteKey, reopen) {
  const P = Game.profile, wrap = el('div', 'gate-intel');
  const bosses = siteBosses(siteKey);
  wrap.appendChild(el('div', 'gi-head', `<b>👁 보스 정보</b> <small>도감에서 파악한 만큼 보인다 · 이 중 하나가 기다린다</small>`));
  const row = el('div', 'gi-row');
  for (const id of bosses) {
    const pl = enemyPatterns(id), pats = codexPats(P, id), c = el('div', 'gi-boss' + (codexKnown(P, id) ? '' : ' unknown'));
    const pc = portraitCanvas(ENEMIES[id].sprite, 40); if (!codexKnown(P, id)) pc.style.filter = 'brightness(0) opacity(.6)'; c.appendChild(pc);
    c.appendChild(el('div', 'gi-txt', `<b>${enemyLabel(P, id)}</b><small>패턴 ${pl.filter((x) => pats[x.k]).length}/${pl.length}</small><div class="gi-pats">${pl.map((x) => pats[x.k] ? `<span class="on" title="${x.c}">${x.n}</span>` : '<span>?</span>').join('')}</div>`));
    row.appendChild(c);
  }
  wrap.appendChild(row);
  const n = P.scouts || 0, left = bosses.some((id) => !codexComplete(P, id));
  const b = btn(`📜 정찰 <small>${n}장</small>`, 'small' + (n && left ? ' primary' : ''), () => {
    if (!n) { Game.toast('정찰 두루마리가 없어요 — 마을 잡화점(던전 도구)에서 산다', 1600); return; }
    const cand = bosses.filter((id) => !codexComplete(P, id)); if (!cand.length) { Game.toast('보스의 패턴을 이미 모두 알고 있다', 1400); return; }
    const id = cand[Math.floor(Math.random() * cand.length)], r = codexScout(P, id);
    P.scouts = n - 1; saveProfile(); Sfx.play('coin');
    Game.toast(`📜 정찰: ${enemyLabel(P, id)} — <b>${r.info.n}</b><br><small>${r.info.c}</small>`, 3200); reopen();
  }, { id: 'gate-scout' });
  if (!left) b.disabled = true;
  wrap.appendChild(b);
  return wrap;
}

// 마을 포탈: 걸어서 출발 + 등록한 웨이포인트로 순간 이동
function openWaypoints(scene) {
  const P = Game.profile, box = el('div', 'confirm-box wp-box');
  box.appendChild(el('div', 'modal-title', '🌀 웨이포인트'));
  box.appendChild(el('p', 'muted', '지역의 웨이포인트에 한 번 닿으면 등록된다. 등록한 곳으로는 여기서 바로 이동한다.'));
  const col = el('div', 'btn-col');
  col.appendChild(btn(`🚶 걸어서 출발 <small>${WORLD.zones[0].name} (마을 동쪽)</small>`, 'primary', () => { Game.closeModal(); Sfx.play('door'); goWorld(0, 'start'); }, { id: 'wp-walk' }));
  WORLD.zones.forEach((z, i) => {
    const on = waypointOn(P, z.key), S = DUNGEON_SITES[z.site];
    const b = btn(`${on ? '🌀' : '🔒'} ${z.name} <small>${S.name} 앞 · ${on ? '등록됨' : '미등록 — 걸어가서 닿아야 한다'}</small>`, on ? '' : 'locked', () => { if (!on) { Sfx.play('back'); Game.toast('아직 등록하지 않은 웨이포인트예요', 1200); return; } Game.closeModal(); Sfx.play('door'); goWorld(i, 'waypoint'); }, { id: 'wp-' + z.key });
    col.appendChild(b);
  });
  col.appendChild(btn('닫기', 'ghost', () => Game.closeModal(), { sfx: 'back', id: 'wp-close' }));
  box.appendChild(col);
  Game.modal(box, { dim: true, closeOnBg: true });
}
function goWorld(zi, at) { const run = Game.run; run.world = { zone: zi, at, cleared: (run.world && run.world.zone === zi && run.world.cleared) || [] }; refreshRunLoadout(run); Game.go('world', { zone: zi, at }); }

const WorldScene = {
  enter(params) {
    const run = Game.run, zi = params && params.zone !== undefined ? params.zone : (run.world ? run.world.zone : 0);
    this.zi = zi; this.Z = WORLD.zones[zi]; this.t = 0;
    run.world = run.world || { zone: zi, cleared: [] }; run.world.zone = zi; run.world.cleared = run.world.cleared || [];
    const Z = this.Z, at = (params && params.at) || run.world.at || 'start';
    this.gate = { x: Z.w - 300, y: 330 }; this.wp = { x: Z.w - 540, y: 455 }; // 웨이포인트는 길 위 — 입구로 가다 보면 닿는다
    const st = run.world.pos && at === 'resume' ? run.world.pos : at === 'waypoint' ? { x: this.wp.x + 60, y: this.wp.y + 30 } : at === 'end' ? { x: Z.w - 120, y: 480 } : { x: 120, y: 480 };
    this.leader = { x: st.x, y: st.y, flip: at === 'end', moving: false };
    this.trail = []; for (let i = 0; i < 200; i++) this.trail.push({ x: this.leader.x - i * 1.5, y: this.leader.y });
    this.rebuildParty();
    this.target = null; this.pendingInteract = null; this.joy = null; this.dusts = []; this.tapMark = null;
    this.cam = { x: clamp(st.x - 480, 0, Z.w - 960), y: clamp(st.y - 300, 0, WORLD.H - 540) };
    // 지역 무늬·장식은 시드로 고정, 적 무리는 이번에 들어올 때마다 (잡은 무리는 마을에 갈 때까지 비어 있다)
    const rng = makeRng(hashSeed('world', Z.key));
    this.decos = []; for (let i = 0; i < Math.round(Z.w / 70); i++) { const x = rng() * Z.w, y = 60 + rng() * (WORLD.H - 80); if (Math.abs(y - 480) < 70) continue; this.decos.push({ x, y, s: 0.7 + rng() * 0.7, v: rng() }); }
    this.blobs = []; for (let i = 0; i < Z.w / 6; i++) this.blobs.push({ x: rng() * Z.w, y: rng() * WORLD.H, rx: 20 + rng() * 60, ry: 10 + rng() * 26, c: Math.floor(rng() * 3) });
    // 거점 3곳 (구역 확보 · 08e_territory.js): 길에서 멀리 위·아래 끝에 있다
    this.posts = TERRITORY.posts.map((pt, i) => ({ i, x: Math.round(pt.fx * Z.w), y: pt.y, name: pt.name }));
    this.healed = {};
    this.decos = this.decos.filter((d) => !this.posts.some((pt) => Math.abs(d.x - pt.x) < 140 && d.y > pt.y - 160 && d.y < pt.y + 90)); // 거점 자리는 비운다
    const enc = DUNGEON_SITES[Z.site].enc.small, prng = makeRng(hashSeed(run.seed, 'packs', Z.key));
    this.packs = [];
    for (let i = 0; i < Z.packs; i++) {
      const id = `${Z.key}-${i}`; if (run.world.cleared.includes(id)) continue;
      const tb = enc[Math.min(4, Z.stage + (i >= Z.packs - 1 ? 1 : 0))] || enc[1];
      const x = 420 + (i + 0.5) * ((Z.w - 900) / Z.packs) + (prng() - 0.5) * 80;
      const np = this.posts.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a)), up = Math.abs(np.x - x) < 300 ? np.y > 450 : prng() < 0.5; // 거점과 겹치지 않게 반대편으로
      const y = up ? 230 + prng() * 60 : 680 + prng() * 60; // 길(가운데)에서 떨어져 있다 — 일부러 다가가야 싸운다
      this.packs.push({ id, x, y, hx: x, hy: y, waves: [tb[Math.floor(prng() * tb.length)].slice()], ph: prng() * 6 });
    }
    this.obstacles = this.decos.filter((d) => Z.deco !== 'tree' || d.v < 0.6).map((d) => ({ x: d.x, y: d.y, r: 22 * d.s }));
    const ui = Game.ui;
    const top = el('div', 'f-top');
    top.appendChild(el('div', 'f-title', `🗺 ${Z.name}`));
    const r = el('div', 'f-right');
    r.appendChild(btn(`⛩ ${DUNGEON_SITES[Z.site].name} 입구로`, 'primary small', () => this.autoMove('gate'), { id: 'btn-gate' }));
    if (zoneExitOpen(Game.profile, zi)) r.appendChild(btn(`${WORLD.zones[zi + 1].name} ▶`, 'small', () => this.autoMove('next'), { id: 'btn-next' }));
    r.appendChild(btn('🏠 마을로 (귀환)', 'small', () => { Sfx.play('door'); run.world = null; Game.go('field', { from: 'world' }); }, { id: 'btn-town' }));
    r.appendChild(btn('👥 편성', 'small', () => openPartySelect(run, () => this.rebuildParty()), { id: 'btn-w-party' }));
    top.appendChild(r);
    ui.appendChild(top);
    this.resBox = el('div', 'f-res'); ui.appendChild(this.resBox);
    this.actBtn = btn('', 'primary f-act hidden', () => this.interact(this.nearby), { id: 'btn-interact' });
    ui.appendChild(this.actBtn);
    this.refreshRes();
    if (!waypointOn(Game.profile, Z.key) && at === 'waypoint') this.registerWp();
    Game.toast(`🗺 ${Z.name} — ${DUNGEON_SITES[Z.site].name}이(가) 동쪽에 있다`, 1800);
  },
  shadow(ctx, x, y, r) { FieldScene.shadow(ctx, x, y, r); },
  rebuildParty() {
    const L = this.leader;
    this.followers = partyIds(Game.run).slice(1).map((id, i) => ({ id, x: L.x - 30 * (i + 1), y: L.y + 8, flip: false, moving: false }));
    if (this.resBox) this.refreshRes();
  },
  refreshRes() {
    const run = Game.run, p = Game.profile;
    const hp = partyIds(run).map((id) => `${HEROES[id].name} ${Math.round(run.heroes[id].hp / run.heroes[id].maxHp * 100)}%`).join(' · ');
    this.resBox.innerHTML = `<span>● ${p.gold}</span><span>🧪 ${run.potions}</span><span>${hp}</span><span>위험도 ${'★'.repeat(this.zi + 1)}${'☆'.repeat(WORLD.zones.length - this.zi - 1)}</span><span>🚩 거점 ${TERRITORY.posts.filter((_, i) => { const s = postInfo(p, this.Z.key, i); return s && s.owned && !s.contested; }).length}/3${zoneSecured(p, this.Z.key) ? ' 확보!' : ''}</span>`;
  },
  registerWp() {
    const p = Game.profile; p.waypoints = p.waypoints || {};
    const first = !p.waypoints[this.Z.key]; p.waypoints[this.Z.key] = true; saveProfile();
    // 웨이포인트는 성소: 파티 회복
    const run = Game.run; for (const id of partyIds(run)) { const h = run.heroes[id]; if (!h.dead) h.hp = h.maxHp; }
    Sfx.play('heal'); Game.toast(first ? `🌀 웨이포인트 등록! 마을 포탈에서 「${this.Z.name}」로 바로 올 수 있다 · 파티 회복` : '🌀 웨이포인트의 빛 — 파티 회복', 2200);
    this.refreshRes();
  },
  interactables() {
    const Z = this.Z, out = [{ key: 'gate', x: this.gate.x, y: this.gate.y + 60, label: `⛩ ${DUNGEON_SITES[Z.site].name}` }, { key: 'wp', x: this.wp.x, y: this.wp.y, label: '🌀 웨이포인트' }];
    const P = Game.profile;
    for (const pt of this.posts) { const st = this.postStatus(pt.i); out.push({ key: 'post' + pt.i, x: pt.x, y: pt.y + 50, label: st === 'ours' ? `🚩 우리 ${pt.name}` : st === 'contested' ? `🔥 ${pt.name} 습격 중!` : `⚔ 적 ${pt.name}` }); }
    out.push({ key: 'back', x: 40, y: 480, label: this.zi ? `◀ ${WORLD.zones[this.zi - 1].name}` : '◀ 마을' });
    if (zoneExitOpen(Game.profile, this.zi)) out.push({ key: 'next', x: Z.w - 40, y: 480, label: `${WORLD.zones[this.zi + 1].name} ▶` });
    return out;
  },
  autoMove(key) {
    const it = this.interactables().find((i) => i.key === key); if (!it) return;
    this.target = { x: clamp(it.x - (key === 'next' ? 0 : 20), 20, this.Z.w - 20), y: it.y + 10 }; this.pendingInteract = key;
    this.tapMark = { x: this.target.x, y: this.target.y, t: 0 };
  },
  interact(it) {
    if (!it) return;
    this.target = null; this.pendingInteract = null;
    const run = Game.run;
    run.world.pos = { x: this.leader.x, y: this.leader.y };
    if (it.key === 'gate') openDungeonGate(this.Z.site, this);
    else if (it.key === 'wp') this.registerWp();
    else if (it.key === 'back') { Sfx.play('door'); if (this.zi === 0) { run.world = null; Game.go('field', { from: 'world' }); } else goWorld(this.zi - 1, 'end'); }
    else if (it.key === 'next') { Sfx.play('door'); goWorld(this.zi + 1, 'start'); }
    else if (it.key.startsWith('post')) this.postAction(+it.key.slice(4));
  },
  // ------------------------------------------------------------ 거점 (구역 확보)
  postStatus(i) { const s = postInfo(Game.profile, this.Z.key, i); return !s || !s.owned ? 'enemy' : s.contested ? 'contested' : 'ours'; },
  postAction(i) {
    const pt = this.posts[i], st = this.postStatus(i), run = Game.run, Z = this.Z, inc = TERRITORY.income[this.zi];
    if (st === 'ours') {
      if (this.healed[i]) { Game.toast(`🚩 우리 ${pt.name} — 지키는 병사들이 손을 흔든다`, 1400); return; }
      this.healed[i] = true;
      for (const id of partyIds(run)) { const h = run.heroes[id]; if (!h.dead) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * TERRITORY.postHeal); }
      Sfx.play('heal'); Game.toast(`🚩 우리 ${pt.name}에서 쉬었다 — 파티 HP +${Math.round(TERRITORY.postHeal * 100)}%`, 1800); this.refreshRes(); return;
    }
    const box = el('div', 'confirm-box post-box');
    box.appendChild(el('div', 'modal-title', st === 'contested' ? `🔥 ${pt.name} 탈환` : `⚔ 적 ${pt.name} 공략`));
    box.appendChild(el('p', '', st === 'contested' ? '우리 거점이 습격당했다! 적을 몰아내기 전까지 이 거점의 수입이 없다.' : '거점을 지키는 정예 무리 (2웨이브). 쓰러뜨리면 우리 영지가 된다.'));
    box.appendChild(el('div', 'post-gain', `거점 수입 · 시간당 ● ${inc.gold} · 💎 ${inc.stones}${inc.shards ? ` · ◆ ${inc.shards}` : ''}<br><small>지역 거점 3곳을 모두 확보하면 수입 +50% · ${TERRITORY.zoneBonus[this.zi]}</small>`));
    box.appendChild(el('p', 'muted', `파티 ${partyIds(run).map((id) => `${HEROES[id].name} ${Math.round(run.heroes[id].hp / run.heroes[id].maxHp * 100)}%`).join(' · ')}`));
    const row = el('div', 'btn-row');
    row.appendChild(btn('물러나기', 'ghost', () => Game.closeModal(), { sfx: 'back', id: 'post-no' }));
    row.appendChild(btn(st === 'contested' ? '탈환 ▶' : '공략 ▶', 'primary', () => { Game.closeModal(); this.startPostFight(i); }, { id: 'post-go' }));
    box.appendChild(row);
    Game.modal(box, { dim: true, closeOnBg: true });
  },
  startPostFight(i) {
    const run = Game.run, Z = this.Z, rng = makeRng(hashSeed(run.seed, 'post', Z.key, i, Date.now() % 997));
    run.world.pos = { x: this.leader.x, y: this.leader.y + 40 }; run.world.at = 'resume';
    const affs = Object.keys(ELITE_AFFIXES);
    Sfx.play('charge');
    Game.go('battle', { node: { stage: Z.stage, row: 0, type: 'elite', waves: postWaves(this.zi, i, rng), affix: i >= 1 ? affs[Math.floor(rng() * affs.length)] : null, world: { zone: this.zi, post: i }, worldScale: { hp: Z.scale.hp * 1.1, atk: Z.scale.atk * 1.05 } } });
  },
  // ------------------------------------------------------------ 입력 (마을과 같다)
  joyBase() { return FieldScene.joyBase(); },
  pointerDown(p) {
    Sfx.init();
    const jb = this.joyBase();
    if (dist2(p.x, p.y, jb.x, jb.y) < 95 * 95) { this.joy = { dx: 0, dy: 0 }; this.target = null; this.pendingInteract = null; this.pointerMove(p); return; }
    const wx = p.x + this.cam.x, wy = p.y + this.cam.y;
    for (const it of this.interactables()) if (dist2(wx, wy, it.x, it.y - 30) < 60 * 60) { this.autoMove(it.key); return; }
    this.target = { x: clamp(wx, 20, this.Z.w - 20), y: clamp(wy, 60, WORLD.H - 20) }; this.pendingInteract = null;
    this.tapMark = { x: this.target.x, y: this.target.y, t: 0 };
  },
  pointerMove(p) { FieldScene.pointerMove.call(this, p); },
  pointerUp() { this.joy = null; },
  update(dt) {
    this.t += dt;
    const L = this.leader, Z = this.Z, speed = 230;
    let vx = 0, vy = 0;
    if (this.joy && (this.joy.dx || this.joy.dy)) { vx = this.joy.dx / 56 * speed; vy = this.joy.dy / 56 * speed; }
    else if (this.target) {
      const dx = this.target.x - L.x, dy = this.target.y - L.y, d = Math.hypot(dx, dy);
      if (d < 8) { this.target = null; if (this.pendingInteract) { const it = this.interactables().find((i) => i.key === this.pendingInteract); this.pendingInteract = null; this.interact(it); } }
      else { vx = dx / d * speed; vy = dy / d * speed; }
    }
    if (Game.modalOpen) { vx = 0; vy = 0; }
    L.moving = vx !== 0 || vy !== 0;
    if (L.moving) {
      L.x = clamp(L.x + vx * dt, 20, Z.w - 20); L.y = clamp(L.y + vy * dt, 60, WORLD.H - 20);
      for (const o of this.obstacles) { const d = Math.hypot(L.x - o.x, L.y - o.y); if (d < o.r + 12) { const k = (o.r + 12) / (d || 1); L.x = o.x + (L.x - o.x) * k; L.y = o.y + (L.y - o.y) * k; } }
      if (Math.abs(vx) > 5) L.flip = vx < 0;
      this.trail.unshift({ x: L.x, y: L.y }); if (this.trail.length > 300) this.trail.pop();
      if (Math.random() < dt * 8) this.dusts.push({ x: L.x + (Math.random() - 0.5) * 10, y: L.y, t: 0 });
    }
    this.followers.forEach((f, i) => {
      const p = this.trail[Math.min(this.trail.length - 1, (i + 1) * 14)], dx = p.x - f.x, dy = p.y - f.y;
      f.moving = Math.hypot(dx, dy) > 2; if (Math.abs(dx) > 6) f.flip = dx < 0;
      f.x += dx * Math.min(1, dt * 10); f.y += dy * Math.min(1, dt * 10);
    });
    for (let i = this.dusts.length - 1; i >= 0; i--) { this.dusts[i].t += dt; if (this.dusts[i].t > 0.5) this.dusts.splice(i, 1); }
    if (this.tapMark) { this.tapMark.t += dt; if (this.tapMark.t > 0.6) this.tapMark = null; }
    // 적 무리: 제자리에서 어슬렁 → 가까이 오면 다가오고 닿으면 전투
    if (!Game.modalOpen) for (const k of this.packs) {
      const d = Math.hypot(L.x - k.x, L.y - k.y);
      if (d < 120) { k.x += (L.x - k.x) / d * 120 * dt; k.y += (L.y - k.y) / d * 120 * dt; }
      else { k.x += ((k.hx + Math.sin(this.t * 0.6 + k.ph) * 40) - k.x) * dt; k.y += ((k.hy + Math.cos(this.t * 0.5 + k.ph) * 20) - k.y) * dt; }
      if (d < 46) { this.startFight(k); return; }
    }
    const cx = clamp(L.x - 480, 0, Z.w - 960), cy = clamp(L.y - 300, 0, WORLD.H - 540);
    this.cam.x += (cx - this.cam.x) * Math.min(1, dt * 6); this.cam.y += (cy - this.cam.y) * Math.min(1, dt * 6);
    if (!waypointOn(Game.profile, Z.key) && dist2(L.x, L.y, this.wp.x, this.wp.y) < 120 * 120) this.registerWp(); // 지나가며 닿으면 등록
    let near = null; for (const it of this.interactables()) if (dist2(L.x, L.y, it.x, it.y) < 85 * 85) near = it;
    this.nearby = near;
    if (near) { this.actBtn.classList.remove('hidden'); this.actBtn.innerHTML = near.label; } else this.actBtn.classList.add('hidden');
  },
  startFight(k) {
    const run = Game.run;
    run.world.pos = { x: this.leader.x - 60, y: this.leader.y }; run.world.at = 'resume'; run.world.fighting = k.id;
    Sfx.play('charge');
    Game.go('battle', { node: { stage: this.Z.stage, row: 0, type: 'battle', waves: k.waves, small: true, world: { zone: this.zi, pack: k.id }, worldScale: this.Z.scale } });
  },
  // ------------------------------------------------------------ 그리기
  render(ctx) {
    const t = this.t, cam = this.cam, Z = this.Z, L = this.leader, run = Game.run;
    ctx.save(); ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    ctx.fillStyle = Z.ground[0]; ctx.fillRect(cam.x - 10, cam.y - 10, 980, 560);
    for (const b of this.blobs) { if (b.x < cam.x - 80 || b.x > cam.x + 1040) continue; ctx.fillStyle = Z.ground[b.c]; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.rx, b.ry, 0, 0, Math.PI * 2); ctx.fill(); }
    // 길 (서 → 동)
    ctx.strokeStyle = Z.deco === 'tree' ? '#9aa680' : Z.deco === 'rock' ? '#a89a70' : Z.deco === 'deadtree' ? '#5e6a5a' : '#6e5650'; ctx.lineWidth = 64; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 480); for (let x = 0; x <= Z.w; x += 200) ctx.lineTo(x, 480 + Math.sin(x * 0.004) * 30); ctx.stroke();
    // 웨이포인트
    const W = this.wp, on = waypointOn(Game.profile, Z.key);
    ctx.fillStyle = '#6a6a7a'; ctx.beginPath(); ctx.ellipse(W.x, W.y, 48, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a8a9a'; ctx.beginPath(); ctx.ellipse(W.x, W.y - 4, 42, 15, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = on ? `rgba(120,200,255,${0.8 - i * 0.2})` : 'rgba(180,180,200,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(W.x, W.y - 6, 30 - i * 8, 10 - i * 3, 0, t * 2 + i, t * 2 + i + 4.5); ctx.stroke(); }
    if (on) { const g = ctx.createRadialGradient(W.x, W.y - 30, 4, W.x, W.y - 30, 70); g.addColorStop(0, 'rgba(130,210,255,0.5)'); g.addColorStop(1, 'rgba(130,210,255,0)'); ctx.fillStyle = g; ctx.fillRect(W.x - 70, W.y - 100, 140, 140); }
    // 장식·적·영웅 깊이 정렬
    const objs = [];
    for (const d of this.decos) if (d.x > cam.x - 120 && d.x < cam.x + 1080) objs.push({ y: d.y, draw: () => this.drawDeco(ctx, d, t) });
    objs.push({ y: this.gate.y + 40, draw: () => this.drawGate(ctx, this.gate.x, this.gate.y, t) });
    for (const pt of this.posts) if (pt.x > cam.x - 200 && pt.x < cam.x + 1160) objs.push({ y: pt.y + 30, draw: () => this.drawPost(ctx, pt, t) });
    for (const k of this.packs) objs.push({ y: k.y, draw: () => k.waves[0].slice(0, 3).forEach((id, j) => { const ex = k.x + (j - 1) * 30, ey = k.y + (j % 2) * 12; FieldScene.shadow(ctx, ex, ey, 12); drawSprite(ctx, ENEMIES[id].sprite, ex, ey, { scale: ENEMIES[id].size > 1.3 ? 1.5 : 1.8, t, flip: L.x < k.x, phase: j + k.ph }); }) });
    this.followers.forEach((f) => objs.push({ y: f.y, draw: () => FieldScene.drawWalker.call(this, ctx, f.id, f, t, false) }));
    objs.push({ y: L.y, draw: () => FieldScene.drawWalker.call(this, ctx, partyIds(run)[0], L, t, true) });
    objs.sort((a, b) => a.y - b.y); for (const o of objs) o.draw();
    for (const d of this.dusts) { ctx.fillStyle = `rgba(220,215,190,${0.5 * (1 - d.t / 0.5)})`; ctx.beginPath(); ctx.arc(d.x, d.y - d.t * 10, 3 + d.t * 8, 0, Math.PI * 2); ctx.fill(); }
    // 표지
    ctx.textAlign = 'center'; ctx.font = 'bold 14px sans-serif';
    for (const it of this.interactables()) {
      const near = this.nearby && this.nearby.key === it.key, bob = Math.sin(t * 4) * 3, ly = it.key === 'gate' ? it.y - 190 : it.key.startsWith('post') ? it.y + 34 : it.y - 64; // 거점 이름은 목책 아래 (위쪽은 화면 밖이 되기 쉽다)
      ctx.fillStyle = near ? '#ffd34a' : 'rgba(255,255,255,0.88)'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(it.label, it.x, ly + bob); ctx.fillText(it.label, it.x, ly + bob);
    }
    for (const k of this.packs) { ctx.fillStyle = '#ff8a7a'; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.font = 'bold 12px sans-serif'; const n = k.waves[0].map((id) => enemyLabel(Game.profile, id)); const lbl = n[0] + (n.length > 1 ? ` 외 ${n.length - 1}` : ''); ctx.strokeText(lbl, k.x, k.y - 72); ctx.fillText(lbl, k.x, k.y - 72); }
    if (this.tapMark) { const k = this.tapMark.t / 0.6; ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(this.tapMark.x, this.tapMark.y, 10 + k * 14, 5 + k * 7, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    if (Z.tint) { ctx.fillStyle = Z.tint; ctx.fillRect(0, 0, 960, 540); }
    const vg = ctx.createRadialGradient(480, 270, 250, 480, 270, 620); vg.addColorStop(0, 'rgba(0,10,20,0)'); vg.addColorStop(1, 'rgba(0,10,20,0.5)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, 960, 540);
    // 지역 진행 막대
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(330, 508, 300, 8); ctx.fillStyle = '#ffd34a'; ctx.fillRect(330, 508, 300 * L.x / Z.w, 8);
    const jb = this.joyBase();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(jb.x, jb.y, 62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = this.joy ? 'rgba(255,230,150,0.75)' : 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.arc(jb.x + (this.joy ? this.joy.dx : 0), jb.y + (this.joy ? this.joy.dy : 0), 28, 0, Math.PI * 2); ctx.fill();
  },
  drawDeco(ctx, d, t) {
    const { x, y, s, v } = d, k = this.Z.deco;
    if (k === 'tree') { FieldScene.drawTrunk(ctx, x, y, s); FieldScene.drawCanopy(ctx, x, y, s, t); return; }
    if (k === 'rock') { ctx.fillStyle = '#6a6458'; ctx.beginPath(); ctx.ellipse(x, y - 10 * s, 30 * s, 22 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#857e70'; ctx.beginPath(); ctx.ellipse(x - 6 * s, y - 16 * s, 18 * s, 12 * s, 0, 0, Math.PI * 2); ctx.fill(); return; }
    if (k === 'deadtree') { ctx.strokeStyle = '#2e2a26'; ctx.lineWidth = 7 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 70 * s); ctx.lineTo(x - 22 * s, y - 100 * s); ctx.moveTo(x, y - 55 * s); ctx.lineTo(x + 26 * s, y - 86 * s); ctx.stroke();
      ctx.fillStyle = `rgba(190,210,220,${0.08 + 0.05 * Math.sin(t + v * 9)})`; ctx.beginPath(); ctx.ellipse(x, y - 20, 70 * s, 20 * s, 0, 0, Math.PI * 2); ctx.fill(); return; }
    // spire: 검은 바위 첨탑 + 용암 빛
    ctx.fillStyle = '#2a2020'; ctx.beginPath(); ctx.moveTo(x - 20 * s, y); ctx.lineTo(x - 4 * s, y - 90 * s); ctx.lineTo(x + 6 * s, y - 60 * s); ctx.lineTo(x + 20 * s, y); ctx.fill();
    ctx.fillStyle = `rgba(255,110,40,${0.25 + 0.15 * Math.sin(t * 2 + v * 7)})`; ctx.beginPath(); ctx.ellipse(x, y + 2, 26 * s, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
  },
  // 거점: 목책 + 건물(망루/천막/요새) + 깃발 (적: 붉은 깃발 · 지키는 적 / 우리: 푸른 깃발 / 습격: 불길)
  drawPost(ctx, pt, t) {
    const st = this.postStatus(pt.i), x = pt.x, y = pt.y;
    FieldScene.shadow(ctx, x, y + 26, 90);
    ctx.fillStyle = '#5a3f28'; for (let a = 0; a < 14; a++) { const ang = Math.PI * (0.05 + a / 13 * 0.9), px = x + Math.cos(ang) * 92, py = y + 22 + Math.sin(ang) * 26; ctx.fillRect(px - 4, py - 26, 8, 26); ctx.beginPath(); ctx.moveTo(px - 4, py - 26); ctx.lineTo(px, py - 34); ctx.lineTo(px + 4, py - 26); ctx.fill(); }
    if (pt.i === 0) { ctx.fillStyle = '#6b4a2e'; ctx.fillRect(x - 26, y - 90, 8, 110); ctx.fillRect(x + 18, y - 90, 8, 110); ctx.fillStyle = '#7d5a38'; ctx.fillRect(x - 34, y - 110, 68, 26); ctx.fillStyle = '#4e3520'; ctx.beginPath(); ctx.moveTo(x - 40, y - 108); ctx.lineTo(x, y - 140); ctx.lineTo(x + 40, y - 108); ctx.fill(); }
    else if (pt.i === 1) { ctx.fillStyle = st === 'ours' ? '#4a6a9a' : '#8a4a3a'; ctx.beginPath(); ctx.moveTo(x - 50, y + 10); ctx.lineTo(x, y - 70); ctx.lineTo(x + 50, y + 10); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.moveTo(x - 12, y + 10); ctx.lineTo(x, y - 30); ctx.lineTo(x + 12, y + 10); ctx.fill(); }
    else { ctx.fillStyle = '#7a7470'; ctx.fillRect(x - 46, y - 70, 92, 84); ctx.fillStyle = '#8e8884'; for (let k = -2; k <= 2; k++) ctx.fillRect(x + k * 20 - 7, y - 84, 14, 16); ctx.fillStyle = '#2a2224'; ctx.beginPath(); ctx.moveTo(x - 16, y + 14); ctx.lineTo(x - 16, y - 18); ctx.quadraticCurveTo(x, y - 34, x + 16, y - 18); ctx.lineTo(x + 16, y + 14); ctx.fill(); }
    const fx = x + (pt.i === 1 ? 0 : 0), fy = pt.i === 0 ? y - 140 : pt.i === 1 ? y - 70 : y - 84;
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(fx - 2, fy - 50, 4, 52);
    const col = st === 'ours' ? '#4a8ae0' : st === 'contested' ? '#e08a2a' : '#c03a30', wv = Math.sin(t * 4 + pt.i) * 4;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(fx + 2, fy - 50); ctx.quadraticCurveTo(fx + 20, fy - 46 + wv, fx + 38, fy - 42); ctx.lineTo(fx + 2, fy - 30); ctx.fill();
    if (st === 'contested') for (let k = 0; k < 5; k++) { const fl = (t * 1.4 + k * 0.37) % 1, ex = x - 60 + k * 30, ey = y - 10 - fl * 50; ctx.fillStyle = `rgba(255,${140 - fl * 90},40,${0.8 * (1 - fl)})`; ctx.beginPath(); ctx.arc(ex + Math.sin(t * 5 + k) * 4, ey, 9 * (1 - fl) + 3, 0, Math.PI * 2); ctx.fill(); }
    if (st !== 'ours') { const ids = postWaves(this.zi, pt.i, makeRng(hashSeed(this.Z.key, pt.i)))[0].slice(0, 2); ids.forEach((id, j) => { const ex = x + (j ? 48 : -48), ey = y + 48; FieldScene.shadow(ctx, ex, ey, 12); drawSprite(ctx, ENEMIES[id].sprite, ex, ey, { scale: ENEMIES[id].size > 1.3 ? 1.4 : 1.7, t, flip: j === 1, phase: j + pt.i }); }); }
    else if (st === 'ours') { const g = ctx.createRadialGradient(x, y, 10, x, y, 110); g.addColorStop(0, 'rgba(120,180,255,0.18)'); g.addColorStop(1, 'rgba(120,180,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - 110, y - 110, 220, 220); }
  },
  drawGate(ctx, x, y, t) {
    const S = DUNGEON_SITES[this.Z.site], open = !S.unlock || S.unlock(Game.profile);
    ctx.fillStyle = '#3a3438'; ctx.beginPath(); ctx.moveTo(x - 110, y + 40); ctx.quadraticCurveTo(x - 100, y - 120, x, y - 140); ctx.quadraticCurveTo(x + 100, y - 120, x + 110, y + 40); ctx.fill();
    ctx.fillStyle = '#121014'; ctx.beginPath(); ctx.moveTo(x - 60, y + 40); ctx.quadraticCurveTo(x - 56, y - 70, x, y - 80); ctx.quadraticCurveTo(x + 56, y - 70, x + 60, y + 40); ctx.fill();
    const col = { cave: '120,220,120', mine: '230,170,80', crypt: '130,170,255', abyss: '255,90,50' }[this.Z.site];
    const g = ctx.createRadialGradient(x, y - 10, 4, x, y - 10, 90); g.addColorStop(0, `rgba(${col},${open ? 0.45 + 0.15 * Math.sin(t * 3) : 0.12})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.fillRect(x - 90, y - 100, 180, 180);
    if (!open) { ctx.strokeStyle = '#8a7a6a'; ctx.lineWidth = 6; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 22, y - 60); ctx.lineTo(x + i * 22, y + 40); ctx.stroke(); } }
  },
};
