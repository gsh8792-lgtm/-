using System;
using System.Linq;
using UnityEngine;

namespace AshenOath
{
    public sealed partial class GameView
    {
        Texture2D sanctuary;
        Texture2D sanctuaryFade;
        int sanctuaryPage,selectedGear,gearFilter;
        readonly Color line=new Color(.22f,.31f,.30f,.8f),panel=new Color(.07f,.12f,.13f,.98f);
        void Outline(Rect r,Color c)
        {Fill(new Rect(r.x,r.y,r.width,1),c);Fill(new Rect(r.x,r.yMax-1,r.width,1),c);Fill(new Rect(r.x,r.y,1,r.height),c);Fill(new Rect(r.xMax-1,r.y,1,r.height),c);}
        void Caption(float x,float y,string s,float w=800){Text(x,y,w,25,s,new GUIStyle(small){fontSize=12,normal={textColor=gold}});}
        void Heading(float x,float y,string s,float size=30,float w=840){Text(x,y,w,55,s,new GUIStyle(title){fontSize=(int)size,normal={textColor=white}});}
        void Card(float x,float y,float w,float h){Fill(new Rect(x,y,w,h),panel);Outline(new Rect(x,y,w,h),line);}
        void Fade(Rect rect,bool vertical=false,float opacity=.94f)
        {if(sanctuaryFade==null){sanctuaryFade=new Texture2D(256,1,TextureFormat.RGBA32,false);sanctuaryFade.wrapMode=TextureWrapMode.Clamp;for(int i=0;i<256;i++){float k=1-i/255f;sanctuaryFade.SetPixel(i,0,new Color(.025f,.065f,.075f,k*k));}sanctuaryFade.Apply();}var old=GUI.color;GUI.color=new Color(1,1,1,opacity);GUI.DrawTexture(rect,sanctuaryFade,ScaleMode.StretchToFill,true);GUI.color=old;}
        void Town()
        {
            Fill(new Rect(0,0,1280,720),ink);
            Caption(30,22,"A S H E N   O A T H");Heading(29,44,"재의 서약",25,230);
            Text(956,25,300,29,"금화  "+g.profile.gold+"     룬 조각  "+g.profile.shards,small);
            if(Button(1064,62,186,35,"장비 보관함 · I"))g.inventory=true;
            Fill(new Rect(28,104,1224,1),line);
            string[] names={"서약의 안식처","원정 지도","전직과 동료","대장간 · 연금술","룬의 기록","성장과 맹세","협동 원정"};
            string[] subs={"OATHHAVEN","THE DESCENT","COMPANIONS","WORKSHOP","RUNE ARCHIVE","YOUR LEGACY","LAN CO-OP"};
            for(int i=0;i<names.Length;i++)
            {
                float y=127+i*65;var r=new Rect(28,y,223,55);bool active=sanctuaryPage==i;
                if(active){Fill(r,new Color(.12f,.18f,.18f));Fill(new Rect(28,y,3,55),gold);}
                if(GUI.Button(r,GUIContent.none,GUIStyle.none))sanctuaryPage=i;
                Text(48,y+3,180,26,names[i],new GUIStyle(label){normal={textColor=active?white:muted}});
                Caption(49,y+30,subs[i],190);
            }
            Caption(43,617,"CURRENT OATH",205);
            Text(43,641,210,30,Rules.Jobs[g.profile.job].name+"  ·  Lv."+g.profile.level,label);
            Fill(new Rect(270,124,1,554),line);
            switch(sanctuaryPage){case 0:SanctuaryHome();break;case 1:Expeditions();break;case 2:Companions();break;case 3:Workshop();break;case 4:RuneArchive();break;case 5:Growth();break;case 6:Cooperative();break;}
        }
        void SanctuaryHome()
        {
            if(sanctuary!=null)GUI.DrawTexture(new Rect(292,124,960,492),sanctuary,ScaleMode.ScaleAndCrop);
            Fade(new Rect(292,124,770,492));Outline(new Rect(292,124,960,492),line);
            Caption(324,155,"01  /  THE PALE COAST");
            Heading(320,201,"달이 머무는 성채,",35);Heading(320,248,"서약의 안식처",43);
            Text(324,321,410,84,"잿빛 바다 위, 마지막 불빛이 남아 있습니다.\n동료를 모으고 장비를 정비해\n스무 개의 문 너머로 나아가세요.",new GUIStyle(label){fontSize=17});
            if(Button(324,451,267,52,g.profile.started?"원정을 준비한다  →":"첫 직업을 선택한다  →",true))sanctuaryPage=g.profile.started?1:2;
            Text(324,526,420,60,"레벨은 사라져도, 새긴 룬은 남습니다.\n소중한 장비 두 개에는 회수 인장을 남기세요.",small);
            int[] jobs={g.profile.job,g.profile.companion1,g.profile.companion2};
            for(int i=0;i<3;i++)
            {float x=292+i*324;Card(x,627,312,51);Caption(x+14,633,i==0?"VANGUARD":"COMPANION 0"+i,130);Text(x+152,638,152,30,Rules.Jobs[jobs[i]].name,label);}
        }
        void PageHeader(string eyebrow,string heading,string description)
        {Caption(310,131,eyebrow);Heading(306,160,heading);Text(310,220,906,47,description,small);}
        void Expeditions()
        {
            PageHeader("BEYOND THE GATES","다음 서약을 선택하세요","한 번의 원정은 20개 구역. 5 · 10 · 15번째 야영, 마지막 문에서 지역 보스와 조우합니다.");
            if(Button(311,275,915,51,"첫 원정  ·  전투 → 사건 → 야영 → 정예 → 보스  /  5구역",true,!g.IsClient))g.BeginRun(0,5);
            string[] desc={"무너진 회랑의 첫 번째 맹세","가시와 달빛 아래의 추격","잠든 왕의 유산을 찾아","식지 않는 유리와 불의 심장","별빛마저 삼켜 버린 왕좌"};
            for(int i=0;i<5;i++)
            {float y=344+i*62;bool open=i<=g.profile.unlockedRegion;Card(311,y,915,54);Caption(328,y+8,"REGION 0"+(i+1),115);Text(447,y+11,210,31,Rules.Regions[i],label);Text(656,y+13,355,30,desc[i],small);if(Button(1070,y+8,139,38,open?"출정  →":"잠김",open,!g.IsClient&&open))g.BeginRun(i,20);}
        }
        void Companions()
        {
            PageHeader("THREE SOULS · ONE OATH","당신의 첫 번째 직업","직업은 마을에서 자유롭게 바꿀 수 있습니다. 각 직업의 능력치와 스킬 배분을 따로 기억합니다.");
            for(int i=0;i<6;i++)
            {
                float x=311+i%3*309,y=277+i/3*120;var s=Rules.Jobs[i];Card(x,y,294,108);if(g.profile.job==i)Outline(new Rect(x,y,294,108),gold);
                WeaponIcon(new Rect(x+8,y+9,70,83),Equipment.Kinds[new[]{0,1,2,2,3,4}[i]]);
                Text(x+88,y+9,200,30,s.name,label);Text(x+88,y+45,200,22,"HP "+s.hp+"  /  기력 "+s.stamina,small);
                if(Button(x+88,y+73,188,26,(s.mana>0?"마나 "+s.mana+"  ·  ":"기력형  ·  ")+(g.profile.job==i?"선택됨":"선택"),g.profile.job==i,!g.IsClient))g.ChangeJob(i);
            }
            Caption(313,529,"YOUR COMPANIONS");
            for(int slot=0;slot<2;slot++)
            {int j=slot==0?g.profile.companion1:g.profile.companion2;float x=311+slot*309;
                if(Button(x,560,294,51,Rules.Companions[j]+" · "+Rules.Jobs[j].name+"  →",false,!g.IsClient&&g.net.mode==0)){if(slot==0)g.profile.companion1=(j+1)%6;else g.profile.companion2=(j+1)%6;g.GoTown();}}
            if(Button(929,560,297,51,"방침 · "+new[]{"균형","공격","방어","지원"}[g.profile.stance],false,!g.IsClient)){g.profile.stance=(g.profile.stance+1)%4;foreach(var f in g.actors)f.stance=(Stance)g.profile.stance;g.Save();}
            Text(312,632,900,37,"파티는 주인공과 동료 두 명. 전투 중 집결 · 집중 공격 · 보호 · 치유 등 열 가지 명령을 내릴 수 있습니다.",small);
        }
        void Workshop()
        {
            PageHeader("STEEL · GLASS · EMBER","다음 전투를 위한 손길","장비를 고치고, 새로운 무기를 제작하고, 원정에 필요한 회복약을 준비합니다.");
            bool w=!g.IsClient;
            Card(311,282,441,334);Card(771,282,455,334);
            Caption(337,303,"01  /  THE FORGE");Heading(333,336,"잿불 대장간",28,400);
            Text(337,393,388,53,"닳은 강철을 고치고\n당신의 무기에 다음 맹세를 새기세요.",small);
            if(Button(337,464,390,43,"전체 수리 · "+g.profile.bag.Sum(a=>a.RepairCost)+" G",false,w))g.RepairAll();
            if(Button(337,518,189,43,"장비 제작 · 65 G",false,w))g.Craft();
            if(Button(536,518,191,43,"강화 · 장비 관리",true,w))g.inventory=true;
            Caption(796,303,"02  /  THE ALCHEMIST");Heading(792,336,"유리빛 연금 공방",28,400);
            Text(796,393,394,53,"가방에 담긴 작은 회복약 하나가\n다음 문을 여는 힘이 됩니다.",small);
            if(Button(796,464,405,43,"치유 물약 · 18 G   /   보유 "+g.potions,false,w))g.BuyPotion();
            if(Button(796,518,405,43,"룬 조각 2개 → 회복약 2개",true,w&&g.profile.shards>=2)){g.profile.shards-=2;g.potions=Math.Min(9,g.potions+2);g.Save();}
        }
        void RuneArchive()
        {
            PageHeader("WORDS THAT OUTLIVE US","강철 위에 새기는 룬","주 룬과 보조 룬을 조합하세요. 피해와 소모량은 함께 곱해지며, 각 룬의 효과가 전투에 적용됩니다.");
            bool w=!g.IsClient;
            if(Button(311,278,447,51,"주 룬  ·  "+Rules.Runes[g.profile.rune].name+"  →",true,w)){do{g.profile.rune=(g.profile.rune+1)%Rules.Runes.Length;}while(g.profile.rune==g.profile.rune2);g.Save();}
            if(Button(776,278,450,51,"보조 룬  ·  "+(g.profile.rune2<0?"없음":Rules.Runes[g.profile.rune2].name)+"  →",true,w)){do{g.profile.rune2++;if(g.profile.rune2>=Rules.Runes.Length)g.profile.rune2=-1;}while(g.profile.rune2==g.profile.rune);g.Save();}
            Text(313,342,900,33,"조합 피해 ×"+g.RuneDamage.ToString("0.00")+"       자원 소모 ×"+g.RuneCost.ToString("0.00"),label);
            for(int i=0;i<12;i++)
            {float x=311+i%3*309,y=393+i/3*63;bool active=i==g.profile.rune||i==g.profile.rune2;Card(x,y,294,56);if(active)Outline(new Rect(x,y,294,56),gold);Text(x+12,y+4,270,23,Rules.Runes[i].name,new GUIStyle(label){fontSize=16});Text(x+12,y+31,270,22,Rules.Runes[i].description,new GUIStyle(small){fontSize=12});}
        }
        void Growth()
        {
            PageHeader("A LEGACY IN THE ASH","죽음 너머로 이어지는 성장","직업의 능력치와 스킬은 원정 성장입니다. 영구 룬 특성에 남긴 맹세는 사망 후에도 이어집니다.");
            var b=g.Build;bool w=!g.IsClient;
            string[][] rows={new[]{"힘  "+b.strength,"활력  "+b.vitality,"집중  "+b.focus},new[]{"위력  "+b.skillPower,"숙련  "+b.skillSpeed,"회복  "+b.skillHealing},new[]{"맹세  "+g.profile.runeRank,"생명  "+g.profile.vigorRank,"절제  "+g.profile.insightRank}};
            string[][] desc={new[]{"공격 +1.5","체력 +8","마나 · 기력 증가"},new[]{"스킬 피해 +12%","대기 시간 -6%","회복량 +3"},new[]{"영구 피해 증가","영구 체력 증가","영구 자원 효율"}};
            for(int row=0;row<3;row++)
            {int points=row==0?g.StatPoints:row==1?g.SkillPoints:g.profile.runePoints;float y=279+row*130;Caption(313,y,(row==0?"ATTRIBUTES":row==1?"CLASS SKILLS":"PERMANENT RUNES")+"   /   남은 포인트 "+points);
                for(int i=0;i<3;i++){float x=311+i*309;Card(x,y+34,294,75);Text(x+14,y+42,230,26,rows[row][i],label);Text(x+14,y+73,208,25,desc[row][i],small);if(Button(x+241,y+46,38,48,"+",row==2,w&&points>0)){if(row==0)g.Allocate(i);else if(row==1)g.TrainSkill(i);else g.LearnTrait(i);}}}
        }
        void Cooperative()
        {
            PageHeader("SHARE THE DESCENT","세 사람의 협동 원정","같은 네트워크에서 최대 3인. 참가한 플레이어는 동료 슬롯을 대신합니다.");
            Card(311,284,915,287);Text(340,310,846,40,g.net.status,label);
#if UNITY_WEBGL && !UNITY_EDITOR
            Text(340,387,826,115,"브라우저에서는 싱글플레이를 체험할 수 있습니다.\nLAN 협동은 Windows · Android 실행 파일에서 이용하세요.",label);
#else
            if(g.net.mode==0){if(Button(340,387,260,49,"방 만들기",true))g.net.Host();GUI.skin.textField.font=font;GUI.skin.textField.fontSize=22;ip=GUI.TextField(new Rect(625,387,310,49),ip);if(Button(950,387,246,49,"IP로 참가"))g.net.Join(ip);}
            else if(Button(340,387,856,49,"협동 종료 · 개인 저장으로 돌아가기"))g.net.Stop();
#endif
            Text(340,486,826,59,"같은 Wi-Fi 또는 LAN에서 방장의 IPv4 주소로 접속합니다.\n협동 테스트의 성장과 보상은 개인 저장에 반영되지 않습니다.",small);
        }
        void WeaponIcon(Rect r,string kind)
        {if(kind!=null&&equipmentArt.TryGetValue(kind,out var t)&&t!=null)GUI.DrawTexture(r,t,ScaleMode.ScaleToFit,true);}
        string ItemKind(Gear item)=>item.kind??Equipment.Kinds[new[]{0,1,2,2,3,4}[g.profile.job]];
        void GearIcon(Rect r,Gear item)
        {
            if(item.slot=="weapon"){WeaponIcon(r,ItemKind(item));return;}
            var color=gold;float x=r.center.x,y=r.center.y;var matrix=GUI.matrix;CanvasTransform.Rotate(45,new Vector2(x,y));Outline(new Rect(x-17,y-17,34,34),color);GUI.matrix=matrix;Outline(new Rect(x-9,y-19,18,38),color*.5f);Fill(new Rect(x-1,y-12,2,25),color);
        }
        void Inventory()
        {
            Fill(new Rect(0,0,1280,720),new Color(.018f,.045f,.055f,.92f));Card(26,23,1228,663);
            Caption(52,39,"YOUR INHERITANCE  /  EQUIPMENT");Heading(49,67,"장비와 회수 인장",29);
            Text(735,62,370,32,"금화 "+g.profile.gold+"   /   보관 장비 "+g.profile.bag.Count,small);
            if(Button(1148,46,78,43,"닫기"))g.inventory=false;
            Fill(new Rect(50,121,1180,1),line);
            Card(50,144,223,443);Caption(68,162,"VANGUARD",190);Text(68,191,195,31,Rules.Jobs[g.profile.job].name+" · Lv."+g.profile.level,label);
            DrawBeltPortrait(new Rect(43,230,239,239),DressedSet(g.Hero),18+g.elapsed*2%2,true);
            var hero=g.Hero;if(hero!=null){Text(69,487,194,29,"체력  "+hero.maxHp.ToString("0"),small);Text(69,520,194,29,"공격  "+hero.power.ToString("0.0"),small);}
            if(Button(50,603,223,48,"창고 · "+g.profile.stash.Count+"개 꺼내기",false,g.inTown&&g.profile.stash.Count>0&&g.profile.bag.Count<24&&!g.IsClient)){var s=g.profile.stash;g.profile.bag.Add(s[s.Count-1]);s.RemoveAt(s.Count-1);g.Save();}
            string[] filters={"모든 장비","무기","방어구"};for(int i=0;i<3;i++)if(Button(295+i*166,143,154,35,filters[i],gearFilter==i)){gearFilter=i;bagPage=0;}
            var visible=g.profile.bag.Select((item,index)=>new{item,index}).Where(e=>gearFilter==0||e.item.slot==(gearFilter==1?"weapon":"armor")).ToArray();
            bagPage=Mathf.Clamp(bagPage,0,Mathf.Max(0,(visible.Length-1)/6));
            for(int row=0;row<6;row++)
            {int n=bagPage*6+row;if(n>=visible.Length)break;var e=visible[n];float x=295+row%2*251,y=194+row/2*122;bool selected=e.index==selectedGear;Card(x,y,239,108);if(selected)Outline(new Rect(x,y,239,108),gold);GearIcon(new Rect(x+6,y+12,51,79),e.item);
                Caption(x+64,y+10,Equipment.Grades[e.item.rarity]+"  /  "+(e.item.slot=="weapon"?"WEAPON":"ARMOR"),167);Text(x+64,y+36,165,44,e.item.name,new GUIStyle(label){fontSize=15});Text(x+64,y+81,165,23,(g.profile.weapon==e.index||g.profile.armor==e.index?"장착 중":"+")+e.item.upgrade+(e.item.secured?"   ·   회수 인장":""),new GUIStyle(small){fontSize=12});
                if(GUI.Button(new Rect(x,y,239,108),GUIContent.none,GUIStyle.none))selectedGear=e.index;}
            if(Button(295,582,100,35,"이전",false,bagPage>0))bagPage--;
            Text(410,587,221,28,(bagPage+1)+" / "+Mathf.Max(1,Mathf.CeilToInt(visible.Length/6f)),small);
            if(Button(683,582,100,35,"다음",false,(bagPage+1)*6<visible.Length))bagPage++;
            Text(297,633,486,36,"사망 시 회수 인장 장비 2개 + 무작위 1개 회수",new GUIStyle(small){fontSize=13});
            selectedGear=Mathf.Clamp(selectedGear,0,Math.Max(0,g.profile.bag.Count-1));
            if(g.profile.bag.Count==0){Text(834,280,351,50,"보관 중인 장비가 없습니다.",label);return;}
            var item=g.profile.bag[selectedGear];bool equipped=g.profile.weapon==selectedGear||g.profile.armor==selectedGear,w=!g.IsClient;
            Card(805,144,421,507);Caption(827,160,Equipment.Grades[item.rarity]+"  /  "+(item.slot=="weapon"?"무기":"방어구"));
            GearIcon(new Rect(960,186,112,138),item);Heading(826,329,item.name+" +"+item.upgrade,23,373);
            Text(829,378,372,28,(item.slot=="weapon"?"공격  "+item.Attack.ToString("0.0"):"방어  "+item.Defense.ToString("0.0"))+"    ·    내구도 "+item.durability.ToString("0"),label);
            Bar(829,416,373,4,item.durability/100,gold);
            Text(829,432,373,80,item.affix??"순수한 기본 성능을 가진 장비입니다.",new GUIStyle(small){fontSize=14});
            if(Button(829,523,180,39,equipped?"장착 중":"장착",true,w&&!equipped))g.Equip(selectedGear);
            if(Button(1021,523,181,39,item.secured?"회수 인장 해제":"회수 인장 지정",item.secured,w)){if(!Rules.ToggleSecure(g.profile,item))g.Toast("회수 인장은 두 개까지만 지정할 수 있습니다.");g.Save();}
            if(Button(829,574,180,39,"강화 · "+Rules.UpgradeCost(item)+" G",false,g.inTown&&w))g.Upgrade(selectedGear);
            if(Button(1021,574,181,39,"창고에 보관",false,g.inTown&&w)){g.profile.stash.Add(item);g.profile.bag.RemoveAt(selectedGear);g.profile.weapon=g.profile.bag.FindIndex(a=>a.slot=="weapon");g.profile.armor=g.profile.bag.FindIndex(a=>a.slot=="armor");g.Save();}
        }
    }
}
