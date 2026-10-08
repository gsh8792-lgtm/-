# 루트 기반 액션 RPG의 장비-스킬 연동 및 패시브/전직 시스템 비교 (PoE1/2, 언디셈버, Last Epoch, Grim Dawn, Diablo 4, Diablo Immortal)

> 조사 환경 메모: 이 세션의 네트워크 프록시가 poewiki.net, poe2wiki.net, maxroll.gg, grimdawn.com, invenglobal.com, fandom 등 대부분의 위키/가이드 페이지 직접 열람(WebFetch)을 차단했다. 따라서 아래 "Cited Findings"는 검색 엔진 결과 요약(스니펫)에 근거하며, 원문 전체를 확인하지 못했다. 학습 지식에 기반한 내용은 출처가 없으므로 각 섹션의 "Gaps"에 '미검증 배경지식'으로 분리해 적었다. 설계 반영 전 원문 재확인을 권장한다.
> 대상 설계: 모바일 실시간 3영웅 파티 전략 RPG. 무기→스킬②, 방어구→스킬①+랜덤 이름 패시브(아이템 등급 이하에서 랜덤 등급), 8등급(UC~Elder)+젬 소켓, 궁극기③는 클래스 레벨 10마다 1개씩 해금되는 풀에서 선택/교체.

## 1. Path of Exile 1 — 소켓 스킬 젬, 서포트 젬, 키스톤, 어센던시, 타락(Corruption)

### Takeaway
PoE1은 "스킬은 젬이고, 젬은 아이템 소켓에 끼운다"는 구조로 장비가 스킬 보유와 강화(링크 수)를 동시에 결정한다. 패시브 트리의 키스톤은 강력한 이득과 명시적 페널티를 묶은 "빌드 정의형 트레이드오프"이며, 바알 오브(Vaal Orb) 타락은 최종·비가역적 도박으로 기능한다.

### Cited Findings
- 젬은 소켓에 넣었을 때 스킬을 부여(skill gem)하거나 스킬을 변형(support gem)한다 (PoE2 위키의 기본 정의이나 PoE1에서 유래한 개념) — [poe2wiki Skill gem](https://poe2wiki.net/wiki/Skill_gem)
- 타락은 아이템의 등급(rarity), 소켓, 링크를 바꿀 수 있고 유니크 아이템을 같은 베이스의 레어로 떨어뜨릴 수도 있다 (PoE1 시기 Steam 토론, 커뮤니티 출처) — [Steam 토론](https://steamcommunity.com/app/238960/discussions/0/540736965990603366)
- 타락은 최종 상태라서 이후 화폐 아이템으로 수정할 수 없으며, 품질/소켓 등 다른 제작을 먼저 끝내라는 것이 가이드의 공통 조언이다 — [Sportskeeda PoE2 corruption](https://www.sportskeeda.com/mmo/path-exile-2-poe2-item-corruption-what-vaal-orbs); [outof.games](https://outof.games/realms/poe2/guides/548-what-does-corrupted-mean-in-path-of-exile-2/)
- 젬 타락 결과로 레벨 ±1 변경(20→21 가능), 품질 변경 등이 있다 — [Maxroll PoE2 corruption outcomes](https://maxroll.gg/poe2/resources/corruption-outcomes)
- 키스톤 예시 Chaos Inoculation(CI): 카오스 피해 및 출혈 면역 대신 최대 생명력을 1로 고정. 생존을 에너지 실드(ES)에 의존하게 만들고, 기절/상태이상 임계치도 생명력 1 기준으로 계산되는 2차 페널티가 있다 (PoE2 위키 기준) — [poe2wiki Chaos Inoculation](https://www.poe2wiki.net/wiki/CI)
- 레거시 레이아웃: Resolute Technique 키스톤 기반 Cyclone 빌드가 커뮤니티 가이드로 존재(키스톤 하나가 빌드 정체성이 되는 사례) — [PoE 공식 포럼 가이드](https://www.pathofexile.com/forum/view-thread/418102)

### Inferences
- 키스톤 구조(강한 이득 + 명시적 큰 손실)는 사용자 설계의 "이름 있는 패시브(named passive)"에 그대로 응용 가능: 상위 등급(Legend/Elder) 패시브일수록 단순 수치가 아니라 "규칙을 바꾸는" 트레이드오프형 효과를 넣으면 빌드 정체성이 생긴다.
- PoE1의 "장비가 스킬 보유 + 링크 수로 강도 결정" 구조는 모바일 3영웅 파티에서 장비 교체 = 스킬 교체라는 사용자 설계(무기→②, 방어구→①)와 유사하다. 다만 PoE1에서는 이 결합이 "좋은 스탯 아이템 vs 좋은 링크 아이템" 딜레마를 만들어 GGG가 PoE2에서 분리했다(2장 참고). 사용자의 설계도 "스킬은 좋은데 스탯이 나쁜 무기" 딜레마가 생길 수 있으므로, 스킬 레벨/강화가 아이템 등급과 어떻게 연동되는지 분리 규칙이 필요하다.
- 타락식 "최종·비가역 도박"은 Elder 같은 최상위 등급에 엔드게임 싱크(sink)로 붙이기 좋다.

### Gaps
- poewiki.net 직접 열람 차단으로 아래 미검증 배경지식(학습 지식)을 출처로 확인하지 못함: (a) 소켓 색 R/G/B가 힘/민첩/지능 요구치에 대응, 흰 소켓은 모든 색; (b) 최대 소켓 수 몸통·양손무기 6, 한손무기/투구/장갑/신발 4, 방패 3(혹은 아이템별 차이); (c) "Socketed Gems are Supported by Level X ..." 모드가 붙은 아이템(유니크, 일부 인챈트, Elder/Shaper 모드)이 링크 수를 사실상 늘리는 효과; (d) 유니크가 "Grants Level X Skill" 형태로 스킬을 부여하는 사례; (e) 패시브 트리 약 1,300+ 노드, 레벨로 최대 약 123포인트(퀘스트 포함), 어센던시 4개 Labyrinth로 최대 8포인트; (f) Resolute Technique(치명타 불가, 항상 명중) 텍스트; (g) 바알 오브 결과(무변화/암묵적 타락 모드 추가/소켓 재굴림/희귀로 무작위화 등 확률 각 25%).
- 키스톤 총 개수는 버전마다 달라 확인 불가.

## 2. Path of Exile 2 — 미가공 젬(Uncut), 젬 내 서포트 소켓, 무기 종속 스킬, 스피릿(Spirit), 어센던시

### Takeaway
PoE2는 스킬을 아이템 소켓에서 떼어내 "스킬 패널(9칸)+젬 자체의 서포트 소켓"으로 옮겼고, 대신 무기 유형이 스킬 사용 가능 여부를 제한하며 무기 고유 스킬(기본 공격 성격)을 부여한다. 지속 버프는 Spirit이라는 별도 자원 예약(reservation)으로 관리한다.

### Cited Findings
- 미가공 스킬 젬(Uncut Skill Gem)은 각인 시 미가공 젬의 레벨로 젬 레벨이 정해지며, 이후 20레벨(타락 시 21)까지 성장 — [poe2wiki Skill gem](https://poe2wiki.net/wiki/Skill_gem)
- 기본적으로 최대 9개의 스킬 젬을 동시에 장착(스킬 패널) — [poe2wiki Skill gem](https://poe2wiki.net/wiki/Skill_gem); "스킬은 더 이상 장비에 소켓되지 않으며 9개 스킬 슬롯에서 시작" — [Maxroll Skills in PoE2 (0.5.4 기준)](https://maxroll.gg/poe2/resources/skills-in-path-of-exile-2)
- 대부분의 무기는 고유(innate) 스킬을 가지며, 이는 자동공격처럼 작동하고 마나를 소모하지 않는다 — [Maxroll Skills in PoE2](https://maxroll.gg/poe2/resources/skills-in-path-of-exile-2)
- 스킬은 무기 유형에 종속된다. 예: Falling Thunder는 쿼터스태프 필요. 커뮤니티 답변: "아직 추가되지 않은 무기 유형용 스킬은 없다" → 캐릭터 클래스보다 무기 유형이 스킬 접근을 결정 — [poe2wiki 쿼터스태프 사용 가능 스킬 목록](https://www.poe2wiki.net/wiki/List_of_skill_gems_usable_with_quarterstaves); [Steam 토론](https://steamcommunity.com/app/2694490/discussions/0/4628107854300174334)
- 각 스킬을 무기 세트 1/2 중 하나 또는 둘 모두에 할당할 수 있고, 반대 세트 전용 스킬 사용 시 무기 세트가 자동 교체된다 — [poe2wiki 관련 문서(검색 요약)](https://www.poe2wiki.net/wiki/Master_Weapon)
- 스피릿 젬(Spirit Gem)은 Uncut Spirit Gem으로만 생성, 지속 버프·다른 스킬 트리거·영구 소환수를 부여하며 Spirit을 예약한다. 일부는 무기 요구조건이 있다. 서포트 젬을 끼우면 대개 비용 배수만큼 예약량이 증가하고, 일부는 고정 Spirit 예약을 부과 — [poe2wiki Spirit Gem](https://www.poe2wiki.net/wiki/Spirit_Gem)
- 지속 버프용 서포트 예: Vitality I(20 Spirit), Mysticism I(15)/II(30). Spirit 예약 서포트는 모든 스킬을 통틀어 1개 사본만 장착 가능(2025-09-01 GGG 게시물 인용). 한 스킬에 같은 카테고리 서포트 중복 불가 — [poe2wiki Vitality](https://www.poe2wiki.net/wiki/Vitality); [poe2wiki Mysticism II](https://www.poe2wiki.net/wiki/Mysticism_II)
- 어센던시 포인트 최대 8: 첫 트라이얼에서 2, 캠페인 진행 중 추가 4, 최종 2는 엔드게임 트라이얼 변형에서만 — [poe2wiki Ascension trials](https://www.poe2wiki.net/wiki/Trials_of_Ascension); [Maxroll Trials of Ascendancy](https://maxroll.gg/poe2/getting-started/trials-of-ascendancy)
- PoE2 타락에서 룬 소켓 추가가 결과 중 하나; 젬 타락으로 5/6링크(서포트 소켓 수)나 21레벨 노림 — [Sportskeeda](https://www.sportskeeda.com/mmo/path-exile-2-poe2-item-corruption-what-vaal-orbs); [Maxroll corruption outcomes](https://maxroll.gg/poe2/resources/corruption-outcomes)
- 게임 디렉터 Jonathan Rogers: PoE1의 "원클릭으로 모든 걸 죽이는" 방식 대신 플레이어가 한 가지 이상의 행동을 해야 하길 바란다 — [MMORPG.com 인터뷰](https://www.mmorpg.com/interviews/interview-path-of-exile-2s-game-director-jonathan-rogers-chats-gameplay-intentions-inclusions-and-improvements-2000130901)
- Rogers는 무기 스왑과 그에 따른 패시브 트리 전환을 "여러 스킬을 쓰게 만드는" 장치로 언급 — [Maxroll PAX West 인터뷰](https://maxroll.gg/poe/news/pax-west-path-of-exile-2-interview-with-jonathan-rogers)
- 커뮤니티 불만: 무기별 기본 공격에 스킬 슬롯을 할애해야 한다(비공식) — [Steam 토론](https://steamcommunity.com/app/2694490/discussions/0/598514805179941714)

### Inferences
- PoE2의 "무기 유형 → 스킬 풀 접근" 모델은 사용자 설계의 "무기가 스킬② 부여"와 가장 가깝다. PoE2는 무기 하나가 스킬 하나를 직접 주는 대신 '스킬 풀 해금'으로 일반화했으므로, 사용자 설계에서도 "무기 종류=스킬 계열, 개별 아이템=그 계열 내 특정 스킬/변형" 2단 구조를 고려할 수 있다.
- 스킬 강화(서포트)를 아이템에서 젬 자체로 옮긴 것은 "좋은 스탯 아이템을 링크 때문에 못 쓰는" 문제를 피하기 위함으로 해석된다(공식 의도 문서는 미확인). 사용자 설계에서 젬 소켓을 아이템에 두면 PoE1식 결합 문제가 재현되므로, 아이템 교체 시 젬 자동 이전/무손실 탈착 등 완화책이 필요.
- Spirit 예약 + "한 개만 장착 가능" 규칙은 파티 단위 지속 버프(오라)를 3영웅 간 예산으로 제한하는 모델에 응용 가능.

### Gaps
- 서포트 소켓 최대 수(스킬 젬 기본 2개 → Jeweller's Orb로 최대 5개, 즉 6링크 상당)는 학습 지식이며 이번 조사에서 1차 출처로 확인 못함.
- 2025~2026 패치(0.3 이후, 0.4, 0.5 "Return of the Ancients")에서 Spirit·서포트 규칙 변경 세부 사항 미확인. 위키 페이지 간 젬 수(166 vs 244) 불일치 보고됨.
- 4번째 어센던시 트라이얼 추가 여부 등 최신 정보 미확인.

## 3. Undecember — 스킬 룬 + 링크 룬, 조디악(Zodiac) 보드, 조작 부담 완화

### Takeaway
언디셈버는 PoE1의 "젬+소켓+링크"를 장비에서 분리된 "육각형 룬 링크"로 재구성하고, 능력치 성장과 패시브 트리를 하나의 조디악 보드로 통합했다. 클래스 없이 룬·조디악·장비 3요소로 빌드를 만든다.

### Cited Findings
- 룬은 스킬 룬(액티브)과 링크 룬(패시브 효과) 두 종류이며 빨강/초록/파랑 색으로 구분 — [LINE GAMES 공식 Beginner Guide](https://guide.floor.line.games/UD/en_US/detail/1167464244253400273)
- 링크 룬은 스킬 룬에 연결되어 추가 효과를 주며, 한 스킬 룬에 최대 6개까지 연결 — [LINE GAMES 공식 가이드](https://guide.floor.line.games/UD/en_US/detail/1167464244253400273)
- 스킬 룬은 최대 6방향 링크 슬롯을 가지며, 링크 룬은 스킬 룬의 색과 태그가 일치해야 효과 — [MagicGameWorld 룬 가이드](https://www.magicgameworld.com/?p=128030)
- '룬 링크 에센스'로 링크 슬롯 위치를 확률적으로 변경 가능, 반복 강화 설정으로 원하는 슬롯 수/색/위치까지 자동 반복 — [Gamesfuze](https://gamesfuze.com/guides/undecember-how-to-farm-magic-skill-rune-and-link-rune-upgrade-essence/); [Gamesfuze 룬 등급 업](https://gamesfuze.com/guides/undecember-how-to-upgrade-rune-grade/)
- 조디악은 능력치와 스킬(패시브)을 하나로 합친 시스템. 중앙 축은 힘/민첩/지능 기본 능력치, 바깥 축은 별도 노드. 레벨업마다 포인트 획득 — [Pocket Gamer 가이드](https://www.pocketgamer.com/undecember/runes-zodiac-points-gears-guide)
- 언디셈버는 Zodiac, Rune, Gear 3요소로 자유로운 커스터마이즈를 허용 — [Pocket Gamer](https://www.pocketgamer.com/undecember/runes-zodiac-points-gears-guide)

### Inferences
- 룬에 "등급(grade)"과 링크 슬롯 수가 연동되는 구조는 사용자 설계의 "아이템 등급별 젬 소켓 수"와 직접 비교 대상이다. 색+태그 일치 규칙은 소켓 젬 호환성 규칙의 단순한 템플릿이 된다.
- 링크 위치 재굴림을 "자동 반복 강화"로 묶은 것은 모바일에서 반복 탭 피로를 줄이는 UX 사례.

### Gaps
- 스킬 슬롯 개수(학습 지식상 모바일 액티브 슬롯 약 6~8개 + 자동 스킬/오토 전투 지원), 자동 사냥 모드, 조디악 별자리 노드 구성(12궁 테마) 등 조작 부담 완화 방식의 1차 출처 확인 실패(나무위키·공식 사이트 미열람). 한국어 검색 결과가 무관하게 나옴.
- 2024~2026 서비스 상황(시즌 구성 변경 여부) 미확인.

## 4. Last Epoch — 스킬 특화 트리, 전설 잠재력(Legendary Potential)/시간 성소(Temporal Sanctum), 세트, 아이템 팩션

### Takeaway
Last Epoch는 스킬 젬 대신 "특화(Specialization)한 스킬 최대 5개마다 독립 트리"를 주어, 노드 선택으로 스킬의 원소·공격 형태·트리거까지 바꾼다. 아이템 측에선 유니크의 전설 잠재력(LP) 수치만큼 엑잘티드(Exalted) 아이템의 접사를 이식해 "고유 효과+고급 접사"를 결합한다.

### Cited Findings
- 최대 5개 스킬을 특화할 수 있고 슬롯은 레벨업에 따라 해금(마지막 슬롯은 엔드게임). 해금 레벨은 출처 간 불일치(첫 슬롯 5레벨 vs 4/8/20) — [Upcomer](https://upcomer.com/how-to-specialize-in-skills-in-last-epoch); [Steam 토론](https://steamcommunity.com/app/899770/discussions/0/4300445619227435806)
- 특화된 스킬은 각자 독립된 스킬 트리를 가지며 피해·범위·시전속도·마나 비용 등 버프 노드 제공 — [Maxroll passives and skills](https://maxroll.gg/last-epoch/resources/passives-and-skills)
- 일부 노드는 공격 방식을 근본적으로 바꾼다: 원소 변경, 3타 콤보를 단일 타격으로 전환, 다른 스킬 자동 트리거, 버프/디버프 부여 등. 해골 소환 스킬의 "Big Boy Skeletons" 노드 같은 형태 변화 사례 — [Goonhammer](https://goonhammer.com/the-last-epoch-an-arpg-that-cares-how-skilled-you-are); [Invenglobal 개요(검색 요약)](https://www.invenglobal.com/articles/26283/what-makes-last-epoch-different-unique-systems-overview)
- 리스펙: 특화 포인트 1개 제거 시 스킬 레벨 1 감소, 새 스킬로 특화 변경 시 '최소 특화 레벨'에서 시작(최소치는 레벨에 따라 상승) — [Last Epoch 공식 지원](https://support.lastepoch.com/hc/en-us/articles/46363248708251-How-do-I-respec)
- 전설 잠재력(LP)은 유니크 아이템의 수치로, 0~4(출처에 따라 1~4)이며 높을수록 강력한 레전더리 가능 — [Prima Games](https://vip-develop.primagames.com/?p=242732); [AFK Gaming](https://afkgaming.com/gaming/general/last-epoch-what-is-legendary-potential-and-how-does-it-affect-crafting)
- 시간 성소(Temporal Sanctum)에서 같은 타입의 유니크 + 엑잘티드 아이템을 결합(신성 시대 Divine Era에 넣고 Temporal Shift로 폐허 시대에서 회수), 던전 1회당 1회 — [AFK Gaming 레전더리 제작](https://afkgaming.com/gaming/general/heres-how-you-can-craft-legendary-items-in-last-epoch)
- 아이템 팩션: 캐릭터당 하나만 소속. Merchant's Guild = 거래소(Bazaar), Circle of Fortune = 자기 드랍 강화·예언(Prophecy) 타깃 파밍, 고랭크 시 세트 아이템 드랍 시 세트 전체 드랍 — [EHG 개발자 블로그](https://forum.lastepoch.com/t/trade-development-update-introducing-merchants-guild-and-circle-of-fortune-factions/51994); [Maxroll Item Faction Overview](https://maxroll.gg/last-epoch/getting-started/item-faction-overview); [Icy Veins](https://www.icy-veins.com/last-epoch/trade-and-item-factions-overview)
- 시즌 5(Rage of the Frostborn)에서 Merchant's Guild 구매 랭크 제한 제거, CoF 예언 시스템 재설계(예언 슬롯 4개) — [ActionRPG.com](https://actionrpg.com/posts/last-epoch-season-5-overhauls-merchants-guild-and-circle-of-fortune)

### Inferences
- "스킬별 독립 트리 + 노드가 동작 자체를 변환" 모델은 사용자 설계의 젬 소켓에 가장 유용한 참고점: 젬을 '+수치'가 아닌 '스킬 형태 변환(원소/투사체 수/트리거)'로 설계하면 버튼 수를 늘리지 않고 빌드 깊이를 확보.
- LP 0~4가 "몇 개의 접사를 이식할 수 있는가"를 정하듯, 사용자 설계의 "패시브 등급은 아이템 등급 이하 랜덤"은 LP와 구조적으로 같다(상한은 결정적, 실제값은 랜덤). LP처럼 상한 대비 실제 굴림을 명시 표시하면 수집 동기가 명확해짐.
- 특화 슬롯 수 제한(5개)과 리스펙 비용(최소 레벨 보장)은 "궁극기 풀에서 교체 가능" 규칙의 교체 비용 설계에 참고 가능.

### Gaps
- 패시브 트리(베이스 클래스 + 3개 마스터리 중 1 선택), 세트 아이템 보너스 구조, 아이돌(Idol) 시스템, 엑잘티드 T6~T7 접사, Weaver 트리 등은 학습 지식 수준이며 출처 확인 못함.
- 스킬 특화 레벨 상한(기본 20) 미검증.

## 5. Grim Dawn — 아이템 부여 스킬(액티브/프록), 헌신(Devotion) 별자리와 천상의 힘, 듀얼 클래스

### Takeaway
Grim Dawn은 장비·컴포넌트가 액티브 스킬(퀵바 장착) 또는 확률 발동 프록 스킬을 직접 부여하며, 헌신 별자리의 천상의 힘(Celestial Power)을 플레이어 스킬(아이템 부여 스킬 포함)에 "바인딩"해 조건부 발동시킨다. 두 마스터리 조합으로 클래스가 정해진다.

### Cited Findings
- 무기용 컴포넌트는 완성 시 모두 고유 액티브 스킬을 부여 — [Grim Dawn 공식 가이드: Components](https://www.grimdawn.com/guide/items/components/)
- 아이템 스킬은 두 종류: 액티브(마스터리 스킬처럼 퀵바에 등록, 아이템 장착 필요)와 자동 시전(예: "Revenge (근접 피격 시 20% 확률)") — [Grim Dawn 공식 가이드: Item Skills](https://www.grimdawn.com/guide/character/item-skills/)
- 같은 프록 중복 시 출력보다는 발동 확률이 늘어난다는 커뮤니티 답변; 장비 효과는 '스킬'이 아니어서 스킬 강화 장비의 혜택을 받지 않는다(비공식, 오래된 글) — [Steam 토론](https://steamcommunity.com/app/219990/discussions/0/152390014802260383/)
- 개발사는 패치에서 아이템 부여 스킬의 피해/발동 확률을 개별 조정(예: v1.2.1.3에서 Amber 부여 스킬 피해 상향) — [Crate 포럼 정리글](https://forums.crateentertainment.com/t/skills-granted-by-items-video-gt-links-damage-types-source-item-types/95430)
- 헌신은 성소(shrine) 복원으로 헌신 포인트 1점 획득, 별자리의 밝게 빛나는 별이 스킬에 할당할 천상의 힘을 부여 — [Grim Dawn 공식 가이드: Devotion](https://www.grimdawn.com/guide/character/devotion)
- 변경 후 바인딩 가능한 스킬 목록에 장비·컴포넌트로 얻은 스킬도 포함 — [Grim Misadventures #83 (GameBanshee)](https://gamebanshee.com/kwkrh)
- 스킬 하나에는 천상의 힘 하나만 바인딩 가능하나 동시 사용 개수 제한은 없음. 토글 스킬에 바인딩하면 항상 발동 가능 — [Steam 토론](https://steamcommunity.com/app/219990/discussions/0/2257935717966739304)

### Inferences
- "천상의 힘을 스킬에 바인딩" 구조는 사용자 설계의 "방어구 랜덤 이름 패시브"를 스킬①/②에 연결하는 방식으로 응용 가능(예: 패시브가 특정 스킬 사용 시 발동하는 프록).
- 아이템 부여 스킬을 개별 패치로 튜닝하는 사례는, 무기/방어구가 스킬을 직접 주는 구조에서 밸런스 단위가 '아이템×스킬' 조합으로 늘어나는 운영 비용을 보여줌.

### Gaps
- 헌신 최대 포인트(학습 지식상 55), 친화도(Affinity) 요구/부여 규칙, 천상의 힘 레벨업(사용으로 경험치), 듀얼 마스터리(레벨 10에 2번째 선택, 두 이름 조합 클래스명) 등 세부 수치는 출처 확인 실패.

## 6. Diablo 4 — 전설 위상(Aspect)·코덱스, 유니크, 정복자 보드(Paragon)·문양(Glyph), 스킬 바/궁극기, 확장팩 변화

### Takeaway
D4는 스킬 바 6칸(기본/보조 포함)에 궁극기도 같은 칸을 차지하며 궁극기 트리에서 1개만 선택한다. "동작을 바꾸는 힘"은 주로 전설 위상(Aspect)과 유니크에 담기며, 위상은 코덱스(Codex of Power)로 계정 단위 수집·재사용된다. 2026년 4월 확장 Lord of Hatred와 3.0.0 패치로 스킬 트리·정복자 보드·문양 성장 방식이 재편됐다.

### Cited Findings
- 액션 바에 동시에 할당 가능한 액티브 스킬은 6개(기본·보조 공격 포함) — [GGRecon](https://www.ggrecon.com/guides/diablo-4-active-skills/); [Fextralife Skills](https://diablo4.wiki.fextralife.com/Skills)
- 궁극기는 별도 칸 없이 6칸 중 하나를 차지하며, 궁극기 스킬 트리에서 1개만 선택 가능. 전용 궁극기 칸 요청이 있었음 — [Kotaku](https://kotaku.com/diablo-4-iv-ultimate-ult-abilities-add-more-slots-1850548865); [Blizzard 포럼](https://us.forums.blizzard.com/en/d4/t/ultimate-skill-key/25653)
- 코덱스: 각 전설 위상은 특정 던전에 연결, 완료 시 시즌(또는 영원 영역) 동안 영구 해금되나 항상 최약 기본값. 코덱스 위상은 무한 각인 가능, 아이템에서 추출한 위상은 소모 — [Maxroll Powering up](https://maxroll.gg/d4/getting-started/powering-up-in-diablo-4)
- 위상 카테고리와 슬롯 제한: 공격(무기·장갑·반지·목걸이), 방어(투구·갑옷·바지·방패·목걸이), 자원(반지만), 유틸리티, 이동(신발·목걸이). 같은 위상 중복 시 더 좋은 쪽만 적용 — [PureDiablo Legendary Aspect](https://www.purediablo.com/diablo4/Legendary_Aspect); [Mobalytics 위상 목록](https://mobalytics.gg/diablo-4/guides/all-diablo-4-legendary-aspects)
- 시즌 7에 궁극기 연동 범용 위상 추가(예: Aspect of Apogeic Furor — 궁극기 시전 시 궁극기 피해 증가 중첩, 10중첩 시 쿨다운과 보너스 초기화) — [Sportskeeda S7 위상](https://sportskeeda.com/mmo/diablo-4-new-legendary-aspects-season-7)
- 스피릿본(Vessel of Hatred): 레벨 15에 주 수호령(Primary Spirit) 선택 시 해당 수호령 전용 보너스 + 모든 스킬에 그 수호령 태그 부여, 레벨 30에 보조 수호령으로 영구 패시브. 예) 고릴라 주: 고릴라 스킬 시전 시 가시 피해 100% + 최대 생명력 10% 보호막(최대 40%) — [Maxroll Spirit Hall](https://maxroll.gg/d4/resources/spiritborn-spirit-hall); [Game8](https://game8.co/games/Diablo-4/archives/476915); [Blizzard 뉴스](https://news.blizzard.com/en-gb/article/24107497/awaken-the-ferocity-of-a-new-class-spiritborn)
- Lord of Hatred: 2026-04-28 출시, 신규 지역 스코보스(Skovos), 신규 클래스 성기사(Paladin)·흑마법사(Warlock), War Plans 시스템 — [Wikipedia](https://en.wikipedia.org/wiki/Diablo_IV:_Lord_of_Hatred); [Icy Veins](https://www.icy-veins.com/d4/news/diablo-4-lord-of-hatred-overview/)
- 패치 3.0.0(무료 공통): 스킬 트리 재작업, 레벨 상한 70, 루트 필터, 핏(Pit) 개편, 아이템화 업데이트 등 — [Fextralife LoH](https://fextralife.com/diablo-4-lord-of-hatred-release-date-and-new-content-revealed/)
- 문양 성장: LoH에서 경험치가 아닌 핏 단계 완료로 문양 랭크업 시도. 반경은 레벨 1 최소 → 25에서 첫 확장 → 51에서 핵심 임계(전설 보너스 배수 해금). 상한은 출처 간 불일치(150 vs 100 vs 시즌13 50) — [Maxroll Paragon](https://maxroll.gg/d4/resources/paragon-boards); [Fextralife Glyphs](https://diablo4.wiki.fextralife.com/Glyphs); [Boostmatch S13](https://boostmatch.gg/blog/diablo-4/articles/diablo-4-season-13-lord-of-hatred-paragon-guide); [GameRant](https://gamerant.com/diablo-4-lord-of-hatred-war-plans-pit-upgrade-glyphs/)
- LoH에서 정복자 보드/문양의 가산 피해가 크게 감소(단일 출처) — [iggm](https://www.iggm.com/news/diablo-4-lord-of-hatred-game-changing-endgame-tactics)

### Inferences
- D4의 "궁극기는 트리에서 1개만, 일반 칸을 차지"는 사용자 설계의 "③ 궁극기를 해금 풀에서 1개 선택"과 동형. D4에서 궁극기 전용 칸 요구가 꾸준했던 점은, 사용자 설계처럼 궁극기 전용 슬롯을 따로 두는 쪽이 플레이어 기대에 부합함을 시사.
- 코덱스(최초 획득은 최저 수치, 이후 고수치 파밍)는 "이름 있는 패시브를 한 번 얻으면 도감 해금, 등급은 아이템 등급 이하 랜덤" 구조와 결합 가능: 도감으로 '종류' 수집, 아이템 굴림으로 '수치/등급' 수집의 2축 파밍.
- 위상 카테고리별 슬롯 제한은 "방어구에서만 나오는 패시브 종류"를 부위별로 분리하는 설계 참고 자료.

### Gaps
- 아이템 등급별 접사 수(학습 지식: 매직 1~2, 레어 2~3+, 레전더리 3+위상, 유니크 고정, 선조(Ancestral) 그레이터 접사), 템퍼링/마스터워크, 신화 유니크(Mythic) 규칙은 이번 조사에서 1차 출처 미확인.
- 3.0.0 스킬 트리 재작업 후 궁극기 규칙 변경 여부 미확인(Blizzard 패치 노트 미열람).

## 7. Diablo Immortal (모바일 참고) 및 "버튼 수 vs 빌드 깊이"에 대한 개발자 발언

### Takeaway
Diablo Immortal은 왼손 가상 스틱 이동 + 오른손 하단 스킬 버튼 구조로 직접 조작을 전제하며, 마나를 쿨다운/충전으로 대체했다. ARPG 개발자들은 버튼 수 자체보다 "여러 행동을 강제하는 구조"(PoE2) 혹은 "화면 가림/엄지 위치"(Immortal)를 핵심 제약으로 다룬다.

### Cited Findings
- 왼쪽 엄지는 영웅 이동, 선택된 스킬은 우하단에 위치. 데모에서 마나 자원이 없고, 개발진은 이전 빌드에서 마나를 스킬별 쿨다운·충전으로 대체했다고 설명 — [PC Games(독일) 체험기](https://www.pcgames.de/Diablo-Immortal-Spiel-62024/Specials/Angespielt-Steuerung-1268702/)
- 리드 디자이너 Wyatt Cheng: 화면이 작고 엄지가 화면을 덮어 정보 가림이 과제 — [TouchArcade BlizzCon 2018](https://toucharcade.com/2018/11/05/blizzcon-2018-with-diablo-immortal-blizzard-hopes-to-get-the-full-diablo-experience-on-the-go/)
- 직접 조작이 가능해지자 D3에서 포기했던 'Icy Ground'(미끄러짐) 접사를 도입 — 조작 방식이 아이템/접사 설계 가능 범위를 바꾼 사례 — [TouchArcade](https://toucharcade.com/2018/11/05/blizzcon-2018-with-diablo-immortal-blizzard-hopes-to-get-the-full-diablo-experience-on-the-go/); [TechRadar](https://www.techradar.com/news/why-diablo-immortal-had-to-be-a-mobile-game-first)
- PoE2 Rogers: 원클릭 정리보다 여러 행동을 요구하려 함; 무기 스왑을 다중 스킬 사용 유도 장치로 언급 — [MMORPG.com](https://www.mmorpg.com/interviews/interview-path-of-exile-2s-game-director-jonathan-rogers-chats-gameplay-intentions-inclusions-and-improvements-2000130901); [Maxroll PAX West](https://maxroll.gg/poe/news/pax-west-path-of-exile-2-interview-with-jonathan-rogers)
- D4는 6칸 제한으로 궁극기도 일반 칸을 소모, 플레이어 측 "칸 하나 더" 요구 — [Kotaku](https://kotaku.com/diablo-4-iv-ultimate-ult-abilities-add-more-slots-1850548865)

### Inferences (희귀도와 '행동 변화형 힘' vs 순수 스탯 — 비교 해석)
- 공통 패턴: 낮은 등급은 접사 수(스탯)만 증가, 최상위 등급(D4 레전더리/유니크, LE 유니크/레전더리, PoE 유니크, GD 컴포넌트·레전더리)에서만 스킬 동작을 바꾸는 효과가 등장. 사용자 8등급 체계에서는 UC~R=스탯, SR~SSR=조건부 프록/수치형 이름 패시브, UR 이상=스킬 형태 변환/키스톤형 트레이드오프로 단계화하는 것이 업계 관행과 일치(해석).
- 모바일 3영웅 파티에서 영웅당 ①②③ 3버튼 × 3 = 9입력은 PoE2 기본 9칸과 수가 같다. Immortal(기본공격+스킬 4+궁극 계열)보다 많으므로, 오토/세미오토(일반 스킬 자동, 궁극기만 수동) 옵션이 사실상 필수일 것(해석).
- 빌드 깊이를 버튼 수 대신 "스킬 변형 노드(LE)", "서포트/젬(PoE·언디셈버 링크)", "바인딩 프록(GD 헌신)", "수집형 위상(D4 코덱스)"으로 공급하는 것이 모바일에 적합한 방향(해석).

### Gaps
- Diablo Immortal의 정확한 스킬 슬롯 수(학습 지식: 기본 공격 1 + 스킬 4, 일부 궁극기형 스킬은 충전식), 전설 장비가 스킬을 변형하는 방식(예: 특정 스킬 강화 레전더리), 공명/전설 보석 시스템은 1차 출처 미확인.
- "too many buttons"를 직접 언급한 GGG/EHG/Blizzard 개발자 인용문은 찾지 못함. 등급-접사 수 관계를 공식적으로 설명한 개발자 글도 미확인.
