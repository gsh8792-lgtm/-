using System;
using System.Collections.Generic;
using System.Linq;

namespace AshenOath
{
    public enum Job { Knight, Warrior, Mage, Healer, Archer, Rogue }
    public enum Order { Follow, Hold, Focus, Protect, Retreat, Heal, Burst, Conserve, Spread, Interrupt }
    public enum Stance { Balanced, Aggressive, Defensive, Support }
    public enum Rarity { D, C, B, A, S, SS, SSS, R, UR, L }
    public enum RoomKind { Battle, Event, Rest, Elite, Boss }
    [Serializable] public sealed class JobStats
    {
        public string name; public float hp, stamina, mana, power, armor, speed, range, windup, recovery;
        public JobStats(string n,float h,float s,float m,float p,float a,float v,float r,float w,float c)
        { name=n;hp=h;stamina=s;mana=m;power=p;armor=a;speed=v;range=r;windup=w;recovery=c; }
    }
    [Serializable] public sealed class Gear
    {
        public string id, name, slot, affix, template, kind; public int tier, rarity, upgrade; public float power, armor, durability=100;
        public List<AffixRoll> affixes=new List<AffixRoll>();
        public bool secured;
        public float Efficiency => durability<=0 ? .35f : durability<30 ? .7f : 1;
        public float Attack => power*(1+upgrade*.06f)*Efficiency;
        public float Defense => armor*(1+upgrade*.06f)*Efficiency;
        public int RepairCost => (int)Math.Ceiling((100-durability)*(.15f+tier*.06f));
    }
    [Serializable] public sealed class Profile
    {
        public int version=1, job, level=1, xp, gold=120, shards, runePoints=1, runeRank, unlockedRegion, deaths;
        public int weapon=0, armor=1, rune=0, stance;
        public int potions=3,companion1=3,companion2=4;
        public int rune2=-1,vigorRank,insightRank;
        public JobBuild[] builds=Enumerable.Range(0,6).Select(i=>new JobBuild()).ToArray();
        public ExpeditionCheckpoint checkpoint;
        public bool started;
        public List<Gear> bag=new List<Gear>();
        public List<Gear> stash=new List<Gear>();
        public List<int> traits=new List<int>();
    }
    [Serializable] public sealed class Rune
    {
        public string name, description; public float damage=1, cost=1, lifesteal, slow, burn, chain;
        public Rune(string n,string d,float dmg=1,float c=1,float leech=0,float ice=0,float fire=0,float bounce=0)
        {name=n;description=d;damage=dmg;cost=c;lifesteal=leech;slow=ice;burn=fire;chain=bounce;}
    }
    public static class Rules
    {
        public static readonly JobStats[] Jobs={
            new JobStats("기사",155,115,0,19,15,4.3f,1.8f,.22f,.34f),
            new JobStats("양손전사",140,130,0,28,9,4.0f,2.5f,.38f,.48f),
            new JobStats("마법사",85,80,145,25,3,4.4f,8,.35f,.4f),
            new JobStats("힐러",100,85,135,16,6,4.3f,7,.3f,.4f),
            new JobStats("궁수",105,105,85,19,6,4.8f,9,.2f,.32f),
            new JobStats("도적",100,140,0,16,5,5.5f,1.5f,.12f,.22f)};
        public static readonly Rune[] Runes={
            new Rune("강철의 맹세","기본 피해 +15%, 자원 소모 +10%",1.15f,1.1f),
            new Rune("불씨","적에게 3초간 화상, 피해 -10%",.9f,1.1f,fire:3),
            new Rune("서리 사슬","명중 시 2초 둔화, 피해 -5%",.95f,1.12f,ice:.45f),
            new Rune("핏빛 귀환","가한 피해의 8% 회복, 피해 -15%",.85f,1.1f,leech:.08f),
            new Rune("연쇄 번개","가까운 두 번째 적에게 35% 피해",.95f,1.3f,bounce:.35f),
            new Rune("절제","피해 -10%, 자원 소모 -30%",.9f,.7f),
            new Rune("거인의 일격","피해 +35%, 자원 소모 +50%",1.35f,1.5f),
            new Rune("황혼의 송곳니","피해 +20%, 명중 시 3% 회복",1.2f,1.4f,leech:.03f),
            new Rune("겨울 불꽃","화상과 둔화, 피해 -20%",.8f,1.4f,ice:.25f,fire:2),
            new Rune("메아리","연쇄 피해 60%, 주 대상 피해 -20%",.8f,1.3f,bounce:.6f),
            new Rune("순례자의 숨","자원 소모 -45%, 피해 -25%",.75f,.55f),
            new Rune("잿빛 계약","피해 +50%, 자원 소모 +80%",1.5f,1.8f)};
        public static readonly string[] Regions={"잿빛 수도원","가시달 숲","침몰한 왕릉","유리불 화산","별 없는 성채"};
        public static readonly string[] Companions={"엘리안","브린힐드","이세라","세라핀","리안나","니크스"};
        public static readonly string[] Orders={"집결","위치 사수","집중 공격","주인공 보호","후퇴","긴급 치유","총공세","자원 절약","산개","시전 차단"};
        public static Profile NewProfile()
        {
            var p=new Profile();
            p.bag.Add(new Gear{id="starter-weapon",name="견습의 강철 무기",slot="weapon",power=5,secured=true});
            p.bag.Add(new Gear{id="starter-armor",name="여행자의 갑옷",slot="armor",armor=5,secured=true});return p;
        }
        public static float Damage(float raw,float armor) => Math.Max(1,raw*100/(100+Math.Max(0,armor)));
        public static int RequiredXp(int level) => 35+level*20;
        public static RoomKind[] Route(int seed,int region,int length=20)
        {
            if(length<2 || length>20) throw new ArgumentOutOfRangeException(nameof(length));
            var random=new Random(seed+region*997);var rooms=new RoomKind[length];
            for(int i=0;i<length;i++) rooms[i]=i==0?RoomKind.Battle:random.NextDouble()<.24?RoomKind.Event:RoomKind.Battle;
            for(int i=4;i<length-1;i+=5) rooms[i]=RoomKind.Rest;
            if(length>10){rooms[8]=RoomKind.Elite;rooms[13]=RoomKind.Elite;}
            if(length==5) {rooms[1]=RoomKind.Event;rooms[2]=RoomKind.Rest;rooms[3]=RoomKind.Elite;}
            rooms[length-1]=RoomKind.Boss;return rooms;
        }
        public static Gear Drop(Random random,int region,int floor,bool boss=false)
        {
            int rarity=Equipment.RollGrade(random,region,boss);int level=1+region*10+floor/2;
            if(random.NextDouble()<.7)return Equipment.Create(random,rarity,random.Next(5),level);
            var gear=new Gear{id=Guid.NewGuid().ToString("N"),name=Equipment.Names[rarity]+"의 서약 갑옷",slot="armor",tier=level,rarity=rarity,armor=(5+level*.5f)*Equipment.Growth[rarity],durability=100};
            Equipment.RollAffixes(random,gear);return gear;
        }
        public static List<Gear> OnDeath(Profile p,Random random)
        {
            var kept=p.bag.Where(g=>g.secured).Take(2).ToList();
            var rest=p.bag.Where(g=>!kept.Contains(g)).ToList();if(rest.Count>0)kept.Add(rest[random.Next(rest.Count)]);
            var lost=p.bag.Where(g=>!kept.Contains(g)).ToList();
            foreach(var g in kept)g.durability=Math.Max(5,g.durability-65);
            p.bag=kept;p.level=1;p.xp=0;p.deaths++;p.gold=(int)(p.gold*.7f);
            p.builds=Enumerable.Range(0,6).Select(i=>new JobBuild()).ToArray();p.checkpoint=null;
            p.weapon=p.bag.FindIndex(g=>g.slot=="weapon");p.armor=p.bag.FindIndex(g=>g.slot=="armor");
            return lost;
        }
        public static bool ChangeJob(Profile p,int job,bool inTown)
        {if(!inTown || job<0 || job>=Jobs.Length)return false;p.job=job;return true;}
        public static bool ToggleSecure(Profile p,Gear item)
        {if(item.secured){item.secured=false;return true;}if(p.bag.Count(g=>g.secured)>=2)return false;item.secured=true;return true;}
        public static int UpgradeCost(Gear g) => 35+g.upgrade*30+g.tier*15;
    }
}
