// ===== 09_scenes.js : 타이틀 / 전투 전 팝업 / 보상 / 이벤트 / 상점 / 휴식 / 고목 / 결과 / 전략 편집 =====

function randomSeed() { return (Math.random() * 1e9) >>> 0; }

// ---------------------------------------------------------------- 타이틀
const TitleScene = {
  enter() {
    this.t = 0;
    this.seed = randomSeed();
    const ui = Game.ui;
    const box = el('div', 'title-box');
    box.appendChild(el('div', 'title-logo', '숲속 원정대'));
    box.appendChild(el('div', 'title-sub', '고블린 굴의 주인들'));
    const col = el('div', 'btn-col');
    col.appendChild(btn('원정 시작', 'primary big', () => this.start(this.seed), { id: 'btn-start' }));
    const grid = el('div', 'title-grid'); // 보조 버튼은 2열
    grid.appendChild(btn('시드 입력', '', () => this.seedDialog(), { id: 'btn-seed' }));
    grid.appendChild(btn('규칙 안내', '', () => showRulesHelp(), { id: 'btn-title-help' }));
    grid.appendChild(btn(`새 소식 <small>v${GAME_VERSION}</small>`, '', () => showNews(), { id: 'btn-news' }));
    this.soundBtn = btn(`효과음: ${Game.settings.sound ? '켬' : '끔'}`, '', () => {
      Game.settings.sound = !Game.settings.sound; Sfx.enabled = Game.settings.sound; Game.saveSettings();
      this.soundBtn.innerHTML = `효과음: ${Game.settings.sound ? '켬' : '끔'}`;
    }, { id: 'btn-sound' });
    grid.appendChild(this.soundBtn);
    this.musicBtn = btn(`음악: ${Game.settings.music !== false ? '켬' : '끔'}`, '', () => {
      Game.settings.music = Game.settings.music === false; Music.setEnabled(Game.settings.music); Game.saveSettings();
      this.musicBtn.innerHTML = `음악: ${Game.settings.music ? '켬' : '끔'}`;
    }, { id: 'btn-music' });
    grid.appendChild(this.musicBtn);
    if (typeof SPRITE_SHEETS !== 'undefined' && Object.keys(SPRITE_SHEETS).length) {
      const q = () => `3D 에셋(보리): ${Game.settings.q3d ? '켬' : '끔'}`;
      this.q3dBtn = btn(q(), '', () => { Game.settings.q3d = !Game.settings.q3d; Game.saveSettings(); this.q3dBtn.innerHTML = q(); }, { id: 'btn-q3d' });
      grid.appendChild(this.q3dBtn);
    }
    col.appendChild(grid);
    box.appendChild(col);
    this.seedLabel = el('div', 'title-seed', `시드 ${this.seed}`);
    box.appendChild(this.seedLabel);
    ui.appendChild(box);
  },
  seedDialog() {
    const box = el('div', 'confirm-box');
    box.appendChild(el('div', 'modal-title', '시드 입력'));
    box.appendChild(el('p', '', '같은 시드면 같은 지도와 전투가 나와요.'));
    const inp = el('input', 'seed-input');
    inp.type = 'number'; inp.value = this.seed; inp.id = 'seed-input';
    box.appendChild(inp);
    const row = el('div', 'btn-row');
    row.appendChild(btn('취소', 'ghost', () => Game.closeModal(), { sfx: 'back', id: 'seed-cancel' }));
    row.appendChild(btn('적용', 'primary', () => {
      const v = parseInt(inp.value, 10);
      if (!isFinite(v) || v < 0) { Game.toast('0 이상의 숫자를 입력해 주세요'); return; }
      this.seed = v >>> 0; this.seedLabel.textContent = `시드 ${this.seed}`; Game.closeModal();
    }, { id: 'seed-ok' }));
    box.appendChild(row);
    Game.modal(box, { dim: true, closeOnBg: true });
  },
  start(seed) {
    Sfx.init(); Sfx.resume();
    Game.run = newRun(seed);
    Game.go('field');
  },
  update(dt) { this.t += dt; },
  render(ctx) {
    const t = this.t;
    drawDungeonBackdrop(ctx, t, 0.1);
    const g = ctx.createLinearGradient(0, 300, 0, 540);
    g.addColorStop(0, 'rgba(30,80,70,0)'); g.addColorStop(1, 'rgba(30,80,70,0.7)');
    ctx.fillStyle = g; ctx.fillRect(0, 300, 960, 240);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(480, 470, 360, 26, 0, 0, Math.PI * 2); ctx.fill();
    const order = ['priest', 'mage', 'archer', 'sword', 'knight'];
    order.forEach((sp, i) => drawSprite(ctx, sp, 200 + i * 75, 470, { scale: 3, t, phase: i, blinking: ((t + i * 0.7) % 3.5) < 0.12 }));
    drawSprite(ctx, 'goblin', 650, 470, { scale: 3, t, flip: true, phase: 2 });
    drawSprite(ctx, 'ogreChief', 760, 470, { scale: 4, t, flip: true, phase: 5 });
  },
};

// ---------------------------------------------------------------- 전투 전 팝업
function openPreBattle(node) {
  const run = Game.run;
  const waves = encounterFor(node);
  const box = el('div', 'prebattle-box');
  box.appendChild(el('div', 'modal-title', node.type === 'boss' ? '보스 — ' + ENEMIES[encounterFor(node)[0][0]].name : node.type === 'elite' ? '정예 전투' : '전투'));
  const wl = el('div', 'pb-waves');
  waves.forEach((w, i) => {
    const row = el('div', 'pb-wave');
    row.appendChild(el('span', 'pb-wlab', `${i + 1}웨이브`));
    for (const id of w) {
      const c = el('div', 'pb-enemy');
      c.appendChild(portraitCanvas(ENEMIES[id].sprite, 34, { flip: true }));
      c.appendChild(el('span', '', ENEMIES[id].name));
      row.appendChild(c);
    }
    wl.appendChild(row);
  });
  box.appendChild(wl);
  const tips = [];
  if (waves.flat().some((id) => ENEMIES[id].abilities.includes('charge'))) tips.push('차지 공격: 끊기 칸을 채우면 끊긴다');
  if (waves.flat().includes('goblin_caller')) tips.push('나팔수: 동료를 부른다');
  if (run.fruit) tips.push(`고목의 열매: 공격력 +${Math.round(run.fruit.bonus * 100)}% (남은 전투 ${run.fruit.battles})`);
  if (run.torch <= 0) tips.push('횃불이 꺼졌다: 치명타 확률 감소');
  if (tips.length) box.appendChild(el('div', 'pb-tips', tips.map((x) => '• ' + x).join('<br>')));
  const mode = el('div', 'pb-mode');
  mode.appendChild(el('span', '', '전투 방식'));
  const seg = el('div', 'seg');
  const a = btn('자동', 'seg-btn' + (run.autoMode ? ' on' : ''), () => { run.autoMode = true; a.classList.add('on'); m.classList.remove('on'); }, { id: 'pb-auto' });
  const m = btn('수동', 'seg-btn' + (!run.autoMode ? ' on' : ''), () => { run.autoMode = false; m.classList.add('on'); a.classList.remove('on'); }, { id: 'pb-manual' });
  seg.appendChild(a); seg.appendChild(m);
  mode.appendChild(seg);
  box.appendChild(mode);
  const row = el('div', 'btn-row');
  row.appendChild(btn('⚙ 전략', '', () => openStrategyEditor(run, () => openPreBattle(node)), { id: 'pb-strategy' }));
  row.appendChild(btn('⚔ 전투 시작', 'primary', () => { Game.closeModal(); Game.go('battle', { node }); }, { id: 'pb-start', sfx: 'skill' }));
  box.appendChild(row);
  Game.modal(box, { dim: true });
}

// ---------------------------------------------------------------- 보상 (3택1)
const RewardScene = {
  enter(params) {
    const run = Game.run;
    const node = params.node;
    const rng = makeRng(hashSeed(run.seed, 'reward', node.stage, node.row, run.stats.battles));
    const gr = node.type === 'elite' ? REWARD.goldElite : REWARD.goldBattle;
    const gold = rng.int(gr[0], gr[1]) + (params.bonusGold || 0);
    run.gold += gold;
    this.t = 0;
    const ui = Game.ui;
    const box = el('div', 'reward-box');
    box.appendChild(el('div', 'scene-title', node.type === 'elite' ? '정예 격파!' : '전투 승리!'));
    box.appendChild(el('div', 'reward-gold', `골드 +${gold} <small>(보유 ${run.gold})</small>`));
    if (run.lastBattle) { // 전투 기록: 누가 얼마나 때리고·막고·살렸나
      const B = run.lastBattle, mvp = B.heroes.reduce((a, h) => (!a || h.d + h.hl > a.d + a.hl ? h : a), null);
      box.appendChild(el('div', 'reward-meter', `<small>전투 ${B.t}초</small> ` + B.heroes.map((h) => `<span class="rm-chip${h.alive ? '' : ' dead'}"><b>${HEROES[h.id].name}${mvp === h ? '👑' : ''}</b> 피해 ${h.d} · 받음 ${h.tk}${h.hl ? ` · 회복 ${h.hl}` : ''}</span>`).join('')));
      run.lastBattle = null;
    }
    if (run.lastLoot) {
      const L = run.lastLoot;
      box.appendChild(el('div', 'reward-loot', `💎 강화석 +${L.stones}${L.got.length ? ' · 획득 ' + lootHtml(L.got) : ''}`));
      if (L.exp && L.exp.length) { // 경험치는 한 줄, 새로 배운 필살기는 따로 한 줄
        box.appendChild(el('div', 'reward-exp', `경험치 +${L.exp[0].exp} <small>(원정이 끝나면 정산)</small>`));
        const learned = L.exp.filter((r) => r.learned.length);
        if (learned.length) box.appendChild(el('div', 'reward-exp', learned.map((r) => `<b class="learn">${HEROES[r.id].name} 「${r.learned.map((k) => ultDefFor(r.id, k, 0).name).join('」「')}」 습득</b>`).join(' · ')));
      }
      run.lastLoot = null;
    }
    if (params.goldOnly) {
      box.appendChild(el('p', 'muted', '고블린의 보따리에서 골드를 챙겼다.'));
      box.appendChild(btn('계속 ▶', 'primary big', () => backToRun(), { id: 'btn-continue' }));
      ui.appendChild(box);
      return;
    }
    box.appendChild(el('div', 'reward-sub', '보상을 하나 고르세요'));
    const options = this.makeOptions(run, rng, node.type === 'elite');
    const cards = el('div', 'reward-cards');
    let chosen = null;
    const confirm = btn('확정', 'primary big', () => {
      if (!chosen) return;
      chosen.apply();
      Sfx.play('coin');
      Game.toast(chosen.title + (chosen.kind === 'skill' ? ' 강화!' : ' 획득!'));
      backToRun();
    }, { id: 'btn-reward-confirm' });
    confirm.disabled = true;
    options.forEach((o, i) => {
      const c = el('button', 'rcard rc-' + o.kind);
      c.type = 'button';
      c.id = 'reward-' + i;
      c.innerHTML = `<div class="rc-kind">${o.kindName}</div><div class="rc-icon">${o.icon}</div><div class="rc-title">${o.title}</div><div class="rc-desc">${o.desc}</div>`;
      if (o.item) { const ic = c.querySelector('.rc-icon'); ic.innerHTML = ''; ic.appendChild(itemIcon(o.item, 44)); }
      c.addEventListener('click', () => {
        Sfx.play('click');
        chosen = o;
        cards.querySelectorAll('.rcard').forEach((x) => x.classList.remove('sel'));
        c.classList.add('sel');
        confirm.disabled = false;
      });
      cards.appendChild(c);
    });
    box.appendChild(cards);
    const row = el('div', 'btn-row');
    row.appendChild(btn('건너뛰기', 'ghost', () => backToRun(), { sfx: 'back', id: 'btn-reward-skip' }));
    row.appendChild(confirm);
    box.appendChild(row);
    ui.appendChild(box);
    ui.appendChild(partyPanel(run, { compact: true }));
  },
  makeOptions(run, rng, elite) {
    const opts = [];
    // 1) 스킬 강화
    const alive = partyIds(run).filter((id) => !run.heroes[id].dead);
    if (alive.length) {
      const hid = rng.pick(alive);
      const slot = rng.pick(['s1', 's2', 'ult']);
      const kind = slot === 'ult' || rng() < 0.5 ? 'power' : 'cd';
      const def = HEROES[hid];
      const sk = heroSkill(hid, slot);
      opts.push({
        kind: 'skill', kindName: '스킬 강화', icon: '★',
        title: `${def.name} 「${sk.name}」`,
        desc: kind === 'power' ? `위력·회복 +${Math.round(REWARD.skillUpgradePower * 100)}%` : `쿨타임 -${Math.round((1 - REWARD.skillUpgradeCd) * 100)}%`,
        apply: () => { const u = run.heroes[hid].upgrades[slot] || (run.heroes[hid].upgrades[slot] = { power: 0, cd: 0 }); u[kind]++; },
      });
    }
    // 2) 유물
    const avail = Object.keys(RELICS).filter((r) => !run.relics.includes(r));
    if (avail.length) {
      const rid = rng.pick(avail);
      opts.push({ kind: 'relic', kindName: '유물', icon: RELICS[rid].icon, title: RELICS[rid].name, desc: RELICS[rid].desc, apply: () => run.relics.push(rid) });
    } else opts.push({ kind: 'gold', kindName: '골드', icon: '●', title: '금화 주머니', desc: '골드 +60', apply: () => { run.gold += 60; } });
    // 3) 장비 (일반 전투 절반 확률) 또는 회복약
    if (!elite && rng() < 0.5) {
      const p = Game.profile;
      const it = EQ.dropItem(rng, p, 'battle', run.tier, partyIds(run));
      const base = EQ.BASE[it.base];
      opts.push({ kind: 'equip', kindName: `장비 · ${it.grade}`, icon: '', item: it, title: EQ.itemName(it),
        desc: `${EQ.SLOT_NAME[base.slot]} · ${EQ.mainStats(it).map((m) => EQ.fmtStat(m.stat, m.v)).join(', ')}${it.opts.length ? ` 외 옵션 ${it.opts.length}` : ''}${it.passive ? `<br>「${EQ.PASSIVE[it.passive.key].name}」` : ''}`,
        apply: () => { p.inv.push(it); run.loot.push({ kind: 'item', uid: it.uid }); saveProfile(); } });
      return opts;
    }
    const n = elite ? 2 : 1;
    opts.push({ kind: 'potion', kindName: '회복약', icon: '🧪', title: `회복약 ×${n}`, desc: `아군 1명 HP ${REWARD.potionHealPct * 100}% 회복. 전투 중에도 쓸 수 있다.`, apply: () => { run.potions += n; } });
    return opts;
  },
  update(dt) { this.t += dt; },
  render(ctx) { drawDungeonBackdrop(ctx, this.t, 0.6); },
};

// ---------------------------------------------------------------- 이벤트
const EVENT_EFFECTS = {
  leave: () => ({ text: '조용히 발걸음을 옮겼다.' }),
  cart_search: (run, rng) => {
    if (rng() < 0.55) { run.food += 2; run.gold += 30; return { text: '짐칸 밑에서 보급품을 찾았다! 식량 +2, 골드 +30', good: true }; }
    const h = frontAliveHero(run);
    const dmg = Math.round(h.maxHp * 0.25);
    h.hp = Math.max(1, h.hp - dmg);
    return { text: `찰칵! 덫이 튀어나왔다. ${HEROES[h.id].name} HP -${dmg}`, bad: true };
  },
  cart_tank: (run) => {
    const h = run.heroes.tobi;
    const dmg = Math.round(h.maxHp * 0.12);
    h.hp = Math.max(1, h.hp - dmg);
    run.food += 2; run.gold += 30;
    return { text: `토비가 방패로 덫을 막아냈다 (HP -${dmg}). 식량 +2, 골드 +30`, good: true };
  },
  well_coin: (run, rng) => {
    run.gold -= 20;
    const r = rng();
    const avail = Object.keys(RELICS).filter((x) => !run.relics.includes(x));
    if (r < 0.35 && avail.length) { const id = rng.pick(avail); run.relics.push(id); return { text: `우물 바닥이 빛났다. 유물 「${RELICS[id].name}」 획득!`, good: true }; }
    if (r < 0.75) { const h = rng.pick(partyAlive(run)); h.hp = h.maxHp; return { text: `${HEROES[h.id].name}의 상처가 씻은 듯 나았다! (HP 최대)`, good: true }; }
    return { text: '퐁당… 아무 일도 일어나지 않았다.' };
  },
  well_drink: (run, rng) => {
    if (rng() < 0.55) { for (const h of partyAlive(run)) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.25); return { text: '맑고 시원한 물! 파티 HP 25% 회복', good: true }; }
    const h = rng.pick(partyAlive(run));
    const dmg = Math.round(h.maxHp * 0.18);
    h.hp = Math.max(1, h.hp - dmg);
    return { text: `차가운 저주가 스며들었다… ${HEROES[h.id].name} HP -${dmg}`, bad: true };
  },
  gm_trade: (run, rng) => {
    run.gold -= 45;
    const avail = Object.keys(RELICS).filter((x) => !run.relics.includes(x));
    if (avail.length) { const id = rng.pick(avail); run.relics.push(id); return { text: `"반짝이! 좋은 거래!" 유물 「${RELICS[id].name}」 획득`, good: true }; }
    run.potions += 2;
    return { text: '"반짝이 다 팔림! 대신 물약!" 회복약 +2', good: true };
  },
  gm_fight: () => ({ text: '"싸움! 좋아!" 고블린이 호루라기를 불었다!', battle: [['goblin', 'goblin_caller', 'goblin']] }),
  wd_food: (run) => {
    run.food -= 1; run.potions += 1; run.gold += 40; run.torch = Math.min(CONST.TORCH_MAX, run.torch + 30);
    return { text: '정찰병이 고마워하며 짐을 나눠줬다. 회복약 +1, 골드 +40, 횃불 +30', good: true };
  },
  wd_heal: (run, rng) => {
    const b = run.heroes.bori;
    const cost = Math.round(b.maxHp * 0.2);
    b.hp = Math.max(1, b.hp - cost);
    const alive = partyIds(run).filter((id) => !run.heroes[id].dead);
    const hid = rng.pick(alive);
    const slot = rng.pick(['s1', 's2']);
    const u = run.heroes[hid].upgrades[slot] || (run.heroes[hid].upgrades[slot] = { power: 0, cd: 0 });
    u.power++;
    const sk = heroSkill(hid, slot);
    return { text: `보리가 정찰병을 치료했다 (보리 HP -${cost}). 정찰병이 보답으로 비법을 알려줬다: ${HEROES[hid].name} 「${sk.name}」 위력 +30%`, good: true };
  },
};
function frontAliveHero(run) { return partyAlive(run)[0] || null; }

const EventScene = {
  enter(params) {
    const run = Game.run;
    this.node = params.node;
    this.ev = EVENTS[params.node.event];
    this.t = 0;
    const ui = Game.ui;
    const box = el('div', 'event-box');
    box.appendChild(el('div', 'scene-title', this.ev.title));
    box.appendChild(el('div', 'event-text', this.ev.text));
    const col = el('div', 'btn-col event-choices');
    this.ev.choices.forEach((c, i) => {
      let why = '';
      if (c.require && (!run.party.includes(c.require) || run.heroes[c.require].dead)) why = `${HEROES[c.require].name} 없음`;
      if (c.cost && c.cost.gold && run.gold < c.cost.gold) why = '골드 부족';
      if (c.cost && c.cost.food && run.food < c.cost.food) why = '식량 부족';
      const b = btn(`${c.label}${c.hint ? `<small>${c.hint}</small>` : ''}${why ? `<small class="warn">${why}</small>` : ''}`, 'choice', () => this.choose(c), { id: 'event-choice-' + i });
      if (why) b.disabled = true;
      col.appendChild(b);
    });
    box.appendChild(col);
    ui.appendChild(box);
    ui.appendChild(resourceBar(run));
  },
  choose(c) {
    const run = Game.run;
    const rng = makeRng(hashSeed(run.seed, 'event', this.node.stage, this.node.row, c.outcome));
    const res = EVENT_EFFECTS[c.outcome](run, rng);
    const ui = Game.ui;
    ui.innerHTML = '';
    const box = el('div', 'event-box');
    box.appendChild(el('div', 'scene-title', this.ev.title));
    box.appendChild(el('div', 'event-result ' + (res.good ? 'good' : res.bad ? 'bad' : ''), res.text));
    if (res.battle) {
      box.appendChild(btn('⚔ 전투!', 'primary big', () => {
        Game.go('battle', { node: { stage: this.node.stage, row: this.node.row, type: 'battle', waves: res.battle, fromEvent: true } });
      }, { id: 'btn-continue' }));
    } else box.appendChild(btn('계속 ▶', 'primary big', () => backToRun(), { id: 'btn-continue' }));
    ui.appendChild(box);
    ui.appendChild(resourceBar(run));
    ui.appendChild(partyPanel(run, { compact: true }));
    Sfx.play(res.bad ? 'hit' : 'coin');
  },
  update(dt) { this.t += dt; },
  render(ctx) {
    drawDungeonBackdrop(ctx, this.t, 0.4);
    drawEventArt(ctx, this.ev.art, 230, 400, this.t);
  },
};

function drawEventArt(ctx, art, x, y, t) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 150, 22, 0, 0, Math.PI * 2); ctx.fill();
  if (art === 'cart') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.12);
    ctx.fillStyle = '#7a4e2a'; ctx.fillRect(-110, -90, 200, 60);
    ctx.fillStyle = '#5e3a20'; for (let i = 0; i < 5; i++) ctx.fillRect(-110 + i * 44, -90, 6, 60);
    ctx.fillStyle = '#c9a77a'; ctx.fillRect(-90, -120, 60, 32); ctx.fillRect(-20, -112, 50, 24);
    ctx.restore();
    ctx.strokeStyle = '#3a2418'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(x - 70, y - 20, 26, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 80, y - 6, 26, 0.4, Math.PI * 1.2); ctx.stroke();
    ctx.fillStyle = `rgba(255,220,120,${0.5 + Math.sin(t * 5) * 0.4})`; ctx.fillRect(x - 40, y - 128, 6, 6);
  } else if (art === 'well') {
    ctx.fillStyle = '#6a6a74'; ctx.fillRect(x - 80, y - 70, 160, 70);
    ctx.fillStyle = '#4e4e58'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 80, y - 70 + i * 18, 160, 3);
    ctx.fillStyle = '#10202a'; ctx.beginPath(); ctx.ellipse(x, y - 70, 80, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(120,220,200,${0.3 + Math.sin(t * 2) * 0.2})`; ctx.beginPath(); ctx.ellipse(x, y - 70, 50, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a7a4a'; ctx.fillRect(x - 84, y - 74, 30, 8); ctx.fillRect(x + 40, y - 30, 26, 6);
    ctx.font = 'italic 16px serif'; ctx.fillStyle = `rgba(180,240,230,${0.4 + Math.sin(t * 1.3) * 0.4})`; ctx.textAlign = 'center'; ctx.fillText('…소원…', x + Math.sin(t) * 10, y - 120);
  } else if (art === 'gmerchant') {
    ctx.fillStyle = '#8a6448'; ctx.beginPath(); ctx.ellipse(x + 50, y - 40, 50, 42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d0a645'; ctx.fillRect(x + 30, y - 70, 8, 8); ctx.fillRect(x + 60, y - 50, 6, 6);
    drawSprite(ctx, 'goblin', x - 40, y, { scale: 5, t, flip: true });
  } else if (art === 'wounded') {
    drawSprite(ctx, 'archer', x, y, { scale: 5, t: t * 0.3, blinking: (t % 3) < 1.2, squash: 0.9 });
    ctx.fillStyle = '#efe6d4'; ctx.fillRect(x - 30, y - 60, 22, 6);
    ctx.fillStyle = '#b8403a'; ctx.fillRect(x - 24, y - 60, 6, 6);
  }
}

// ---------------------------------------------------------------- 상점 (던전 상인)
const ShopScene = {
  enter(params) {
    const run = Game.run;
    this.node = params.node;
    this.t = 0;
    const rng = makeRng(hashSeed(run.seed, 'shop', params.node.stage, params.node.row));
    const relicPool = rng.shuffle(Object.keys(RELICS).filter((r) => !run.relics.includes(r)));
    this.stock = [
      { key: 'potion', name: SHOP_ITEMS.potion.name, icon: '🧪', price: SHOP_ITEMS.potion.price, desc: SHOP_ITEMS.potion.desc, qty: 3 },
      { key: 'food', name: SHOP_ITEMS.food.name, icon: '🍞', price: SHOP_ITEMS.food.price, desc: SHOP_ITEMS.food.desc, qty: 3 },
      { key: 'torch', name: SHOP_ITEMS.torch.name, icon: '🔥', price: SHOP_ITEMS.torch.price, desc: SHOP_ITEMS.torch.desc, qty: 2 },
    ];
    for (const rid of relicPool.slice(0, 2)) this.stock.push({ key: 'relic', relic: rid, name: RELICS[rid].name, icon: RELICS[rid].icon, price: RELICS[rid].price, desc: RELICS[rid].desc, qty: 1 });
    this.build();
  },
  build() {
    const run = Game.run;
    const ui = Game.ui;
    ui.innerHTML = '';
    const box = el('div', 'shop-box');
    box.appendChild(el('div', 'scene-title', '떠돌이 상인 <small>"골드만 있으면 뭐든지!"</small>'));
    const list = el('div', 'shop-list');
    this.stock.forEach((it, i) => {
      const row = el('div', 'shop-item' + (it.qty <= 0 ? ' soldout' : ''));
      row.appendChild(el('div', 'si-icon', it.icon));
      row.appendChild(el('div', 'si-info', `<b>${it.name}</b><small>${it.desc}</small>`));
      const b = btn(it.qty <= 0 ? '품절' : `● ${it.price}`, 'buy', () => this.buy(it), { id: 'shop-buy-' + i, sfx: 'coin' });
      if (it.qty <= 0 || run.gold < it.price) b.disabled = true;
      row.appendChild(b);
      list.appendChild(row);
    });
    box.appendChild(list);
    const row = el('div', 'btn-row');
    row.appendChild(btn('🧪 회복약', '', () => usePotionFlow(run, () => this.build()), { id: 'shop-usepotion' }));
    row.appendChild(btn('떠나기 ▶', 'primary', () => backToRun(), { id: 'btn-continue' }));
    box.appendChild(row);
    ui.appendChild(box);
    ui.appendChild(resourceBar(run));
  },
  buy(it) {
    const run = Game.run;
    if (run.gold < it.price || it.qty <= 0) return;
    run.gold -= it.price;
    it.qty--;
    if (it.key === 'potion') run.potions++;
    else if (it.key === 'food') run.food++;
    else if (it.key === 'torch') run.torch = Math.min(CONST.TORCH_MAX, run.torch + 40);
    else if (it.key === 'relic') run.relics.push(it.relic);
    Game.toast(`${it.name} 구입!`, 1000);
    this.build();
  },
  update(dt) { this.t += dt; },
  render(ctx) {
    drawDungeonBackdrop(ctx, this.t, 0.4);
    ctx.fillStyle = '#5e4024'; ctx.fillRect(40, 380, 250, 20);
    drawSprite(ctx, 'goblinHorn', 165, 382, { scale: 5, t: this.t, blinking: (this.t % 4) < 0.12 });
    ctx.fillStyle = '#7a4e2a'; ctx.fillRect(40, 392, 250, 70);
    ctx.fillStyle = '#d0a645'; ctx.fillRect(40, 392, 250, 6);
  },
};

// ---------------------------------------------------------------- 휴식 (캠프)
// 야영 활동 (다키스트 던전의 야영처럼): 쉬고 나서 둘을 고른다. 효과는 다음 전투(들)에 붙는다 — run.camp / run.fruit
const CAMP_ACTS = {
  guard: { icon: '🛡', name: '보초 세우기', desc: '다음 전투: 기습당하지 않음 + 시작 시 파티 보호막 (최대 HP 12%)', fn: (run) => { run.camp = Object.assign(run.camp || {}, { guard: 1 }); return '보초를 세웠다. 다음 전투는 단단히 시작한다.'; } },
  whet: { icon: '🔪', name: '장비 손질', desc: '다음 3전투 공격력 +12%', fn: (run) => { run.fruit = { bonus: Math.max(0.12, (run.fruit && run.fruit.bonus) || 0), battles: Math.max(3, (run.fruit && run.fruit.battles) || 0) }; return '날을 세웠다. 3전투 동안 공격력 +12%.'; } },
  tales: { icon: '📜', name: '옛 이야기', desc: '다음 전투 시작 시 필살기 게이지 +35', fn: (run) => { run.camp = Object.assign(run.camp || {}, { ult: 35 }); return '옛 영웅담에 가슴이 뜨거워졌다. 다음 전투 필살기 게이지 +35.'; } },
  tend: { icon: '🩹', name: '상처 돌보기', desc: '부상 1단계 회복 (부상이 없으면 HP 10% 더)', fn: (run) => {
    const hs = partyAlive(run), inj = hs.filter((h) => h.injured > 0).sort((a, b) => b.injured - a.injured)[0];
    if (inj) { inj.injured--; refreshRunLoadout(run); return '붕대를 갈았다. 부상 하나가 나았다.'; }
    for (const h of hs) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.1); return '상처를 꼼꼼히 돌봤다. HP 10% 회복.'; } },
  torch: { icon: '🔥', name: '횃불 손질', desc: '횃불 +40', fn: (run) => { run.torch = Math.min(CONST.TORCH_MAX, run.torch + 40); return '횃불을 손질했다. 횃불 +40.'; } },
};
const CAMP_PICKS = 2;

const RestScene = {
  enter() {
    this.t = 0;
    this.rested = false;
    this.camped = [];
    this.build();
  },
  build() {
    const run = Game.run;
    const ui = Game.ui;
    ui.innerHTML = '';
    const box = el('div', 'rest-box');
    box.appendChild(el('div', 'scene-title', '모닥불 자리 <small>불가에 앉아 잠시 쉬어 간다</small>'));
    if (!this.rested) {
      const col = el('div', 'btn-col');
      const eat = btn(`🍞 식량 1개로 휴식 <small>살아 있는 동료 HP ${CONST.REST_HEAL_PCT * 100}% 회복 · 횃불 +${CONST.TORCH_REST_GAIN}</small>`, 'choice', () => this.rest(true), { id: 'rest-food' });
      if (run.food <= 0) eat.disabled = true;
      col.appendChild(eat);
      col.appendChild(btn(`굶고 쉬기 <small>HP ${CONST.REST_HUNGRY_HEAL_PCT * 100}% 회복 · 횃불 +${CONST.TORCH_REST_GAIN}</small>`, 'choice', () => this.rest(false), { id: 'rest-hungry' }));
      box.appendChild(col);
    } else {
      box.appendChild(el('div', 'event-result good', this.msg));
      // 야영 활동: 둘을 고른다
      const left = CAMP_PICKS - this.camped.length;
      box.appendChild(el('div', 'camp-title', `🔥 야영 활동 <small>${left > 0 ? `${left}개 더 고를 수 있다` : '불가에서 할 일을 마쳤다'}</small>`));
      const grid = el('div', 'camp-grid');
      for (const k in CAMP_ACTS) {
        const a = CAMP_ACTS[k], done = this.camped.includes(k);
        const b = btn(`${a.icon} ${a.name}<small>${a.desc}</small>`, 'camp-btn' + (done ? ' on' : ''), () => { if (done || this.camped.length >= CAMP_PICKS) return; this.camped.push(k); this.campMsg = a.fn(run); Sfx.play('click'); this.build(); }, { id: 'camp-' + k });
        if (!done && left <= 0) b.disabled = true;
        grid.appendChild(b);
      }
      box.appendChild(grid);
      if (this.campMsg) box.appendChild(el('div', 'muted', this.campMsg));
    }
    const row = el('div', 'btn-row');
    row.appendChild(btn('⚙ 전략', '', () => openStrategyEditor(run), { id: 'rest-strategy' }));
    row.appendChild(btn('🎒 장비', '', () => openInventory({ onClose: () => this.build() }), { id: 'rest-inv' }));
    row.appendChild(btn('🧪 회복약', '', () => usePotionFlow(run, () => this.build()), { id: 'rest-potion' }));
    row.appendChild(btn(this.rested ? '출발 ▶' : '쉬지 않고 출발', this.rested ? 'primary' : 'ghost', () => backToRun(), { id: 'btn-continue' }));
    box.appendChild(row);
    ui.appendChild(box);
    ui.appendChild(resourceBar(run));
    ui.appendChild(partyPanel(run, { compact: true }));
  },
  rest(withFood) {
    const run = Game.run;
    const pct = withFood ? CONST.REST_HEAL_PCT : CONST.REST_HUNGRY_HEAL_PCT;
    if (withFood) run.food--;
    for (const h of partyAlive(run)) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * pct);
    run.torch = Math.min(CONST.TORCH_MAX, run.torch + CONST.TORCH_REST_GAIN);
    this.rested = true;
    this.msg = withFood ? `따뜻한 식사로 기운을 차렸다. HP ${pct * 100}% 회복!` : `배는 고프지만 잠시 눈을 붙였다. HP ${pct * 100}% 회복`;
    Sfx.play('heal');
    this.build();
  },
  update(dt) { this.t += dt; },
  render(ctx) {
    const t = this.t;
    drawDungeonBackdrop(ctx, t, 0.7);
    const fx = 200, fy = 430;
    const g = ctx.createRadialGradient(fx, fy - 20, 10, fx, fy - 20, 220);
    g.addColorStop(0, 'rgba(255,170,80,0.5)'); g.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = g; ctx.fillRect(fx - 220, fy - 240, 440, 440);
    ctx.fillStyle = '#5e4024'; ctx.fillRect(fx - 30, fy - 6, 60, 10);
    for (let i = 0; i < 6; i++) {
      const h = 20 + Math.sin(t * 10 + i * 1.7) * 8 + (i % 3) * 6;
      ctx.fillStyle = i % 2 ? '#ff9a3a' : '#ffd34a';
      ctx.fillRect(fx - 18 + i * 6, fy - 6 - h, 7, h);
    }
    const ids = partyIds(Game.run).filter((id) => !Game.run.heroes[id].dead);
    const seats = [[-105, 6, false], [95, 6, true], [-60, 34, false]]; // 모닥불 둘레 자리
    ids.forEach((id, i) => {
      const [dx, dy, flip] = seats[i % seats.length];
      drawSprite(ctx, HEROES[id].sprite, fx + dx, fy + dy, { scale: 3, t: t * 0.6, phase: i, flip, blinking: ((t + i) % 5) < 0.6 });
    });
  },
};

// ---------------------------------------------------------------- 고목 (피의 거래)
const TreeScene = {
  enter() {
    this.t = 0;
    this.deal = null;
    this.hero = null;
    this.done = false;
    this.build();
  },
  build() {
    const run = Game.run;
    const ui = Game.ui;
    ui.innerHTML = '';
    const box = el('div', 'tree-box');
    box.appendChild(el('div', 'scene-title', '피를 원하는 고목 <small>"피를… 나누면… 열매를…"</small>'));
    if (this.done) {
      box.appendChild(el('div', 'event-result good', this.msg));
      box.appendChild(btn('계속 ▶', 'primary big', () => backToRun(), { id: 'btn-continue' }));
    } else {
      const deals = el('div', 'tree-deals');
      TREE_DEALS.forEach((d) => {
        const b = btn(`<b>${d.label}</b><small>HP ${d.hpCost * 100}% 희생 → 공격력 +${d.atkBonus * 100}% (전투 ${d.battles}회)</small>`, 'choice' + (this.deal === d ? ' sel' : ''), () => { this.deal = d; this.hero = null; this.build(); }, { id: 'tree-deal-' + d.id });
        deals.appendChild(b);
      });
      box.appendChild(deals);
      if (this.deal) {
        box.appendChild(el('div', 'reward-sub', '누구의 피를 바칠까?'));
        const pp = partyPanel(run, { compact: true, onSelect: (id) => {
          const h = run.heroes[id];
          if (h.hp <= h.maxHp * this.deal.hpCost + 1) { Game.toast('HP가 부족해 거래할 수 없어요'); return; }
          this.hero = id; this.build();
        } });
        if (this.hero) pp.querySelector(`[data-hero="${this.hero}"]`).classList.add('sel');
        box.appendChild(pp);
      }
      const row = el('div', 'btn-row');
      row.appendChild(btn('떠나기', 'ghost', () => backToRun(), { sfx: 'back', id: 'tree-leave' }));
      const ok = btn('피의 거래', 'danger', () => this.confirm(), { id: 'tree-confirm' });
      if (!this.deal || !this.hero) ok.disabled = true;
      row.appendChild(ok);
      box.appendChild(row);
      if (run.fruit) box.appendChild(el('div', 'muted', `이미 열매 효과가 있다 (+${Math.round(run.fruit.bonus * 100)}%, ${run.fruit.battles}회). 겹치지 않고 더 큰 값만 남는다.`));
    }
    ui.appendChild(box);
    ui.appendChild(resourceBar(run));
  },
  confirm() {
    const run = Game.run;
    const h = run.heroes[this.hero];
    const cost = Math.round(h.maxHp * this.deal.hpCost);
    h.hp = Math.max(1, h.hp - cost);
    const prev = run.fruit;
    run.fruit = { bonus: Math.max(this.deal.atkBonus, prev ? prev.bonus : 0), battles: Math.max(this.deal.battles, prev ? prev.battles : 0) };
    this.msg = `${HEROES[this.hero].name}의 피(HP -${cost})를 마신 고목이 붉은 열매를 떨어뜨렸다. 다음 전투 ${run.fruit.battles}회 동안 공격력 +${Math.round(run.fruit.bonus * 100)}%!`;
    this.done = true;
    Sfx.play('phase');
    this.build();
  },
  update(dt) { this.t += dt; },
  render(ctx) {
    const t = this.t;
    drawDungeonBackdrop(ctx, t, 0.75);
    const x = 210, y = 470;
    ctx.fillStyle = 'rgba(120,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y, 170, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2418'; ctx.fillRect(x - 30, y - 240, 60, 240);
    ctx.fillStyle = '#4e2e1c'; ctx.fillRect(x - 30, y - 240, 16, 240);
    for (const [bx, by, r] of [[-80, -250, 50], [60, -270, 60], [0, -300, 70], [-30, -220, 40], [90, -220, 40]]) {
      ctx.fillStyle = '#4a2030'; ctx.beginPath(); ctx.arc(x + bx + Math.sin(t + bx) * 3, y + by, r, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 6; i++) { const a = 0.6 + Math.sin(t * 3 + i) * 0.4; ctx.fillStyle = `rgba(230,40,60,${a})`; ctx.beginPath(); ctx.arc(x - 90 + i * 36, y - 230 + (i % 2) * 40, 7, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ffd34a'; ctx.fillRect(x - 14, y - 150, 8, 4); ctx.fillRect(x + 8, y - 150, 8, 4);
    ctx.fillStyle = '#1a0a0a'; ctx.fillRect(x - 10, y - 120, 22, 8 + Math.sin(t * 2) * 3);
  },
};

// ---------------------------------------------------------------- 결과
const ResultScene = {
  enter() {
    const run = Game.run;
    document.getElementById('toasts').innerHTML = ''; // 전투 중 토스트가 결과 제목을 가리지 않게
    this.t = 0;
    const win = run.result === 'victory';
    const sec = Math.round((performance.now() - run.stats.startTime) / 1000);
    const ui = Game.ui;
    const box = el('div', 'result-box ' + (win ? 'win' : 'lose'));
    box.appendChild(el('div', 'result-title', win ? '원정 성공!' : run.result === 'retreat' ? '무사 귀환' : run.result === 'giveup' ? '원정 포기' : '원정 실패…'));
    box.appendChild(el('div', 'result-sub', win ? '굴의 주인을 쓰러뜨렸다!' : run.result === 'retreat' ? `${Math.max(1, run.pos.stage)}층에서 계단을 거슬러 마을로 돌아왔다. (골드 절반 · 경험치 75%)` : `${Math.max(1, run.pos.stage)}층에서 원정이 끝났다. (골드 25% · 경험치 50%)`));
    const settle = settleRun(run);
    achCheck(Game.profile);
    const stats = el('div', 'result-stats');
    stats.innerHTML = `
      <div><b>${Math.floor(sec / 60)}분 ${sec % 60}초</b><small>플레이 시간</small></div>
      <div><b>${run.stats.nodes}</b><small>지나온 방</small></div>
      <div><b>${run.stats.battles}</b><small>전투</small></div>
      <div><b>${run.stats.kills}</b><small>처치</small></div>
      <div><b>${run.gold}</b><small>골드</small></div>
      <div><b>${run.relics.length}</b><small>유물</small></div>`;
    box.appendChild(stats);
    const heroes = el('div', 'result-heroes');
    for (const id of partyIds(run)) {
      const h = run.heroes[id];
      const c = el('div', 'rh' + (h.dead ? ' dead' : ''));
      c.appendChild(portraitCanvas(HEROES[id].sprite, 40, { dead: h.dead }));
      c.appendChild(el('div', '', `<b>${HEROES[id].name}</b><small>${h.dead ? '💀 ' + (run.stats.deathsAt[id] || '') : '생존'}</small><small>피해 ${Math.round(run.stats.dealt[id])} · 회복 ${Math.round(run.stats.healed[id])}</small>`));
      heroes.appendChild(c);
    }
    box.appendChild(heroes);
    const lootLine = run.loot.length ? `획득 장비 ${lootHtml(run.loot)}` : '획득 장비 없음';
    box.appendChild(el('div', 'result-loot', `${lootLine}<br>💎 강화석 +${run.stonesGot} · 마을로 가져간 골드 ● ${settle ? settle.gold : run.gold}${oathReward(run) ? ` <small>(⚔ 맹세 ${oathList(run).map((k) => OATHS[k].icon).join('')} 보상 +${Math.round(oathReward(run) * 100)}%)</small>` : ''}${settle && settle.unlocked ? `<br><b class="ok">새 난이도 해금: ${settle.unlocked.name} (T${settle.unlocked.tier})</b>` : ''}`));
    if (settle && settle.exp.length) box.appendChild(el('div', 'reward-exp', '경험치 정산 · ' + settle.exp.map((r) => `${HEROES[r.id].name} +${r.exp}${r.to > r.from ? ` <b class="lvup">Lv ${r.to}!</b>` : ''}`).join(' · ') + settle.exp.filter((r) => r.learned.length).map((r) => ` · <b class="learn">${HEROES[r.id].name} 「${r.learned.map((k) => ultDefFor(r.id, k, 0).name).join('」「')}」 습득</b>`).join('')));
    box.appendChild(el('div', 'muted', `${siteOf(run).name} · 시드 ${run.seed} · 난이도 ${EQ.tierInfo(run.tier).name}`));
    const row = el('div', 'btn-row');
    row.appendChild(btn('타이틀', 'ghost', () => Game.go('title'), { id: 'res-title' }));
    row.appendChild(btn('같은 시드로 다시', '', () => { Game.run = newRun(run.seed); Game.go('field'); }, { id: 'res-same' }));
    row.appendChild(btn('새 원정', 'primary', () => { Game.run = newRun(randomSeed()); Game.go('field'); }, { id: 'res-new' }));
    box.appendChild(row);
    ui.appendChild(box);
  },
  update(dt) { this.t += dt; },
  render(ctx) {
    const run = Game.run;
    drawDungeonBackdrop(ctx, this.t, 0.75);
    if (run.result === 'victory') {
      for (let i = 0; i < 30; i++) {
        const x = (i * 97 + this.t * 60 * (1 + i % 3)) % 960, y = (i * 53 + this.t * 90) % 540;
        ctx.fillStyle = ['#ffd34a', '#f4a7a0', '#7fd0b0', '#9fbaf0'][i % 4]; ctx.fillRect(x, y, 6, 4);
      }
    }
  },
};

// ---------------------------------------------------------------- 자동 전략 편집
function openStrategyEditor(run, onClose) {
  let cur = partyIds(run).find((id) => !run.heroes[id].dead) || partyIds(run)[0];
  const box = el('div', 'strat-box');
  const render = () => {
    box.innerHTML = '';
    box.appendChild(el('div', 'modal-title', '자동 전략'));
    box.appendChild(el('div', 'muted', '방·정예·보스 전투에서 자동은 평타와 ① 스킬만 쓴다. ②·필살기·회피는 직접 (전술 정지를 쓰면 편하다). 복도 잡몹 전투는 아래 설정대로 전부 자동.'));
    const tabs = el('div', 'strat-tabs');
    for (const id of partyIds(run)) {
      const t = el('button', 'stab' + (id === cur ? ' on' : '') + (run.heroes[id].dead ? ' dead' : ''));
      t.type = 'button';
      t.id = 'stab-' + id;
      t.appendChild(portraitCanvas(HEROES[id].sprite, 30, { dead: run.heroes[id].dead }));
      t.appendChild(el('span', '', `${HEROES[id].name} <small>${HEROES[id].roleName}</small>`));
      t.addEventListener('click', () => { Sfx.play('click'); cur = id; render(); });
      tabs.appendChild(t);
    }
    box.appendChild(tabs);
    const st = run.strategy[cur];
    const def = HEROES[cur];
    const rules = el('div', 'strat-rules');
    for (const slot of ['s1', 's2', 'ult']) {
      const sk = heroSkill(cur, slot);
      const c = st[slot];
      const row = el('div', 'srule' + (c.auto ? '' : ' manual'));
      row.appendChild(el('div', 'sr-skill', `<span class="sr-slot">${AI_SKILL_SLOTS[slot]}</span><b>${sk.name}</b><small>${sk.desc}${sk.hint ? ` · 추천: ${SKILL_HINTS[sk.hint].name}` : ''}</small>`));
      const seg = el('div', 'seg');
      seg.appendChild(btn('수동', 'seg-btn' + (!c.auto ? ' on' : ''), () => { c.auto = false; render(); }, { id: `sr-manual-${slot}` }));
      seg.appendChild(btn('자동', 'seg-btn' + (c.auto ? ' on' : ''), () => { c.auto = true; render(); }, { id: `sr-auto-${slot}` }));
      row.appendChild(seg);
      if (c.auto) {
        const conds = Object.keys(AI_CONDITIONS).filter((k) => k !== 'hint' || sk.hint);
        row.appendChild(sel(conds.map((k) => [k, AI_CONDITIONS[k].name]), c.cond, (v) => { c.cond = v; const P = AI_CONDITIONS[v].param; c.param = P ? P[Math.floor(P.length / 2)] : undefined; render(); }, `sr-cond-${slot}`));
        const P = AI_CONDITIONS[c.cond].param;
        if (P) row.appendChild(sel(P.map((v) => [v, c.cond === 'enemyCountGte' ? `${v}마리` : `${v}%`]), c.param, (v) => { c.param = +v; }, `sr-param-${slot}`));
        if (['enemy', 'ally', 'area_enemy', 'area_ally'].includes(sk.target)) {
          const ally = sk.target === 'ally' || sk.target === 'area_ally';
          const opts = Object.keys(AI_TARGET_RULES).filter((k) => (ally ? ['lowestAlly', 'tank'] : ['focus', 'nearest', 'weakest', 'charging']).includes(k));
          row.appendChild(sel(opts.map((k) => [k, AI_TARGET_RULES[k].name]), opts.includes(c.target) ? c.target : opts[0], (v) => { c.target = v; }, `sr-target-${slot}`));
        } else row.appendChild(el('span', 'sr-auto', sk.target === 'self' ? '대상: 자신' : sk.target === 'party' ? '대상: 파티 전체' : sk.target === 'self_area' ? '대상: 주변 적' : '대상: 적 전체'));
      } else row.appendChild(el('span', 'sr-auto', '직접 사용'));
      rules.appendChild(row);
    }
    box.appendChild(rules);
    const row = el('div', 'btn-row');
    row.appendChild(btn('기본값으로', 'ghost', () => { run.strategy[cur] = JSON.parse(JSON.stringify(AI_PRESETS[cur])); render(); }, { id: 'strat-reset' }));
    row.appendChild(btn('닫기', 'primary', () => { Game.closeModal(); if (onClose) onClose(); }, { id: 'strat-close' }));
    box.appendChild(row);
  };
  render();
  Game.modal(box, { dim: true });
}

function sel(options, value, onChange, id) {
  const s = el('select', 'sel');
  if (id) s.id = id;
  for (const [v, label] of options) {
    const o = el('option', '', label);
    o.value = v;
    if (String(v) === String(value)) o.selected = true;
    s.appendChild(o);
  }
  s.addEventListener('change', () => { Sfx.play('click'); onChange(s.value); });
  return s;
}

// ---------------------------------------------------------------- 파티 편성 (최대 3인, 던전 입장 전)
function openPartySelect(run, onDone) {
  let pick = run.party.slice();
  const box = el('div', 'party-select');
  const render = () => {
    box.innerHTML = '';
    box.appendChild(el('div', 'modal-title', `파티 편성 <small>최대 ${CONST.PARTY_SIZE}명</small>`));
    const grid = el('div', 'ps-grid');
    for (const id of GACHA.ownedIds(Game.profile)) {
      const d = HEROES[id];
      const on = pick.includes(id);
      const c = el('button', 'ps-card' + (on ? ' on' : ''));
      c.type = 'button';
      c.id = 'ps-' + id;
      c.appendChild(portraitCanvas(d.sprite, 84));
      const sk = ['s1', 's2'].map((s) => heroSkill(id, s).name).join(' · ');
      c.appendChild(el('div', 'ps-info', `<b>${d.name}</b><span class="ps-role">${d.roleName} · ${d.title || d.species}</span><small>Lv ${EQ.heroLevel(Game.profile, id)} · HP ${d.hp} · 공격 ${d.atk}</small><small>${sk}</small><small class="ps-ult">필살기: ${GACHA.ultFor(Game.profile, id).name}</small><small class="ps-trait">${d.traits.map((t) => TRAITS[t].name).join(', ')}</small>`));
      if (on) c.appendChild(el('div', 'ps-badge', String(pick.indexOf(id) + 1)));
      c.addEventListener('click', () => {
        Sfx.play('click');
        if (on) pick = pick.filter((x) => x !== id);
        else if (pick.length < CONST.PARTY_SIZE) pick.push(id);
        else { Game.toast(`최대 ${CONST.PARTY_SIZE}명까지 출전할 수 있어요`, 1200); return; }
        render();
      });
      grid.appendChild(c);
    }
    box.appendChild(grid);
    const roles = pick.map((id) => HEROES[id].role);
    const tips = [];
    if (pick.length && !roles.includes('tank')) tips.push('탱커가 없으면 보스를 버티기 어려워요.');
    if (pick.length && !roles.includes('support')) tips.push('서포터가 없으면 전투 중 회복은 회복약뿐이에요.');
    if (pick.length && roles.includes('rogue')) tips.push('도적: 함정 해제 · 상자 자물쇠 따기 · 후열 적부터 처리.');
    if (pick.length < CONST.PARTY_SIZE) tips.push(`${CONST.PARTY_SIZE - pick.length}자리가 비어 있어요.`);
    box.appendChild(el('div', 'ps-tips', tips.join('<br>') || '균형 잡힌 파티!'));
    const row = el('div', 'btn-row');
    row.appendChild(btn('취소', 'ghost', () => Game.closeModal(), { sfx: 'back', id: 'ps-cancel' }));
    const ok = btn(`확정 (${pick.length}/${CONST.PARTY_SIZE})`, 'primary', () => { run.party = pick.slice(); Game.closeModal(); if (onDone) onDone(); }, { id: 'ps-ok' });
    if (!pick.length) ok.disabled = true;
    row.appendChild(ok);
    box.appendChild(row);
  };
  render();
  Game.modal(box, { dim: true });
}
