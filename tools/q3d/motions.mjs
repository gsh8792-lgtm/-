// 직접 만든 동작 (에셋의 Idle/Walk/Cast 대신). 뼈 회전은 기본 자세 위에 더하는 도(°) 값.
// 축 (이 모델 기준, tools/q3d/render.html AXES로 확인): 다리 앞으로 = -x, 무릎 굽힘 = +x(아래다리),
// 팔 앞으로 = -x, 팔꿈치 굽힘 = -x(아래팔), 왼팔 벌리기 = -z / 오른팔 벌리기 = +z, 상체 숙임 = +x, 고개 숙임 = +x
// 카메라는 캐릭터 오른쪽 앞(오른팔이 화면 앞쪽) — 공격·시전 손짓은 오른팔 위주.
const S = Math.sin, C = Math.cos, TAU = Math.PI * 2;
const ease = (k) => k * k * (3 - 2 * k); // smoothstep
const lerp = (a, b, k) => a + (b - a) * k;
// 키 자세 사이를 보간: keys = [[시각(0~1), 자세], ...]
function blend(keys, k) {
  let i = 0; while (i < keys.length - 2 && k > keys[i + 1][0]) i++;
  const [t0, a] = keys[i], [t1, b] = keys[i + 1], u = ease(Math.min(1, Math.max(0, (k - t0) / (t1 - t0 || 1))));
  const out = {}, names = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const n of names) { const p = a[n] || [0, 0, 0], q = b[n] || [0, 0, 0]; out[n] = [0, 1, 2].map((j) => lerp(p[j], q[j], u)); }
  return out;
}
const off = (pose) => { const o = pose._off || [0, 0, 0]; delete pose._off; return { x: o[0], y: o[1], z: o[2] }; };
// 기본 자세 보정: 팔을 몸 옆으로 살짝 내리고 팔꿈치를 조금 굽힌다 (A자세 → 자연스럽게)
const REST = { 'UpperArm.L': [-6, 0, 8], 'UpperArm.R': [-6, 0, -8], 'Forearm.L': [-14, 0, 0], 'Forearm.R': [-14, 0, 0] };
const withRest = (p) => { const o = Object.assign({}, p); for (const n in REST) o[n] = (o[n] || [0, 0, 0]).map((v, j) => v + REST[n][j]); return o; };

export const MOTIONS = {
  // 대기: 숨쉬기 + 고개·손 미세 움직임 (2초 루프)
  idle: { n: 8, dur: 2.0, loop: true, pose(k) { const b = S(k * TAU);
    return withRest({ Spine: [2 + b * 1.6, 0, 0], Chest: [b * 1.2, 0, 0], Neck: [-b * 1.5, 0, 2.5], 'UpperArm.L': [b * 2, 0, b * 1.5], 'UpperArm.R': [-b * 2, 0, -b * 1.5], 'Forearm.R': [-b * 4, 0, 0], 'Forearm.L': [b * 3, 0, 0], Hips: [0, b * 2, 0], _off: [0, -0.004 * (1 - C(k * TAU)), 0] }); } },
  // 걷기: 다리 교차 + 팔 반대로 흔들기 + 몸 들썩임 (0.8초 루프)
  walk: { n: 8, dur: 0.8, loop: true, pose(k) { const s = S(k * TAU), c = C(k * TAU);
    return withRest({ 'UpperLeg.L': [-17 * s, 0, 0], 'UpperLeg.R': [17 * s, 0, 0],
      'LowerLeg.L': [Math.max(0, -S(k * TAU - 0.9)) * 30 + 4, 0, 0], 'LowerLeg.R': [Math.max(0, S(k * TAU - 0.9)) * 30 + 4, 0, 0],
      'UpperArm.L': [20 * s, 0, 0], 'UpperArm.R': [-20 * s, 0, 0], 'Forearm.L': [-8 - Math.max(0, -s) * 14, 0, 0], 'Forearm.R': [-8 - Math.max(0, s) * 14, 0, 0],
      Spine: [6, 0, 0], Hips: [0, 7 * s, 0], Chest: [0, -5 * s, 0], Neck: [-3, -2 * s, 0], _off: [0, -0.018 * Math.abs(c), 0] }); } },
  // 공격: 오른손을 뒤로 모았다가 빛을 밀어내듯 앞으로 (0.5초, 한 번)
  attack: { n: 6, dur: 0.5, pose(k) { return withRest(blend([
    [0, {}],
    [0.35, { 'UpperArm.R': [38, 0, -10], 'Forearm.R': [-60, 0, 0], Hips: [0, -14, 0], Chest: [0, -10, 0], Spine: [-4, 0, 0], 'UpperLeg.L': [-10, 0, 0] }],
    [0.6, { 'UpperArm.R': [-78, 0, 10], 'Forearm.R': [-6, 0, 0], Hips: [0, 16, 0], Chest: [0, 10, 0], Spine: [10, 0, 0], 'UpperLeg.L': [-18, 0, 0], 'LowerLeg.L': [16, 0, 0], 'UpperArm.L': [18, 0, 0], _off: [0, -0.02, 0.03] }],
    [1, {}]], k)); } },
  // 시전: 두 손을 앞위로 모아 들어 올렸다가 펼친다 (1초, 한 번)
  cast: { n: 10, dur: 1.0, pose(k) { return withRest(blend([
    [0, {}],
    [0.3, { 'UpperArm.L': [-55, 0, 14], 'UpperArm.R': [-55, 0, -14], 'Forearm.L': [-50, 0, 0], 'Forearm.R': [-50, 0, 0], Spine: [6, 0, 0], Neck: [8, 0, 0] }],
    [0.65, { 'UpperArm.L': [-120, 0, -18], 'UpperArm.R': [-120, 0, 18], 'Forearm.L': [-10, 0, 0], 'Forearm.R': [-10, 0, 0], Spine: [-8, 0, 0], Chest: [-4, 0, 0], Neck: [-14, 0, 0], _off: [0, 0.012, 0] }],
    [0.85, { 'UpperArm.L': [-95, 0, -30], 'UpperArm.R': [-95, 0, 30], 'Forearm.L': [-8, 0, 0], 'Forearm.R': [-8, 0, 0], Spine: [-4, 0, 0], Neck: [-8, 0, 0] }],
    [1, {}]], k)); } },
  // 피격: 뒤로 젖혀지며 움찔 (0.3초)
  hurt: { n: 4, dur: 0.3, pose(k) { return withRest(blend([
    [0, {}],
    [0.35, { Spine: [-14, 0, 6], Chest: [-6, 0, 0], Neck: [-12, 0, -6], 'UpperArm.L': [20, 0, -16], 'UpperArm.R': [20, 0, 16], 'Forearm.L': [-30, 0, 0], 'Forearm.R': [-30, 0, 0], _off: [0, -0.01, -0.03] }],
    [1, {}]], k)); } },
  // 쓰러짐: 무릎을 꿇고 앞으로 고개를 떨군다 (0.6초, 마지막 프레임 유지)
  down: { n: 6, dur: 0.6, hold: true, pose(k) { return withRest(blend([
    [0, {}],
    [0.4, { Spine: [-10, 0, 0], Neck: [-10, 0, 0], 'UpperLeg.L': [-30, 0, 0], 'UpperLeg.R': [-10, 0, 0], 'LowerLeg.L': [40, 0, 0], 'LowerLeg.R': [50, 0, 0], _off: [0, -0.12, 0] }],
    [1, { Spine: [20, 0, 0], Chest: [8, 0, 0], Neck: [16, 0, 0], 'UpperLeg.L': [-70, 0, 0], 'UpperLeg.R': [-20, 0, 0], 'LowerLeg.L': [120, 0, 0], 'LowerLeg.R': [110, 0, 0], 'UpperArm.L': [-20, 0, -10], 'UpperArm.R': [-30, 0, 10], 'Forearm.L': [-30, 0, 0], 'Forearm.R': [-30, 0, 0], _off: [0, -0.34, 0] }]], k)); } },
};
export function motionFrame(m, i) { const M = MOTIONS[m], k = M.loop ? i / M.n : i / (M.n - 1); const p = M.pose(k); return { pose: p, off: off(p) }; }
