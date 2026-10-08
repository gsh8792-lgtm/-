# MMO 레이드·전술 RPG의 역할 의무 분담 설계 (Role-duty design: necessary-but-substitutable)

> 조사 환경 메모: gw2 wiki, snowcrows.com, worldofwarcraft.blizzard.com, darkestdungeon.wiki.gg / fandom 등 1차 위키·공식 페이지가 네트워크 egress 프록시에 의해 차단되어 **직접 열람 불가**. 아래 인용은 검색 결과 스니펫(원 URL 명기) 기반이며, 스니펫이 원문 일부만 보여준 경우 그 사실을 표시함. "사실(Fact)"은 Cited Findings, "해석(Interpretation)"은 Inferences에 분리. 조사 시점 2026-10.

## Q1. Guild Wars 2 브레이크바 (Defiance bar / Breakbar): CC 유형별 기여량, CC의 공동 의무화, 관찰된 문제

### Takeaway
GW2는 "보스에게 CC 무효(defiance stacks)" 방식을 HoT(2015)에서 **공유 게이지(브레이크바)** 로 바꿔, 모든 직업의 하드 CC(stun/daze 등 초당 100, knockback/pull 고정 150 등)와 소프트 CC(조건, 초당 누적)가 하나의 바를 깎게 만들었다. 결과적으로 CC는 "누구나 기여 가능하지만 효율이 다른" 공동 의무가 되었으나, 스쿼드 단위 조율 부족 시(특히 PUG) 브레이크 실패가 반복되는 문제가 관찰된다.

### Cited Findings
- **도입 배경(공식, 2015-02-26 "Meet the Wyvern" 블로그, Andrew McLeod & Lee Bledsoe)**: 기존 Defiance는 교전 인원수에 따라 보스에게 스택을 부여하고, 각 스택이 CC 1회를 무효화했다. 개발진이 지적한 문제: (1) 조직된 다수가 보스를 영구 CC(perma-control)할 수 있음, (2) 오픈월드에서 한 플레이어가 잘못된 타이밍에 CC를 쓰면 다른 플레이어들의 노력을 상쇄("cancel out the efforts of the other players"), (3) Skull Crack의 3초 스턴과 Head Shot의 0.25초 데이즈가 **동일한 효과**(스택 1개 소모)였음, (4) 실명(Blindness)은 별도 규칙을 따라 체계에 맞지 않음 — [ArenaNet 공식 블로그](https://www.guildwars2.com/en/news/meet-the-wyvern-in-guild-wars-2-heart-of-thorns/) (검색 스니펫 기반, 전문 미확인)
- **새 체계의 설계 의도(공식)**: Defiance를 체력바 아래 바로 표시, CC가 일정량을 깎고 시간 경과로 재생; 여러 CC를 조합해 바를 완전히 소진시키면 "break". 디자이너가 효과별 감소량을 조정할 수 있어 **긴 스턴이 짧은 데이즈보다 더 많이 깎도록** 함. 브레이크 시 일부 챔피언은 단순 기절, 일부는 방어 껍질 파괴 등 고유 메커닉 — 와이번 예: 바를 깎으면 이륙을 막고 수 초간 자유 공격 시간 — [ArenaNet 공식 블로그](https://www.guildwars2.com/en/news/meet-the-wyvern-in-guild-wars-2-heart-of-thorns/)
- 위키: Defiance는 HoT에서 Breakbar의 한 단계(phase)로 작동하도록 재작업됨 — [GW2 Wiki: Defiant](https://wiki.guildwars2.com/wiki/Defiant) (검색 스니펫)
- **CC 유형별 수치(커뮤니티 가이드 Snow Crows 표, 검색 스니펫)**: Daze 100/초, Stun 100/초, Float 100/초, Knockdown 100/초, Sink 100/초; Knockback 150 고정, Pull 150 고정, Launch 232/332(스킬에 따라); Launch·Knockback·Pull은 장비·특성과 무관하게 고정량 — [Snow Crows Defiance & CC Guide](https://snowcrows.com/guides/getting-started/defiance-and-cc-guide); [Snow Crows Breakbar Guide](https://snowcrows.com/guides/getting-started/breakbar-guide)
- 공식 위키 개별 스킬 검증: Surge of the Mists "Defiance Break: 150", 각 넉백이 150씩, 최대 9히트 총 1350 — [GW2 Wiki: Surge of the Mists](https://wiki.guildwars2.com/wiki/Surge_of_the_Mists)
- **짧은 지속시간 반올림**: Bladesong Dissonance 표에서 0.5초 데이즈 = 100 브레이크, 1초 데이즈 = 100 브레이크 → 1초 미만은 1초 단위로 올림되는 것으로 보임; 토론 페이지도 "rounded up to one second" 언급 — [GW2 Wiki: Bladesong Dissonance](https://wiki.guildwars2.com:443/wiki/Bladesong_Dissonance); [GW2 Wiki Talk:Defiance bar](https://wiki.guildwars2.com/wiki/Talk:Defiance_bar)
- **소프트 CC(조건)**: 조건은 고정 속도로 지속 감소, 하드 CC는 적중 즉시 한 번에 감소 — [GW2 Wiki Talk:Defiance bar](https://wiki.guildwars2.com/wiki/Talk:Defiance_bar). Slow는 초당 50 — [GW2 Wiki: Slow](https://wiki.guildwars2.com/wiki/Slow) (검색 스니펫). 소프트 CC 목록은 출처마다 다름(chill, cripple, immobilize, slow, blind, weakness 중 일부) — [Snow Crows](https://snowcrows.com/guides/new-player-guides/defiance-and-cc-guide); [GW2 forum PSA](https://en-forum.guildwars2.com/topic/18285-psa-for-new-players-what-is-cc)
- **바 상태 3종**: Locked(면역) / Vulnerable(CC·비피해 조건 받음) / Recharging(재충전 중, 추가 피해 없음). Locked 바는 "나중에 깰 기회가 온다"는 신호 — [Snow Crows](https://snowcrows.com/guides/new-player-guides/combat/defiance-and-cc-guide) (검색 요약)
- 안정성(Stability)은 Defiant 적에게도 작동, 스택당 CC 1회 차단하지만 조건에 의한 Defiance 피해는 막지 못함 — [GW2 Wiki Talk:Defiance bar](https://wiki.guildwars2.com/wiki/Talk:Defiance_bar)
- **관찰된 문제**: 한 포럼 사용자는 특정 조우에서 힐링 크리스털 등장 시 브레이크바 내부 타이머가 멈추는 등 타이밍 파악이 어려워 "일반 PUG 시도에서 바가 깨지는 걸 보기 거의 불가능", 디스코드로 조율된 인원이 맡을 때만 성공한다고 서술(단일 일화) — [GW2 forum comment](https://en-forum.guildwars2.com/discussion/comment/1167871/). 일부 보스는 최대한 빨리 CC가 필요하며 실패 시 그룹이 위험 — [Snow Crows](https://snowcrows.com/guides/new-player-guides/defiance-and-cc-guide). 2022-11 패치: Old Lion's Court에서 페이즈 전환 중 바가 의도보다 일찍 잠금 해제되는 버그 수정 — [GW2 Wiki: Game updates/November 2022](https://wiki.guildwars2.com/wiki/Game_updates/November_2022)
- 독일 매체 보도: GW2가 "Trotz(Defiance)" 메커닉을 손봐 보스전을 다채롭게 하려 함 — [Mein-MMO](https://mein-mmo.de/guild-wars-2-trotz-bossmechanik-kontroll-272/)

### Inferences
- 핵심 설계 원리: **이산적 "슬롯" 의무(누가 스턴 1회를 담당) → 연속적 "풀(pool)" 의무(바 총량을 누가든 채움)** 로 변환. 이것이 (a) 의무를 다직업에 분산시키고 (b) 특정 직업 필수화를 막는 핵심. 효율 차이는 CC 종류·지속시간·히트 수로 표현되어 "CC 특화 빌드"의 정체성은 유지됨(동질화 회피 (c)).
- 고정값(넉백/풀 150) vs 지속시간 비례(스턴 100/초) 이원화는 "짧지만 확실한 CC"와 "길고 강한 CC"를 다른 축으로 차별화하는 장치.
- 소프트 CC(조건)가 하드 CC 쿨다운 사이를 메우는 "저효율 대체재" 역할 → CC가 거의 없는 빌드도 미약하게나마 기여 가능 = 필수이되 대체 가능한 의무의 전형.
- 부작용: 의무가 "모두의 것"이 되면 책임 확산(diffusion of responsibility)이 생겨, 조율되지 않은 그룹에서 체크 실패. 따라서 보스 쪽에서 Locked 상태로 "지금이 그때"를 신호하는 UI가 중요.
- (훈련 지식, 미검증) 브레이크 성공 시 보스에 받는 피해 증가 디버프(Exposed)가 붙어 "CC 기여 = DPS 기여"로 보상이 연결된다는 점이 알려져 있으나 이번 조사에서 1차 출처 확인 실패 → Gaps 참조.

### Gaps
- GW2 공식 위키 Defiance 페이지 직접 열람 실패(차단). 소프트 CC별 정확한 초당 수치(chill/cripple/immobilize/weakness/blind), "Exposed" 디버프 수치, 브레이크바 피해 배율(특성·룬 등 +% 수정자) 미검증.
- ArenaNet 블로그 전문 미확인(스니펫만). 이후 공식 재조정 기록(예: 레이드/스트라이크에서 CC 요구량 변화) 미확보.

---

## Q2. WoW / FFXIV: 동질화(homogenization) 역사, 디자이너 발언, 정체성 상실 비판

### Takeaway
WoW는 WotLK(2008) "Bring the player, not the class" 원칙으로 핵심 버프를 여러 직업에 중복 배분하고 비중첩화했으며, MoP(2012)에서 이를 범주화된 버프 체계로 체계화했다. 이후 BfA(2018)에서 "직업 고유성(class distinction)" 강화를 위해 직업별 레이드 버프를 부분 부활시켰고, 2026년 인터뷰에서는 레이드 버프를 "최적 조합이 다양하도록 하는 안전장치(backstop)"로 규정했다. FFXIV는 Stormblood(4.0)에서 역할 액션(Role actions)으로 차단·도발 등을 역할 단위로 공유했고, Endwalker 이후 "2분 메타"로 레이드 버프 타이밍이 통일되면서 직업 정체성 상실 비판이 크다.

### Cited Findings — WoW
- **WotLK(2008) Ghostcrawler 레이드 스태킹 포스트**: 레이드 버프 중첩으로 강해지는 정도를 제한(이전의 소모품 중첩 제한과 같은 맥락), 도전은 버프 수집이 아니라 전투 자체에서 와야 함; 버프를 너프하려는 게 아니라 "less of a burden"으로. 메커니즘: 대부분 핵심 버프를 2개 이상 직업이 제공, 동일 계열은 중첩 불가(예: 주문 취약 디버프를 흑마법사 또는 죽음의 기사가 제공, 상호 비중첩). 목표: 공대장이 특정 버프 때문이 아니라 좋아하거나 잘하는 플레이어를 데려가게 하고 클래스 밸런스에 도움 — [Engadget/WoW Insider: GC on raid stacking (2008-08-23)](https://www.engadget.com/2008-08-23-gc-on-raid-stacking.html)
- WoW Insider는 "bring the player, not the class"를 레이드 요구사항이 블리자드가 필수로 보는 몇몇 핵심 능력/효과로 압축되는 아이디어의 별칭으로 설명. 예외: 블러드러스트/영웅심(Heroism)은 주술사 전용이었음("if you want Bloodlust, you need a shaman") — [Engadget: Ready Check: Core raid buffs (2010)](https://www.engadget.com/2010-03-12-ready-check-core-raid-buffs.html); [Engadget BTPNTC tag](https://www.engadget.com/tag/BTPNTC)
- 2010 Ghostcrawler: 주술사는 버프가 좋아서가 아니라 좋은 플레이어라서 자리를 얻어야 한다 — [Engadget: Ghostcrawler on the future of totems (2010-08-04)](https://www.engadget.com/2010-08-04-ghostcrawler-on-the-future-of-totems.html)
- **MoP(2012-03-09 Ghostcrawler, 공식)**: 목표는 그룹에서 더 강해진다는 느낌 + 누구를 초대할지의 자유; 주요 제약은 클래스 스태킹 유인 과다 회피. 탱커·힐러는 이미 데려갈 이유가 충분하므로 DPS 스펙에 더 관대하게 배분 — [Blizzard: Mists of Pandaria Buff and Debuff Design](https://worldofwarcraft.blizzard.com/news/4574894/mists-of-pandaria-buff-and-debuff-design) (스니펫 기반); 각 버프·디버프 범주를 여러 직업에 배분해 10/25인 구성을 쉽게 함, 전사는 Commanding Shout(체력), Battle Shout(전투력), Sunder Armor 등 제공 — [Engadget: Care and Feeding of Warriors (2012-03-10)](https://www.engadget.com/2012-03-10-the-care-and-feeding-of-warriors-buffs-and-debuffs-in-mists-of.html). MoP Classic 목록 예: 전투력 버프 = 죽기/사냥꾼/전사, 능력치 버프 = 드루이드/사냥꾼/수도사/성기사 — [Icy Veins MoP Classic raid buffs](https://www.icy-veins.com/mists-of-pandaria-classic/raid-buffs-and-debuffs)
- **BfA(2018) 반전**: 직업 고유성(class distinction) 강화, 각 직업이 그룹에 고유한 것을 가져오도록, "a moment to shine" — 조합에 따라 전투 느낌이 달라지도록 — [Blizzard Watch (2018-05-25)](https://blizzardwatch.com/2018/05/25/class-will-moment-shine-utility-skills-battle-azeroth/). Hazzikostas: 직업 버프 복귀는 실험이었고, 모든 직업이 유틸을 기여하길 원하지만 직업마다 별도 버프가 필요한 건 아니며, 드루이드는 이미 유틸이 많아 Mark of the Wild를 복귀시키지 않음 — [Wowhead: Greek community Q&A with Ion Hazzikostas](https://classic.wowhead.com/news/greek-community-q-a-with-ion-hazzikostas-289196?page=2)
- **2026 인터뷰(Tettles, Hazzikostas & Paul Kubit, 2026-08 요약)**: 레이드 버프는 최적 공대 구성이 다양하도록 하는 backstop, 모든 직업·스펙이 그룹과 "home"을 찾을 수 있게; 버프 종류는 직접 능력치 버프와 명확한 유틸 등 다양; 레이드 버프는 대표성(representation)을 확보하는 가장 쉬운 방법 중 하나(유일한 방법은 아님) — [Seramate 요약](https://seramate.com/news/2026/08/26/tettles-ion-kubit-interview-1f1a1b70) (2차 요약 출처)
- 커뮤니티: Dragonflight 레이드/파티 버프 메타 논의(Dratnos & Tettles) — [Wowhead](https://www.wowhead.com/news/the-raid-and-party-buff-meta-in-dragonflight-dratnos-and-tettles-discuss-327642?page=2); 버프 스크롤 미복귀 기사 댓글 "bring the classes not consumables" — [Wowhead](https://www.wowhead.com/news=317737/battle-shout-intellect-and-fortitude-buff-scrolls-not-returning-in-shadowlands); 포럼 "Raid buffs and toolkits need to be pruned" — [Blizzard Forums](https://us.forums.blizzard.com/en/wow/t/raid-buffs-and-toolkits-need-to-be-pruned/1891054)
- **차단(Interrupt) — The War Within 변경**: 이전엔 차단·스턴·밀치기 모두 시전을 끊고 해당 주문 쿨다운을 유발했으나, 변경 후 스턴/밀치기로 끊으면 몹이 거의 즉시 재시전, 진짜 차단만 쿨다운 유발. 기자는 이것이 차단을 자주 쓸 수 있는 직업에 유리하고 신성 사제가 특히 불리하다고 주장 — [Mein-MMO (EN)](https://mein-mmo.de/en/a-change-to-spells-in-wow-is-driving-players-crazy,1181196)
- 커뮤니티 도구 관행: 차단 로테이션 애드온은 탱커 우선·힐러 최하위 순서가 기본, 차단기 없는 힐러를 필터; 하드 차단이 없는 직업엔 공포·스턴·침묵·속박 등 대체 CC 제시 — [CurseForge: Mythic Interrupt Tracker](https://www.curseforge.com/wow/addons/mythic-interrupt-tracker); [CurseForge: KickCall](https://www.curseforge.com/wow/addons/kickcall). Midnight(12.x)부터 애드온이 "차단 가능 여부"를 알 수 없고, 전투 중 애드온 메시징 제한 — [CurseForge addon pages](https://www.curseforge.com/wow/addons/interrupt)

### Cited Findings — FFXIV
- **역할 액션(Role actions)**: Stormblood(4.0)에서 도입, 직업이 아니라 역할(role) 기준으로 제공; 4.0에서 Cross-class Skills(출처에 따라 Additional Actions)를 대체; Shadowbringers부터 고정 세트, 전부 동시 사용 — [ConsoleGamesWiki: Role actions](https://ffxiv.consolegameswiki.com/wiki/Role_actions); [Final Fantasy Wiki](https://finalfantasy.fandom.com/wiki/Role_action)
- 차단: 탱커 Interject(Lv18, 재사용 30초, 사거리 3y), 원거리 물리 DPS Head Graze(Lv24, 30초, 25y) — 같은 효과, 역할별 사거리 차등 — [ConsoleGamesWiki](https://consolegameswiki.com/wiki/Role_Action). 일부 역할 액션은 여러 역할 공유(예: Arm's Length = 근접 DPS·원거리 물리·탱커) — 같은 출처
- 탱크 스왑: Provoke(Lv15, 30초, 25y, 적대 1위로 + 추가 적대), Shirk(Lv48, 120초, 25y, 적대 25%를 파티원에게 이전). 탱버스터 등으로 스왑 필요 시 표준: 부탱이 Provoke → 전 메인탱이 Shirk — [ConsoleGamesWiki: Shirk](https://consolegameswiki.com/wiki/Shirk)
- **Yoshida 발언(2차 보도)**: 나이트(Paladin)는 "옛 FFXIV"를 반영하며, 회전을 현대 FFXIV의 동질화된 리듬(homogenized rhythm)에 맞추되 방어 강자라는 정체성은 유지하려 했다 — [Siliconera](https://vip-develop.siliconera.com/?p=944713) (검색 요약, 원 인터뷰 미확인). 6.21 Abyssos 관련 서한: 부진 직업 일괄 버프는 파급효과 때문에 하지 않음 — [Massively OP](https://massivelyop.com/?p=405749) (검색 요약)
- Dawntrail: 대규모 직업 변경 확장이 아니며 8.0에서 가능성 언급; 몽크 콤보가 버프/도트 유지 중심에서 벗어남, 음유시인 노래는 공격하지 않는 버프 액션화, 암흑기사 Delirium·Blood Weapon 통합 — [Game Informer (2024-06-06)](https://www.gameinformer.com/2024/06/06/high-end-raiding-overview-of-final-fantasy-xiv-dawntrail-job-changes); [Siliconera](https://www.siliconera.com/?p=1029548)
- **커뮤니티 비판/옹호**: 공식 포럼 "2 minute meta – Rework or Remove" 스레드, "raid buff homogenisation has gotten way out of hand" — [SE Forum](https://forum.square-enix.com/ffxiv/threads/491811-2-minute-meta-Rework-or-Remove). 옹호: 2분 메타가 EW 레이드·절(Ultimate)의 복잡한 설계를 가능케 함. 반론: 공유 버프가 없으면 직업마다 다른 램프업으로 개성 가능. 다른 의견: 진짜 문제는 레이드 버프가 아니라 버스트 vs 지속딜 구조 — [SE Forum pages](https://forum.square-enix.com/ffxiv/showthread.php?p=6370775); [r/ffxivdiscussion (2025-01)](https://teddit.bsalzberg.com/r/ffxivdiscussion/comments/1i1v73m/why_is_the_2minute_meta_a_bad_thing/m7c1tsy)

### Inferences
- WoW의 궤적은 진자 운동: (1) 고유 버프로 특정 직업 필수(BC) → (2) 중복·비중첩으로 대체가능화(WotLK/MoP) → (3) 정체성 상실 비판 → (4) 고유 버프 부분 부활(BfA~) → (5) "다양한 조합을 강제하는 backstop"으로 재정의(2026). 즉 고유 버프를 "필수성"이 아닌 "다양성 유도" 도구로 쓰되, 효과는 각 직업당 하나씩 분산해 어느 하나도 압도적이지 않게 하는 방향.
- "버프는 중복 제공 + 비중첩"은 의무를 분산하면서 특정 직업 필수화를 막는 가장 간단한 장치이나, 과하면 "모두가 같은 것을 준다"는 동질화로 귀결. 블러드러스트처럼 남겨둔 단일 예외가 반복적으로 문제(필수 직업)가 됨.
- FFXIV 역할 액션은 "역할 내 완전 공유, 역할 간 차등(사거리)"이라는 구조: 차단 의무는 탱커·원딜 둘 중 누구든 가능 → 직업 필수화 방지. 반면 직업 정체성은 역할 액션 밖에서만 표현되어야 하는데, 2분 메타가 그 공간마저 타이밍 통일로 압축 → 비판의 핵심.
- WoW TWW 차단 변경은 "스턴=차단 대체재"였던 것을 약화 → 진짜 차단기의 가치 상승, 대체가능성 축소. 대체재 효율 조정이 의무 분포를 크게 바꾼다는 사례.

### Gaps
- Ghostcrawler 원문 포럼 게시물(2008) 및 MoP 블로그 전문 직접 열람 실패(차단). "8개 버프" 같은 정확한 수치 미확인.
- WoW 해제(dispel) 분배(마법/저주/독/질병을 직업별로 나눔)의 공식 설계 근거 출처 미확보.
- Yoshida의 2분 메타/레이드 버프 관련 Live Letter 1차 발언 미확보(2차 보도만). FFXIV 탱버스터·탱크 스왑을 설계 의도 차원에서 설명한 공식 자료 없음.

---

## Q3. Divinity: Original Sin 2 물리/마법 방어 분리: 왜 올물리·올마법 파티로 몰리는가, 교훈

### Takeaway
DOS2는 방어도(Physical/Magic Armour)가 피해를 비율 감쇄가 아닌 **완전 흡수**하고, 해당 방어도가 0이 되기 전엔 CC가 걸리지 않는 구조. 따라서 한 종류 방어도를 집중으로 깎는 것이 CC 개시를 앞당기므로, 파티 전체를 한 피해 유형으로 맞추는 "올물리/올마법"이 쉽고 강력한 정답이 됐다. 혼합 파티도 가능하지만 운용 난이도가 높다는 반론이 있다.

### Cited Findings
- 개발자 인터뷰: 후속작에서 방어도는 피해를 비율로 흡수하는 대신 **완전히 무효화**; 물리/마법 두 종류; 마법 방어도는 부정적 상태이상을 포함한 모든 마법 공격을 무효화. Pechenin(직책 미상): 전작의 무작위 상태이상 저항은 장기 계획을 방해했다 — [GameBanshee interview](https://gamebanshee.com/k4wac)
- CC는 해당 방어도가 고갈되기 전엔 작동하지 않음; 전작의 1턴 넉다운·상태이상 남발을 막아 개선으로 평가되기도 함 — [KeenGamer opinion](https://www.keengamer.com/articles/features/opinion-pieces/our-hopes-for-baldurs-gate-3-after-divinity-2/)
- 물리 방어도가 마법 방어도보다 획득 쉬움(무기·목걸이·반지 외 모든 장비에 존재) — [dos2.wiki: Armour](https://dos2.wiki/wiki/Armour)
- 플레이어 비판: 근접 2명이 캐스터보다 훨씬 강함, 거의 모든 적이 마법 방어도가 더 높음 — [Steam discussion](https://steamcommunity.com/app/435150/discussions/0/1694917906666307377); "방어도의 이진적 성격이 선형/버스트 피해 순수 빌드를 유도" — [Steam discussion](https://steamcommunity.com/app/435150/discussions/0/1483232961040404790); Tactician 난이도는 적 수 증가·방어도 대폭 증가일 뿐 — [Steam discussion](https://steamcommunity.com/app/435150/discussions/0/3223871682619693188); 방어도 시스템이 모든 전투를 지루한 소모전(slog)으로 — [Quarter to Three forum](https://forum.quartertothree.com/t/baldurs-gate-3/12078?page=96)
- 옹호/반론: 많은 사람이 올물리/올마법을 권하는 이유는 누구든 같은 방어도를 집중 공격할 수 있어 효과적이고 단순하기 때문; 그러나 "혼합 파티가 더 효과적이지만 운용이 어렵다"는 주장; 방어도 체계는 같은 클래스로 밀어붙이지 않게 전술을 추가한다는 의견 — [Steam discussion](https://steamcommunity.com/app/435150/discussions/0/1734338354738887877); [Steam discussion](https://steamcommunity.com/app/435150/discussions/3/3288067088100495465)
- BG3는 D&D 5e AC/HP 체계 사용(사용자 코멘트, Larian 공식 근거 아님) — [Steam BG3 discussion](https://steamcommunity.com/app/1086940/discussions/0/6045572169628991048). 차기 Divinity에서 물리/마법 방어 체계 제거 확정이라는 주장은 단일·신뢰도 낮은 출처 — [techporn.ph](https://www.techporn.ph/larian-reveals-new-divinity-project-details-ama/) (검증 불가, 인용 주의)

### Inferences
- 실패 원인 구조화: (1) 두 게이지가 **독립**이라 한 게이지에 쏟은 피해가 다른 게이지에 전혀 이전되지 않음 → 분산 투자는 낭비, (2) 게이지가 CC의 **게이트**라서 "먼저 깨기" 경쟁에 집중이 압도적 이득, (3) 두 게이지의 크기가 비대칭(마법 방어 더 높음, 물리 방어 더 흔함) → 한쪽이 지배 전략. 즉 "필수 의무(방어 깎기)"를 두 유형으로 나눴지만 대체성·교차 효율이 0이라 혼합 대신 특화를 강제.
- 교훈(그로기 설계 대응): 그로기/브레이크 게이지를 피해 유형별로 분리하면 파티가 단일 유형으로 수렴하기 쉬움. GW2처럼 **단일 공유 게이지 + 유형별 효율 차**가 혼합 파티를 덜 처벌. 분리가 필요하다면 교차 기여(예: 비주력 유형도 일부 기여)나 누출(spill-over)을 둬야 함.

### Gaps
- Larian(Swen Vincke 등)의 방어도 분리에 대한 공식 사후 평가/포스트모템 발견 못함. BG3가 이 체계를 버린 공식 이유 미확인(5e 라이선스로 인한 자연스러운 결과일 가능성; 추정).

---

## Q4. Darkest Dungeon: 스턴 저항 상승으로 스턴락·역할 남용 방지 / 위치 기반 역할

### Takeaway
DD1에서 스턴으로 턴을 건너뛴 유닛은 1턴간 +50% 스턴 저항 버프를 받고, 연속 스턴 시 100%, 150%로 누적되어 턴을 얻을 때 제거된다. 이는 영구 스턴락을 확률적으로 억제하지만, 스턴 확률 장신구 등으로 2연속 스턴은 여전히 가능하다는 플레이어 보고가 있다.

### Cited Findings
- 턴 시작 시 스턴이 발동하면 턴을 건너뛰고 1턴간 스턴 저항 +50% 임시 버프; 연속 성공 시 100%, 150%… 누적, 유닛이 턴을 얻을 때까지; 목적은 캐릭터 턴을 반복적으로 건너뛰기 어렵게 함; 버프는 캐릭터 턴 시작 시 제거 — [Darkest Dungeon Wiki: Stun](https://darkestdungeon.wiki.gg/wiki/Stun); [DD Wiki: Status effects](https://darkestdungeon.wiki.gg/wiki/Status_effects) (검색 스니펫, 직접 열람 차단)
- 과거 버전 플레이어 회고: +20% 누적·2~3라운드, 또는 +40%→+80% 등 다른 값과 버그 보고(구버전, 비신뢰) — [Steam discussion (2016)](https://steamcommunity.com/app/262060/discussions/0/371919771751891427); [Quarter to Three forum](https://forum.quartertothree.com/t/darkest-dungeon/73511?page=15)
- 플레이어: 역병 의사(Plague Doctor) 장신구가 강해 스턴 저항 버프에도 2턴째 스턴이 자주 가능 — [Steam discussion](https://steamcommunity.com/app/262060/discussions/0/2788173147755302460)
- DD2는 체계가 다름: Stun과 Daze가 별도, 자체 Stun resistance 속성 — [DD Wiki: Combat Mechanics (DD2)](https://darkestdungeon.wiki.gg/wiki/Resistances_(Darkest_Dungeon_II))

### Inferences
- 이는 "보스 CC의 점감(diminishing returns)"을 턴제로 구현한 사례: 한 번 성공한 CC가 다음 CC를 비싸게 만들어, 스턴 담당 1명이 전투를 지배하는 것을 막음. 다만 "턴을 얻으면 리셋"이므로 교대 스턴(간헐적 통제)은 여전히 유효 → 스턴 역할의 가치는 유지(필수성 유지, 독점 방지).
- 위치 기반 역할(영웅별 사용 가능 위치/타깃 위치 제한)은 "같은 의무라도 누가 어느 자리에서 하느냐"로 효율 차를 만드는 장치로 해석 가능하나, 이번 조사에서 해당 설계 의도 1차 출처 확보 실패.

### Gaps
- DD 위치 기반 스킬 시스템(rank 1–4 사용/타깃 제한)의 개발사(Red Hook) 설계 근거 출처 미확보. 보스별 스턴 저항 수치 미확인(위키 차단).

---

## Q5. 보스전 CC 점감(Diminishing returns) 일반 + 로그라이크 덱빌더 "역할 커버리지"

### Takeaway
보스 CC의 일반 해법은 (1) 무효화 스택(구 GW2 Defiance), (2) 게이지형 누적 후 재충전(GW2 브레이크바, DOS2 방어도 게이트), (3) 성공 후 저항 상승(DD1 +50% 누적)으로 분류된다. 덱빌더의 "역할 커버리지" 개념에 대한 1차 디자이너 자료는 이번 조사에서 확보하지 못했다.

### Cited Findings
- GW2 구 체계: 교전 인원 비례 스택, 스택당 CC 1회 무효 → 협동 시 영구 CC 방지 목적이었으나 조율 문제 발생 — [ArenaNet 블로그](https://www.guildwars2.com/en/news/meet-the-wyvern-in-guild-wars-2-heart-of-thorns/)
- GW2 신 체계: 브레이크 후 Recharging 상태에서는 추가 피해를 받지 않고 재충전 — [Snow Crows](https://snowcrows.com/guides/new-player-guides/combat/defiance-and-cc-guide)
- WoW TWW: 스턴/밀치기 차단은 쿨다운 미유발 → 대체 CC의 효용 하향 — [Mein-MMO](https://mein-mmo.de/en/a-change-to-spells-in-wow-is-driving-players-crazy,1181196)
- Slay the Spire: Mega Crit의 GDC 2019 "Metrics Driven Design and Balance"(Anthony Giovannetti) — 지표 기반 밸런스 — [Game Developer](https://www.gamedeveloper.com/design/learn-i-slay-the-spire-i-s-metrics-driven-approach-to-game-balancing-at-gdc-2019); 적 행동이 UI로 사전 예고(intent) — [PC Gamer review](https://pcgamer.com/slay-the-spire-review)

### Inferences
- 세 가지 점감 패턴 비교: 스택 무효형은 "순서/타이밍 갈등"을, 게이지형은 "공동 기여 + 책임 확산"을, 저항 상승형은 "독점 방지 + 간헐 통제 허용"을 낳음. 그로기 설계에는 게이지형 + 브레이크 후 회복기(재충전/면역)가 가장 협동적.
- 덱빌더 측면(해석, 출처 없음): StS의 적 의도(intent) 예고는 "다음 턴에 필요한 대응(방어/딜/디버프)"을 플레이어가 자원 배분하도록 만드는데, 이는 레이드의 "탱버스터 예고 → 지정 대응"과 구조가 같음.

### Gaps
- WoW 레이드 보스의 CC 면역/점감 공식 근거, FFXIV 보스 CC 면역 체계에 대한 공식 설명 미확보.
- StS의 "AoE/스케일링/방어 커버리지" 같은 역할 커버리지 개념을 다룬 디자이너 발언 미확보(커뮤니티 통용 개념으로 추정되나 출처 없음).
- 1차 위키(GW2, DD, Blizzard 공식) 접근 차단으로 다수 수치가 검색 스니펫 기반; 최종 보고서 작성 시 "커뮤니티 가이드/2차 보도 기반" 표기 권장.
