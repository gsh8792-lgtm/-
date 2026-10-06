"""Lossless source preservation and deterministic extraction of the user-supplied rig."""
from pathlib import Path
from collections import deque
from PIL import Image,ImageDraw,ImageOps
import numpy as np,json,hashlib,shutil
ROOT=Path(__file__).resolve().parents[1]
REF=ROOT/'Art/Reference';OUT=ROOT/'AshenOath/Assets/Resources/Rig';QA=ROOT/'QA'
for p in (REF,OUT,QA):p.mkdir(parents=True,exist_ok=True)
paths=[Path('C:/Users/user/AppData/Local/Temp/codex-clipboard-a63a180e-c1aa-481e-977f-02130cab3cb7.png'),Path('C:/Users/user/AppData/Local/Temp/codex-clipboard-07a9b7ab-2d69-4427-ab1a-ce5343f2b48d.png')]
for path,name in zip(paths,['parts-original.png','character-original.png']):shutil.copyfile(path,REF/name)
sheet=Image.open(paths[0]).convert('RGBA')
parts={
 'head':(41,20,225,185),
 'torso':(246,191,462,539),
 'upperLeg':(1408,433,1540,662),
 'lowerLeg':(1398,703,1554,973),
 'armRelaxed':(1598,192,1788,553),
 'armBent':(1404,195,1630,396),
 'armRaised':(1165,200,1398,407),
 'fullLeg':(931,392,1090,974),
}
contact=Image.new('RGB',(1200,820),(34,41,53));draw=ImageDraw.Draw(contact)
manifest=[]
for i,(name,box) in enumerate(parts.items()):
    part=sheet.crop(box);arr=np.array(part)
    # The sheet has a black backdrop; alpha is derived solely from edge-connected dark pixels.
    dark=np.max(arr[:,:,:3],axis=2)<32;h,w=dark.shape;seen=np.zeros((h,w),dtype=bool);q=deque()
    for x in range(w):q.append((x,0));q.append((x,h-1))
    for y in range(h):q.append((0,y));q.append((w-1,y))
    while q:
        x,y=q.popleft()
        if not(0<=x<w and 0<=y<h) or seen[y,x] or not dark[y,x]:continue
        seen[y,x]=True;q.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
    arr[:,:,3]=np.where(seen,0,255)
    if name.startswith('arm'):
        foreground=~seen;visited=np.zeros((h,w),dtype=bool);components=[]
        for yy,xx in zip(*np.where(foreground)):
            if visited[yy,xx]:continue
            todo=deque([(int(xx),int(yy))]);visited[yy,xx]=True;points=[]
            while todo:
                x,y=todo.popleft();points.append((x,y))
                for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                    if 0<=nx<w and 0<=ny<h and foreground[ny,nx] and not visited[ny,nx]:visited[ny,nx]=True;todo.append((nx,ny))
            components.append(points)
        keep=max(components,key=len);arr[:,:,3]=0
        for x,y in keep:arr[y,x,3]=255
    part=Image.fromarray(arr);part.save(OUT/(name+'.png'))
    x=i%4*300;y=i//4*410;shown=ImageOps.contain(part,(280,370));contact.paste(shown,(x+(300-shown.width)//2,y+30),shown);draw.text((x+8,y+8),name,fill='white')
    manifest.append({'name':name,'source_box':box,'sha256':hashlib.sha256((OUT/(name+'.png')).read_bytes()).hexdigest()})
contact.save(QA/'reference-parts-contact.png')
(QA/'reference-rig-manifest.json').write_text(json.dumps({'source_hashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in paths},'parts':manifest,'method':'source pixels retained; edge-connected backdrop alpha only'},indent=2),encoding='utf-8')
print('extracted',len(parts),'reference parts')
