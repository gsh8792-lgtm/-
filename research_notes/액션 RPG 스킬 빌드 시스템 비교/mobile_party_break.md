# 모바일·실시간 파티 RPG의 조작 부담 감소, 장비 부여 스킬, 브레이크(강인도) 시스템

> 조사일: 2026-10-08. 환경 제약: namu.wiki, 각 게임 fandom, xenoserieswiki, icy-veins 직접 열람이 프록시로 차단되어, 검색 엔진 스니펫과 2차 공략 사이트에 주로 의존함. 수치는 패치로 바뀌었을 수 있음. "출처 있음"=Cited Findings, 출처 없는 일반 지식·해석=Inferences/Gaps로 분리.

## Q1. 캐릭터당/파티당 액티브 입력 수, 자동·반자동 설계, 궁극기 표현 방식

### Takeaway
확인된 사례는 모두 "캐릭터당 직접 누르는 액티브 1~3개 + 나머지는 자동/패시브"로 수렴한다. 반자동의 핵심은 공용 자원(코스트·SP·게이지)으로 "언제 누를지"만 남기는 것이다. 여러 궁극기 중 고르는 구조는 조사 대상 모바일 가챠 게임에서는 확인되지 않았다. 비슷한 것은 Arknights의 "출격 전 스킬 1개 선택", Xenoblade 3의 아츠 장착 정도다.

### Cited Findings
- **Arknights**: 스킬이 여러 개인 오퍼레이터도 한 번에 하나만 쓸 수 있다. 스킬은 편성 메뉴에서 미리 고른다. 1스킬은 보통 같은 직군 공용이고, 2·3스킬은 캐릭터 고유다(플레이스타일의 핵심) — [arknights.wiki.gg Skill](https://arknights.wiki.gg/wiki/Skill)
- **Arknights**: 모든 스킬은 SP를 소모한다. 자동 발동(Auto Trigger) 스킬은 SP가 차고 유효 대상이 있으면 바로 나간다. 수동(Manual) 스킬은 플레이어가 누른다. 유닛을 선택하면 게임이 1/2 속도로 느려진다(멀티플레이·Auto Deploy 제외). 패시브는 메뉴에 표시되지 않고, 자동 스킬은 표시되지만 누를 수 없다 — [arknights.wiki.gg Skill](https://arknights.wiki.gg/wiki/Skill), [arknights.wiki.gg Operations](https://arknights.wiki.gg/wiki/Operations)
- **Arknights**: Auto Deploy(대리 지휘)는 해당 스테이지를 서포트 유닛 없이 3성으로 클리어해야 열린다 — [arknights.wiki.gg Operations](https://arknights.wiki.gg/wiki/Operations)
- **Arknights**: SilverAsh, Exusiai 같은 강한 스킬은 수동 타이밍으로 효과를 극대화해야 한다는 공략 조언이 있다 — [ludo.guide advanced combat mechanics](https://www.ludo.guide/guide/arknights/tips-secrets/advanced-combat-mechanics)
- **Blue Archive**: EX 스킬은 파티 공용 자원 "코스트"로 쓴다. 코스트는 전투 중 시간에 따라 자동으로 찬다. 회복 속도는 캐릭터 스킬로 바꿀 수 있다(예: 일부 EX가 코스트 회복 +100%, Koharu EX는 다음 아군 EX 코스트 50% 감소, Serina 회복 EX는 코스트 2). 공략은 "자동 전투로 초반은 되지만 고난도는 수동 계획이 필요하다"고 평한다 — [Blue Archive Wiki (Yesod Guide)](https://bluearchive.fandom.com/wiki/Yesod/Guide), [gamepretty](https://gamepretty.com/?p=32372)
- **Spirit Wish(스피릿위시)**: 공식 소개(TapTap 페이지)에 "3개 캐릭터 동시 플레이"와 "세밀한 자동 전투 전략 설정", PvP는 "실시간 중계형 자동 결투"라고 되어 있다 — [TapTap 스피릿위시](https://www.taptap.io/kr/app/141527)
- **FF7 Remake**: ATB 게이지가 1칸 이상 차야 어빌리티·마법·아이템을 쓸 수 있다. 일반 공격으로 ATB를 채운다(공격→자원→스킬 루프) — [game8 FF7R](https://game8.co/games/FF7-Remake/archives/281358)
- **FF7 Remake**: 스태거시킨 캐릭터의 리미트 게이지가 찬다(브레이크가 궁극기 자원과 직결) — [game8 FF7R](https://game8.co/games/FF7-Remake/archives/281358)
- **Wuthering Waves**: 에코 5개 중 메인(4코스트, Tonic 슬롯) 에코의 스킬만 액티브로 쓸 수 있다. 장비가 부여하는 액티브는 1개다 — [Prima Games WuWa Echo guide](https://primagames.com/gaming/wuthering-waves-echo-guide-cost-sonata-effects-stats-and-upgrading-explained)
- **Xenoblade 3**: 탤런트 아츠를 빼면 현재 클래스 아츠 최대 3개, 마스터 아츠 최대 3개를 장착한다. 체인 어택은 게이지가 차면 + 버튼 하나로 발동하는 "궁극기형" 연출이다 — [RPG Site XC3 Classes](https://www.rpgsite.net/feature/13092-xenoblade-chronicles-3-classes-best-class-for-each-character-skills-arts-and-unlocks), [xenoserieswiki Chain Attack](https://xenoserieswiki.org/wiki/Chain_Attack_(XC3))
- **Xenoblade 3 AI**: 플레이어가 Break 아츠를 넣으면 AI 동료가 콤보 순서대로 따라 이어 준다(다른 캐릭터의 조작을 AI가 대신함) — [GamerGuides XC3 How to Combo](https://www.gamerguides.com/xenoblade-chronicles-3/guide/combat/tips/how-to-combo)
- **Octopath Traveler**: 매 턴 BP(Boost Point) 1을 얻어 최대 5까지 모은다. 1편은 최대 3BP로 다단 공격이나 위력 강화에 쓴다. 2편은 4배까지라는 서술도 있다(출처 간 차이) — [Wikipedia Octopath Traveler](https://en.wikipedia.org/wiki/Octopath_Traveler), [Wikipedia Octopath Traveler II](https://en.wikipedia.org/wiki/Octopath_Traveler_II)
- **플레이어 반응(일화성)**: 버튼이 많으면 결국 최적 스킬 하나만 연타하게 된다는 불만이 있다(ESO·FFXIV 포럼). "아시아 시장은 자동전투 없으면 안 한다"는 의견과 "자동은 결정이 없어 지루하다"는 의견이 함께 나온다. GW2의 "자동 평타 1개 + 나머지 쿨다운" 구조를 칭찬하는 의견도 있다 — [ESO forum](https://forums.elderscrollsonline.com/en/discussion/comment/1272119), [FFXIV forum](https://forum.square-enix.com/ffxiv/showthread.php?p=4130831), [TouchArcade auto battle thread](https://toucharcade.com/community/threads/auto-battle.285840/)

### Inferences
- (해석) 3인 파티×3버튼=9입력은, 아래 배경 지식에 비춰 보면 Genshin·HSR(조작 캐릭터 1명×2~3입력)보다 많다. 다만 Blue Archive처럼 "공용 자원 1개 + 캐릭터별 버튼 1개"가 6명(아군 편성 6명 중 EX 카드 노출 수는 검증 필요)인 구조보다는 크게 다르지 않다. 부담을 줄이는 방법으로는 다음을 생각할 수 있다. ①②를 Arknights식 "자동/수동 토글"로 둔다. ③만 공용 게이지로 수동 발동하게 한다. 비조작 영웅의 ①②는 XC3처럼 AI가 브레이크 콤보 순서를 따라 쓰게 한다.
- (해석) FF7R의 "브레이크 성공 → 리미트(궁극기) 게이지 충전"은 이번 설계의 "브레이크 기믹 우대"와 ③궁극기를 묶는 데 바로 쓸 수 있는 선례다.
- (배경 지식, 출처 미확인) Genshin은 필드 캐릭터 1명이 평타/E(원소전투스킬)/Q(원소폭발)를 쓰고 4인을 교대한다. Q는 에너지 게이지와 컷인 연출로 표현된다. HSR은 턴제로 평타/전투스킬/필살기(에너지)를 쓰며, 필살기는 턴과 무관하게 끼워 넣을 수 있다. ZZZ는 평타/특수기/궁극기 + 회피 + 교대 + 연계기(QTE)로 구성된다. 세 게임 모두 캐릭터당 궁극기는 1개로 고정이고 고를 수 없다.

### Gaps
- 스피릿위시의 실제 스킬 버튼 수, 수동/자동 범위, 직업 구성은 나무위키 접근이 차단되어 확인하지 못했다. 출시사·서비스 상태도 미확인.
- Blue Archive 자동 전투의 EX 사용 로직, 화면에 노출되는 EX 카드 수는 미확인.
- "여러 궁극기 중 하나 선택" 구조를 쓰는 모바일 실시간 가챠 게임은 찾지 못했다(없다는 뜻이 아니라 미발견).
- 개발자 인터뷰(HoYoverse·Square Enix·Monolith Soft)에서 입력 수를 직접 다룬 원문은 확보하지 못했다.

## Q2. 스킬을 부여하는 장비, 랜덤 부옵션과 등급 상한

### Takeaway
"장비가 액티브 스킬을 준다"는 구조는 WuWa 에코(4코스트 1개만 액티브), FF7 마테리아, Epic Seven 아티팩트(패시브·발동형)가 대표적이다. 랜덤 부옵션은 등급이 높을수록 시작 부옵 수가 많고, 강화 구간마다 추가·강화되는 방식이 거의 표준이다.

### Cited Findings
- **WuWa 에코**: 캐릭터별 코스트 한도는 10, 데이터 독 성장으로 12까지 오른다. 에코 코스트는 1/3/4이고 표준 배치는 4+3+3+1+1. 4코스트(Tonic) 에코의 스킬만 액티브로 쓴다 — [Prima Games](https://primagames.com/gaming/wuthering-waves-echo-guide-cost-sonata-effects-stats-and-upgrading-explained), [Prydwen Echo Stats](https://prydwen.gg/wuthering-waves/guides/echo-stats)
- **WuWa 에코 스탯**: 주옵 2개 중 1개는 코스트별 고정(1코=깡HP, 3·4코=깡공)이고 1개는 코스트 풀 안에서 랜덤이다. 4코 주옵은 HP%/공%/방%/치확/치피/치유 중 하나다. 원소 피해 주옵은 3코만 붙는다. 부옵은 최대 5개이고 5레벨마다 1슬롯씩 "튜닝"으로 연다(Lv25에서 5개). 부옵끼리는 중복이 없지만 주옵과는 겹칠 수 있다. 같은 소나타 5개를 모으면 5세트 효과 — [Prydwen Echo Stats](https://prydwen.gg/wuthering-waves/guides/echo-stats), [Prima Games](https://primagames.com/gaming/wuthering-waves-echo-guide-cost-sonata-effects-stats-and-upgrading-explained)
- **Epic Seven**: 영웅당 아티팩트 1개를 장착한다. 직업 제한(예: Soul Weaver 전용, Knight 전용, 공용)이 있고, 스탯 1줄 + 고유 효과를 준다. 일부는 "전투당 1회", "팀 내 1명만 적용" 같은 제한이 붙는다 — [game8 Epic Seven artifacts](https://game8.co/games/Epic-Seven/archives/277312), [hideoutgacha General Info](https://www.hideoutgacha.com/games/epic-seven/general-info)
- **Epic Seven 장비**: 6부위 중 무기·투구·갑옷은 주옵 고정, 목걸이·반지·신발은 주옵 가변. 세트는 2셋/4셋이다. Epic(최고) 등급은 부옵 4개로 시작하고 Rare·Heroic은 그보다 적다. +3/+6/+9/+12/+15에서 부옵이 공개·강화된다. 부옵 랜덤성이 장비 가치를 가장 크게 좌우한다 — [hideoutgacha Gear Leveling](https://www.hideoutgacha.com/games/epic-seven/gear-leveling), [gamepress The Impact of Gear](https://gamepress.gg/node/37441)
- **Summoners War 룬**: 등급은 Common/Magic/Rare/Hero/Legendary 5단계(연마석·젬 등급 체계와 같음) — [Summoners War Wiki Grindstone](https://summonerswar.fandom.com/wiki/Grindstone)
- **Genshin 성유물**: 5성은 +0에서 부옵 3~4줄로 시작한다. 3줄로 시작하면 +4에서 4번째 줄이 생기고, 이후 +4/+8/+12/+16/+20마다 랜덤 부옵 1개가 강화된다. 부옵 1회 상승 폭은 최대값의 70~100% 4단계(예: 원충 4.53/5.18/5.83/6.48%) — [west-games substat calculator](https://west-games.com/genshin-artifact-substat-calculator/), [traveler.gg](https://traveler.gg/artifacts-made-easy-for-starters/)
- **HSR 광추(Light Cone)**: 중첩(Superimposition, S1~S5)은 패시브 효과만 올리고 기본 스탯은 그대로다. 운명의 길(Path)에 맞춘 패시브 설계(예: 풍요=치유). 패시브 예시: 에너지 회복 효율 +8%→16%, 필살기 후 공격력 증가 — [Prima Games Superimpose](https://primagames.com/tips/how-to-superimpose-in-honkai-star-rail), [GamersDecide](https://gamersdecide.com/articles/honkai-star-rail-best-light-cones)
- **FF7R 마테리아**: Assess 마테리아는 약점·내성·Pressure 조건을 공개한다(정보 제공형 장비 스킬). ATB Assist, Skill Master처럼 "스킬 사용 패턴"을 보상하는 마테리아도 있다(세부 수치 미검증) — [game8 FF7R](https://game8.co/games/FF7-Remake/archives/281378), [Twinfinite](https://twinfinite.net/guides/final-fantasy-vii-remake-pressure-stagger-explained/)

### Inferences
- (해석) "방어구=①스킬, 무기=②스킬"은 WuWa의 "에코 5개 중 1개만 액티브" 구조와 같은 원리다. 장비 슬롯을 액티브 부여 슬롯과 스탯 슬롯으로 나눠, 갈아끼우는 빈도를 줄이면서 빌드 선택지를 만든다.
- (해석) "패시브 등급 상한 = 아이템 등급"은 E7·Genshin·WuWa의 "등급↑ → 시작 부옵 수↑, 부옵 상한↑"과 같은 계열이다. 이름이 붙은 패시브를 쓰므로 E7 아티팩트의 "팀 1명만", "전투 1회" 같은 중복 제한 규칙이 밸런스 장치로 유용하다.
- (해석) WuWa의 "레벨 5마다 부옵 1개 공개"처럼 패시브를 단계적으로 공개하면, 1회 획득의 운 비중을 줄이고 육성 과정에 판단 지점을 만들 수 있다.

### Gaps
- Summoners War 등급별 부옵 수(통념상 Legendary 4개, 강화로 추가)는 신뢰할 만한 출처로 확인하지 못했다. 검색 결과는 저품질 재작성 글이었다.
- HSR 광추의 운명의 길 장착 제한 규칙(통념: 같은 운명의 길일 때만 패시브 발동)은 1차 출처로 확인하지 못했다.
- FF7R 마테리아의 "어빌리티 부여"(커맨드 마테리아) 상세는 미수집.

## Q3. 브레이크/스태거: 딜만 넣는 플레이보다 브레이크 플레이를 우대하는 방법, 성장 스탯과의 연결

### Takeaway
공통 원리는 세 가지다. ①강인도 감소를 HP 피해와 별도 수치로 둔다. ②약점 속성·특정 기술·조건(Pressure)으로만 효율적으로 깎이게 한다. ③브레이크 상태에서는 큰 배율이나 행동 불능을 준다. 성장 스탯은 HSR의 격파 특수효과(Break Effect)와 ZZZ의 충격력(Impact)처럼 "브레이크 전용 스탯"을 따로 둬서 빌드 축을 만든다.

### Cited Findings
- **HSR 강인도**: 약점 속성으로 때려야 강인도가 깎인다. 약점은 추가 피해가 아니라 "강인도를 더 잘 깎는 것"이다. 적마다 약점은 최소 2개이고, 일반<엘리트<보스 순으로 강인도가 높다 — [icy-veins Elements & Weakness Break](https://www.icy-veins.com/honkai-star-rail/elements-and-weakness-break), [esports.gg](https://esports.gg/guides/none/honkai-star-rail-elements-guide)
- **HSR 브레이크 보상**: 강인도가 0이 되면 행동 지연 + 격파 피해 + 속성별 효과가 들어간다. 물리=출혈, 화염=연소, 번개=감전, 바람=풍화(지속 피해), 얼음=빙결(행동 불가), 양자=얽힘(지연+추가 피해), 허수=속박(지연+속도 감소). 브레이크되지 않은 적은 받는 모든 피해에 0.9배가 곱해진다(강인도 보유 중 피해 감소) — [icy-veins](https://www.icy-veins.com/honkai-star-rail/elements-and-weakness-break), [HSR Wiki Toughness](https://honkai-star-rail.fandom.com/wiki/Toughness)
- **HSR 격파 피해 공식 성격**: 격파 피해 기본값은 공격력이 아니라 "적 레벨 + 약점 속성"으로 정해진다. 격파 특수효과(Break Effect)는 그 위에 곱해지는 배율이다. 예: 양자 격파 피해 = 0.5 × 기본 격파 피해 × 최대 강인도 계수. 얽힘 지연 = 20% × (1 + 격파 특수효과) — [afkgaming Break Effect](https://afkgaming.com/gaming/honkai-star-rail/how-does-break-effect-work-in-honkai-star-rail), [icy-veins Quantum](https://www.icy-veins.com/honkai-star-rail/quantum-element)
- **HSR 다중 강인도 / Exo-Toughness**: 강인도 바가 여러 개인 적은 마지막 바 전까지는 격파 피해만 받고 부가 효과는 없다. Exo-Toughness는 일반 강인도를 깎은 뒤 생기며, 약점과 상관없이 어떤 속성으로도 깎인다. 2.7에서 Fugue 특성으로 플레이어 쪽에도 생겼다 — [icy-veins](https://www.icy-veins.com/honkai-star-rail/elements-and-weakness-break), [mobalytics Firefly](https://mobalytics.gg/blog/honkai-star-rail/firefly-guide/)
- **HSR 2.3 패치**: 강인도 감소 수치를 UI에 더 투명하게 보여주도록 바꿨다(보이지 않던 브레이크 수치를 정보로 노출) — [SI videogames](https://videogames.si.com/news/honkai-star-rail-update-2-3-features)
- **HSR 슈퍼 격파(Super Break)·Firefly**: 필살기 상태에서 강화 스킬이 모든 적에 화염 약점을 부여하고, 피해가 격파 특수효과에 비례한다. 트레이스로 약점이 아닌 적에게도 원래 강인도 피해의 55%를 준다. 공략은 "강인도 잠금 적만 아니면 고난도 콘텐츠도 처리한다"고 평한다. 4.2(2026-04-22)에 노바플레어 버프 예고 — [mobalytics Firefly](https://mobalytics.gg/blog/honkai-star-rail/firefly-guide/), [esports.gg Firefly 4.2](https://esports.gg/news/honkai-star-rail/firefly-novaflare-buffs-4-2/)
- **HSR 상한**: 위키는 약점 격파 효율(Weakness Break Efficiency) 상한을 300%로 적는다. 한 공략은 격파 특수효과 360%를 목표로 언급한다(서로 다른 스탯) — [HSR Wiki Toughness](https://honkai-star-rail.fandom.com/wiki/Toughness), [mobalytics](https://mobalytics.gg/blog/honkai-star-rail/firefly-guide/)
- **ZZZ 데이즈/스턴**: 충격력(Impact)은 스턴 담당(Stun 에이전트)의 핵심 스탯이다. 데이즈는 특정 공격(예: Trigger 평타, Lycaon 풀차지 평타 +40%)에서 주로 쌓인다. 스턴 상태의 적은 "스턴 피해 배율"이 적용되고, 캐릭터 스킬로 이 배율을 더 올린다(예: Qingyi 디버프 스택당 +2%, 최대 20스택; Lycaon +35%). 스턴 담당과 스턴 적에게 강한 딜러를 짝짓는다 — [Prydwen Qingyi](https://www.prydwen.gg/zenless/characters/qingyi), [mobalytics Lycaon](https://mobalytics.gg/blog/zenless-zone-zero/von-lycaon-guide/), [genshin-builds Trigger](https://genshin-builds.com/zenless/characters/trigger)
- **FF7R 스태거**: HP 바 아래 별도 스태거 게이지가 있다. 피해로 차지만 Focused 계열 기술(예: Focused Thrust)이 훨씬 많이 채운다. 스태거된 적은 행동 불가이고 기본 160% 피해를 받는다(티파 기술로 200~300%까지). Pressure는 약점 속성, 연계기, 특정 공격 반격·끊기 같은 적별 조건으로 걸리며, Pressure 중에는 스태거가 빨리 찬다. 정석은 "Pressure → Focused → 스태거 → 고배율 딜" — [RPG Site stagger bonus](https://www.rpgsite.net/feature/9641-final-fantasy-vii-remake-how-to-increase-stagger-bonus-to-200-and-300), [game8](https://game8.co/games/FF7-Remake/archives/281358), [Twinfinite](https://twinfinite.net/guides/final-fantasy-vii-remake-pressure-stagger-explained/)
- **Xenoblade 3 콤보**: Break → Topple → Daze → Burst, 또는 Break → Topple → Launch → Smash. 파티 전체에 단계별 아츠가 하나씩은 있어야 콤보가 완성된다. Break는 내성으로 실패할 수 있다. 체인 어택 중에는 콤보 타이머가 멈춘다는 커뮤니티 분석이 있다(Smash 시점 극대화) — [GamerGuides](https://www.gamerguides.com/xenoblade-chronicles-3/guide/combat/tips/how-to-combo), [Shacknews](https://www.shacknews.com/article/131617/xenoblade-chronicles-3-combo-string), [TV Tropes (비공식)](https://www.tvtropes.org/pmwiki/pmwiki.php/GameBreaker/XenobladeChronicles3)
- **Octopath**: 적마다 실드 포인트와 숨겨진 약점(무기 6종 + 속성 6종)이 있다. 약점 공격 1타 = 실드 1 감소(피해량과 무관). 0이 되면 브레이크되어 다음 턴을 잃고 받는 피해가 늘어난다. 회복 후에는 플레이어보다 먼저 행동해 무한 브레이크를 막는다. Cyrus는 전투 시작 시 약점 1개를 공개하는 탤런트가 있다 — [Wikipedia](https://en.wikipedia.org/wiki/Octopath_Traveler), [GamerGuides Octopath](https://www.gamerguides.com/octopath-traveler/guide/the-basics/game-mechanics/battle-system)

### Inferences
- (해석) 딜만 넣는 플레이를 약하게 만드는 확인된 장치는 다섯 가지다. ①브레이크 전 피해 감소(HSR 0.9배). ②브레이크 피해가 공격력이 아닌 적 레벨 기반이라 딜 스탯이 효과가 없음(HSR). ③강인도를 약점·특정 기술로만 효율적으로 깎음(HSR·FF7R Focused·Octopath 타수제). ④브레이크 후 큰 배율(FF7R 160%+). ⑤브레이크 후 행동 불능(전 게임 공통). 이 중 ④⑤는 브레이크를 "딜 증폭기"로 만들어 딜 빌드와 공존시키고, ①②③은 브레이크 빌드를 독립된 축으로 만든다.
- (해석) 기믹 우대에는 FF7R의 Pressure 방식이 가장 직접적이다. 적별로 "이 공격을 끊으면/반격하면" 같은 조건을 두고, 충족 시 브레이크 게이지 축적 배율을 올린다. Assess 같은 정보 공개 수단과 HSR 2.3의 수치 노출 같은 장치가 함께 있어야 플레이어가 기믹을 읽을 수 있다.
- (해석) 성장 연결은 HSR 격파 특수효과, ZZZ 충격력처럼 브레이크 전용 스탯을 방어구 랜덤 패시브 풀에 넣는 방식이 자연스럽다. 이번 설계의 ① 방어구 스킬에 "브레이크 계수"를 두면 장비 선택이 곧 브레이크 역할 선택이 된다.
- (해석) HSR Firefly(약점 부여, 비약점에도 55% 강인도 피해)와 Exo-Toughness(약점 무시)는 가챠 신캐가 "약점 퍼즐을 우회"하는 방향으로 파워 크립이 진행된 사례로 읽힌다. 기믹 우위를 지키려면 "약점 무시"류 효과에 상한(Octopath의 선행동 보장, HSR 강인도 잠금 적 같은 장치)이 필요하다.

### Gaps
- HSR 일반 격파 피해 공식 전문(레벨 계수, 속성 계수, 최대 강인도 계수)은 위키 차단으로 원문 확인 불가.
- ZZZ 데이즈 공식, 기본 스턴 배율(통념 150%)과 스턴 지속 시간은 1차 출처 미확인.
- Genshin은 브레이크 시스템이 약하다(일부 보스 실드·마비만 있음). 체계적인 출처는 수집하지 못했다.

## Q4. Xenoblade 3 클래스/아츠 계승, FF7R 마테리아: "배운 뒤 일부만 장착" 구조와 궁극기 풀의 관련성

### Takeaway
XC3는 "클래스 랭크로 아츠·스킬을 영구 습득 → 다른 클래스에서 제한된 슬롯에 장착"하는 구조이고, 슬롯 수가 캐릭터 레벨로 열린다. 이는 "10레벨마다 궁극기 1개 해금, 그중 1개 장착"과 거의 같은 형태로, 바로 참고할 수 있는 선례다.

### Cited Findings
- 클래스 랭크 상한은 처음 10이다. 사이드 스토리(주인공 클래스) 또는 승화 퀘스트(영웅 클래스)로 20까지 오른다. 랭크 상한이 높아지면 영구 습득하는 아츠·스킬이 늘어난다 — [RPG Site XC3 Classes](https://www.rpgsite.net/feature/13092-xenoblade-chronicles-3-classes-best-class-for-each-character-skills-arts-and-unlocks), [GamerGuides changing and ranking up classes](https://gamerguides.com/xenoblade-chronicles-3/guide/walkthrough/chapter-2/changing-and-ranking-up-classes)
- 클래스를 열면 첫 마스터 아츠를 얻고, 랭크 10에서 두 번째를 얻는다. 스킬도 랭크 구간(예: 5, 15)마다 마스터 스킬로 습득한다 — [RPG Site](https://www.rpgsite.net/feature/13092-xenoblade-chronicles-3-classes-best-class-for-each-character-skills-arts-and-unlocks)
- 장착 제한: 클래스 아츠 3 + 마스터 아츠 최대 3. 마스터 아츠 슬롯은 캐릭터 레벨로 열린다(처음 1 → Lv20에 2 → Lv40에 3). 케베스(시간 충전) 클래스면 마스터 아츠는 아그누스(평타 충전)여야 하고, 반대도 마찬가지다(교차 장착 강제) — [RPG Site](https://www.rpgsite.net/feature/13092-xenoblade-chronicles-3-classes-best-class-for-each-character-skills-arts-and-unlocks)
- 예외: Soulhacker는 다른 클래스의 마스터 아츠·스킬을 쓰지 못하고, 유니크 몬스터를 처치해 아츠·스킬을 "훔쳐" 얻는다 — [xenoserieswiki Soulhacker](https://www.xenoserieswiki.org/wiki/Soulhacker)
- FF7R: Assess, ATB Assist, Skill Master 등 마테리아를 장착해 정보·자원 순환·스킬 사용 보상을 얻는다(장비 슬롯 = 능력 선택) — [game8 FF7R](https://game8.co/games/FF7-Remake/archives/281378)

### Inferences
- (해석) XC3의 "레벨로 슬롯 확장 + 랭크로 풀 확장"을 그대로 옮기면 이렇게 된다. "클래스 레벨 10마다 궁극기 1개가 풀에 추가되고, 장착은 1개(③)". 풀만 늘고 슬롯은 1개로 고정되므로 버튼 수는 늘지 않고 선택의 깊이만 커진다.
- (해석) XC3의 "케베스/아그누스 교차 장착" 같은 제약은 궁극기 풀에 "자원 타입(브레이크형/딜형/서포트형) 중 파티 내 중복 제한"을 두는 아이디어로 옮길 수 있다. 제약이 없으면 최강 궁극기 하나로 수렴할 위험이 있다(아래 함정 참조).
- (해석) FF7 마테리아는 장비에 스킬을 박아 넣고 캐릭터 간에 이동할 수 있게 한 구조다. 이번 설계의 ①②(장비 스킬)는 마테리아형, ③(클래스 풀)는 XC3 마스터 아츠형으로 나뉜다. 즉 "장비=이동 가능한 스킬, 클래스=영구 습득 스킬"의 이원 구조다.

### Gaps
- 클래스 변경 시 마스터 아츠가 넘어가는 세부 규칙(예: 랭크 10 전에 바꾸면 어떻게 되는지)은 위키 차단으로 원문 확인 불가.
- Monolith Soft 개발자 인터뷰의 설계 의도 원문은 미확보.
- FF7 Rebirth의 무기 스킬 숙련(무기 장착 → 스킬 숙련 → 영구 습득, FF9식) 상세는 미수집. 이번 ②무기 스킬 설계와 직접 관련 있으므로 추가 조사를 권장한다.

## Q5. 플레이어·개발자가 보고한 함정

### Takeaway
확인된 함정은 세 가지다. ①버튼이 늘어도 결국 최적 스킬 하나만 쓰게 됨. ②자동 전투가 "결정이 없는 느낌"을 줌. ③가챠 신캐가 약점·기믹을 우회하는 방향으로 강해짐. 정량 데이터나 개발자 사후 분석은 찾지 못했다.

### Cited Findings
- 스킬은 많은데 슬롯이 제한되면 많은 스킬이 바에 남지 않고, 결국 최적 스킬 연타가 된다(ESO 포럼). "40버튼은 필요 없다, 자주 누르는 건 20개 이하면 된다"(FFXIV 포럼) — [ESO forum](https://forums.elderscrollsonline.com/en/discussion/comment/1272119), [FFXIV forum](https://forum.square-enix.com/ffxiv/showthread.php?p=4130831)
- 모바일 ARPG 리뷰: 자동 타깃과 이동·공격이 충돌해 "순수 연타로 전락"(The Relic) — [AppSpy The Relic](https://www.appspy.com/review/4685/the-relic)
- 자동 전투 찬반: "아시아 유저는 자동 없으면 안 함" vs "결정 없이 클릭만 하는 느낌" — [TouchArcade auto battle](https://toucharcade.com/community/threads/auto-battle.285840/)
- Limbus Company: 평소에는 스킬 체인만 고르고 타깃은 자동인 반자동. "유사 자동"이라는 비판도 있다 — [Steam Limbus discussion](https://steamcommunity.com/app/1973530/discussions/0/3771239453236569538)
- HSR: Firefly 등 슈퍼 격파 캐릭터는 약점이 아닌 적에게도 강인도를 깎고 약점을 부여한다. Exo-Toughness는 약점과 관계없이 깎인다. 결과적으로 "약점 맞추기" 편성 퍼즐이 약해진다(사실은 출처의 메커니즘, 평가는 해석) — [mobalytics Firefly](https://mobalytics.gg/blog/honkai-star-rail/firefly-guide/)
- HSR 쪽 대응으로 보이는 장치: 강인도 바를 잠그는 적에게는 Firefly 팀이 약하다고 공략이 명시한다 — [mobalytics Firefly](https://mobalytics.gg/blog/honkai-star-rail/firefly-guide/)
- XC3: 체인 어택과 콤보 타이머 정지로 슈퍼보스를 한 방에 잡을 수 있다는 커뮤니티 평가(GameBreaker 항목). 브레이크 계열 보상이 너무 크면 다른 플레이를 무력화한다는 사례 — [TV Tropes](https://www.tvtropes.org/pmwiki/pmwiki.php/GameBreaker/XenobladeChronicles3)

### Inferences
- (해석) 3인×3버튼에서 가장 큰 위험은 Q5 첫 항목의 "최적 버튼 하나만 연타"다. ③궁극기 풀이 커질수록 메타 궁극기 1~2개로 수렴할 가능성이 높다. 대책으로 생각할 수 있는 것은 다음과 같다. 적 기믹별로 유효한 궁극기를 다르게 한다(브레이크 조건 차별화). 파티 내 중복 금지 규칙을 둔다. 궁극기마다 브레이크/딜/서포트 자원 역할을 분리한다.
- (해석) 가챠 파워 크립이 기믹을 무력화하지 않게 하려면, 브레이크 보상을 "피해 배율"보다 "행동 불능·패턴 파훼·추가 보상(드랍/시간)"에 두는 편이 낫다. 공격 스탯 인플레이션의 영향을 덜 받기 때문이다(HSR의 "격파 피해는 공격력 무관"이 이 원리의 부분 사례). 또 Octopath의 "브레이크 후 선행동 보장"처럼 연속 브레이크 상한을 둬야 한다.
- (해석) 반자동 기본값 제안: ①② 자동(토글로 수동 가능), ③ 수동 + 컷인, 브레이크 상태 진입 시 Arknights식 슬로모션으로 판단 창을 준다. 이렇게 하면 9버튼 부담을 "한순간에 1~3개 결정"으로 줄일 수 있다.

### Gaps
- HoYoverse·Square Enix·Monolith Soft의 공식 인터뷰에서 "버튼 수·결정 피로"를 다룬 원문은 확보하지 못했다(Game Developer/GDC 자료 미검색).
- 모바일 실시간 RPG의 수동/자동 플레이 비율 같은 정량 데이터는 찾지 못했다.
- 스피릿위시의 운영 평가(파워 크립, 서비스 상태)는 나무위키·인벤 접근 실패로 공백.
