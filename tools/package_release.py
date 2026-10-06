"""Package already-built artifacts and bind the handoff to machine-readable evidence."""
from pathlib import Path
import json,hashlib,zipfile,subprocess,datetime
from PIL import Image
import numpy as np
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'Deliveries';OUT.mkdir(exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8-sig'))
runtime=read('QA/runtime-results.json');rules=read('QA/rules-results.json');windows=read('QA/windows-build.json');android=read('QA/android-build.json')
assert runtime['passed'] and rules['passed'] and windows['result']=='Succeeded' and android['result']=='Succeeded'
network={role:read('QA/net-'+role+'.json') for role in ['host','client1','client2']}
assert all(x['passed'] for x in network.values())
manifest=read('QA/reference-rig-manifest.json')
original=Image.open(ROOT/'Art/Reference/parts-original.png').convert('RGBA')
for part in manifest['parts']:
    crop=np.array(original.crop(part['source_box']))[:,:,:3]
    actual=np.array(Image.open(ROOT/'AshenOath/Assets/Resources/Rig'/ (part['name']+'.png')))[:,:,:3]
    assert np.array_equal(crop,actual),part['name']
source_names={'parts-original.png':'codex-clipboard-a63a180e-c1aa-481e-977f-02130cab3cb7.png','character-original.png':'codex-clipboard-07a9b7ab-2d69-4427-ab1a-ce5343f2b48d.png'}
assert all(sha(ROOT/'Art/Reference'/dest)==manifest['source_hashes'][source] for dest,source in source_names.items())
mobile=Path((ROOT/'QA/android-build-location.txt').read_text(encoding='utf-8-sig').strip())/'AshenOath'
compiled=list((ROOT/'AshenOath/Assets').rglob('*.cs'))
assert all(sha(p)==sha(mobile/p.relative_to(ROOT/'AshenOath')) for p in compiled),'Android source snapshot differs'
report={'version':'0.1.0','created_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'windows_build':windows,'android_build':android,'android_signature':'APK Signature Scheme v2 verified',
 'android_min_sdk':26,'android_target_sdk':36,'android_abi':'arm64-v8a','rules':rules,'runtime':runtime,'local_three_process_network':network,
 'reference_original_bytes_identical':True,'reference_crop_rgb_identical':True,'android_compiled_sources_match':True,
 'visual_evidence':['town-reviewed.jpg','combat-reviewed.jpg','inventory-reviewed.jpg','legendary-equipment-reviewed.jpg','rig-reviewed.jpg','equipment-contact.png'],
 'limitations':['No connected Android hardware: no physical-device execution, thermal or multi-touch certification.',
 'LAN proof uses three separate local processes; separate devices and internet transport are not certified.',
 'Female companions share the supplied reference rig; six unique character costumes and complete armor layers remain production work.',
 '50 weapon definitions share five family illustrations. Regional content uses prototype shared art.',
 '100 stage slots are generated across five region tiers; they are not 100 distinct fully authored maps.',
 'Full requested production art parity is not certified.']}
(ROOT/'QA/validation-summary.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
def package(name,files):
    target=OUT/name
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for path,arc in files:z.write(path,str(arc).replace('\\','/'))
    with zipfile.ZipFile(target) as z:assert z.testzip() is None
    return {'file':name,'bytes':target.stat().st_size,'sha256':sha(target)}
result=[]
win=ROOT/'Builds/Windows';files=[(p,Path('AshenOath-Windows')/p.relative_to(win)) for p in win.rglob('*') if p.is_file()]
files.extend([(ROOT/'README.md','README.md'),(ROOT/'QA/validation-summary.json','validation-summary.json')])
result.append(package('AshenOath-0.1.0-Windows.zip',files))
apk=OUT/'AshenOath-0.1.0-Android.apk';apk.write_bytes((ROOT/'Builds/Android/AshenOath.apk').read_bytes())
result.append({'file':apk.name,'bytes':apk.stat().st_size,'sha256':sha(apk)})
names=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode().split('\0')
source=[(ROOT/n,n) for n in sorted(set(names)) if n and (ROOT/n).is_file() and not n.startswith('Deliveries/')]
result.append(package('AshenOath-0.1.0-Source-and-QA.zip',source))
(OUT/'release-manifest.json').write_text(json.dumps({'artifacts':result},indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
