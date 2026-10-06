using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using Random=System.Random;

namespace AshenOath.Editor
{
    public static class BuildTools
    {
        static string Root=>Directory.GetParent(Application.dataPath).Parent.FullName;
        [MenuItem("Ashen Oath/Validate rules")]
        public static void Validate()
        {
            int checks=0;Action<bool,string> check=(passed,msg)=>{checks++;if(!passed)throw new Exception("VALIDATION FAILED: "+msg);};
            for(int region=0;region<5;region++)for(int seed=0;seed<100;seed++)
            {var route=Rules.Route(seed,region);check(route.Length==20,"20 rooms");check(route[0]==RoomKind.Battle,"safe start");check(route[19]==RoomKind.Boss,"boss final");check(route[4]==RoomKind.Rest&&route[9]==RoomKind.Rest&&route[14]==RoomKind.Rest,"rest cadence");check(route.SequenceEqual(Rules.Route(seed,region)),"deterministic route");}
            var p=Rules.NewProfile();p.level=14;p.runeRank=7;p.runePoints=4;p.stash.Add(new Gear{id="safe",durability=91});
            for(int i=0;i<14;i++)p.bag.Add(Rules.Drop(new Random(i),1,i));
            string a=p.bag[0].id,b=p.bag[1].id;var lost=Rules.OnDeath(p,new Random(22));
            check(p.level==1&&p.xp==0,"death resets level");check(p.runeRank==7&&p.runePoints==4,"runes permanent");check(p.bag.Count==3&&lost.Count==13,"three survivors");
            check(p.bag.Any(g=>g.id==a)&&p.bag.Any(g=>g.id==b),"insured equipment survives");check(p.stash.Count==1&&p.stash[0].durability==91,"stash untouched");check(p.bag.All(g=>g.durability==35),"durability penalty");
            check(!Rules.ChangeJob(p,4,false)&&Rules.ChangeJob(p,4,true),"town-only jobs");check(!Rules.ToggleSecure(p,p.bag[2]),"two insurance slots");
            p.bag.Clear();p.weapon=p.armor=-1;Rules.OnDeath(p,new Random(1));check(p.bag.Count==0,"empty bag death safe");
            check(Rules.Damage(100,100)==50,"armor curve");check(Rules.Damage(-5,0)>=1,"damage floor");
            var rng=new Random(456);int[] count=new int[10];for(int i=0;i<20000;i++){var item=Rules.Drop(rng,4,20);count[item.rarity]++;check(item.power>=0&&item.armor>=0&&item.durability==100,"valid drop");check(item.affixes.Count==Equipment.AffixCounts[item.rarity],"grade affix count");check(item.affixes.Select(x=>x.id).Distinct().Count()==item.affixes.Count,"unique affix families");}
            check(count[9]>15&&count[9]<80,"L probability");
            check(Equipment.Catalog.Length==50,"50 base weapons");
            for(int grade=0;grade<10;grade++){check(Equipment.Catalog.Count(t=>t.grade==grade)==5,"5 weapons per grade");check(Equipment.Weights[Math.Min(4,grade)].Sum()==10000,"drop weights normalize");}
            check(Equipment.Catalog.Select(t=>t.id).Distinct().Count()==50,"unique equipment IDs");
            for(int i=0;i<5000;i++)check(Equipment.RollGrade(rng,0,false)<=4,"region one grade gate");
            var attack=new Modifiers{crit=0,penetration=.2f,fire=.3f};var target=new Modifiers{resist=.5f};
            var hit=Equipment.ComputeDamage(100,100,attack,target,false,false,false,.99);
            check(Math.Abs(hit.total-(100f/1.8f+15))<.001,"physical penetration and elemental resistance");
            attack.crit=1;attack.critDamage=2;var crit=Equipment.ComputeDamage(100,100,attack,target,false,false,false,0);
            check(Math.Abs(crit.total-hit.total*2)<.001&&crit.critical,"critical after mitigation");
            var cap=Rules.NewProfile();foreach(var id in Equipment.AffixIds)cap.bag[0].affixes.Add(new AffixRoll{id=id,value=9});
            var capped=Equipment.Sum(cap);check(capped.crit==.75f&&capped.penetration==.6f&&capped.cooldown==.4f&&capped.leech==.12f,"caps prevent runaway stacking");
            for(int i=0;i<100;i++)check(Rules.Drop(rng,0,20,true).rarity>=2,"boss rare floor");
            check(Rules.Jobs.Take(2).All(j=>j.mana==0)&&Rules.Jobs[5].mana==0,"stamina jobs");check(Rules.Jobs.Skip(2).Take(3).All(j=>j.mana>0&&j.stamina>0),"hybrid jobs");
            string qa=Path.Combine(Root,"QA");Directory.CreateDirectory(qa);
            Directory.CreateDirectory(Path.Combine(Root,"Data"));File.WriteAllText(Path.Combine(Root,"Data","equipment-catalog.json"),JsonUtility.ToJson(new CatalogWrapper{items=Equipment.Catalog},true));
            File.WriteAllText(Path.Combine(qa,"rules-results.json"),"{\"passed\":true,\"assertions\":"+checks+",\"routeSeeds\":500,\"dropSamples\":20000,\"rarities\":["+string.Join(",",count)+"]}");Debug.Log("ASHEN VALIDATION PASSED: "+checks);
        }
        [Serializable]class CatalogWrapper{public EquipmentTemplate[] items;}
        public static void Prepare()
        {
            Directory.CreateDirectory("Assets/Scenes");var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            var camera=new GameObject("Camera").AddComponent<Camera>();camera.orthographic=true;camera.backgroundColor=Color.black;camera.clearFlags=CameraClearFlags.SolidColor;camera.tag="MainCamera";
            EditorSceneManager.SaveScene(scene,"Assets/Scenes/Boot.unity");EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene("Assets/Scenes/Boot.unity",true)};
            PlayerSettings.companyName="AshenOath";PlayerSettings.productName="Ashen Oath";PlayerSettings.bundleVersion="0.1.0";
            PlayerSettings.defaultScreenWidth=1280;PlayerSettings.defaultScreenHeight=720;PlayerSettings.fullScreenMode=FullScreenMode.Windowed;PlayerSettings.runInBackground=true;
            PlayerSettings.SplashScreen.show=false;
            PlayerSettings.defaultInterfaceOrientation=UIOrientation.LandscapeLeft;PlayerSettings.SetApplicationIdentifier(UnityEditor.Build.NamedBuildTarget.Android,"com.ashenoath.prototype");
            foreach(string guid in AssetDatabase.FindAssets("t:Texture2D",new[]{"Assets/Resources/Art"}))
            {string path=AssetDatabase.GUIDToAssetPath(guid);var importer=(TextureImporter)AssetImporter.GetAtPath(path);importer.filterMode=FilterMode.Point;importer.textureCompression=TextureImporterCompression.Uncompressed;importer.mipmapEnabled=false;importer.alphaIsTransparency=true;importer.maxTextureSize=2048;importer.SaveAndReimport();}
            foreach(string guid in AssetDatabase.FindAssets("t:Texture2D",new[]{"Assets/Resources/Rig"}))
            {var importer=(TextureImporter)AssetImporter.GetAtPath(AssetDatabase.GUIDToAssetPath(guid));importer.filterMode=FilterMode.Bilinear;importer.textureCompression=TextureImporterCompression.Uncompressed;importer.mipmapEnabled=false;importer.alphaIsTransparency=true;importer.SaveAndReimport();}
            AssetDatabase.SaveAssets();Validate();
        }
        [MenuItem("Ashen Oath/Build all preview targets")]
        public static void All(){Windows();Web();}
        [MenuItem("Ashen Oath/Build Windows player")]
        public static void Windows()
        {
            Prepare();string path=Path.Combine(Root,"Builds","Windows","AshenOath.exe");Directory.CreateDirectory(Path.GetDirectoryName(path));
            var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{"Assets/Scenes/Boot.unity"},locationPathName=path,target=BuildTarget.StandaloneWindows64,options=BuildOptions.Development});
            File.WriteAllText(Path.Combine(Root,"QA","windows-build.json"),"{\"result\":\""+report.summary.result+"\",\"errors\":"+report.summary.totalErrors+",\"warnings\":"+report.summary.totalWarnings+"}");
            if(report.summary.result!=BuildResult.Succeeded)throw new Exception("Windows build failed");
        }
        [MenuItem("Ashen Oath/Build browser preview")]
        public static void Web()
        {
            Prepare();PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Disabled;
            PlayerSettings.WebGL.dataCaching=false;
            var r=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{"Assets/Scenes/Boot.unity"},locationPathName=Path.Combine(Root,"Builds","Web"),target=BuildTarget.WebGL,options=BuildOptions.Development});
            if(r.summary.result!=BuildResult.Succeeded)throw new Exception("Web preview build failed");
        }
        [MenuItem("Ashen Oath/Build Android APK")]
        public static void Android()
        {
            Prepare();if(!BuildPipeline.IsBuildTargetSupported(BuildTargetGroup.Android,BuildTarget.Android))throw new Exception("Android module is not installed");
            PlayerSettings.SetScriptingBackend(UnityEditor.Build.NamedBuildTarget.Android,ScriptingImplementation.IL2CPP);PlayerSettings.Android.targetArchitectures=AndroidArchitecture.ARM64;
            PlayerSettings.Android.forceInternetPermission=true;PlayerSettings.Android.minSdkVersion=AndroidSdkVersions.AndroidApiLevel26;
            string path=Path.Combine(Root,"Builds","Android","AshenOath.apk");Directory.CreateDirectory(Path.GetDirectoryName(path));
            var r=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{"Assets/Scenes/Boot.unity"},locationPathName=path,target=BuildTarget.Android,options=BuildOptions.Development});
            File.WriteAllText(Path.Combine(Root,"QA","android-build.json"),"{\"result\":\""+r.summary.result+"\",\"errors\":"+r.summary.totalErrors+",\"warnings\":"+r.summary.totalWarnings+"}");
            if(r.summary.result!=BuildResult.Succeeded)throw new Exception("Android build failed");
        }
    }
}
