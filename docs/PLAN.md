# 숲속 원정대: 고블린 굴 — 구현 계획

## 산출물
- `dist/forest_expedition.html` — 외부 의존성 없는 **단일 HTML** (인라인 JS/CSS). 이것만 열면 실행된다.
- `src/` — 위 파일을 만드는 원본. `node tools/build.js`로 하나로 합친다(단순 연결, 번들러 없음).

## 파일 구조
| 파일 | 내용 | 언리얼 대응 |
|---|---|---|
| `src/index.html` | 셸 HTML, DOM 레이어 | UMG 루트 위젯 |
| `src/css/style.css` | UI 스타일 | UMG 스타일 |
| `src/js/00_util.js` | 시드 RNG(mulberry32), 수학, 이징 | `FRandomStream` |
| `src/js/01_data.js` | **모든 데이터 테이블**: 상수, 영웅, 스킬, 적, 조우, 노드, 이벤트, 유물, 상점, 상태이상, 전략 프리셋 | `UDataTable` 행 구조체 |
| `src/js/02_sprites.js` | 페인터리 치비 아트(코드 드로잉, 공통 재질·조명) → 레이어별 오프스크린 캐시. `SPRITE_IMAGE_OVERRIDES`로 PNG 교체 가능 | `UPaperSprite`/텍스처 |
| `src/js/03_audio.js` | WebAudio 합성 효과음 | `USoundCue` |
| `src/js/04_core.js` | 런 상태, 장면 상태 머신, 입력, DOM 헬퍼 | `UGameInstance` + `GameMode` |
| `src/js/05_map.js` | 경로 지도 생성(제약 포함) + 지도 장면 | 서브시스템 + 위젯 |
| `src/js/06_battle_sim.js` | **전투 시뮬레이션(순수 로직, 고정 타임스텝, 렌더 무관)** | `UBattleSubsystem` (Tick 분리) |
| `src/js/07_battle_view.js` | 전투 렌더/연출/HUD/수동 타겟팅 | 액터 + UMG |
| `src/js/08_field.js` | 쿼터뷰 필드(마을 광장) | 레벨 + 캐릭터 무브먼트 |
| `src/js/09_scenes.js` | 타이틀/보상/이벤트/상점/휴식/고목/결과/전략 편집 | UMG 화면 |
| `src/js/10_main.js` | 부트, 메인 루프, 리사이즈(16:9 레터박스) | — |
| `tools/build.js` | 단일 HTML 생성 | — |
| `tools/e2e.mjs` | Playwright 헤드리스 검증(버튼, 완주, 전멸, 모바일 해상도, 터치 타겟) | 자동화 테스트 |
| `tools/check_logic.cjs` | 지도 생성 제약 1000시드 + 시드 결정성 | 단위 테스트 |
| `tools/balance.cjs` | 헤드리스 대량 전투로 승률/시간 측정 | 밸런스 툴 |

## 핵심 설계
- **장면 상태 머신**: `title → field → map → (battle|event|shop|rest|tree) → reward → map … → boss → result`.
- **전투 = 시뮬 + 뷰 분리**: `BattleSim.step(1/60)`은 상태만 바꾸고 이벤트 큐(`hit`, `heal`, `death`, `cast`, `charge` …)를 쌓는다. 뷰는 이벤트를 소비해 팝업/히트스톱/효과음을 낸다. 같은 시드 + 같은 입력이면 같은 결과.
- **시간 제어**: `timeScale` 0(전술 정지)/0.25(확정 직후 0.2초 감속)/1/2. 히트스톱은 뷰가 누적기를 멈춰 구현.
- **타겟팅은 UI 우선**: 적 칩/아군 초상화 탭 → 확정. 범위 스킬은 바닥 가로 구간을 드래그 → 확정. 스프라이트 탭은 보조.
- **자동 전략**: 캐릭터별 규칙 3슬롯 `[조건]→[스킬]→[타겟 규칙]`, 궁극기는 별도 토글(기본 수동 대기).
- **영구 사망**: 사망한 아군은 런 상태에서 `dead=true`. 대형은 살아있는 순서로 매 프레임 슬롯 위치를 보간(재정렬).

## 단계와 검증
1. 데이터/유틸/스프라이트 → 스프라이트 시트 스크린샷으로 화풍 확인
2. 전투 시뮬 → 헤드리스 대량 시뮬로 밸런스(승률/시간) 측정
3. 전투 뷰/HUD/수동 타겟팅 → 스크린샷 + 입력 자동화
4. 지도/노드 장면 → 생성 제약 1,000 시드 검사
5. 필드 → 이동/상호작용 자동화
6. 전체 흐름 → 5스테이지 완주, 전멸 결과 화면, 모든 버튼, 모바일 해상도

## 방향 변경 이력
- 아트: 동물 도트 → **사람 치비 판타지(스피릿위시풍 2.5등신)**로 변경. 몬스터도 같은 재질/조명 함수로 통일.
  코드 드로잉의 한계상 상용 3D 렌더 원화 수준은 아니며, 실제 원화가 생기면 `SPRITE_IMAGE_OVERRIDES`에 PNG 경로만 넣으면 교체된다.
- 파티: 최대 **3인**(`CONST.PARTY_SIZE`). 로스터 5명 중 필드에서 편성, 던전 입장 후 고정. 적 체력은 출전 인원 배율(`PARTY_ENEMY_SCALE`).
