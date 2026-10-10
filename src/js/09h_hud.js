// ===== 09h_hud.js : 마을 HUD (v0.57) — 지명 패 · 자원 · 하단 메뉴(둥근 금테 아이콘) · 설정 창 =====
// 버튼 id 는 예전과 같다 (btn-roster · btn-inv · btn-party · btn-gacha · btn-codex · btn-f-strategy · btn-territory · btn-automove · btn-hunt)
const VILLAGE_MENU = [
  { id: 'btn-roster', ic: '🧝', lb: '영웅', go: (s) => openRoster({ onClose: () => s.refreshRes() }), badge: (p) => GACHA.ownedIds(p).filter((id) => talentSpent(p, id) < talentPoints(p, id) || GACHA.canBreak(p, id)).length + HERO_ORDER.filter((id) => GACHA.canUnlock(p, id)).length },
  { id: 'btn-party', ic: '👥', lb: '편성', go: (s) => openPartySelect(Game.run, () => s.rebuildParty()) },
  { id: 'btn-inv', ic: '🎒', lb: '가방', go: (s) => openInventory({ onClose: () => s.refreshRes() }) },
  { id: 'btn-soul', ic: '🔮', lb: '소울트리', go: (s) => openSoulTree(partyIds(Game.run)[0], () => s.refreshRes()), badge: (p) => partyIds(Game.run).filter((id) => talentSpent(p, id) < talentPoints(p, id)).length },
  { id: 'btn-gacha', ic: '✨', lb: '소환', go: (s) => openGacha(() => s.refreshRes()), badge: (p) => (p.tickets >= 5 ? p.tickets : 0) },
  { id: 'btn-territory', ic: '🏰', lb: '영지', go: (s) => openTerritory(() => s.refreshRes()), badge: (p) => (terrPending(p).gold >= 100 ? '!' : 0) },
  { id: 'btn-codex', ic: '📖', lb: '도감', go: (s) => openCodex(() => s.refreshRes()) },
  { id: 'btn-ach', ic: '🏆', lb: '업적', go: (s) => openAchievements(() => s.refreshRes()) },
  { id: 'btn-f-strategy', ic: '⚙', lb: '전략', go: () => openStrategyEditor(Game.run) },
  { id: 'btn-settings', ic: '🔧', lb: '설정', go: (s) => openSettings(() => s.refreshRes()) },
];
function buildVillageHud(scene) {
  const ui = Game.ui;
  const plaque = el('div', 'v-plaque');
  plaque.appendChild(el('div', 'v-name', '🌲 숲속 마을'));
  scene.resBox = el('div', 'v-res'); plaque.appendChild(scene.resBox);
  ui.appendChild(plaque);
  const act = el('div', 'v-act');
  act.appendChild(btn('🌀 포탈 ▶', 'primary small', () => scene.autoMove('portal'), { id: 'btn-automove' }));
  act.appendChild(btn('🌾 사냥터', 'small', () => scene.autoMove('hunt'), { id: 'btn-hunt' }));
  ui.appendChild(act);
  const dock = el('div', 'v-dock');
  scene.menuBadges = {};
  for (const m of VILLAGE_MENU) {
    const b = el('button', 'fx-orb'); b.type = 'button'; b.id = m.id;
    b.innerHTML = `<span class="o-ic">${m.ic}</span><span class="o-lb">${m.lb}</span>`;
    b.addEventListener('click', () => { Sfx.play('click'); m.go(scene); });
    dock.appendChild(b); scene.menuBadges[m.id] = b;
  }
  ui.appendChild(dock);
}
// 메뉴 알림 (찍을 점수 · 돌파 가능 · 영지 수확 …)
function refreshVillageBadges(scene) {
  const p = Game.profile; if (!scene.menuBadges) return;
  for (const m of VILLAGE_MENU) {
    const b = scene.menuBadges[m.id]; if (!b) continue;
    const old = b.querySelector('.o-badge'); if (old) old.remove();
    const n = m.badge ? m.badge(p) : 0;
    b.classList.toggle('hot', !!n);
    if (n) b.appendChild(el('span', 'o-badge', String(n)));
  }
}

// ---------------------------------------------------------------- 설정
function openSettings(onClose) {
  const S = Game.settings, box = el('div', 'confirm-box set-box');
  box.appendChild(el('div', 'modal-title', '🔧 설정'));
  const rows = el('div', 'set-rows');
  const toggle = (id, name, get, set) => { const r = el('div', 'set-row'); r.appendChild(el('span', '', name)); const b = btn(get() ? '켬' : '끔', 'small' + (get() ? ' primary' : ' ghost'), () => { set(!get()); Game.saveSettings(); openSettings(onClose); }, { id }); r.appendChild(b); rows.appendChild(r); };
  toggle('set-sound', '효과음', () => S.sound, (v) => { S.sound = v; Sfx.enabled = v; });
  toggle('set-music', '배경 음악', () => S.music !== false, (v) => { S.music = v; Music.enabled = v; if (!v && Music.stop) Music.stop(); });
  { const r = el('div', 'set-row'); r.appendChild(el('span', '', '도움말 다시 보기')); r.appendChild(btn('초기화', 'small ghost', () => { S.seenHints = {}; Game.saveSettings(); Game.toast('처음 보는 화면에서 도움말이 다시 나와요', 1400); }, { id: 'set-hints' })); rows.appendChild(r); }
  { const p = Game.profile; const r = el('div', 'set-row'); r.appendChild(el('span', '', `원정 기록 <small class="muted">보스 ${achCnt(p, 'boss')}회 · 거점 ${achCnt(p, 'posts')}곳 · 영웅 ${GACHA.ownedIds(p).length}명</small>`)); rows.appendChild(r); }
  box.appendChild(rows);
  box.appendChild(el('div', 'muted set-ver', `숲속 원정대 v${GAME_VERSION}`));
  box.appendChild(btn('닫기', 'primary', () => { Game.closeModal(); if (onClose) onClose(); }, { id: 'set-close', sfx: 'back' }));
  Game.modal(box, { dim: true, closeOnBg: true });
}
