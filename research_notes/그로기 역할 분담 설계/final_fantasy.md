# Final Fantasy 시리즈의 그로기(Stagger/Break) 역할 분담 설계

> 조사 환경 메모: 이번 세션에서는 finalfantasy.fandom.com, gamefaqs, jegged, strategywiki, game8, gamerguides, kotaku, powerpyx 등 주요 위키/공략 사이트의 본문 직접 열람(WebFetch)이 네트워크 정책으로 차단되었음. 아래 인용은 모두 웹 검색 결과에 노출된 해당 페이지의 발췌문(snippet)에 기반함. 따라서 수치는 원문 문맥 확인이 안 된 상태이며, 출처 간 충돌은 명시함. 출처 없는 내용은 "추론" 또는 "공백(Gaps)"으로 분리함.

## Q1. FF13 / FF13-2 / Lightning Returns: 체인 게이지(Chain Gauge) 구조와 역할(Role)별 기여 — 채우기(Ravager) vs 유지(Commando) vs 보조(Saboteur/Synergist)

### Takeaway
FF13의 브레이크는 "체인 보너스(Chain Bonus, %)를 올리는 축"과 "체인 게이지 타이머(감소 속도)를 붙잡는 축"이 분리되어 있고, Ravager는 전자에 강하지만 후자에 약하며 Commando(및 Saboteur/Sentinel)는 그 반대라서, 혼자서는 빠르고 안정적인 스태거가 어렵게 설계됨. 적마다 스태거 포인트(Stagger Point)와 체인 저항(Chain Resistance, 0~100)이 달라 필요한 역할 비중이 바뀜.

### Cited Findings
**기본 구조**
- 파티가 연속 공격하면 적의 체인 보너스가 오르고, 체인 보너스가 적의 스태거 포인트에 도달하면 즉시 크게 뛰어오르며 대상이 취약 상태가 됨. 스태거 중에는 체인 게이지가 꾸준히 줄지만 체인 보너스는 계속 쌓일 수 있음. 스태거 여부와 무관하게 높은 체인 보너스는 파티 공격 피해를 직접 증가시킴 — [Stagger (Final Fantasy XIII), Fandom](https://finalfantasy.fandom.com/wiki/Stagger_(Final_Fantasy_XIII)) (검색 발췌)
- 체인 보너스는 피해 배율: 기본 피해 1000에 체인 보너스 250%면 2500 피해 — [GameFAQs 게시판](https://gamefaqs.gamespot.com/boards/928790-final-fantasy-xiii/54131313) (검색 발췌)
- 체인 보너스 최대치 999.9%. 일부 적은 스태거 불가(스태거 %가 ---.-%로 표시)지만 체인 게이지는 999.9%까지 올릴 수 있음 — [GameFAQs Advanced Mechanics](https://gamefaqs.gamespot.com/xbox360/950899-final-fantasy-xiii/faqs/80345/advanced-mechanics) (검색 발췌)
- 게이지가 약 90~92% 차면 붉게 깜박이며 "니어 스태거(near stagger)" 상태 표시 — [GameFAQs 게시판](https://gamefaqs.gamespot.com/boards/928790-final-fantasy-xiii/60086005) (검색 발췌, 커뮤니티)
- 선제 공격(Preemptive Strike) 시 모든 적이 스태거 포인트와 무관하게 10초간 니어 스태거 상태가 됨 → 적마다 고유 스태거 포인트가 있다는 것을 방증 — [Fandom Stagger (XIII)](https://finalfantasy.fandom.com/wiki/Stagger_(Final_Fantasy_XIII)) (검색 발췌)

**Ravager vs Commando (채우기 vs 유지)**
- Ravager는 체인 보너스를 가장 빠르게 올리지만 공격마다 체인 게이지 타이머를 많이 늘리지 못함 → 체인이 끊기기 쉬움 — [Fandom Stagger (XIII)](https://finalfantasy.fandom.com/wiki/Stagger_(Final_Fantasy_XIII)); [Jegged: Chains and Staggering](https://jegged.com/Games/Final-Fantasy-XIII/Tips-and-Tricks/Basic/Chains-and-Staggering.html) (검색 발췌)
- Commando·Saboteur·Sentinel의 기술은 체인 보너스를 많이 올리지 않지만 적 게이지가 줄어드는 속도를 늦추는 데 효과적 — [Jegged: Chains and Staggering](https://jegged.com/Games/Final-Fantasy-XIII/Tips-and-Tricks/Basic/Chains-and-Staggering.html) (검색 발췌)
- Ravager(빠른 상승) + Commando(감소 지연) 조합이 가장 안정적인 스태거 방법으로 소개됨. 커뮤니티 권장: 3인이면 Ravager 2 + Commando 1(RAV/RAV/COM, 일명 "Relentless Assault"류), 2인이면 1:1 — [Jegged](https://jegged.com/Games/Final-Fantasy-XIII/Tips-and-Tricks/Basic/Chains-and-Staggering.html); [Steam 토론](https://steamcommunity.com/app/292120/discussions/0/613938693134862452/) (검색 발췌)
- Commando는 스태거된 적을 띄우는 런치(Launch)가 가능 — [Fandom/공략 발췌, FF13-2 기준](https://www.gamerguides.com/final-fantasy-xiii-2/guide/introduction/game-mechanics/attack-chains)
- 스태거 후 피해 기여는 커뮤니티 의견 충돌: "Ravager가 체인 보너스(=배율)를 훨씬 더 올린다" vs "Commando가 타당 피해가 더 크다" — [GameFAQs 게시판](https://gamefaqs.gamespot.com/boards/928790-final-fantasy-xiii/54131313); [GameFAQs 게시판2](https://gamefaqs.gamespot.com/boards/928790-final-fantasy-xiii/74344867)

**스태거 지속 시간**
- 스태거 지속 시간은 스태거 진입 순간에 확정되며 이후 행동으로 바뀌지 않음. 커뮤니티 주장: 진입 시점에 약 18.5초 이상의 지속 값이 있으면 최대 지속(45초) — [Steam 토론](https://steamcommunity.com/app/292120/discussions/0/1637543304828189377) (커뮤니티 주장, 미검증)

**체인 저항(Chain Resistance)**
- 각 적은 0~100의 체인 저항을 가지며 기술의 기본 체인 보너스 상승량을 감소시킴. 저항 100인 적은 기본값으로는 체인 보너스가 오르지 않음(보너스성 가산만 유효). 스태거 진입 시 체인 저항이 0이 되어 게이지가 빠르게 쌓임 — [GameFAQs Advanced Mechanics](https://gamefaqs.gamespot.com/xbox360/950899-final-fantasy-xiii/faqs/80345/advanced-mechanics) (검색 발췌)
- 저항 배율 공식(커뮤니티 해석): (100 − 체인 저항) / 100. 속성 상성에 따라 배율 1(기본) / 0.5(반감·내성) / 0.25(무효·흡수) — [GameFAQs Advanced Mechanics](https://gamefaqs.gamespot.com/xbox360/950899-final-fantasy-xiii/faqs/80345/advanced-mechanics)
- 저항이 매우 높은 적에서만 "교대 공격(alternating sequence)"이 유리 — 보너스 가산이 저항 계산 이후에 붙기 때문 — [Steam 토론](https://steamcommunity.com/app/292120/discussions/0/1637543304828189377) (커뮤니티)

**Saboteur / Synergist**
- Saboteur의 공격은 Commando처럼 적 체인 게이지가 너무 빨리 줄지 않게 막는 부수 효과가 있으나, 피해가 작아 게이지 상승엔 기여가 적음 — [GameFAQs 게시판: What does synergist and saboteur do?](https://gamefaqs.gamespot.com/boards/928790-final-fantasy-xiii/56160016); [Jegged Saboteur](https://jegged.com/Games/Final-Fantasy-XIII/Roles/Saboteur.html) (검색 발췌)
- 디버프 지속 시간 공식(커뮤니티): 기본 지속 × 체인 보너스 + (시전자 마력/100) → 대상의 체인 보너스가 높을수록 디버프가 오래 감(아군 버프에도 적용) — [Jegged Saboteur](https://jegged.com/Games/Final-Fantasy-XIII/Roles/Saboteur.html) (검색 발췌)
- 캐릭터별 Saboteur 분업: Lightning은 방어 하락형 Deprotect/Deshell/Poison/Imperil, Snow는 그것이 없고 Slow/Curse/Daze/Fog/Pain 단일·광역을 가짐(상호 보완) — [Gamer Corner: Snow Saboteur](https://guides.gamercorner.net/ffxiii/crystarium/snow-saboteur)
- Saboteur 역할 레벨 보너스: 디버프 성공률 +15%(Lv I), +30%(Lv II), 파티원의 성공률에도 영향 — [Jegged Saboteur](https://jegged.com/Games/Final-Fantasy-XIII/Roles/Saboteur.html)
- Deprotect/Imperil이 체인 게이지 자체를 직접 올린다는 출처는 찾지 못함. 커뮤니티 운용은 스태거 직전/직후 SAB 3인으로 디버프를 걸고 갱신하는 방식 — [Steam 토론 (FF13-2)](https://steamcommunity.com/app/292140/discussions/0/611698195150672309/)

**FF13-2 / Lightning Returns**
- FF13-2도 Ravager = 스태거 진행도 상승, Commando = 진행도 유지 + 런치의 구조 유지 — [GamerGuides FF13-2 Attack Chains](https://www.gamerguides.com/final-fantasy-xiii-2/guide/introduction/game-mechanics/attack-chains) (검색 발췌)
- Lightning Returns(1인 조작)에서는 역할 분업이 "기술 속성"으로 내재화: 높은 스태거 파워(Stagger Power)로 스태거 웨이브 진폭을 키우는 기술과, 스태거 보존(Stagger Preservation)으로 웨이브를 유지하는 기술이 분리됨. 정확한 타이밍 가드도 스태거를 쌓음 — [Prima Games: Lightning Returns Stagger](https://primagames.com/?p=27764); [Destructoid](https://www.destructoid.com/lightnings-got-some-new-moves-in-lightning-returns/)
- LR 몬스터 도감은 적별 Stagger Point, Stagger Decay, Maximum Wave Preservation, Stagger Duration을 표시 — [Prima Games 도감](https://primagames.com/?p=27766)

**개발 의도**
- Toriyama(디렉터)는 GDC 등에서 목표를 "속도와 전술성을 모두 갖춘 새로운 배틀 시스템", 커맨드 기반 + Paradigm Shift로 전략성 강화라고 설명 — [Game Developer: The Mind and Heart of FFXIII](https://www.gamedeveloper.com/business/the-mind-and-heart-of-i-final-fantasy-xiii-i-); [Siliconera](https://www.siliconera.com/final-fantasy-xiii-director-answers-your-ffxiii-questions/)

### Inferences
- FF13의 핵심은 "상승량"과 "감쇠 지연"이라는 두 개의 독립 변수를 서로 다른 역할에 배분한 것. Ravager만으로는 상승은 빠르나 게이지가 증발하고, Commando만으로는 유지는 되나 상승이 느림 → 자연스럽게 팀 작업이 됨. 동시에 "특정 캐릭터 필수"를 피하는 건 역할이 캐릭터가 아니라 Paradigm(역할 조합)에 묶여 있고, 여러 캐릭터가 같은 역할을 가질 수 있기 때문.
- 체인 저항 0~100, 스태거 포인트 개별화는 "어떤 역할 비율이 최적인가"를 적마다 바꾸는 레버(고저항 적 → 상승형이 덜 유효, 유지·디버프 비중 상승).
- 스태거 지속이 진입 순간 확정되는 구조는 "진입 전 준비(버프/디버프, 체인 높이기)"와 "진입 후 수확(Commando 런치, 고배율 공격)"을 시간축으로 분리시켜 역할 전환(Paradigm Shift) 타이밍을 의미 있게 만듦.
- Lightning Returns는 1인 조작 시 "파워 vs 보존" 분업을 기술 단위로 옮긴 사례 → 팀 분업이 불가능한 구조에서의 대안 모델.

### Gaps
- 체인 게이지의 정확한 감쇠 속도(초 단위), 역할별 체인 보너스 상승 수치(기술별 값), Commando의 타이머 연장량은 원문(위키/GameFAQs 메커닉 가이드) 열람이 차단되어 확인 못함.
- Long Gui, Adamantoise 등 특정 보스의 스태거 포인트·체인 저항 값 미확보.
- Synergist 버프(Faith, Bravery 등)가 체인 상승에 미치는 직접적 공식 효과는 출처 없음(간접적으로 피해량↑ → Ravager 상승량↑로 추정되나 미검증).
- 체인/스태거 설계에 대한 개발자 직접 발언(Toriyama 등) 미발견.
- FF13-2의 몬스터(Feral Link)와 스태거의 상호작용 출처 없음.

## Q2. FF7 Remake / Intergrade / Rebirth: Pressure·Stagger·캐릭터별 도구 (빌더 vs 증폭 vs 수확)

### Takeaway
FF7R은 "적별 고유 Pressure 조건 → Pressured 상태에서 스태거 게이지 가속 → Stagger 시 피해 배율 160% 시작, 특정 기술로 배율 상승"의 3단 구조. Cloud(Focused Thrust)·Barret(Focused Shot)는 게이지 빌더, Tifa는 빌더 겸 배율 증폭자(Unbridled Strength 계열, True Strike), 나머지는 수확(고위력 기술/마법) 역할로 분화. 다만 누구나 일반 공격·약점 속성으로 Pressure와 게이지 축적이 가능해 "특정 캐릭터 필수"는 아님.

### Cited Findings
**Pressure**
- 순수 피해 이외에, 게임 내 모든 적은 고유한 Pressure 조건을 가짐; Assess로 단서 확인 가능 — [SegmentNext / 공략 검색 발췌](https://segmentnext.com/how-to-build-pressure-and-stagger-in-final-fantasy-7-remake/)
- Rebirth: Assess(ATB 1칸)로 스캔하면 노란 글씨로 Pressure 전략이 표시됨. 일반 적 다수는 속성 약점으로 쉽게 Pressure, 일부 보스는 HP 일정량 감소 또는 특정 부위 파괴로 Pressure — [Game8 Rebirth](https://game8.co/games/Final-Fantasy-VII-Rebirth/archives/How-to-Pressure-and-Stagger-Enemies); [Sportskeeda](https://sportskeeda.com/esports/how-pressure-enemies-final-fantasy-7-rebirth) (검색 발췌)
- Pressure는 스태거 게이지를 더 빨리 차게 만드는 상태. 흔한 방법: 약점 속성, 적 공격 가드, 적 기술 회피 — [RPG Site Rebirth Stagger & Pressure Guide](https://www.rpgsite.net/guide/15533-final-fantasy-vii-rebirth-stagger-pressure-guide-quick-tips-for-weakening-foes-getting-them-staggered); [SI.com](https://videogames.si.com/guides/ff7-rebirth-pressure-stagger-enemies)
- 수식적 설명(위키): 행동의 스태거/Pressured rate에 대상의 Stagger Rate Modifier가 곱해지며, 대상이 Pressured면 Pressured Rate가 적용됨 — [Fandom Stagger (VII Remake)](https://finalfantasy.fandom.com/wiki/Stagger_(VII_Remake)) (검색 발췌)

**Stagger**
- 스태거 시 적은 일시적으로 행동 불가, 받는 피해 160%에서 시작 — [SegmentNext](https://segmentnext.com/how-to-build-pressure-and-stagger-in-final-fantasy-7-remake/); [TheGamer](https://www.thegamer.com/final-fantasy-vii-remake-how-to-stagger-enemies/)
- 배율은 160%에서 시작해 충분히 기술을 쓰면 계속 상승 가능 — [PowerPyx](https://www.powerpyx.com/final-fantasy-7-vii-remake-how-to-increase-stagger/) (검색 발췌). 단 실제 상한은 999%로 알려져 있으나 이번 조사에서 출처 확인 못함(Gaps).
- 스태거 게이지가 가득 차면 이후 천천히 줄어들고, 비면 적이 일어나 전투 복귀 — [RPG Site](https://www.rpgsite.net/guide/15533-final-fantasy-vii-rebirth-stagger-pressure-guide-quick-tips-for-weakening-foes-getting-them-staggered)

**캐릭터별 도구**
- Cloud – Focused Thrust: 대형 적 대상 스태거 축적용, Pressured 상태 적에게 쓰는 것이 효율적 — [Fextralife Focused Thrust](https://finalfantasy7remake.wiki.fextralife.com/Focused_Thrust); [Fandom](https://finalfantasy.fandom.com/wiki/Focused_Thrust_(VII_Remake)) (검색 발췌)
- Barret – Focused Shot: ATB 소비량에 따라 위력이 오르고, Pressured 대상에 큰 스태거. 초반 최고의 스태거 기술(2칸 사용 시)로 평가 — [Fandom Focused Shot](https://finalfantasy.fandom.com/wiki/Focused_Shot_(VII_Remake)) (검색 발췌)
- 이름에 "Focused"가 붙은 기술은 스태거 축적용이라는 공략 정리; Cloud Focused Thrust + Barret Focused Shot 조합 권장 — [Steam 토론](https://steamcommunity.com/app/1462040/discussions/0/684112192552838113/) (커뮤니티)
- Tifa – Unbridled Strength: ATB 1칸 소비, 기(chi) 단계를 올려 일반 공격 강화 및 세 무술기 순환 해금. 스태거 배율 상승치: Whirling Uppercut +5%, Omnistrike +25%, Rise and Fall 총 +20% (위키 표기) — [Fandom Unbridled Strength](https://finalfantasy.fandom.com/wiki/Unbridled_Strength_(VII_Remake)) (검색 발췌)
- Tifa – True Strike(Purple Pain 무기 기술): 위력 333, 스태거 배율 증가 +30%, ATB 1칸 — [Fandom True Strike](https://finalfantasy.fandom.com/wiki/True_Strike_(VII_Remake)); [Fextralife](https://finalfantasy7remake.wiki.fextralife.com/True_Strike). **충돌**: 다른 공략은 "True Strike 1회당 +20%"라고 기술 — [SegmentNext 계열 검색 발췌](https://segmentnext.com/how-to-build-pressure-and-stagger-in-final-fantasy-7-remake/)
- 300% 도달 정석: 게이지 50% 전후에 Unbridled Strength 2회로 Rise and Fall 해금 → 스태거 직후 Rise and Fall·Omnistrike·Whirling Uppercut → 다시 Unbridled Strength 2회 후 연타. 이후 다른 캐릭터의 최강 기술/마법으로 수확 — [Game Rant](https://gamerant.com/final-fantasy-7-remake-stagger-200-300-damage-bonus-effect-pt-3-staggering-feat/); [TheGamer](https://www.thegamer.com/final-fantasy-vii-remake-how-to-stagger-enemies/)
- 연습용 대상으로 Fat Chocobo(첫 스태거가 매우 김) 추천 — [GameFAQs Q&A](https://gamefaqs.gamespot.com/ps4/168653-final-fantasy-vii-remake/answers/547302-how-to-rise-percentage-on-staggered-enemy)

**Rebirth 및 Synergy**
- Rebirth에서도 Tifa가 대형 피해와 스태거 모두 최고로 평가; 빠른 공격으로 게이지를 빨리 깎음 — [Siliconera: Best FFVII Rebirth Characters for Each Role](https://www.siliconera.com/best-ffvii-rebirth-characters-for-each-role-in-the-party/)
- Rebirth 300% 트로피 공략: Tifa의 Unbridled Strength와 빠른 공격이 "적절한 서포트가 있으면" 스태거 피해 머신. Titan전 예시에서 Tifa+Aerith Synergy Skill "United Refocus"로 Tifa ATB 충전(선택), Chi Lv1 + Omnistrike 유지, 스태거 후 160%→190%+ — [RPG Site 300% Stagger Guide](https://www.rpgsite.net/guide/15546-final-fantasy-vii-rebirth-300-stagger-guide-how-to-unlock-staggering-success-trophy)
- Tifa, Aerith, Cait Sith가 스태거 배율 증가 수단 보유(Tifa가 최고) — [GameFAQs Rebirth 게시판](https://gamefaqs.gamespot.com/boards/371123-final-fantasy-vii-rebirth/80766896) (커뮤니티)
- Barret은 "가장 쉬운 스태거 축적" 중 하나, 지상·비행 적 모두에 Pressure/스태거 양호 — [Steam 토론](https://steamcommunity.com/app/2909400/discussions/0/599665891568018542/) (커뮤니티)
- Red XIII는 일시적 공격·속도 강화로 스태거 게이지를 크게 깎는다는 평 — [Steam 토론](https://steamcommunity.com/app/2909400/discussions/0/798966340582955726/) (커뮤니티)
- Synergy Skills: ATB 소모 없음, 명중 시 두 캐릭터의 ATB를 동시에 충전. ATB 사용이 Synergy 게이지를 채워 합동기(Synergy Abilities) 해금 — [Kotaku: How Synergy Skills and Abilities Work](https://kotaku.com/final-fantasy-ff7-rebirth-synergy-skills-abilities-1851309980); [Kotaku combat tips](https://kotaku.com/final-fantasy-7-rebirth-combat-synergy-pressured-tips-1851239582)
- 스태거 지속을 연장하는 Synergy Abilities로 Relentless Rush(Cloud+Tifa), Sweet-and-Sour Salvo(Barret+Aerith), Call of the Wild(Red XIII+Tifa)가 한 가이드에 소개됨 — [GamerGuides Synergy Abilities](https://www.gamerguides.com/final-fantasy-vii-rebirth/guide/gameplay/basics/synergy-abilities-guide) (검색 발췌; 다른 출처로 교차 확인 실패)
- 커뮤니티 주장: Hard 모드에서 Genji Gloves 없이는 9999 피해 상한에 걸려 Tifa의 배율 증폭 가치가 떨어짐 — [Steam 토론](https://steamcommunity.com/app/2909400/discussions/0/599665891568018542/) (미검증)

**개발 의도**
- Hamaguchi: "스태거 시스템은 FF13에서 가져왔다", 기반은 원작의 턴제 — [Screen Rant 인터뷰](https://screenrant.com/final-fantasy-7-remake-naoki-hamaguchi-interview-bgs/)
- Hamaguchi: 원작 턴제와 배틀 디렉터 Teruki Endo의 액션 전문성 사이 균형이 핵심 — [Screen Rant](https://screenrant.com/final-fantasy-7-remake-naoki-hamaguchi-interview-bgs/); [Inverse: Rebirth battle director](https://www.inverse.com/gaming/final-fantasy-7-rebirth-battle-system-interview)
- 위키 "Behind the scenes": 스태거는 고위력 커맨드 난사 반복을 막기 위해 도입, 빠르게 스태거시키는 커맨드 vs 준비용 커맨드 사이 선택을 요구 — [Fandom Stagger (VII Remake)](https://finalfantasy.fandom.com/wiki/Stagger_(VII_Remake)) (2차 요약, 개발자 직접 인용 아님)

### Inferences
- FF7R은 FF13의 "상승 vs 유지" 대신 "조건 충족(Pressure) → 축적(Focused 계열) → 증폭(Tifa 배율) → 수확(고위력 기술)"의 직렬 파이프라인으로 역할을 나눔. 각 단계의 최적 담당자가 다르기 때문에 혼자서도 가능하지만 파티 전환(캐릭터 스위칭)이 훨씬 효율적.
- "특정 캐릭터 필수" 회피 장치: (1) Pressure 조건이 마법 약점·가드·회피 등 범용 행동으로 달성 가능, (2) Assess를 누구나 장착 가능, (3) 빌더가 복수(Cloud/Barret/Tifa/Red XIII), (4) 배율 증폭은 필수가 아니라 "보너스"(기본 160%만으로 진행 가능). Tifa는 증폭의 독보적 담당이지만 스태거 자체엔 필수 아님.
- "혼자서 다 한다" 회피 장치: ATB가 제한 자원이라 한 캐릭터가 Pressure·축적·증폭·수확 기술을 모두 연속 사용하기 어렵고, Rebirth의 Synergy Skill(두 명의 ATB 동시 충전)과 Synergy Ability(합동기, 일부 스태거 연장)가 협동 행동에 보상을 줌.
- 적별 고유 Pressure 조건은 "이번 적에는 누구의 어떤 행동이 열쇠인가"를 매번 바꿔, 고정된 1인 최적해를 깨뜨리는 역할.

### Gaps
- 스태거 배율 상한(999%로 알려짐), 스태거 기본 지속 시간, Pressured 시 축적 배율의 정확한 수치 미확인.
- True Strike 증가량(+30% vs +20%) 출처 충돌 미해결.
- Rebirth에서 스태거 연장 Synergy Ability 목록은 단일 출처(GamerGuides 발췌)뿐이라 교차 확인 안 됨.
- Pressure·Stagger 설계 의도에 대한 Hamaguchi/Endo의 직접 발언(왜 적별로 다른 조건인지)은 찾지 못함.
- 커뮤니티의 "누구나 혼자 스태거 가능한가" 실측 비교 자료 없음.

## Q3. FF16: 1인 조작 전투의 스태거(Will Gauge)와 Torgal

### Takeaway
FF16은 Clive 1인 조작이라 역할 분담은 "파티"가 아니라 "Clive가 장착한 Eikon 기술 간 분업"으로 옮겨감: 일부 기술은 Will 게이지 감소(축적), 일부는 스태거 중 배율 상승(최대 1.5배)에 특화. Torgal·AI 동료의 스태거 기여는 정량 자료가 없고 보조적.

### Cited Findings
- 보스 HP 아래 노란 바가 Will Gauge; 완전히 깎으면 스태거. 50%까지 줄면 경직되어 현재 행동이 캔슬됨 — [Jegged FF16 Combat Tutorial](https://jegged.com/Games/Final-Fantasy-XVI/Tips-and-Tricks/Basic/Combat-Tutorial.html); [Samurai Gamers Will Gauge Guide](https://samurai-gamers.com/final-fantasy-xvi-ff16/will-gauge-and-takedown-guide/) (검색 발췌)
- 스태거된 적을 공격하면 피해 배율이 쌓이며 최대 1.5배; 스태거 중 명중 횟수에 따라 상승 — [Push Square: FF16 Combat Tips](https://www.pushsquare.com/guides/final-fantasy-16-combat-tips-13-things-i-wish-i-knew-before-playing); [Wikipedia FFXVI](https://en.wikipedia.org/wiki/Final_Fantasy_XVI)
- 일부 보스는 특정 HP 임계점에서 스태거 콤보 도중에도 HP가 더 이상 줄지 않음(페이즈 보호) — [Jegged](https://jegged.com/Games/Final-Fantasy-XVI/Tips-and-Tricks/Basic/Combat-Tutorial.html)
- 기술별 분업: Diamond Dust(Shiva) – 스태거된 적에 쓰면 배율을 1.5배로 즉시 최대화, 비스태거 적에는 적정 거리에서 Will 게이지 약 절반 감소. Gouge(Garuda) – Will 게이지에 큰 피해, 높은 Stagger 수치로 배율 상승도 빠름. Will-o'-the-Wykes + Lightning Rod로 배율을 1.5로 빠르게 올림 — [Fandom Diamond Dust](https://finalfantasy.fandom.com/wiki/Diamond_Dust_(Final_Fantasy_XVI)); [Fandom Gouge](https://finalfantasy.fandom.com/wiki/Gouge_(Final_Fantasy_XVI)); [Wccftech](https://wccftech.com/how-to/final-fantasy-xvi-what-are-the-best-abilities-to-maximize-damage-during-stagger/)
- 정석: Zantetsuken 후 Gigaflare로 한 스태거 내 50,000 피해 트로피 — [DualShockers](https://www.dualshockers.com/ff16-50k-stagger-damage-guide/)
- 패리·Precision Dodge(정밀 회피)도 스태거 바를 크게 깎음; 정밀 회피는 잠시 시간을 늦춤 — [Destructoid: Parrying](https://destructoid.com/how-to-parry-attacks-in-final-fantasy-xvi-ff16)
- 동료는 AI 조작, Clive만 조작 — 플레이어가 Clive에 집중하게 하려는 의도(Yoshida, IGN 인터뷰 요약) — [Wikipedia FFXVI](https://en.wikipedia.org/wiki/Final_Fantasy_XVI); [Goodreads 재게시 기사](https://www.goodreads.com/author_blog_posts/22658735-ffxvi-confirms-ai-controlled-party-members-no-open-world-and-more)
- Torgal은 커맨드(Sic 등)로 특수 공격·회복. 공략은 스태거 후 Sic을 연타하라고 권장(정밀 회피 직후 Sic → Precision Sic). Torgal의 Will 게이지 기여 정량 자료 없음 — [WePC: How to command Torgal](https://www.wepc.com/gaming/final-fantasy-16-command-torgal/); [Exputer Torgal](https://exputer.com/guides/final-fantasy-16-torgal)

### Inferences
- FF16은 "축적 기술(Gouge, Diamond Dust 비스태거 사용)" vs "배율 증폭 기술(Diamond Dust 스태거 중, Will-o'-the-Wykes+Lightning Rod)" vs "수확 기술(Zantetsuken, Gigaflare)"로 FF7R 파이프라인을 1인 로드아웃 내부로 압축한 형태. 장착 Eikon 3개 제한 + 쿨다운이 "한 빌드로 모든 걸 최적" 하지 못하게 하는 장치.
- 배율 상한이 1.5배로 FF13(999.9%)·FF7R(160%~)보다 훨씬 낮아, 스태거가 "팀 폭딜 창구"보다 "액션 리듬의 보상 창구"로 설계된 것으로 보임.
- Torgal은 팀 그로기 기여보다 스태거 창 중 추가 타수(배율이 타수 기반이므로)를 제공하는 보조 역할로 해석 가능 — 단 정량 근거 없음.

### Gaps
- Will 게이지 회복 속도, 스태거 기본 지속 시간, 기술별 Stagger 수치표 미확보.
- Torgal·동료 AI(Jill, Cid 등)의 Will 게이지 기여량 출처 없음.
- 스태거 설계에 대한 개발진(전투 디렉터 Ryota Suzuki 등) 직접 발언 미발견.

## Q4. 공통 설계 원리: "혼자서 다 깬다"와 "특정 캐릭터 필수"를 동시에 피하는 방법 (FF12 포함)

### Takeaway
FF 시리즈는 그로기를 (a) 서로 다른 변수(상승량/유지·감쇠/배율/조건)로 분해하고 (b) 각 변수를 다른 역할·기술에 배정하되 (c) 그 역할을 복수의 캐릭터가 수행 가능하게 하여, 팀 작업을 유도하면서 특정 캐릭터 의존을 피함. FF12에는 스태거 시스템 자체가 없어 직접 비교 대상은 아님.

### Cited Findings
- FF13: 상승(Ravager)과 감쇠 지연(Commando/Saboteur/Sentinel)이 역할로 분리됨 — [Jegged](https://jegged.com/Games/Final-Fantasy-XIII/Tips-and-Tricks/Basic/Chains-and-Staggering.html)
- FF7R: 스태거는 FF13에서 가져온 시스템(Hamaguchi) — [Screen Rant](https://screenrant.com/final-fantasy-7-remake-naoki-hamaguchi-interview-bgs/); 적별 고유 Pressure 조건 — [SegmentNext](https://segmentnext.com/how-to-build-pressure-and-stagger-in-final-fantasy-7-remake/)
- Lightning Returns: 1인 조작에서 Stagger Power vs Stagger Preservation 기술 분리 — [Prima Games](https://primagames.com/?p=27764)
- FF16: 스태거 배율 최대 1.5배, 타수 기반 — [Push Square](https://www.pushsquare.com/guides/final-fantasy-16-combat-tips-13-things-i-wish-i-knew-before-playing)

### Inferences
- 비교 요약(해석):
  | 게임 | 올리기(Raise) | 유지(Hold) | 증폭(Amplify) | 수확(Exploit) | 1인 vs 팀 |
  |---|---|---|---|---|---|
  | FF13 | Ravager | Commando/Saboteur/Sentinel (감쇠 지연) | Saboteur 디버프(Deprotect/Imperil 등), Synergist 버프 | Commando(런치), 체인 보너스 자체가 배율 | Paradigm 단위 팀 필수에 가까움 |
  | FF7R/Rebirth | Pressure 조건 충족 + Focused 계열(Cloud/Barret) | 명시적 유지 역할 없음; Synergy Ability 일부가 스태거 연장(단일 출처) | Tifa(Unbridled Strength, True Strike), Aerith/Cait Sith 일부 | 고위력 Limit/기술/마법 | 혼자 가능하나 ATB 제약으로 스위칭이 효율적 |
  | Lightning Returns | Stagger Power 기술 | Stagger Preservation 기술 | — | 스태거 중 공격 | 1인, 기술 슬롯 분업 |
  | FF16 | Gouge 등 Will 피해 기술, 패리/정밀 회피 | — | Diamond Dust 등 배율 1.5 도달 | Zantetsuken/Gigaflare | 1인, Eikon 로드아웃 분업 |
- "특정 캐릭터 필수"를 피하는 공통 패턴: 역할을 캐릭터가 아닌 기능(Role/기술 태그 "Focused")에 붙이고 복수 캐릭터에 분산. 유일한 예외적 집중은 FF7R Tifa의 배율 증폭인데, 이는 스태거 성립 조건이 아니라 "선택적 보너스"로 위치시켜 필수화를 피함.
- "혼자 다 깬다"를 피하는 공통 패턴: (1) 상승과 유지를 상충 관계로 묶기(FF13), (2) 제한 자원(ATB) + 단계별 최적 기술 분산(FF7R), (3) 적별 조건 다양화(FF7R Pressure, FF13 체인 저항/스태거 포인트), (4) 협동 행동 보상(Rebirth Synergy).
- FF12(Gambits): 스태거/브레이크 시스템은 없고, 대신 "Chain"(같은 종류 적 연속 처치로 드롭 품질 상승) 개념만 존재하는 것으로 알려져 있음 — 본 조사에서 출처 미확보이므로 참고용 추론. Gambit은 역할 분업을 AI 규칙으로 자동화한다는 점에서 FF13 Paradigm의 전신으로 볼 여지가 있음(해석).

### Gaps
- FF12의 Chain·Gambit과 스태거 계열의 관계에 대한 출처 미확보.
- 시리즈 차원의 "팀 그로기" 설계 철학에 대한 Square Enix 개발자의 명시적 발언은 찾지 못함(Hamaguchi의 "FF13에서 가져옴" 발언이 유일한 직접 연결 고리).
- 주요 위키 원문 열람 불가로 모든 수치는 검색 발췌 수준의 신뢰도이며, 보고서 작성 시 "커뮤니티/위키 기준"임을 명시할 필요.
