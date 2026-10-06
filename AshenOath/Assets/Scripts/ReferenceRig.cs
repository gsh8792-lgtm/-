using System.Collections.Generic;
using UnityEngine;

namespace AshenOath
{
    // Every visible body part is extracted from the supplied reference, not regenerated.
    // Two-bone leg solving keeps planted feet on the shared ground plane.
    public static class ReferenceRig
    {
        static readonly Dictionary<string,Texture2D> parts=new Dictionary<string,Texture2D>();
        static Texture2D Get(string name){if(!parts.ContainsKey(name))parts[name]=Resources.Load<Texture2D>("Rig/"+name);return parts[name];}
        static void Part(string name,Rect rect,Vector2 pivot,float angle,Color tint)
        {
            var texture=Get(name);if(texture==null)return;var m=GUI.matrix;var c=GUI.color;
            CanvasTransform.Rotate(angle,pivot);GUI.color=tint;GUI.DrawTexture(rect,texture,ScaleMode.StretchToFill,true);GUI.matrix=m;GUI.color=c;
        }
        static void Leg(Vector2 hip,Vector2 foot,Color tint)
        {
            const float upper=200,lower=245;
            Vector2 d=foot-hip;float distance=Mathf.Clamp(d.magnitude,20,upper+lower-1);
            float bend=Mathf.Acos(Mathf.Clamp((upper*upper+distance*distance-lower*lower)/(2*upper*distance),-1,1));
            float angle=Mathf.Atan2(-d.x,d.y)-bend;
            Vector2 knee=hip+new Vector2(-Mathf.Sin(angle),Mathf.Cos(angle))*upper;
            float lowerAngle=Mathf.Atan2(-(foot.x-knee.x),foot.y-knee.y)*Mathf.Rad2Deg;
            Part("lowerLeg",new Rect(knee.x-65,knee.y-23,156,296),knee,lowerAngle,tint);
            Part("upperLeg",new Rect(hip.x-65,hip.y-30,132,258),hip,angle*Mathf.Rad2Deg,tint);
        }
        public static void Draw(Fighter f,float x,float y,float height,float clock)
        {
            var old=GUI.matrix;float scale=height/965f;GUI.matrix=old*Matrix4x4.TRS(new Vector3(x,y-9*scale,0),Quaternion.identity,new Vector3(scale*f.face,scale,1));
            float cycle=clock*7.5f+f.id;bool walk=Mathf.Abs(f.move)>.1f;float stride=walk?Mathf.Sin(cycle)*72:0;
            float bodyY=walk?-Mathf.Abs(Mathf.Sin(cycle*2))*8:Mathf.Sin(clock*2)*2;
            float leftLift=walk?Mathf.Max(0,Mathf.Cos(cycle))*42:0,rightLift=walk?Mathf.Max(0,-Mathf.Cos(cycle))*42:0;
            if(!f.grounded){leftLift=85;rightLift=38;stride=75;bodyY=-8;}
            if(f.stun>0)CanvasTransform.Rotate(-9,new Vector2(10,-465));
            if(!f.Alive)CanvasTransform.Rotate(85,new Vector2(10,-20));
            Color shade=f.Alive?new Color(.86f,.84f,.85f):new Color(.5f,.5f,.5f,.5f);
            Leg(new Vector2(2,-475+bodyY),new Vector2(-25-stride,-31-leftLift),shade);
            float armSwing=walk?Mathf.Sin(cycle)*13:0;
            var shoulder=new Vector2(18,-750+bodyY);
            Part("armRelaxed",new Rect(shoulder.x-80-16,shoulder.y-33,190,361),shoulder,-armSwing,shade);
            Leg(new Vector2(24,-475+bodyY),new Vector2(18+stride,-31-rightLift),Color.white);
            Part("torso",new Rect(-70,-790+bodyY,216,348),new Vector2(24,-460),0,Color.white);
            Part("head",new Rect(-70,-949+bodyY,184,165),new Vector2(45,-790+bodyY),walk?Mathf.Sin(cycle)*1.5f:0,Color.white);
            string arm=f.attackTime>=0?"armBent":f.blocking?"armBent":"armRelaxed";
            float a=f.attackTime>=0?(f.resolved?-15:-110):f.blocking?-25:armSwing;
            Rect armRect=arm=="armRelaxed"?new Rect(shoulder.x-80,shoulder.y-33,190,361):arm=="armBent"?new Rect(shoulder.x-53,shoulder.y-37,226,201):new Rect(shoulder.x-53,shoulder.y-40,233,207);
            Part(arm,armRect,shoulder,a,Color.white);
            GUI.matrix=old;
        }
        public static Vector2 Hand(Fighter f,float height,float clock)
        {
            bool walk=Mathf.Abs(f.move)>.1f;float cycle=clock*7.5f+f.id;
            float bodyY=walk?-Mathf.Abs(Mathf.Sin(cycle*2))*8:Mathf.Sin(clock*2)*2;
            var shoulder=new Vector2(18,-750+bodyY);bool bent=f.attackTime>=0||f.blocking;
            var hand=bent?new Vector2(135,137):new Vector2(53,285);
            float angle=f.attackTime>=0?(f.resolved?-15:-110):f.blocking?-25:walk?Mathf.Sin(cycle)*13:0;
            hand=(Vector2)(Quaternion.Euler(0,0,angle)*hand)+shoulder;float s=height/965f;
            return new Vector2(hand.x*s*f.face,(hand.y-9)*s);
        }
    }
}
