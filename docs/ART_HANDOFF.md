# 숲속 원정대 — 에셋 제작 가이드 (다른 채팅용)

> 이 문서를 **이미지를 만드는 다른 채팅에 통째로 붙여 넣고** "이 가이드대로 ○○ 캐릭터를 만들어 줘"라고 요청하면 된다.
> 만든 PNG는 **이 게임 개발 채팅에 올리면** 바로 게임에 들어간다 (`tools/art/import_art.py` 가 자르고·줄이고·초상화까지 만든다).

---

## 1. 작업 흐름

1. 다른 채팅에 이 문서를 붙여 넣는다.
2. 아래 **캐릭터 목록**에서 몇 명씩 골라 만든다 (한 번에 1명 또는 같은 직업 5명 시트).
3. 결과 PNG(투명 배경)를 개발 채팅에 올린다 — 파일 이름을 영웅 id로 하면 가장 빠르다 (`yeon.png`, `mujin.png` …).
4. 개발 채팅에서 가져오기 → 전투·마을·던전·초상화에 바로 적용된 새 버전을 받는다.

이미 들어간 그림: **14명** (아래 표의 ✅). 엘린(`elin`)은 움직이는 전용 시트가 있어서 그대로 둔다.

---

## 2. 화풍 (지금 받은 4장 기준)

- **2.5~3등신 치비** · 큰 눈 · 또렷한 표정 · 전신(발끝까지)
- **화려한 판타지 의상**: 금장 테두리·문양, 보석 장식, 가죽 벨트·주머니, 털 장식, 천의 주름과 금속 광택이 세밀하게
- 직업마다 **상징 색 하나 + 금색 포인트** (예: 화염=빨강, 빙결=파랑/흰 털, 저주=보라, 자연=초록)
- **두꺼운 흰 스티커 외곽선** (캐릭터 둘레 5~8px 흰 테두리)
- 무기·소품을 손에 든 **대기 자세** (정면 또는 살짝 3/4)
- 그림자·바닥·배경 없음, **투명 배경**

## 3. 기술 규격 (중요)

| 항목 | 규격 |
|---|---|
| 형식 | **PNG, 투명 배경** |
| 크기 | 캐릭터 1명 기준 **세로 1024px 이상** (전신이 꽉 차게, 위아래 여백 작게) |
| 구성 | **1명 = 1장 권장**. 시트로 만들 때는 가로로 5명, **사이 간격 40px 이상**, 번호(01 02…)·제목 글자 **넣지 않기** |
| 방향 | **모두 오른쪽을 보는 3/4** (v0.61부터 기존 그림도 전부 오른쪽으로 맞춤). 게임이 좌우를 뒤집어 왼쪽도 만든다. 왼쪽을 보는 그림이 오면 `map.json` 의 `flip` 에 넣는다 |
| 발 | 두 발이 그림 맨 아래에 닿게 (발끝이 잘리지 않게) |
| 파일 이름 | 영웅 id (아래 표) — 예: `nera.png` |

> 번호 글자가 발에 붙어 있으면 자동으로 지우지만 조금 남을 수 있다. **1명씩, 번호 없이** 만드는 게 가장 깔끔하다.

### 공통 프롬프트 (영어 — 이미지 모델용)

```
chibi fantasy RPG character, 2.5-3 head-tall proportions, full body standing idle pose holding [WEAPON],
highly detailed ornate fantasy outfit with gold filigree trim, gemstones, leather belts and pouches, fur trim,
rich painterly anime game art style, big expressive eyes, warm saturated colors with gold accents,
thick white sticker outline around the character, transparent background, no shadow, no text, no numbers,
single character, front view slightly turned to the right, feet visible at the bottom edge
```
→ `[WEAPON]` 자리와 아래 표의 **외형**을 이어 붙인다.

---

## 4. 영웅 목록 (35명)

| id | 이름 | 직업 | 칭호 | 상태 | 외형 제안 (자유롭게 바꿔도 됨) |
|---|---|---|---|---|---|
| tobi | 토비 | 탱커(기사) | 철벽 수호자 | ✅ | 금빛 중갑 · 사자 문양 탑방패 · 철퇴 |
| elin | 엘린 | 탱커(기사) | 반격의 기사 | 🎞 전용 시트 | 은발 여기사 · 검과 방패 (지금 그대로) |
| leon | 레온 | 탱커(기사) | 성기사 | ✅ | 은발 · 청색 백합 문양 방패 · 빛나는 장검 |
| gor | 고르 | 탱커(기사) | 망자 기사 | ✅ | 백발 노기사 · 녹색 망토 · 창과 방패 |
| danbi | 단비 | 근딜(전사) | 출혈 검사 | ✅ | 붉은 머리 · 대검 |
| kai | 카이 | 근딜(전사) | 그림자 암살자 | ✅ | 은발 단발 · 보라 드레스 갑옷 · 곡도 두 자루 |
| bran | 브란 | 근딜(전사) | 파쇄 투사 | ✅ | 민머리 · 중갑 · 전쟁 망치 |
| hwa | 화연 | 근딜(전사) | 쌍검 무희 | ✅ | 금빛 곱슬머리 · 노란 천 · 넓은 검 |
| yeon | 연 | 도적 | 독칼 도적 | ⬜ | 초록 두건과 복면 · 가죽 경갑 · 독이 묻은 단검 두 자루 · 날렵한 자세 |
| ruka | 루카 | 도적 | 그림자 추적자 | ⬜ | 검은 후드 망토 · 그림자 연기 · 투척 단검 · 날카로운 눈 |
| nera | 네라 | 도적 | 독술사 | ⬜ | 보라·초록 독약병 벨트 · 곡선 단검 · 뱀 문양 |
| mujin | 무진 | 수도승 | 권법 수도승 | ⬜ | 짧은 머리 · 주황 무도복 · 붕대 감은 주먹 · 염주 |
| soha | 소하 | 수도승 | 바람 발차기 | ⬜ | 하늘색 무도복 · 바람 문양 · 발차기 자세 · 리본 |
| baekun | 백운 | 수도승 | 금강 수행자 | ⬜ | 흰 수행복 · 금빛 염주 · 커다란 체구 · 금강저 |
| byeolbi | 별비 | 원딜(궁수) | 명사수 | ⬜ | 초록 망토 · 별 장식 장궁 · 화살통 |
| haram | 하람 | 원딜(궁수) | 저격수 | ⬜ | 긴 머리 · 망원 조준경 달린 석궁 · 가죽 코트 |
| mir | 미르 | 원딜(궁수) | 독침 사냥꾼 | ⬜ | 깃털 장식 · 짧은 활 · 독침 화살 · 야생 사냥꾼 |
| dal | 달래 | 원딜(궁수) | 화약 사수 | ⬜ | 고글 · 화약 총 · 탄띠 · 연기 |
| soldam | 솔담 | 마법사 | 화염 마법사 | ✅ | 빨간 마녀 모자 · 불꽃 지팡이 |
| seori | 서리 | 마법사 | 빙결술사 | ✅ | 흰 털 망토 · 초승달 얼음 지팡이 |
| nox | 녹스 | 마법사 | 저주술사 | ✅ | 안경 · 보라 마도서 |
| eun | 은하 | 마법사 | 번개술사 | ✅ | 금발 · 별 모자 · 별 지팡이 |
| daon | 다온 | 저주술사 | 계약의 저주술사 | ✅ | 보라 후드 · 까마귀 지팡이 · 등불 |
| risha | 리샤 | 저주술사 | 혈마술사 | ✅ | 붉은 부적 · 저주 인형 · 붉은 책 |
| kali | 칼리 | 저주술사 | 파멸술사 | ✅ | 은발 · 보라 마도서 · 보라 불꽃 |
| seren | 세렌 | 흑마술사 | 악마 계약자 | ⬜ | 검붉은 로브 · 작은 뿔 장식 · 악마 계약서 두루마리 · 옆에 꼬마 임프 |
| roa | 로아 | 흑마술사 | 지옥불 소환사 | ⬜ | 녹색 지옥불 지팡이 · 사슬 · 검은 갑주 로브 |
| maha | 마하 | 흑마술사 | 공허의 군주 | ⬜ | 남보라 공허 로브 · 떠다니는 공허 구슬 · 왕관 장식 |
| myoyeon | 묘연 | 네크로맨서 | 망자의 군주 | ⬜ | 흰 머리 · 해골 지팡이 · 검은 수의 · 영혼 불꽃 |
| bella | 벨라 | 네크로맨서 | 뼈 조각사 | ⬜ | 뼈 장신구 · 뼈 낫 · 고딕 드레스 |
| kamu | 카무 | 네크로맨서 | 역병 사령술사 | ⬜ | 역병 의사 가면 · 초록 독안개 향로 · 넝마 망토 |
| bori | 보리 | 서포터 | 생명의 사제 | ⬜ | 분홍 머리 · 흰 사제복 · 생명의 나무 지팡이 |
| lumi | 루미 | 서포터 | 축복의 음유시인 | ⬜ | 하프 · 깃털 모자 · 화사한 망토 |
| sera | 세라 | 서포터 | 수호 치유사 | ⬜ | 하늘색 수녀복 · 작은 방패 · 빛나는 홀 |
| narae | 나래 | 서포터 | 전쟁 북잡이 | ⬜ | 큰 북 · 깃발 · 붉은 군복 |

받은 시트에서 아직 안 쓴 5명도 나중에 새 영웅으로 쓸 수 있다: 기사 03(붉은 망토 여기사) · 기사 05(보랏빛 철퇴 여기사) · 전사 02(드워프 도끼) · 마법사 05(초록 자연 마법사) · 저주술사 02·04(남자 저주술사 둘).

---

## 5. 다음 단계 에셋 (같은 화풍 · 같은 규격)

### NPC (마을·필드) — 영웅 그림과 겹치지 않는 **새 인물**로
파일 이름 = id (`npc_guide.png` …) · 1명 = 1장 · 오른쪽 3/4 · 투명 배경 · 세로 1024px 이상 · 흰 외곽선

| id | 이름 | 외형 | 어디에 나오나 |
|---|---|---|---|
| npc_guide | 길잡이 | 흰 수염 노인 · 나무 지팡이 끝에 초록 등불 · 갈색 여행 로브 · 지도 두루마리 | 마을 광장 |
| npc_merchant | 잡화 상인 | 통통한 중년 · 커다란 배낭에 냄비·물약병 주렁주렁 · 웃는 얼굴 · 녹색 두건 | 잡화 노점 |
| npc_smith | 대장장이 | 근육질 · 가죽 앞치마 · 큰 망치 · 그을린 팔 · 짧은 붉은 수염 · 고글 | 화로 옆 |
| npc_soldier | 영지 병사 | 푸른 깃발 달린 창 · 둥근 투구 · 푸른 망토 · 성실한 얼굴 | 우리 거점 |
| npc_hunter | 사냥터 안내인 | 털모자 · 활과 화살통 · 사냥한 토끼 끈 · 갈색 가죽옷 | 사냥터 입구 |
| npc_altar | 소환의 제단지기 | 보라 두건의 신비한 소녀 · 떠 있는 수정 · 별무늬 로브 | 소환의 제단 |

영어 프롬프트 (공통 뒤에 붙이기: *chibi 2.5-head-tall fantasy RPG NPC, full body, 3/4 view facing right, idle pose, ornate costume details with gold trim, soft cel shading, thick white sticker outline, transparent background, no text*)
- npc_guide: *old village guide, long white beard, brown travel robe, wooden staff with a small green lantern, rolled map under arm, kind eyes*
- npc_merchant: *cheerful plump traveling merchant, green hood, huge backpack hung with pots and potion bottles, coin pouch, big smile*
- npc_smith: *muscular blacksmith, leather apron, big forging hammer on shoulder, soot on arms, short red beard, goggles on forehead*
- npc_soldier: *loyal town guard, round steel helmet, blue cape, spear with small blue banner, simple chainmail*
- npc_hunter: *forest hunter guide, fur hat, brown leather clothes, longbow and quiver, rabbits tied on a cord at the belt*
- npc_altar: *mysterious summoning altar keeper girl, purple hood with star patterns, floating crystal above her hands, long sleeves*

### 몬스터 (던전별) — 파일 이름 = 적 id
- **고블린 굴**: goblin(고블린) · goblin_archer(궁수) · goblin_caller(나팔수) · goblin_shaman(주술사) · goblin_bomber(폭탄) · goblin_stalker(암살자) · goblin_trapper(덫사냥꾼) · orc(오크) · orc_shield(방패 오크) · orc_hunter(사냥꾼) · orc_berserker(광전사) · cave_troll(동굴 트롤) · ogre(오우거) · orc_captain(오크 대장)
- **버려진 광산 보스**: stone_golem(광산 골렘) · shadow_king(고블린 그림자 왕) · swamp_turtle(늪거북 장로) · thorn_queen(가시덩굴 여왕) · mist_stag(안개 사슴왕)
- **저주받은 묘지**: skel_warrior(해골 전사) · skel_archer(해골 궁수) · wraith(망령) · crypt_ghoul(묘지 구울) · lich_acolyte(리치 수련생) · bone_giant(뼈 거인) · **lich_king(리치 왕, 보스)**
- **심연의 요새**: fiend_imp(화염 임프) · hellhound(지옥 사냥개) · felguard(지옥 수호병) · temptress(유혹의 악마) · demon_caller(악마 소환사) · doom_lord(파멸 군주) · **pit_lord(심연의 군주, 보스)**
- **굴 보스**: ogre_chief(오우거 대족장)
- 몬스터는 **왼쪽을 보는 방향**(영웅과 마주 보게)으로, 보스는 영웅보다 1.5~2배 크게.

### 환경 (배경)
- 던전 복도 배경 4종 (가로로 이어지는 벽 · 1920×1080): 고블린 굴(나무뿌리 동굴) · 광산(목재 지지대·광석) · 묘지(묘비·안개) · 심연(용암·검은 첨탑)
- 마을 바닥·건물 소품 (투명 PNG 낱개): 대장간 · 잡화점 노점 · 우물 · 보관함 · 포탈 · 집

### 아이콘 (128×128 투명 PNG)
- 스킬 아이콘 (직업별 ①②③) · 장비 아이콘 (무기·갑옷·장신구 등급별 테두리 없이) · 패턴 아이콘 7종(반격 자세·산성 침·수호 보호막·돌가죽·그림자 걸음·피의 갈증·저주 오라)

---

## 6. (선택) 동작 그림

지금은 정지 그림 한 장을 기울이고 늘여서 걷기·공격·시전·피격·쓰러짐을 흉내 낸다. 더 생동감 있게 하려면 같은 캐릭터로 **같은 크기·같은 발 위치**의 그림을 더 만들어 올리면 된다:
`<id>_attack.png`(무기를 휘두르는 순간) · `<id>_cast.png`(마법·기술 시전) · `<id>_hurt.png`(맞아서 움찔) — 들어오면 가져오기 도구에 연결한다.

## v0.61 반영 상태
- 영웅 14명 일러스트 적용 완료 — 모두 오른쪽 3/4
- NPC 6명은 **새로 그려야 한다** (위 NPC 표) — 영웅 시트의 남는 그림은 영웅용이라 NPC로 쓰지 않는다
- 배경·건물·소품은 3D로 직접 만든다(`tools/3d/kit.py`, Blender). 다른 채팅에서는 **캐릭터·몬스터 일러스트**에 집중하면 된다
- 같은 화풍 유지: 굵은 흰 외곽선 · 치비 2.5등신 · 부드러운 셀 음영 · 오른쪽 3/4 · 투명 배경
