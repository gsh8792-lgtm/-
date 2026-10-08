# 가챠/모바일 파티 게임의 그로기(Break/Stun) 역할 분담 설계 사례

> 조사일: 2026-10-08. 조사 환경 제약: WebFetch가 fandom / prydwen / game8 / bluearchive.wiki / hostedgg 등 대부분 도메인에서 egress 차단됨 → **검색 결과 스니펫(요약) 기반**. 원문 전체 확인 불가한 항목은 Gaps에 표시. "[학습지식·미검증]" 표기는 출처 미확보 항목으로 사실(fact)로 쓰지 말 것.

## Q1. 게임별 그로기/브레이크 기여도를 결정하는 요소와 수치

### Takeaway
그로기 기여도는 (a) **속성/타입 일치**(HSR 약점, 블루아카 장갑-공격 상성, 원신 원소 실드), (b) **전용 특성치/역할**(ZZZ 강공 Stun 특성 + 충격력 Impact), (c) **플레이어 실행**(명조 패링·인트로/아웃트로, NIKKE 코어 조준) 중 하나 이상으로 결정된다. 가장 정교한 사례는 HSR(약점 일치 + 캐릭터별 강인성 감소 수치 + 격파 특수효과)과 ZZZ(전용 Stun 역할 + 그로기 시 피해 배율).

### Cited Findings

**Honkai: Star Rail (붕괴: 스타레일)**
- 적은 HP 바 위에 흰색 강인성(Toughness) 바를 가지며, 0이 되면 사용 속성에 따른 약점 격파(Weakness Break) 효과 발생 — [Icy Veins Combat Basics](https://www.icy-veins.com/honkai-star-rail/combat-basics) / [Sportskeeda](https://sportskeeda.com/esports/honkai-star-rail-guide-what-weakness-break-trigger-it)
- 적은 보통 약점 속성 3개를 가지며, 약점 속성 공격은 **추가 피해를 주지 않고 강인성만 깎는다**(약점=그로기 접근권). 7속성: 물리·화염·얼음·번개·바람·양자·허수 — [Honkai: Star Rail Wiki (Damage)](https://honkai-star-rail.fandom.com/wiki/Damage) (검색 스니펫)
- 캐릭터별 강인성 감소량(Toughness Reduction)은 고정 10/20/30이 아니라 **2, 2.5, 3.333, 5, 10, 15, 20, 30, 40** 등 다양. 일반적으로 필살기 > 스킬 > 일반공격 — [HSR Wiki (Toughness)](https://honkai-star-rail.fandom.com/wiki/Toughness) (검색 스니펫)
- 2.3 버전부터 각 일반공격/스킬/필살기의 강인성 감소 수치가 UI에 직접 표기됨(투명성 개선) — [SI.com Videogames](https://videogames.si.com/news/honkai-star-rail-update-2-3-features)
- 격파 시 속성별 효과: 물리=열상(Bleed), 화염=연소(Burn), 바람=풍화(Wind Shear), 번개=감전(Shock), 얼음=동결(Freeze), 양자=얽힘(Entanglement)/허수=속박(Imprisonment) 등 행동 지연 계열 — [Sportskeeda](https://sportskeeda.com/esports/honkai-star-rail-guide-what-weakness-break-trigger-it)
- 격파 피해 공식: [기본 격파값(80레벨 ≈3767)] × [1 + 격파 특수효과(Break Effect)] × [(적 최대 강인성 + 20)/40] × [속성 배율] × 취약·저항·방어·피해감소 계수. 격파 피해는 치명타 불가, 피해 증가 버프 미적용 — [HoYoWiki Weakness Break](https://wiki.hoyolab.com/m/hsr/entry/1099?lang=en-us); [HoYoWiki Break DMG](https://wiki.hoyolab.com/pc/hsr/entry/2522?lang=en-us); 강인성 계수 0.5+강인성/40 표기는 [HSR Wiki Toughness](https://honkai-star-rail.fandom.com/wiki/Toughness) (HoYoWiki 한쪽 표기에 "+2" 오기가 있어 출처 간 불일치 존재)
- 초격파(Super Break): 격파 상태 적에게 가한 **강인성 감소량을 초격파 피해로 변환**하는 격파 피해 변형 — [HSR Wiki Toughness](https://honkai-star-rail.fandom.com/wiki/Toughness). 정확한 공식은 커뮤니티 가이드 간 불일치(BitTopup 두 기사 서로 다름) — [BitTopup](https://news.bittopup.com/news/hsr-super-break-dmg-calculator-complete-formula-guide-3.0)
- 약점 무시/부여(Weakness implant) 예: 반디(Firefly)는 비술(Technique)·강화 스킬로 **화염 약점 부여**(2턴), 4.2 개편 후 강화 스킬이 피격 3체 모두에 부여 — [Prydwen Firefly](https://www.prydwen.gg/star-rail/characters/firefly) / [Mobalytics](https://mobalytics.gg/blog/honkai-star-rail/firefly-guide/) (스니펫)
- 완매(Ruan Mei): 아군 격파 효율(Weakness Break Efficiency) +50%, 격파 시 얼음 격파 피해 60~132% 추가, 격파 회복 지연 — [Game8 Ruan Mei](https://game8.co/games/Honkai-Star-Rail/archives/431762) / [KQM](https://hsr.keqingmains.com/ruan-mei/) (스니펫). 개척자(조화)는 필살기로 초격파 활성화 — Game8 동일
- "격파 피해 캐릭터 일부는 강인성 바의 속성 제한을 무시할 수 있다"(라파 Rappa 등 고유 초격파·강인성 무시) — [Icy Veins](https://www.icy-veins.com/honkai-star-rail/combat-basics); [GosuGamers Rappa](https://www.gosugamers.net/honkai-star-rail/features/73533-honkai-star-rail-2-6-rappa-ultimate-build-guide-plus-her-best-light-cones-relics-and-teammates)
- 더 달리아(The Dahlia, 3.8): 비격파 상태 적이 받는 강인성 감소를 초격파 피해로 변환 → 격파 전에도 초격파 — [Codashop News](https://news.codashop.com/ph/honkai-star-rail-version-3-8-the-dahlia-shakes-penacony-with-super-break-mastery/); [GosuGamers](https://www.gosugamers.net/news/77732-the-dahlia-s-best-build-teammates-light-cones-and-relic-guide-in-honkai-star-rail-version-3-8)

**Zenless Zone Zero (젠레스 존 제로)**
- 6개 특성(Specialty): 강공(Attack), 격파/강타(Stun), 이상(Anomaly), 지원(Support), 방어(Defense), 명파(Rupture) — [HostedGG Specialties Guide](https://hostedgg.com/blog/zenless-zone-zero-specialties-team-roles-guide) (스니펫)
- 그로기(Stun) 상태 적 피해 배율: 통상 **150%(+50%)**, Stun 특성 캐릭터의 그로기 피해 보너스 누적 시 2.5~3배 — [HostedGG Combat Guide](https://hostedgg.com/blog/zzz-combat-mastery-guide) (커뮤니티 수치). 반론: 보스 일부는 200%이며 적마다 배율 상이하다는 유저 보고 — [GameFAQs](https://gamefaqs.gamespot.com/boards/446789-zenless-zone-zero/80806837?page=1). → 150%는 "전형값"이지 고정값 아님
- 그로기 지속 약 4~5초; 공격 중단 시 보스 데이즈(Daze, 그로기 게이지) 초당 약 5% 감쇠 — [HostedGG Combat Guide](https://hostedgg.com/blog/zzz-combat-mastery-guide) (커뮤니티 수치, 미검증)
- 이상(Anomaly) 팀은 전담 Stun 없이 운영하는 경우가 많음: 속성 이상(연소·감전·침식 등) 누적 폭발 피해는 그로기 창과 무관 — [HostedGG Specialties](https://hostedgg.com/blog/zenless-zone-zero-specialties-team-roles-guide)
- 사례: 미야비(Miyabi)–야나기(Yanagi)–리나/소우카쿠 '격변(Disorder)' 팀은 전통 Stun 없이 운용; 대가로 전원 이상 마스터리(Anomaly Proficiency) 육성 부담 — [GameWith](https://gamewith.net/zenless-zone-zero/47581); [Everhem](https://development.everhem.com/zenless-zone-zero-characters-who-you-should-actually-build-right-now-zo3). 반면 미야비–소우카쿠–라이칸(Stun) 팀도 상위 조합 — [Sportskeeda](https://sportskeeda.com/esports/zenless-zone-zero-zzz-miyabi-teams-guide-best-comps-teammates); Icy Veins는 "지원 + (강한 Stun 또는 격변 보조)" 즉 Stun은 선택지로 서술 — [Icy Veins](https://www.icy-veins.com/zenless-zone-zero/hoshimi-miyabi-teams)

**Genshin Impact (원신)**
- 실드형 적의 실드는 HP가 아닌 **원소 게이지 단위(Gauge Units)**를 가지며 반응으로 소모; 물리는 실드에 극히 비효율 — [Genshin Helper Abyss: Shields](https://genshinhelper.gitbook.io/abyss/mechanics/shields) (스니펫)
- 우인단(Fatui) 실드는 일반 원소 상성표를 따르지 않고 **가장 효과적인 원소에만 피해**를 받음 — 동일 출처
- 심연 사도(Abyss Lector)는 번개 실드 → 과부하(Overload) 권장; 심연 전령(Abyss Herald)은 연소·발화(Burgeon) 반응이 빠른 파괴법 — [Sportskeeda 1.5 F12](https://sportskeeda.com/esports/5-tips-clear-spiral-abyss-floor-12-genshin-impact-1-5); [Sportskeeda 3.7](https://sportskeeda.com/esports/best-characters-beat-consecrated-beasts-cryo-hydro-herald-genshin-impact-3-7-spiral-abyss)
- 심연 메이지(Abyss Mage) 실드는 고난도에서 재생이 빠르고 강한 원소 부착 필요 — [GenshinBox](https://genshinbox.com/wiki/enemies-bosses/abyss-mages/)

**Wuthering Waves (명조)**
- 공명 강도/진동 강도(Vibration Strength): 깨지면 적 '행동 불능(Immobilized)'. 일부 가이드는 이것이 유지되는 동안 HP 피해를 감소시키는 실드처럼 작동한다고 서술 — [Game8](https://game8.co/games/Wuthering-Waves/archives/456781); [BuffGet](https://buffget.com/news/wuthering-waves-vibration-strength-stagger-how-to-break-boss-posture-fast-o1l9nx) (후자 커뮤니티)
- 감소 수단: 패링(가장 효율), 인트로/아웃트로 스킬, 회피 반격, 튠 브레이크(Tune Break) — [GameMarket](https://gamemarket.gg/news/wuthering-waves/wuthering-waves-boss-guide-vibration-strength-damage-windows)
- 튠 브레이크(신규 Tunability 시스템): 모든 공명자가 사용 가능한 특수 공격, 고정 피해+진동 강도 감소; 보스 '불협(Mistuned)' 상태에서 발동 — [Game8 Tune Break](https://game8.co/games/Wuthering-Waves/archives/568979); [Sportskeeda](https://www.sportskeeda.com/esports/wuthering-waves-wuwa-reveals-new-tunability-mechanic-ahead-lahai-roi-update)

**Blue Archive (블루 아카이브)**
- 공격 타입 × 장갑 타입 배율 (행=장갑, 열=공격; 일반/폭발/관통/부식(Chemical)/신비/진동):
  - 경장갑(Light): 100/**200**/50/50/100/100
  - 중장갑(Heavy): 100/100/**200**/150/50/50
  - 복합(Composite): 100/100/100/**200**/50/50
  - 특수장갑(Special): 100/50/100/100/**200**/150
  - 탄력장갑(Elastic): 100/50/100/100/100/**200**
  — [Blue Archive Wiki Combat basics](https://bluearchive.wiki/wiki/Combat_basics) (스니펫); 교차확인 [findingdulcinea](https://findingdulcinea.com/blue-archive-character-tier-list/)
- 특정 공격 타입 강화 버프는 해당 타입이 적 약점일 때만 적용 — 동일 출처
- 일반 적·Extreme 이하 총력전 보스는 '일반' 공격 타입(학생 방어 무관). 장갑 상성은 Insane/Torment/Lunatic 총력전에서 결정적 — [bluearchive.gg](https://bluearchive.gg/attack-and-defense-types/); [Wiki 미러](https://bluearchive-wiki.translate.goog/wiki/Combat_basics?_x_tr_sl=en&_x_tr_tl=id&_x_tr_hl=id&_x_tr_pto=tc)

**GODDESS OF VICTORY: NIKKE (승리의 여신: 니케)**
- 버스트 게이지는 **타격 횟수당** 충전 → 광역·다단히트 유닛이 게이지 생성에 유리 — [nikke.gg Team Building](https://nikke.gg/team-building-guide/)
- 게이지 충전 시 버스트 I → II → III 순서로 각 1명씩 발동 후 풀버스트(기본 10초; 미하라 −5초, 모더니아 +5초) — 동일 출처
- 쿨다운: 일부 B1/B2 20초, **B3 전원 40초** → 20초마다 풀버스트하려면 B3 2명 필요; 블랑은 누아르/루주와 짝 없으면 60초 — 동일 출처; [nikke.gg Burst Chains](https://nikke.gg/mastering-burst-chains-the-core-combat-mechanic-every-nikke-player-needs-to-understand/)
- 풀버스트 보너스 기본 +50%; 코어 피격 보너스는 코어에 직접 맞을 때만 적용(대부분 +100%, 즉 200%); 코어 없는 적엔 무효; 데미지 공식에서 코어/풀버스트/치명/적정사거리 보너스는 **같은 가산 브래킷** — [nikke.gg Damage Formula](https://nikke.gg/damage-formula/); [nikke.gg Naga](https://nikke.gg/naga-early-analysis/)

**Arknights (명일방주)**
- 저지 수(Block count) 초과 시 적이 통과; 비행·망령류 등은 저지 불가 — [Arknights wiki.gg Team building](https://arknights.wiki.gg/wiki/Team_building)
- 8개 직군: 캐스터, 디펜더, 가드, 메딕, 스나이퍼, 스페셜리스트, 서포터, 뱅가드. 직군은 주로 배치 칸(근접/원거리)을 결정 — [Arknights wiki.gg Class](https://arknights.wiki.gg/wiki/Class)
- 뱅가드: 저코스트·저지 1~2, DP 생산(회복형/처치 환급형, 차저는 처치 시 1DP, 퇴각 시 코스트 환급); 디펜더: 저지 2~3(결투가형 1), 고코스트·저딜 — 동일 출처 / [Arknights Fandom Class](https://arknights.fandom.com/wiki/Class); 시작 DP 10, 초당 1, 최대 99 — wiki.gg

**Chaos Zero Nightmare (카오스 제로 나이트메어, Smilegate)**
- 엘리트·보스는 실드처럼 작동하는 브레이크다운(Breakdown) 게이지 보유, 소진 전엔 최대 피해·일부 궁극기 불가; 'Tenacity Break/Bullet/Void' 태그 공격이 추가 브레이크다운 피해 — [UltimateGacha](https://ultimategacha.com/chaos-zero-nightmare-combat-tips-mastering-breakdown-stress-system/); [OSLink](https://www.oslink.io/blog/guide/chaos-zero-nightmare-combat-system-and-strategy-guide.html)
- 아군 측 '스트레스 붕괴'도 존재(붕괴 시 카드가 Break Card로 교체, 전체 HP 1/3 손실, 3명 모두 붕괴 시 게임오버) — [UltimateGacha](https://ultimategacha.com/chaos-zero-nightmare-combat-tips-mastering-breakdown-stress-system/)
- 6개 클래스: 스트라이커, 사이오닉, 뱅가드, 레인저, 헌터, 컨트롤러 (가이드 간 설명 불일치); 파트너 클래스 일치 시 시너지 — [OSLink Team Guide](https://www.oslink.io/blog/guide/chaos-zero-nightmare-team-guide.html); [GameWith](https://gamewith.net/chaoszeronightmare/70996)

### Inferences
- 설계 축 분류: HSR·블루아카·원신 = **"키(타입) 기반"**(올바른 타입을 가져오면 누구나 기여 → 특정 1명이 아니라 '타입 풀' 요구), ZZZ = **"역할 기반"**(Stun 특성이 그로기 전문, 하지만 대안 승리 경로 Anomaly 존재), 명조·NIKKE = **"실행/시스템 기반"**(패링·튠 브레이크·코어 조준은 누구나 가능해 역할 강제가 약함).
- HSR은 약점이 '추가 피해'가 아니라 '그로기 접근권'이라는 점이 핵심: 타입 불일치 딜러도 딜은 되지만 격파·행동지연 이득이 사라져 간접적 구성 압력이 생김.
- ZZZ의 150% 대 이상(Anomaly) 독립 피해 구조는 "Stun 없이도 클리어 가능하되 비용(육성 부담)이 다른" 형태로 단일 역할 강제를 회피.

### Gaps
- HSR 개별 보스 강인성 수치, 다중 약점 세트(페이즈별 약점 변화) 구체 사례 원문 미확인(fandom 차단).
- 초격파 정확한 공식 공식 출처 미확보.
- ZZZ 충격력(Impact) 수치 범위, 데이즈 공식, Stun 에이전트별 그로기 피해 보너스(예: 강공/연계 배율) 원문 미확인.
- 원신 우인단 실드별 유효 원소 표, 2.5배 등 반응 배율 원문 미확인. [학습지식·미검증] 4.x 이후 나선비경 외 '환상극(Imaginarium Theater)'은 원소 제한 로스터를 강제함 — 출처 미확보.
- 명조 진동 강도 감소량 캐릭터별 차이, 브레이크 시 추가 피해 배율 미확인.
- CZN 브레이크 수치·클래스별 브레이크 기여도 공식자료 없음.

## Q2. 콘텐츠가 요구조건을 로테이션해 넓은 로스터를 가치 있게 만드는 방식

### Takeaway
주간/시즌 보스가 약점·장갑·원소를 바꾸고, 엔드게임이 2팀(서로 다른 캐릭터)을 요구하며, 장갑별 별도 티켓으로 같은 보스를 3번 공략하게 하는 식으로 "1명 필수"를 희석한다.

### Cited Findings
- HSR 엔드게임 3종(혼돈의 기억 MoC / 허구 이야기 PF / 종말의 환영 AS)에 대해 "방향이 다른 2팀을 키우면 세 모드 모두 커버" — [HostedGG Endgame](https://hostedgg.com/blog/honkai-star-rail-endgame-moc-pf-as-guide)
- AS는 보스 2체 구성(웨이브 아님), 격파 및 정밀 속성 공략을 요구; 보스가 비격파 시 큰 피해감소·격파 시 큰 피해증가 — [Kotaku AS Guide](https://kotaku.com/honkai-star-rail-apocalyptic-shadow-hsr-guide-1851559645); [Prydwen AS](https://www.prydwen.gg/star-rail/apocalyptic-shadow/). 유출된 3.3 라인업 특성 예: 피해감소 50%, 약점 격파 후 받는 피해 +100% (유출 정보) — [Sportskeeda 3.3 leak](https://sportskeeda.com/esports/honkai-star-rail-3-3-leaks-show-apocalyptic-shadow-line-up-buffs)
- AS 코코리아 기믹: 약점을 소환물(얼음 칼날)로 이전, 처치 시 약점 복귀+강인성 감소 / 난이도4 수식 "Tenacious Resolve": 모든 적 피해감소, 단 **보유 약점 종류마다 받는 피해 증가** — [Kotaku](https://kotaku.com/honkai-star-rail-apocalyptic-shadow-hsr-guide-1851559645)
- 블루아카 대결전(Grand Assault): 같은 보스를 **장갑 타입이 다른 3개 버전**으로 공략, 장갑별 티켓 비호환(로그인당 장갑별 1장, 최대 7장), 2개 장갑은 Torment까지·1개는 Insane까지 개방. 시즌 33 쿠로카게 예: 커뮤니티 자료(경·탄력·특수)와 영문 공지(특수·경)가 불일치 — [GameMarket Kurokage GA](https://gamemarket.gg/news/blue-archive/blue-archive-grand-assault-kurokage-guide-teams-tickets-and-counters) (2026-09-05자)
- NIKKE 유니온 레이드: 레드후드는 "두 속성에 강한 최초의 니케"로 스토리/솔로/유니온 레이드에서 중요 → 보스 속성 상성이 로스터 폭을 요구 — [nikke.gg Red Hood](https://nikke.gg/rapi-red-hood-best-builds-teams-and-how-to-play/); 모더니아 코어 팀은 화염 약점 콘텐츠에 극강 — 동일
- 원신 나선비경 상층은 반기마다 적 구성이 바뀌어 특정 실드(번개 실드 사도, 전령 등)에 맞는 원소를 요구 — [Sportskeeda 3.7](https://sportskeeda.com/esports/best-characters-beat-consecrated-beasts-cryo-hydro-herald-genshin-impact-3-7-spiral-abyss)

### Inferences
- 블루아카 대결전은 "같은 보스 × 3장갑 × 별도 티켓"으로 **로스터 폭을 직접 점수화**한 가장 명시적 사례. 단일 만능 캐릭터가 존재할 수 없도록 상성표 자체가 50% 페널티를 보장.
- HSR AS 난이도4의 "약점 종류 수에 비례한 피해 증가"는 다속성 공략을 보상하는 장치로 해석 가능.

### Gaps
- 블루아카 총력전 보스별 장갑 로테이션 일정, 제약 해제 결전 등 원문 미확보.
- HSR MoC 상/하반부 약점 세트 구체 예시 미확보. [학습지식·미검증] MoC/PF/AS 모두 상반부·하반부에 서로 다른 팀(캐릭터 중복 불가)을 요구하고 각 반부 적 약점이 다르게 설정됨.
- ZZZ 위험 강습(Deadly Assault)/시유 방어전(Shiyu Defense)의 2팀 요구·보스별 약점 로테이션 원문 미확보. [학습지식·미검증] 시유 방어전 상층은 2팀(전·후반) 사용, 위험 강습은 보스 3종 각각 다른 팀.

## Q3. 역할 혼합을 강제하는 버스트/체인 시스템 (NIKKE 등)

### Takeaway
NIKKE의 I→II→III 체인은 "각 단계 1명"을 구조적으로 요구하고, B3 40초 쿨 때문에 B3 2명 또는 쿨감 B1이 필요해 역할 혼합이 강제된다. 그러나 이 구조가 각 슬롯의 최적해(리터, 크라운)를 사실상 고정시키는 부작용도 있다.

### Cited Findings
- 체인 순서 강제(B1→B2→B3) + 풀버스트 10초 — [nikke.gg Team Building](https://nikke.gg/team-building-guide/)
- B3 40초 쿨 → 20초 주기 풀버스트엔 B3 2명; 쿨감 B1이 핵심 해결책 — 동일 출처
- 권장 골격: 쿨감 B1(리터) + 증폭 B2(크라운) + 메인딜 B3(레드후드/모더니아); "원시 스탯보다 로테이션 적합성이 중요" — [cow-snake NIKKE Megaguide](https://cow-snake.github.io/nikke-mg/gameplay/team-building/); [HostedGG NIKKE](https://hostedgg.com/blog/nikke-best-characters-guide)
- 리터는 스칼렛·모더니아 등 주류 딜 코어 전반에 최고의 B1 enabler — [LDShop Tier](https://www.ldshop.gg/blog/goddess-of-victory-nikke-gp/tier-list-nikke.html)
- "비쿨감 B1 + 쿨감 B2 조합은 비권장" / 메타 B2들은 "압도적 배율·생존 유틸" — [nikke.gg Crown](https://nikke.gg/crown-best-builds-teams-and-how-to-play/)
- 1-1-2-Flex 등 대안 편성 존재(F2P 가이드) — [BitTopup F2P Burst](https://bittopup.com/article/NIKKE-F2P-Burst-Guide-Master-112Flex-Teams-and-Rotations)
- 명조 인트로/아웃트로 교대가 진동 강도를 깎는 수단 → 교대 플레이 자체가 그로기 기여 — [GameMarket](https://gamemarket.gg/news/wuthering-waves/wuthering-waves-boss-guide-vibration-strength-damage-windows)
- 명일방주: DP 생산(뱅가드)·저지(디펜더)·치유(메딕) 분업이 직군 칸 제약과 DP 경제로 강제 — [Arknights wiki.gg](https://arknights.wiki.gg/wiki/Team_building)

### Inferences
- 체인형 시스템은 '역할 슬롯'은 강제하지만 슬롯 내 경쟁이 약하면 해당 슬롯 최강 유닛이 반필수화 됨(NIKKE 크라운·리터 사례). 슬롯 강제 + 슬롯 내 다양성(쿨감형/버퍼형/실드형 등 대체재) 공급이 함께 필요.

### Gaps
- Shift Up 개발자 인터뷰의 버스트 설계 의도 발언 미확보.

## Q4. 밸런스 결과에 대한 플레이어/개발자 코멘터리 (무엇이 잘못됐나)

### Takeaway
HSR에서는 격파 캐릭터를 경쟁력 있게 만들려 **초격파·약점 부여·강인성 무시** 같은 "범용 브레이크 도구"가 추가되며 약점 시스템의 구성 압력이 약화됐다는 비판이 있고, NIKKE에서는 특정 B2(크라운) 대체불가 평가가 반복된다. ZZZ는 이상(Anomaly)이라는 우회로로 "Stun 필수"를 피했다.

### Cited Findings
- (Reddit 유출 서브 코멘트) 게임이 치명 기반 캐릭터로 출시됐고 조화 서포터로 억지 돌파가 쉬워서, 격파 캐릭터에게 초격파·범용 강인성 피해 같은 "땜질(bandaid)"을 붙여야 경쟁력이 유지된다는 주장; 개발진이 초격파를 늦게 고안했다는 의견 — [r/HonkaiStarRail_leaks mirror](https://lr.ggtyler.dev/r/HonkaiStarRail_leaks/comments/1fbx2jq/rappas_kit_lc_via_dim/lm4003i/?context=3) (커뮤니티 의견, 사실 아님)
- 반디의 약점 부여는 "격파 캐릭터의 유일한 약점을 사실상 공짜로 무시"한다는 비판; 반면 부트힐의 부여는 설계가 더 고려됐다는 평. 다만 AS는 비약점 속성 고저항이라 부여 효과가 제한적이라는 반론 — 동일 스레드 [mirror](https://lr.ggtyler.dev/r/HonkaiStarRail_leaks/comments/1fbx2jq/rappas_kit_lc_via_dim/lm4d35n/?context=3)
- 반론: 격파는 엘리트/보스 행동 방해(안전)+피해 증가를 주므로 모든 DPS에게 선호됨 — 동일 스레드
- 픽률: 2.3 차분화 우주에서 완매 80.39%, 개척자(조화) 69.97%, 반디 68.11% → 격파 서포트 집중 — [Sportskeeda 2.3 DU](https://www.sportskeeda.com/esports/most-popular-characters-honkai-star-rail-2-3-divergent-universe)
- 완매 비술은 시뮬레이션 우주에서 약점 무관 전체 강인성 감소(범용 브레이크 도구) — [Game8 Ruan Mei](https://game8.co/games/Honkai-Star-Rail/archives/431762) (스니펫)
- 반디 2돌파 보너스는 추가 약점 부여로 사실상 사문화되어 재작업됨(4.2) — [Prydwen Firefly](https://www.prydwen.gg/star-rail/characters/firefly) (스니펫)
- NIKKE 크라운: "다른 B2 버퍼가 근접하지 못함, 대체불가" 평가(단일·소규모 사이트) / 단점: ATK 버프가 버스트 사용 유닛에만 적용 — [BitTopup Tier Apr 2026](https://news.bittopup.com/news/nikke-tier-list-april-2026-best-meta-teams-for-pvp-raids-anniversary); [Prydwen Crown](https://prydwen.gg/nikke/characters/crown)
- ZZZ 미야비 격변 팀은 Stun 우회 가능하나 전원 이상 마스터리 요구로 육성 비용이 큼 — [Everhem](https://development.everhem.com/zenless-zone-zero-characters-who-you-should-actually-build-right-now-zo3)

### Inferences
- **"누구나 가능" 실패 패턴**: 약점 부여·초격파 변환·약점 무시(HSR), 전원 사용 가능 튠 브레이크(명조)처럼 그로기 수단을 범용화하면 타입 키 시스템이 무력화된다. HSR은 AS 비약점 고저항·약점 종류 수 보상 같은 콘텐츠측 대응으로 균형을 시도한 것으로 보임.
- **"1명 필수" 실패 패턴**: 슬롯이 하나뿐이고 대체재 간 성능 격차가 크면(NIKKE B2 크라운, HSR 격파팀 완매) 반필수화. 대응책은 (1) 대안 승리 경로(ZZZ Anomaly), (2) 슬롯 내 서로 다른 메커니즘의 대체재, (3) 콘텐츠별 요구 로테이션(블루아카 3장갑).
- 블루아카식 고정 상성표(±100%/−50%)는 범용화 도구가 거의 없어 로테이션 압력이 가장 안정적으로 유지되는 편으로 해석 가능(단, 직접적 커뮤니티 근거는 미확보).

### Gaps
- HoYoverse/Shift Up/Nexon/Smilegate 개발자 인터뷰의 공식 의도 발언 미확보(검색에서 나오지 않음).
- ZZZ Stun 에이전트 파워크립(예: 신규 Stun의 범용성)에 대한 정량 커뮤니티 분석 미확보.
- 원신 실드 기믹에 대한 커뮤니티 불만/개선 이력(예: 실드 적 하향) 미확보.
- 블루아카 특정 학생 반필수화(예: 버퍼 슬롯) 커뮤니티 담론 미확보.
