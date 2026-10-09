// ===== 08_field.js : 마을 (쿼터뷰 숲속 마을 광장: 대장간·보관함·원정 포털) =====
const FIELD = {
  W: 1600, H: 1000,
  start: { x: 520, y: 640 },
  portal: { x: 1290, y: 300, r: 60 },
  guide: { x: 760, y: 560 },
  chest: { x: 610, y: 470 },
  trees: [[260, 300, 1.3], [180, 720, 1.0], [980, 210, 1.5], [1460, 640, 1.2], [1180, 820, 1.0], [420, 900, 0.9], [80, 470, 1.1], [1520, 220, 1.0], [880, 900, 1.1]],
  houses: [[420, 330, 0], [960, 430, 1]],
  well: { x: 700, y: 700 },
  smith: { x: 430, y: 540 },
  storage: { x: 930, y: 610 },
  altar: { x: 1130, y: 560 },
  huntExit: { x: 190, y: 925 },
  merchant: { x: 548, y: 712 },     // 잡화점 상인 (광장 남서쪽)
};

const FieldScene = {
  enter(params) {
    const run = Game.run;
    this.t = 0;
    const st = params && params.from === 'hunt' ? { x: FIELD.huntExit.x + 90, y: FIELD.huntExit.y - 70 } : FIELD.start;
    this.leader = { x: st.x, y: st.y, flip: false, moving: false };
    this.trail = [];
    for (let i = 0; i < 200; i++) this.trail.push({ x: this.leader.x - i * 1.5, y: this.leader.y + i * 0.5 });
    this.rebuildParty();
    this.target = null;
    this.pendingInteract = null;
    this.joy = null;
    this.cam = { x: 0, y: 0 };
    this.tapMark = null;
    this.dusts = [];
    this.flies = [];
    for (let i = 0; i < 40; i++) this.flies.push({ x: Math.random() * FIELD.W, y: Math.random() * FIELD.H, p: Math.random() * 10, s: 0.5 + Math.random() });
    this.birds = [];
    this.birdTimer = 2;
    this.grass = [];
    const rng = makeRng(hashSeed('field-grass'));
    for (let i = 0; i < 380; i++) this.grass.push({ x: rng() * FIELD.W, y: rng() * FIELD.H, h: 6 + rng() * 8, c: rng() });
    this.flowers = [];
    for (let i = 0; i < 90; i++) this.flowers.push({ x: rng() * FIELD.W, y: rng() * FIELD.H, c: ['#ffd34a', '#f4a7a0', '#e8e8ff', '#c89af0'][Math.floor(rng() * 4)], p: rng() * 6 });
    this.obstacles = FIELD.trees.map(([x, y, s]) => ({ x, y, r: 26 * s }))
      .concat(FIELD.houses.map(([x, y]) => ({ x, y: y - 10, r: 70 })))
      .concat([{ x: FIELD.merchant.x, y: FIELD.merchant.y - 12, r: 46 }, { x: FIELD.well.x, y: FIELD.well.y, r: 34 }, { x: FIELD.smith.x + 34, y: FIELD.smith.y, r: 22 }, { x: FIELD.storage.x, y: FIELD.storage.y, r: 24 }, { x: FIELD.altar.x, y: FIELD.altar.y, r: 26 }]);
    this.buildGround();
    const ui = Game.ui;
    const top = el('div', 'f-top');
    top.appendChild(el('div', 'f-title', '🌲 숲속 마을'));
    const r = el('div', 'f-right');
    r.appendChild(btn('던전 입구로 ▶', 'primary small', () => this.autoMove('portal'), { id: 'btn-automove' }));
    r.appendChild(btn('🌾 사냥터', 'small', () => this.autoMove('hunt'), { id: 'btn-hunt' }));
    r.appendChild(btn('✨ 소환', 'small', () => openGacha(() => this.refreshRes()), { id: 'btn-gacha' }));
    r.appendChild(btn('🧑 캐릭터', 'small', () => openRoster({ onClose: () => this.refreshRes() }), { id: 'btn-roster' }));
    r.appendChild(btn('🎒 장비', 'small', () => openInventory({ onClose: () => this.refreshRes() }), { id: 'btn-inv' }));
    r.appendChild(btn('👥 파티 편성', 'small', () => openPartySelect(Game.run, () => this.rebuildParty()), { id: 'btn-party' }));
    r.appendChild(btn('⚙ 전략', 'small', () => openStrategyEditor(Game.run), { id: 'btn-f-strategy' }));
    top.appendChild(r);
    ui.appendChild(top);
    this.resBox = el('div', 'f-res');
    ui.appendChild(this.resBox);
    this.actBtn = btn('', 'primary f-act hidden', () => this.interact(this.nearby), { id: 'btn-interact' });
    ui.appendChild(this.actBtn);
    this.refreshRes();
    Game.hint('field');
  },

  rebuildParty() {
    const L = this.leader;
    this.followers = partyIds(Game.run).slice(1).map((id, i) => ({ id, x: L.x - 30 * (i + 1), y: L.y + 8, flip: false, moving: false }));
    if (this.resBox) this.refreshRes();
  },

  refreshRes() {
    const run = Game.run;
    const p = Game.profile;
    this.resBox.innerHTML = `<span>● ${p.gold}</span><span>💎 ${p.stones}</span><span>🎟 ${p.tickets}</span><span>🍞 ${run.food}</span><span>난이도 ${EQ.tierInfo(p.tier).name}</span><span>파티 ${partyIds(run).map((id) => HEROES[id].name).join('·')}</span>`;
  },

  interactables() {
    return [
      { key: 'portal', x: FIELD.portal.x, y: FIELD.portal.y + 40, label: '던전 입장' },
      { key: 'guide', x: FIELD.guide.x, y: FIELD.guide.y, label: '대화' },
      { key: 'chest', x: FIELD.chest.x, y: FIELD.chest.y, label: Game.run.gotSupply ? '빈 상자' : '열기' },
      { key: 'smith', x: FIELD.smith.x, y: FIELD.smith.y, label: '강화' },
      { key: 'storage', x: FIELD.storage.x, y: FIELD.storage.y, label: '장비' },
      { key: 'altar', x: FIELD.altar.x, y: FIELD.altar.y, label: '소환' },
      { key: 'hunt', x: FIELD.huntExit.x, y: FIELD.huntExit.y, label: '사냥터로' },
      { key: 'merchant', x: FIELD.merchant.x, y: FIELD.merchant.y, label: '거래' },
    ];
  },

  autoMove(key) {
    const it = this.interactables().find((i) => i.key === key);
    this.target = { x: it.x - 30, y: it.y + 30 };
    this.pendingInteract = key;
    this.tapMark = { x: this.target.x, y: this.target.y, t: 0 };
  },

  interact(it) {
    if (!it) return;
    this.target = null;
    this.pendingInteract = null;
    const run = Game.run;
    if (it.key === 'chest') {
      if (run.gotSupply) { Game.toast('상자가 비어 있어요'); return; }
      run.gotSupply = true;
      run.food += CONST.SUPPLY_BOX_FOOD;
      run.potions += 1;
      Sfx.play('coin');
      Game.toast(`보급 상자: 식량 +${CONST.SUPPLY_BOX_FOOD} · 회복약 +1`, 2200);
      this.refreshRes();
    } else if (it.key === 'smith') {
      openBlacksmith(() => this.refreshRes());
    } else if (it.key === 'altar') {
      openGacha(() => this.refreshRes());
    } else if (it.key === 'storage') {
      openInventory({ onClose: () => this.refreshRes() });
    } else if (it.key === 'merchant') {
      openMerchant(() => this.refreshRes());
    } else if (it.key === 'hunt') {
      const box = el('div', 'confirm-box');
      box.appendChild(el('div', 'modal-title', '어느 사냥터로 갈까요?'));
      const ids = partyIds(run), lv = Math.round(ids.reduce((a, id) => a + EQ.charLevel(Game.profile, id), 0) / Math.max(1, ids.length));
      box.appendChild(el('p', '', `파티 평균 캐릭터 Lv ${lv}`));
      const col = el('div', 'btn-col');
      for (const f of Object.values(HUNT_FIELDS)) {
        const tb = huntGradeTable(f.level, false).filter(([, p]) => p >= 0.001).map(([g, p]) => `${g} ${(p * 100).toFixed(p < 0.01 ? 1 : 0)}%`).join(' · ');
        col.appendChild(btn(`${f.name} <small>Lv ${f.level}${lv < f.level - 5 ? ' · <b class="warn">위험</b>' : ''} · 장신구 ${tb}</small>`, f.level <= lv + 5 ? 'primary' : '', () => { Game.closeModal(); Sfx.play('door'); refreshRunLoadout(run); Game.go('hunt', { field: f.id }); }, { id: 'hunt-go-' + f.id }));
      }
      col.appendChild(btn('취소', 'ghost', () => Game.closeModal(), { sfx: 'back', id: 'hunt-cancel' }));
      box.appendChild(col);
      Game.modal(box, { dim: true, closeOnBg: true });
    } else if (it.key === 'guide') {
      this.openGuide(0);
    } else if (it.key === 'portal') {
      const box = el('div', 'confirm-box');
      box.appendChild(el('div', 'modal-title', '고블린 굴에 들어갈까요?'));
      box.appendChild(this.tierPicker(() => this.interact(it)));
      box.appendChild(el('div', 'portal-party', partyIds(run).map((id) => `<span>${HEROES[id].name}<small>${HEROES[id].roleName}</small></span>`).join('')));
      box.appendChild(el('p', '', `파티 ${partyAlive(run).length}/${CONST.PARTY_SIZE}명 · 식량 ${run.food} · 회복약 ${run.potions} · 골드 ${run.gold}` + (run.gotSupply ? '' : '<br><b class="warn">보급 상자를 아직 열지 않았어요!</b>')));
      const row = el('div', 'btn-row');
      row.appendChild(btn('조금 더 둘러보기', 'ghost', () => Game.closeModal(), { sfx: 'back', id: 'portal-no' }));
      row.appendChild(btn('👥 편성', '', () => openPartySelect(run, () => { this.rebuildParty(); this.interact(it); }), { id: 'portal-party' }));
      row.appendChild(btn('입장 ▶', 'primary', () => { Game.closeModal(); Sfx.play('door'); run.tier = Game.profile.tier; refreshRunLoadout(run); enterDungeon(run); }, { id: 'portal-yes' }));
      box.appendChild(row);
      Game.modal(box, { dim: true, closeOnBg: true });
    }
  },

  // 난이도 선택: 보스를 잡으면 다음 단계 해금
  tierPicker(onChange) {
    const p = Game.profile;
    const wrap = el('div', 'tier-pick');
    for (let t = 0; t <= Math.min(p.unlockedTier, EQ.DB.tiers.length); t++) {
      const ti = EQ.tierInfo(t);
      const b = btn(`${ti.name}${t ? `<small>T${t}</small>` : ''}`, 'tier-btn' + (p.tier === t ? ' on' : ''), () => { p.tier = t; Game.run.tier = t; saveProfile(); this.refreshRes(); onChange(); }, { id: 'tier-' + t });
      wrap.appendChild(b);
    }
    const ti = EQ.tierInfo(p.tier);
    const ids = partyIds(Game.run), lv = Math.round(ids.reduce((a, id) => a + EQ.heroLevel(p, id), 0) / Math.max(1, ids.length)), dl = EQ.tierLevel(p.tier);
    const gap = lv - dl, gm = levelGapMult(gap);
    const gapTxt = gap === 0 ? '레벨 차 없음' : `레벨 차 ${gap > 0 ? '+' : ''}${gap}: 주는 피해 ${Math.round((gm.dealt - 1) * 100) >= 0 ? '+' : ''}${Math.round((gm.dealt - 1) * 100)}% · 받는 피해 ${Math.round((gm.taken - 1) * 100) >= 0 ? '+' : ''}${Math.round((gm.taken - 1) * 100)}%`;
    wrap.appendChild(el('div', 'tier-desc', `던전 Lv ${dl} · 파티 전투 Lv ${lv} (${gapTxt})<br>` + (p.tier ? `적 체력·공격력 ×${ti.hp} · 권장 장비 ${ti.recGrade}` : '기본 난이도') + (gap < 20 && !ids.some((id) => HEROES[id].role === 'tank') ? '<br><b class="warn">탱커 없이는 보스를 버티기 어려워요</b>' : '')));
    return wrap;
  },

  openGuide(page) {
    const pages = [
      { t: '어서 오게, 원정대.', b: '광장 북동쪽 동굴이 <b>고블린 굴</b>이라네. 가장 깊은 방에서 굴의 주인이 기다리지. 원정마다 다른 놈이 나오니 상대를 보고 동료를 고르게.<br><br>떠나기 전에 내 옆 <b>보급 상자</b>를 챙기게. 식량이 없으면 모닥불 앞에서도 제대로 쉴 수 없어.' },
      { t: '지도 읽는 법', b: '굴 안은 갈림길투성이야. <b>다음 방은 같은 줄이거나 바로 위·아래 줄</b>만 갈 수 있지. 방에 뭐가 있는지는 들어가 봐야 알아. 방 안 갈림길에서는 귀를 기울이면 단서가 들릴 걸세.<br><br>횃불은 방을 옮길 때마다 줄어든다네. 꺼지면 어둠 속에서 정예가 덮칠 수도 있어.' },
      { t: '전투 요령', b: '덩치 큰 놈들은 단단해서 칼이 잘 안 박혀. 놈이 힘을 모을 때 머리 위 <b>끊기 칸</b>을 여러 직업이 함께 채우면 끊기고 <b>흔들리지</b>. 그때 몰아쳐 <b>그로기</b>로 만들게.<br><br>보스의 주먹은 맞을수록 묵직해지니(<b>짓누름</b>) 탱커를 앞세우게. 쓰러진 동료는… 이번 원정에선 돌아오지 못하네.' },
    ];
    const p = pages[page];
    const box = el('div', 'dialog-box');
    const head = el('div', 'dlg-head');
    head.appendChild(portraitCanvas('guide', 56));
    head.appendChild(el('div', 'dlg-name', `길잡이 노인 <small>${page + 1}/${pages.length}</small>`));
    box.appendChild(head);
    box.appendChild(el('div', 'dlg-title', p.t));
    box.appendChild(el('div', 'dlg-body', p.b));
    const row = el('div', 'btn-row');
    row.appendChild(btn('닫기', 'ghost', () => Game.closeModal(), { sfx: 'back', id: 'guide-close' }));
    if (page < pages.length - 1) row.appendChild(btn('다음 ▶', 'primary', () => this.openGuide(page + 1), { id: 'guide-next' }));
    box.appendChild(row);
    Game.modal(box, { dim: true, closeOnBg: true });
  },

  // ------------------------------------------------------------ 입력
  joyBase() { return { x: 104, y: 432 }; },
  pointerDown(p) {
    Sfx.init();
    const jb = this.joyBase();
    if (dist2(p.x, p.y, jb.x, jb.y) < 95 * 95) {
      this.joy = { dx: 0, dy: 0 };
      this.target = null; this.pendingInteract = null;
      this.pointerMove(p);
      return;
    }
    const wx = p.x + this.cam.x, wy = p.y + this.cam.y;
    // 상호작용 대상을 탭하면 그쪽으로 걸어가서 실행
    for (const it of this.interactables()) {
      if (dist2(wx, wy, it.x, it.y - 30) < 55 * 55) { this.autoMove(it.key); return; }
    }
    this.target = { x: clamp(wx, 20, FIELD.W - 20), y: clamp(wy, 60, FIELD.H - 20) };
    this.pendingInteract = null;
    this.tapMark = { x: this.target.x, y: this.target.y, t: 0 };
  },
  pointerMove(p) {
    if (!this.joy) return;
    const jb = this.joyBase();
    let dx = p.x - jb.x, dy = p.y - jb.y;
    const d = Math.hypot(dx, dy);
    if (d > 56) { dx = dx / d * 56; dy = dy / d * 56; }
    this.joy.dx = dx; this.joy.dy = dy;
  },
  pointerUp() { this.joy = null; },

  // ------------------------------------------------------------ 진행
  update(dt) {
    this.t += dt;
    const L = this.leader;
    let vx = 0, vy = 0;
    const speed = 190;
    if (this.joy && (Math.abs(this.joy.dx) > 6 || Math.abs(this.joy.dy) > 6)) {
      vx = this.joy.dx / 56 * speed; vy = this.joy.dy / 56 * speed;
    } else if (this.target) {
      const dx = this.target.x - L.x, dy = this.target.y - L.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) {
        this.target = null;
        if (this.pendingInteract) { const it = this.interactables().find((i) => i.key === this.pendingInteract); this.pendingInteract = null; this.interact(it); }
      } else { vx = dx / d * speed; vy = dy / d * speed; }
    }
    if (Game.modalOpen) { vx = 0; vy = 0; }
    L.moving = vx !== 0 || vy !== 0;
    if (L.moving) {
      const ox = L.x, oy = L.y;
      L.x = clamp(L.x + vx * dt, 20, FIELD.W - 20);
      L.y = clamp(L.y + vy * dt, 60, FIELD.H - 20);
      for (const o of this.obstacles) {
        const d = Math.hypot(L.x - o.x, L.y - o.y);
        if (d < o.r + 12) { const k = (o.r + 12) / (d || 1); L.x = o.x + (L.x - o.x) * k; L.y = o.y + (L.y - o.y) * k; }
      }
      // 끼임 방지: 목표 이동 중 거의 못 움직이면 목표 해제
      if (this.target && Math.hypot(L.x - ox, L.y - oy) < speed * dt * 0.15) { this.stuck = (this.stuck || 0) + dt; if (this.stuck > 0.6) { this.target = null; this.stuck = 0; } } else this.stuck = 0;
      if (Math.abs(vx) > 5) L.flip = vx < 0;
      this.trail.unshift({ x: L.x, y: L.y });
      if (this.trail.length > 300) this.trail.pop();
      if (Math.random() < dt * 8) this.dusts.push({ x: L.x + (Math.random() - 0.5) * 10, y: L.y, t: 0 });
      Sfx.play('step');
    }
    // 뒤따르는 파티원
    this.followers.forEach((f, i) => {
      const idx = Math.min(this.trail.length - 1, (i + 1) * 14);
      const p = this.trail[idx];
      const dx = p.x - f.x, dy = p.y - f.y;
      const d = Math.hypot(dx, dy);
      f.moving = d > 2;
      if (Math.abs(dx) > 1) f.flip = dx < 0;
      f.x += dx * Math.min(1, dt * 10); f.y += dy * Math.min(1, dt * 10);
      if (f.moving && Math.random() < dt * 4) this.dusts.push({ x: f.x, y: f.y, t: 0 });
    });
    for (let i = this.dusts.length - 1; i >= 0; i--) { this.dusts[i].t += dt; if (this.dusts[i].t > 0.5) this.dusts.splice(i, 1); }
    // 새 그림자
    this.birdTimer -= dt;
    if (this.birdTimer <= 0) { this.birdTimer = 4 + Math.random() * 5; this.birds.push({ x: this.cam.x - 60, y: this.cam.y + 80 + Math.random() * 300, vx: 160 + Math.random() * 60, vy: 30 + Math.random() * 30, t: 0 }); }
    for (let i = this.birds.length - 1; i >= 0; i--) { const b = this.birds[i]; b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.t > 9) this.birds.splice(i, 1); }
    if (this.tapMark) { this.tapMark.t += dt; if (this.tapMark.t > 0.6) this.tapMark = null; }
    // 카메라
    const cx = clamp(L.x - 480, 0, FIELD.W - 960), cy = clamp(L.y - 300, 0, FIELD.H - 540);
    this.cam.x += (cx - this.cam.x) * Math.min(1, dt * 6);
    this.cam.y += (cy - this.cam.y) * Math.min(1, dt * 6);
    // 근처 상호작용
    let near = null;
    for (const it of this.interactables()) if (dist2(L.x, L.y, it.x, it.y) < 85 * 85) near = it;
    this.nearby = near;
    if (near) { this.actBtn.classList.remove('hidden'); this.actBtn.innerHTML = near.label; } else this.actBtn.classList.add('hidden');
  },

  // 땅은 한 번만 그려서 캐시
  buildGround() {
    const cv = document.createElement('canvas');
    cv.width = FIELD.W; cv.height = FIELD.H;
    const g = cv.getContext('2d');
    const rng = makeRng(hashSeed('ground'));
    g.fillStyle = '#2f8a6a'; g.fillRect(0, 0, FIELD.W, FIELD.H);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = ['#2a7e60', '#358f6e', '#3c9a74', '#287058'][Math.floor(rng() * 4)];
      g.beginPath(); g.ellipse(rng() * FIELD.W, rng() * FIELD.H, 20 + rng() * 60, 10 + rng() * 30, 0, 0, Math.PI * 2); g.fill();
    }
    // 흙길: 광장 → 포털
    g.strokeStyle = '#8a9a78'; g.lineCap = 'round'; g.lineWidth = 70;
    g.beginPath(); g.moveTo(640, 620); g.quadraticCurveTo(1000, 560, 1270, 360); g.stroke();
    g.strokeStyle = '#a3ae8a'; g.lineWidth = 50; g.stroke();
    g.lineWidth = 50; g.strokeStyle = '#a3ae8a';
    g.beginPath(); g.moveTo(640, 620); g.quadraticCurveTo(400, 700, 200, 980); g.stroke();
    // 광장 돌바닥
    g.fillStyle = '#9a9a8a'; g.beginPath(); g.ellipse(660, 600, 230, 150, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#b4b2a0'; g.beginPath(); g.ellipse(660, 596, 220, 142, 0, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 260; i++) {
      const a = rng() * Math.PI * 2, r = Math.sqrt(rng());
      const x = 660 + Math.cos(a) * 205 * r, y = 596 + Math.sin(a) * 130 * r;
      g.fillStyle = rng() < 0.5 ? '#a6a492' : '#c2c0ae';
      g.fillRect(Math.round(x), Math.round(y), 14, 8);
    }
    // 절벽 + 동굴
    g.fillStyle = '#4a5560';
    g.beginPath(); g.moveTo(1100, 0); g.lineTo(1600, 0); g.lineTo(1600, 380); g.lineTo(1420, 360); g.lineTo(1360, 330); g.lineTo(1200, 340); g.lineTo(1120, 240); g.closePath(); g.fill();
    g.fillStyle = '#5c6874';
    g.beginPath(); g.moveTo(1110, 0); g.lineTo(1600, 0); g.lineTo(1600, 300); g.lineTo(1400, 290); g.lineTo(1180, 270); g.lineTo(1130, 200); g.closePath(); g.fill();
    g.fillStyle = '#1a1424';
    g.beginPath(); g.ellipse(FIELD.portal.x, FIELD.portal.y + 10, 66, 76, 0, Math.PI, 0); g.lineTo(FIELD.portal.x + 66, FIELD.portal.y + 40); g.lineTo(FIELD.portal.x - 66, FIELD.portal.y + 40); g.fill();
    this.groundCv = cv;
  },

  render(ctx) {
    const t = this.t;
    const cam = this.cam;
    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    ctx.drawImage(this.groundCv, 0, 0);
    // 포털 소용돌이
    const P = FIELD.portal;
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(${170 + i * 15},${110 + i * 20},255,${0.7 - i * 0.1})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(P.x, P.y + 4, 46 - i * 8, 56 - i * 9, 0, t * (1 + i * 0.4), t * (1 + i * 0.4) + 4.4); ctx.stroke();
    }
    const pg = ctx.createRadialGradient(P.x, P.y, 5, P.x, P.y, 120);
    pg.addColorStop(0, 'rgba(190,140,255,0.45)'); pg.addColorStop(1, 'rgba(190,140,255,0)');
    ctx.fillStyle = pg; ctx.fillRect(P.x - 120, P.y - 120, 240, 240);
    // 꽃
    for (const f of this.flowers) {
      const sw = Math.sin(t * 2 + f.p) * 1.5;
      ctx.fillStyle = '#2a6a4a'; ctx.fillRect(f.x, f.y - 6, 2, 6);
      ctx.fillStyle = f.c; ctx.fillRect(f.x - 2 + sw, f.y - 10, 5, 5);
    }
    // 풀 (흔들림)
    for (const gr of this.grass) {
      if (gr.x < cam.x - 20 || gr.x > cam.x + 980 || gr.y < cam.y - 20 || gr.y > cam.y + 560) continue;
      const sw = Math.sin(t * 2.2 + gr.x * 0.05) * 3;
      ctx.strokeStyle = gr.c < 0.5 ? '#4fb07e' : '#3c9a6a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(gr.x, gr.y); ctx.quadraticCurveTo(gr.x + sw * 0.4, gr.y - gr.h * 0.6, gr.x + sw, gr.y - gr.h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gr.x + 3, gr.y); ctx.quadraticCurveTo(gr.x + 3 + sw * 0.3, gr.y - gr.h * 0.4, gr.x + 5 + sw, gr.y - gr.h * 0.75); ctx.stroke();
    }
    // 먼지
    for (const d of this.dusts) { ctx.fillStyle = `rgba(220,215,190,${0.5 * (1 - d.t / 0.5)})`; ctx.beginPath(); ctx.arc(d.x, d.y - d.t * 10, 3 + d.t * 8, 0, Math.PI * 2); ctx.fill(); }
    // 깊이 정렬 객체
    const objs = [];
    const run = Game.run;
    const L = this.leader;
    for (const [x, y, s] of FIELD.trees) objs.push({ y, draw: () => this.drawTrunk(ctx, x, y, s) });
    for (const [x, y, v] of FIELD.houses) objs.push({ y, draw: () => this.drawHouse(ctx, x, y, v) });
    objs.push({ y: FIELD.well.y, draw: () => this.drawWell(ctx, FIELD.well.x, FIELD.well.y) });
    objs.push({ y: FIELD.chest.y, draw: () => this.drawChest(ctx, FIELD.chest.x, FIELD.chest.y, run.gotSupply) });
    objs.push({ y: FIELD.smith.y, draw: () => this.drawSmith(ctx, FIELD.smith.x, FIELD.smith.y, t, L) });
    objs.push({ y: FIELD.storage.y, draw: () => this.drawStorage(ctx, FIELD.storage.x, FIELD.storage.y) });
    objs.push({ y: FIELD.altar.y, draw: () => this.drawAltar(ctx, FIELD.altar.x, FIELD.altar.y, t) });
    objs.push({ y: FIELD.merchant.y, draw: () => { const M = FIELD.merchant;
      ctx.fillStyle = '#6a4428'; ctx.fillRect(M.x - 56, M.y - 26, 112, 26); ctx.fillStyle = '#8a5a34'; ctx.fillRect(M.x - 56, M.y - 30, 112, 6);
      for (let i = 0; i < 4; i++) { ctx.fillStyle = ['#e0524a', '#5aa0e0', '#9cf0a8', '#ffd34a'][i]; ctx.beginPath(); ctx.arc(M.x - 38 + i * 24, M.y - 36, 6, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#c84a3a'; ctx.beginPath(); ctx.moveTo(M.x - 66, M.y - 92); ctx.lineTo(M.x + 66, M.y - 92); ctx.lineTo(M.x + 58, M.y - 70); ctx.lineTo(M.x - 58, M.y - 70); ctx.fill();
      ctx.fillStyle = '#f0e0c0'; for (let i = 0; i < 6; i++) ctx.fillRect(M.x - 58 + i * 22, M.y - 92, 11, 22);
      ctx.fillStyle = '#5a3a20'; ctx.fillRect(M.x - 58, M.y - 70, 5, 44); ctx.fillRect(M.x + 53, M.y - 70, 5, 44);
      this.shadow(ctx, M.x + 34, M.y - 4, 14); drawSprite(ctx, 'merchant', M.x + 34, M.y - 4, { scale: 2, t, flip: L.x < M.x, blinking: (t % 3.7) < 0.12 }); } });
    objs.push({ y: FIELD.huntExit.y, draw: () => { const H = FIELD.huntExit; ctx.fillStyle = '#6a4a2a'; ctx.fillRect(H.x + 40, H.y - 56, 7, 56); ctx.fillStyle = '#a07a4a'; ctx.fillRect(H.x + 4, H.y - 66, 80, 22); ctx.strokeStyle = '#4a3018'; ctx.lineWidth = 2; ctx.strokeRect(H.x + 4, H.y - 66, 80, 22); ctx.fillStyle = '#fff4d8'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('사냥터 ▼', H.x + 44, H.y - 50); } });
    objs.push({ y: FIELD.guide.y, draw: () => { this.shadow(ctx, FIELD.guide.x, FIELD.guide.y, 16); drawSprite(ctx, 'guide', FIELD.guide.x, FIELD.guide.y, { scale: 2, t, flip: L.x < FIELD.guide.x, blinking: (t % 4) < 0.12 }); } });
    this.followers.forEach((f) => {
      const h = HEROES[f.id];
      objs.push({ y: f.y, draw: () => this.drawWalker(ctx, f.id, f, t, false) });
    });
    objs.push({ y: L.y, draw: () => this.drawWalker(ctx, partyIds(run)[0], L, t, true) });
    objs.sort((a, b) => a.y - b.y);
    for (const o of objs) o.draw();
    // 상호작용 표시
    for (const it of this.interactables()) {
      const near = this.nearby === it || (this.nearby && this.nearby.key === it.key);
      const bob = Math.sin(t * 4) * 3;
      if (it.key === 'chest' && run.gotSupply) continue;
      ctx.fillStyle = near ? '#ffd34a' : 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      const label = { portal: '고블린 굴', guide: '길잡이', chest: '보급 상자', smith: '대장간', storage: '보관함', altar: '소환의 제단', merchant: '잡화점', hunt: `사냥터 (Lv ${Object.values(HUNT_FIELDS).map((f) => f.level).join('·')})` }[it.key];
      const ly = it.key === 'portal' ? it.y - 150 : it.y - 62;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.strokeText(label, it.x, ly + bob); ctx.fillText(label, it.x, ly + bob);
      if (it.key !== 'portal') { ctx.fillText('▼', it.x, ly + 14 + bob); }
    }
    // 탭 마커
    if (this.tapMark) { const k = this.tapMark.t / 0.6; ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(this.tapMark.x, this.tapMark.y, 10 + k * 14, 5 + k * 7, 0, 0, Math.PI * 2); ctx.stroke(); }
    // 나무 그늘 (캐노피) — 캐릭터 위에 덮인다
    for (const [x, y, s] of FIELD.trees) this.drawCanopy(ctx, x, y, s, t);
    // 새 그림자
    for (const b of this.birds) {
      ctx.fillStyle = 'rgba(10,30,30,0.25)';
      const flap = Math.sin(b.t * 12) * 6;
      ctx.beginPath(); ctx.moveTo(b.x - 14, b.y + flap); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x + 14, b.y + flap); ctx.lineTo(b.x, b.y + 5); ctx.fill();
    }
    // 반딧불
    for (const f of this.flies) {
      const x = f.x + Math.sin(t * 0.7 * f.s + f.p) * 30, y = f.y + Math.cos(t * 0.5 * f.s + f.p * 2) * 20;
      const a = 0.4 + 0.4 * Math.sin(t * 3 * f.s + f.p);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
      g.addColorStop(0, `rgba(230,255,140,${a})`); g.addColorStop(1, 'rgba(230,255,140,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 9, y - 9, 18, 18);
    }
    ctx.restore();
    // 숲 비네트
    const vg = ctx.createRadialGradient(480, 270, 250, 480, 270, 620);
    vg.addColorStop(0, 'rgba(0,20,30,0)'); vg.addColorStop(1, 'rgba(0,20,30,0.45)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, 960, 540);
    // 조이스틱
    const jb = this.joyBase();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(jb.x, jb.y, 62, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
    const kx = jb.x + (this.joy ? this.joy.dx : 0), ky = jb.y + (this.joy ? this.joy.dy : 0);
    ctx.fillStyle = this.joy ? 'rgba(255,230,150,0.75)' : 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.arc(kx, ky, 28, 0, Math.PI * 2); ctx.fill();
  },

  shadow(ctx, x, y, r) { ctx.fillStyle = 'rgba(0,30,20,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 2, r, r * 0.4, 0, 0, Math.PI * 2); ctx.fill(); },

  drawWalker(ctx, heroId, w, t, isLeader) {
    const sprite = HEROES[heroId].sprite;
    const bob = w.moving ? Math.abs(Math.sin(t * 12 + w.x * 0.01)) * 3 : 0;
    this.shadow(ctx, w.x, w.y, 16);
    if (isLeader) {
      ctx.strokeStyle = '#7dff8a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(w.x, w.y + 2, 22 + Math.sin(t * 5) * 1.5, 9, 0, 0, Math.PI * 2); ctx.stroke();
    }
    drawSprite(ctx, sprite, w.x, w.y - bob, { scale: 2, t, flip: w.flip, anim: w.moving ? 'walk' : 'idle', phase: w.x * 0.01, blinking: ((t + w.x * 0.003) % 3.4) < 0.12, squash: w.moving ? 1 + Math.sin(t * 24) * 0.03 : 1 });
  },
  // 대장간: 모루 + 화로 + 대장장이 (임시로 길잡이 스프라이트 사용)
  drawSmith(ctx, x, y, t, L) {
    this.shadow(ctx, x + 34, y, 26);
    ctx.fillStyle = '#5a4a44'; ctx.fillRect(x - 70, y - 60, 40, 56);           // 화로
    ctx.fillStyle = '#2a1e1a'; ctx.fillRect(x - 64, y - 40, 28, 22);
    const fl = 0.6 + Math.sin(t * 9) * 0.25 + Math.sin(t * 13) * 0.15;
    const g = ctx.createRadialGradient(x - 50, y - 30, 2, x - 50, y - 30, 40);
    g.addColorStop(0, `rgba(255,170,60,${fl})`); g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 100, y - 70, 100, 80);
    ctx.fillStyle = '#ffb040'; ctx.fillRect(x - 60, y - 32, 20, 10);
    ctx.fillStyle = '#3c3c46'; ctx.fillRect(x + 20, y - 24, 30, 10); ctx.fillRect(x + 28, y - 14, 14, 14); ctx.fillRect(x + 22, y, 26, 4); // 모루
    ctx.fillStyle = '#5c5c6a'; ctx.fillRect(x + 20, y - 24, 30, 3);
    if ((t % 1.4) < 0.08) { ctx.fillStyle = '#fff2a0'; for (let i = 0; i < 5; i++) ctx.fillRect(x + 34 + Math.cos(i) * 10, y - 30 - Math.sin(i * 2) * 8, 2, 2); }
    drawSprite(ctx, 'guide', x, y, { scale: 2, t, flip: L.x < x, blinking: (t % 3.7) < 0.12 });
  },
  drawAltar(ctx, x, y, t) {
    this.shadow(ctx, x, y, 30);
    ctx.fillStyle = '#6a6478'; ctx.fillRect(x - 26, y - 22, 52, 22); ctx.fillStyle = '#8a8498'; ctx.fillRect(x - 30, y - 28, 60, 8);
    const by = y - 58 + Math.sin(t * 2) * 4;
    const g = ctx.createRadialGradient(x, by, 2, x, by, 46);
    g.addColorStop(0, `rgba(200,160,255,${0.55 + Math.sin(t * 3) * 0.15})`); g.addColorStop(1, 'rgba(200,160,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 50, by - 50, 100, 100);
    ctx.fillStyle = '#d8c0ff'; ctx.beginPath(); ctx.moveTo(x, by - 18); ctx.lineTo(x + 10, by); ctx.lineTo(x, by + 18); ctx.lineTo(x - 10, by); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(x, by - 14); ctx.lineTo(x + 4, by - 2); ctx.lineTo(x - 3, by); ctx.closePath(); ctx.fill();
  },
  drawStorage(ctx, x, y) {
    this.shadow(ctx, x, y, 26);
    ctx.fillStyle = '#4a3a6a'; ctx.fillRect(x - 26, y - 34, 52, 34);
    ctx.fillStyle = '#6a5a9a'; ctx.fillRect(x - 28, y - 42, 56, 12);
    ctx.fillStyle = '#f0c860'; ctx.fillRect(x - 4, y - 32, 8, 10); ctx.fillRect(x - 26, y - 20, 52, 3);
  },
  drawTrunk(ctx, x, y, s) {
    ctx.fillStyle = 'rgba(0,30,20,0.3)'; ctx.beginPath(); ctx.ellipse(x + 10, y + 4, 34 * s, 12 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3326'; ctx.fillRect(x - 12 * s, y - 150 * s, 24 * s, 150 * s);
    ctx.fillStyle = '#5e4232'; ctx.fillRect(x - 12 * s, y - 150 * s, 8 * s, 150 * s);
    ctx.fillStyle = '#3a271c';
    for (let i = 0; i < 6; i++) ctx.fillRect(x - 6 * s + (i % 2) * 8 * s, y - 140 * s + i * 22 * s, 6 * s, 10 * s);
  },
  drawCanopy(ctx, x, y, s, t) {
    const sw = Math.sin(t * 0.8 + x) * 3 * s;
    const cy = y - 170 * s;
    ctx.fillStyle = 'rgba(0,25,30,0.28)';
    ctx.beginPath(); ctx.ellipse(x + 60 * s, y + 10, 120 * s, 50 * s, 0, 0, Math.PI * 2); ctx.fill();
    const blobs = [[-50, 10, 60], [40, 20, 64], [0, -30, 70], [-20, 40, 56], [60, -20, 50], [-70, -20, 44]];
    for (const [bx, by, r] of blobs) { ctx.fillStyle = '#1f5a50'; ctx.beginPath(); ctx.arc(x + bx * s + sw, cy + by * s + 6, r * s, 0, Math.PI * 2); ctx.fill(); }
    for (const [bx, by, r] of blobs) { ctx.fillStyle = '#2c7462'; ctx.beginPath(); ctx.arc(x + bx * s + sw - 6, cy + by * s - 4, r * s * 0.8, 0, Math.PI * 2); ctx.fill(); }
    for (const [bx, by, r] of blobs) { ctx.fillStyle = '#3f8f72'; ctx.beginPath(); ctx.arc(x + bx * s + sw - 14, cy + by * s - 14, r * s * 0.42, 0, Math.PI * 2); ctx.fill(); }
  },
  drawHouse(ctx, x, y, v) {
    ctx.fillStyle = 'rgba(0,30,20,0.3)'; ctx.fillRect(x - 70, y - 6, 150, 18);
    ctx.fillStyle = v ? '#d8c8a8' : '#e4d4b0'; ctx.fillRect(x - 64, y - 90, 128, 90);
    ctx.fillStyle = '#6e4a32'; for (const dx of [-64, -4, 58]) ctx.fillRect(x + dx, y - 90, 6, 90);
    ctx.fillStyle = '#5a3a28'; ctx.fillRect(x - 14, y - 46, 28, 46);
    ctx.fillStyle = '#ffd88a'; ctx.fillRect(x - 46, y - 64, 20, 18); ctx.fillRect(x + 26, y - 64, 20, 18);
    ctx.fillStyle = v ? '#8a3a32' : '#3a5a8a';
    ctx.beginPath(); ctx.moveTo(x - 84, y - 86); ctx.lineTo(x, y - 150); ctx.lineTo(x + 84, y - 86); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.moveTo(x, y - 150); ctx.lineTo(x + 84, y - 86); ctx.lineTo(x, y - 86); ctx.fill();
  },
  drawWell(ctx, x, y) {
    ctx.fillStyle = 'rgba(0,30,20,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 40, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a7a80'; ctx.fillRect(x - 32, y - 30, 64, 30);
    ctx.fillStyle = '#2a3a4a'; ctx.beginPath(); ctx.ellipse(x, y - 30, 32, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5e4024'; ctx.fillRect(x - 30, y - 80, 6, 50); ctx.fillRect(x + 24, y - 80, 6, 50);
    ctx.fillStyle = '#8a3a32'; ctx.beginPath(); ctx.moveTo(x - 40, y - 76); ctx.lineTo(x, y - 100); ctx.lineTo(x + 40, y - 76); ctx.fill();
  },
  drawChest(ctx, x, y, open) {
    this.shadow(ctx, x, y, 24);
    ctx.fillStyle = '#7a4e2a'; ctx.fillRect(x - 22, y - 26, 44, 26);
    ctx.fillStyle = '#d0a645'; ctx.fillRect(x - 22, y - 16, 44, 4); ctx.fillRect(x - 4, y - 20, 8, 10);
    ctx.fillStyle = '#2b1d16'; ctx.lineWidth = 2; ctx.strokeStyle = '#2b1d16'; ctx.strokeRect(x - 22, y - 26, 44, 26);
    if (open) { ctx.fillStyle = '#5e3a20'; ctx.fillRect(x - 22, y - 40, 44, 14); ctx.strokeRect(x - 22, y - 40, 44, 14); }
    else {
      ctx.fillStyle = '#8a5a34'; ctx.beginPath(); ctx.ellipse(x, y - 26, 22, 10, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
      const a = 0.4 + Math.sin(this.t * 4) * 0.3;
      ctx.fillStyle = `rgba(255,230,120,${a})`; ctx.fillRect(x - 2, y - 44, 4, 8);
    }
  },
};
