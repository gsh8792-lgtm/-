# 3D 렌더 → 게임에 넣기: assets_src/3d/render/*.png → src/js/02d_env3d.js (WEBP base64)
#   python3 tools/3d/pack.py
# dungeon_<테마>.png : 던전 복도 배경 (1152×648, 가로로 이어 붙는 타일) — 08b drawCorridor 가 쓴다
# prop_<이름>.png    : 마을·필드 소품 (투명) — 바닥 중심 기준점(ax, ay)과 함께. drawProp3d(ctx, 이름, x, y, 폭)
import os, io, json, base64
from PIL import Image
import numpy as np
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
R = os.path.join(ROOT, 'assets_src', '3d', 'render')
PROP_H = 300  # 소품 그림 최대 높이 (게임 표시의 약 1.5배)

def b64(im, q):
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6); return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode(), len(buf.getvalue())

out = {}; total = 0
for f in sorted(os.listdir(R)):
    if not f.endswith('.png'): continue
    name = f[:-4]; im = Image.open(os.path.join(R, f)).convert('RGBA')
    if name.startswith('dungeon_'):
        src, n = b64(im.convert('RGB'), 80); out[name] = { 'src': src, 'w': im.width, 'h': im.height }
    else:
        meta = json.load(open(os.path.join(R, name + '.json')))
        a = np.array(im)[..., 3] > 8; ys, xs = np.where(a)
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        ax = meta['ax'] * im.width - x0; ay = meta['ay'] * im.height - y0
        im = im.crop((x0, y0, x1, y1))
        s = min(1, PROP_H / im.height); im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        name = name[5:]  # prop_house_a → house_a
        src, n = b64(im, 86); out[name] = { 'src': src, 'w': im.width, 'h': im.height, 'ax': round(ax / (x1 - x0), 4), 'ay': round(ay / (y1 - y0), 4) }
    total += n; print(f'{name}: {out[name]["w"]}x{out[name]["h"]} {n // 1024}KB')
js = ['// ===== 02d_env3d.js : 3D로 만든 배경·소품 (자동 생성: tools/3d/kit.py → tools/3d/pack.py — 손으로 고치지 말 것) =====',
      '// 그림이 아직 안 읽혔거나 없으면 기존 코드 드로잉으로 그린다.',
      'const ENV3D = ' + json.dumps(out, separators=(',', ':')) + ';',
      'const _env3dImg = {};',
      'function env3d(name) { const e = ENV3D[name]; if (!e) return null; let im = _env3dImg[name]; if (!im) { im = _env3dImg[name] = new Image(); im.src = e.src; } return im.complete && im.naturalWidth ? im : null; }',
      '// 소품: 바닥 중심(x, y)에 폭 w로 세운다 — 그렸으면 true',
      'function drawProp3d(ctx, name, x, y, w, flip) { const im = env3d(name); if (!im) return false; const e = ENV3D[name], h = w * e.h / e.w; ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1); ctx.drawImage(im, -e.ax * w, -e.ay * h, w, h); ctx.restore(); return true; }', '']
open(os.path.join(ROOT, 'src', 'js', '02d_env3d.js'), 'w').write('\n'.join(js))
print('total', total // 1024, 'KB →', 'src/js/02d_env3d.js')
