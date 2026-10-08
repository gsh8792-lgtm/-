// break_lab 결과 → docs/break_verification.md
// node tools/break_lab_report.cjs
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const rd = (f) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/balance', f), 'utf8')); } catch (e) { return null; } };
const P = rd('break_lab_pressure.json'), A = rd('break_lab_archetypes.json'), V1 = rd('break_lab_archetypes_v1.json'), C = rd('break_lab_chars.json');
const BN = { ogre_chief: '오우거 대족장', thorn_queen: '가시덩굴 여왕', mist_stag: '안개 사슴왕', swamp_turtle: '늪거북 장로' };
const FAV = { ogre_chief: '탱커', thorn_queen: '매지션', mist_stag: '근딜', swamp_turtle: '원딜·서포터' };
const p = (x) => Math.round(x * 100) + '%';
const L = [];
L.push('# 그로기 역할 분담 검증 결과', '');
L.push('> 자동 생성: `node tools/break_lab.cjs archetypes|chars` → `node tools/break_lab_report.cjs`. 헤드리스 전투 시뮬(같은 장비 없음, 보스전, HP 가득). 승률은 판 수가 적으면 ±10%p 정도 흔들린다.', '');
const bosses = (A || C).bosses;
if (P) {
  L.push(`## 0. 보스 압박 × 레벨 차이 (셀당 ${P.n}판, 보스 4종)`, '');
  L.push('레벨 차이 = 파티 전투 레벨(장비 레벨) − 던전 레벨. 칸 = 보스 4종 평균 승률 · 판당 전사자. 동레벨이면 탱커(또는 든든한 근딜) 없이는 버티지 못하고, 레벨 차가 크면 딜찍누가 된다.', '');
  L.push('| 조합 | ' + P.gaps.map((g) => (g > 0 ? '+' : '') + g).join(' | ') + ' |');
  L.push('|---|' + P.gaps.map(() => '---').join('|') + '|');
  for (const r of P.rows) L.push(`| ${r.name} | ` + P.gaps.map((g) => { const cs = P.bosses.map((b) => r.cells[g][b]); const w = cs.reduce((a, c) => a + c.win, 0) / cs.length, d = cs.reduce((a, c) => a + c.deaths, 0) / cs.length; return `${p(w)} · ${d.toFixed(1)}`; }).join(' | ') + ' |');
  L.push('', '동레벨 보스별 승률:', '');
  L.push('| 조합 | ' + P.bosses.map((b) => BN[b]).join(' | ') + ' |');
  L.push('|---|' + P.bosses.map(() => '---').join('|') + '|');
  for (const r of P.rows) if (r.cells[0]) L.push(`| ${r.name} | ` + P.bosses.map((b) => p(r.cells[0][b].win)).join(' | ') + ' |');
  L.push('');
}
if (A) {
  L.push(`## 1. 조합 원형 × 보스 (규칙 V2, 셀당 ${A.n}판)`, '');
  L.push('보스별 우대 직업: ' + bosses.map((b) => `${BN[b]} = ${FAV[b]}`).join(' · '), '');
  L.push('| 조합 | AI | ' + bosses.map((b) => BN[b]).join(' | ') + ' |');
  L.push('|---|---|' + bosses.map(() => '---').join('|') + '|');
  for (const r of A.rows) L.push(`| ${r.name} | ${r.profile === 'smart' ? '기믹' : '딜만'} | ` + bosses.map((b) => `${p(r.cells[b].win)} · ${r.cells[b].breaks}회`).join(' | ') + ' |');
  L.push('', '칸 = 승률 · 판당 보스 그로기 횟수. "기믹" AI = 끊기 타이밍을 맞추고 필살기를 흔들림·그로기에 맞춘다. "딜만" AI = 모든 스킬을 쿨마다 가까운 적에게.', '');
  L.push('### 게이지 기여 (보스별, 대표 조합)', '');
  for (const r of A.rows.filter((x) => x.profile === 'smart').slice(0, 6)) {
    L.push(`- **${r.name}**: ` + bosses.map((b) => `${BN[b]} [` + Object.entries(r.cells[b].share).sort((a, c) => c[1] - a[1]).slice(0, 3).map(([k, v]) => `${({ cancel: '끊기', skill: '스킬', basic: '평타', stun: '기절', intrfail: '끊기 실패분', ult: '필살기' })[k] || k} ${Math.round(v * 100)}%`).join(', ') + ']').join(' / '));
  }
  L.push('');
}
if (A && V1) {
  L.push(`## 2. 이전 규칙(V1)과 비교 (V1 셀당 ${V1.n}판)`, '');
  L.push('| 조합 | ' + bosses.map((b) => BN[b]).join(' | ') + ' |');
  L.push('|---|' + bosses.map(() => '---').join('|') + '|');
  for (const r of A.rows) { const o = V1.rows.find((x) => x.name === r.name); if (!o) continue; L.push(`| ${r.name} | ` + bosses.map((b) => `${p(o.cells[b].win)} → **${p(r.cells[b].win)}**`).join(' | ') + ' |'); }
  L.push('');
}
if (C) {
  L.push(`## 3. 캐릭터 × 필살기 × 보스 (셀당 ${C.n}판)`, '');
  L.push('각 캐릭터를 기준 파티의 같은 직업 자리에 넣어 측정. **탱커 있는 기준**: 탱커 자리면 [캐릭터, 단비, 보리], 서포터면 [토비, 단비, 캐릭터], 그 외 [토비, 캐릭터, 보리]. **탱커 없는 기준** (레벨 +${C.ntGap || 0}, 장비로 보완한 상태): 원딜이면 [캐릭터, 단비, 보리], 그 외 딜러면 [캐릭터, 별비, 보리], 서포터면 [별비, 단비, 캐릭터]. 변주(A2/B2/C2)는 5돌파, 기본(A/B/C)은 0돌파.', '');
  const KS = ['A', 'B', 'C', 'A2', 'B2', 'C2'];
  L.push('| 캐릭터 | 필살기 | ' + bosses.map((b) => BN[b] + ' (탱/無)').join(' | ') + ' |');
  L.push('|---|---|' + bosses.map(() => '---').join('|') + '|');
  for (const c of C.chars) for (const k of KS) {
    const r = c.ults[k]; if (!r) continue;
    L.push(`| ${k === 'A' ? `**${c.name}**` : ''} | ${k} | ` + bosses.map((b) => `${p(r.withTank[b].win)}${r.noTank[b] ? ' / ' + p(r.noTank[b].win) : ''}`).join(' | ') + ' |');
  }
  L.push('');
  // 활용 범위 요약
  L.push('### 활용 범위 요약', '');
  L.push('- **최선 필살기**: 보스마다 탱커 없는 기준(탱커 캐릭터는 탱커 있는 기준) 승률이 가장 높은 필살기.', '- **쓸만한 보스 수**: 그 캐릭터의 어떤 필살기로든 승률 60% 이상인 보스 수.', '- **필살기 다양성**: 보스마다 최선 필살기가 몇 종류로 갈리는가 (1 = 한 가지가 늘 최선).', '');
  L.push('| 캐릭터 | 직업 | ' + bosses.map((b) => BN[b] + ' 최선').join(' | ') + ' | 쓸만한 보스 | 필살기 다양성 |');
  L.push('|---|---|' + bosses.map(() => '---').join('|') + '|---|---|');
  const roleName = { tank: '탱커', melee: '근딜', ranged: '원딜', mage: '매지션', support: '서포터' };
  for (const c of C.chars) {
    const key = (r, b) => (c.role === 'tank' ? r.withTank[b] : r.noTank[b] || r.withTank[b]).win;
    const bests = bosses.map((b) => { let bk = null, bv = -1; for (const k of KS) { const r = c.ults[k]; if (r && key(r, b) > bv) { bv = key(r, b); bk = k; } } return [bk, bv]; });
    const usable = bosses.filter((b) => KS.some((k) => c.ults[k] && key(c.ults[k], b) >= 0.6)).length;
    L.push(`| ${c.name} | ${roleName[c.role]} | ` + bests.map(([k, v]) => `${k} ${p(v)}`).join(' | ') + ` | ${usable}/4 | ${new Set(bests.map((x) => x[0][0])).size} |`);
  }
  L.push('');
}
fs.writeFileSync(path.join(ROOT, 'docs/break_verification.md'), L.join('\n'));
console.log('wrote docs/break_verification.md');
