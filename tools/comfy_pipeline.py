"""Reproducible local ComfyUI concept candidates, never marked production approved."""
import argparse, json, time, urllib.request, urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:8188'
STYLE = ('Detailed 2D pixel art for a dark fantasy side scrolling action RPG, crisp pixel clusters, '
         'limited rich color palette, beautiful hand crafted sprite, clear readable silhouette, '
         'full body including feet, side view facing right, single character centered, plain white background, '
         'no shadow, no floor, no text, no grid, no border, no other character. ')
SUBJECTS = {
 'hero': 'Adult handsome male knight, black swept hair, weathered silver plate cuirass, midnight blue cape, brown boots, athletic proportions, standing combat ready, empty hands.',
 'knight': 'Beautiful adult woman knight age 28, glamorous curvy powerful build, long silver hair, ornate gold and ivory fitted breastplate, crimson cape, armored thigh high boots, fantasy heroine, standing combat ready, empty hands.',
 'healer': 'Beautiful adult woman priestess age 27, glamorous curvy build, long auburn hair, ivory and teal fitted ceremonial dress with open shoulders, golden jewelry, tall boots, elegant confident pose, empty hands.',
 'archer': 'Beautiful adult woman ranger age 26, glamorous curvy athletic build, long dark green hair, fitted forest green leather armor, short cape, thigh high brown boots, elegant confident pose, empty hands.',
 'enemy': 'Menacing skeletal undead warrior, full body humanoid skeleton, tattered purple cloak, rusted iron armor, glowing amber eyes, standing combat ready, empty hands.',
 'dungeon': 'Detailed pixel art background for a side scrolling dark fantasy dungeon, wide horizontal view of a ruined underground abbey, tall gothic arches, turquoise luminous mist, ancient stone masonry, distant stairs, hanging chains, warm candlelight, deep layered parallax composition, no characters, no interface, no text, no border.',
 'town': 'Detailed pixel art background for a side scrolling dark fantasy RPG town at dusk, medieval blacksmith forge and alchemist shop and warm lantern tavern, gothic roofs, distant ruined castle in lavender mountains, amber window light, deep layered horizontal composition, no characters, no text, no interface, no border.'
}
def api(path, obj=None):
    req = urllib.request.Request(BASE+path, data=None if obj is None else json.dumps(obj).encode(), headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req, timeout=60) as f: return json.load(f)
def workflow(name, seed):
    landscape=name in ('dungeon','town')
    prompt=SUBJECTS[name] if landscape else STYLE+SUBJECTS[name]
    return {
      '1':{'class_type':'CheckpointLoaderSimple','inputs':{'ckpt_name':'sd_xl_base_1.0.safetensors'}},
      '2':{'class_type':'CLIPTextEncode','inputs':{'text':prompt,'clip':['1',1]}},
      '3':{'class_type':'CLIPTextEncode','inputs':{'text':'photograph, 3d render, blurry, watermark, text, logo, cropped feet, extra limbs, duplicate person, child, nudity','clip':['1',1]}},
      '4':{'class_type':'EmptyLatentImage','inputs':{'width':1024 if landscape else 640,'height':576 if landscape else 832,'batch_size':1}},
      '5':{'class_type':'KSampler','inputs':{'model':['1',0],'positive':['2',0],'negative':['3',0],'latent_image':['4',0],'seed':seed,'steps':24,'cfg':6.5,'sampler_name':'dpmpp_2m','scheduler':'karras','denoise':1}},
      '6':{'class_type':'VAEDecode','inputs':{'samples':['5',0],'vae':['1',2]}},
      '7':{'class_type':'SaveImage','inputs':{'images':['6',0],'filename_prefix':'AshenOath/'+name}}
    }
def main():
    p=argparse.ArgumentParser();p.add_argument('--names',nargs='*',default=list(SUBJECTS));args=p.parse_args()
    dest=ROOT/'Art'/'Candidates';dest.mkdir(parents=True,exist_ok=True)
    for i,name in enumerate(args.names):
        if (dest/(name+'.png')).exists(): continue
        graph=workflow(name,879200+i)
        (dest/(name+'.workflow.json')).write_text(json.dumps(graph,indent=2),encoding='utf-8')
        job=api('/prompt',{'prompt':graph,'client_id':'ashen-oath-local'})
        pid=job['prompt_id'];print(json.dumps({'name':name,'prompt_id':pid}),flush=True)
        deadline=time.time()+1200
        while time.time()<deadline:
            history=api('/history/'+pid)
            if pid in history:
                entry=history[pid]
                (dest/(name+'.history.json')).write_text(json.dumps(entry,indent=2),encoding='utf-8')
                if entry.get('status',{}).get('status_str')=='error': raise RuntimeError(entry['status'])
                outputs=entry.get('outputs',{}).get('7',{}).get('images',[])
                if outputs:
                    url=BASE+'/view?'+urllib.parse.urlencode(outputs[0])
                    with urllib.request.urlopen(url,timeout=60) as f: (dest/(name+'.png')).write_bytes(f.read())
                    print('saved '+name,flush=True);break
            time.sleep(3)
        else: raise TimeoutError(pid)
if __name__=='__main__': main()
