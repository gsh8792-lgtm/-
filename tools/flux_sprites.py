"""Local Flux.2 Klein generation, one frame grid is a single identity reference."""
import json,time,urllib.request,urllib.parse
from pathlib import Path
from comfy_pipeline import api,ROOT
DEST=ROOT/'Art'/'Flux';DEST.mkdir(parents=True,exist_ok=True)
characters={
'hero':'an adult handsome male knight with short black hair, blue silver plate armor, dark navy cape, brown leather boots. No helmet. Athletic realistic adult proportions.',
'knight':'an adult beautiful glamorous voluptuous female knight with long silver hair, ornate fitted ivory and gold breastplate, crimson cape, armored black thigh high boots. Mature heroic proportions.',
'healer':'an adult beautiful glamorous voluptuous female healer with flowing auburn hair, low neckline fitted teal and ivory dress, gold ornaments, brown thigh high boots. Mature heroic proportions.',
'archer':'an adult beautiful glamorous voluptuous female ranger with long emerald hair, fitted dark green leather corset armor, bare shoulders, short brown cape and thigh high boots. Mature heroic proportions.',
'enemy':'a menacing humanoid skeleton warrior wearing tattered purple robes and rusty bronze armor, skull face with glowing eyes.'}
for index,(name,description) in enumerate(characters.items()):
    if (DEST/(name+'.png')).exists():continue
    prompt=('A professional game sprite sheet on a perfectly solid bright magenta (#FF00FF) background. '
     'Exactly eight full body pixel art sprites arranged in a precise 4 column by 2 row grid, each in its own equal cell, no cell borders. '
     'Every sprite shows the SAME character, '+description+' '
     'All characters face to the RIGHT in side profile as in a 2D side scrolling action game. '
     'Top row left to right: idle standing, walking contact pose right foot forward, walking passing pose, walking contact pose left foot forward. '
     'Bottom row: attack preparation with right arm raised, powerful forward punching attack with right arm extended, injured recoiling backwards, jumping with bent knees. '
     'Hands hold no weapons: empty fists. Each sprite fits completely in its cell with ample magenta margins and consistent feet baseline and body height. '
     'Each character is approximately 150 pixels tall. Crisp deliberate pixel clusters, detailed 16-bit dark fantasy pixel art, sharp edges, no blur, no text or lettering. '
     'Identical face, hair color, outfit, armor shapes and body proportions in every frame. No shadows or props or ground.')
    width,height=1024,768
    graph={
      '1':{'class_type':'UNETLoader','inputs':{'unet_name':'flux-2-klein-4b-fp8.safetensors','weight_dtype':'default'}},
      '2':{'class_type':'CLIPLoader','inputs':{'clip_name':'qwen_3_4b.safetensors','type':'flux2','device':'default'}},
      '3':{'class_type':'VAELoader','inputs':{'vae_name':'flux2-vae.safetensors'}},
      '4':{'class_type':'CLIPTextEncode','inputs':{'text':prompt,'clip':['2',0]}},
      '5':{'class_type':'EmptyFlux2LatentImage','inputs':{'width':width,'height':height,'batch_size':1}},
      '6':{'class_type':'BasicGuider','inputs':{'model':['1',0],'conditioning':['4',0]}},
      '7':{'class_type':'RandomNoise','inputs':{'noise_seed':771010+index}},
      '8':{'class_type':'KSamplerSelect','inputs':{'sampler_name':'euler'}},
      '9':{'class_type':'Flux2Scheduler','inputs':{'steps':4,'width':width,'height':height}},
      '10':{'class_type':'SamplerCustomAdvanced','inputs':{'noise':['7',0],'guider':['6',0],'sampler':['8',0],'sigmas':['9',0],'latent_image':['5',0]}},
      '11':{'class_type':'VAEDecode','inputs':{'samples':['10',0],'vae':['3',0]}},
      '12':{'class_type':'SaveImage','inputs':{'images':['11',0],'filename_prefix':'AshenOath/flux-'+name}}
    }
    (DEST/(name+'.workflow.json')).write_text(json.dumps(graph,indent=2),encoding='utf-8')
    pid=api('/prompt',{'prompt':graph,'client_id':'ashen-oath-flux'})['prompt_id'];print(name+' '+pid,flush=True)
    for attempt in range(400):
        result=api('/history/'+pid)
        if pid in result:
            entry=result[pid]
            if entry.get('status',{}).get('status_str')=='error':raise RuntimeError(entry['status'])
            images=entry.get('outputs',{}).get('12',{}).get('images',[])
            if images:
                with urllib.request.urlopen('http://127.0.0.1:8188/view?'+urllib.parse.urlencode(images[0])) as f:(DEST/(name+'.png')).write_bytes(f.read())
                print('saved '+name,flush=True);break
        time.sleep(3)
    else:raise TimeoutError(pid)
