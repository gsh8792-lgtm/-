using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace AshenOath
{
    public sealed partial class GameView:MonoBehaviour
    {
        GameSession g;Font font;GUIStyle label,small,title,button;
        readonly Dictionary<string,Texture2D> equipmentArt=new Dictionary<string,Texture2D>();
        int bagPage,guiCalls;string ip="127.0.0.1";bool debug;float scale;Rect viewport;
        readonly Color ink=new Color(.045f,.083f,.092f,.98f),gold=new Color(.80f,.69f,.45f),muted=new Color(.57f,.66f,.65f),white=new Color(.91f,.91f,.84f);
        void Start()
        {
            g=GameSession.I;font=Resources.Load<Font>("Fonts/NotoSansKR");if(font==null)font=Font.CreateDynamicFontFromOSFont(new[]{"Malgun Gothic","Noto Sans CJK KR","Arial"},20);
            foreach(string n in Equipment.Kinds)equipmentArt[n]=Resources.Load<Texture2D>("Equipment/"+n);
            sanctuary=Resources.Load<Texture2D>("Sanctuary/sanctuary");
            LoadBeltArt();
        }
        void Styles()
        {
            label=new GUIStyle(GUI.skin.label){font=font,fontSize=18,fontStyle=FontStyle.Normal,wordWrap=true,normal={textColor=white}};
            small=new GUIStyle(label){fontSize=15,normal={textColor=muted}};
            title=new GUIStyle(label){fontSize=36,fontStyle=FontStyle.Bold,normal={textColor=gold}};
            button=new GUIStyle(label){alignment=TextAnchor.MiddleCenter,fontSize=17,padding=new RectOffset(8,8,4,4)};
        }
        void Update(){if(Input.GetKeyDown(KeyCode.F3))debug=!debug;if(g!=null&&g.inTown&&Input.GetKeyDown(KeyCode.I))g.inventory=!g.inventory;}
        public static void Fill(Rect r,Color c){var old=GUI.color;GUI.color=c;GUI.DrawTexture(r,Texture2D.whiteTexture);GUI.color=old;}
        void Text(float x,float y,float w,float h,string s,GUIStyle style=null){GUI.Label(new Rect(x,y,w,h),s,style??label);}
        bool Button(float x,float y,float w,float h,string text,bool accent=false,bool enabled=true)
        {
            var r=new Rect(x,y,w,h);bool hover=r.Contains(Event.current.mousePosition);
            Fill(r,!enabled?new Color(.065f,.09f,.10f,.95f):accent?new Color(.25f,.23f,.16f,.98f):hover?new Color(.15f,.21f,.21f,.98f):new Color(.065f,.115f,.12f,.98f));
            Outline(r,accent?new Color(.63f,.55f,.36f):new Color(.2f,.29f,.28f));
            var c=GUI.color;if(!enabled)GUI.color=new Color(.5f,.5f,.5f);bool hit=GUI.Button(r,text,button)&&enabled;GUI.color=c;return hit;
        }
        void Bar(float x,float y,float w,float h,float amount,Color c){Fill(new Rect(x,y,w,h),new Color(.025f,.03f,.04f,.85f));Fill(new Rect(x+1,y+1,(w-2)*Mathf.Clamp01(amount),h-2),c);}
        void OnGUI()
        {
            if(guiCalls++==0&&GameSession.Argument("--capture")!=null)Debug.Log("GUI READY: "+Screen.width+" x "+Screen.height+" "+Event.current.type);
            if(g==null)return;if(label==null)Styles();
            float ratio=1280f/720;float sw=Screen.width,sh=Screen.height;float vw=Mathf.Min(sw,sh*ratio),vh=vw/ratio;viewport=new Rect((sw-vw)/2,(sh-vh)/2,vw,vh);scale=vw/1280;
            GUI.matrix=Matrix4x4.TRS(new Vector3(viewport.x,viewport.y,0),Quaternion.identity,new Vector3(scale,scale,1));
            if(GameSession.Argument("--capture-mode")=="animation"){AnimationReview();GUI.matrix=Matrix4x4.identity;return;}
            if(g.inTown)Town();else{DrawBeltWorld();Hud();}
            if(g.inventory)Inventory();
            if(g.showCommands&&!g.inTown)Commands();
            if(g.paused)Pause();
            if(g.deathScreen)Death();
            if(g.messageTime>0){Fill(new Rect(310,648,780,40),ink);Outline(new Rect(310,648,780,40),gold*.55f);Text(326,654,748,30,g.message,small);}
            Text(28,696,1200,24,"ASHEN OATH   ·   재의 서약        "+g.net.status+(g.inTown?"":"        F3 판정 보기"),small);
            GUI.matrix=Matrix4x4.identity;
        }
        void Hud()
        {
            var h=g.Hero;if(h==null)return;
            Text(24,17,320,27,h.name+"  ·  "+Rules.Jobs[h.job].name+"  Lv."+g.profile.level,label);
            Bar(24,52,258,12,h.hp/h.maxHp,new Color(.78f,.24f,.32f));Bar(24,70,126,7,h.sp/h.maxSp,new Color(.37f,.75f,.43f));Bar(158,70,124,7,h.maxMp>0?h.mp/h.maxMp:0,new Color(.3f,.55f,.9f));
            Text(292,48,130,40,Mathf.CeilToInt(h.hp)+" / "+h.maxHp,small);
            Text(439,16,450,35,Rules.Regions[g.region]+"  ·  "+GameSession.RoomName(g.route[g.room]),label);
            for(int i=0;i<g.route.Length;i++){float width=Mathf.Min(32,475f/g.route.Length);Fill(new Rect(442+i*width,58,width-5,6),i<=g.room?gold:new Color(.22f,.28f,.33f));}
            Text(1010,18,260,29,"금화 "+g.profile.gold+"  /  물약 "+g.potions,small);
            if(Button(1110,52,142,35,"장비 · I"))g.inventory=true;
            if(g.route[g.room]==RoomKind.Event&&!g.eventResolved)
            {Fill(new Rect(335,190,610,234),ink);Text(360,208,550,50,g.eventName,title);Text(360,270,550,63,Events.Description(g.eventName),label);
                for(int i=0;i<3;i++)if(Button(359+i*183,350,171,46,new[]{"첫 번째 선택","두 번째 선택","지나친다"}[i],i==0,!g.IsClient))g.ResolveEvent(i);}
            if(Button(26,582,176,44,"파티 명령 · Tab",true))g.showCommands=!g.showCommands;
            if(Button(214,582,127,44,"물약 · H",false,!g.IsClient))g.Drink();
            Text(362,588,590,32,"WASD 이동   Space 점프   J 공격   K 스킬   Shift 회피   L 방어",small);
            int allyIndex=0;foreach(var ally in g.actors.Where(a=>!a.enemy&&a.id!=h.id)){float ax=26+allyIndex++*144;Text(ax,639,138,24,ally.name,new GUIStyle(small){fontSize=13,normal={textColor=white}});Bar(ax,665,127,6,ally.hp/ally.maxHp,new Color(.4f,.67f,.55f));}
            if(g.cleared&&Button(1010,582,240,44,g.room==g.route.Length-1?"원정 완료 · E":"다음 구역 · E",true,!g.IsClient))g.NextRoom();
            if(g.route[g.room]==RoomKind.Rest&&Button(1040,524,210,35,"안전 귀환",false,!g.IsClient))g.GoTown();
            if(g.showTouch)Touch();
        }
        void Touch()
        {
            var left=new Rect(20,452,65,65);var right=new Rect(162,452,65,65);
            Fill(left,ink);Fill(right,ink);GUI.Label(left,"◀",button);GUI.Label(right,"▶",button);
            var up=new Rect(91,381,65,65);var down=new Rect(91,523,65,65);Fill(up,ink);Fill(down,ink);GUI.Label(up,"▲",button);GUI.Label(down,"▼",button);
            Button(1030,443,92,73,"공격",true);Button(1140,443,92,73,"스킬");Button(1030,349,92,73,"점프");Button(1140,349,92,73,"회피");Button(1140,263,92,60,"방어");
        }
        public void ReadTouchControls()
        {
            if(scale<=0)return;g.localInput.move=g.localInput.depth=0;
            foreach(var t in Input.touches)
            {
                if(t.phase==TouchPhase.Ended||t.phase==TouchPhase.Canceled)continue;
                var p=new Vector2((t.position.x-viewport.x)/scale,(Screen.height-t.position.y-viewport.y)/scale);
                if(new Rect(20,452,65,65).Contains(p))g.localInput.move=-1;
                if(new Rect(162,452,65,65).Contains(p))g.localInput.move=1;
                if(new Rect(91,381,65,65).Contains(p))g.localInput.depth=-1;
                if(new Rect(91,523,65,65).Contains(p))g.localInput.depth=1;
                if(new Rect(1030,443,92,73).Contains(p))g.localInput.attack=true;
                if(new Rect(1140,263,92,60).Contains(p))g.localInput.block=true;
                if(t.phase!=TouchPhase.Began)continue;
                if(new Rect(1140,443,92,73).Contains(p))g.localInput.skill=true;
                if(new Rect(1030,349,92,73).Contains(p))g.localInput.jump=true;
                if(new Rect(1140,349,92,73).Contains(p))g.localInput.dodge=true;
            }
        }
        void Commands()
        {
            Fill(new Rect(195,378,890,180),ink);Text(216,390,850,31,"동료 명령  ·  현재: "+Rules.Orders[g.order],label);
            for(int i=0;i<10;i++)if(Button(215+i%5*174,434+i/5*54,165,45,Rules.Orders[i],g.order==i,!g.IsClient))g.Command(i);
        }
        void Pause(){Fill(new Rect(420,200,440,270),ink);Text(459,220,360,45,"잠시 숨을 고릅니다",title);if(Button(455,293,370,46,"계속하기",true))g.paused=false;if(Button(455,349,370,46,g.showTouch?"터치 조작 숨기기":"터치 조작 표시"))g.showTouch=!g.showTouch;}
        void Death(){Fill(new Rect(312,181,656,305),ink);Text(352,205,584,57,"불꽃은 다시 타오른다",title);Text(355,277,570,87,"레벨은 1로 돌아갑니다. 룬 특성은 남습니다.\n회수된 장비는 마을에서 수리할 수 있습니다.\n창고에 보관한 물품은 안전합니다.",label);if(Button(355,393,570,51,"마을로 귀환",true,!g.IsClient))g.GoTown();}
    }
}
