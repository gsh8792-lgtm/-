// ===== 04_core.js : 런 상태, 장면 상태 머신, DOM/입력 헬퍼 =====

// ---------------------------------------------------------------- DOM 헬퍼
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined && html !== null) e.innerHTML = html;
  return e;
}
function btn(label, cls, onClick, opts) {
  const b = el('button', 'btn ' + (cls || ''), label);
  b.type = 'button';
  b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (b.disabled) return;
    Sfx.play(opts && opts.sfx ? opts.sfx : 'click');
    onClick(ev);
  });
  if (opts && opts.id) b.id = opts.id;
  return b;
}
function bar(pct, cls) {
  const b = el('div', 'bar ' + (cls || ''));
  const f = el('div', 'fill');
  f.style.width = clamp(pct, 0, 1) * 100 + '%';
  b.appendChild(f);
  return b;
}
function setBar(b, pct) { b.firstChild.style.width = clamp(pct, 0, 1) * 100 + '%'; }
function portraitCanvas(spriteName, size, opts) {
  const c = el('canvas', 'pcv');
  c.width = size; c.height = size;
  drawPortrait(c, spriteName, opts);
  return c;
}

// ---------------------------------------------------------------- 런 상태
function newRun(seed) {
  const heroes = {};
  const prof = Game.profile || EQ.newProfile();
  HERO_ORDER.forEach((id) => {
    const mh = EQ.heroLoadout(prof, id).maxHp; // 장비 반영 최대 HP
    heroes[id] = { id, hp: mh, maxHp: mh, dead: false, upgrades: {} };
  });
  const strategy = {};
  for (const id in heroes) strategy[id] = JSON.parse(JSON.stringify(AI_PRESETS[id]));
  const run = {
    seed: seed >>> 0,
    map: generateMap(seed),
    pos: { stage: 0, row: 1 },
    path: [],
    gold: CONST.START_GOLD, food: CONST.START_FOOD, potions: 1, torch: CONST.TORCH_MAX,
    relics: [], heroes, strategy,
    party: DEFAULT_PARTY.slice(0, CONST.PARTY_SIZE), // 출전 멤버 (던전 입장 전까지 변경 가능)
    fruit: null,            // { bonus, battles }
    gotSupply: false,
    stats: { kills: 0, battles: 0, nodes: 0, startTime: performance.now(), dealt: {}, healed: {}, deathsAt: {} },
    autoMode: true,
    autoLevel: 1,           // 0 수동 / 1 반자동(② 직접) / 2 자동
    lastNode: null,
    result: null,
    tier: prof.tier || 0,   // 난이도 단계 (0 = 기본)
    loot: [],               // 이번 원정에서 얻은 장비/보석 (프로필에 바로 저장됨)
    stonesGot: 0,
    settled: false,
  };
  for (const id in heroes) { run.stats.dealt[id] = 0; run.stats.healed[id] = 0; }
  return run;
}
function partyIds(run) { return HERO_ORDER.filter((id) => run.party.includes(id)); }
function partyAlive(run) { return partyIds(run).map((id) => run.heroes[id]).filter((h) => !h.dead); }

// ---------------------------------------------------------------- 게임 (장면 상태 머신)
const Game = {
  run: null,
  settings: { sound: true, music: true, speed: 1, seenHints: {} },
  scene: null, sceneName: '', scenes: {},
  canvas: null, ctx: null, ui: null, overlay: null,
  time: 0,
  debug: { simMult: 1 }, // 테스트용: 전투 시뮬 가속 배율

  register(name, scene) { this.scenes[name] = scene; },

  go(name, params) {
    if (this.scene && this.scene.exit) this.scene.exit();
    this.ui.innerHTML = '';
    this.closeModal();
    this.ui.className = 'scene-' + name;
    this.sceneName = name;
    this.scene = this.scenes[name];
    Music.forScene(name);
    if (this.scene.enter) this.scene.enter(params || {});
    document.body.dataset.scene = name;
  },

  toast(msg, ms) {
    const t = el('div', 'toast', msg);
    document.getElementById('toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), ms || 1800);
    setTimeout(() => t.remove(), (ms || 1800) + 400);
  },

  // 첫 플레이 튜토리얼 힌트 (한 번만)
  hint(key, onClose) {
    if (this.settings.seenHints[key]) { if (onClose) onClose(); return false; }
    this.settings.seenHints[key] = true;
    this.saveSettings();
    const box = el('div', 'hint-box');
    box.appendChild(el('div', 'hint-title', '도움말'));
    box.appendChild(el('div', 'hint-text', HINTS[key]));
    box.appendChild(btn('알겠어요', 'primary', () => { this.closeModal(); if (onClose) onClose(); }, { id: 'hint-ok' }));
    this.modal(box, { dim: true, cls: 'hint-modal' });
    return true;
  },

  modal(content, opts) {
    this.closeModal();
    const o = this.overlay;
    o.innerHTML = '';
    o.className = 'overlay show' + (opts && opts.dim ? ' dim' : '') + (opts && opts.cls ? ' ' + opts.cls : '');
    const wrap = el('div', 'modal');
    wrap.appendChild(content);
    o.appendChild(wrap);
    if (opts && opts.closeOnBg) o.onclick = (e) => { if (e.target === o) { Sfx.play('back'); this.closeModal(); if (opts.onClose) opts.onClose(); } };
    else o.onclick = null;
    this.modalOpen = true;
  },
  closeModal() {
    if (!this.overlay) return;
    this.overlay.className = 'overlay';
    this.overlay.innerHTML = '';
    this.overlay.onclick = null;
    this.modalOpen = false;
  },

  loadSettings() {
    const s = safeStorageGet('fe_settings', null);
    if (s) Object.assign(this.settings, s);
    Sfx.enabled = this.settings.sound;
    Music.enabled = this.settings.music !== false;
  },
  saveSettings() { safeStorageSet('fe_settings', this.settings); },
};

// ---------------------------------------------------------------- 입력 (논리 좌표 변환)
const Input = {
  scale: 1, rectLeft: 0, rectTop: 0,
  toLogical(ev) {
    return { x: (ev.clientX - this.rectLeft) / this.scale, y: (ev.clientY - this.rectTop) / this.scale };
  },
  attach(canvas) {
    const fire = (kind, ev) => {
      const s = Game.scene;
      if (!s) return;
      const p = this.toLogical(ev);
      if (kind === 'down' && s.pointerDown) s.pointerDown(p, ev);
      if (kind === 'move' && s.pointerMove) s.pointerMove(p, ev);
      if (kind === 'up' && s.pointerUp) s.pointerUp(p, ev);
    };
    canvas.addEventListener('pointerdown', (e) => { Sfx.init(); Sfx.resume(); canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); fire('down', e); e.preventDefault(); });
    canvas.addEventListener('pointermove', (e) => { fire('move', e); });
    canvas.addEventListener('pointerup', (e) => { fire('up', e); });
    canvas.addEventListener('pointercancel', (e) => { fire('up', e); });
  },
};
