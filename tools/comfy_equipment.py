"""Generate the five weapon families through local ComfyUI, preserving each workflow."""
import json,time,urllib.request,urllib.parse
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'Art/Equipment';DEST.mkdir(parents=True,exist_ok=True)
OUT=ROOT/'AshenOath/Assets/Resources/Equipment';OUT.mkdir(parents=True,exist_ok=True)
def api(path,data=None):
    raw=None if data is None else json.dumps(data).encode()
    with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8188'+path,data=raw,headers={'Content-Type':'application/json'}),timeout=120) as response:return json.load(response)
base=json.loads((ROOT/'Art/Flux/hero.workflow.json').read_text())
descriptions={'sword':'a slender straight longsword, ornate ivory steel blade with delicate golden filigree, blue gemstone in gold crossguard, dark leather grip',
 'greatsword':'a broad massive two-handed greatsword, long ivory steel blade, elaborate gold crossguard and a ruby gemstone, long leather handle',
 'focus':'a long elegant priestess staff, white gold spiral shaft, ornate golden crescent head around an emerald glowing crystal, fine gold filigree',
 'bow':'an elegant tall recurved elven bow, ivory limbs decorated with gold curling leaves, taut thin string visible connecting both tips, emerald details',
 'daggers':'one curved assassin dagger, polished ivory steel blade, elaborate gold guard, amethyst gemstone, dark leather grip'}
contact=Image.new('RGB',(1000,500),(30,35,44));draw=ImageDraw.Draw(contact)
for index,(name,description) in enumerate(descriptions.items()):
    target=DEST/(name+'.png')
    if not target.exists():
        graph=json.loads(json.dumps(base));graph['4']['inputs']['text']='A single isolated fantasy RPG equipment asset: '+description+'. Shown perfectly upright, blade or staff head pointing straight UP, grip at bottom. Entire object fully visible and centered with wide clear margins. Full frontal orthographic flat view, no perspective. Beautiful detailed realistic painterly illustration, rich gold and ivory high fantasy aesthetic. Background perfectly flat saturated magenta #FF00FF. No person, no hands, no text, no labels, no grid, no border, no cast shadow. Exactly one weapon.'
        graph['5']['inputs']['width']=512;graph['5']['inputs']['height']=768;graph['9']['inputs']['width']=512;graph['9']['inputs']['height']=768;graph['7']['inputs']['noise_seed']=888120+index;graph['12']['inputs']['filename_prefix']='AshenOath/equipment-'+name
        (DEST/(name+'.workflow.json')).write_text(json.dumps(graph,indent=2))
        pid=api('/prompt',{'prompt':graph,'client_id':'ashen-equipment'})['prompt_id'];print(name,pid,flush=True)
        for n in range(300):
            history=api('/history/'+pid)
            if pid in history:
                entry=history[pid]
                if entry.get('status',{}).get('status_str')=='error':raise RuntimeError(entry['status'])
                images=entry.get('outputs',{}).get('12',{}).get('images',[])
                if images:
                    with urllib.request.urlopen('http://127.0.0.1:8188/view?'+urllib.parse.urlencode(images[0])) as f:target.write_bytes(f.read())
                    break
            time.sleep(2)
        else:raise TimeoutError(name)
    im=Image.open(target).convert('RGBA');a=np.array(im);rgb=a[:,:,:3].astype(int)
    mask=(rgb[:,:,0]>100)&(rgb[:,:,2]>95)&(rgb[:,:,1]<rgb[:,:,0]*.7)&(rgb[:,:,1]<rgb[:,:,2]*.75)
    a[:,:,3]=np.where(mask,0,255);im=Image.fromarray(a);im=im.crop(im.getbbox());im=ImageOps.contain(im,(192,420),Image.Resampling.LANCZOS)
    im.save(OUT/(name+'.png'));contact.paste(im,(index*200+(200-im.width)//2,40),im);draw.text((index*200+10,10),name,fill='white')
contact.save(ROOT/'QA/equipment-contact.png');print('equipment ready',flush=True)
