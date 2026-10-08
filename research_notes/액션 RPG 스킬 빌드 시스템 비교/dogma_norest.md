# 드래곤즈 도그마 1/2 · No Rest for the Wicked · 몬스터 헌터: 스킬/장비 빌드 시스템 비교

> 조사 메모(2026-10 기준). 웹 검색 결과 스니펫과 가이드 기사를 근거로 정리함. Fextralife, fandom, wiki.gg, Steam, gameranx 원문 페이지는 네트워크 정책으로 직접 열 수 없었다. 그래서 상당수 인용은 검색 엔진이 보여준 해당 페이지 발췌에 의존한다. 출처의 확인 수준은 항목마다 표시했다.
> 설계 대상: 모바일 실시간 3인 파티 전략 RPG. 무기는 스킬 ②, 방어구는 스킬 ①과 랜덤 네임드 패시브(등급은 아이템 등급 이하에서 랜덤)를 준다. 궁극기 ③은 클래스 레벨 10마다 하나씩 열리는 풀에서 골라 장착하고 교체할 수 있다. 대형 적에게는 그로기(poise/stagger) 게이지가 있고, 동료는 AI가 조작한다.

## Q1. 드래곤즈 도그마 1/2(Dragon's Dogma / Dark Arisen / DD2)의 직업(Vocation)·스킬·증강(Augment)·마이스터(Maister) 구조

### Takeaway
도그마의 스킬은 세 층으로 나뉜다. 무기에 귀속되어 자동으로 쓰이는 코어 스킬(Core Skill), 직업과 무기에 귀속되어 슬롯에 직접 장착하는 웨폰 스킬(Weapon Skill), 직업에서 배워 다른 직업으로도 가져가는 패시브 증강(Augment)이다. 그 위에 DD2는 퀘스트로 얻는 궁극 스킬 마이스터 스킬(Maister Skill)을 얹었다. 마이스터 스킬은 별도 슬롯을 받지 않고 기존 웨폰 스킬 4칸 중 하나를 차지한다. 그래서 "많이 배우고 조금만 장착한다"는 슬롯 경쟁 구조가 핵심이 된다.

### Cited Findings
**스킬 분류 (DD1/DA)**
- 코어 스킬(Core Skills)은 무기에 묶여 있어서 해당 무기를 쓰는 모든 직업이 사용할 수 있다. 수동 배정이 필요 없고 약공/강공 입력 순서로 발동한다. — [Fextralife DD1 Warrior/Weapon Skills (검색 발췌)](https://dragonsdogma.wiki.fextralife.com/Weapon_Skills)
- 웨폰 스킬(Weapon Skills)은 무기와 직업 모두에 묶인다. 일부는 여러 직업이 공유하고 일부는 전용이다. 컨트롤러나 키보드의 웨폰 스킬 버튼에 직접 배정해야 한다. — [Fextralife DD1 Weapon Skills](https://dragonsdogma.wiki.fextralife.com/Weapon_Skills)
- DD1 웨폰 스킬은 상위판(advanced form)으로 강화된다. 예를 들어 Dragon's Maw는 Legion's Bite의 상위판이고 랭크 9, 7,500 DP다. — [Fextralife DD1 (검색 발췌)](https://dragonsdogma.wiki.fextralife.com/Warrior)
- DD1 증강(Augments)은 직업마다 7개씩, 9개 직업 합계 63개다. 동시에 최대 6개를 장착할 수 있다. 특정 랭크에서 해금되고 DP로 구매하며, 한번 배우면 어느 직업에서든 장착할 수 있다. 예: Warrior의 Clout(랭크 9, 10,000 DP, 힘 +20%), Mage의 Attunement(랭크 9, 7,000 DP, 마법 공격 +10%). — [dragonsdogma.fandom Augments (검색 발췌)](https://dragonsdogma.fandom.com/wiki/Augments)

**DD2 구조**
- 웨폰 스킬은 최대 4개까지 장착한다. 코어 스킬과 달리 장착 수에 제한이 있다. 스킬을 강화하면 슬롯에 있던 구버전이 새 버전으로 즉시 바뀐다. — [Shacknews](https://www.shacknews.com/article/139426/unlock-equip-skills-dragons-dogma-2)
- 증강 장착 상한은 6개다. 증강은 현재 직업에서만 해금할 수 있지만, 해금한 뒤에는 다른 직업에서도 쓸 수 있다. — [Steam Augments Reference Guide (검색 발췌)](https://steamcommunity.com/sharedfiles/filedetails/?id=3197734361), [Fextralife DD2 Augments](https://dragonsdogma2.wiki.fextralife.com/Augments)
- 규율 점수(Discipline, Dcp/DP)는 적 처치로 얻는다. 강한 적일수록 많이 준다. 웨폰 스킬·코어 스킬·증강·직업 해금에 모두 쓰는 단일 통화이고, 강한 스킬일수록 비싸다. 예: Fighter의 Enchanted Counter는 600 Dcp, Onslaught는 무료다. — [Game8](https://game8.co/games/Dragons-Dogma-2/archives/447251), [Mobalytics 입문 가이드](https://mobalytics.gg/blog/dragons-dogma-2/absolute-beginners-guide/)
- 직업 랭크 상한: 한 출처는 "최대 랭크 9, 랭크 9까지 총 27,700 DP"라고 한다. — [Fextralife DD2 Pawns / Game8 / GameRant 검색 요약](https://gamerant.com/dragons-dogma-2-max-level-maximum-levels-vocation-rank-explained-dd2/). 이 수치는 DD1 수치와 섞였을 가능성이 있다(아래 Gaps 참고).
- DD2 직업은 10개다. 시작 직업 4개와 고급 직업 6개로 나뉜다. 캐릭터 레벨 상한은 999이고 직업 랭크와 따로 계산한다. — [Game8 Max Level](https://game8.co/games/Dragons-Dogma-2/archives/448896)
- 직업 경험치(Dcp)는 전투에서만 오르며, 오픈월드 보스와 중간 보스가 가장 많이 준다. — [Dot Esports](https://dotesports.com/dragons-dogma/news/dragons-dogma-2-how-to-reach-maximum-rank-in-a-vocation-fast)

**마이스터 스킬 (DD2, 궁극기 성격)**
- 마이스터 스킬은 모두 12개다. 직업마다 1개씩이고 Sorcerer만 2개다. — [Sportskeeda/GamerGuides 검색 요약](https://sportskeeda.com/esports/dragon-s-dogma-2-maister-skills-explained)
- 얻는 방법은 각 직업의 마이스터 NPC와 관계를 쌓고 퀘스트를 깨서 인정받는 것이다. 예:
  - Fighter: Riotous Fury. Melve의 Lennart, 드래곤 격퇴 퀘스트 이후.
  - Archer: Heavenly Shot. Sacred Arbor의 Taliesin. Gift of the Bow와 A Trial of Archery를 깨야 하며, 남은 스태미나에 비례해 위력이 오른다.
  - Mage: Celestial Paean. 성광 파동을 일으켜 아군의 스태미나 회복과 이동속도를 올리고 받는 피해를 줄인다.
  - Magick Archer: 화산섬 캠프의 Cliodhna.
  - 출처: [GameSpot](https://www.gamespot.com/gallery/dragons-dogma-2-maister-locations-skills-guide/2900-5195/), [GGRecon](https://www.ggrecon.com/guides/dragons-dogma-2-maister-locations-best-ultimate-skills/), [Gfinity](https://www.gfinityesports.com/guides/dragons-dogma-2-maisters-teachings)
- 획득한 마이스터 스킬(Ultimate Skill)은 직업 랭크와 상관없이 장착할 수 있고 Dcp도 들지 않는다. — [Sportskeeda 검색 요약](https://sportskeeda.com/esports/dragon-s-dogma-2-maister-skills-explained)
- 마이스터 스킬은 웨폰 스킬 4칸 중 하나에 넣는다. 예: Warfarer의 Rearmament. 근거는 공식 문서가 아니라 사용자 포럼 글이다. — [Steam 토론 (검색 발췌)](https://steamcommunity.com/app/2054970/discussions/0/4352239720870793263)
- 폰(Pawn)도 마이스터 스킬을 장착할 수 있다. Mobalytics는 폰 빌드에 Celestial Paean과 Riotous Fury를 추천한다. 반면 "마이스터 스킬을 단 폰이 멍청해진다", "켰다 껐다를 무작위로 반복한다"는 커뮤니티 불만도 있다. — [Mobalytics Pawn Guide](https://mobalytics.gg/blog/dragons-dogma-2/pawn-guide-builds/), [Steam 토론](https://steamcommunity.com/app/2054970/discussions/0/6361972680686175415/?ctp=2)

### Inferences
- 도그마에서 "배운 스킬 풀은 크고, 전투에 들고 가는 것은 웨폰 스킬 4개 + 증강 6개뿐"이라는 제약이 빌드 선택을 만든다. 모바일 설계의 "무기 ②, 방어구 ①, 궁극기 ③" 3슬롯은 이보다 훨씬 압축된 구조다. 그래서 선택의 무게가 슬롯 수가 아니라 장비 획득과 교체 쪽으로 옮겨간다.
- 마이스터 스킬은 랭크와 무관하게 퀘스트로 얻으면서도 일반 스킬과 같은 슬롯을 두고 경쟁한다. "강하지만 공짜 슬롯이 아니다"라는 점이 균형 장치로 작동한다. 설계안의 궁극기 ③은 전용 슬롯이므로 일반 스킬과 경쟁하지 않는다. 대신 쿨다운, 게이지, 그로기 연계 같은 다른 비용 축이 필요하다(해석).
- 증강은 해당 직업에서 배우고 어디서나 장착하는 크로스 클래스 패시브다. 이것이 "다른 직업을 키울 이유"를 만든다. 설계안의 방어구 랜덤 패시브는 이 동기를 클래스 육성이 아니라 장비 수집으로 대체한다. 클래스 육성 쪽 동기는 궁극기 풀 해금(레벨 10마다)만 남는다.
- 스킬 강화가 "상위판이 슬롯의 구버전을 대체"하는 방식이라 슬롯 수가 늘어나지 않는다. 장비 등급이 오르면 같은 스킬 ②의 상위판이 붙게 하는 방식에 그대로 참고할 수 있다.

### Gaps
- DD1/DA의 웨폰 스킬 슬롯 수는 원문 위키를 열지 못해 확인하지 못했다. 기억으로는 주무기 3개와 보조무기 3개, 합계 6개이고 Gran Soren 여관이나 Encampment에서 바꿨다. 검색 결과로는 미확인이다.
- DD2 직업 랭크 상한: 검색 요약은 9라고 하지만 DD2 공식 수치를 원문으로 대조하지 못했다. 랭크 10이라는 기억도 있어서 출처가 충돌한다.
- DD2에서 스킬을 바꾸는 장소(여관, 캠프 등)를 원문으로 확인하지 못했다.
- 12개 마이스터 스킬 전체 목록과 각각의 수치는 검색 결과에서 일부만 확보했다.

## Q2. 도그마의 폰(Pawn) AI, 파티 명령, 대형 몬스터 등반·약점·경직/다운, 파티 구성

### Takeaway
DD2 파티는 플레이어, 메인 폰 1명, 고용 폰 2명으로 최대 4인이다. 폰의 행동은 성향(Inclination), 지식(Knowledge), 4가지 단순 명령(Go/Wait/To Me/Help)으로 조정한다. 특정 스킬 사용은 지시할 수 없다. 대형 적은 등반(Grab)과 약점 공격, 부위별 경직/다운(stagger/knockdown)으로 공략한다. 이 구조는 그로기 시스템을 설계할 때 직접 참고할 수 있다.

### Cited Findings
- 파티는 최대 4인이다. 폰은 2명까지 고용할 수 있다. 고용 폰은 XP와 Dcp를 얻지 않고 원래 주인을 위해 Rift Crystal을 번다. — [Fextralife DD2 Pawns (검색 발췌)](https://dragonsdogma2.wiki.fextralife.com/Pawns)
- 메인 폰은 처음에 4개 직업만 쓸 수 있고 나중에 2개가 추가된다. 하이브리드 직업은 쓸 수 없다. — [Fextralife DD2 Pawns](https://dragonsdogma2.wiki.fextralife.com/Pawns)
- 명령은 "Go!", "Wait!", "To Me!", "Help!" 네 가지다. 특정 스킬이나 주문을 쓰라고 지시할 수는 없다. — [Fextralife 폰 가이드](https://fextralife.com/dragons-dogma-2-pawn-guide-everything-you-need-to-know/)
- 성향(Inclination)은 Calm, Kindhearted, Simple, Straightforward 네 가지다.
  - Calm: 방어적이고 원거리를 선호한다.
  - Straightforward: 가장 공격적이다.
  - Simple: 탐색 중심으로, 전리품과 상자를 표시한다.
  - 메인 폰의 성향은 Rift Incense(2,000 Rift Crystal)로 바꾼다. 고용 폰은 바꿀 수 없다.
  - 출처: [Dexerto](https://www.dexerto.com/gaming/dragons-dogma-2-best-pawn-inclinations-specializations-2626520/), [GameRant](https://gamerant.com/dragons-dogma-2-dd2-all-pawn-inclinations-what-do/)
- 전문화(Specialization)는 메인 폰만 갖는 유틸리티로, 한 번에 하나다. 종류는 Chirurgeon(자율 회복 아이템 사용), Forager(재료 위치 표시), Aphonite(침묵), Hawker, Logistician, Woodland Wordsmith이고 책(Tome)으로 바꾼다. 출처마다 전문화 개수를 5개 또는 6개로 다르게 적는다. — [Dexerto](https://www.dexerto.com/gaming/dragons-dogma-2-best-pawn-inclinations-specializations-2626520/)
- 폰은 퀘스트, 적(도감), 지역 지식을 쌓는다(Knowledge Stars). 적 지식(Foe Knowledge)이 높을수록 전투에서 적절한 행동을 한다. — [Fextralife DD2 Pawns (검색 발췌)](https://dragonsdogma2.wiki.fextralife.com/Pawns)
- 등반은 대형 적에게만 가능하다. 오우거, 키메라, 드래곤, 그리핀, 보라색 보스 체력바를 가진 적이 해당한다. 점프 후 Grab 버튼을 누른다. 매달려 있는 동안 스태미나가 줄고, 다 떨어지면 추락한다. — [HardcoreGamer](https://hardcoregamer.com/dragons-dogma-2/dragons-dogma-2-how-to-climb-on-enemies/), [DualShockers](https://www.dualshockers.com/dragons-dogma-2-how-climb-on-enemies/)
- 몬스터마다 떨쳐내기 패턴이 다르다. 드래곤은 몸을 털고, 와이번은 회전하고, 사이클롭스는 머리 근처 등반자를 잡는다. 이 표는 시리즈 공통 위키 기준이다. — [dragonsdogma.fandom Climbing (검색 발췌)](https://dragonsdogma.fandom.com/wiki/Climbing)
- 사이클롭스의 눈을 찌르면 큰 피해를 주고 무릎을 꿇린다. 일부 몬스터는 발과 무릎에 갑옷이 있다. — [HardcoreGamer](https://hardcoregamer.com/dragons-dogma-2/dragons-dogma-2-how-to-climb-on-enemies/)
- 대형 적은 일정 피해를 받으면 경직된다. 밀면서 Grab하면 넘어뜨릴 수 있다. — [DualShockers](https://www.dualshockers.com/dragons-dogma-2-how-climb-on-enemies/)
- 커뮤니티 테스트에 따르면 사이클롭스는 다리를 때리면 경직(stagger), 배나 등을 때리면 다운(knockdown)으로 애니메이션이 다르다. 현재 애니메이션이 끝나기 전에는 다시 경직/다운되지 않는다. 비공식 자료다. — [fandom 사용자 블로그 "Treatise on Stagger/Knockdown"](https://dragonsdogma.fandom.com/wiki/User_blog:ThatGrizzly/A_Treatise_on_Stagger/Knockdown_Resistance.)
- DD1 스킬 예시를 보면 웨폰 스킬 자체에 제어 효과가 붙어 있다.
  - Pommel Strike: 기절(stun)
  - Upward Strike, Antler Toss: 공중에 띄우기
  - Shield Strike: 가드 해제
  - 출처: [Fextralife DD1 Weapon Skills](https://dragonsdogma.wiki.fextralife.com/Weapon_Skills)

### Inferences
- 도그마의 폰 AI는 "성향(행동 가중치) + 지식(적별 학습) + 4개 거시 명령"으로 정리된다. 모바일 3인 파티 AI 설계에도 같은 3층 구조(성향 프리셋, 적 학습 보너스, 간단 명령 버튼)를 저비용으로 이식할 수 있다. 개별 스킬 사용을 지시하지 못하게 한 점은 의도된 제약으로 보인다. 설계안에서는 궁극기 ③만 수동 발동을 허용하는 식의 절충이 가능하다(해석).
- 부위별로 경직(다리)과 다운(몸통)이 갈리고, 연속 경직이 잠기는 구조는 그로기 게이지 설계 레퍼런스가 된다. 예를 들어 그로기가 깨진 동안에는 게이지가 쌓이지 않거나, 다음 그로기 임계치가 올라가게 할 수 있다.
- 모바일에서 실제 등반 조작은 어렵다. 대신 "그로기 상태에서만 약점 부위가 노출된다"거나 "약점 공격 시 추가 그로기 피해" 같은 추상화가 현실적이다(해석).
- "마이스터 스킬을 단 폰의 AI가 부자연스럽다"는 불만은 강력한 궁극기를 AI 동료에게 맡길 때 생기는 문제를 보여준다. AI가 궁극기를 쓰는 시점(그로기 시작, 보스 패턴 직후)은 명시적 규칙으로 정하는 편이 낫다.

### Gaps
- DD2의 공식 그로기/경직 수치(포이즈 값)는 공개된 1차 자료를 찾지 못했다. 커뮤니티 테스트만 확인했다.
- DD1의 폰 학습(오프라인 공유, 다른 플레이어 세계에서 얻는 지식)과 DD1 명령 세부는 이번 검색으로 확인하지 못했다.
- 폰이 몬스터를 붙잡는 Grab 행동도 확인하지 못했다.

## Q3. No Rest for the Wicked(Moon Studios)의 룬·포커스·장비 변형·희귀도·포이즈/무게

### Takeaway
NRftW의 액티브 능력은 무기에 박힌 룬(Rune)에서 나온다. 기본 4칸이고 희귀도에 따라 2칸으로 줄어든다. 룬은 공격으로 채우는 포커스(Focus)를 소모한다. 장비는 희귀도별로 정해진 슬롯 구조(인챈트, 젬) 위에 랜덤 인챈트와 고정 패싯(facet)이 붙는다. 장착 무게에 따라 회피 동작 자체가 바뀌어서, 방어와 기동성 사이에 명확한 트레이드오프가 생긴다. 2024년 얼리 액세스, 2025년 The Breach, 2026년 "Together" 패치를 거쳐 1.0을 준비 중이며 수치가 자주 바뀌었다.

### Cited Findings
**룬(Runes) = 무기 귀속 액티브**
- 주문과 능력은 무기에 슬롯한 룬에서 나온다. 전투 룬은 무기에, 유틸리티 룬(버프, 회복, 이동)은 별도 유틸리티 슬롯에 들어간다. 룬을 쓰면 Focus를 소모한다. — [games.gg Crafting & Enchanting 가이드 (검색 요약)](https://games.gg/no-rest-for-the-wicked/guides/no-rest-for-the-wicked-crafting-enchanting/), [KeenGamer 입문 가이드](https://www.keengamer.com/articles/guides/no-rest-for-the-wicked-beginners-guide-to-help-you-get-started/)
- 무기는 대부분 룬 1~2개를 미리 달고 나온다. 기본 룬 슬롯은 4칸이고, Rare와 Plagued 무기는 2칸만 쓸 수 있다. — [nrftw.fandom Runes (검색 발췌, 약 70일 전 수정)](https://nrftw.fandom.com/wiki/Runes)
- 룬을 추출하면 원래 무기가 파괴되므로 무기 하나에서 룬은 1개만 뽑을 수 있다. 뽑은 룬은 인벤토리로 가고 다른 무기에 주입(infuse)할 수 있다. 2026년판 Steam 가이드도 같은 내용이다. — [ScreenRant](https://screenrant.com/no-rest-wicked-how-to-get-use-runes/), [Steam 222 Runes 가이드(2026)](https://steamcommunity.com/sharedfiles/filedetails/?id=3671914661)
- 룬은 총 222개다. — [NeonLightsMedia](https://www.neonlightsmedia.com/blog/no-rest-for-the-wicked-all-runes-database), [Steam 가이드(2026)](https://steamcommunity.com/sharedfiles/filedetails/?id=3671914661)
- 포커스는 적에게 피해를 주면 차오른다. 공격당 획득량은 무기 고유 값으로 정해지고, "Focus Gain +%" 옵션은 그 무기 값에만 곱해진다(플레이어 설명). 포커스 포션으로도 회복한다. 일부 룬은 "적중 시 Focus 획득 -70%"나 체력 소모로 포커스 획득 같은 트레이드오프를 갖는다. — [ScreenRant](https://screenrant.com/no-rest-wicked-how-to-get-use-runes/), [norestforthewicked.gg Runes DB](https://www.norestforthewicked.gg/db/runes)
- 출처 충돌: 한 위키는 "룬은 무기와 방어구에 끼우는 패시브이고 대장장이 강화로 슬롯이 열린다"고 서술한다. 다른 출처들과 맞지 않아 신뢰도가 낮다. — [no-rest-for-the-wicked.wiki Runes](https://no-rest-for-the-wicked.wiki/items/runes/)

**희귀도·인챈트·젬·패싯**
- 희귀도별 슬롯 구조:
  - Common: 젬 슬롯 4칸
  - Magical: 젬 1칸과 매직 인챈트 3칸
  - Plagued: 젬 1칸, 상향 옵션 4칸, 필수 하향 옵션(downside) 1칸
  - Unique: 젬 1칸과 고정 고유 인챈트
  - 출처: [nrftw.wiki.gg Modifying Equipment (검색 발췌)](https://nrftw.wiki.gg/wiki/Modifying_Equipment)
- Common 아이템은 인챈트가 없고 젬 슬롯이 빈 상태로 나온다. 제작의 바탕이 되는 아이템이다. — [KeenGamer Crafting](https://www.keengamer.com/articles/guides/no-rest-for-the-wicked-complete-crafting-guide/)
- 젬은 Eleanor의 Infuse에서 주입한다. 효과 종류는 항상 같지만 수치(%)는 슬롯할 때 랜덤으로 굴린다. 아이템을 파괴하지 않고는 제거할 수 없다. — [nrftw.wiki.gg Modifying Equipment](https://nrftw.wiki.gg/wiki/Modifying_Equipment)
- 마스터워크(Masterwork)한 아이템에 인챈트를 걸면 뒤쪽 젬 3개가 인챈트로 바뀌고 첫 번째 젬만 남는다. 그래서 핵심 젬은 첫 칸에 넣는다. — [nrftw.wiki.gg Modifying Equipment](https://nrftw.wiki.gg/wiki/Modifying_Equipment)
- Radiant Ember는 랜덤 범위가 있는 인챈트 수치를 15% 올린다(범위 최대치까지). Essence Ember는 기증 아이템을 파괴하는 대신 그 인챈트를 추출해 다른 아이템에 옮긴다. — [nrftw.wiki.gg Modifying Equipment](https://nrftw.wiki.gg/wiki/Modifying_Equipment)
- 패싯(Facet)은 드롭이나 제작 시점에 붙는 고유 변형으로, 보통 "보너스 + 패널티" 짝이다. 나중에 바꾸거나 제거할 수 없다. 상위 등급일수록 붙을 확률이 높다. 같은 아이템을 여러 개 만들어 패싯을 골라 쓰는 방식이 권장된다. — [games.gg 가이드 (검색 요약)](https://games.gg/no-rest-for-the-wicked/guides/no-rest-for-the-wicked-crafting-enchanting/)

**무게·회피·포이즈**
- 장착 하중(Equip Load)은 세 단계다.
  - 경(Light): 빠르고 스태미나가 적게 드는 퀵스텝
  - 중(Medium): 구르기
  - 중량(Heavy): 느린 회피. 공격용 숄더 러시로도 쓸 수 있다.
  - 단계는 최대 하중 대비 비율로 정해진다. Equip Load 스탯에 투자하면 최대치가 오른다.
  - 출처: [GamerGuides](https://www.gamerguides.com/no-rest-for-the-wicked/guide/gameplay/basics/equip-load-and-dodging), [StudioLoot 방어구 가이드](https://www.studioloot.com/no-rest-for-the-wicked/articles/no-rest-for-the-wicked-armor-guide/)
- 포이즈(Poise)는 경직 저항이다. 무거운 방어구일수록 포이즈와 방어도가 높다. — [StudioLoot](https://www.studioloot.com/no-rest-for-the-wicked/articles/no-rest-for-the-wicked-armor-guide/)
- 무기의 포이즈 피해에 대한 플레이어 피드백: 단발에 20인 무기는 중형 적을 너무 쉽게 넘어뜨리고, 10인 공격은 빠른 적을 끊지 못한다. 2연타 지팡이 공격은 포이즈 피해를 나눠 넣어서 경직을 일으키지 못한다. 비공식 자료이고 이후 패치로 바뀌었을 수 있다. — [공식 포럼 "The Poise Damage Problem"](https://forum.norestforthewicked.com/t/the-poise-damage-problem/17449)

**패치 이력**
- The Breach(2025, 대형 업데이트) 내용:
  - Gauntlets, Wands 등 새 무기 계열 추가로 무기 수가 150종을 넘었다.
  - 지역을 감염시키는 Plague System과 하드코어(영구 사망) 모드가 추가됐다.
  - 방패에 포이즈/경직 체계가 재작업됐다.
  - 드롭이 플레이어, 지역, 적 레벨에 맞춰 조정되도록 바뀌었다.
  - 출처: [GameRant](https://gamerant.com/no-rest-for-the-wicked-new-update-breach-patch-notes/), [공식 포럼 Breach 패치노트](https://forum.norestforthewicked.com/t/patch-notes-the-breach/15046)
- 2026년에는 "Together" 패치가 나왔다(Patch 1은 2026-05-20, Hotfix 9는 2026-06-10). 2026-07 위키 정리에 따르면 1.0 출시 때 기존 캐릭터와 렐름을 완전히 초기화할 예정이고, 1.0 패치노트는 아직 공개되지 않았다. — [공식 포럼 뉴스 목록](https://forum.norestforthewicked.com/c/no-rest-for-the-wicked/5), [norestforthewicked.wiki 1.0 정리](https://norestforthewicked.wiki/patch-notes/)

### Inferences
- NRftW는 "액티브 능력은 무기에서 나오고 무기마다 다르다"는 점에서 설계안의 "무기 = 스킬 ②"와 가장 가깝다. 차이도 있다. NRftW는 한 무기에 룬을 최대 4개 넣고 그중 골라 쓰지만, 설계안은 무기당 스킬 1개를 고정한다. 모바일 입력 단순화에는 설계안이 유리하지만 같은 무기 안의 빌드 다양성은 희귀도·패시브로 메워야 한다.
- "희귀도가 높을수록 룬 슬롯이 적다(Rare/Plagued는 2칸)"와 "Plagued는 강하지만 필수 패널티가 있다"는 높은 등급이 무조건 상위호환이 되지 않게 하는 장치다. 설계안의 "패시브 등급은 아이템 등급 이하에서 랜덤"에 등급별 트레이드오프(예: 최상위 등급에 패널티 옵션)를 붙일 때 참고할 수 있다.
- 젬은 효과 종류가 고정이고 수치만 랜덤이다. 인챈트는 종류와 수치가 모두 랜덤이고 이전·강화 수단(Ember)이 있다. 패싯은 랜덤이고 바꿀 수 없다. 이렇게 랜덤성 계층을 나누면 "결정론적으로 맞추는 부분"과 "파밍하는 부분"이 분리된다. 설계안의 랜덤 네임드 패시브에도 재굴림이나 이전 재화를 둘지가 핵심 경제 결정이 된다(해석).
- 포커스를 공격 적중으로 채우는 구조는 실시간 모바일 전투에서 "평타 → 게이지 → 스킬" 리듬을 만든다. 무기마다 포커스 획득량이 달라 무기 정체성도 생긴다.
- 무게 단계에 따라 회피 동작이 바뀌는 방식은 모바일 3인 파티에서는 동작 차이보다 "포이즈(그로기 저항)와 회피 쿨다운의 교환"으로 추상화하는 편이 적합하다(해석).

### Gaps
- 1.0 정식 출시(2026) 이후의 룬 슬롯 수, 희귀도 구조, 포이즈 공식은 확인하지 못했다. 위 수치는 얼리 액세스와 Breach 이후 위키 기준이다.
- 적의 포이즈/스태거 게이지(보스 그로기) 공식 수치를 찾지 못했다.
- 아이템 강화 단계(+1, +2 …, Masterwork 조건)의 정확한 수치를 확인하지 못했다.
- Thomas Mahler 등 개발자가 룬과 장비 설계 의도를 직접 밝힌 1차 자료는 이번 검색에서 확보하지 못했다.

## Q4. 몬스터 헌터: 무기 = 모션셋, 장식주·방어구 스킬·세트 보너스, 스킬 레벨 상한

### Takeaway
MH에는 클래스가 없다. 14종 무기 계열이 각각 고유한 모션셋과 기믹을 가지므로 무기가 곧 직업이다. 수치형 패시브는 방어구, 장식주(Decoration), 호석(Talisman)으로 스킬 포인트를 레벨 단위로 쌓아 만든다. 스킬마다 레벨 상한이 있고 상한을 넘는 포인트는 낭비다. Wilds에는 세트/그룹 스킬이 빌드의 축 역할을 한다.

### Cited Findings
- 무기는 14종이다(대검, 태도, 한손검, 쌍검, 해머, 수렵피리, 랜스, 건랜스, 슬래시액스, 차지액스, 조충곤, 활, 라이트/헤비 보우건). 무기 선택이 사실상 클래스 선택이다. 기믹 예: 태도의 기인 게이지, 쌍검의 귀인화, 수렵피리의 버프 선율, 해머의 기절. Wilds에서는 무기 2개를 들고 출전할 수 있다. — [Mobalytics MHW choose weapon](https://mobalytics.gg/mhw/guides/choose-weapon), [MassivelyOP](https://massivelyop.com/2018/03/27/the-hunters-arsenal-massively-ops-guide-to-the-weapons-of-monster-hunter-world/)
- 방어구 스킬은 레벨로 쌓인다. 같은 스킬이 붙은 부위를 더 입을수록 Lv1에서 Lv2, Lv3으로 오른다. 상한은 보통 Lv3 또는 Lv5이고, 공격(Attack Boost)처럼 Lv7까지 가는 스킬도 있다. 상한을 넘는 포인트는 낭비다. — [TheGamer](https://www.thegamer.com/monster-hunter-wilds-equipment-skills-explained/), [hostedgg](https://hostedgg.com/blog/monster-hunter-wilds-armor-skills-decorations-guide)
- 장식주는 슬롯 레벨(1~3) 이하의 장식주만 들어간다. 낮은 레벨 장식주는 높은 슬롯에 넣을 수 있다. Wilds에서는 무기 스킬 장식주는 무기에만, 방어구 스킬 장식주는 방어구에만 들어간다. 최대 장식주 레벨을 3으로 보는 출처와 4로 보는 출처가 충돌한다. — [monsterhunterwiki.org MHWilds Decorations](https://monsterhunterwiki.org/wiki/MHWilds/Decorations), [GameGuide](https://gameguide.guide/en/guides/monster-hunter-wilds-armor-skills-and-deco-guide)
- 그룹 스킬(Group Skill)은 서로 다른 몬스터 세트도 같은 그룹이면 발동한다. 방어구가 5부위뿐이라 한 빌드에서 그룹 스킬은 사실상 1개만 유지할 수 있고 빌드의 중심축이 된다. 남는 레벨은 장식주와 호석으로 채운다(호석은 대개 최대 Lv3). — [GameGuide](https://gameguide.guide/en/guides/monster-hunter-wilds-armor-skills-and-deco-guide), [hostedgg](https://hostedgg.com/blog/monster-hunter-wilds-armor-skills-decorations-guide)
- 장식주 파밍: 연금 항아리(Melding Pot)에서 남는 장식주나 소재를 랜덤 희귀 장식주로 바꿀 수 있다. — [ggwtb](https://ggwtb.com/blog/mh-wilds-decoration-guide-farm--craft-and-strategies)

### Inferences
- MH에서 액티브 행동은 무기가 정하고(모션셋), 수치형 패시브는 방어구와 장식주가 정한다. 이 분리는 설계안의 "무기 ② 액티브, 방어구 ① + 패시브"와 철학적으로 같다.
- 스킬을 레벨로 쌓고 상한을 두는 구조는 랜덤 네임드 패시브가 중복으로 붙었을 때의 규칙에 그대로 쓸 수 있다. 예: 같은 이름의 패시브는 중첩하되 상한까지만 적용, 또는 중복 시 가장 높은 등급만 적용.
- 장식주처럼 "슬롯 레벨 ≥ 아이템 레벨" 규칙은 "패시브 등급 ≤ 아이템 등급"과 구조가 같다. 즉 상위 장비가 더 강한 패시브를 담을 수 있는 그릇이 된다는 의미를 부여할 수 있다.

### Gaps
- MH Wilds의 2025~2026 업데이트(타이틀 업데이트)로 바뀐 스킬 상한과 장식주 레벨은 확인하지 못했다.
- 몬스터 경직, 기절, 다운 수치(부위 파괴 내구치 등)는 이번 범위에서 조사하지 않았다.

## Q5. 설계 시사점 종합 (무기 귀속 액티브 / 넓은 풀에서 좁은 로드아웃 / 크로스 클래스 패시브 / 후반 궁극기)

### Takeaway
세 시리즈 모두 액티브는 무기에서, 패시브는 방어구나 별도 슬롯에서 오게 나눈다. 도그마는 "배운 풀 대비 장착 슬롯 제한"으로 선택을 만들고, NRftW는 "랜덤 계층(젬, 인챈트, 패싯)과 희귀도 트레이드오프"로 파밍 동기를 만들고, MH는 "레벨 상한이 있는 스킬 포인트 합산"으로 패시브 조합 퍼즐을 만든다. 설계안의 궁극기 ③ 풀은 도그마 마이스터 스킬에 가장 가깝다. 다만 전용 슬롯이므로 슬롯 경쟁 대신 다른 비용이 필요하다.

### Cited Findings
- 도그마2: 웨폰 스킬 4칸에 마이스터 스킬도 같이 들어가고, 증강은 6칸이며 다른 직업에서도 쓸 수 있다. — [Shacknews](https://www.shacknews.com/article/139426/unlock-equip-skills-dragons-dogma-2), [Steam Augments 가이드](https://steamcommunity.com/sharedfiles/filedetails/?id=3197734361)
- 마이스터 스킬은 랭크와 무관하게 퀘스트로 얻는다. — [Sportskeeda](https://sportskeeda.com/esports/dragon-s-dogma-2-maister-skills-explained)
- NRftW: 무기 룬은 기본 4칸이고 Rare/Plagued는 2칸이다. 룬을 추출하면 무기가 파괴된다. — [nrftw.fandom Runes](https://nrftw.fandom.com/wiki/Runes), [ScreenRant](https://screenrant.com/no-rest-wicked-how-to-get-use-runes/)
- MH: 스킬 레벨 상한이 있고 그룹 스킬은 빌드당 사실상 1개다. — [hostedgg](https://hostedgg.com/blog/monster-hunter-wilds-armor-skills-decorations-guide)

### Inferences
설계안 적용 제안(모두 해석):
1. **무기 ② = 정체성.** NRftW처럼 무기 계열마다 기본 평타 리듬과 그로기 피해(포이즈 피해)를 달리 줘서 "어떤 무기로 그로기를 깨는가"를 파티 역할로 만든다. 도그마의 Pommel Strike(기절)와 MH의 해머(기절)처럼 그로기 특화 무기 스킬을 따로 두는 것도 방법이다.
2. **방어구 ① + 랜덤 패시브.** MH식 "같은 이름 패시브 중첩 + 레벨 상한"과 NRftW식 "효과 종류 고정 + 수치 랜덤" 중 하나를 고른다. 재굴림 재화(Radiant Ember 같은 수치 상향)를 두면 파밍 피로를 줄일 수 있다. 최상위 등급에 Plagued처럼 필수 패널티를 붙이면 단순 상위호환을 막을 수 있다.
3. **궁극기 ③ 풀(레벨 10마다 해금, 교체 가능).** 도그마의 마이스터 스킬처럼 "강하지만 하나만"으로 둔다. 교체는 전투 밖(캠프/여관)에서만 허용해 전략적 사전 선택을 만든다(도그마가 스킬 교체 장소를 제한한 것으로 알려진 점을 참고했으나 원문은 미확인). 그로기 상태에서만 추가 효과를 주는 식으로 그로기 시스템과 연계한다.
4. **크로스 클래스 동기.** 도그마의 증강은 다른 직업을 육성할 이유를 만든다. 설계안에서 궁극기를 클래스에 귀속시키면 이 동기가 약해진다. 일부 궁극기 또는 패시브를 다른 클래스에 공유할 수 있게 하는 방안을 검토할 만하다.
5. **AI 동료.** 도그마식 성향 프리셋, 적 지식 누적, Go/Wait/To Me/Help 4개 명령을 이식한다. AI가 궁극기를 쓰는 시점은 규칙 기반(그로기 진입 시 등)으로 정해서 "마이스터 스킬을 단 폰이 멍청해진다"는 문제를 피한다.
6. **그로기.** 도그마의 부위별 경직/다운, 애니메이션 중 재경직 잠금, NRftW의 다단히트 포이즈 분할 문제를 교훈으로 삼는다. 다단 스킬은 그로기 피해를 합산 기준으로 보정하고, 그로기 직후에는 게이지 재충전 지연이나 임계치 상승을 둔다.

### Gaps
- 모바일 장르(예: 실시간 3인 파티 RPG)에서 이와 유사한 시스템을 직접 비교한 사례는 이번 범위에서 조사하지 않았다.
- 개발자 인터뷰(Capcom 이츠노 히데아키, Moon Studios Thomas Mahler)에서 설계 의도를 직접 인용할 1차 자료는 확보하지 못했다.
