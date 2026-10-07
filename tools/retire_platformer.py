"""One-time migration of the rejected platformer renderer out of active runtime."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
scripts=root/'AshenOath/Assets/Scripts'
p=scripts/'GameView.cs';s=p.read_text(encoding='utf-8-sig')
s=s.replace('Texture2D town,dungeon;readonly Dictionary<string,Texture2D> art=new Dictionary<string,Texture2D>();','')
s=s.replace('int tab,bagPage,guiCalls;','int bagPage,guiCalls;')
a=s.index('            tab=0;');b=s.index('            foreach(string n in Equipment.Kinds)',a);s=s[:a]+s[b:]
s=s.replace('RigReview();','AnimationReview();')
a=s.index('        void RigReview()');b=s.index('        void Hud()',a);s=s[:a]+s[b:]
a=s.index('        void LegacyInventory()');b=s.index('        void Pause()',a);s=s[:a]+s[b:]
s=s.replace('void Update(){if(Input.GetKeyDown(KeyCode.F3))debug=!debug;}','void Update(){if(Input.GetKeyDown(KeyCode.F3))debug=!debug;if(g!=null&&g.inTown&&Input.GetKeyDown(KeyCode.I))g.inventory=!g.inventory;}')
p.write_text(s,encoding='utf-8')
p=scripts/'GameSession.cs';s=p.read_text(encoding='utf-8-sig')
a=s.index('        Controls LegacyAI(');b=s.index('        void Attack(',a);s=s[:a]+s[b:]
s=s.replace('Mathf.Abs(a.x-f.x)<8','Vector2.Distance(new Vector2(a.x,a.y),new Vector2(f.x,f.y))<8')
s=s.replace('Mathf.Abs(a.x-target.x)<4','Vector2.Distance(new Vector2(a.x,a.y),new Vector2(target.x,target.y))<4')
p.write_text(s,encoding='utf-8')
p=scripts/'SanctuaryView.cs';s=p.read_text(encoding='utf-8-sig').replace('new Rect(51,232,222,245),"hero-ivory",18','new Rect(43,230,239,239),DressedSet(g.Hero),18+g.elapsed*2%2');p.write_text(s,encoding='utf-8')
p=scripts/'LanCoop.cs';s=p.read_text(encoding='utf-8-sig').replace('protocol=1,','protocol=2,').replace('p.protocol!=1','p.protocol!=2');p.write_text(s,encoding='utf-8')
p=root/'AshenOath/Assets/Editor/BuildTools.cs';s=p.read_text(encoding='utf-8-sig');a=s.index('            foreach(string guid in AssetDatabase.FindAssets("t:Texture2D",new[]{"Assets/Resources/Art"}))');b=s.index('            foreach(string guid in AssetDatabase.FindAssets("t:Texture2D",new[]{"Assets/Resources/Belt"',a);s=s[:a]+s[b:];s=s.replace('importer.maxTextureSize=2048','importer.maxTextureSize=4096');p.write_text(s,encoding='utf-8')
archive=root/'Art/RetiredRuntime';archive.mkdir(exist_ok=True)
for name in ['Art','Rig']:
    source=root/f'AshenOath/Assets/Resources/{name}'
    target=archive/name
    assert source.resolve().is_relative_to(root.resolve()) and target.resolve().is_relative_to(root.resolve())
    if source.exists():source.rename(target)
    meta=source.with_suffix('.meta')
    if meta.exists():meta.rename(archive/(name+'.meta.retired'))
for filename in ['ReferenceRig.cs','ReferenceRig.cs.meta']:
    source=scripts/filename
    if source.exists():source.rename(archive/(filename+'.retired'))
print('Rejected renderer and assets retired from Unity Resources.')
