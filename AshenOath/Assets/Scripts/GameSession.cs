using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using Random=System.Random;

namespace AshenOath
{
    [Serializable] public struct Controls
    { public float move; public bool jump,attack,skill,dodge,block; public int order; }
    [Serializable] public sealed class Fighter
    {
        public int id,job,face=1;public string name,art;public bool enemy,boss,remote;
        public float x,y,vy,hp,maxHp,maxSp,maxMp,sp,mp,stun,invulnerable,attackTime=-1,skillCooldown,slow,burn,burnTick;
        public float charge,aiTimer,holdX;public int phase;public bool resolved,skillAttack,blocking,grounded=true;
        public float move,range,power,armor;public Controls input;public Stance stance;
        public bool Alive=>hp>0;
        public float Height=>enemy?(boss?3.9f:2.6f):3.2f;
        public JobStats Stats=>Rules.Jobs[Mathf.Clamp(job,0,5)];
        public void Refresh(int level=1)
        {
            maxHp=Stats.hp+(level-1)*9;hp=maxHp;maxSp=Stats.stamina;maxMp=Stats.mana;sp=maxSp;mp=maxMp;
            range=Stats.range;power=Stats.power+(level-1)*2;armor=Stats.armor;
        }
    }
    [Serializable] public sealed class Missile
    { public int owner;public float x,y,dx,damage,life=2;public bool enemy;public int rune; }
    public sealed class FloatingText
    {public float x,y,time=1;public string text;public Color color;}
    [Serializable] public struct Platform
    {public float x,y,width;public Platform(float a,float b,float c){x=a;y=b;width=c;}}
    public sealed partial class GameSession:MonoBehaviour
    {
        public static GameSession I;
        public Profile profile;
        public readonly List<Fighter> actors=new List<Fighter>();
        public readonly List<Missile> shots=new List<Missile>();
        public readonly List<FloatingText> texts=new List<FloatingText>();
        public readonly List<Platform> platforms=new List<Platform>();
        public RoomKind[] route;public int room,region,seed,selection,order;
        public int potions {get=>profile.potions;set=>profile.potions=Mathf.Clamp(value,0,9);}
        public bool inTown=true,cleared,eventResolved,inventory,showCommands,paused,showTouch,deathScreen;
        public string message="재의 서약에 오신 것을 환영합니다.",eventName;
        public float messageTime=9,cameraX,worldWidth=42,elapsed;
        public int kills;public LanCoop net;public Controls localInput;public CombatSound sound;public float hitStop,shake;
        public bool IsClient=>net!=null&&net.mode==2;
        public Fighter Hero=>actors.FirstOrDefault(a=>a.id==(IsClient?net.localId:0))??actors.FirstOrDefault(a=>!a.enemy);
        public string SavePath=>Path.Combine(Application.persistentDataPath,"ashen-oath-v1.json");
        Random random=new Random();int nextId=10;float step;
        bool selftest;int testTick,captureTick;
        public static string Argument(string name)
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            if(!string.IsNullOrEmpty(Application.absoluteURL)){var query=new Uri(Application.absoluteURL).Query.TrimStart('?');foreach(var part in query.Split('&')){var pair=part.Split('=');if(pair.Length==2&&pair[0]==name.TrimStart('-'))return Uri.UnescapeDataString(pair[1]);}}
#endif
            var a=Environment.GetCommandLineArgs();int i=Array.IndexOf(a,name);return i>=0&&i+1<a.Length?a[i+1]:null;
        }
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Boot(){if(I==null)new GameObject("Ashen Oath").AddComponent<GameSession>();}
        void Awake()
        {
            I=this;Application.targetFrameRate=60;QualitySettings.vSyncCount=0;
            selftest=Argument("--smoke")!=null||Argument("--capture")!=null||Argument("--verify")!=null||Argument("--netcheck")!=null||Argument("--preview")!=null;
            profile=Rules.NewProfile();
            if(!selftest)try{if(File.Exists(SavePath)){var loaded=JsonUtility.FromJson<Profile>(File.ReadAllText(SavePath));if(loaded!=null&&loaded.version==1&&loaded.bag!=null)profile=loaded;}}catch(Exception e){Debug.LogWarning("Save load: "+e.Message);}
            profile.job=Mathf.Clamp(profile.job,0,5);profile.rune=Mathf.Clamp(profile.rune,0,Rules.Runes.Length-1);
            showTouch=Application.isMobilePlatform;net=gameObject.AddComponent<LanCoop>();gameObject.AddComponent<GameView>();sound=gameObject.AddComponent<CombatSound>();
            GoTown(false);
            if(!selftest)RestoreCheckpoint();
            if(Argument("--host")!=null)net.Host(int.Parse(Argument("--host")));
            if(Argument("--join")!=null)net.Join(Argument("--join"),int.Parse(Argument("--port")??"7777"));
            if(selftest){profile.started=true;if(Argument("--capture-mode")!="town"&&Argument("--netcheck")==null)BeginRun(0,5);if(Argument("--capture-mode")=="inventory"){for(int i=0;i<10;i++)profile.bag.Add(Equipment.Create(new Random(i),i,0,i+1));inventory=true;}}
        }
        public void Save()
        {
            if(selftest||IsClient||net.mode!=0)return;
            Checkpoint();
            try{Directory.CreateDirectory(Application.persistentDataPath);string tmp=SavePath+".tmp";File.WriteAllText(tmp,JsonUtility.ToJson(profile,true));
                if(File.Exists(SavePath))File.Copy(SavePath,SavePath+".bak",true);File.Copy(tmp,SavePath,true);File.Delete(tmp);
            }catch(Exception e){Debug.LogError("Save failed: "+e.Message);Toast("저장 실패: "+e.Message);}
        }
        void OnApplicationPause(bool value){if(value)Save();}
        void OnApplicationQuit(){Save();}
        public void Toast(string text){message=text;messageTime=6;}
        public void GoTown(bool save=true)
        {
            inTown=true;deathScreen=false;inventory=false;shots.Clear();texts.Clear();platforms.Clear();actors.Clear();cameraX=0;worldWidth=24;
            AddParty();if(net!=null)net.ReapplyPeers();if(save)Save();
        }
        void AddParty()
        {
            AddFighter(0,profile.job,"방랑자","hero",false,4);
            AddFighter(1,profile.companion1,Rules.Companions[profile.companion1],"healer",false,2.5f);
            AddFighter(2,profile.companion2,Rules.Companions[profile.companion2],"archer",false,1);
        }
        public Fighter AddFighter(int id,int job,string name,string art,bool enemy,float x,bool boss=false)
        {
            var f=new Fighter{id=id,job=job,name=name,art=art,enemy=enemy,x=x,boss=boss,holdX=x,stance=(Stance)profile.stance};
            f.Refresh(enemy?1+region*4+room/5:profile.level);
            if(enemy){f.maxHp=(boss?450:55)+region*65+room*8;f.hp=f.maxHp;f.power=(boss?25:11)+region*5+room;f.armor=boss?15:3;f.range=job==2?8:boss?3:1.6f;}
            actors.Add(f);return f;
        }
        public void BeginRun(int area,int length)
        {
            if(IsClient)return;if(!profile.started){Toast("먼저 첫 직업을 선택하세요.");return;}
            region=Mathf.Clamp(area,0,profile.unlockedRegion);seed=Environment.TickCount&int.MaxValue;
            random=new Random(seed);route=Rules.Route(seed,region,length);room=0;kills=0;inTown=false;deathScreen=false;inventory=false;
            actors.Clear();AddParty();net.ReapplyPeers();EnterRoom();
        }
        public void EnterRoom()
        {
            actors.RemoveAll(a=>a.enemy);shots.Clear();platforms.Clear();texts.Clear();cleared=false;eventResolved=false;order=0;
            worldWidth=42;cameraX=0;nextId=10;
            foreach(var a in actors){a.x=3-a.id*.7f;a.y=0;a.vy=0;a.attackTime=-1;a.resolved=false;a.holdX=a.x;if(!a.Alive){a.hp=a.maxHp*.4f;} }
            if(route[room]==RoomKind.Battle||route[room]==RoomKind.Elite)
            {
                platforms.Add(new Platform(9,2,4));platforms.Add(new Platform(20,2.8f,4));platforms.Add(new Platform(29,1.5f,4));
                int count=3+Math.Min(3,room/4)+(route[room]==RoomKind.Elite?2:0);
                for(int i=0;i<count;i++)AddFighter(nextId++,i%3==2?2:0,i%3==2?"망령 술사":"무덤 파수병","enemy",true,12+i*4);
            }
            if(route[room]==RoomKind.Boss)AddFighter(nextId++,1,"종지기 모르가스","enemy",true,27,true);
            if(route[room]==RoomKind.Event){eventName=Events.Names[random.Next(Events.Names.Length)];cleared=false;}
            if(route[room]==RoomKind.Rest){foreach(var a in actors){a.hp=Mathf.Min(a.maxHp,a.hp+a.maxHp*.4f);a.sp=a.Stats.stamina;a.mp=a.Stats.mana;}cleared=true;Toast("모닥불: 체력 40% 회복. 다음 방으로 가거나 안전하게 귀환할 수 있습니다.");}
            else Toast((room+1)+" / "+route.Length+"  ·  "+RoomName(route[room]));
            Save();
        }
        public static string RoomName(RoomKind k)=>new[]{"전투","기이한 조우","모닥불","정예 전투","지역 보스"}[(int)k];
        public void NextRoom()
        {
            if(IsClient||inTown||!cleared)return;
            if(room==route.Length-1){profile.gold+=80+region*30;profile.shards+=3;profile.runePoints++;if(route.Length==20)profile.unlockedRegion=Math.Min(4,Math.Max(profile.unlockedRegion,region+1));GoTown();Toast("원정 성공! 금화와 룬 특성 포인트를 얻었습니다.");}
            else {room++;EnterRoom();}
        }
        void Update()
        {
            elapsed+=Time.unscaledDeltaTime;messageTime-=Time.unscaledDeltaTime;
            hitStop=Mathf.Max(0,hitStop-Time.unscaledDeltaTime);shake=Mathf.Max(0,shake-Time.unscaledDeltaTime);
            if(Argument("--verify")!=null){RunVerification();return;}
            if(Argument("--netcheck")!=null)NetworkVerification();
            if(!inTown&&!deathScreen&&Argument("--netcheck")==null)ReadInput();
            if(IsClient){net.SendControls(localInput);return;}
            if(!inTown&&!deathScreen&&!paused&&(!inventory||net.mode==1)&&hitStop<=0)
            {
                step+=Mathf.Min(Time.deltaTime,.1f);
                while(step>=1/60f){Tick(1/60f);step-=1/60f;localInput.jump=localInput.attack=localInput.skill=localInput.dodge=false;}
                localInput.jump=localInput.attack=localInput.skill=localInput.dodge=false;
            }
            if(Hero!=null)cameraX=Mathf.Lerp(cameraX,Mathf.Clamp(Hero.x-8,0,worldWidth-24),1-Mathf.Exp(-Time.deltaTime*5));
            for(int i=texts.Count-1;i>=0;i--){texts[i].time-=Time.deltaTime;texts[i].y+=Time.deltaTime*.5f;if(texts[i].time<=0)texts.RemoveAt(i);}
            if(Argument("--smoke")!=null)Smoke();
            if(Argument("--capture")!=null){captureTick++;if(captureTick==360)StartCoroutine(CaptureFrame());}
        }
        void ReadInput()
        {
            if(Input.GetKeyDown(KeyCode.Escape)){inventory=false;showCommands=false;if(net.mode==0)paused=!paused;}
            if(Input.GetKeyDown(KeyCode.I)){inventory=!inventory;}
            if(Input.GetKeyDown(KeyCode.Tab))showCommands=!showCommands;
            if(inventory||paused||showCommands){localInput=default;return;}
            float axis=Input.GetAxisRaw("Horizontal");if(Mathf.Abs(axis)>.05f)localInput.move=axis;else if(!showTouch)localInput.move=0;
            localInput.jump|=Input.GetKeyDown(KeyCode.Space)||Input.GetKeyDown(KeyCode.JoystickButton0);
            localInput.attack|=Input.GetKeyDown(KeyCode.J)||Input.GetKeyDown(KeyCode.JoystickButton2)||!showTouch&&Input.GetMouseButtonDown(0)&&Input.mousePosition.y>155&&Input.mousePosition.y<Screen.height-105;
            localInput.skill|=Input.GetKeyDown(KeyCode.K)||Input.GetKeyDown(KeyCode.JoystickButton3);
            localInput.dodge|=Input.GetKeyDown(KeyCode.LeftShift)||Input.GetKeyDown(KeyCode.JoystickButton1);
            localInput.block=Input.GetKey(KeyCode.L)||Input.GetKey(KeyCode.JoystickButton4);
            if(showTouch)GetComponent<GameView>().ReadTouchControls();
            if(Input.GetKeyDown(KeyCode.H))Drink();
            if(Input.GetKeyDown(KeyCode.E)&&cleared)NextRoom();
            for(int i=0;i<4;i++)if(Input.GetKeyDown(KeyCode.Alpha1+i))Command(i);
        }
        public void Command(int value)
        {
            if(value<0||value>=Rules.Orders.Length)return;
            if(IsClient){Toast("파티 지시는 방장이 내립니다.");return;}
            order=value;foreach(var f in actors.Where(a=>!a.enemy))f.holdX=f.x;
            Toast("파티 명령: "+Rules.Orders[value]);showCommands=false;
        }
        public void Drink()
        {
            if(IsClient||inTown||Hero==null||!Hero.Alive||potions<=0)return;
            potions--;Hero.hp=Mathf.Min(Hero.maxHp,Hero.hp+Hero.maxHp*.45f);Toast("치유 물약 사용 · 남은 수량 "+potions);
        }
        void Tick(float dt)
        {
            foreach(var f in actors.ToArray())
            {
                if(!f.Alive)continue;f.stun=Mathf.Max(0,f.stun-dt);f.invulnerable=Mathf.Max(0,f.invulnerable-dt);f.slow=Mathf.Max(0,f.slow-dt);f.skillCooldown=Mathf.Max(0,f.skillCooldown-dt);
                if(f.burn>0){f.burn-=dt;f.burnTick+=dt;if(f.burnTick>=1){f.burnTick=0;Hurt(f,3,null);}}
                if(f.id==0){var mods=Equipment.Sum(profile);f.maxHp=f.Stats.hp+(profile.level-1)*9+mods.health+Build.vitality*8+profile.vigorRank*5;f.maxSp=f.Stats.stamina+mods.stamina+Build.focus*4;f.maxMp=f.Stats.mana>0?f.Stats.mana+mods.mana+Build.focus*5:0;f.hp=Mathf.Min(f.maxHp,f.hp+mods.regen*dt);}
                f.sp=Mathf.Min(f.maxSp,f.sp+dt*(f.blocking?3:21));f.mp=Mathf.Min(f.maxMp,f.mp+dt*5);
                Controls c=f.id==0?localInput:f.remote?f.input:AI(f,dt);
                if(f.attackTime>=0)AdvanceAttack(f,dt);
                if(f.stun>0)c=default;
                f.blocking=c.block&&f.sp>5&&f.attackTime<0;
                if(c.dodge&&f.sp>=24&&f.attackTime<0){f.sp-=24;f.invulnerable=.32f;f.x+=f.face*2.4f;}
                if(c.jump&&f.grounded){f.vy=8.8f;f.grounded=false;}
                if(c.skill&&f.skillCooldown<=0)Attack(f,true);
                else if(c.attack)Attack(f,false);
                f.move=c.move;
                if(Mathf.Abs(c.move)>.05f&&f.attackTime<0)f.face=c.move>0?1:-1;
                float speed=f.enemy?(f.boss?2.3f:2.1f):f.Stats.speed;
                f.x=Mathf.Clamp(f.x+c.move*speed*dt*(f.attackTime>=0?.2f:1)*(f.slow>0?.5f:1)*(f.blocking?.4f:1),.6f,worldWidth-1);
                float oldY=f.y;f.vy-=22*dt;f.y+=f.vy*dt;f.grounded=false;
                float floor=0;
                foreach(var p in platforms)if(f.x>p.x-.2f&&f.x<p.x+p.width+.2f&&oldY>=p.y-.05f&&f.y<=p.y&&f.vy<=0)floor=Math.Max(floor,p.y);
                if(f.y<=floor){f.y=floor;f.vy=0;f.grounded=true;}
                if(f.remote){f.input.jump=f.input.attack=f.input.skill=f.input.dodge=false;}
            }
            for(int i=shots.Count-1;i>=0;i--)
            {
                var s=shots[i];s.x+=s.dx*dt;s.life-=dt;
                foreach(var a in actors)if(a.Alive&&a.enemy!=s.enemy&&Mathf.Abs(a.x-s.x)<.55f&&s.y>a.y+.15f&&s.y<a.y+a.Height)
                {var owner=actors.Find(f=>f.id==s.owner);Hurt(a,s.damage,owner,s.rune);s.life=0;break;}
                if(s.life<=0)shots.RemoveAt(i);
            }
            if(Hero!=null&&!actors.Any(f=>!f.enemy&&f.Alive)){Die();return;}
            if(!cleared&&route[room]!=RoomKind.Event&&!actors.Any(a=>a.enemy&&a.Alive))
            {cleared=true;Toast("구역 확보 · E 또는 다음 구역 버튼으로 이동");if(route[room]==RoomKind.Boss)Loot(true);}
        }
        Controls AI(Fighter f,float dt)
        {
            var c=new Controls();f.aiTimer-=dt;
            var opponents=actors.Where(a=>a.enemy!=f.enemy&&a.Alive).OrderBy(a=>Mathf.Abs(a.x-f.x)).ToList();
            if(opponents.Count==0){if(!f.enemy&&Hero!=null)c.move=Mathf.Abs(f.x-(Hero.x-f.id))>1?Mathf.Sign(Hero.x-f.id-f.x):0;return c;}
            var t=opponents[0];
            if(!f.enemy&&Hero!=null)
            {
                if(order==(int)Order.Follow||order==(int)Order.Retreat){float d=Hero.x-f.id-f.x;if(Mathf.Abs(d)>3)c.move=Mathf.Sign(d);if(order==(int)Order.Retreat)return c;}
                if(order==(int)Order.Focus)t=opponents.OrderBy(a=>Mathf.Abs(a.x-Hero.x)).First();
                if(order==(int)Order.Interrupt)t=opponents.OrderByDescending(a=>a.job==2).First();
                if(f.job==3&&f.mp>=24&&f.skillCooldown<=0&&actors.Any(a=>!a.enemy&&a.Alive&&a.hp/a.maxHp<(order==(int)Order.Heal?.95f:.55f)))c.skill=true;
                if(order==(int)Order.Protect&&Mathf.Abs(t.x-Hero.x)>4){c.move=Mathf.Abs(f.x-Hero.x)>2?Mathf.Sign(Hero.x-f.x):0;return c;}
                if(order==(int)Order.Hold){c.move=Mathf.Abs(f.x-f.holdX)>.3f?Mathf.Sign(f.holdX-f.x):0;}
            }
            float dist=Mathf.Abs(t.x-f.x);f.face=t.x>=f.x?1:-1;
            float desired=f.range>.1f?f.range*.75f:1;
            bool hold=!f.enemy&&order==(int)Order.Hold;
            if(dist>desired&&!hold)c.move=f.face;
            else if(dist<2.3f&&f.range>4&&!hold)c.move=-f.face;
            if(dist<=f.range+.2f&&Mathf.Abs(t.y-f.y)<2.4f&&f.aiTimer<=0){c.attack=true;f.aiTimer=f.enemy?(f.boss?1.3f:1.6f):.45f;}
            if(!f.enemy&&order==(int)Order.Burst&&f.job!=3&&f.skillCooldown<=0&&dist<f.range+1)c.skill=true;
            if(!f.enemy&&order==(int)Order.Conserve){c.skill=false;if(f.sp<f.Stats.stamina*.4f)c.attack=false;}
            if(!f.enemy&&order==(int)Order.Spread&&Hero!=null&&Mathf.Abs(f.x-Hero.x)<3)c.move=f.id==1?-1:1;
            if(!f.enemy&&f.stance==Stance.Aggressive&&f.job!=3&&dist<f.range+.5f&&f.sp>f.maxSp*.4f)c.skill=true;
            if(!f.enemy&&f.stance==Stance.Support){if(f.job==3&&actors.Any(a=>!a.enemy&&a.Alive&&a.hp<a.maxHp*.8f))c.skill=true;if(Hero!=null&&dist>4&&Mathf.Abs(f.x-Hero.x)>3)c.move=Mathf.Sign(Hero.x-f.x);}
            if(f.stance==Stance.Defensive&&!f.enemy&&f.hp<f.maxHp*.35f){c.block=true;if(dist<3)c.move=-f.face;}
            if(t.y>f.y+1&&f.grounded)c.jump=true;
            if(f.boss&&f.hp<f.maxHp*.5f){f.phase=1;if(f.skillCooldown<=0){c.skill=true;}}
            return c;
        }
        void Attack(Fighter f,bool skill)
        {
            if(!f.Alive||f.attackTime>=0||f.stun>0)return;
            float sp=skill?25:8,mp=0;
            if(f.job==2||f.job==3){sp=skill?12:4;mp=skill?24:6;}
            if(f.job==4){sp=skill?16:8;mp=skill?18:0;}
            if(!f.enemy&&f.id==0){var mods=Equipment.Sum(profile);sp*=RuneCost*(1-mods.cost);mp*=RuneCost*(1-mods.cost);}
            if(!f.enemy&&(f.sp<sp||f.mp<mp))return;
            f.sp-=sp;f.mp-=mp;f.attackTime=0;f.resolved=false;f.skillAttack=skill;
            if(skill&&f.id==0)sound?.Play(f.job==3?2:1);
            if(skill)f.skillCooldown=(f.boss?4:5)*(f.id==0?(1-Equipment.Sum(profile).cooldown)*(1-Build.skillSpeed*.06f):1);
        }
        void AdvanceAttack(Fighter f,float dt)
        {
            f.attackTime+=dt*(f.id==0?1+Equipment.Sum(profile).haste:1);float wind=f.boss?.75f:f.enemy?.48f:f.Stats.windup;
            if(f.attackTime>=wind&&!f.resolved)
            {
                f.resolved=true;
                if(f.skillAttack&&f.job==3&&!f.enemy)
                {foreach(var a in actors.Where(a=>!a.enemy&&a.Alive&&Mathf.Abs(a.x-f.x)<8)){a.hp=Mathf.Min(a.maxHp,a.hp+(38+profile.level*2+(f.id==0?Build.skillHealing*3:0))*(f.id==0?1+Build.skillPower*.12f:1));Float(a,"치유",new Color(.4f,1,.7f));}}
                else
                {
                    float damage=f.power*(f.skillAttack?1.9f:1);int rune=-1;
                    if(f.id==0){damage+=Build.strength*1.5f;if(profile.weapon>=0&&profile.weapon<profile.bag.Count)damage+=profile.bag[profile.weapon].Attack;damage*=1+profile.runeRank*.025f;rune=profile.rune;damage*=RuneDamage;if(f.skillAttack){damage*=1+Build.skillPower*.12f;f.hp=Mathf.Min(f.maxHp,f.hp+Build.skillHealing*3);}}
                    if(f.range>4)
                    {shots.Add(new Missile{owner=f.id,x=f.x+f.face*.6f,y=f.y+1.2f,dx=f.face*13,damage=damage,enemy=f.enemy,rune=rune});}
                    else foreach(var t in actors.ToArray())
                        if(t.Alive&&t.enemy!=f.enemy&&t.y<f.y+f.Height&&t.y+t.Height>f.y+.4f&&Mathf.Abs(t.x-f.x)<f.range+(f.skillAttack?1:.1f)&&(t.x-f.x)*f.face>-.4f)
                            Hurt(t,damage,f,rune);
                }
            }
            if(f.attackTime>=wind+(f.boss?.5f:f.Stats.recovery))f.attackTime=-1;
        }
        public void Hurt(Fighter target,float raw,Fighter source,int rune=-1)
        {
            if(!target.Alive||target.invulnerable>0)return;
            float armor=target.armor;if(target.id==0&&profile.armor>=0&&profile.armor<profile.bag.Count)armor+=profile.bag[profile.armor].Defense;
            var offense=source!=null&&source.id==0?Equipment.Sum(profile):new Modifiers();var defense=target.id==0?Equipment.Sum(profile):new Modifiers();
            if(target.blocking&&target.sp>=12&&(source==null||(source.x-target.x)*target.face>0)){raw*=.25f*(1-defense.guard);target.sp-=12;}
            var result=Equipment.ComputeDamage(raw,armor,offense,defense,source!=null&&(source.job==2||source.job==3),target.boss,target.hp/target.maxHp<.3f,random.NextDouble());
            float damage=result.total;target.hp=Mathf.Max(0,target.hp-damage);target.stun=(target.boss?.04f:.15f)*(1+offense.stagger);target.invulnerable=.1f;
            if(source!=null&&!source.enemy){hitStop=source.skillAttack?.05f:.025f;shake=source.skillAttack?.12f:.06f;sound?.Play(0);}
            if(source!=null){source.hp=Mathf.Min(source.maxHp,source.hp+damage*offense.leech);if(offense.fire>0)target.burn=3;if(offense.ice>0)target.slow=2;}
            if(!target.boss&&source!=null&&!source.enemy&&order==(int)Order.Interrupt){target.attackTime=-1;target.stun=.5f;}
            if(source!=null){target.x=Mathf.Clamp(target.x+source.face*(target.boss?.06f:.2f),.6f,worldWidth-1);}
            if(rune>=0&&source!=null)
            {
                var r=Rules.Runes[rune];source.hp=Mathf.Min(source.maxHp,source.hp+damage*r.lifesteal);if(r.slow>0)target.slow=2;if(r.burn>0)target.burn=3;
                if(r.chain>0){var other=actors.FirstOrDefault(a=>a!=target&&a.enemy==target.enemy&&a.Alive&&Mathf.Abs(a.x-target.x)<4);if(other!=null)Hurt(other,damage*r.chain,null);}
                if(source.id==0&&profile.rune2>=0){var support=Rules.Runes[profile.rune2];source.hp=Mathf.Min(source.maxHp,source.hp+damage*support.lifesteal);if(support.slow>0)target.slow=2;if(support.burn>0)target.burn=3;if(support.chain>0){var other=actors.FirstOrDefault(a=>a!=target&&a.enemy==target.enemy&&a.Alive&&Mathf.Abs(a.x-target.x)<4);if(other!=null)Hurt(other,damage*support.chain,null);}}
            }
            Float(target,(result.critical?"치명 ":"")+Mathf.CeilToInt(damage),target.enemy?new Color(1,.8f,.4f):new Color(1,.4f,.4f));
            if(!target.Alive&&target.enemy){kills++;profile.xp+=18+region*6;profile.gold+=5+region*3;if(random.NextDouble()<.45)Loot(false);
                if(profile.xp>=Rules.RequiredXp(profile.level)){profile.xp-=Rules.RequiredXp(profile.level);profile.level++;foreach(var a in actors.Where(a=>!a.enemy)){a.maxHp+=9;a.hp=Mathf.Min(a.maxHp,a.hp+25);a.power+=2;}Toast("레벨 "+profile.level+" 달성 · 체력과 공격력이 증가했습니다.");}}
        }
        void Float(Fighter f,string text,Color c){texts.Add(new FloatingText{x=f.x,y=f.y+2.4f,text=text,color=c});}
        void Loot(bool boss)
        {if(profile.bag.Count>=24){profile.shards++;return;}var g=Rules.Drop(random,region,room+1,boss);profile.bag.Add(g);Toast(g.name+" 획득 · I로 장비 확인");}
        void Die()
        {
            deathScreen=true;var lost=Rules.OnDeath(profile,random);Toast("원정 실패 · 레벨 초기화 · 장비 "+lost.Count+"개 손실. 회수 장비는 수리가 필요합니다.");Save();
        }
        public void ResolveEvent(int choice)
        {
            if(IsClient||eventResolved||inTown||route[room]!=RoomKind.Event)return;
            if(Events.Resolve(this,eventName,choice)){eventResolved=true;cleared=true;Save();}
        }
        public bool Spend(int gold){if(profile.gold<gold){Toast("금화가 부족합니다.");return false;}profile.gold-=gold;return true;}
        public void ChangeJob(int job){if(Rules.ChangeJob(profile,job,inTown)){profile.started=true;if(profile.weapon>=0&&profile.weapon<profile.bag.Count&&!Equipment.CanEquip(profile.bag[profile.weapon],job))profile.weapon=-1;GoTown();Toast(Rules.Jobs[job].name+"로 전직했습니다.");}}
        public void Equip(int index)
        {if(index<0||index>=profile.bag.Count)return;if(!Equipment.CanEquip(profile.bag[index],profile.job)){Toast("현재 직업에 맞지 않는 무기입니다.");return;}if(profile.bag[index].slot=="weapon")profile.weapon=index;else profile.armor=index;Save();}
        public void RepairAll(){int price=profile.bag.Sum(g=>g.RepairCost);if(inTown&&Spend(price)){foreach(var g in profile.bag)g.durability=100;Save();Toast("장비 수리 완료");}}
        public void Upgrade(int i){if(inTown&&i>=0&&i<profile.bag.Count&&profile.bag[i].upgrade<5&&Spend(Rules.UpgradeCost(profile.bag[i]))){profile.bag[i].upgrade++;Save();}}
        public void Craft(){if(inTown&&Spend(65)){if(profile.bag.Count>=24){profile.gold+=65;Toast("가방이 가득 찼습니다.");return;}profile.bag.Add(Rules.Drop(random,profile.unlockedRegion,4,true));Save();Toast("새 장비를 제작했습니다.");}}
        public void BuyPotion(){if(inTown&&potions<9&&Spend(18)){potions++;Save();}}
        public void LearnRune(){if(inTown&&profile.runePoints>0&&profile.runeRank<20){profile.runePoints--;profile.runeRank++;Save();Toast("영구 룬 특성: 피해 +"+(profile.runeRank*2.5f)+"%");}}
        void Smoke()
        {
            testTick++;if(testTick==30){Hero.hp=999;Hero.maxHp=999;}
            if(testTick>30&&testTick<650){localInput.move=1;localInput.attack=true;localInput.skill=true;}
            if(testTick==650){foreach(var a in actors.Where(a=>a.enemy))a.hp=0;cleared=true;NextRoom();ResolveEvent(2);NextRoom();NextRoom();}
            if(testTick==700){foreach(var a in actors.Where(a=>a.enemy))a.hp=0;cleared=true;NextRoom();}
            if(testTick==760){foreach(var a in actors.Where(a=>a.enemy))a.hp=0;cleared=true;NextRoom();}
            if(testTick>800){string output=Argument("--smoke");File.WriteAllText(output,JsonUtility.ToJson(new SmokeResult{passed=inTown,actors=actors.Count,level=profile.level,runePoints=profile.runePoints}));Application.Quit(inTown?0:3);}
        }
        [Serializable]class SmokeResult{public bool passed;public int actors,level,runePoints;}
    }
    public static class Events
    {
        public static readonly string[] Names={"금이 간 성소","길 잃은 연금술사","봉인된 군수 상자","잿빛 계약자","수몰된 기록실","부상당한 순례자"};
        public static string Description(string name)
        {switch(name){case "금이 간 성소":return "온기가 남은 제단. 금화 25로 전원 회복 / 체력 20%를 바쳐 룬 조각 2개 / 떠난다.";
          case "길 잃은 연금술사":return "물약 2개를 금화 20에 구매 / 실험약: 50% 전원 회복, 50% 체력 25% 손실 / 떠난다.";
          case "봉인된 군수 상자":return "금화 30으로 안전 개봉 / 강제 개봉: 60% 장비, 40% 전원 체력 20% 손실 / 떠난다.";
          case "잿빛 계약자":return "금화 40으로 룬 조각 3개 / 체력 30%를 바쳐 희귀 장비 / 떠난다.";
          case "수몰된 기록실":return "금화 20으로 룬 조각 2개 / 탐색: 경험치 40, 체력 15% 손실 / 떠난다.";
          default:return "물약 1개를 주고 금화 40 / 금화 15를 주고 룬 조각 2개 / 떠난다.";}}
        public static bool Resolve(GameSession g,string name,int choice)
        {
            if(choice==2){g.Toast("조우를 지나쳤습니다.");return true;}var p=g.profile;var rng=new Random(g.seed+g.room*17+choice);bool paid=false;
            Action<float> damage=f=>{foreach(var a in g.actors.Where(a=>!a.enemy&&a.Alive))a.hp=Mathf.Max(1,a.hp-a.maxHp*f);};
            Action heal=()=>{foreach(var a in g.actors.Where(a=>!a.enemy&&a.Alive))a.hp=a.maxHp;};
            Action loot=()=>{if(p.bag.Count<24)p.bag.Add(Rules.Drop(rng,g.region,g.room,true));else p.shards+=2;};
            switch(name)
            {
                case "금이 간 성소":if(choice==0){if(!g.Spend(25))return false;heal();}else{damage(.2f);p.shards+=2;}break;
                case "길 잃은 연금술사":if(choice==0){if(!g.Spend(20))return false;g.potions=Math.Min(9,g.potions+2);}else{if(rng.Next(2)==0)heal();else damage(.25f);}break;
                case "봉인된 군수 상자":if(choice==0){if(!g.Spend(30))return false;loot();}else if(rng.NextDouble()<.6)loot();else damage(.2f);break;
                case "잿빛 계약자":if(choice==0){if(!g.Spend(40))return false;p.shards+=3;}else{damage(.3f);loot();}break;
                case "수몰된 기록실":if(choice==0){if(!g.Spend(20))return false;p.shards+=2;}else{damage(.15f);p.xp+=40;}break;
                default:if(choice==0){if(g.potions<=0){g.Toast("물약이 부족합니다.");return false;}g.potions--;p.gold+=40;}else{if(!g.Spend(15))return false;p.shards+=2;}break;
            }
            g.Toast("선택의 결과가 적용되었습니다.");return true;
        }
    }
}
