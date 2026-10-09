// ===== 10_main.js : 부트, 메인 루프, 16:9 레터박스 리사이즈 =====
function boot() {
  Game.canvas = document.getElementById('cv');
  Game.ctx = Game.canvas.getContext('2d');
  Game.ui = document.getElementById('ui');
  Game.overlay = document.getElementById('overlay');
  Game.loadSettings();
  Game.profile = EQ.loadProfile();
  Game.register('title', TitleScene);
  Game.register('field', FieldScene);
  Game.register('hunt', HuntScene);
  Game.register('dungeon', DungeonScene);
  Game.register('battle', BattleScene);
  Game.register('reward', RewardScene);
  Game.register('event', EventScene);
  Game.register('shop', ShopScene);
  Game.register('rest', RestScene);
  Game.register('tree', TreeScene);
  Game.register('result', ResultScene);
  Input.attach(Game.canvas);
  document.addEventListener('pointerdown', () => { Sfx.init(); Sfx.resume(); }, { once: false, passive: true });
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  resize();
  Game.go('title');
  let last = performance.now();
  let fpsAcc = 0, fpsN = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    fpsAcc += dt; fpsN++;
    if (fpsAcc >= 1) { Game.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
    try {
      if (Game.scene && Game.scene.update) Game.scene.update(dt);
      const ctx = Game.ctx;
      ctx.setTransform(Game.pixelRatio, 0, 0, Game.pixelRatio, 0, 0);
      ctx.imageSmoothingEnabled = false;
      if (Game.scene && Game.scene.render) Game.scene.render(ctx);
    } catch (e) {
      console.error(e);
      Game.lastError = String(e && e.stack || e);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// 가로 16:9 논리 해상도(960×540)를 화면에 맞춰 확대하고 남는 부분은 레터박스.
// 세이프에어리어(노치)는 #app 패딩(env())으로 제외한다.
function resize() {
  const app = document.getElementById('app');
  const stage = document.getElementById('stage');
  const cs = getComputedStyle(app);
  const padL = parseFloat(cs.paddingLeft) || 0, padR = parseFloat(cs.paddingRight) || 0;
  const padT = parseFloat(cs.paddingTop) || 0, padB = parseFloat(cs.paddingBottom) || 0;
  const aw = app.clientWidth - padL - padR, ah = app.clientHeight - padT - padB;
  const scale = Math.min(aw / CONST.VIEW_W, ah / CONST.VIEW_H);
  const left = padL + (aw - CONST.VIEW_W * scale) / 2, top = padT + (ah - CONST.VIEW_H * scale) / 2;
  stage.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  Game.pixelRatio = scale * dpr;
  Game.canvas.width = Math.round(CONST.VIEW_W * Game.pixelRatio);
  Game.canvas.height = Math.round(CONST.VIEW_H * Game.pixelRatio);
  Input.scale = scale;
  const r = app.getBoundingClientRect();
  Input.rectLeft = r.left + left;
  Input.rectTop = r.top + top;
  document.body.classList.toggle('portrait', window.innerHeight > window.innerWidth);
}

window.GAME = { Music, Sfx, enterDungeon, floorNeighbors, dungeonNextStep, EQ, GACHA, CHARACTERS, grantBattleLoot, openInventory, openBlacksmith, openRoster, openGacha, refreshRunLoadout, Game, CONST, BattleSim, genFloor, newRun, HEROES, ENEMIES, SKILLS, ENCOUNTERS, NODE_TYPES, EVENTS, RELICS, AI_PRESETS, BattleScene, FieldScene, makeRng, hashSeed, drawSprite, drawDungeonBackdrop, SpriteCache, ART };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
