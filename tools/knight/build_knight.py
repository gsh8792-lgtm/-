# 기사(엘린) GIF 2개 → 게임 동작 시트 (배경색 빼기 · 발 기준 맞추기 · 동작별 줄)
# python3 tools/knight/build_knight.py  →  src/js/02b_sprite_sheets.js 의 SPRITE_SHEETS.knightElin 갱신
import json, re, io, base64, os
import numpy as np
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets_src', 'knight')
BG = np.array([30, 40, 52])
FH = 260  # 출력 프레임 높이

def frames(name):
    g = Image.open(os.path.join(SRC, name)); out = []
    for i in range(g.n_frames):
        g.seek(i); out.append(np.asarray(g.convert('RGB')).astype(np.int16))
    return out

def key(a):  # 배경색에 가까우면 투명, 경계는 부드럽게
    d = np.abs(a - BG).sum(2).astype(np.float32)
    alpha = np.clip((d - 14) / 26, 0, 1)
    rgba = np.zeros(a.shape[:2] + (4,), np.uint8); rgba[..., :3] = np.clip(a, 0, 255); rgba[..., 3] = (alpha * 255).astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')

def body_box(a):  # 몸통(검·이펙트 제외 대략): 첫 프레임의 불투명 영역
    d = np.abs(a - BG).sum(2); ys, xs = np.where(d > 40)
    return xs.min(), ys.min(), xs.max(), ys.max()

att, sk = frames('v13_attack_dark.gif'), frames('v13_skill_dark.gif')
# 발 = 첫 프레임 불투명 영역의 아래 (그림자 고리 제외: 가로로 넓게 퍼진 얇은 줄은 무시)
def foot_x(a):
    d = np.abs(a - BG).sum(2) > 40
    rows = np.where(d.sum(1) > 6)[0]
    bottom = rows.max()
    cols = np.where(d[bottom - 60:bottom].sum(0) > 0)[0]
    return int(cols.mean()), int(bottom)
fa, fs = foot_x(att[0]), foot_x(sk[0])
UP, DOWN, HALF = 250, 22, 150  # 발 위 250px · 아래 22px · 좌우 150px 잘라내기
k = FH / (UP + DOWN); FW = int(round(HALF * 2 * k))
# 두 GIF의 캐릭터 크기가 다르다 → 첫 프레임 몸 높이(머리~발)로 맞춘다
def body_h(a):
    d = np.abs(a - BG).sum(2) > 40
    rows = np.where(d.sum(1) > 6)[0]; cols_mid = d[:, :]
    return rows.max() - rows.min()
SK_SCALE = body_h(att[0]) / body_h(sk[0])
def crop(a, f, sc=1.0):
    cx, fy = f
    hu, hd, hh = UP / sc, DOWN / sc, HALF / sc
    im = key(a).crop((int(cx - hh), int(fy - hu), int(cx + hh), int(fy + hd)))
    return im.resize((FW, FH), Image.LANCZOS)

def pick(seq, idx): return [seq[i] for i in idx]
ANIMS = [
    ('idle',   [crop(a, fa) for a in pick(att, [0, 0, 1, 1, 0, 0, 39, 39])], 6, True),
    ('walk',   [crop(a, fa) for a in pick(att, [0, 2, 0, 38])], 8, True),
    ('attack', [crop(a, fa) for a in pick(att, [3, 7, 10, 13, 16, 19, 22, 26, 30, 35])], 25, False),
    ('cast',   [crop(a, fs, SK_SCALE) for a in pick(sk, list(range(0, 48, 4)))], 25, False),
    ('hurt',   [crop(a, fa) for a in pick(att, [0, 39])], 8, False),
]
# 쓰러짐: 대기 첫 프레임을 눕힌다
base = crop(att[0], fa)
down = []
for t in [0.3, 0.6, 0.85, 1.0]:  # 무릎을 꿇듯 기울고 내려앉는다
    im = Image.new('RGBA', (FW, FH)); small = base.resize((FW, int(FH * (1 - 0.25 * t))), Image.LANCZOS)
    r = small.rotate(-28 * t, resample=Image.BICUBIC, expand=False)
    im.alpha_composite(r, (0, FH - small.height)); down.append(im)
ANIMS.append(('down', down, 8, False))
n = max(len(f) for _, f, _, _ in ANIMS)
sheet = Image.new('RGBA', (FW * n, FH * len(ANIMS)))
meta = {}
for r, (name, fr, fps, loop) in enumerate(ANIMS):
    for i, im in enumerate(fr): sheet.alpha_composite(im, (i * FW, r * FH))
    meta[name] = {'row': r, 'n': len(fr), 'fps': fps, 'loop': loop, 'hold': name == 'down'}
buf = io.BytesIO(); sheet.save(buf, 'WEBP', quality=88)
os.makedirs(os.path.join(ROOT, 'test-output'), exist_ok=True); sheet.save(os.path.join(ROOT, 'test-output', 'sheet_knightElin.png'))
src = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
path = os.path.join(ROOT, 'src', 'js', '02b_sprite_sheets.js')
s = open(path).read(); m = re.search(r'const SPRITE_SHEETS = (\{.*\});', s, re.S); d = json.loads(m.group(1))
d['knightElin'] = {'src': src, 'fw': FW, 'fh': FH, 'footY': int(round(UP * k)), 'anims': meta, 'always': True, 'hMul': 1.5, 'portrait': {'x': 0.37, 'y': 0.17, 'w': 0.3, 'h': 0.27}, 'from': 'Knight_Combat_updates_2026-10-09 (v13 attack/skill GIF)'}
open(path, 'w').write(s[:m.start(1)] + json.dumps(d, separators=(',', ':'), ensure_ascii=False) + s[m.end(1):])
print('scale', round(SK_SCALE, 2), 'knightElin', FW, FH, {k2: v['n'] for k2, v in meta.items()}, len(buf.getvalue()) // 1024, 'KB', 'feet', fa, fs)
