// ===== 05d_oaths.js : 원정 맹세 — 스스로 원정을 어렵게 만들고 보상을 키운다 (하데스의 「열기」 같은 장치) =====
// 고블린 굴 입구에서 고른다. 고른 맹세의 보상 배율을 더해, 원정이 끝날 때 가져가는 골드·경험치에 곱한다.
const OATHS = {
  iron:   { icon: '🛡', name: '강철 피부', desc: '적 체력 +25%', hp: 1.25, reward: 0.25 },
  fury:   { icon: '🔥', name: '분노', desc: '적 공격력 +20%', atk: 1.2, reward: 0.3 },
  hunger: { icon: '🍂', name: '빈 배낭', desc: '식량 -2 · 회복약 -1로 출발', reward: 0.2 },
  gloom:  { icon: '🕯', name: '꺼져가는 횃불', desc: '횃불 절반으로 출발', reward: 0.15 },
  hunt:   { icon: '🐺', name: '사냥꾼의 밤', desc: '방 전투마다 고블린 암살자 1마리 추가', reward: 0.3 },
};
function oathList(run) { return (run.oaths || []).filter((k) => OATHS[k]); }
function oathReward(run) { return oathList(run).reduce((a, k) => a + OATHS[k].reward, 0); }
function oathScale(run) { let hp = 1, atk = 1; for (const k of oathList(run)) { hp *= OATHS[k].hp || 1; atk *= OATHS[k].atk || 1; } return { hp, atk }; }
// 입장할 때 한 번 적용 (빈 배낭 · 꺼져가는 횃불)
function oathApplyStart(run) {
  const o = oathList(run);
  if (o.includes('hunger')) { run.food = Math.max(0, run.food - 2); run.potions = Math.max(0, run.potions - 1); }
  if (o.includes('gloom')) run.torch = Math.min(run.torch, Math.round(CONST.TORCH_MAX / 2));
}
// 전투 구성: 사냥꾼의 밤 — 방 전투(보스·소규모 제외) 첫 웨이브에 암살자 추가
function oathWaves(run, node, waves) {
  if (!oathList(run).includes('hunt') || node.type === 'boss' || node.small || !waves.length) return waves;
  return [waves[0].concat(['goblin_stalker'])].concat(waves.slice(1));
}
