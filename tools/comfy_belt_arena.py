import json,time,urllib.request,urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'Art/Rebuild';DEST.mkdir(parents=True,exist_ok=True)
OUT=ROOT/'AshenOath/Assets/Resources/Belt';OUT.mkdir(parents=True,exist_ok=True)
g=json.loads((ROOT/'Art/Flux/hero.workflow.json').read_text())
g['4']['inputs']['text']='Original sophisticated hand-painted dark high fantasy 2D belt-scrolling action game background, wide horizontal ruined ivory royal abbey hall at night. View from slightly above the side, able to see a broad WALKABLE stone courtyard floor filling the entire LOWER TWO THIRDS of the image, spanning continuously from the left edge to the right edge. Clear large unoccupied combat space with detailed dark worn slate tiles and subtle cracks, softly lit by reflected gold candlelight. Only the UPPER THIRD contains towering broken pointed arches, intricately carved weathered ivory pillars, hanging tarnished brass censers, faded navy and burgundy banners, blue moonlight and distant mist. Scene composed as a broad flat playable stage with depth, not a single thin platform, not top-down, not an isometric diamond island. Beautiful intricate material painting with crisp restrained pixel-like texture, luminous antique gold and pale ivory accents, deep petrol blue shadows. No furniture or obstacles on foreground floor. No characters, no text, no UI, no logos, no borders. Continuous environment, suitable for a fluid side-view brawler with movement into and out of depth.'
for n in ['5','9']:g[n]['inputs'].update(width=1344,height=768)
g['7']['inputs']['noise_seed']=10070722;g['12']['inputs']['filename_prefix']='AshenOath/new-belt-arena'
(DEST/'arena.workflow.json').write_text(json.dumps(g,indent=2))
def api(path,data=None):
    q=urllib.request.Request('http://127.0.0.1:8188'+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(q,timeout=120) as f:return json.load(f)
pid=api('/prompt',{'prompt':g,'client_id':'ashen-belt-rebuild'})['prompt_id'];print(pid,flush=True)
for _ in range(400):
    h=api('/history/'+pid)
    if pid in h:
        e=h[pid]
        if e.get('status',{}).get('status_str')=='error':raise RuntimeError(e['status'])
        images=e.get('outputs',{}).get('12',{}).get('images',[])
        if images:
            with urllib.request.urlopen('http://127.0.0.1:8188/view?'+urllib.parse.urlencode(images[0])) as f:b=f.read()
            (DEST/'arena.png').write_bytes(b);(OUT/'arena.png').write_bytes(b);print('arena ready',flush=True);break
    time.sleep(2)
else:raise TimeoutError(pid)
