# 기사(엘린) 대기·달리기: Knight_Run_Package의 Knight_Forward_Run.blend → 배경 없는 PNG 프레임
# 필요: pip install bpy==5.2.2 (블렌더를 파이썬 모듈로)
# python3 -I tools/knight/render_blend.py <Knight_Forward_Run.blend> → assets_src/knight/render/{idle,run}_NN.png
# .blend 안의 스크립트는 실행하지 않는다 (use_scripts=False). 그 뒤 python3 tools/knight/build_knight.py
import sys, os, glob, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import bpy
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DST = os.path.join(ROOT, 'assets_src', 'knight', 'render')
blend = sys.argv[1]
tmp = tempfile.mkdtemp()
bpy.ops.wm.open_mainfile(filepath=blend, load_ui=False, use_scripts=False)
sc = bpy.context.scene
sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.cycles.samples = 16
# NLA: 1–96 대기(Gentle_Idle, 숨 한 번 = 48프레임) · 97–192 달리기(Forward_Run, 한 주기 = 24프레임, 시작 혼합 뒤 121부터)
JOBS = [('idle', list(range(1, 49, 4))), ('run', list(range(121, 145, 2)))]
for name, frames in JOBS:
    for i, fr in enumerate(frames):
        sc.frame_set(fr); sc.render.filepath = os.path.join(tmp, f'{name}_{i:02d}.png'); bpy.ops.render.render(write_still=True)
# 그림 판 자체에 흰 배경이 있다 → 투명(판 밖)·흰색 중 테두리에서 이어진 영역만 지운다 (흰 머리·치마는 남는다)
WB = np.array([255, 255, 255])
def key(im):
    a = np.asarray(im.convert('RGBA')).astype(np.int16)
    bgc = (a[..., 3] < 10) | (np.abs(a[..., :3] - WB).sum(2) < 24)
    m = Image.fromarray((bgc * 255).astype(np.uint8), 'L').copy(); W, H = m.size
    for xy in [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)]:
        if m.getpixel(xy) == 255: ImageDraw.floodfill(m, xy, 128)
    al = Image.fromarray(((np.asarray(m) != 128) * 255).astype(np.uint8), 'L').filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = np.asarray(im.convert('RGBA')).copy(); out[..., 3] = np.minimum(out[..., 3], np.asarray(al)); return Image.fromarray(out, 'RGBA')
files = sorted(glob.glob(tmp + '/*.png')); ims = [key(Image.open(f)) for f in files]
box = None
for im in ims:
    b = im.getbbox(); box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
W, H = sc.render.resolution_x, sc.render.resolution_y
box = (max(0, box[0] - 8), max(0, box[1] - 8), min(W, box[2] + 8), min(H, box[3] + 8))
os.makedirs(DST, exist_ok=True)
for f, im in zip(files, ims):
    c = im.crop(box); c.resize((c.width // 2, c.height // 2), Image.LANCZOS).save(os.path.join(DST, os.path.basename(f)), optimize=True)
open(os.path.join(DST, 'box.txt'), 'w').write('%d %d %d %d  # %dx%d 렌더에서 잘라낸 영역, 저장은 1/2 크기\n' % (box + (W, H)))
print('saved', len(files), 'frames to', DST, 'box', box)
