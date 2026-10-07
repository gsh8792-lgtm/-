using System;
using System.Linq;
using UnityEngine;

namespace AshenOath
{
    [Serializable] public sealed class JobBuild
    {
        public int strength,vitality,focus,skillPower,skillSpeed,skillHealing;
        public int StatSpent=>strength+vitality+focus;
        public int SkillSpent=>skillPower+skillSpeed+skillHealing;
    }
    [Serializable] public sealed class ExpeditionCheckpoint
    {
        public int region,room,seed,kills;public bool cleared,eventResolved;public string eventName;
        public RoomKind[] route;public Fighter[] actors;public Missile[] shots;public Platform[] platforms;
    }
    public sealed partial class GameSession
    {
        public JobBuild Build {get{if(profile.builds==null||profile.builds.Length!=6)profile.builds=Enumerable.Range(0,6).Select(i=>new JobBuild()).ToArray();return profile.builds[profile.job]??(profile.builds[profile.job]=new JobBuild());}}
        public int StatPoints=>Math.Max(0,(profile.level-1)*2-Build.StatSpent);
        public int SkillPoints=>Math.Max(0,(profile.level-1)/2-Build.SkillSpent);
        public float RuneDamage=>Rules.Runes[profile.rune].damage*(profile.rune2<0?1:Rules.Runes[profile.rune2].damage);
        public float RuneCost=>Rules.Runes[profile.rune].cost*(profile.rune2<0?1:Rules.Runes[profile.rune2].cost)*Math.Max(.75f,1-profile.insightRank*.0125f);
        public void Allocate(int stat)
        {
            if(IsClient||StatPoints<=0)return;
            if(stat==0)Build.strength++;else if(stat==1)Build.vitality++;else Build.focus++;
            Save();Toast("직업별 능력치 배분을 저장했습니다.");
        }
        public void TrainSkill(int branch)
        {
            if(IsClient||SkillPoints<=0)return;
            if(branch==0&&Build.skillPower<5)Build.skillPower++;else if(branch==1&&Build.skillSpeed<5)Build.skillSpeed++;else if(branch==2&&Build.skillHealing<5)Build.skillHealing++;else return;
            Save();
        }
        public void LearnTrait(int branch)
        {
            if(!inTown||IsClient||profile.runePoints<=0)return;
            if(branch==0&&profile.runeRank<20)profile.runeRank++;else if(branch==1&&profile.vigorRank<20)profile.vigorRank++;else if(branch==2&&profile.insightRank<20)profile.insightRank++;else return;
            profile.runePoints--;Save();
        }
        void Checkpoint()
        {
            profile.checkpoint=inTown||deathScreen?null:new ExpeditionCheckpoint{region=region,room=room,seed=seed,kills=kills,cleared=cleared,eventResolved=eventResolved,eventName=eventName,route=route,actors=actors.ToArray(),shots=shots.ToArray(),platforms=platforms.ToArray()};
        }
        void RestoreCheckpoint()
        {
            var c=profile.checkpoint;if(c==null||c.route==null||c.actors==null||c.room<0||c.room>=c.route.Length)return;
            region=Mathf.Clamp(c.region,0,4);room=c.room;seed=c.seed;kills=c.kills;route=c.route;cleared=c.cleared;eventResolved=c.eventResolved;eventName=c.eventName;
            actors.Clear();actors.AddRange(c.actors);shots.Clear();if(c.shots!=null)shots.AddRange(c.shots);platforms.Clear();if(c.platforms!=null)platforms.AddRange(c.platforms);
            random=new System.Random(seed+room*997);inTown=false;worldWidth=42;cameraX=Hero==null?0:Mathf.Clamp(Hero.x-8,0,18);nextId=actors.Max(a=>a.id)+1;Toast("저장된 원정을 이어갑니다.");
        }
    }
}
