using System;
using System.Linq;
using UnityEngine;

namespace AshenOath
{
    public sealed partial class GameSession
    {
        // Y is ground-plane depth. Lift is the independent airborne axis.
        Controls AI(Fighter f,float dt)
        {
            var c=new Controls();f.aiTimer-=dt;
            var threats=actors.Where(a=>a.enemy!=f.enemy&&a.Alive).OrderBy(a=>Distance(f,a)).ToArray();
            var t=threats.FirstOrDefault();var hero=Hero;
            if(!f.enemy&&f.id!=0&&hero!=null)
            {
                if(t==null||order==(int)Order.Retreat){Approach(ref c,f,hero.x-f.id*.9f,hero.y+(f.id==1?-1.2f:1.2f),.7f);return c;}
                if(order==(int)Order.Follow&&Distance(hero,t)>6){Approach(ref c,f,hero.x-f.id*.9f,hero.y+(f.id==1?-1:1),.65f);return c;}
                if(order==(int)Order.Focus)t=threats.OrderBy(a=>Distance(hero,a)).First();
                if(order==(int)Order.Interrupt)t=threats.OrderByDescending(a=>a.attackTime>=0).ThenBy(a=>Distance(f,a)).First();
                if(order==(int)Order.Hold){Approach(ref c,f,f.holdX,f.holdY,.2f);if(Distance(f,t)>f.range+.5f)return c;}
                if(order==(int)Order.Protect&&Distance(hero,t)>4){Approach(ref c,f,hero.x-1,hero.y,1);return c;}
                if(f.job==3&&actors.Any(a=>!a.enemy&&a.Alive&&a.hp<a.maxHp*(order==(int)Order.Heal?.95f:.7f)))c.skill=true;
            }
            if(t==null)return c;
            float dx=t.x-f.x,dy=t.y-f.y,range=f.range>4?f.range*.7f:f.range*.7f;f.face=dx>=0?1:-1;
            if(order!=(int)Order.Hold||f.enemy||f.id==0)
            {
                if(Mathf.Abs(dx)>range)c.move=Mathf.Sign(dx);
                if(f.range>4&&Mathf.Abs(dx)<2.6f)c.move=-Mathf.Sign(dx);
                if(Mathf.Abs(dy)>.32f)c.depth=Mathf.Sign(dy)*Mathf.Min(1,Mathf.Abs(dy));
                if(!f.enemy&&f.id!=0&&order==(int)Order.Spread&&hero!=null&&Math.Abs(f.y-hero.y)<1)c.depth=f.id==1?-1:1;
            }
            bool aligned=Math.Abs(dy)<.65f;
            if(Mathf.Abs(dx)<f.range+.1f&&aligned&&f.aiTimer<=0){c.attack=true;f.aiTimer=f.enemy?(f.boss?1.5f:1.25f):.5f;}
            if(!f.enemy&&f.job!=3&&aligned&&Mathf.Abs(dx)<f.range+1&&(order==(int)Order.Burst||f.stance==Stance.Aggressive))c.skill=true;
            if(!f.enemy&&order==(int)Order.Conserve){c.skill=false;if(f.sp<f.maxSp*.35f)c.attack=false;}
            if(f.boss&&f.hp<f.maxHp*.5f){f.phase=1;if(aligned)c.skill=true;}
            if(!f.enemy&&f.stance==Stance.Defensive&&t.attackTime>=0&&!t.resolved&&Distance(f,t)<3){c.block=true;c.depth=f.y<3.5f?-1:1;}
            return c;
        }
        static float Distance(Fighter a,Fighter b)=>Vector2.Distance(new Vector2(a.x,a.y),new Vector2(b.x,b.y));
        static void Approach(ref Controls c,Fighter f,float x,float y,float stop)
        {var delta=new Vector2(x-f.x,y-f.y);if(delta.magnitude>stop){delta.Normalize();c.move=delta.x;c.depth=delta.y;}}
    }
}
