"""Store generated, fully dressed animation frames with their original alpha."""
from pathlib import Path
import sys,json,hashlib
from PIL import Image
import numpy as np
root=Path(__file__).resolve().parents[1]
name,source=sys.argv[1],Path(sys.argv[2])
raw=root/'Art/Rebuild';raw.mkdir(parents=True,exist_ok=True)
dest=root/'AshenOath/Assets/Resources/Belt';dest.mkdir(parents=True,exist_ok=True)
content=source.read_bytes();(raw/(name+'.png')).write_bytes(content)
(dest/(name+'.png')).write_bytes(content)
im=Image.open(source).convert('RGBA');a=np.array(im);w,h=im.size
assert w%6==0 and h%4==0
cells=[]
for i in range(24):
    cell=im.crop((i%6*w//6,i//6*h//4,(i%6+1)*w//6,(i//6+1)*h//4))
    alpha=np.array(cell)[:,:,3]
    cells.append({'frame':i,'bounds':cell.getbbox(),'opaque_pixels':int((alpha>128).sum())})
    assert (alpha>128).sum()>500,(name,i,'empty frame')
manifest={'name':name,'sha256':hashlib.sha256(content).hexdigest(),'size':im.size,'columns':6,'rows':4,'alpha_preserved':True,'cells':cells,
 'clips':{'walk':[0,1,2,3,4,5],'attack':[6,7,8,9,10,11],'skill':[12,13,14,15,16,17],'idle':[18,19],'hurt':[20,21],'dodge':[22],'death':[23]}}
(raw/(name+'.json')).write_text(json.dumps(manifest,indent=2))
print(name,im.size,'24 nonempty frames; alpha preserved')
