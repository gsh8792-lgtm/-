// ===== 05_map.js : 전투 웨이브 선택 · 공용 UI(파티 패널·자원 바·회복약) · 규칙 안내 =====

// 노드 → 전투 웨이브
function encounterFor(node) {
  if (node.waves) return node.waves; // 이벤트 등에서 직접 지정
  const table = ENCOUNTERS[node.type === 'boss' ? 'boss' : node.type][node.stage] || ENCOUNTERS.battle[Math.min(4, node.stage)];
  return table[node.enc % table.length];
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
    if (opts.onSelect && (!h.dead || opts.allowDead)) {
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
  if (run.bigPotions) r.appendChild(el('div', 'res potion', `<i>💖</i>${run.bigPotions}`));
  if (run.feathers) r.appendChild(el('div', 'res potion', `<i>🪶</i>${run.feathers}`));
  if (run.trapKits) r.appendChild(el('div', 'res potion', `<i>🧰</i>${run.trapKits}`));
  if (run.torchPacks) r.appendChild(el('div', 'res potion', `<i>🔦</i>${run.torchPacks}`));
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
function usePotionFlow(run, onDone, kind) {
  const kinds = [['potion', '🧪 회복약', run.potions], ['bigPotion', '💖 상급', run.bigPotions || 0], ['feather', '🪶 부활 깃털', run.feathers || 0]].filter((k) => k[2] > 0);
  if (!kinds.length) { Game.toast('물약이 없어요'); return; }
  kind = kinds.some((k) => k[0] === kind) ? kind : kinds[0][0];
  const box = el('div', 'pick-box');
  box.appendChild(el('div', 'modal-title', kind === 'feather' ? '누구를 일으킬까요?' : '누구에게 쓸까요?'));
  if (kinds.length > 1) { const tabs = el('div', 'mc-tabs'); for (const [k, label, n] of kinds) tabs.appendChild(btn(`${label} ${n}`, 'small' + (k === kind ? ' on' : ''), () => { Game.closeModal(); usePotionFlow(run, onDone, k); }, { id: 'pot-kind-' + k })); box.appendChild(tabs); }
  box.appendChild(partyPanel(run, { allowDead: kind === 'feather', onSelect: (id) => {
    const h = run.heroes[id];
    if (kind === 'feather') {
      if (!h.dead) { Game.toast('쓰러진 동료에게만 쓸 수 있어요'); return; }
      run.feathers--; h.dead = false; h.hp = Math.round(h.maxHp * 0.4);
    } else {
      if (h.dead) { Game.toast('쓰러진 동료는 부활의 깃털로만 일으킬 수 있어요'); return; }
      if (h.hp >= h.maxHp) { Game.toast('이미 HP가 가득해요'); return; }
      if (kind === 'bigPotion') { run.bigPotions--; h.hp = h.maxHp; } else { run.potions--; h.hp = Math.min(h.maxHp, h.hp + h.maxHp * REWARD.potionHealPct); }
    }
    Sfx.play('heal');
    Game.closeModal();
    Game.toast(kind === 'feather' ? `${HEROES[id].name}이(가) 다시 일어났다!` : `${HEROES[id].name} HP 회복!`);
    if (onDone) onDone();
  } }));
  box.appendChild(btn('취소', 'ghost', () => Game.closeModal(), { sfx: 'back' }));
  Game.modal(box, { dim: true, closeOnBg: true });
}

// ---------------------------------------------------------------- 지도 장면
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
        <li>던전은 <b>방과 복도</b>로 이어져 있어요. 오른쪽 위 지도에서 이웃한 방을 탭하면 그쪽 복도로 걸어가요. 가 본 방과 그 이웃만 보여요.</li>
        <li>층마다 <b>계단</b>을 찾아 내려가요. 6층(가장 깊은 곳)의 보스 방은 잠겨 있어서 <b>열쇠·레버·봉인석</b> 중 하나를 풀어야 열려요.</li>
        <li>복도에서는 작은 적 무리를 두 번 만나고, 가끔 이름 붙은 <b>네임드 정예</b>가 나와요. 함정과 보급도 있어요.</li>
        <li><b>자동</b>이면 알아서 걷고 다음 방도 골라요. <b>수동</b>이면 ▶을 누르고 있거나 바닥을 탭해서 걸어요.</li>
        <li><b>횃불</b>: 복도를 걸으면 조금씩 닳아요. 꺼지면 치명타가 줄고 적 무리가 정예로 바뀌어 습격할 수 있어요.</li>
        <li><b>야영지</b>: 식량 1개로 HP ${CONST.REST_HEAL_PCT * 100}% 회복 · 횃불 +${CONST.TORCH_REST_GAIN}.</li>
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
