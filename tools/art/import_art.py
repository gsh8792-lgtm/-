# 캐릭터 일러스트 가져오기: 다른 채팅에서 만든 그림(투명 PNG)을 게임에 넣는다
#   python3 tools/art/import_art.py            → src/js/02c_art.js 생성 + test-output/art/*.png 미리보기
# 입력 (assets_src/art/):
#   sheets/<이름>.png   한 장에 캐릭터 여러 명(가로로 나란히, 투명 배경). 제목 글자·번호(01 02..)는 자동으로 버린다
#   chars/<영웅id>.png  한 장에 한 명 (시트보다 우선)
#   map.json            시트의 몇 번째(왼쪽부터 1~) 그림이 어느 영웅인지 + 얼굴 위치 보정
#     { "sheets": { "mage.png": { "1": "soldam", "2": "seori" } }, "face": { "soldam": [0.5, 0.2] } }
#     face: 초상화(얼굴) 중심 위치 — 그림 너비·높이에 대한 비율 (없으면 자동: 머리 쪽 위 22%)
import os, io, json, base64
import numpy as np
from PIL import Image

def label(mask):
    """8-이웃 연결 덩어리 번호 (외부 라이브러리 없이) — 시트를 1/4로 줄여서 계산한다"""
    H, W = mask.shape; lab = np.zeros((H, W), np.int32); n = 0
    for y0 in range(H):
        row = mask[y0]
        for x0 in np.where(row & (lab[y0] == 0))[0]:
            if lab[y0, x0]: continue
            n += 1; st = [(y0, x0)]; lab[y0, x0] = n
            while st:
                y, x = st.pop()
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < H and 0 <= xx < W and mask[yy, xx] and not lab[yy, xx]: lab[yy, xx] = n; st.append((yy, xx))
    return lab, n

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets_src', 'art')
OUT = os.path.join(ROOT, 'test-output', 'art'); os.makedirs(OUT, exist_ok=True)
H_OUT = 420  # 게임에 넣는 높이(px) — 전투 표시 크기의 약 2.5배 (선명하게)

def split_sheet(path, count=5):
    """시트에서 캐릭터 그림만 왼쪽부터 순서대로 잘라 낸다.
    1) 세로 열마다 그림이 얼마나 있는지 세어 그림 사이의 빈틈(가장 적은 열)으로 count 칸으로 나눈다
    2) 칸마다 연결 덩어리를 찾아 가장 큰 그림 + 그 주변 장식만 남긴다 (위쪽 제목 글자 · 아래쪽 번호는 버린다)"""
    im = Image.open(path).convert('RGBA'); arr = np.array(im); a = arr[..., 3] > 24
    H, W = a.shape
    body = a[int(H * 0.18):int(H * 0.84)]                       # 제목·번호를 뺀 띠
    prof = np.convolve(body.sum(axis=0).astype(float), np.ones(15) / 15, mode='same')
    cuts = [0]
    for k in range(1, count):
        c = int(W * k / count); lo, hi = max(cuts[-1] + 40, c - int(W / count * 0.35)), min(W - 40, c + int(W / count * 0.35))
        cuts.append(lo + int(np.argmin(prof[lo:hi])))
    cuts.append(W)
    out = []
    for k in range(count):
        x0, x1 = cuts[k], cuts[k + 1]
        sub = a[:, x0:x1].copy(); F = 3
        # 아래쪽 번호(01 02 ..): 발밑에 붙어 있는 일정한 너비의 글자 띠 — 아래에서부터 너비가 거의 같은 줄을 지운다
        rows = sub.sum(axis=1); ink = np.where(rows > 0)[0]
        if len(ink):
            last = ink[-1]; P = np.median(rows[max(0, last - 25):last + 1]); y = last
            while y > H * 0.8 and rows[y] <= P * 1.3 + 2: y -= 1
            if last - y >= 20 and P < (x1 - x0) * 0.45: sub[y + 1:] = False
        small = np.array(Image.fromarray((sub * 255).astype('uint8')).resize((max(1, (x1 - x0) // F), H // F), Image.BOX)) > 10
        lab, n = label(small)
        comps = []
        for i in range(1, n + 1):
            ys, xs = np.where(lab == i)
            comps.append({ 'i': i, 'y0': ys.min() * F, 'y1': (ys.max() + 1) * F, 'w': (xs.max() + 1 - xs.min()) * F, 'area': len(ys) })
        if not comps: continue
        main = max(comps, key=lambda c: c['area'])
        keep = [c['i'] for c in comps if c is main or (c['area'] > main['area'] * 0.004 and c['y0'] < H * 0.86 and not (c['y1'] < H * 0.17 and c['w'] > (x1 - x0) * 0.5) and c['y1'] > H * 0.12)]
        m_small = np.isin(lab, keep)
        m = np.array(Image.fromarray((m_small * 255).astype('uint8')).resize((x1 - x0, H), Image.NEAREST)) > 0
        m = m & sub
        if not m.any(): continue
        ys, xs = np.where(m)
        piece = arr[:, x0:x1].copy(); piece[..., 3] = np.where(m, piece[..., 3], 0)
        out.append(Image.fromarray(piece).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)))
    return out

def trim(im):
    a = np.array(im)[..., 3] > 24; ys, xs = np.where(a)
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

def face_box(im, hint):
    """초상화용 얼굴 칸 (비율) — 위 22% 근처, 머리 너비 기준 정사각형"""
    w, h = im.size
    if hint: cx, cy = hint
    else:
        a = np.array(im)[..., 3] > 24; band = a[int(h * 0.12):int(h * 0.32)]
        cols = np.where(band.any(axis=0))[0]
        cx = ((cols.min() + cols.max()) / 2 / w) if len(cols) else 0.5; cy = 0.22
    s = min(0.34 * h, 0.8 * w)
    return { 'x': round(cx - s / w / 2, 4), 'y': round(cy - s / h / 2, 4), 'w': round(s / w, 4), 'h': round(s / h, 4) }

def main():
    mp = json.load(open(os.path.join(SRC, 'map.json'))) if os.path.exists(os.path.join(SRC, 'map.json')) else { 'sheets': {}, 'face': {} }
    got = {}
    for sheet, assign in (mp.get('sheets') or {}).items():
        p = os.path.join(SRC, 'sheets', sheet)
        if not os.path.exists(p): print('없음', sheet); continue
        figs = split_sheet(p); print(sheet, '→', len(figs), '명')
        for k, hid in assign.items():
            i = int(k) - 1
            if hid and 0 <= i < len(figs): got[hid] = figs[i]
    cdir = os.path.join(SRC, 'chars')
    for f in sorted(os.listdir(cdir)) if os.path.isdir(cdir) else []:
        if f.lower().endswith('.png'): got[f[:-4]] = trim(Image.open(os.path.join(cdir, f)).convert('RGBA'))
    entries = {}
    for hid, im in sorted(got.items()):
        im = trim(im); w, h = im.size; s = H_OUT / h
        im = im.resize((max(1, round(w * s)), H_OUT), Image.LANCZOS)
        im.save(os.path.join(OUT, hid + '.png'))
        buf = io.BytesIO(); im.save(buf, 'WEBP', quality=88, method=6)
        entries[hid] = { 'src': 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode(), 'w': im.size[0], 'h': im.size[1], 'face': face_box(im, (mp.get('face') or {}).get(hid)) }
        print(f'  {hid}: {im.size[0]}x{im.size[1]} {len(buf.getvalue()) // 1024}KB')
    js = ['// ===== 02c_art.js : 캐릭터 일러스트 (자동 생성: tools/art/import_art.py — 손으로 고치지 말 것) =====',
          '// 그림이 있는 영웅은 코드 드로잉 대신 이 그림을 쓴다 (전투·필드·초상화). 동작은 그림을 기울이고 늘여서 흉내 낸다.',
          'const ART_IMAGES = ' + json.dumps(entries, ensure_ascii=False, separators=(',', ':')) + ';',
          'for (const id in ART_IMAGES) if (typeof HEROES !== "undefined" && HEROES[id]) { const name = "art_" + id, base = ART[HEROES[id].sprite] || ART.knight; ART[name] = Object.assign({}, base); ART_IMG_META[name] = ART_IMAGES[id]; SPRITE_IMAGE_OVERRIDES[name] = ART_IMAGES[id].src; HEROES[id].sprite = name; }', '']
    open(os.path.join(ROOT, 'src', 'js', '02c_art.js'), 'w').write('\n'.join(js))
    print('영웅', len(entries), '명 →', 'src/js/02c_art.js', sum(len(e['src']) for e in entries.values()) // 1024, 'KB')

if __name__ == '__main__': main()
