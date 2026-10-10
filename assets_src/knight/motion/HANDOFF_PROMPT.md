# 나이트 모션 통합 프롬프트 (Knight motion integration prompt)

너는 이 폴더의 2D 스프라이트 애니메이션을 게임에 넣는 역할이다. 엔진은 정해지지 않았으니 엔진 독립적으로(engine-agnostic) 구현해라.

## 파일 (Files)
- `idle.png` 대기 (combat guard idle), 96프레임, 12열, 루프(loop)
- `run.png` 달리기 (run), 24프레임, 8열, 루프
- `attack.png` 공격 (attack, 3타 콤보), 40프레임, 8열, 1회(one-shot)
- `skill.png` 스킬 (skill, 점프 베기 + 가드 복귀 포함), 97프레임, 10열, 1회
- `knight_anim.json` 메타데이터

모든 시트: 투명 PNG(transparent, straight alpha), 프레임 크기(frame size) 436x428 px 동일, 캐릭터 스케일 동일(34.83 px = 1 world unit), 고정 카메라. 프레임 순서는 행 우선(row-major), 0부터 시작(0-based). 프레임 i의 위치: x=(i % columns)*frame_w, y=floor(i / columns)*frame_h.

## 앵커 (Anchor / pivot)
발 접지점(feet ground point) = 프레임 내 (158, 365) px, 모든 클립·모든 프레임에서 같은 픽셀. 오브젝트 위치를 이 점에 맞춰라 (anchor_norm x=0.3624, y=0.8528, 위에서부터). 클립 전환 시 위치 보정 불필요.

## JSON 스키마 (schema)
`clips.<name>`: `file, frame_w, frame_h, frame_count, columns, rows, fps(24), loop, anchor_px{x,y}, anchor_norm{x,y}`
선택 필드: `hit_frames`(데미지 이벤트 프레임), `active_windows`([시작,끝] 포함 구간, 히트박스 활성), `impact_frame`(스킬 착지 충격), `airborne_frames`, `return_to_guard_from`, `cancel_ok_from`, `move_speed_px_per_sec`.
최상위: `facing`, `pixels_per_world_unit`, `transitions`(권장 전환).

## 상태 머신 (State machine)
- IDLE(대기) ↔ RUN(달리기): 이동 입력 시 run 0프레임부터, 입력 없으면 idle 0프레임으로.
- IDLE/RUN → ATTACK(공격): 입력 즉시, 이동 정지. 마지막 프레임(39) 후 IDLE 0프레임.
- IDLE/RUN → SKILL(스킬): 입력 즉시, 이동 정지. 마지막 프레임(96) 후 IDLE 0프레임 (이음매 없음, seamless). 스킬 48–96프레임이 가드 복귀(return to guard)이며 별도 클립 없음.
- ATTACK → SKILL: 30프레임 이후 캔슬 허용(선택).
- 공격/스킬 중 입력 무시(재생 끝까지). 피격 상태 등은 이 패키지에 없음.

## 루프 규칙 (Loop rules)
idle, run만 루프. idle은 96프레임(48프레임 호흡 2회), 95→0 이음매 매끄러움. run 23→0 매끄러움. attack/skill은 마지막 프레임에서 정지 후 IDLE로.

## 히트 프레임 (Hit / damage events, 0-based)
- attack: 데미지 이벤트 프레임 7, 15, 27 (3타). 활성 구간 [6–8], [15–16], [26–28].
- skill: 활성 [22–25], 데미지/충격(impact) 프레임 25 (착지 충격파, 화면 흔들림 추천). 공중(airborne) 8–24.

## 방향 (Facing)
기본 오른쪽(right). 왼쪽은 X 반전(flip X); 앵커 x는 436−158=278로 미러.

## 이동 속도 (Run move speed)
run 재생 중 오브젝트를 196 px/s (24fps 기준 프레임당 8.2 px, 시트 원본 스케일) 로 이동시키면 발이 미끄러지지 않는다(no foot slide). 스프라이트를 s배로 그리면 속도도 s배. 다른 fps로 재생하면 속도 = 8.2 × fps.

## 알려진 한계 (Known limits)
- 2D 리그 애니메이션이라 run의 발 접지가 완전한 평면 고정이 아님(작은 흔들림).
- 클립 전환은 블렌드 없이 즉시 전환(hard cut). attack 마지막→idle 0은 약간 튐(동작 차이 작음), 필요하면 2–3프레임 크로스페이드.
- 스킬 13–14프레임(=f246 부근) 왼쪽 허벅지 안쪽에 얇은 경계선이 보일 수 있음, run 일부 프레임 허벅지 가장자리 1–2px 거칠음.
- 이펙트(검기, 충격파, 그림자 링)는 시트에 구워져 있음(baked). 따로 끌 수 없음.
- 프레임 크기는 스킬 점프/검 궤적 기준 공통 크기라 idle에서는 여백이 큼.
- 해상도: 원본 렌더의 50% (확대 시 흐려짐).

## 원본 (Source)
원본 .blend는 Google Drive의 `Knight_Combat_updates_2026-10-09` 폴더에 있다. 재렌더가 필요하면 그 파일을 사용(고정 카메라: ortho 29.4, 위치 (0.6, 2.7), 2048x1152 렌더 후 (665,281)-(1537,1137) 크롭, 50% 축소).
