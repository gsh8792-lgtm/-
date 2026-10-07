"""Original sanctuary art. ASHBOUND is a design reference, never an asset source."""
import json, time, urllib.request, urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'Art/Sanctuary';DEST.mkdir(parents=True,exist_ok=True)
OUT=ROOT/'AshenOath/Assets/Resources/Sanctuary';OUT.mkdir(parents=True,exist_ok=True)
graph=json.loads((ROOT/'Art/Flux/hero.workflow.json').read_text())
graph['4']['inputs']['text']='Original high fantasy RPG environment painting, a luminous ruined ivory citadel rebuilt as a sanctuary on sheer ocean cliffs beneath a gigantic pale moon, late blue hour, wide cinematic panoramic landscape. Foreground is a sheltered courtyard with weathered pale marble steps, engraved brass gates, white silk banners, a glowing amber blacksmith forge at the lower left and a tiny emerald glass alchemy greenhouse to the right. Farther back an elegant circular gold-roofed chapel and delicate flying buttresses, tall cypress trees, shimmering dark teal sea and distant islands far below. Rich environmental storytelling, intricate hand-painted stonework and gold filigree, beautiful layered depth, restrained ivory and antique gold accents against deep petrol blue shadows, warm windows, soft atmospheric moonlight, premium detailed 2D fantasy game illustration with crisp intricate texture. Clean readable architectural silhouette, no characters, no human figures, no UI, no letters, no typography, no logo, no border. Not a screenshot. Entire image is one continuous environment.'
for node in ['5','9']:graph[node]['inputs'].update(width=1344,height=768)
graph['7']['inputs']['noise_seed']=10070655
graph['12']['inputs']['filename_prefix']='AshenOath/original-sanctuary'
(DEST/'sanctuary.workflow.json').write_text(json.dumps(graph,indent=2))
def api(path,data=None):
    req=urllib.request.Request('http://127.0.0.1:8188'+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=120) as f:return json.load(f)
pid=api('/prompt',{'prompt':graph,'client_id':'ashen-original-sanctuary'})['prompt_id']
print(pid,flush=True)
for _ in range(400):
    h=api('/history/'+pid)
    if pid in h:
        entry=h[pid]
        if entry.get('status',{}).get('status_str')=='error':raise RuntimeError(entry['status'])
        imgs=entry.get('outputs',{}).get('12',{}).get('images',[])
        if imgs:
            with urllib.request.urlopen('http://127.0.0.1:8188/view?'+urllib.parse.urlencode(imgs[0])) as f:content=f.read()
            (DEST/'sanctuary.png').write_bytes(content);(OUT/'sanctuary.png').write_bytes(content)
            print('Original sanctuary saved',flush=True);break
    time.sleep(2)
else:raise TimeoutError(pid)
