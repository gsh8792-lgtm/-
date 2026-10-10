# 기사(엘린) GIF 4개 → 게임 동작 시트 (배경색 빼기 · 발 기준 맞추기 · 동작별 줄)
# 공격·스킬: v13 어두운 배경 GIF / 대기·달리기: Knight_Run_Package의 Knight_Forward_Run.blend를 블렌더로 렌더링한 PNG (assets_src/knight/render, tools/knight/render_blend.py)
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
import glob
def png_seq(prefix):  # 블렌더 렌더(배경 제거·1/2 크기 저장) → RGBA 배열
    return [np.asarray(Image.open(f).convert('RGBA')) for f in sorted(glob.glob(os.path.join(SRC, 'render', prefix + '_*.png')))]
idl, run = png_seq('idle'), png_seq('run')  # 같은 카메라 · 같은 발 자리

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
# 렌더 PNG: 알파로 몸 높이·발 자리. 대기와 달리기는 같은 카메라라 같은 배율·같은 발 자리를 쓴다
def a_mask(a): return a[..., 3] > 128
def body_h_a(a): rows = np.where(a_mask(a).sum(1) > 6)[0]; return rows.max() - rows.min()
def foot_a(a):
    m = a_mask(a); rows = np.where(m.sum(1) > 6)[0]; bottom = rows.max()
    cols = np.where(m[bottom - 60:bottom].sum(0) > 0)[0]; return int(cols.mean()), int(bottom)
IDLE_SCALE = body_h(att[0]) / body_h_a(idl[0]) * float(os.environ.get('IDLE_FIX', '1'))
fi = foot_a(idl[0]); fi = (fi[0], fi[1] - int(os.environ.get('IDLE_DY', '0')))
def crop(a, f, sc=1.0):
    cx, fy = f
    hu, hd, hh = UP / sc, DOWN / sc, HALF / sc
    src = Image.fromarray(a, 'RGBA') if a.shape[2] == 4 else key(a)  # 렌더 PNG는 이미 배경이 없다
    im = src.crop((int(cx - hh), int(fy - hu), int(cx + hh), int(fy + hd)))
    return im.resize((FW, FH), Image.LANCZOS)

def pick(seq, idx): return [seq[i] for i in idx]
ANIMS = [
    ('idle',   [crop(a, fi, IDLE_SCALE) for a in idl], 6, True),   # 숨쉬기 한 번 (48프레임 중 4칸마다 → 약 2초)
    ('walk',   [crop(a, fi, IDLE_SCALE) for a in run], 12, True),  # 달리기 한 주기 (24프레임 중 2칸마다 → 1초)
    ('attack', [crop(a, fa) for a in pick(att, [3, 7, 10, 13, 16, 19, 22, 26, 30, 35])], 25, False),
    ('cast',   [crop(a, fs, SK_SCALE) for a in pick(sk, list(range(0, 48, 4)))], 25, False),
    ('hurt',   [crop(a, fa) for a in pick(att, [0, 39])], 8, False),
]
# 쓰러짐: 대기 첫 프레임을 눕힌다
base = crop(idl[0], fi, IDLE_SCALE)
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
d['knightElin'] = {'src': src, 'fw': FW, 'fh': FH, 'footY': int(round(UP * k)), 'anims': meta, 'always': True, 'hMul': 1.5, 'portrait': {'x': 0.37, 'y': 0.17, 'w': 0.3, 'h': 0.27}, 'from': 'Knight_Combat_updates_2026-10-09 (v13 attack/skill GIF) + Knight_Run_Package Knight_Forward_Run.blend (Blender render: idle·run)'}
open(path, 'w').write(s[:m.start(1)] + json.dumps(d, separators=(',', ':'), ensure_ascii=False) + s[m.end(1):])
print('scale', round(SK_SCALE, 2), 'idle', round(IDLE_SCALE, 2), 'knightElin', FW, FH, {k2: v['n'] for k2, v in meta.items()}, len(buf.getvalue()) // 1024, 'KB', 'feet', fa, fs)
