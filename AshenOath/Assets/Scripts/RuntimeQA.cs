using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;

namespace AshenOath
{
    public sealed partial class GameSession
    {
        IEnumerator CaptureFrame()
        {
            yield return new WaitForEndOfFrame();
            string path=Path.GetFullPath(Argument("--capture"));
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            var texture=ScreenCapture.CaptureScreenshotAsTexture();
            if(texture==null){Debug.LogError("Capture texture unavailable");Application.Quit(4);yield break;}
            File.WriteAllBytes(path,texture.EncodeToPNG());Destroy(texture);
            Debug.Log("CAPTURE SAVED: "+path);Application.Quit();
        }
        [Serializable]class VerificationResult {public bool passed;public int checks;public string error;public List<string> cases=new List<string>();}
        void RunVerification()
        {
            var result=new VerificationResult();
            Action<bool,string> check=(ok,label)=>{result.checks++;if(!ok)throw new Exception(label);result.cases.Add(label);};
            try
            {
                profile=Rules.NewProfile();profile.started=true;BeginRun(0,5);actors.Clear();platforms.Clear();
                var hero=AddFighter(0,0,"test","hero",false,5);var enemy=AddFighter(10,0,"target","enemy",true,6);
                float hp=enemy.hp,sp=hero.sp;Attack(hero,false);check(hero.sp<sp,"attack consumes stamina");
                AdvanceAttack(hero,.1f);check(enemy.hp==hp,"windup does not hit early");
                AdvanceAttack(hero,.13f);check(enemy.hp<hp,"active attack applies damage");
                hp=enemy.hp;AdvanceAttack(hero,.06f);check(enemy.hp==hp,"one hit per attack target");
                AdvanceAttack(hero,1);check(hero.attackTime<0,"recovery unlocks controls");
                enemy.invulnerable=0;enemy.x=3;hero.face=1;hp=enemy.hp;Attack(hero,false);AdvanceAttack(hero,.23f);check(enemy.hp==hp,"forward attack misses behind");
                hero.attackTime=-1;hero.stun=0;hero.invulnerable=.3f;hp=hero.hp;Hurt(hero,999,enemy);check(hero.hp==hp,"dodge invulnerability blocks damage");
                hero.invulnerable=0;hero.blocking=true;hero.face=-1;hero.sp=100;hp=hero.hp;Hurt(hero,40,enemy);check(hp-hero.hp<12&&hero.sp==88,"directional block reduces damage and spends stamina");
                foreach(int job in new[]{0,1,5}){hero.job=job;hero.Refresh();hero.attackTime=-1;hero.stun=0;Attack(hero,true);check(hero.mp==0&&hero.sp<hero.maxSp,"stamina-only skill "+job);}
                foreach(int job in new[]{2,3,4}){hero.job=job;hero.Refresh();hero.attackTime=-1;hero.stun=0;Attack(hero,true);check(hero.mp<hero.maxMp&&hero.sp<hero.maxSp,"hybrid skill consumes both resources "+job);}
                hero.job=2;hero.Refresh();hero.attackTime=-1;hero.stun=0;hero.face=1;enemy.x=8;enemy.hp=enemy.maxHp;enemy.invulnerable=0;
                Attack(hero,false);AdvanceAttack(hero,.36f);check(shots.Count==1,"ranged windup creates projectile");
                hp=enemy.hp;localInput=default;for(int i=0;i<20;i++)Tick(1/60f);check(enemy.hp<hp,"projectile collides with target");
                actors.RemoveAll(a=>a.enemy);hero.job=3;hero.Refresh();hero.hp=30;hero.attackTime=-1;hero.stun=0;Attack(hero,true);AdvanceAttack(hero,.31f);check(hero.hp>30,"healer skill restores health");
                hero.sp=0;hero.mp=0;hero.attackTime=-1;Attack(hero,true);check(hero.attackTime<0,"insufficient resource rejects attack");
                GoTown(false);potions=5;BeginRun(0,5);check(potions==5,"purchased potions survive departure");
                profile.companion1=1;profile.companion2=5;GoTown(false);check(actors[1].job==1&&actors[2].job==5,"party choices persist between runs");
                profile.level=8;profile.runeRank=4;profile.runePoints=3;profile.stash.Add(new Gear{id="vault"});Rules.OnDeath(profile,new System.Random(1));
                check(profile.level==1&&profile.runeRank==4&&profile.runePoints==3&&profile.stash.Count==1,"death resets level and preserves permanent progression");
                foreach(var name in Events.Names){BeginRun(0,5);room=1;eventName=name;profile.gold=200;potions=3;ResolveEvent(0);check(eventResolved&&cleared,"event resolves: "+name);}
                GoTown(false);profile.gold=999;profile.bag[0].durability=35;RepairAll();check(profile.bag[0].durability==100,"blacksmith repairs recovered equipment");
                int u=profile.bag[0].upgrade;Upgrade(0);check(profile.bag[0].upgrade==u+1,"blacksmith enhancement applies");
                float defenseBefore=profile.bag[1].Defense;Upgrade(1);check(profile.bag[1].Defense>defenseBefore,"armor enhancement increases actual defense");
                string serialized=JsonUtility.ToJson(profile);var restored=JsonUtility.FromJson<Profile>(serialized);check(restored.potions==potions&&restored.bag[0].upgrade==profile.bag[0].upgrade,"save round trip preserves consumables and gear");
                profile.level=5;Allocate(0);Allocate(1);TrainSkill(0);check(Build.strength==1&&Build.vitality==1&&Build.skillPower==1,"stat and skill allocation applies");
                int strength=Build.strength;profile.job=1;check(Build.strength==0,"new class has separate allocation");profile.job=0;check(Build.strength==strength,"previous class restores allocation");
                profile.rune=1;profile.rune2=2;check(Math.Abs(RuneDamage-.855f)<.001&&RuneCost>1.2f,"dual runes multiply costs and damage");
                profile.runePoints=3;LearnTrait(1);LearnTrait(2);check(profile.vigorRank==1&&profile.insightRank==1,"permanent trait branches apply");
                BeginRun(0,5);Hero.x=7;Hero.hp=61;room=1;eventName=Events.Names[0];Checkpoint();serialized=JsonUtility.ToJson(profile);profile=JsonUtility.FromJson<Profile>(serialized);GoTown(false);RestoreCheckpoint();check(!inTown&&room==1&&Hero.hp==61&&Hero.x==7&&eventName==Events.Names[0],"expedition checkpoint restores actors and event");
                Rules.OnDeath(profile,new System.Random(44));check(profile.vigorRank==1&&profile.insightRank==1&&profile.builds.All(x=>x.StatSpent==0&&x.SkillSpent==0)&&profile.checkpoint==null,"death preserves traits but clears class allocations and checkpoint");
                for(int job=0;job<6;job++)
                {
                    profile=Rules.NewProfile();profile.job=job;profile.started=true;BeginRun(0,5);random=new System.Random(444+job);int simulationTicks=0;
                    while(!inTown&&!deathScreen&&simulationTicks++<18000)
                    {
                        order=(int)Order.Burst;localInput=AI(Hero,1/60f);Tick(1/60f);
                        if(Hero.Alive&&Hero.hp<Hero.maxHp*.3f)Drink();
                        if(route[room]==RoomKind.Event&&!eventResolved)ResolveEvent(2);
                        if(cleared)NextRoom();
                    }
                    check(inTown&&!deathScreen&&kills>=9,"five-room expedition, legal AI inputs; class="+job+", ticks="+simulationTicks+", kills="+kills);
                }
                result.passed=true;
            }
            catch(Exception e){result.error=e.ToString();Debug.LogException(e);}
            var path=Path.GetFullPath(Argument("--verify"));Directory.CreateDirectory(Path.GetDirectoryName(path));File.WriteAllText(path,JsonUtility.ToJson(result,true));Application.Quit(result.passed?0:3);
        }
        int maxRemote,maxPlatforms;float minNetworkX=999,maxNetworkX=-999;bool networkRunStarted;
        void NetworkVerification()
        {
            if(net.mode==1&&elapsed>3&&!networkRunStarted){networkRunStarted=true;BeginRun(0,5);foreach(var a in actors)a.hp=a.maxHp=10000;}
            maxRemote=Math.Max(maxRemote,actors.Count(a=>a.remote));maxPlatforms=Math.Max(maxPlatforms,platforms.Count);
            if(!inTown&&Hero!=null){minNetworkX=Math.Min(minNetworkX,Hero.x);maxNetworkX=Math.Max(maxNetworkX,Hero.x);localInput.move=elapsed<10?1:-1;localInput.attack=true;localInput.jump=(int)(elapsed*4)%8==0;}
            if(IsClient)net.SendControls(localInput);
            if(elapsed>18){bool passed=maxRemote==2&&maxPlatforms==3&&(net.mode==1||net.localId>0)&&maxNetworkX-minNetworkX>1;
                string path=Path.GetFullPath(Argument("--netcheck"));File.WriteAllText(path,"{\"passed\":"+passed.ToString().ToLower()+",\"mode\":"+net.mode+",\"localId\":"+net.localId+",\"remotePlayers\":"+maxRemote+",\"platforms\":"+maxPlatforms+",\"movement\":"+(maxNetworkX-minNetworkX).ToString("0.00",System.Globalization.CultureInfo.InvariantCulture)+"}");Application.Quit(passed?0:3);}
        }
    }
}
