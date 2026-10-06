using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace AshenOath
{
    public sealed class GameView:MonoBehaviour
    {
        GameSession g;Font font;GUIStyle label,small,title,button;Texture2D town,dungeon;readonly Dictionary<string,Texture2D> art=new Dictionary<string,Texture2D>();
        readonly Dictionary<string,Texture2D> equipmentArt=new Dictionary<string,Texture2D>();
        int tab,bagPage,guiCalls;string ip="127.0.0.1";bool debug;float scale;Rect viewport;
        readonly Color ink=new Color(.055f,.07f,.105f,.96f),gold=new Color(.83f,.66f,.4f),muted=new Color(.59f,.65f,.7f),white=new Color(.92f,.9f,.84f);
        void Start()
        {
            g=GameSession.I;font=Resources.Load<Font>("Fonts/NotoSansKR");if(font==null)font=Font.CreateDynamicFontFromOSFont(new[]{"Malgun Gothic","Noto Sans CJK KR","Arial"},20);
            tab=g.profile.started?0:1;
            town=Resources.Load<Texture2D>("Art/town");dungeon=Resources.Load<Texture2D>("Art/dungeon");
            foreach(string n in new[]{"hero","knight","healer","archer","enemy"})art[n]=Resources.Load<Texture2D>("Art/"+n);
            foreach(string n in Equipment.Kinds)equipmentArt[n]=Resources.Load<Texture2D>("Equipment/"+n);
        }
        void Styles()
        {
            label=new GUIStyle(GUI.skin.label){font=font,fontSize=18,fontStyle=FontStyle.Bold,wordWrap=true,normal={textColor=white}};
            small=new GUIStyle(label){fontSize=15,normal={textColor=muted}};
            title=new GUIStyle(label){fontSize=36,fontStyle=FontStyle.Bold,normal={textColor=gold}};
            button=new GUIStyle(label){alignment=TextAnchor.MiddleCenter,fontSize=17,padding=new RectOffset(8,8,4,4)};
        }
        void Update(){if(Input.GetKeyDown(KeyCode.F3))debug=!debug;}
        public static void Fill(Rect r,Color c){var old=GUI.color;GUI.color=c;GUI.DrawTexture(r,Texture2D.whiteTexture);GUI.color=old;}
        void Text(float x,float y,float w,float h,string s,GUIStyle style=null){GUI.Label(new Rect(x,y,w,h),s,style??label);}
        bool Button(float x,float y,float w,float h,string text,bool accent=false,bool enabled=true)
        {
            var r=new Rect(x,y,w,h);bool hover=r.Contains(Event.current.mousePosition);
            Fill(r,!enabled?new Color(.09f,.1f,.13f,.9f):accent?new Color(.32f,.25f,.16f,.95f):hover?new Color(.2f,.24f,.29f,.98f):new Color(.105f,.13f,.17f,.97f));
            Fill(new Rect(x,y,w,1),accent?gold:new Color(.3f,.34f,.38f));
            var c=GUI.color;if(!enabled)GUI.color=new Color(.5f,.5f,.5f);bool hit=GUI.Button(r,text,button)&&enabled;GUI.color=c;return hit;
        }
        void Bar(float x,float y,float w,float h,float amount,Color c){Fill(new Rect(x,y,w,h),new Color(.025f,.03f,.04f,.85f));Fill(new Rect(x+1,y+1,(w-2)*Mathf.Clamp01(amount),h-2),c);}
        void OnGUI()
        {
            if(guiCalls++==0&&GameSession.Argument("--capture")!=null)Debug.Log("GUI READY: "+Screen.width+" x "+Screen.height+" "+Event.current.type);
            if(g==null)return;if(label==null)Styles();
            float ratio=1280f/720;float sw=Screen.width,sh=Screen.height;float vw=Mathf.Min(sw,sh*ratio),vh=vw/ratio;viewport=new Rect((sw-vw)/2,(sh-vh)/2,vw,vh);scale=vw/1280;
            GUI.matrix=Matrix4x4.TRS(new Vector3(viewport.x,viewport.y,0),Quaternion.identity,new Vector3(scale,scale,1));
            if(GameSession.Argument("--capture-mode")=="rig"){RigReview();GUI.matrix=Matrix4x4.identity;return;}
            DrawWorld();
            if(g.inTown)Town();else Hud();
            if(g.inventory)Inventory();
            if(g.showCommands&&!g.inTown)Commands();
            if(g.paused)Pause();
            if(g.deathScreen)Death();
            if(g.messageTime>0){Fill(new Rect(250,637,780,42),ink);Text(266,646,748,30,g.message,small);}
            Text(24,695,1200,24,"ASHEN OATH  /  재의 서약     ·     "+g.net.status+"     ·     F3 판정 보기",small);
            GUI.matrix=Matrix4x4.identity;
        }
        void RigReview()
        {
            Fill(new Rect(0,0,1280,720),new Color(.08f,.1f,.14f));Text(30,18,1200,45,"원본 파츠 · 동작 결합 검수",title);
            string[] names={"대기","걷기 A","걷기 B","공격 준비","공격 적중","피격","점프","사망"};
            for(int i=0;i<8;i++)
            {
                float x=165+i%4*310,y=350+i/4*340;var f=new Fighter{id=1,job=3,art="healer",face=1,hp=100,grounded=true,attackTime=-1};
                if(i==1||i==2)f.move=1;if(i==3||i==4){f.attackTime=.25f;f.resolved=i==4;}if(i==5)f.stun=.5f;if(i==6)f.grounded=false;if(i==7)f.hp=0;
                ReferenceRig.Draw(f,i==7?x-125:x,y,270,i==2?.55f:.2f);Text(x-120,y-290,270,27,names[i],label);
            }
        }
        void DrawWorld()
        {
            var before=GUI.matrix;if(g.shake>0&&!g.inTown)GUI.matrix*=Matrix4x4.Translate(new Vector3(Mathf.Sin(g.elapsed*180)*g.shake*25,Mathf.Cos(g.elapsed*130)*g.shake*12,0));
            Fill(new Rect(0,0,1280,720),new Color(.045f,.065f,.11f));var bg=g.inTown?town:dungeon;
            if(bg!=null){GUI.color=new Color(.78f,.8f,.85f);GUI.DrawTexture(new Rect(-g.cameraX*6,0,1440,690),bg,ScaleMode.ScaleAndCrop);GUI.color=Color.white;}
            Fill(new Rect(0,0,1280,105),new Color(.025f,.04f,.06f,.75f));
            Fill(new Rect(0,565,1280,155),new Color(.035f,.045f,.065f,.98f));
            Fill(new Rect(0,564,1280,4),new Color(.33f,.31f,.3f));
            for(int x=0;x<36;x++){float px=x*48-(g.cameraX*52%48);Fill(new Rect(px,582,43,18),new Color(.1f,.12f,.15f));Fill(new Rect(px+20,607,43,20),new Color(.075f,.09f,.12f));}
            if(!g.inTown)
            {
                foreach(var p in g.platforms){float x=(p.x-g.cameraX)*52,y=565-p.y*52;Fill(new Rect(x,y,p.width*52,12),new Color(.25f,.29f,.32f));Fill(new Rect(x,y+12,p.width*52,16),new Color(.075f,.105f,.14f));Fill(new Rect(x,y,p.width*52,3),gold*.65f);}
                if(g.cleared){float x=(g.worldWidth-2-g.cameraX)*52;Fill(new Rect(x,390,18,175),new Color(.25f,.8f,.8f,.65f));Text(x-30,360,120,24,"다음 구역",small);}
            }
            foreach(var f in g.actors.OrderBy(a=>a.y))DrawFighter(f);
            foreach(var s in g.shots){var p=new Vector2((s.x-g.cameraX)*52,565-s.y*52);Fill(new Rect(p.x-10,p.y-3,20,6),s.enemy?new Color(.85f,.35f,.85f):new Color(.5f,.85f,1));}
            foreach(var t in g.texts){var old=GUI.color;GUI.color=t.color;Text((t.x-g.cameraX)*52-25,565-t.y*52,100,32,t.text,title);GUI.color=old;}
            GUI.matrix=before;
        }
        void DrawFighter(Fighter f)
        {
            float x=(f.x-g.cameraX)*52,y=565-f.y*52,size=f.boss?205:f.art=="hero"?190:145;
            if(g.inTown){x=760+f.id*175;y=571;size=f.art=="hero"?250:190;}
            if(x<-180||x>1460)return;
            float alpha=f.Alive?1:.3f;int frame=0;
            if(f.stun>0)frame=6;else if(!f.grounded)frame=7;else if(f.attackTime>=0)frame=f.resolved?5:4;
            else if(Mathf.Abs(f.move)>.1f&&!g.inTown)frame=1+((int)(g.elapsed*9+f.id)%3);
            Texture2D tex=art.TryGetValue(f.art??"hero",out var value)?value:null;
            Rect rect=new Rect(x-size*.46f,y-size,size*.92f,size);
            GUI.color=new Color(1,1,1,alpha);var matrix=GUI.matrix;
            if(!f.Alive)CanvasTransform.Rotate(80,new Vector2(x,y-15));
            if(f.face<0)CanvasTransform.Scale(new Vector2(-1,1),new Vector2(x,y));
            bool reference=!f.enemy&&f.art!="hero";
            if(!reference&&tex!=null)GUI.DrawTextureWithTexCoords(rect,tex,new Rect((frame%4)*.25f,frame<4?.5f:0,.25f,.5f),true);
            GUI.matrix=matrix;GUI.color=Color.white;
            if(reference)ReferenceRig.Draw(f,x,y,size*1.14f,g.elapsed);
            if(f.Alive)
            {
                DrawWeapon(f,x,y,size);
                if(!g.inTown){Bar(x-29,y-size-13,58,5,f.hp/f.maxHp,f.enemy?new Color(.77f,.24f,.3f):new Color(.29f,.73f,.58f));
                    if(f.enemy&&f.attackTime>=0&&!f.resolved){float wind=f.boss?.75f:.48f;Bar(x-35,y+3,70,5,f.attackTime/wind,new Color(1,.38f,.12f));}
                    if(f.invulnerable>.15f)Text(x-30,y-size-39,80,30,"회피",small);
                }
                else Text(x-75,y+12,155,30,f.name+" · "+Rules.Jobs[f.job].name,small);
            }
            if(debug&&!g.inTown){Fill(new Rect(x-28.6f,565-(f.y+f.Height)*52,57.2f,f.Height*52),new Color(0,1,.5f,.15f));if(f.attackTime>=0){float start=f.face>0?x:x-f.range*52;Fill(new Rect(start,y-f.Height*52,f.range*52,(f.Height-.4f)*52),new Color(1,.25f,.1f,.18f));}}
        }
        void DrawWeapon(Fighter f,float x,float y,float size)
        {
            string kind=Equipment.Kinds[new[]{0,1,2,2,3,4}[f.job]];
            if(equipmentArt.TryGetValue(kind,out var weaponTexture)&&weaponTexture!=null)
            {
                var old=GUI.matrix;Vector2 grip=!f.enemy&&f.art!="hero"?new Vector2(x,y)+ReferenceRig.Hand(f,size*1.14f,g.elapsed):new Vector2(x+f.face*size*.19f,y-size*.5f);
                CanvasTransform.Rotate((f.attackTime<0?-18:f.resolved?65:-65)*f.face,grip);
                float h=size*(kind=="greatsword"?.75f:kind=="focus"?.78f:kind=="bow"?.6f:kind=="daggers"?.34f:.58f),w=h*weaponTexture.width/weaponTexture.height;
                int grade=f.id==0&&g.profile.weapon>=0&&g.profile.weapon<g.profile.bag.Count?g.profile.bag[g.profile.weapon].rarity:2;
                h*=1+grade*.018f;w*=1+grade*.012f;
                GUI.DrawTexture(new Rect(grip.x-w*.5f,grip.y-h*(kind=="bow"?.5f:.81f),w,h),weaponTexture,ScaleMode.StretchToFill,true);
                GUI.matrix=old;
                if(f.id==0&&g.profile.armor>=0&&g.profile.armor<g.profile.bag.Count){int armorGrade=g.profile.bag[g.profile.armor].rarity;var c=Color.HSVToRGB(.59f-armorGrade*.052f,.34f,.85f);float width=12+armorGrade*1.7f;Fill(new Rect(x-f.face*size*.08f-width/2,y-size*.71f,width,7+armorGrade),c);Fill(new Rect(x-f.face*size*.08f-width/2,y-size*.71f,width,2),gold);}
                return;
            }
            float hx=x+f.face*size*.17f,hy=y-size*.5f;var saved=GUI.matrix;
            if(f.face<0)CanvasTransform.Scale(new Vector2(-1,1),new Vector2(x,y));
            hx=x+size*.17f;
            float angle=f.attackTime<0?-25:f.resolved?65:-80;CanvasTransform.Rotate(angle,new Vector2(hx,hy));
            int rarity=f.id==0&&g.profile.weapon>=0&&g.profile.weapon<g.profile.bag.Count?g.profile.bag[g.profile.weapon].rarity:0;
            Color metal=Color.HSVToRGB(.55f-rarity*.055f,.18f+rarity*.065f,.75f+rarity*.025f);
            float blade=(f.job==1?56:f.job==5?23:40)+rarity*1.8f;
            if(f.job==2||f.job==3){Fill(new Rect(hx-2,hy-56,5,86),new Color(.38f,.22f,.14f));Fill(new Rect(hx-7,hy-65,15,18),metal);Fill(new Rect(hx-3,hy-61,7,8),new Color(.5f,1,.83f));}
            else if(f.job==4){Fill(new Rect(hx+7,hy-32,5,58),metal);Fill(new Rect(hx,hy-36,12,5),metal);Fill(new Rect(hx,hy+26,12,5),metal);Fill(new Rect(hx-1,hy-35,1,65),new Color(.8f,.76f,.6f));}
            else{Fill(new Rect(hx-2,hy-5,5,17),new Color(.44f,.25f,.14f));Fill(new Rect(hx-10,hy-10,21,4),gold);Fill(new Rect(hx-(f.job==1?6:3),hy-blade-8,f.job==1?13:7,blade),metal);Fill(new Rect(hx+1,hy-blade-8,2,blade),Color.white*.9f);}
            GUI.matrix=saved;
            if(f.id==0&&g.profile.armor>=0&&g.profile.armor<g.profile.bag.Count)
            {
                var armor=g.profile.bag[g.profile.armor];Color c=Color.HSVToRGB(.57f-armor.rarity*.05f,.45f,.7f);
                // Equipment overlays share the same frame anchor and never replace the face.
                float w=13+armor.rarity*2;Fill(new Rect(x-f.face*size*.08f-w/2,y-size*.71f,w,8+armor.rarity),c);Fill(new Rect(x-f.face*size*.08f-w/2,y-size*.71f,w,2),gold);
                if(f.job==0){Fill(new Rect(x-f.face*size*.2f-12,y-size*.54f,24+armor.rarity*2,34),c);Fill(new Rect(x-f.face*size*.2f-3,y-size*.51f,5,21),gold);}
            }
        }
        void Town()
        {
            Fill(new Rect(18,112,605,516),ink);Text(40,132,550,50,"재의 서약",title);Text(42,183,540,29,"잿불 마을  /  원정을 준비하는 마지막 등불",small);
            for(int i=0;i<5;i++)if(Button(40+i*113,228,106,40,new[]{"원정","전직 · 동료","대장간","룬 · 협동","성장"}[i],tab==i))tab=i;
            Text(42,285,560,30,"금화 "+g.profile.gold+"     룬 조각 "+g.profile.shards+"     레벨 "+g.profile.level,small);
            bool writable=!g.IsClient;
            if(tab==0)
            {
                Text(42,326,535,45,"한 번의 원정, 스무 번의 선택",label);
                if(Button(42,377,536,48,"첫 원정 · 5스테이지 체험",true,writable))g.BeginRun(0,5);
                for(int i=0;i<5;i++)if(Button(42+(i%2)*272,440+(i/2)*48,264,40,(i+1)+". "+Rules.Regions[i],false,writable&&i<=g.profile.unlockedRegion))g.BeginRun(i,20);
            }
            if(tab==1)
            {
                Text(42,322,540,44,"첫 직업을 선택하세요. 이후 마을에서 자유롭게 변경합니다.",small);
                for(int i=0;i<6;i++)if(Button(42+i%3*180,370+i/3*53,172,45,Rules.Jobs[i].name,g.profile.job==i,writable))g.ChangeJob(i);
                var s=Rules.Jobs[g.profile.job];Text(42,485,540,40,"체력 "+s.hp+"  ·  기력 "+s.stamina+"  ·  마나 "+s.mana,small);
                if(Button(42,537,263,43,"동료 방침: "+new[]{"균형","공격","방어","지원"}[g.profile.stance],false,writable)){g.profile.stance=(g.profile.stance+1)%4;foreach(var a in g.actors)a.stance=(Stance)g.profile.stance;g.Save();}
                for(int slot=0;slot<2;slot++)if(Button(315,523+slot*42,263,36,(slot+1)+"번 동료: "+Rules.Jobs[slot==0?g.profile.companion1:g.profile.companion2].name+" →",false,writable&&g.net.mode==0)){if(slot==0)g.profile.companion1=(g.profile.companion1+1)%6;else g.profile.companion2=(g.profile.companion2+1)%6;g.GoTown();}
            }
            if(tab==2)
            {
                Text(42,326,540,44,"대장간 · 연금술 공방",label);
                if(Button(42,380,263,47,"장비 수리 · "+g.profile.bag.Sum(a=>a.RepairCost)+" G",false,writable))g.RepairAll();
                if(Button(315,380,263,47,"장비 제작 · 65 G",false,writable))g.Craft();
                if(Button(42,440,263,47,"장비 관리 · 강화",false,writable)){g.inventory=true;bagPage=0;}
                if(Button(315,440,263,47,"치유 물약 · 18 G",false,writable))g.BuyPotion();
                if(Button(42,500,536,47,"연금술 · 룬 조각 2개 → 물약 2개",false,writable&&g.profile.shards>=2)){g.profile.shards-=2;g.potions=Math.Min(9,g.potions+2);g.Save();}
            }
            if(tab==3)
            {
                if(Button(42,320,536,36,"영구 룬 특성 성장 · 남은 포인트 "+g.profile.runePoints,true,writable))tab=4;
                if(Button(42,365,536,36,"주 룬: "+Rules.Runes[g.profile.rune].name+"  →",false,writable)){do{g.profile.rune=(g.profile.rune+1)%Rules.Runes.Length;}while(g.profile.rune==g.profile.rune2);g.Save();}
                if(Button(42,408,536,36,"보조 룬: "+(g.profile.rune2<0?"없음":Rules.Runes[g.profile.rune2].name)+"  →",false,writable)){do{g.profile.rune2++;if(g.profile.rune2>=Rules.Runes.Length)g.profile.rune2=-1;}while(g.profile.rune2==g.profile.rune);g.Save();}
                Text(42,449,536,29,"조합 피해 ×"+g.RuneDamage.ToString("0.00")+" / 자원 ×"+g.RuneCost.ToString("0.00"),small);
                if(g.net.mode==0)
                {
#if UNITY_WEBGL && !UNITY_EDITOR
                    Text(42,490,536,77,"브라우저에서는 싱글플레이를 체험할 수 있습니다. LAN 협동은 Windows 실행 파일에서 이용하세요.",label);
#else
                    if(Button(42,485,160,42,"LAN 방 만들기",false,writable))g.net.Host();
                    GUI.skin.textField.font=font;GUI.skin.textField.fontSize=19;ip=GUI.TextField(new Rect(215,485,195,42),ip);
                    if(Button(420,485,158,42,"IP로 참가"))g.net.Join(ip);
                    Text(42,541,536,55,"같은 Wi-Fi/LAN에서 최대 3인 테스트. 호스트가 원정·보상을 처리합니다. 협동 테스트는 개인 저장에 반영하지 않습니다.",small);
#endif
                }
                else if(Button(42,485,536,43,"협동 테스트 종료 · 개인 저장으로 복귀"))g.net.Stop();
            }
            if(tab==4)
            {
                var b=g.Build;Text(42,320,540,30,Rules.Jobs[g.profile.job].name+" 성장 · 능력치 "+g.StatPoints+" / 스킬 "+g.SkillPoints+" 포인트",small);
                string[] statLabels={"힘 "+b.strength+" · 공격 +1.5","활력 "+b.vitality+" · 체력 +8","집중 "+b.focus+" · 자원 증가"};
                for(int i=0;i<3;i++)if(Button(42+i*181,358,173,43,statLabels[i],false,writable&&g.StatPoints>0))g.Allocate(i);
                Text(42,410,540,28,"직업 스킬 강화 · 각 5단계",small);
                string[] skillLabels={"위력 "+b.skillPower+" · +12%","숙련 "+b.skillSpeed+" · 대기 -6%","회복 "+b.skillHealing+" · +3"};
                for(int i=0;i<3;i++)if(Button(42+i*181,445,173,43,skillLabels[i],false,writable&&g.SkillPoints>0))g.TrainSkill(i);
                Text(42,497,540,28,"사망 후에도 남는 룬 특성 · "+g.profile.runePoints+" 포인트",small);
                string[] traits={"맹세 "+g.profile.runeRank+" · 피해","생명 "+g.profile.vigorRank+" · 체력","절제 "+g.profile.insightRank+" · 자원"};
                for(int i=0;i<3;i++)if(Button(42+i*181,533,173,43,traits[i],true,writable&&g.profile.runePoints>0))g.LearnTrait(i);
                Text(42,585,540,25,"능력치·스킬 배분은 직업별 저장. 사망 시 레벨과 함께 초기화됩니다.",small);
            }
            Text(674,132,580,55,"THE LAST EMBER",new GUIStyle(title){fontSize=27});Text(676,177,510,70,"룬에 남긴 맹세는 죽음에도 사라지지 않는다.",label);
            Text(696,271,515,80,"출정 전 장비 두 개에 회수 인장을 지정하세요.\n쓰러지면 두 장비와 추가 한 개만 돌아옵니다.",small);
            if(!g.profile.started)Text(674,359,540,60,"전직 · 동료 탭에서 첫 직업을 선택하세요.",label);
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
            Text(362,588,590,32,"A/D 이동   Space 점프   J 공격   K 스킬   Shift 회피   L 방어",small);
            if(g.cleared&&Button(1010,582,240,44,g.room==g.route.Length-1?"원정 완료 · E":"다음 구역 · E",true,!g.IsClient))g.NextRoom();
            if(g.route[g.room]==RoomKind.Rest&&Button(1040,524,210,35,"안전 귀환",false,!g.IsClient))g.GoTown();
            if(g.showTouch)Touch();
        }
        void Touch()
        {
            var left=new Rect(20,452,82,82);var right=new Rect(114,452,82,82);
            Fill(left,ink);Fill(right,ink);GUI.Label(left,"◀",button);GUI.Label(right,"▶",button);
            Button(1030,443,92,73,"공격",true);Button(1140,443,92,73,"스킬");Button(1030,349,92,73,"점프");Button(1140,349,92,73,"회피");Button(1140,263,92,60,"방어");
        }
        public void ReadTouchControls()
        {
            if(scale<=0)return;g.localInput.move=0;
            foreach(var t in Input.touches)
            {
                if(t.phase==TouchPhase.Ended||t.phase==TouchPhase.Canceled)continue;
                var p=new Vector2((t.position.x-viewport.x)/scale,(Screen.height-t.position.y-viewport.y)/scale);
                if(new Rect(20,452,82,82).Contains(p))g.localInput.move=-1;
                if(new Rect(114,452,82,82).Contains(p))g.localInput.move=1;
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
        void Inventory()
        {
            Fill(new Rect(80,112,1120,516),ink);Text(103,129,660,49,"장비와 회수 인장",title);
            if(Button(1075,130,98,36,"닫기"))g.inventory=false;
            Text(105,187,980,45,"회수 인장은 최대 2개. 사망 시 인장 장비 2개와 추가 장비 1개만 남으며 내구도가 65 감소합니다.",small);
            int start=bagPage*4;
            for(int row=0;row<4;row++)
            {
                int i=start+row;if(i>=g.profile.bag.Count)break;var item=g.profile.bag[i];float y=242+row*73;
                Fill(new Rect(102,y,1072,67),new Color(.1f,.13f,.17f));
                bool equipped=g.profile.weapon==i||g.profile.armor==i;
                Text(113,y+2,315,23,(equipped?"◆ ":"")+"["+Equipment.Grades[item.rarity]+"] "+item.name+" +"+item.upgrade,small);
                Text(113,y+40,1048,27,item.affix??"기본 장비",new GUIStyle(small){fontSize=13});
                Text(430,y+6,282,34,(item.slot=="weapon"?"공격 "+item.Attack.ToString("0.0"):"방어 "+item.Defense.ToString("0.0"))+"  내구 "+item.durability.ToString("0"),small);
                if(Button(720,y+3,103,35,item.secured?"인장 해제":"인장 지정",item.secured,!g.IsClient))if(!Rules.ToggleSecure(g.profile,item))g.Toast("회수 인장은 두 개까지만 지정할 수 있습니다.");
                if(Button(832,y+3,97,35,"장착",false,!g.IsClient))g.Equip(i);
                if(Button(939,y+3,110,35,"강화 "+Rules.UpgradeCost(item),false,g.inTown&&!g.IsClient))g.Upgrade(i);
                if(Button(1058,y+3,106,35,"보관",false,g.inTown&&!g.IsClient))
                {g.profile.stash.Add(item);g.profile.bag.RemoveAt(i);g.profile.weapon=g.profile.bag.FindIndex(a=>a.slot=="weapon");g.profile.armor=g.profile.bag.FindIndex(a=>a.slot=="armor");g.Save();break;}
            }
            if(Button(105,553,98,35,"이전",false,bagPage>0))bagPage--;
            Text(217,558,195,30,(bagPage+1)+" / "+Mathf.Max(1,Mathf.CeilToInt(g.profile.bag.Count/4f)),small);
            if(Button(330,553,98,35,"다음",false,start+4<g.profile.bag.Count))bagPage++;
            if(Button(477,553,356,35,"창고 마지막 장비 꺼내기 · "+g.profile.stash.Count+"개",false,g.inTown&&g.profile.stash.Count>0&&g.profile.bag.Count<24&&!g.IsClient))
            {var s=g.profile.stash;g.profile.bag.Add(s[s.Count-1]);s.RemoveAt(s.Count-1);g.Save();}
            if(Button(850,553,318,35,"전체 수리 · "+g.profile.bag.Sum(a=>a.RepairCost)+" G",false,g.inTown&&!g.IsClient))g.RepairAll();
        }
        void Pause(){Fill(new Rect(420,200,440,270),ink);Text(459,220,360,45,"잠시 숨을 고릅니다",title);if(Button(455,293,370,46,"계속하기",true))g.paused=false;if(Button(455,349,370,46,g.showTouch?"터치 조작 숨기기":"터치 조작 표시"))g.showTouch=!g.showTouch;}
        void Death(){Fill(new Rect(312,181,656,305),ink);Text(352,205,584,57,"불꽃은 다시 타오른다",title);Text(355,277,570,87,"레벨은 1로 돌아갑니다. 룬 특성은 남습니다.\n회수된 장비는 마을에서 수리할 수 있습니다.\n창고에 보관한 물품은 안전합니다.",label);if(Button(355,393,570,51,"마을로 귀환",true,!g.IsClient))g.GoTown();}
    }
}
