# 판타지 UI 에셋 키트 (절차적 생성 · 외부 이미지 없음)
# python3 tools/ui/make_ui_assets.py → src/css/ui_assets.css (CSS 변수로 data URI) + test-output/ui_assets/*.png (미리보기)
# 텍스처: 어두운 가죽/돌(창 배경) · 양피지(설명·도감) · 나무(하단 메뉴)
# 9-slice 테두리: 창(금장 철테 + 모서리 덩굴 장식 + 보석) · 버튼(청동/금/붉은) · 탭 · 아이템 칸 · 리본 제목 · 구분선 · 둥근 메뉴 테두리
import os, io, base64, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'test-output', 'ui_assets'); os.makedirs(OUT, exist_ok=True)
rs = np.random.RandomState(7)

def fbm(n, octaves=5, seed=0):  # 이어붙일 수 있는(타일) 값 노이즈
    r = np.random.RandomState(seed); out = np.zeros((n, n)); amp = 1; tot = 0
    for o in range(octaves):
        g = 4 * 2 ** o; grid = r.rand(g, g)
        xs = np.arange(n) * g / n; i0 = np.floor(xs).astype(int); f = xs - i0; f = f * f * (3 - 2 * f); i1 = (i0 + 1) % g
        a = grid[i0][:, i0]; b = grid[i0][:, i1]; c = grid[i1][:, i0]; d = grid[i1][:, i1]
        fx = f[None, :]; fy = f[:, None]
        out += amp * ((a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy); tot += amp; amp *= 0.5
    return out / tot

def lerp_col(c0, c1, t): return (np.array(c0)[None, None, :] * (1 - t[..., None]) + np.array(c1)[None, None, :] * t[..., None])

def tex_dark():
    n = 256; a = fbm(n, 6, 1); b = fbm(n, 3, 2)
    t = np.clip((a - 0.5) * 1.6 + 0.5, 0, 1)
    img = lerp_col((24, 18, 32), (46, 36, 58), t) * (0.85 + 0.3 * b[..., None])
    sc = fbm(n, 7, 3); img += (np.abs(sc - 0.5) < 0.008)[..., None] * 10  # 가는 긁힘
    return Image.fromarray(np.clip(img, 0, 255).astype('uint8'), 'RGB')

def tex_parch():
    n = 256; a = fbm(n, 6, 11); s = fbm(n, 4, 12); fib = fbm(n, 7, 13)
    img = lerp_col((214, 196, 156), (238, 224, 190), np.clip((a - 0.3) * 1.5, 0, 1))
    img *= (1 - 0.18 * np.clip((s - 0.55) * 4, 0, 1))[..., None]  # 얼룩
    img += ((fib - 0.5) * 18)[..., None]
    return Image.fromarray(np.clip(img, 0, 255).astype('uint8'), 'RGB')

def tex_wood():
    n = 256; y = np.arange(n)[:, None] / n; w = fbm(n, 5, 21)
    grain = np.sin((y * 9 + w * 2.2) * math.pi * 2) * 0.5 + 0.5
    img = lerp_col((46, 28, 16), (88, 56, 30), grain * 0.7 + fbm(n, 6, 22) * 0.3)
    return Image.fromarray(np.clip(img, 0, 255).astype('uint8'), 'RGB')

S = 4  # 슈퍼샘플링
GOLD = [(255, 244, 190), (238, 196, 92), (176, 120, 40), (110, 70, 22)]
BRONZE = [(236, 200, 150), (176, 124, 72), (112, 72, 38), (60, 36, 18)]
RED = [(255, 170, 140), (210, 80, 60), (140, 40, 30), (70, 18, 14)]
IRON = [(150, 146, 160), (96, 92, 108), (58, 54, 68), (28, 26, 34)]

def grad_fill(size, cols, vertical=True):
    w, h = size; t = np.linspace(0, 1, h if vertical else w)
    stops = np.linspace(0, 1, len(cols)); arr = np.zeros((len(t), 3))
    for k in range(3): arr[:, k] = np.interp(t, stops, [c[k] for c in cols])
    if vertical: img = np.repeat(arr[:, None, :], w, 1)
    else: img = np.repeat(arr[None, :, :], h, 0)
    return Image.fromarray(img.astype('uint8'), 'RGB').convert('RGBA')

def ring_mask(size, box_out, box_in, r_out, r_in):
    m = Image.new('L', size, 0); d = ImageDraw.Draw(m)
    d.rounded_rectangle(box_out, r_out, fill=255)
    if box_in: d.rounded_rectangle(box_in, r_in, fill=0)
    return m

def bevel_ring(W, H, inset, thick, radius, cols, edge=(20, 12, 6)):
    """둥근 사각 테(금속 베벨): 바깥 검은 선 + 그라데이션 + 위 하이라이트 · 아래 그림자"""
    W4, H4 = W * S, H * S; img = Image.new('RGBA', (W4, H4), (0, 0, 0, 0))
    o = inset * S; t = thick * S; r = radius * S
    m = ring_mask((W4, H4), (o, o, W4 - o - 1, H4 - o - 1), (o + t, o + t, W4 - o - t - 1, H4 - o - t - 1), r, max(1, r - t))
    edge_m = ring_mask((W4, H4), (o - S, o - S, W4 - o + S - 1, H4 - o + S - 1), (o + t + S, o + t + S, W4 - o - t - S - 1, H4 - o - t - S - 1), r + S, max(1, r - t - S))
    img.paste(Image.new('RGBA', (W4, H4), edge + (255,)), (0, 0), edge_m)
    g = grad_fill((W4, H4), cols); img.paste(g, (0, 0), m)
    # 하이라이트(테 안쪽 위 가장자리)
    hl = ring_mask((W4, H4), (o + S, o + S, W4 - o - S - 1, H4 - o - S - 1), (o + 2 * S, o + 3 * S, W4 - o - S - 1, H4 - o - S - 1), r, r)
    img.paste(Image.new('RGBA', (W4, H4), (255, 250, 220, 150)), (0, 0), hl)
    return img

def curl(d, cx, cy, r0, turns, ang0, sign, width, col):
    pts = []
    for i in range(80):
        k = i / 79; a = ang0 + sign * k * turns * 2 * math.pi; r = r0 * (1 - 0.8 * k)
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    d.line(pts, fill=col, width=width, joint='curve')

def gem(d, cx, cy, r, col):
    d.ellipse((cx - r - S * 2, cy - r - S * 2, cx + r + S * 2, cy + r + S * 2), fill=(30, 18, 8, 255))
    d.ellipse((cx - r - S, cy - r - S, cx + r + S, cy + r + S), fill=GOLD[1] + (255,))
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=col + (255,))
    d.ellipse((cx - r * 0.55, cy - r * 0.7, cx - r * 0.05, cy - r * 0.2), fill=(255, 255, 255, 170))

def corner_ornament(img, cx, cy, flipx, flipy, scale, gemcol):
    d = ImageDraw.Draw(img); sx = -1 if flipx else 1; sy = -1 if flipy else 1; s = scale * S
    for col, w in (((30, 18, 8, 255), int(5 * S)), (GOLD[1] + (255,), int(3 * S)), (GOLD[0] + (255,), max(1, int(1.2 * S)))):
        # 모서리에서 두 방향으로 뻗는 덩굴 두 개
        curl(d, cx + sx * s * 16, cy + sy * s * 5, s * 9, 1.1, math.pi if not flipx else 0, sy * (1 if not flipx else -1), w, col)
        curl(d, cx + sx * s * 5, cy + sy * s * 16, s * 9, 1.1, -math.pi / 2 if not flipy else math.pi / 2, -sx * (1 if not flipy else -1), w, col)
    gem(d, cx + sx * s * 3, cy + sy * s * 3, s * 4.2, gemcol)

def save(name, img):
    img.save(os.path.join(OUT, name + '.png')); buf = io.BytesIO(); img.save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()

def down(img, W, H): return img.resize((W, H), Image.LANCZOS)

assets = {}
# ---- 텍스처
for k, f in (('tex-dark', tex_dark), ('tex-parch', tex_parch), ('tex-wood', tex_wood)):
    im = f(); buf = io.BytesIO(); im.save(buf, 'JPEG', quality=82); im.save(os.path.join(OUT, k + '.png'))
    assets[k] = 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()

# ---- 창 테두리 (9-slice 120, 모서리 44)
def panel_frame(cols, gemcol):
    W = H = 120; img = bevel_ring(W, H, 2, 7, 12, cols)
    inner = bevel_ring(W, H, 11, 2, 7, [(90, 60, 24), (60, 40, 16)], edge=(12, 8, 4)); img.alpha_composite(inner)
    for fx in (0, 1):
        for fy in (0, 1):
            corner_ornament(img, (W - 10 if fx else 10) * S, (H - 10 if fy else 10) * S, fx, fy, 1.0, gemcol)
    return down(img, W, H)
assets['frame-panel'] = save('frame-panel', panel_frame(GOLD, (150, 40, 60)))
assets['frame-panel-blue'] = save('frame-panel-blue', panel_frame(GOLD, (50, 110, 200)))

# ---- 단순 테(작은 창 · 칸)
def simple_frame(W, H, inset, thick, radius, cols, inner=None):
    img = bevel_ring(W, H, inset, thick, radius, cols)
    if inner: img.alpha_composite(bevel_ring(W, H, inset + thick + 1, 1, max(2, radius - thick), inner, edge=(10, 6, 4)))
    return down(img, W, H)
assets['frame-thin'] = save('frame-thin', simple_frame(48, 48, 2, 4, 9, GOLD, [(80, 56, 24), (50, 34, 14)]))

# ---- 버튼·탭·칩 테두리 (테만 · 9-slice 32 / 모서리 12 — 안쪽 면은 CSS 배경이 그린다)
def rim(cols, rivet=True):
    W = H = 32; W4 = W * S; img = bevel_ring(W, H, 1, 3, 7, cols)
    if rivet:
        d = ImageDraw.Draw(img)
        for x in (6.5 * S, W4 - 6.5 * S):
            for y in (6.5 * S, W4 - 6.5 * S):
                d.ellipse((x - 1.5 * S, y - 1.5 * S, x + 1.5 * S, y + 1.5 * S), fill=(30, 18, 8, 255)); d.ellipse((x - 1 * S, y - 1 * S, x + 1 * S, y + 1 * S), fill=cols[0] + (255,))
    return down(img, W, H)
assets['rim-bronze'] = save('rim-bronze', rim(BRONZE))
assets['rim-gold'] = save('rim-gold', rim(GOLD))
assets['rim-iron'] = save('rim-iron', rim(IRON))
assets['rim-plain'] = save('rim-plain', rim(BRONZE, False))
assets['rim-goldplain'] = save('rim-goldplain', rim(GOLD, False))

# ---- 아이템 칸 (오목한 칸 · 9-slice 64 / 모서리 14)
def slot():
    W = H = 64; W4 = W * S; img = bevel_ring(W, H, 2, 4, 8, IRON)
    m = ring_mask((W4, W4), (6 * S, 6 * S, W4 - 6 * S - 1, W4 - 6 * S - 1), None, 5 * S, 0)
    inner = Image.new('RGBA', (W4, W4)); arr = np.zeros((W4, W4, 4), 'uint8')
    yy, xx = np.mgrid[0:W4, 0:W4]; dd = np.sqrt(((xx - W4 / 2) / (W4 / 2)) ** 2 + ((yy - W4 / 2) / (W4 / 2)) ** 2)
    v = np.clip(1 - dd * 0.7, 0, 1); arr[..., 0] = 18 + 22 * v; arr[..., 1] = 14 + 18 * v; arr[..., 2] = 26 + 26 * v; arr[..., 3] = 255
    img.paste(Image.fromarray(arr, 'RGBA'), (0, 0), m)
    return down(img, W, H)
assets['slot'] = save('slot', slot())

# ---- 리본 제목 (가로 9-slice 240x56 / 좌우 56)
def ribbon():
    W, H = 240, 56; W4, H4 = W * S, H * S; img = Image.new('RGBA', (W4, H4), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    def band(y0, y1, inset, col):
        d.polygon([(inset, y0), (W4 - inset, y0), (W4 - inset - 14 * S, (y0 + y1) / 2), (W4 - inset, y1), (inset, y1), (inset + 14 * S, (y0 + y1) / 2)], fill=col)
    band(12 * S, 50 * S, 0, (40, 10, 10, 255)); band(14 * S, 48 * S, 3 * S, (120, 30, 34, 255))  # 뒤쪽 꼬리
    d.rectangle((26 * S, 6 * S, W4 - 26 * S, 44 * S), fill=(20, 8, 8, 255))
    g = grad_fill((W4, H4), [(200, 64, 60), (150, 36, 40), (96, 20, 24)])
    m = Image.new('L', (W4, H4), 0); ImageDraw.Draw(m).rectangle((28 * S, 8 * S, W4 - 28 * S, 42 * S), fill=255); img.paste(g, (0, 0), m)
    for y in (11 * S, 39 * S): d.line((28 * S, y, W4 - 28 * S, y), fill=GOLD[1] + (255,), width=int(1.6 * S))
    d.line((28 * S, 9 * S, W4 - 28 * S, 9 * S), fill=(255, 220, 200, 90), width=S)
    return down(img, W, H)
assets['ribbon'] = save('ribbon', ribbon())

# ---- 구분선 (가로 늘림 300x18)
def divider():
    W, H = 300, 18; W4, H4 = W * S, H * S; img = Image.new('RGBA', (W4, H4), (0, 0, 0, 0)); d = ImageDraw.Draw(img); cy = H4 / 2
    for col, w in (((30, 18, 8, 255), 4 * S), (GOLD[2] + (255,), 2 * S), (GOLD[0] + (180,), S // 2 or 1)):
        d.line((10 * S, cy, W4 / 2 - 14 * S, cy), fill=col, width=w); d.line((W4 / 2 + 14 * S, cy, W4 - 10 * S, cy), fill=col, width=w)
    cx = W4 / 2
    d.polygon([(cx, cy - 8 * S), (cx + 10 * S, cy), (cx, cy + 8 * S), (cx - 10 * S, cy)], fill=(30, 18, 8, 255))
    d.polygon([(cx, cy - 6 * S), (cx + 7.5 * S, cy), (cx, cy + 6 * S), (cx - 7.5 * S, cy)], fill=GOLD[1] + (255,))
    d.polygon([(cx, cy - 3 * S), (cx + 3.5 * S, cy), (cx, cy + 3 * S), (cx - 3.5 * S, cy)], fill=(160, 40, 60, 255))
    for x in (10 * S, W4 - 10 * S): d.ellipse((x - 3 * S, cy - 3 * S, x + 3 * S, cy + 3 * S), fill=GOLD[1] + (255,))
    return down(img, W, H)
assets['divider'] = save('divider', divider())

# ---- 둥근 메뉴 테두리 (하단 메뉴 아이콘 칸 88)
def orb(gemcol):
    W = 88; W4 = W * S; img = Image.new('RGBA', (W4, W4), (0, 0, 0, 0)); d = ImageDraw.Draw(img); c = W4 / 2
    d.ellipse((2 * S, 2 * S, W4 - 2 * S, W4 - 2 * S), fill=(20, 12, 6, 255))
    g = grad_fill((W4, W4), GOLD); m = Image.new('L', (W4, W4), 0); md = ImageDraw.Draw(m)
    md.ellipse((4 * S, 4 * S, W4 - 4 * S, W4 - 4 * S), fill=255); md.ellipse((11 * S, 11 * S, W4 - 11 * S, W4 - 11 * S), fill=0); img.paste(g, (0, 0), m)
    yy, xx = np.mgrid[0:W4, 0:W4]; dd = np.sqrt((xx - c) ** 2 + (yy - c * 0.8) ** 2) / (c * 0.9)
    arr = np.zeros((W4, W4, 4), 'uint8'); v = np.clip(1 - dd, 0, 1)
    arr[..., 0] = 30 + 50 * v; arr[..., 1] = 22 + 36 * v; arr[..., 2] = 44 + 60 * v; arr[..., 3] = 255
    m2 = Image.new('L', (W4, W4), 0); ImageDraw.Draw(m2).ellipse((12 * S, 12 * S, W4 - 12 * S, W4 - 12 * S), fill=255); img.paste(Image.fromarray(arr, 'RGBA'), (0, 0), m2)
    for k in range(8):  # 테두리 장식 돌기
        a = k / 8 * 2 * math.pi - math.pi / 2; x, y = c + math.cos(a) * (c - 7.5 * S), c + math.sin(a) * (c - 7.5 * S)
        d.ellipse((x - 2.4 * S, y - 2.4 * S, x + 2.4 * S, y + 2.4 * S), fill=(30, 18, 8, 255) if k else (0, 0, 0, 0))
        if k: d.ellipse((x - 1.6 * S, y - 1.6 * S, x + 1.6 * S, y + 1.6 * S), fill=GOLD[0] + (255,))
    gem(d, c, 7.5 * S, 4.2 * S, gemcol)
    d.ellipse((18 * S, 14 * S, W4 - 30 * S, 34 * S), fill=(255, 255, 255, 26))
    return down(img, W, W)
assets['orb'] = save('orb', orb((150, 40, 60)))
assets['orb-on'] = save('orb-on', orb((60, 200, 120)))

css = ['/* 자동 생성: tools/ui/make_ui_assets.py — 판타지 UI 에셋 (손으로 고치지 말 것) */', ':root {']
for k, v in assets.items(): css.append(f'  --ui-{k}: url("{v}");')
css.append('}')
open(os.path.join(ROOT, 'src', 'css', 'ui_assets.css'), 'w').write('\n'.join(css) + '\n')
print({k: len(v) // 1024 for k, v in assets.items()}, 'KB total', sum(len(v) for v in assets.values()) // 1024)
