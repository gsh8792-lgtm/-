# 기사(엘린) 동작 시트 → 게임 시트 (발 기준 맞추기 · 동작별 줄)
# 원본: 「나이트모션」 (assets_src/knight/motion, knight_anim.json · HANDOFF_PROMPT.md)
#   투명 PNG, 프레임 436x428, 모든 동작 같은 카메라·같은 발 기준점 (158,365), 24fps, 오른쪽을 본다
#   idle 96(12열, 숨 48프레임 x2) · run 24(8열) · attack 40(8열, 3연격 타격 7·15·27) · skill 97(10열, 점프 베기 착지 25, 48~ 자세 복귀)
# python3 tools/knight/build_knight.py  →  src/js/02b_sprite_sheets.js 의 SPRITE_SHEETS.knightElin 갱신
import json, re, io, base64, os
import numpy as np
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets_src', 'knight')
CW, CH, AX, AY = 436, 428, 158, 365  # 시트 칸 크기 · 발 기준점
UP, DOWN, HALF = 363, 30, 276        # 기준점 위·아래·좌우로 잘라낼 시트 픽셀 (머리 위로 든 검 · 스킬 베기 이펙트까지)
FH = 320                             # 출력 프레임 높이
k = FH / (UP + DOWN); FW = int(round(HALF * 2 * k)) // 2 * 2
BODY_REF = 330  # 이전 시트(v0.50)와 화면 속 키를 같게: 시트 공격 첫 프레임 몸 높이 240px ↔ 프레임 높이 330px 일 때 hMul 1.5

def cells(name, cols, n):
    im = Image.open(os.path.join(SRC, 'motion', name)).convert('RGBA')
    return [im.crop(((i % cols) * CW, (i // cols) * CH, (i % cols + 1) * CW, (i // cols + 1) * CH)) for i in range(n)]
idle_s, run_s, att_s, sk_s = cells('idle.png', 12, 96), cells('run.png', 8, 24), cells('attack.png', 8, 40), cells('skill.png', 10, 97)

def sheet_frame(img): return img.crop((AX - HALF, AY - UP, AX + HALF, AY + DOWN)).resize((FW, FH), Image.LANCZOS)

# 공격: 3연격을 타격마다 나눠 평타 한 번에 한 베기씩 (segs: 시트 안 프레임 구간)
ATT_IDX = [[3, 5, 7, 9, 11], [13, 15, 17, 19, 21], [23, 25, 27, 29, 31, 33, 35, 37, 39]]
att_fr, segs = [], []
for seg in ATT_IDX: segs.append([len(att_fr), len(att_fr) + len(seg)]); att_fr += [sheet_frame(att_s[i]) for i in seg]
ANIMS = [
    ('idle',   [sheet_frame(idle_s[i]) for i in range(0, 48, 4)], 6, True, {}),          # 숨 한 번 (48프레임 중 12장 · 2초)
    ('walk',   [sheet_frame(run_s[i]) for i in range(0, 24, 2)], 12, True, {}),          # 달리기 한 주기 (1초)
    ('attack', att_fr, 12, False, {'segs': segs}),
    ('cast',   [sheet_frame(sk_s[i]) for i in range(0, 48, 3)], 25, False, {}),           # 점프 베기 (착지 24~25 포함, 복귀 구간은 대기로)
    ('hurt',   [sheet_frame(att_s[i]) for i in (0, 39)], 8, False, {}),
]
base = ANIMS[0][1][0]; down = []
for t in [0.3, 0.6, 0.85, 1.0]:  # 쓰러짐: 대기 첫 프레임을 기울여 내려앉힌다
    im = Image.new('RGBA', (FW, FH)); small = base.resize((FW, int(FH * (1 - 0.25 * t))), Image.LANCZOS)
    im.alpha_composite(small.rotate(-28 * t, resample=Image.BICUBIC), (0, FH - small.height)); down.append(im)
ANIMS.append(('down', down, 8, False, {}))

n = max(len(f) for _, f, *_ in ANIMS)
sheet = Image.new('RGBA', (FW * n, FH * len(ANIMS))); meta = {}
for r, (name, fr, fps, loop, extra) in enumerate(ANIMS):
    for i, im in enumerate(fr): sheet.alpha_composite(im, (i * FW, r * FH))
    meta[name] = {'row': r, 'n': len(fr), 'fps': fps, 'loop': loop, 'hold': name == 'down', **extra}
buf = io.BytesIO(); sheet.save(buf, 'WEBP', quality=86)
os.makedirs(os.path.join(ROOT, 'test-output'), exist_ok=True); sheet.save(os.path.join(ROOT, 'test-output', 'sheet_knightElin.png'))
src = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
path = os.path.join(ROOT, 'src', 'js', '02b_sprite_sheets.js')
s = open(path).read(); m = re.search(r'const SPRITE_SHEETS = (\{.*\});', s, re.S); d = json.loads(m.group(1))
HMUL = round(1.5 * (UP + DOWN) / BODY_REF, 3)
d['knightElin'] = {'src': src, 'fw': FW, 'fh': FH, 'footY': int(round(UP * k)), 'anims': meta, 'always': True, 'hMul': HMUL, 'barMul': 1.5,
                   'portrait': {'row': 1, 'x': 0.495, 'y': 0.25, 'w': 0.225, 'h': 0.282}, 'from': '나이트모션 (knight_v18_final) idle/run/attack/skill 시트'}
open(path, 'w').write(s[:m.start(1)] + json.dumps(d, separators=(',', ':'), ensure_ascii=False) + s[m.end(1):])
print('knightElin', FW, FH, 'hMul', HMUL, {k2: v['n'] for k2, v in meta.items()}, len(buf.getvalue()) // 1024, 'KB')
