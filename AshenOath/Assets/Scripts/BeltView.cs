using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace AshenOath
{
    public sealed partial class GameView
    {
        Texture2D beltArena,shadow;
        readonly Dictionary<string,Texture2D> dressed=new Dictionary<string,Texture2D>();
        readonly Dictionary<string,Texture2D> smoothDressed=new Dictionary<string,Texture2D>();
        readonly Dictionary<string,float> dressedScale=new Dictionary<string,float>();
        [System.Serializable]sealed class AtlasLayout{public AtlasScale[] entries;}
        [System.Serializable]sealed class AtlasScale{public string name;public float scale;}
        int reviewPage,reviewMotion;
        void LoadBeltArt()
        {
            reviewPage=GameSession.Argument("--review-page")=="1"?1:0;
            int.TryParse(GameSession.Argument("--review-motion"),out reviewMotion);reviewMotion=Mathf.Clamp(reviewMotion,0,3);
            beltArena=Resources.Load<Texture2D>("Belt/arena");
            var layout=Resources.Load<TextAsset>("Belt/layout");if(layout!=null)foreach(var entry in JsonUtility.FromJson<AtlasLayout>(layout.text).entries)dressedScale[entry.name]=entry.scale;
            foreach(string name in new[]{"hero-ivory","hero-ebon","hero-warrior","hero-mage","hero-healer","hero-archer","hero-rogue","knight","warrior","mage","healer","archer","rogue","enemy"})
            {var t=Resources.Load<Texture2D>("Belt/"+name);if(t!=null)dressed[name]=t;var s=Resources.Load<Texture2D>("Belt/"+name+"-smooth");if(s!=null)smoothDressed[name]=s;}
            shadow=new Texture2D(64,32,TextureFormat.RGBA32,false);for(int y=0;y<32;y++)for(int x=0;x<64;x++){float d=new Vector2((x-31.5f)/32,(y-15.5f)/16).magnitude;shadow.SetPixel(x,y,new Color(0,0,0,Mathf.Clamp01(1-d)*.5f));}shadow.Apply();
        }
        Vector2 Ground(float x,float y)=>new Vector2((x-g.cameraX)*52,326+y*37);
        void Stroke(Vector2 a,Vector2 b,Color color,float width=1)
        {var matrix=GUI.matrix;var d=b-a;CanvasTransform.Rotate(Mathf.Atan2(d.y,d.x)*Mathf.Rad2Deg,a);Fill(new Rect(a.x,a.y-width/2,d.magnitude,width),color);GUI.matrix=matrix;}
        void Ring(Vector2 p,float rx,float ry,Color color,float width=1)
        {for(int i=0;i<40;i++){float a=i*Mathf.PI/20,b=(i+1)*Mathf.PI/20;Stroke(p+new Vector2(Mathf.Cos(a)*rx,Mathf.Sin(a)*ry),p+new Vector2(Mathf.Cos(b)*rx,Mathf.Sin(b)*ry),color,width);}}
        void DrawBeltWorld()
        {
            Fill(new Rect(0,0,1280,720),ink);
            if(beltArena!=null){GUI.DrawTexture(new Rect(0,98,1280,504),beltArena,ScaleMode.StretchToFill);}
            Fill(new Rect(0,0,1280,99),new Color(.035f,.073f,.087f));Fill(new Rect(0,575,1280,145),new Color(.035f,.073f,.087f,.98f));
            Fill(new Rect(25,100,1230,1),line);Fill(new Rect(25,575,1230,1),line);
            foreach(var f in g.actors.Where(a=>a.Alive&&a.enemy&&a.attackTime>=0&&!a.resolved))
            {
                var p=Ground(f.x+f.face*f.range*.55f,f.y);float k=f.attackTime/(f.boss?.75f:.48f);
                Ring(p,f.range*31,(f.skillAttack?1.15f:.72f)*37,new Color(.95f,.31f,.16f,.7f),2);
                Ring(p,f.range*31*Mathf.Clamp01(k),(f.skillAttack?1.15f:.72f)*37*Mathf.Clamp01(k),new Color(1,.47f,.2f,.75f));
            }
            foreach(var f in g.actors.OrderBy(a=>a.y))
            {
                var p=Ground(f.x,f.y);if(p.x<-220||p.x>1500)continue;
                if(shadow!=null)GUI.DrawTexture(new Rect(p.x-42,p.y-10,84,20),shadow,ScaleMode.StretchToFill,true);
                if(f.id==g.Hero?.id)Ring(p,31,10,new Color(.79f,.72f,.47f,.65f));
                DrawBeltFighter(f,p);
            }
            foreach(var shot in g.shots)
            {var p=Ground(shot.x,shot.y);p.y-=shot.height*42;Fill(new Rect(p.x-8,p.y-4,16,8),shot.enemy?new Color(.82f,.37f,.35f):new Color(.43f,.82f,.93f));Stroke(p-new Vector2(shot.dx*2,shot.dy*2),p,new Color(.67f,.87f,.97f,.55f),3);}
            foreach(var t in g.texts){var p=Ground(t.x,t.y);p.y-=t.height*42;Text(p.x-50,p.y,160,39,t.text,new GUIStyle(title){fontSize=24,normal={textColor=t.color}});}
            if(g.cleared){var p=Ground(g.worldWidth-2,3.5f);Ring(p,40,15,gold,2);Text(p.x-65,p.y-100,160,40,"다음 구역 →",label);}
        }
        string DressedSet(Fighter f)
        {
            if(f.enemy)return "enemy";
            if(f.id==0||f.remote){if(f.job!=0)return new[]{"hero-ivory","hero-warrior","hero-mage","hero-healer","hero-archer","hero-rogue"}[Mathf.Clamp(f.job,0,5)];int armor=g.profile.armor;bool high=armor>=0&&armor<g.profile.bag.Count&&g.profile.bag[armor].rarity>=4;return high&&dressed.ContainsKey("hero-ebon")?"hero-ebon":"hero-ivory";}
            return new[]{"knight","warrior","mage","healer","archer","rogue"}[Mathf.Clamp(f.job,0,5)];
        }
        float BeltFrame(Fighter f)
        {
            if(!f.Alive)return 23;if(f.dodgeTime>0)return 22;if(f.stun>0)return f.stun>.075f?20:21;
            if(f.attackTime>=0){float wind=f.boss?.75f:f.enemy?.48f:f.Stats.windup;float part=f.attackTime<wind?Mathf.Min(2.99f,f.attackTime/wind*3):3+Mathf.Min(2.99f,(f.attackTime-wind)/(f.boss?.5f:f.Stats.recovery)*3);return(f.skillAttack?12:6)+part;}
            if(Mathf.Abs(f.move)+Mathf.Abs(f.depthMove)>.08f)return f.runPhase;
            return 18+f.animationTime*2%2;
        }
        void DrawBeltPortrait(Rect rect,string name,float frame,bool physicalScale=false)
        {if(physicalScale&&dressedScale.TryGetValue(name,out float scale)){rect=new Rect(rect.center.x-rect.width*scale/2,rect.yMax-rect.height*scale*(249f/256),rect.width*scale,rect.height*scale);}int n=Mathf.Clamp((int)(frame*4),0,95);if(smoothDressed.TryGetValue(name,out var smoothTexture)){GUI.DrawTextureWithTexCoords(rect,smoothTexture,new Rect(n%12/12f,1-(n/12+1)/8f,1/12f,1/8f),true);return;}if(!dressed.TryGetValue(name,out var texture))return;int i=(int)frame;GUI.DrawTextureWithTexCoords(rect,texture,new Rect(i%6/6f,1-(i/6+1)/4f,1/6f,1/4f),true);}
        void DrawBeltFighter(Fighter f,Vector2 p)
        {
            float size=(f.boss?270:208)*Mathf.Lerp(.9f,1.06f,f.y/7);p.y-=f.lift*42;string name=DressedSet(f);
            if(!dressed.ContainsKey(name))return;
            var matrix=GUI.matrix;if(f.face<0)CanvasTransform.Scale(new Vector2(-1,1),p);
            float frame=BeltFrame(f);DrawBeltPortrait(new Rect(p.x-size*.5f,p.y-size,size,size),name,frame,true);GUI.matrix=matrix;
            if(f.Alive){Bar(p.x-26,p.y-size+3,52,4,f.hp/f.maxHp,f.enemy?new Color(.73f,.28f,.29f):new Color(.4f,.67f,.55f));}
            if(debug){Ring(Ground(f.x,f.y),29,.5f*37,new Color(.3f,1,.68f));Text(p.x-26,p.y+4,130,25,"깊이 "+f.y.ToString("0.0"),small);}
        }
        void AnimationReview()
        {
            Fill(new Rect(0,0,1280,720),ink);Heading(28,16,"전신 동작 · 장비 결합",29);
            for(int i=0;i<4;i++)if(Button(690+i*138,24,125,40,new[]{"달리기","공격","스킬","대기"}[i],reviewMotion==i))reviewMotion=i;
            string[] sets=reviewPage==0?new[]{"hero-ivory","hero-ebon","knight","warrior","mage","healer","archer","rogue"}:new[]{"hero-warrior","hero-mage","hero-healer","hero-archer","hero-rogue","enemy"};
            float frame=reviewMotion==0?g.elapsed*7.5f%6:reviewMotion==1?6+g.elapsed*6%6:reviewMotion==2?12+g.elapsed*6%6:18+g.elapsed*2%2;
            for(int i=0;i<sets.Length;i++){float x=20+i%4*318,y=83+i/4*287;Card(x,y,300,277);DrawBeltPortrait(new Rect(x+24,y+29,240,240),sets[i],frame);Caption(x+16,y+10,sets[i],270);}
            if(Button(1048,668,210,34,reviewPage==0?"주인공 직업 · 적 →":"← 동료 · 장비 세트"))reviewPage=1-reviewPage;
        }
    }
}
