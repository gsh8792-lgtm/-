using System;
using System.Collections.Generic;
using System.Linq;

namespace AshenOath
{
    [Serializable] public sealed class AffixRoll {public string id;public float value;}
    [Serializable] public sealed class EquipmentTemplate
    {public string id,name,kind;public int grade;public int[] jobs;public float basePower;}
    [Serializable] public sealed class Modifiers
    {
        public float power,physical,magic,crit=.05f,critDamage=1.5f,penetration,fire,ice,lightning;
        public float resist,health,stamina,mana,cost,cooldown,haste,leech,stagger,elite,execute,guard,regen;
    }
    public struct DamageResult {public float total,physical,elemental;public bool critical;}
    public static class Equipment
    {
        public static readonly string[] Grades={"D","C","B","A","S","SS","SSS","R","UR","L"};
        public static readonly float[] Growth={1,1.14f,1.30f,1.49f,1.70f,1.94f,2.21f,2.52f,2.87f,3.27f};
        public static readonly int[] AffixCounts={0,1,2,2,3,3,4,4,5,5};
        public static readonly string[] Names={"견습","정련","수호자","영웅","왕실","성좌","심연","태고","초월","창세"};
        public static readonly string[] KindNames={"한손검","양손검","마도구","활","쌍검"};
        public static readonly string[] Kinds={"sword","greatsword","focus","bow","daggers"};
        public static readonly string[] AffixIds={"power","physical","magic","crit","critDamage","penetration","fire","ice","lightning","resist","health","stamina","mana","cost","cooldown","haste","leech","stagger","elite","execute","guard","regen"};
        public static readonly string[] AffixNames={"공격력","물리 피해","마법 피해","치명타 확률","치명타 피해","방어 관통","화염 추가 피해","냉기 추가 피해","번개 추가 피해","속성 저항","최대 체력","최대 기력","최대 마나","자원 소모 감소","재사용 대기시간 감소","공격 속도","흡혈","경직 지속","정예·보스 피해","처형 피해","방어 효율","초당 체력 회복"};
        // Per-region weights: rare grades are unlocked through region progression, never sold.
        public static readonly int[][] Weights={new[]{5800,2800,1050,300,50,0,0,0,0,0},new[]{3000,3300,2300,1050,300,50,0,0,0,0},new[]{1200,2400,2800,2100,1050,350,90,10,0,0},new[]{400,1200,2300,2600,2000,1000,380,100,20,0},new[]{100,500,1200,2200,2600,1800,1000,430,150,20}};
        public static readonly EquipmentTemplate[] Catalog=BuildCatalog();
        static EquipmentTemplate[] BuildCatalog()
        {
            var list=new List<EquipmentTemplate>();float[] basis={8,12,10,8,6};int[][] jobs={new[]{0},new[]{1},new[]{2,3},new[]{4},new[]{5}};
            for(int grade=0;grade<10;grade++)for(int kind=0;kind<5;kind++)list.Add(new EquipmentTemplate{id=Grades[grade]+"_"+Kinds[kind],grade=grade,kind=Kinds[kind],name=Names[grade]+"의 "+KindNames[kind],jobs=jobs[kind],basePower=basis[kind]*Growth[grade]});
            return list.ToArray();
        }
        public static int RollGrade(Random rng,int region,bool boss)
        {
            int[] weights=Weights[Math.Max(0,Math.Min(4,region))];int roll=rng.Next(weights.Sum()),sum=0,grade=0;
            for(int i=0;i<10;i++){sum+=weights[i];if(roll<sum){grade=i;break;}}
            return boss?Math.Max(2,grade):grade;
        }
        public static Gear Create(Random rng,int grade,int kind,int itemLevel)
        {
            grade=Math.Max(0,Math.Min(9,grade));kind=Math.Max(0,Math.Min(4,kind));var t=Catalog[grade*5+kind];
            var g=new Gear{id=Guid.NewGuid().ToString("N"),name=t.name,template=t.id,kind=t.kind,slot="weapon",tier=Math.Max(1,itemLevel),rarity=grade,power=t.basePower*(1+Math.Min(60,itemLevel)*.025f),durability=100,affixes=new List<AffixRoll>()};
            RollAffixes(rng,g);return g;
        }
        public static void RollAffixes(Random rng,Gear g)
        {
            g.affixes=new List<AffixRoll>();var pool=AffixIds.ToList();
            if(g.slot=="weapon")pool.RemoveAll(x=>x=="guard"||x=="resist");
            if(g.kind=="focus")pool.Remove("physical");else if(g.slot=="weapon")pool.Remove("magic");
            float budget=1+g.rarity*.18f;
            for(int i=0;i<AffixCounts[g.rarity]&&pool.Count>0;i++)
            {
                int index=rng.Next(pool.Count);string id=pool[index];pool.RemoveAt(index);
                float roll=(.75f+(float)rng.NextDouble()*.5f)*budget;
                float basis=id=="health"?12:id=="stamina"||id=="mana"?8:id=="regen"?.12f:id=="leech"?.008f:id=="crit"?.018f:id=="critDamage"?.10f:.045f;
                g.affixes.Add(new AffixRoll{id=id,value=(float)Math.Round(roll*basis,4)});
            }
            g.affix=g.affixes.Count==0?"기본 장비":string.Join(" · ",g.affixes.Select(Describe));
        }
        public static string Describe(AffixRoll a)
        {
            int index=Array.IndexOf(AffixIds,a.id);bool flat=a.id=="health"||a.id=="stamina"||a.id=="mana"||a.id=="regen";
            return (index<0?a.id:AffixNames[index])+" +"+(flat?a.value.ToString("0.#"):(a.value*100).ToString("0.#")+"%");
        }
        public static Modifiers Sum(Profile p)
        {
            var m=new Modifiers();var indices=new[]{p.weapon,p.armor}.Distinct();
            foreach(int i in indices)
            {
                if(i<0||i>=p.bag.Count)continue;var g=p.bag[i];if(g.affixes==null)continue;
                foreach(var a in g.affixes)
                {
                    float v=a.value*g.Efficiency;
                    switch(a.id){case "power":m.power+=v;break;case "physical":m.physical+=v;break;case "magic":m.magic+=v;break;case "crit":m.crit+=v;break;case "critDamage":m.critDamage+=v;break;case "penetration":m.penetration+=v;break;case "fire":m.fire+=v;break;case "ice":m.ice+=v;break;case "lightning":m.lightning+=v;break;case "resist":m.resist+=v;break;case "health":m.health+=v;break;case "stamina":m.stamina+=v;break;case "mana":m.mana+=v;break;case "cost":m.cost+=v;break;case "cooldown":m.cooldown+=v;break;case "haste":m.haste+=v;break;case "leech":m.leech+=v;break;case "stagger":m.stagger+=v;break;case "elite":m.elite+=v;break;case "execute":m.execute+=v;break;case "guard":m.guard+=v;break;case "regen":m.regen+=v;break;}
                }
            }
            m.crit=Clamp(m.crit,0,.75f);m.critDamage=Clamp(m.critDamage,1,3);m.penetration=Clamp(m.penetration,0,.6f);m.resist=Clamp(m.resist,-.5f,.75f);
            m.cost=Clamp(m.cost,0,.5f);m.cooldown=Clamp(m.cooldown,0,.4f);m.haste=Clamp(m.haste,0,.6f);m.leech=Clamp(m.leech,0,.12f);m.guard=Clamp(m.guard,0,.5f);return m;
        }
        public static DamageResult ComputeDamage(float baseDamage,float defense,Modifiers attacker,Modifiers target,bool magic,bool elite,bool execute,double critRoll)
        {
            float baseValue=Math.Max(0,baseDamage)*(1+attacker.power)*(1+(magic?attacker.magic:attacker.physical));
            bool critical=critRoll<attacker.crit;float criticalFactor=critical?attacker.critDamage:1;
            float condition=(1+(elite?attacker.elite:0))*(1+(execute?attacker.execute:0));
            float physical=baseValue*100/(100+Math.Max(0,defense*(1-attacker.penetration)));
            float elemental=baseValue*(attacker.fire+attacker.ice+attacker.lightning)*(1-Clamp(target.resist,-.5f,.75f));
            if(magic)physical=baseValue*(1-Clamp(target.resist,-.5f,.75f));
            return new DamageResult{critical=critical,physical=physical*criticalFactor*condition,elemental=elemental*criticalFactor*condition,total=Math.Max(1,(physical+elemental)*criticalFactor*condition)};
        }
        static float Clamp(float x,float a,float b)=>Math.Max(a,Math.Min(b,x));
        public static bool CanEquip(Gear g,int job)=>g.slot!="weapon"||string.IsNullOrEmpty(g.kind)||Catalog.FirstOrDefault(t=>t.id==g.template)?.jobs.Contains(job)==true;
        public static int KindForJob(int job)=>job<2?job:job<4?2:job==4?3:4;
    }
}
