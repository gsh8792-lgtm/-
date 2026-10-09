// ===== 05_map.js : 경로 지도 생성 + 지도 장면 =====

// 생성 제약:
//  - 스테이지 1~4는 3갈래, 5는 보스 단일
//  - 스테이지 1 정예 없음 / 각 스테이지 전투 계열 ≥ 1 / 상점·휴식 스테이지당 ≤ 1
//  - 스테이지 4에는 휴식 또는 고목이 반드시 1개
function generateMap(seed) {
  const rng = makeRng(hashSeed(seed, 'map'));
  const stages = [];
  const eventIds = rng.shuffle(Object.keys(EVENTS).slice());
  let eventCursor = 0;
  for (let s = 1; s <= CONST.STAGES - 1; s++) {
    let types = null;
    for (let attempt = 0; attempt < 500; attempt++) {
      const cand = [];
      for (let r = 0; r < CONST.ROWS; r++) {
        const entries = [];
        for (const k in NODE_TYPES) {
          const nt = NODE_TYPES[k];
          if (!nt.weight) continue;
          if (k === 'elite' && s === 1) continue;
          let w = nt.weight;
          if (s === 1 && k === 'battle') w *= 1.4;
          entries.push([k, w]);
        }
        cand.push(rng.weighted(entries));
      }
      if (validStage(s, cand)) { types = cand; break; }
    }
    if (!types) types = s === 4 ? ['battle', 'rest', 'tree'] : ['battle', 'event', 'battle']; // 안전장치
    stages.push(types.map((type, row) => {
      const node = { stage: s, row, type };
      if (NODE_TYPES[type].combat) node.enc = rng.int(0, 99);
      if (type === 'event') node.event = eventIds[eventCursor++ % eventIds.length];
      return node;
    }));
  }
  stages.push([{ stage: CONST.STAGES, row: 1, type: 'boss', enc: rng.int(0, ENCOUNTERS.boss[CONST.STAGES].length - 1) }]); // 원정마다 보스가 다르다
  return { seed, stages };
}

function validStage(s, types) {
  const count = (t) => types.filter((x) => x === t).length;
  if (s === 1 && count('elite') > 0) return false;
  if (!types.some((t) => NODE_TYPES[t].combat)) return false;
  if (count('shop') > 1 || count('rest') > 1) return false;
  if (s === 4 && count('rest') + count('tree') < 1) return false;
  if (count('tree') > 1) return false;
  return true;
}

// 이동 규칙: 다음 스테이지의 같은 행 또는 위/아래 인접 행
function canMoveTo(run, node) {
  if (node.stage !== run.pos.stage + 1) return false;
  if (node.type === 'boss') return true;
  return Math.abs(node.row - run.pos.row) <= 1;
}
function getNode(map, stage, row) {
  const st = map.stages[stage - 1];
  if (!st) return null;
  return st.find((n) => n.row === row) || st[0];
}

// 노드 → 전투 웨이브
function encounterFor(node) {
  if (node.waves) return node.waves; // 이벤트 등에서 직접 지정
  const table = ENCOUNTERS[node.type === 'boss' ? 'boss' : node.type][node.stage] || ENCOUNTERS.battle[Math.min(4, node.stage)];
  return table[node.enc % table.length];
}

// 지도 화면 좌표
function mapNodePos(node) {
  if (node.type === 'boss') return { x: 852, y: 318 };
  return { x: 150 + (node.stage - 1) * 172, y: 222 + node.row * 96 };
}

// ---------------------------------------------------------------- 공용 UI: 파티 패널 / 자원 바
function partyPanel(run, opts) {
  opts = opts || {};
  const wrap = el('div', 'party-panel' + (opts.compact ? ' compact' : ''));
  for (const id of partyIds(run)) {
    const h = run.heroes[id];
    const def = HEROES[id];
    const card = el('div', 'pcard' + (h.dead ? ' dead' : ''));
    card.dataset.hero = id;
    card.appendChild(portraitCanvas(def.sprite, 40, { dead: h.dead }));
    const info = el('div', 'pinfo');
    info.appendChild(el('div', 'pname', `${def.name}<span class="prole">${def.roleName}</span>`));
    info.appendChild(bar(h.hp / h.maxHp, h.hp / h.maxHp < 0.3 ? 'hp low' : 'hp'));
    info.appendChild(el('div', 'php', h.dead ? '사망' : `${Math.ceil(h.hp)}/${h.maxHp}`));
    card.appendChild(info);
    const ups = Object.values(h.upgrades).reduce((a, u) => a + u.power + u.cd, 0);
    if (ups) card.appendChild(el('div', 'pup', '★' + ups));
    if (opts.onSelect && !h.dead) {
      card.classList.add('selectable');
      card.addEventListener('click', () => { Sfx.play('click'); opts.onSelect(id); });
    }
    wrap.appendChild(card);
  }
  return wrap;
}

function resourceBar(run) {
  const r = el('div', 'res-bar');
  r.appendChild(el('div', 'res gold', `<i>●</i>${run.gold}`));
  r.appendChild(el('div', 'res food', `<i>🍞</i>${run.food}`));
  r.appendChild(el('div', 'res potion', `<i>🧪</i>${run.potions}`));
  const torch = el('div', 'res torch' + (run.torch <= 0 ? ' dark' : run.torch <= 40 ? ' low' : ''), `<i>🔥</i>`);
  torch.appendChild(bar(run.torch / CONST.TORCH_MAX, 'torch'));
  r.appendChild(torch);
  const rel = el('div', 'res relics');
  if (!run.relics.length) rel.appendChild(el('span', 'muted', '유물 없음'));
  for (const id of run.relics) {
    const ic = el('span', 'relic-ic', RELICS[id].icon);
    ic.title = RELICS[id].name;
    ic.addEventListener('click', (e) => { e.stopPropagation(); Game.toast(`${RELICS[id].icon} ${RELICS[id].name}: ${RELICS[id].desc}`, 2600); });
    rel.appendChild(ic);
  }
  if (run.fruit && run.fruit.battles > 0) rel.appendChild(el('span', 'fruit-ic', `🍒×${run.fruit.battles}`));
  r.appendChild(rel);
  return r;
}

// 회복약 사용 (지도/휴식에서)
function usePotionFlow(run, onDone) {
  if (run.potions <= 0) { Game.toast('회복약이 없어요'); return; }
  const box = el('div', 'pick-box');
  box.appendChild(el('div', 'modal-title', '회복약을 누구에게 쓸까요?'));
  box.appendChild(partyPanel(run, { onSelect: (id) => {
    const h = run.heroes[id];
    if (h.hp >= h.maxHp) { Game.toast('이미 HP가 가득해요'); return; }
    run.potions--;
    h.hp = Math.min(h.maxHp, h.hp + h.maxHp * REWARD.potionHealPct);
    Sfx.play('heal');
    Game.closeModal();
    Game.toast(`${HEROES[id].name} HP 회복!`);
    if (onDone) onDone();
  } }));
  box.appendChild(btn('취소', 'ghost', () => Game.closeModal(), { sfx: 'back' }));
  Game.modal(box, { dim: true, closeOnBg: true });
}

// ---------------------------------------------------------------- 지도 장면
const MapScene = {
  selected: null,
  t: 0,
  enter() {
    const run = Game.run;
    this.selected = null;
    this.t = 0;
    const ui = Game.ui;
    const top = el('div', 'map-top');
    const hdr = el('div', 'map-hdr');
    hdr.appendChild(el('div', 'map-title', `고블린 굴 — ${run.pos.stage === 0 ? '입구' : `${run.pos.stage}/${CONST.STAGES}`}`));
    hdr.appendChild(resourceBar(run));
    top.appendChild(hdr);
    top.appendChild(partyPanel(run, { compact: true }));
    ui.appendChild(top);

    const nodesLayer = el('div', 'map-nodes');
    for (const st of run.map.stages) for (const node of st) {
      const p = mapNodePos(node);
      const nt = NODE_TYPES[node.type];
      const visited0 = run.path.some((q) => q.stage === node.stage && q.row === node.row);
      const known = node.type === 'boss' || visited0; // 방 종류는 들어가 봐야 안다
      const b = el('button', 'map-node t-' + (known ? node.type : 'unknown'), known ? nt.short : '?');
      b.type = 'button';
      b.style.left = p.x + 'px'; b.style.top = p.y + 'px';
      b.style.setProperty('--nc', known ? nt.color : '#6a6080');
      b.dataset.stage = node.stage; b.dataset.row = node.row;
      const visited = run.path.some((q) => q.stage === node.stage && q.row === node.row);
      const current = run.pos.stage === node.stage && run.pos.row === node.row;
      const reachable = canMoveTo(run, node);
      if (visited) b.classList.add('visited');
      if (current) b.classList.add('current');
      if (reachable) b.classList.add('reachable');
      if (!reachable && !current) b.classList.add('locked');
      b.addEventListener('click', () => {
        Sfx.play('click');
        this.select(node, reachable);
      });
      nodesLayer.appendChild(b);
    }
    ui.appendChild(nodesLayer);

    // 스테이지 번호
    for (let s = 1; s <= CONST.STAGES; s++) {
      const p = mapNodePos(s === CONST.STAGES ? { type: 'boss' } : { stage: s, row: 0 });
      const lab = el('div', 'stage-num' + (s === run.pos.stage + 1 ? ' next' : ''), String(s));
      lab.style.left = p.x + 'px';
      ui.appendChild(lab);
    }

    const legend = el('div', 'map-legend', '<span><b style="background:#6a6080">?</b>들어가 봐야 아는 방</span><span><b style="background:' + NODE_TYPES.boss.color + '">' + NODE_TYPES.boss.short + '</b>굴의 주인</span>');
    ui.appendChild(legend);

    const side = el('div', 'map-actions');
    side.appendChild(btn('⚙ 전략', 'small', () => openStrategyEditor(Game.run), { id: 'btn-strategy' }));
    side.appendChild(btn('🧪 회복약', 'small', () => usePotionFlow(run, () => Game.go('map')), { id: 'btn-potion' }));
    side.appendChild(btn('? 규칙', 'small', () => showRulesHelp(), { id: 'btn-help' }));
    ui.appendChild(side);

    this.info = el('div', 'map-info hidden');
    ui.appendChild(this.info);

    Game.hint('map');
  },

  select(node, reachable) {
    this.selected = node;
    const info = this.info;
    info.innerHTML = '';
    info.classList.remove('hidden');
    info.classList.toggle('left', mapNodePos(node).x >= 480); // 탭한 노드를 가리지 않도록 반대편에
    if (node.type === 'boss') {
      info.appendChild(el('div', 'mi-title', `<b style="background:${NODE_TYPES.boss.color}">${NODE_TYPES.boss.short}</b> 가장 깊은 곳 <small>${node.stage}번째 방</small>`));
      info.appendChild(el('div', 'mi-desc', `굴의 주인이 기다린다: 「${ENEMIES[encounterFor(node)[0][0]].name}」. 가는 길에 모닥불이나 상인을 만날 수도 있다.`));
    } else {
      info.appendChild(el('div', 'mi-title', `<b style="background:#6a6080">?</b> 알 수 없는 방 <small>${node.stage}번째 방</small>`));
      info.appendChild(el('div', 'mi-desc', '무엇이 있는지는 들어가 봐야 안다. 걸어가다 보면 적 무리, 갈림길, 상인, 수상한 것을 만난다.'));
    }
    const row = el('div', 'mi-btns');
    row.appendChild(btn('취소', 'ghost', () => { this.selected = null; info.classList.add('hidden'); }, { sfx: 'back', id: 'btn-node-cancel' }));
    if (reachable) {
      const go = btn('이동 ▶', 'primary', () => this.moveTo(node), { id: 'btn-node-go' });
      if (Game.run.torch <= 0) info.appendChild(el('div', 'mi-warn', '횃불이 꺼졌다. 어둠 속에서는 정예가 습격할 수 있다.'));
      row.appendChild(go);
    } else {
      row.appendChild(el('div', 'mi-locked', '갈 수 없는 방'));
    }
    info.appendChild(row);
  },

  moveTo(node) {
    const run = Game.run;
    run.pos = { stage: node.stage, row: node.row };
    run.path.push({ stage: node.stage, row: node.row });
    run.stats.nodes++;
    run.torch = Math.max(0, run.torch - CONST.TORCH_PER_MOVE);
    run.lastNode = node;
    Sfx.play('door');
    run.room = genRoom(run, node, node.type); // 방 안으로: 걸어가며 만나는 것들 (어둠 속 습격은 전투 직전에 판정)
    Game.go('explore');
  },

  update(dt) { this.t += dt; },

  render(ctx) {
    const run = Game.run;
    drawDungeonBackdrop(ctx, this.t, 0.55);
    // 연결선
    ctx.lineWidth = 3;
    const stages = run.map.stages;
    for (let s = 0; s < stages.length - 1; s++) {
      for (const a of stages[s]) for (const b of stages[s + 1]) {
        if (b.type !== 'boss' && Math.abs(a.row - b.row) > 1) continue;
        const pa = mapNodePos(a), pb = mapNodePos(b);
        const walked = run.path.some((q) => q.stage === a.stage && q.row === a.row) && run.path.some((q) => q.stage === b.stage && q.row === b.row);
        const fromCur = run.pos.stage === a.stage && run.pos.row === a.row;
        ctx.strokeStyle = walked ? '#ffd34a' : fromCur ? 'rgba(255,230,170,0.75)' : 'rgba(140,120,190,0.35)';
        ctx.setLineDash(fromCur && !walked ? [8, 6] : []);
        ctx.lineDashOffset = -this.t * 20;
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      }
    }
    // 입구 → 스테이지 1
    if (run.pos.stage === 0) {
      ctx.strokeStyle = 'rgba(255,230,170,0.75)';
      ctx.setLineDash([8, 6]);
      for (const b of stages[0]) { const pb = mapNodePos(b); ctx.beginPath(); ctx.moveTo(40, 318); ctx.lineTo(pb.x, pb.y); ctx.stroke(); }
    }
    ctx.setLineDash([]);
    // 파티 위치 마커
    let px = 40, py = 318;
    if (run.pos.stage > 0) { const p = mapNodePos(getNode(run.map, run.pos.stage, run.pos.row)); px = p.x; py = p.y; }
    const bob = Math.sin(this.t * 4) * 3;
    drawSprite(ctx, 'knight', px, py - 30 + bob, { scale: 2, t: this.t });
  },
};

// 지도/이벤트 화면 공용 배경: 돌벽 + 횃불
function drawDungeonBackdrop(ctx, t, dim) {
  const W = CONST.VIEW_W, H = CONST.VIEW_H;
  ctx.fillStyle = '#1d1828';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#262035';
  for (let y = 0; y < H; y += 36) {
    const off = (y / 36) % 2 ? 0 : 40;
    for (let x = -off; x < W; x += 80) { ctx.fillRect(x + 2, y + 2, 76, 32); }
  }
  for (const tx of [60, W - 60]) {
    const fl = 0.85 + Math.sin(t * 9 + tx) * 0.08 + Math.sin(t * 23 + tx) * 0.05;
    const g = ctx.createRadialGradient(tx, 140, 4, tx, 140, 170 * fl);
    g.addColorStop(0, 'rgba(255,170,80,0.35)');
    g.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(tx - 200, 0, 400, 360);
  }
  if (dim) { ctx.fillStyle = `rgba(10,8,16,${dim * 0.5})`; ctx.fillRect(0, 0, W, H); }
}

function showRulesHelp() {
  const box = el('div', 'help-box');
  box.innerHTML = `
    <div class="modal-title">규칙 안내</div>
    <div class="help-cols">
      <div><h4>원정</h4><ul>
        <li>지도에서 <b>같은 줄이나 바로 위·아래 줄</b>의 다음 방으로 가요. 무엇이 있는지는 들어가 봐야 알아요 (보스 방만 보여요).</li>
        <li>방 안에서는 파티가 앞으로 걸어가며 적 무리, 갈림길, 상인, 수상한 것, 모닥불, 고목, 상자를 만나요. 갈림길에서는 단서를 보고 길을 골라요.</li>
        <li><b>횃불</b>: 방을 옮길 때마다 -${CONST.TORCH_PER_MOVE}. 꺼지면 치명타가 줄고, 적 무리가 정예로 바뀌어 습격할 수 있어요.</li>
        <li><b>모닥불</b>: 식량 1개로 HP ${CONST.REST_HEAL_PCT * 100}% 회복 · 횃불 +${CONST.TORCH_REST_GAIN}.</li>
        <li><b>영구 사망</b>: 쓰러진 동료는 이번 원정에서 돌아오지 않아요.</li>
      </ul></div>
      <div><h4>전투</h4><ul>
        <li>평타는 자동. 캐릭터마다 ① 갑옷 스킬 · ② 무기 스킬 · ③ 필살기(게이지).</li>
        <li>스킬 버튼을 <b>탭</b>하면 알아서 대상을 잡고, <b>끌면</b> 원하는 곳에 써요. 캐릭터를 끌면 이동하거나, 적 위에 놓아 공격시켜요. 적을 탭하면 집중 공격.</li>
        <li>작전: 돌격 · 대형 · 후퇴. <b>자동</b>이면 스킬도 전략대로 써요.</li>
        <li><b>끊기·그로기</b>: 큰 적의 차지·호출 위 끊기 칸(●●●)을 2초 안에 채우면 끊기고 <b>흔들림</b>! 이때 그로기 게이지를 깎으면 무방비가 돼요. 같은 직업은 한 칸만 채워요 (탱커의 기절은 전부).</li>
        <li><b>짓누름</b>: 보스 평타에 맞을수록 쌓여 점점 아파요. 탱커는 거의 영향이 없어요.</li>
        <li><b>레벨 차</b>: 전투 Lv(캐릭터 Lv + 장비 Lv)이 던전 Lv보다 낮으면 크게 불리해요.</li>
      </ul></div>
    </div>`;
  box.appendChild(btn('닫기', 'primary', () => Game.closeModal(), { id: 'help-close' }));
  Game.modal(box, { dim: true, closeOnBg: true });
}
