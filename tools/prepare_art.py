"""Extract and normalize inspected Comfy sheets without re-generating character identity."""
from pathlib import Path
import json, hashlib
from collections import deque
import numpy as np
from PIL import Image,ImageDraw,ImageOps
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'AshenOath/Assets/Resources/Art';OUT.mkdir(parents=True,exist_ok=True)
QA=ROOT/'QA';QA.mkdir(exist_ok=True)
# Each index refers to a visually inspected source component sorted by row, x.
# Flip flags repair inconsistent generation facing before animation import.
MAPS={
 'hero':[(0,False),(1,False),(5,False),(3,False),(5,False),(4,False),(0,False),(6,False)],
 'knight':[(0,True),(1,False),(2,False),(5,False),(3,True),(4,True),(0,True),(5,False)],
 'healer':[(0,False),(1,False),(2,False),(3,False),(0,False),(4,False),(0,False),(5,False)],
 'archer':[(0,True),(1,False),(2,True),(3,False),(5,True),(4,False),(6,False),(7,False)],
 'enemy':[(0,True),(1,False),(2,False),(5,False),(3,False),(4,False),(0,True),(5,False)]}
reports=[]
contact=Image.new('RGB',(8*128,5*210),(24,28,36));draw=ImageDraw.Draw(contact)
for row,(name,mapping) in enumerate(MAPS.items()):
    path=ROOT/'Art/Flux'/f'{name}.png';im=Image.open(path).convert('RGBA');arr=np.array(im)
    bg=(arr[:,:,0]>155)&(arr[:,:,2]>115)&(arr[:,:,1]<110)&(arr[:,:,0].astype(int)+arr[:,:,2].astype(int)>arr[:,:,1].astype(int)*4)
    regions=[]
    mask=~bg;seen=np.zeros(mask.shape,dtype=bool)
    for yy,xx in zip(*np.where(mask)):
        if seen[yy,xx]:continue
        q=deque([(int(xx),int(yy))]);seen[yy,xx]=True;xs=[];ys=[]
        while q:
            x,y=q.popleft();xs.append(x);ys.append(y)
            for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if 0<=nx<im.width and 0<=ny<im.height and mask[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;q.append((nx,ny))
        if len(xs)>1000:regions.append((min(xs),min(ys),max(xs)+1,max(ys)+1,0))
    regions.sort(key=lambda r:(r[1]//(im.height//2),r[0]))
    arr[:,:,3]=np.where(bg,0,255);clean=Image.fromarray(arr)
    assert len(regions)>max(i for i,_ in mapping),(name,len(regions))
    atlas=Image.new('RGBA',(512,384));frames=[];boxes=[]
    reference_height=regions[0][3]-regions[0][1]
    factor=162/reference_height
    for frame,(source,flip) in enumerate(mapping):
        box=regions[source][:4];part=clean.crop(box)
        if flip:part=ImageOps.mirror(part)
        # Same scale across every pose, aligned to consistent ground baseline.
        size=(max(1,round(part.width*factor)),max(1,round(part.height*factor)))
        if size[0]>124 or size[1]>183:factor2=min(124/part.width,183/part.height);size=(round(part.width*factor2),round(part.height*factor2))
        part=part.resize(size,Image.Resampling.NEAREST)
        canvas=Image.new('RGBA',(128,192));canvas.alpha_composite(part,((128-part.width)//2,184-part.height));
        atlas.alpha_composite(canvas,((frame%4)*128,(frame//4)*192));frames.append(canvas)
        contact.paste(canvas,(frame*128,row*210+18),canvas);draw.text((frame*128+2,row*210+2),f'{name} {frame}',fill='white');boxes.append(list(box))
    atlas.save(OUT/f'{name}.png')
    preview=[]
    for i in [0,0,1,2,3,2,4,5,5,0,6,0,7,7,0]:
        f=Image.new('RGB',(256,384),(30,37,49));f.paste(frames[i].resize((256,384),Image.Resampling.NEAREST),(0,0),frames[i].getchannel('A').resize((256,384),Image.Resampling.NEAREST));preview.append(f)
    preview[0].save(QA/f'{name}-animation.gif',save_all=True,append_images=preview[1:],duration=140,loop=0)
    reports.append({'name':name,'source_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'source_components':len(regions),'frame_count':8,'frame_size':[128,192],'frame_source_boxes':boxes,'mapping':mapping,'alpha':True,'status':'normalized_for_visual_review'})
for name in ('town','dungeon'):
    Image.open(ROOT/'Art/Candidates'/f'{name}.png').convert('RGB').resize((512,288),Image.Resampling.NEAREST).save(OUT/f'{name}.png')
contact.save(QA/'animation-contact.png')
(QA/'art-manifest.json').write_text(json.dumps(reports,indent=2),encoding='utf-8')
print(json.dumps([{'name':r['name'],'components':r['source_components']} for r in reports]))
