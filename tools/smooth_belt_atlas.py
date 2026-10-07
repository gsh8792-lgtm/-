"""Build RGBA in-betweens with the local ComfyUI RIFE model.

Uses the installed ComfyUI IFNet implementation (GPL-3.0) and official
Comfy-Org/frame_interpolation RIFE v4.26 weights (RIFE: MIT).
Model inference warps premultiplied color and alpha with the same learned flow.
Key poses are retained; interpolation never crosses unrelated action clips.
"""
from pathlib import Path
import sys, json, hashlib, argparse
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('names', nargs='*')
args = parser.parse_args()
sys.path.insert(0, 'C:/AI_Workspace/ComfyUI')
import torch
from safetensors.torch import load_file
from comfy_extras.frame_interpolation_models.ifnet import IFNet, detect_rife_config

model_path = ROOT/'Builds/models/rife_v4.26.safetensors'
sd = load_file(str(model_path))
sd = {k.removeprefix('module.').removeprefix('flownet.'): v for k,v in sd.items()}
for i in range(5):
    sd = {k.replace(f'block{i}.', f'blocks.{i}.'):v for k,v in sd.items()}
sd = {k:v for k,v in sd.items() if not k.startswith(('teacher.','caltime.'))}
head,channels = detect_rife_config(sd)
device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = IFNet(head_ch=head,channels=channels)
model.load_state_dict(sd)
model = model.eval().to(device)

@torch.inference_mode()
def interpolate(a,b,t):
    # Capture final optical flow and blend mask without copying IFNet's code.
    flow = {}
    original_warp = model.warp
    a4 = torch.from_numpy(np.asarray(a).copy()).permute(2,0,1)[None].to(device).float()/255
    b4 = torch.from_numpy(np.asarray(b).copy()).permute(2,0,1)[None].to(device).float()/255
    a4[:,:3] *= a4[:,3:4]; b4[:,:3] *= b4[:,3:4]
    a3,b3 = a4[:,:3].contiguous(),b4[:,:3].contiguous()
    def warp(image,field):
        if image is a3: flow['a'] = field
        if image is b3: flow['b'] = field
        return original_warp(image,field)
    mask = {}
    hook = model.blocks[-1].register_forward_hook(lambda m,i,o:mask.update(value=o[1]))
    model.warp = warp
    try:
        model(a3,b3,t)
        mix = torch.sigmoid(mask['value'])
        rgba = torch.lerp(original_warp(b4,flow['b']),original_warp(a4,flow['a']),mix).clamp(0,1)
        rgba[:,:3] /= rgba[:,3:4].clamp_min(1/255)
        return Image.fromarray((rgba[0].permute(1,2,0).clamp(0,1).cpu().numpy()*255+.5).astype('uint8'))
    finally:
        model.warp = original_warp
        hook.remove()

def ground(frame):
    box=frame.getchannel('A').point(lambda x:255 if x>100 else 0).getbbox()
    result=Image.new('RGBA',(256,256))
    # Keep the original x anchor and the pose; align the soles to a common floor.
    result.paste(frame,(0,249-box[3]))
    return result

def split_complete_poses(source):
    # Follow connected silhouettes across nominal grid boundaries. A sword can
    # extend into a neighbour's empty gutter without being cut into two sprites.
    rgba=np.array(source).copy(); alpha=rgba[:,:,3]
    labels,_=ndimage.label(alpha>100)
    sizes=np.bincount(labels.ravel()); ids=np.flatnonzero(sizes>1000);ids=ids[ids!=0]
    markers=np.zeros(alpha.shape,dtype=np.int16)
    for component in ids:
        cy,cx=ndimage.center_of_mass(alpha>100,labels,int(component))
        slot=min(3,int(cy//256))*6+min(5,int(cx//256))
        markers[labels==component]=slot+1
    assert set(np.unique(markers))==set(range(25)),'Missing body component'
    nearest=ndimage.distance_transform_edt(markers==0,return_distances=False,return_indices=True)
    ownership=markers[nearest[0],nearest[1]]
    poses=[];boxes=[]
    for i in range(24):
        data=rgba.copy();data[:,:,3]=np.where((ownership==i+1)&(alpha>3),alpha,0)
        pose=Image.fromarray(data);box=pose.getchannel('A').point(lambda x:255 if x>100 else 0).getbbox()
        box=(max(0,box[0]-2),max(0,box[1]-2),min(source.width,box[2]+2),min(source.height,box[3]+2))
        poses.append(pose);boxes.append(box)
    extent=max(max(abs(b[0]-(i%6*256+128)),abs(b[2]-(i%6*256+128))) for i,b in enumerate(boxes))
    scale=min(1,122/extent,244/max(b[3]-b[1] for b in boxes))
    frames=[]
    for i,(pose,box) in enumerate(zip(poses,boxes)):
        cut=pose.crop(box).resize((max(1,round((box[2]-box[0])*scale)),max(1,round((box[3]-box[1])*scale))),Image.Resampling.LANCZOS)
        frame=Image.new('RGBA',(256,256));frame.paste(cut,(round(128+(box[0]-(i%6*256+128))*scale),249-cut.height));frames.append(frame)
    split_complete_poses.scale=scale
    return frames

names=args.names or [p.stem for p in (ROOT/'Art/Rebuild').glob('*.json') if 'clips' in json.loads(p.read_text())]
reports=[]
for name in names:
    source=Image.open(ROOT/f'Art/Rebuild/{name}.png').convert('RGBA')
    frames=split_complete_poses(source)
    walk=ROOT/f'Art/Rebuild/{name}-run.png'
    if walk.exists():
        image=Image.open(walk).convert('RGBA');w,h=image.size
        assert w%3==0 and h%2==0,(name,image.size)
        cells=[]; boxes=[]
        rows=(np.array(image.getchannel('A'))>100).sum(axis=1)
        gaps=[y for y in range(h//2-96,h//2+97) if rows[y]==0]
        assert gaps,(name,'no horizontal transparent gutter')
        split=min(gaps,key=lambda y:abs(y-h//2));row_cuts=[0,split,h]
        for row in range(2):
            # Generated sheets can drift a few pixels across nominal cell edges.
            # Cut only through an actual transparent gutter to retain every blade.
            band=image.crop((0,row_cuts[row],w,row_cuts[row+1]))
            occupancy=(np.array(band.getchannel('A'))>100).sum(axis=0)
            cuts=[0]
            for nominal in (w//3,2*w//3):
                candidates=[x for x in range(nominal-96,nominal+97) if occupancy[x]==0]
                assert candidates,(name,row,'no transparent gutter')
                cuts.append(min(candidates,key=lambda x:abs(x-nominal)))
            cuts.append(w)
            for col in range(3):
                cell=band.crop((cuts[col],0,cuts[col+1],band.height))
                box=cell.getchannel('A').point(lambda x:255 if x>100 else 0).getbbox()
                cells.append(cell);boxes.append(box)
        original_heights=[]
        for f in frames[:6]:
            b=f.getchannel('A').point(lambda x:255 if x>100 else 0).getbbox();original_heights.append(b[3]-b[1])
        scale=min(float(np.median(original_heights)/np.median([b[3]-b[1] for b in boxes])),244/max(b[2]-b[0] for b in boxes),244/max(b[3]-b[1] for b in boxes))
        for i,(cell,box) in enumerate(zip(cells,boxes)):
            cut=cell.crop(box).resize((round((box[2]-box[0])*scale),round((box[3]-box[1])*scale)),Image.Resampling.LANCZOS)
            normalized=Image.new('RGBA',(256,256));normalized.paste(cut,((256-cut.width)//2,249-cut.height));frames[i]=normalized
    next_frame=list(range(1,24))+[23]
    next_frame[5]=0;next_frame[11]=18;next_frame[17]=18;next_frame[19]=18;next_frame[21]=18;next_frame[22]=22
    output=Image.new('RGBA',(3072,2048));generated=[]
    for i,frame in enumerate(frames):
        for sub in range(4):
            f=frame if sub==0 or next_frame[i]==i else interpolate(frame,frames[next_frame[i]],sub/4)
            n=i*4+sub;output.paste(f,(n%12*256,n//12*256));generated.append(f)
    destination=ROOT/f'AshenOath/Assets/Resources/Belt/{name}-smooth.png';output.save(destination)
    preview=ROOT/f'QA/{name}-motion.webp'
    order=list(range(24))+list(range(24,48))+list(range(48,72))+list(range(72,80))
    generated[0].save(preview,save_all=True,append_images=[generated[i] for i in order[1:]],duration=42,loop=0,lossless=True)
    report={'name':name,'frames':96,'columns':12,'rows':8,'base_scale':split_complete_poses.scale,'complete_silhouettes':True,'method':'RIFE v4.26, shared flow RGBA; 4x; original keyframes retained','forward_lean_run':walk.exists(),'sha256':hashlib.sha256(destination.read_bytes()).hexdigest()}
    (ROOT/f'Art/Rebuild/{name}-smooth.json').write_text(json.dumps(report,indent=2))
    reports.append(report);print(name,'96 frames ready',flush=True)
layout={'entries':[{'name':r['name'],'scale':1/r['base_scale']} for p in (ROOT/'Art/Rebuild').glob('*-smooth.json') if 'base_scale' in (r:=json.loads(p.read_text()))]}
(ROOT/'AshenOath/Assets/Resources/Belt/layout.json').write_text(json.dumps(layout,indent=2))
print(json.dumps({'atlases':len(reports),'device':device}),flush=True)
