"""Package the rebuilt belt-scroll release with evidence from the same source snapshot."""
from pathlib import Path
import json, hashlib, zipfile, subprocess, datetime
from PIL import Image, ImageStat
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'Deliveries'; OUT.mkdir(exist_ok=True)
VERSION='0.2.0'
NAMES=['hero-ivory','hero-ebon','hero-warrior','hero-mage','hero-healer','hero-archer','hero-rogue','knight','warrior','mage','healer','archer','rogue','enemy']
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p): return json.loads((ROOT/p).read_text(encoding='utf-8-sig'))
runtime=read('QA/runtime-results.json'); rules=read('QA/rules-results.json')
windows=read('QA/windows-build.json'); android=read('QA/android-build.json')
assert runtime['passed'] and runtime['checks']>=52 and rules['passed']
assert windows['result']==android['result']=='Succeeded'
network={role:read('QA/net-'+role+'.json') for role in ['host','client1','client2']}
assert all(x['passed'] and x['groundDepthMovement']>1 for x in network.values())
atlases=[]
for name in NAMES:
    report=read(f'Art/Rebuild/{name}-smooth.json')
    p=ROOT/f'AshenOath/Assets/Resources/Belt/{name}-smooth.png'
    assert report['forward_lean_run'] and report['complete_silhouettes'] and report['frames']==96 and report['sha256']==sha(p),name
    atlas=Image.open(p); assert atlas.mode=='RGBA' and atlas.size==(3072,2048)
    for i in range(96):
        cell=atlas.crop((i%12*256,i//12*256,(i%12+1)*256,(i//12+1)*256))
        assert cell.getchannel('A').getbbox(),(name,i)
    atlases.append(report)
assert not (ROOT/'AshenOath/Assets/Resources/Rig').exists()
assert not (ROOT/'AshenOath/Assets/Resources/Art').exists()
mobile=Path((ROOT/'QA/android-build-location.txt').read_text(encoding='utf-8-sig').strip())/'AshenOath'
snapshot=[p for p in (ROOT/'AshenOath/Assets').rglob('*') if p.is_file() and p.suffix in ('.cs','.png','.ttf')]
assert all(sha(p)==sha(mobile/p.relative_to(ROOT/'AshenOath')) for p in snapshot),'Android snapshot differs'
assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in (ROOT/'QA/android-signature.txt').read_text()
evidence=['belt-town-reviewed.png','belt-combat-reviewed.png','belt-animation-reviewed.png','belt-classes-reviewed.png','belt-equipment-reviewed.png','belt-attack-reviewed.png','belt-skill-reviewed.png']
assert all((ROOT/'QA'/p).is_file() for p in evidence)
assert all(sum(ImageStat.Stat(Image.open(ROOT/'QA'/p).convert('RGB')).stddev)>15 for p in evidence),'Blank visual capture'
report={'version':VERSION,'created_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'windows_build':windows,'android_build':android,'android_signature':'APK Signature Scheme v2 verified',
 'android_min_sdk':26,'android_target_sdk':36,'android_abi':'arm64-v8a','rules':rules,'runtime':runtime,
 'local_three_process_network':network,'android_source_and_art_snapshot_match':True,
 'retired_runtime_removed':True,'animation_atlases':atlases,'visual_evidence':evidence,
 'scope':['Town and five-room expedition ending in a boss; six playable jobs and six distinct female companion outfits.',
 'Whole-body forward-lean run poses, distance-driven foot cycle, ground-depth combat and jump height separated.',
 '14 full-body atlases, each with 24 run frames and 96 total slots including held dodge/death poses.',
 '50 weapon definitions, ten grades, affixes, runes, town services, saved progression and local LAN test.'],
 'limitations':['Android built and signed; no connected Android hardware for physical-device, thermal or multi-touch execution.',
 'LAN proof uses three local processes; separate devices and internet transport were not exercised.',
 'Knight high-grade armor changes to a second costume. A distinct costume for every equipment combination remains outside this milestone.',
 '50 weapon definitions share five family illustrations. Undead and boss currently share a full-body atlas.',
 'Five regions contain generated 20-room routes; these are not 100 distinct authored maps.',
 'Generated animation preserves the costume direction but is not a claim of pixel-identical shapes across every pose.']}
(ROOT/'QA/validation-summary.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
def package(name,files):
    target=OUT/name
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for path,arc in files:z.write(path,str(arc).replace(chr(92),'/'))
    with zipfile.ZipFile(target) as z:assert z.testzip() is None
    return {'file':name,'bytes':target.stat().st_size,'sha256':sha(target)}
result=[];win=ROOT/'Builds/Windows'
files=[(p,Path('AshenOath-Windows')/p.relative_to(win)) for p in win.rglob('*') if p.is_file()]
files.extend([(ROOT/'README.md','README.md'),(ROOT/'QA/validation-summary.json','validation-summary.json')])
result.append(package(f'AshenOath-{VERSION}-Windows.zip',files))
apk=OUT/f'AshenOath-{VERSION}-Android.apk';apk.write_bytes((ROOT/'Builds/Android/AshenOath.apk').read_bytes())
result.append({'file':apk.name,'bytes':apk.stat().st_size,'sha256':sha(apk)})
names=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode().split(chr(0))
retired_prefixes=('Deliveries/','Art/RetiredRuntime/','Art/Candidates/','Art/Flux/')
old_qa={'animation-contact.png','archer-animation.gif','enemy-animation.gif','healer-animation.gif','hero-animation.gif','knight-animation.gif','combat-reviewed.jpg','inventory-reviewed.jpg','legendary-equipment-reviewed.jpg','rig-reviewed.jpg','town-reviewed.jpg','reference-parts-contact.png','reference-rig-manifest.json','art-manifest.json'}
source=[(ROOT/n,n) for n in sorted(set(names)) if n and (ROOT/n).is_file() and not n.startswith(retired_prefixes) and not (n.startswith('QA/') and Path(n).name in old_qa)]
source.extend((ROOT/'QA'/n,'QA/'+n) for n in ['hero-ivory-motion.webp','knight-motion.webp'])
result.append(package(f'AshenOath-{VERSION}-Source-and-QA.zip',source))
(OUT/'release-manifest.json').write_text(json.dumps({'version':VERSION,'artifacts':result},indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
