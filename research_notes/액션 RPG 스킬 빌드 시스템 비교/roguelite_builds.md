# 로그라이트/로그라이크 스킬·빌드 시스템 비교 (Hades 1·2, Slay the Spire, Darkest Dungeon 1·2)

> 조사 환경 메모: 이번 조사에서는 위키 원문(fandom, wiki.gg, fextralife, maxroll, gamespot, primagames, rogueranker)에 대한 직접 페이지 조회(WebFetch)가 네트워크 정책으로 모두 차단되었다. 따라서 아래 "Cited Findings"는 웹 검색 결과에 노출된 해당 출처의 발췌/요약에 근거한다. 수치는 출처 간 차이가 있을 수 있으며, 차이가 확인된 경우 명시했다. 출처로 확인하지 못한 내용(학습 지식 기반)은 "Gaps"에 **[미검증]** 표기로 분리했다.
>
> 대상 설계: 모바일 실시간 3인 파티 전략 RPG. 무기→스킬②, 방어구→스킬① + 랜덤 네임드 패시브(아이템 등급 이하에서 랜덤 등급), 궁극기③는 클래스 레벨 10마다 1개씩 해금되는 풀에서 선택·교체 가능.

## Hades 1/2 — 슬롯형 부운(Boon), 등급, 듀오/레전더리, 해머, 아스펙트, 메타 진행

### Takeaway
Hades는 "고정된 소수의 입력 슬롯(공격/특수/캐스트/대시 등)에 신(神) 정체성을 가진 부운을 덮어씌우는" 구조로, 슬롯 하나에 부운은 하나만 들어가므로 선택이 곧 포기다. 등급(Common→Rare→Epic→Heroic)은 같은 효과의 수치 배율을 올리고, 듀오/레전더리는 "특정 부운 보유"라는 전제조건으로 시너지를 보상하며, 다이달로스 해머는 런당 소수(기본 2개)만 얻는 "무기 동작 변형" 업그레이드다. 메타 진행은 아스펙트(무기 변형 버전)와 Hades 2의 아르카나 카드(코스트 제한 Grasp)로 이루어진다.

### Cited Findings
**부운 등급·선택지**
- 부운 상호작용 시 해당 신이 등장해 대사를 한 뒤 3개(또는 그 이상)의 부운이 표시되고, 그중 1개를 선택한다(Hades 1). — [Pom of Power (BreezeWiki 미러, Hades Wiki)](https://breezewiki.discard.no/hades/wiki/Pom_of_Power)
- Hades 1 부운 등급 수치 예시(Sweet Surrender): Common = 약화 대상 피해 +10%, Rare = 배율 1.3~1.5, Epic = 2.0~2.5, Heroic = 2.5~2.7. — [Sweet Surrender (Hades Fextralife Wiki)](https://hades.wiki.fextralife.com/Sweet+Surrender); 다른 부운(Sunken Treasure)은 Rare 1.3~1.5, Epic 2.0~2.2로 부운마다 배율 폭이 다름 — [Sunken Treasure (Hades Fextralife Wiki)](https://hades.wiki.fextralife.com/Sunken+Treasure)
- 등급(rarity)은 부운의 "기본(base) 성능"을 정하고, 레벨은 랭크별 증가분이다(얼리액세스 당시 가이드로 Heroic 이전 기술). — [PC Invasion Hades boon guide](https://www.pcinvasion.com/hades-guide-olympian-god-boons-skills/2/)
- Heroic은 Hades 1에서 1티어 스킬(공격/특수/캐스트 등) 부운의 최고 정규 등급; 해당 슬롯 부운이 이미 Epic이어야 이후 만나는 신이 Heroic 대체 부운을 제시할 수 있으며 이는 RNG에 의존. — [Prima Games: Heroic, Legendary, Duo boons](https://primagames.com/gaming/hades-guide-legendary-heroic-duo-boons)
- Hades 2 정규 등급: Common, Rare, Epic, Heroic. 그 위에 Duo, Legendary, Infusion이 특수 등급으로 존재하며 Pom으로 업그레이드 불가. — [Rogue Ranker: Hades 2 Boons Guide](https://rogueranker.com/hades-2-boons/) (검색 결과 요약 기반)

**Pom of Power(레벨업)**
- Pom은 부운 1개의 레벨을 올림. Infernal Gate, Styx 엘리트 방 보상 또는 Charon 상점(300 Obol)에서 얻은 Pom은 2레벨 상승. 같은 부운에 Pom을 반복 적용하면 효율이 체감(diminishing). — [Pom of Power (Hades Wiki 미러)](https://breezewiki.discard.no/hades/wiki/Pom_of_Power)
- Hades 2: Pom of Power는 보유 부운 중 최대 3개 후보 중 1개를 골라 레벨업, Pom Slice는 무작위 부운 1개 레벨업. — [Rogue Ranker: Hades 2 Boons Guide](https://rogueranker.com/hades-2-boons/) (검색 요약)

**듀오·레전더리**
- 듀오 부운은 두 신을 결합하며, 두 신 각각의 특정 부운을 이미 보유해야 등장. 두 신 중 누구에게서든 받을 수 있고 획득 시 두 신 간 대화가 발생. — [Prima Games: What are Duo Boons](https://primagames.com/tips/hades-what-are-duo-boons-how-get-duo-boons)
- 레전더리 부운은 신 1명에 귀속, 신마다 최소 1개, 해당 신의 특정 부운(들)을 보유해야만 제시됨. — [Hades Wiki (Boons)](https://hades.fandom.com/wiki/Boons?oldid=6594); [Prima Games](https://primagames.com/gaming/hades-guide-legendary-heroic-duo-boons)
- Hades 1: Darkness를 God's Legacy(거울 능력)에 투자하면 Legendary/Duo 등장 확률 증가. Hades 2: 아르카나 카드로 듀오 등장률을 올릴 수 있으나 전제조건 충족 시에만 효과. — [Prima Games](https://primagames.com/gaming/hades-guide-legendary-heroic-duo-boons); [Rogue Ranker](https://rogueranker.com/hades-2-boons/) (검색 요약)

**다이달로스 해머(Daedalus Hammer)**
- Hades 1: 런당 통상 2개까지만 획득, 효과는 중첩. Anvil of Fates(카오스/스틱스 아이템)는 해머 업그레이드 1개를 무작위 제거하고 무작위 2개를 부여해 런당 3개까지 가능. — [Hades Wiki: Daedalus Hammer](https://hades.fandom.com/wiki/Daedalus_Hammer); [Hades Wiki: Anvil of Fates](https://hades.fandom.com/wiki/Anvil_of_Fates)
- 해머 선택지는 리롤 불가, 일부 업그레이드는 상호배타적이라 획득할수록 후보 풀이 줄어듦. 업그레이드는 무기별로 다르며, 사소한 조정부터 무기의 플레이스타일 자체를 바꾸는 것까지 있음(공격 패턴 변경, 상태이상 추가 등). 런 한정이며 사망 시 소실. — [Hades Wiki: Daedalus Hammer](https://hades.gamepedia.com/Daedalus_Hammer); [PC Invasion items guide](https://www.pcinvasion.com/hades-items-guide-nectars-keys-ambrosia-titan-blood-and-more/2)
- Hades 2: 6종 Nocturnal Arms 각각 고유 해머 풀을 가짐. Icarus의 Invention으로 해머 업그레이드 1개를 그날 밤(런) 한정 Rank II로 강화 가능. — [Rogue Ranker: Hades 2 Daedalus Hammer Guide](https://rogueranker.com/?p=12468) (검색 요약)

**아스펙트(Aspect, 무기 변형 메타 진행)**
- Hades 1: 무기마다 아스펙트 4개(3개 공개 + 1개 숨김), 각 아스펙트는 5레벨, Titan Blood로 해금·강화. 숨김 아스펙트(Arthur, Beowulf, Gilgamesh, Guan Yu 등)는 그리스 신화 밖의 영웅에 연결되며, 먼저 Eternal Spear의 Aspect of Guan Yu를 공개(reveal)해야 함 — 이후 각 무기 아스펙트에 Titan Blood 투자 → 특정 인물과 대화 → "waking phrase"로 공개. — [Shacknews: How to unlock hidden Aspects](https://shacknews.com/article/121824/how-to-unlock-hidden-aspects-hades); [RPG Site: Infernal Arms & Aspects guide](https://www.rpgsite.net/feature/10254-hades-infernal-arms-weapon-aspects-guide-every-weapon-aspect-and-upgrade)
- 출처 충돌: Shacknews는 Guan Yu "해금(unlock)"이 필요하다고, Reddit 가이드는 "공개(reveal)"만 필요하며 Guan Yu에 Titan Blood 투자는 불필요하다고 기술. — [Shacknews](https://shacknews.com/article/121824/how-to-unlock-hidden-aspects-hades) vs [r/HadesTheGame](https://pol1.lr.ggtyler.dev/r/HadesTheGame/s/4Vf501WveC)

**Hades 2 Hex(셀레네, 궁극기 유사 슬롯)**
- Hex는 상시 패시브가 아니라 런 중 Magick을 소모하며 충전되고, Omega 기술 사용으로 충전, 준비되면 멜리노에 머리 위에 초승달 아이콘이 표시되고 Hex 버튼으로 발동. Hex마다 비용이 다름(예: Lunar Ray 30, Phase Shift 130, Twilight Curse 140 Magick). — [GameSpot: Selene Boons and Path of Stars](https://GameSpot.com/articles/hades-2-selene-path-of-stars-guide/1100-6523317/); [Maxroll Hex guide](https://maxroll.gg/hades-2/guides/hades-2-hex-guide) (검색 요약)
- 이후 셀레네와의 조우에서 Path of Stars(선택한 Hex 전용 스킬트리) 포인트 획득. Moon Beam 키프세이크 장착 시 Path of Stars +1. Hex와 업그레이드는 런 간 이월되지 않음. — 동 출처
- 출처 충돌: 포인트 수치가 GameSpot(달 모양별 0/1/2)과 Maxroll(선택지별 3/4/5, 2024-09 얼리액세스 기준)에서 다름. — [GameSpot](https://GameSpot.com/articles/hades-2-selene-path-of-stars-guide/1100-6523317/) vs [Maxroll](https://maxroll.gg/hades-2/guides/hades-2-hex-guide)

**Hades 2 아르카나 카드(Arcana, Altar of Ashes)**
- v1.0 기준 총 25장. Altar of Ashes에서 자유롭게 활성/비활성. 동시에 활성화 가능한 장수는 Grasp(코스트 한도)가 제한, Grasp는 10에서 시작해 Psyche로 최대 30까지 확장. 카드 코스트는 대략 1~5(코스트 0의 Awakening 카드는 조건 충족 시 자동 발동). 전체 코스트 합이 56이라 최대 Grasp 30에서도 전부 켤 수 없음. 처음엔 9장만 보이고, 해금 시 격자상 인접 카드가 공개. — [Maxroll: Hades 2 Arcana guide](https://maxroll.gg/hades-2/guides/hades-2-arcana-guide); [Rogue Ranker: Arcana Cards](https://rogueranker.com/hades-2-arcana/) (검색 요약; 얼리액세스 시절 작성 가이드 포함)

**설계 의도(개발자 발언)**
- Greg Kasavin: "replayability was a foremost goal on Hades"; Slay the Spire의 덱빌딩 다양성을 참고 사례로 언급("Each character has a fundamentally different play style on top of all the other play styles you can use by building your deck"); 로그라이크의 재미는 난이도가 아니라 "the game can surprise you over and over again". — [GameSpot feature: Hades changes what it means to be a roguelike](https://gamespot.com/articles/hades-changes-what-it-means-to-be-a-roguelike/1100-6483420/); [Amara 자막(How Hades's Genius Design Keeps You Engaged)](https://amara.org/videos/8d0Rd4ibbKQz/en/3318737)
- PC Gamer: 부운 시스템은 Transistor의 Function 시스템을 확장한 것처럼 보인다(평론가 해석). — [PC Gamer](https://www.pcgamer.com/uk/a-journey-through-early-access-helped-make-hades-a-masterpiece/)

### Inferences
- **슬롯 점유 = 정체성 고정**: Hades에서 "공격 슬롯에 제우스"를 넣으면 다른 신의 공격 부운은 배제된다. 귀 프로젝트의 "무기→스킬②, 방어구→스킬①" 구조는 이미 슬롯 점유형이므로, 장비에 "속성/신 태그"(예: 화염·번개)를 달면 Hades식 정체성-시너지(듀오) 설계를 그대로 이식할 수 있다.
- **등급 = 같은 효과의 배율**: Hades 등급은 효과 종류가 아니라 수치 배율을 바꾼다(Common 대비 Epic ≈ 2배 이상). 방어구 랜덤 패시브의 "등급 상한 = 아이템 등급" 규칙과 정합적이며, 같은 이름 패시브가 등급별 수치만 다르게 하는 편이 학습 비용이 낮다.
- **전제조건형 상위 보상(듀오/레전더리)**: "A 태그 패시브 + B 태그 스킬 보유 시에만 등장/발동하는 특수 패시브"를 두면 3인 파티 내 교차 시너지(영웅 간 듀오)를 만들 수 있다. Hades 2 아르카나처럼 "전제조건을 충족했을 때만 확률을 올려주는" 메타 보정이 가챠 피로를 줄이는 장치로 참고 가능.
- **변형(transformation) 업그레이드는 희소하게**: 해머는 런당 2개, 리롤 불가, 상호배타. 무기 동작을 바꾸는 업그레이드를 장비 강화/각성 단계의 "희소 분기점"으로 두면 수치 강화와 차별화된다.
- **Hex ≈ 궁극기③**: Hades 2 Hex는 자원(Magick) 소모로 충전되는 1개 슬롯 + 전용 소형 트리(Path of Stars)라는 점에서 "클래스 레벨로 해금되는 궁극기 풀 중 1개 장착" 구조와 가장 가깝다. 궁극기별로 소형 강화 트리를 붙이면 교체 시 손실/재투자 결정이 생긴다.
- **코스트 한도형 메타 로드아웃(Grasp)**: 전체 코스트 56 > 최대 Grasp 30이라 "모두 켜기"가 불가능하게 설계된 점은 궁극기·패시브 슬롯의 코스트 예산화에 차용 가능.

### Gaps
- 직접 위키 조회가 차단되어, Hades 1 부운 슬롯 정확 목록·Call(소환)·Keepsake 레벨업 조건·Pact of Punishment 세부 수치는 출처로 확인하지 못함.
- **[미검증]** Hades 1 부운 슬롯: Attack, Special, Cast, Dash, Call(각 1개) + 슬롯 비점유 패시브 부운. Hades 2: Attack, Special, Cast, Sprint, Magick 회복(Gain) 슬롯 + Hex(셀레네) 1개.
- **[미검증]** Hades 1 리롤: Mirror of Night의 Fated Persuasion(부운 선택지 리롤, 최대 4회), Fated Authority. 문(보상 종류) 리롤은 별도. Hades 2는 Death Defiance류·리롤이 아르카나/인센스 등으로 재구성됨.
- **[미검증]** Pact of Punishment: 최대 Heat 64(조건 15종 내외), 무기별 Heat 단계 보상(Bounty: Titan Blood, Diamond, Ambrosia), Extreme Measures 등 "보스 패턴 변형" 조건. Hades 2의 대응 시스템은 Oath of the Unseen(Fear)과 Vow. 정확 수치는 확인 필요.
- **[미검증]** Keepsake: 각 키프세이크는 장착 상태로 일정 횟수 조우(25/50 encounters)로 레벨 업, 바이옴마다 교체 가능(Hades 1). 검색 결과에서 25회 조건 확인 실패.
- Hades 2 정식 출시(2025-09) 이후의 등급 수치·아르카나 코스트 변경 여부는 확인 못함 — 인용 수치 일부는 얼리액세스 시점 기준.

## Slay the Spire — 카드 등급, 렐릭 시너지, 아키타입, 저주, 보스 렐릭 트레이드오프

### Takeaway
Slay the Spire는 "보상 시 3장 중 1장 고르기(또는 건너뛰기)" + 등급 확률 보정(pity) + 저주(덱 오염)로 덱의 품질을 관리하고, 보스 렐릭은 "+1 에너지 대신 명확한 패널티"라는 강력한 트레이드오프로 런의 방향을 꺾는다. 개발사는 지표(metrics) 기반 밸런싱으로 "모든 카드에 자리가 있게" 하는 것을 목표로 했다.

### Cited Findings
- 카드 보상의 각 카드는 개별적으로 굴려지며, 먼저 등급을 정한 뒤 해당 등급에서 카드를 무작위 선택. 일반 전투 기본 확률 ≈ Common 60% / Uncommon 37% / Rare 3%; 엘리트는 Uncommon/Rare 쪽으로 이동; 보스 보상은 Rare만. — [Slay the Spire Wiki: Card Rewards](https://slay-the-spire.fandom.com/wiki/Card_Rewards)
- 숨은 레어 보정치: -5%에서 시작, Common이 굴려질 때마다 +1%, 레어가 나오면 리셋, 최대 +40%(pity 시스템). — [Slay the Spire Wiki: Card Rewards](https://slay-the-spire.fandom.com/wiki/Card_Rewards)
- 등급 시각 구분: Common 회색, Uncommon 파랑, Rare 금색 배너/프레임; Special 카드는 일반 드롭 불가(이벤트 등 전용). 각 캐릭터는 고유 카드 풀을 가짐. 각 Act의 첫 층에서는 (예외 제외) Rare가 등장하지 않음. — [slaythespire.wiki.gg: Card](https://slaythespire.wiki.gg/wiki/Card); [Cards](https://slaythespire.wiki.gg/wiki/Cards)
- 저주(Curse): 일반 카드 보상에 나오지 않으며, 이벤트 등에서 덱에 추가되는 사용 불가 카드로, 다른 수단으로 제거할 때까지 덱에 남음. Ascender's Bane, Pride, Necronomicurse는 "Curse"가 아닌 "Special" 등급으로 분류되어 "저주 획득" 무작위 풀에서 제외됨. — [Slay the Spire Wiki](https://slay-the-spire.fandom.com/wiki/Cards); [Steam 토론](https://steamcommunity.com/app/646570/discussions/1/3104564981109870883)
- 보스 렐릭 트레이드오프 예시: Fusion Hammer는 매 턴 +1 에너지 대신 휴식처에서 카드 강화 불가 — 커뮤니티에선 "가장 덜 아픈 패널티"로 평가. Ectoplasm·Runic Dome은 획득 즉시부터 최종 Act까지 부정적 영향이 지속되어 최악으로 평가하는 의견 존재. Coffee Dripper는 전략 전체 수정을 요구. Busted Crown은 2024 패치에서 카드 선택지 감소가 2→1로 완화. "+1 에너지는 대부분 패널티를 감수할 가치"라는 플레이어 평가. — [PocketGamer relics](https://www.pocketgamer.com/slay-the-spire/relics/); [Steam 토론 1](https://steamcommunity.com/app/646570/discussions/0/594015574338624970); [Steam 토론 2](https://steamcommunity.com/app/646570/discussions/0/2650805212058485290); [Steam changelog](https://steamcommunity.com/sharedfiles/filedetails/changelog/2382014418?p=1)
- GDC 2019 Anthony Giovannetti, "'Slay the Spire': Metrics Driven Design and Balance" — 얼리액세스 기간 내내 데이터 기반 개발(카드 픽률·승률 등)을 활용. 요약: 모든 카드가 자리를 가져야 하고 과도한 효과를 피해 다양한 전략을 유지. — [GDC news](https://gdconf.com/news/learn-slay-spires-successful-metrics-driven-approach-game-balancing-gdc-2019); [Game Developer](https://www.gamedeveloper.com/design/learn-i-slay-the-spire-i-s-metrics-driven-approach-to-game-balancing-at-gdc-2019); [GDC Vault](https://www.gdcvault.com/play/1025731)

### Inferences
- **선택지 3 + 건너뛰기 + pity**: 방어구 랜덤 패시브 드롭에도 "레어 실패 누적 보정"을 넣으면 모바일 가챠 체감 불만을 줄일 수 있다.
- **보스 렐릭형 트레이드오프 장비**: "강력한 고유 패시브 + 명시적 페널티"(예: 궁극기 쿨다운 -30% 대신 받는 치유 -20%)를 최상위 등급 일부에 배치하면 단순 상위호환이 아닌 선택이 생긴다.
- **저주 = 부정적 랜덤 특성의 원형**: 덱 오염처럼 "제거 비용이 드는 부정 패시브"는 DD의 부정 퀄크와 같은 축. 모바일에서는 과도한 좌절을 피하려 제거 수단(재련/세척)을 반드시 제공하는 편이 안전.
- **데이터 기반 밸런싱**: 픽률·승률 텔레메트리로 사장된 패시브/궁극기를 찾아 버프하는 운영 루프는 라이브 모바일 RPG에 직접 적용 가능.

### Gaps
- 렐릭 등급 체계(Starter/Common/Uncommon/Rare/Boss/Shop/Event)와 보스 렐릭 "3개 중 1개 선택" 규칙은 위키 직접 조회 실패로 출처 확인 못함 **[미검증]**.
- **[미검증·학습지식]** +1 에너지 보스 렐릭과 패널티: Ectoplasm(골드 획득 불가), Coffee Dripper(휴식 불가), Runic Dome(적 의도 숨김), Sozu(포션 획득 불가), Cursed Key(상자 열 때 저주), Busted Crown(카드 보상 선택지 감소), Velvet Choker(턴당 카드 6장 제한), Philosopher's Stone(적 힘 +1), Mark of Pain(전투 시작 시 Wound 추가), Fusion Hammer(강화 불가).
- 아키타입(예: Ironclad 힘/소멸, Silent 독/시브, Defect 오브/집중) 설계에 대한 공식 설명 출처 미확보.
- Slay the Spire 2(얼리액세스) 변경사항은 조사 범위 밖.

## Darkest Dungeon 1/2 — 스킬 과잉 풀 중 선택 장착, 포지션, 캠프 스킬, 장신구, 퀄크, DD2 경로

### Takeaway
DD1은 영웅당 전투 스킬 7개 중 4개만 장착, 장신구 2개 착용, 스킬은 "사용 가능 위치(랭크)"와 "타격 가능 위치"가 정해진 포지션 퍼즐이다. 퀄크(Quirk)는 긍정/부정 각 5개 상한의 랜덤 네임드 특성으로, 가득 차면 무작위 교체되고 요양원(Sanitarium)에서 골드로 제거/고정(최대 3)한다. DD2는 클래스당 경로(Path) 3종(이후 추가) + 마스터리 포인트 기반 스킬 강화(원정 전 리스펙 가능) + 등급별 장신구로 재구성되었다.

### Cited Findings
**DD1 스킬 로드아웃·포지션**
- 영웅은 사용 가능한 전투 스킬 7개 중 동시에 4개만 활성화 가능, 장신구 2개 착용. 플레이어가 직접 정하는 것은 스킬 로드아웃과 장신구뿐. 스킬은 특정 위치에서만 사용 가능하고, 적 진형의 특정 위치만 타격 가능. — [GameBanshee: Darkest Dungeon Review](https://www.gamebanshee.com/kd8ru)
- 캠프 스킬 예: 상처 치료(회복+출혈/역병 제거), Clean Guns(원거리 버프), Bandit Sense(매복 방지+정찰). — [Quarter to Three 포럼](https://forum.quartertothree.com/t/darkest-dungeon/73511?page=59)
- 장신구는 캠핑 관련 페널티를 갖기도 함(예: 캠핑 중 Move Resist -10%, Trap Disarm -10%). — [Steam Workshop changelog (DD 모드/패치)](https://steamcommunity.com/sharedfiles/filedetails/changelog/1798984981?l=dutch)

**DD1 퀄크(Quirks)**
- 영웅당 최대 10개(긍정 5, 부정 5). 가득 찬 상태에서 새 퀄크 획득 시 기존 퀄크가 무작위 교체(교체된 것은 회전 화살표 표시). — [Darkest Dungeon Wiki: Quirks](https://darkestdungeon.wiki.gg/wiki/Quirks)
- Sanitarium에서 골드를 써서 퀄크 제거(긍·부정) 또는 긍정 퀄크 영구 고정(lock). 고정은 영웅당 긍정 3개까지. 이미 3개 고정 시 교체하려면 2주(제거 1주 + 고정 1주) 필요. — [Darkest Dungeon Wiki: Quirks/Sanitarium](https://darkestdungeon.wiki.gg/wiki/Sanitarium)
- 부정 퀄크는 돈으로 고정할 수 없지만, 여러 원정 동안 방치되면 "강화(reinforced)·고정"될 확률이 있으며 고정된 부정 퀄크는 제거 비용이 더 비쌈. 주당 부정 퀄크 제거 1회, 긍정 퀄크 고정 1회 제한(둘 다 1회씩은 가능). — [Darkest Dungeon Wiki: Quirks](https://darkestdungeon.wiki.gg/wiki/Quirks)
- 클래스 리워크 패치에서 퀄크 수치 조정 사례: Daredevil — HP 50% 미만 시 회피 +10. — [Steam 토론](https://steamcommunity.com/app/262060/discussions/0/2592234299554865534) (검색 요약)

**DD2 경로·스킬 강화·장신구**
- 얼리액세스 업데이트로 9개 클래스 각각에 세 번째 경로(Hero Path)가 추가됨. 개발사 의도: 동적인 파티 구성 장려, 신뢰하는 영웅의 대안적 역할 탐색 유도. 경로는 Beasts and Burdens 업데이트(1월)에서 도입되어 호평. — [GameBanshee: DD2 Trinkets and Baubles Update](https://www.gamebanshee.com/xfwcx)
- 마스터리 포인트는 각 여관(Inn)의 Mastery Trainer에서 스킬당 1포인트로 강화에 사용. 포인트를 다른 스킬로 리셋·재분배 가능하나, 원정 출발 전에만 가능. 획득처: 전투(주요 전투 50%, 길 위 전투 12.5% 드롭이라는 가이드 수치), Shrine of Reflection, 퀘스트 목표. 영웅마다 Hero Shrine 5개(스킬 해금+배경 스토리). — [Sportskeeda](https://www.sportskeeda.com/esports/how-upgrade-skills-darkest-dungeon); [Prima Games](https://primagames.com/gaming/how-to-unlock-and-upgrade-skills-in-darkest-dungeon-2); [ProGameGuides](https://progameguides.com/darkest-dungeon-2/how-to-upgrade-your-characters-in-darkest-dungeon-2/)
- DD2 장신구: 영웅당 2개 장착. 등급 Vague / Distant / Indelible, 컬티스트 장신구는 Unforgettable. 범용(예: Brilliant Brew, Distant)과 클래스 전용(Profane Scroll—Vestal 전용 Indelible, Rotten Tomato—Hellion 전용, Tormenting Locket—Highwayman 전용)이 있음. 원정 성공 시 무작위 보상, 일부는 프로필 레벨 조건(Rotten Tomato: 프로필 Lv30). — [DD2 Fextralife: Trinkets](https://darkestdungeon2.wiki.fextralife.com/Trinkets); [Profane Scroll](https://darkestdungeon2.wiki.fextralife.com/Profane+Scroll); [Rotten Tomato](https://darkestdungeon2.wiki.fextralife.com/Rotten+Tomato)
- DD2 위키 기준 긍정 퀄크는 스트레스 피해 감소 등 효과. — [DD2 Fextralife: Combat](https://darkestdungeon2.wiki.fextralife.com/Combat) (검색 요약)

### Inferences
- **"보유 7 / 장착 4" 과잉 풀**: 귀 프로젝트의 궁극기 풀(10레벨당 1개 해금, 교체 가능)은 DD의 과잉 풀 구조와 동일한 원리다. DD처럼 각 궁극기에 "사용 조건(위치/대열·대상 범위)"을 달면 "가장 센 것 하나만 쓰는" 수렴을 막을 수 있다. 3인 실시간 파티라면 랭크 대신 "근접/원거리·전열/후열" 태그로 단순화하는 것이 현실적.
- **퀄크 = 방어구 랜덤 네임드 패시브의 직접 선례**: (a) 이름 있는 특성, (b) 긍/부정 상한, (c) 무작위 교체, (d) 비용을 내고 고정/제거. 방어구 패시브에 "재련(리롤) + 잠금(고정 n개)"을 두면 DD식 관리 재미와 BM 싱크를 동시에 확보 가능. 단, 부정 특성은 모바일 이용자 정서상 도입 시 신중(트레이드오프형 "양날 패시브"로 대체 고려).
- **장신구 등급 + 클래스 전용**: DD2처럼 최상위 등급을 "클래스 전용 + 빌드 변형형"으로 두면 등급이 곧 정체성 강화가 된다.
- **원정 전 리스펙만 허용**: DD2 마스터리 리셋을 "출발 전"으로 제한한 것은 전투 중 최적화 남용을 막는 장치. 궁극기 교체를 "전투 밖/편성 화면에서만" 허용하는 규칙의 근거로 쓸 수 있다.

### Gaps
- DD2 영웅당 보유/장착 스킬 수, 전투 아이템(Combat Items) 규칙은 출처 확인 실패. **[미검증·학습지식]** DD2는 경로별로 스킬 일부가 변형되며 전투에 5개 스킬 장착(DD1의 4개에서 증가)로 알려져 있음.
- DD1 캠프 스킬 수: **[미검증·학습지식]** 영웅당 캠프 스킬 7개 중 4개 선택, 캠핑 시 파티 공용 Respite 12포인트 소모. 출처로 확인 못함.
- **[미검증]** DD1 장신구 등급(Very Common/Common/Uncommon/Rare/Very Rare/Ancestral/Crimson Court/Kickstarter 등)과 다수 장신구의 "장점+단점" 구조(예: 피해 +x% / 회피 -y).
- DD2 장신구 등급별 드롭률·스탯 범위 미확인. DD2 출시 이후(Kingdoms 모드 등) 변경사항 미조사.

## 보조: Dead Cells / Risk of Rain 2

### Takeaway
이번 조사에서는 이 두 게임에 대해 인용 가능한 출처를 확보하지 못했다(위키 접근 차단 및 툴콜 한도). 아래는 학습 지식 기반 참고용이며 모두 미검증이다.

### Cited Findings
- (출처 확보 실패 — 없음)

### Inferences
- **[미검증]** Dead Cells: 무기 2 + 스킬 2 슬롯, 아이템별 스탯 색(Brutality/Tactics/Survival) 스케일링 태그로 빌드 방향이 갈리고, 아이템에 랜덤 접사(affix)가 붙음 — "장비가 스킬을 주고 접사가 랜덤" 구조로 귀 프로젝트와 가장 유사한 선례.
- **[미검증]** Risk of Rain 2: 아이템 등급(White/Green/Red/Boss/Lunar), Lunar 아이템은 강력한 효과+명시적 단점(트레이드오프), 아이템 중첩(stacking)이 선형/쌍곡선 등으로 스케일; 생존자별 스킬 슬롯 4개(Primary/Secondary/Utility/Special)에 대체 스킬을 메타 해금으로 교체.

### Gaps
- 두 게임 모두 인용 출처 미확보. 필요 시 별도 조사 요망.

## 공통 설계 교훈 (구조적 비교 · 해석)

### Takeaway
네 게임은 공통적으로 (1) 적은 슬롯 + 큰 풀, (2) 수치 강화와 동작 변형의 분리, (3) 태그/정체성 기반 전제조건 시너지, (4) 상한·고정·리롤로 관리되는 랜덤 특성, (5) 명시적 트레이드오프로 "상위호환"을 회피한다. 아래 해석은 위 섹션의 인용 사실에 기반한다.

### Cited Findings
- 슬롯 대비 풀: DD1 스킬 7개 중 4개 장착 — [GameBanshee](https://www.gamebanshee.com/kd8ru); Hades 2 아르카나 총 코스트 56 vs 최대 Grasp 30 — [Maxroll](https://maxroll.gg/hades-2/guides/hades-2-arcana-guide)
- 변형 업그레이드의 희소성: Hades 해머 런당 2개, 리롤 불가, 상호배타 — [Hades Wiki](https://hades.fandom.com/wiki/Daedalus_Hammer)
- 전제조건 시너지: Hades 듀오는 두 신의 특정 부운 보유 필요 — [Prima Games](https://primagames.com/tips/hades-what-are-duo-boons-how-get-duo-boons)
- 랜덤 특성 관리: DD 퀄크 긍5/부5 상한, 무작위 교체, 긍정 3개 고정 — [DD Wiki](https://darkestdungeon.wiki.gg/wiki/Quirks)
- 등급 = 배율: Hades Rare 1.3~1.5×, Epic 2.0~2.5×, Heroic 2.5~2.7× — [Fextralife](https://hades.wiki.fextralife.com/Sweet+Surrender)
- 확률 보정: StS 레어 오프셋 -5%→최대 +40% — [StS Wiki](https://slay-the-spire.fandom.com/wiki/Card_Rewards)
- 트레이드오프: StS Fusion Hammer(+1 에너지 / 강화 불가) — [PocketGamer](https://www.pocketgamer.com/slay-the-spire/relics/)
- 개발 철학: "모든 카드에 자리" + 지표 기반 밸런싱 — [Game Developer](https://www.gamedeveloper.com/design/learn-i-slay-the-spire-i-s-metrics-driven-approach-to-game-balancing-at-gdc-2019); "반복 플레이에서 계속 놀라게" — [GameSpot](https://gamespot.com/articles/hades-changes-what-it-means-to-be-a-roguelike/1100-6483420/)

### Inferences (귀 프로젝트 적용 제안)
1. **스킬①(방어구)·②(무기)에 태그 부여**: 속성/역할 태그(예: 화염, 출혈, 보호막, 군중제어)를 달고, 방어구 랜덤 패시브 중 일부를 "태그 조건부"(예: "출혈 태그 스킬 적중 시…")로 만들어 Hades식 정체성 시너지를 유도.
2. **영웅 간 듀오 패시브**: 3인 파티 중 2명이 특정 태그 조합을 충족하면 활성화되는 파티 패시브(Hades 듀오의 파티판). 전제조건이 명시돼 있어 목표 파밍을 유도.
3. **패시브 등급 = 동일 효과의 배율 사다리**: Common 1.0× → Rare ~1.4× → Epic ~2.0× → (최상위) ~2.5× 수준의 등급 배율(Hades 참고치). 등급 상한 = 아이템 등급이라는 규칙과 결합 시, 패시브 "이름"은 동일하고 수치만 다르게 하여 비교 판단을 쉽게.
4. **랜덤 패시브 관리 3종 세트**: 리롤(재련) / 잠금(n개 고정, DD 3개 고정 참고) / 실패 누적 보정(StS pity). 등급 상향 시도는 "현 등급 Epic 이상일 때만 최상위 후보 등장"(Hades Heroic 조건) 같은 단계 게이트 가능.
5. **궁극기③ 풀 = DD 과잉 풀 + Hades Hex**: 레벨 10마다 1개 해금 → 풀이 커질수록 선택지가 늘어나는 구조. 각 궁극기에 (a) 자원/충전 방식 차이(Hex의 Magick 비용 30~140 폭 참고), (b) 사용 조건/대상 범위 차이, (c) 소형 강화 트리를 붙여 교체에 의미를 부여. 교체는 편성 화면에서만(DD2 원정 전 리스펙 참고).
6. **변형형 업그레이드는 희소 분기로**: 무기 각성/초월 단계에서만 "스킬② 동작 변형"(해머식, 상호배타 2택)을 제공해 수치 강화와 체감 차이를 분리.
7. **최상위 장비 일부는 트레이드오프형**: StS 보스 렐릭·DD 장신구처럼 강한 고유 효과 + 명시적 단점을 붙여 단순 상위호환을 피함.
8. **텔레메트리 운영**: 패시브·궁극기별 채택률/승률 추적 후 사장 옵션 버프(Mega Crit 방식).

### Gaps
- 모바일 실시간 3인 파티 장르(예: 가챠 RPG)에서 위 메커니즘의 실제 성과 데이터는 이번 조사 범위 밖이며 출처 없음.
- 위키 직접 열람 차단으로 다수 세부 수치(Hades 슬롯·리롤·Heat, StS 보스 렐릭 목록, DD 캠프 스킬·장신구 등급)를 원문 확인하지 못함 — 최종 보고서에 사용 시 원문 재검증 권장.
