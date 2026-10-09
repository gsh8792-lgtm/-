# -*- coding: utf-8 -*-
"""장비 DB 원본 (단일 소스)

python3 tools/gen_equipment_db.py
  → data/equipment/equipment_db.json   (게임/밸런스 시뮬이 읽는 데이터)
  → data/equipment/csv/*.csv           (언리얼 DataTable 임포트용, UTF-8 BOM)

엑셀(docs/equipment_db.xlsx)은 tools/build_equipment_xlsx.py 가 이 JSON + 밸런스 리포트로 만든다.
수치를 바꿀 때는 이 파일만 고치고 다시 생성한다.
"""
import csv, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data', 'equipment')

# ------------------------------------------------------------------ 등급 (사용자 지정 순서: 낮음 → 높음)
# main: 주 스탯 배율 / opt: 추가 옵션 개수 / optMult: 옵션 수치 배율 / innate: 고유 효과 배율
# gem: 보석 슬롯 [최소, 최대] / cls: 직업 특성 스탯 개수 / skill: 스킬 보너스 개수 [최소, 최대]
GRADES = [
    dict(code='UC', name='UC',      color='#9a9a9a', main=1.00, opt=0, optMult=0.00, innate=1.00, gem=[0, 0], cls=[0, 0], skill=[0, 0]),
    dict(code='C',  name='C',       color='#e8e8e8', main=1.45, opt=0, optMult=0.00, innate=1.35, gem=[0, 0], cls=[0, 0], skill=[0, 0]),
    dict(code='R',  name='R',       color='#4aa3ff', main=1.70, opt=1, optMult=1.00, innate=1.50, gem=[0, 0], cls=[0, 0], skill=[0, 0]),
    dict(code='SR', name='SR',      color='#3fd27a', main=2.10, opt=2, optMult=1.15, innate=1.75, gem=[0, 0], cls=[0, 0], skill=[0, 0]),
    dict(code='SSR', name='SSR',    color='#b86aff', main=2.55, opt=3, optMult=1.30, innate=2.00, gem=[0, 0], cls=[0, 0], skill=[0, 0]),
    dict(code='UR', name='UR',      color='#ff9a2a', main=3.05, opt=4, optMult=1.50, innate=2.30, gem=[0, 0], cls=[0, 0], skill=[0, 0]),
    dict(code='L',  name='Legend',  color='#ffd34a', main=3.20, opt=4, optMult=1.55, innate=2.65, gem=[1, 1], cls=[0, 1], skill=[0, 1], clsOrSkill=True),
    dict(code='E',  name='Elder',   color='#ff4d6d', main=3.30, opt=4, optMult=1.58, innate=3.00, gem=[1, 3], cls=[1, 1], skill=[0, 2]),
]
# L: "직업 특성 스탯이나 스킬 보너스 0~1개" → 없음 30% / 특성 스탯 35% / 스킬 보너스 35%
L_EXTRA_WEIGHTS = {'none': 30, 'cls': 35, 'skill': 35}
E_GEM_WEIGHTS = {1: 55, 2: 33, 3: 12}
E_SKILL_WEIGHTS = {0: 40, 1: 45, 2: 15}

# ------------------------------------------------------------------ 스탯 정의
# pw: 전투력 환산 가중치 (스탯 1당 '유효 전투력 %' 기여, 밸런스 분석용 근사치. 근거는 엑셀 '스탯' 시트)
STATS = [
    dict(key='atk',      name='공격력',          unit='',  pct=False, pw=None,  note='직업 기본 공격력 대비로 환산'),
    dict(key='hp',       name='체력',            unit='',  pct=False, pw=None,  note='직업 기본 체력 대비로 환산'),
    dict(key='atk_pct',  name='공격력%',         unit='%', pct=True,  pw=0.50),
    dict(key='hp_pct',   name='체력%',           unit='%', pct=True,  pw=0.50),
    dict(key='dr',       name='받는 피해 감소',   unit='%', pct=True,  pw=0.60, cap=0.50),
    dict(key='aspd',     name='공격 속도',        unit='%', pct=True,  pw=0.30, cap=0.50),
    dict(key='crit',     name='치명타 확률',      unit='%', pct=True,  pw=0.30, cap=0.60),
    dict(key='critdmg',  name='치명타 피해',      unit='%', pct=True,  pw=0.10),
    dict(key='skilldmg', name='스킬 피해',        unit='%', pct=True,  pw=0.20),
    dict(key='cdr',      name='쿨타임 감소',      unit='%', pct=True,  pw=0.35, cap=0.40),
    dict(key='heal',     name='회복량',           unit='%', pct=True,  pw=0.20),
    dict(key='ultgain',  name='필살기 충전',      unit='%', pct=True,  pw=0.12, cap=0.80),
    dict(key='mspd',     name='이동 속도',        unit='%', pct=True,  pw=0.08, cap=0.50),
    dict(key='dotdmg',   name='지속 피해',        unit='%', pct=True,  pw=0.06),
    dict(key='ccdur',    name='기절·도발 지속',   unit='%', pct=True,  pw=0.10, gimmick=True),
    dict(key='breakdmg', name='그로기 피해',      unit='%', pct=True,  pw=0.10, gimmick=True, note='그로기 게이지를 더 크게 깎는다 (공략 스탯)'),
    dict(key='s1pow',    name='① 스킬 위력',      unit='%', pct=True,  pw=0.12, note='소울 메달 주 스탯 (갑옷 스킬)'),
    dict(key='s2pow',    name='② 스킬 위력',      unit='%', pct=True,  pw=0.12, note='소울 메달 주 스탯 (무기 스킬)'),
    dict(key='vsbroken', name='그로기 적 피해',   unit='%', pct=True,  pw=0.10, gimmick=True, note='그로기 상태 적에게 주는 피해 (공략 스탯)'),
]

# ------------------------------------------------------------------ 직업
CLASSES = [
    dict(key='tank',    hero='tobi',    name='탱커',   heroName='토비', baseAtk=22, baseHp=520, trait='dr',       traitName='받는 피해 감소'),
    dict(key='melee',   hero='danbi',   name='근딜',   heroName='단비', baseAtk=40, baseHp=300, trait='critdmg',  traitName='치명타 피해'),
    dict(key='ranged',  hero='byeolbi', name='원딜',   heroName='별비', baseAtk=36, baseHp=260, trait='crit',     traitName='치명타 확률'),
    dict(key='mage',    hero='soldam',  name='매지션', heroName='솔담', baseAtk=44, baseHp=240, trait='skilldmg', traitName='스킬 피해'),
    dict(key='support', hero='bori',    name='서포터', heroName='보리', baseAtk=16, baseHp=280, trait='heal',     traitName='회복량'),
]
CLS = {c['key']: c for c in CLASSES}

# 슬롯: 무기·갑옷·소울 메달 = 직업 전용 / 반지·목걸이·벨트 = 공통
SLOTS = [
    dict(key='weapon',   name='무기',      classBound=True),
    dict(key='armor',    name='갑옷',      classBound=True),
    dict(key='medal',    name='소울 메달', classBound=True),
    dict(key='ring',     name='반지',      classBound=False),
    dict(key='necklace', name='목걸이',    classBound=False),
    dict(key='belt',     name='벨트',      classBound=False),
]

# 직업별 주 스탯 규칙 (UC 기준값). 무기 = 공격력(기본의 10%) + 직업 특성 부스탯 / 갑옷 = 체력(기본의 10%) + 직업 보조 스탯
WEAPON_SUB = {'tank': ('dr', 0.006), 'melee': ('critdmg', 0.030), 'ranged': ('crit', 0.008), 'mage': ('skilldmg', 0.020), 'support': ('heal', 0.025)}
ARMOR_SUB  = {'tank': ('dr', 0.006), 'melee': ('aspd', 0.020),    'ranged': ('mspd', 0.025), 'mage': ('cdr', 0.010),      'support': ('ultgain', 0.025)}
MEDAL_MAIN = {'tank': ('dr', 0.012), 'melee': ('critdmg', 0.060), 'ranged': ('crit', 0.016), 'mage': ('skilldmg', 0.040), 'support': ('heal', 0.050)}

# ------------------------------------------------------------------ 직업 장비 라인 (고유 효과 = 직업 스킬/특성과 연결)
# eff: 효과 키(게임 구현용), base: UC 수치, unit, pw: UC 기준 전투력 환산(%)
def E(key, text, base, unit, pw, skill=None):
    return dict(key=key, text=text, base=base, unit=unit, pw=pw, skill=skill)

LINES = {
 'tank': {
  'weapon': [('수호자의 메이스', E('s2_break', '② 방패 강타 그로기 피해 +{v}%', 15.0, '%', 1.6, 's2')),
             ('맹세의 장검',     E('s1_guard', '① 도발 중 받는 피해 감소 +{v}%p', 3.0, '%p', 1.4, 's1')),
             ('성채의 철퇴',     E('basic_stun_chance', '평타 적중 시 {v}% 확률로 0.6초 기절', 3.0, '%', 1.5))],
  'armor':  [('성벽 판금갑',     E('charge_dr', '차지 공격 피해 -{v}%', 6.0, '%', 1.6)),
             ('맹세의 사슬갑',   E('s1_taunt_dur', '① 도발 지속 +{v}초', 0.3, '초', 1.4, 's1')),
             ('가시 갑옷',       E('thorns', '받은 근접 피해의 {v}% 반사', 5.0, '%', 1.3))],
  'medal':  [('불굴의 소울 메달', E('ult_dur', '③ 철벽 지속 +{v}초', 0.5, '초', 1.6, 'ult')),
             ('수호성의 소울 메달', E('low_hp_dr', 'HP 30% 이하일 때 받는 피해 -{v}%', 5.0, '%', 1.4))],
 },
 'melee': {
  'weapon': [('바람의 쌍검',     E('s1_bleed', '① 급소 베기 출혈 피해 +{v}%', 10.0, '%', 1.4, 's1')),
             ('파쇄자의 대검',   E('vs_broken', '그로기 적에게 피해 +{v}%', 8.0, '%', 1.6)),
             ('그림자 단검',     E('s2_area', '② 회전 베기 범위 +{v}%', 5.0, '%', 1.4, 's2'))],
  'armor':  [('사냥꾼의 가죽갑', E('kill_aspd', '적 처치 시 2초간 공격 속도 +{v}%', 10.0, '%', 1.3)),
             ('검무사의 경갑',   E('s2_cd', '② 회전 베기 쿨타임 -{v}%', 4.0, '%', 1.5, 's2')),
             ('핏빛 망토',       E('vs_bleed', '출혈 걸린 적에게 피해 +{v}%', 5.0, '%', 1.5))],
  'medal':  [('검귀의 소울 메달', E('ult_power', '③ 난도질 위력 +{v}%', 8.0, '%', 1.5, 'ult')),
             ('투지의 소울 메달', E('trait_brave', '용감함 효과 +{v}%p', 8.0, '%p', 1.5))],
 },
 'ranged': {
  'weapon': [('매의 장궁',       E('s1_vuln_dur', '① 관통 사격 취약 지속 +{v}초', 0.5, '초', 1.4, 's1')),
             ('폭풍의 연궁',     E('double_shot', '평타 {v}% 확률로 2연사', 6.0, '%', 1.6)),
             ('은빛 석궁',       E('ult_power', '③ 집중 사격 위력 +{v}%', 8.0, '%', 1.5, 'ult'))],
  'armor':  [('숲지기 가죽갑',   E('s2_area', '② 화살비 범위 +{v}%', 5.0, '%', 1.4, 's2')),
             ('그림자 망토',     E('near_dr', '적이 70px 안에 있으면 받는 피해 -{v}%', 6.0, '%', 1.4)),
             ('추적자의 조끼',   E('counter_ult', '차지·호출을 끊으면 필살기 게이지 +{v}', 6.0, '', 1.6))],
  'medal':  [('명사수의 소울 메달', E('crit_ult', '치명타 시 필살기 게이지 +{v}', 2.0, '', 1.4)),
             ('바람의 소울 메달',   E('s2_cd', '② 화살비 쿨타임 -{v}%', 5.0, '%', 1.6, 's2'))],
 },
 'mage': {
  'weapon': [('별빛 지팡이',     E('s1_burn', '① 별빛 탄 화상 피해 +{v}%', 10.0, '%', 1.4, 's1')),
             ('유성의 홀',       E('s2_area', '② 유성우 범위 +{v}%', 6.0, '%', 1.5, 's2')),
             ('금단의 마도서',   E('ult_vs_broken', '③ 대마법이 그로기 적에게 위력 +{v}%', 12.0, '%', 1.6, 'ult'))],
  'armor':  [('현자의 로브',     E('cdr_extra', '쿨타임 감소 +{v}%', 1.5, '%', 1.5)),
             ('불꽃 망토',       E('burn_dur', '화상 지속 +{v}초', 0.4, '초', 1.3)),
             ('마력 장막 로브',  E('start_shield', '전투 시작 시 최대 HP {v}% 보호막', 6.0, '%', 1.5))],
  'medal':  [('대마도사의 소울 메달', E('ult_gain', '③ 필살기 충전 +{v}%', 8.0, '%', 1.5, 'ult')),
             ('별의 소울 메달',       E('trait_cautious', '신중함: 차지 피해 감소 +{v}%p', 5.0, '%p', 1.4))],
 },
 'support': {
  'weapon': [('생명의 지팡이',   E('s1_heal', '① 치유 회복량 +{v}%', 8.0, '%', 1.5, 's1')),
             ('빛의 홀',         E('s2_area', '② 광역 치유 범위 +{v}%', 6.0, '%', 1.4, 's2')),
             ('정화의 성구',     E('heal_dr', '치유받은 아군 3초간 받는 피해 -{v}%', 5.0, '%', 1.6))],
  'armor':  [('순백의 사제복',   E('party_healrecv', '파티 회복 받는 양 +{v}%', 3.0, '%', 1.5)),
             ('수호의 성의',     E('ult_dur', '③ 생명의 나무 지속 +{v}초', 0.5, '초', 1.5, 'ult')),
             ('기도의 숄',       E('start_heal', '전투 시작 시 파티 HP {v}% 회복', 3.0, '%', 1.4))],
  'medal':  [('성녀의 소울 메달',   E('ult_power', '③ 생명의 나무 회복량 +{v}%', 8.0, '%', 1.5, 'ult')),
             ('다정함의 소울 메달', E('trait_gentle', '다정함 효과 +{v}%p', 5.0, '%p', 1.4))],
 },
}

# 공통 장신구 라인 (주 스탯만, 고유 효과 없음 → 대신 주 스탯이 큼)
ACCESSORIES = {
 'ring':     [('힘의 반지',     [('atk_pct', 0.022)]), ('예리한 반지', [('crit', 0.015)]),   ('파쇄의 반지', [('breakdmg', 0.050)])],
 'necklace': [('현자의 목걸이', [('skilldmg', 0.040)]), ('시간의 목걸이', [('cdr', 0.015)]), ('영혼의 목걸이', [('ultgain', 0.050)])],
 'belt':     [('거인의 벨트',   [('hp_pct', 0.035)]), ('수호의 벨트', [('dr', 0.015)]),      ('질주의 벨트', [('mspd', 0.030), ('hp_pct', 0.015)])],
}

# ------------------------------------------------------------------ 추가 옵션 풀 (R 기준 범위, 등급 optMult 곱)
# slots: 붙을 수 있는 슬롯 ('*' = 전부). 같은 장비에 같은 옵션 중복 불가.
OPTIONS = [  # 순수 딜 스탯 1줄 ≈ 전투력 1.1% / 생존·공략 스탯 ≈ 1.5% (딜로 찍어누르기 억제, 공략 보상 강화)
    dict(key='atk_pct',  min=0.018, max=0.026, weight=10, slots='*'),
    dict(key='hp_pct',   min=0.025, max=0.035, weight=12, slots='*'),
    dict(key='dr',       min=0.020, max=0.030, weight=7,  slots='armor,belt,medal'),
    dict(key='aspd',     min=0.030, max=0.045, weight=7,  slots='weapon,ring,necklace'),
    dict(key='crit',     min=0.030, max=0.045, weight=7,  slots='weapon,ring,necklace,medal'),
    dict(key='critdmg',  min=0.090, max=0.130, weight=7,  slots='weapon,ring,necklace,medal'),
    dict(key='skilldmg', min=0.045, max=0.065, weight=9,  slots='*'),
    dict(key='cdr',      min=0.035, max=0.050, weight=6,  slots='armor,necklace,medal'),
    dict(key='heal',     min=0.060, max=0.090, weight=6,  slots='weapon,armor,necklace,medal'),
    dict(key='ultgain',  min=0.070, max=0.100, weight=6,  slots='*'),
    dict(key='mspd',     min=0.100, max=0.150, weight=4,  slots='armor,belt'),
    dict(key='dotdmg',   min=0.150, max=0.220, weight=5,  slots='weapon,ring,medal'),
    dict(key='ccdur',    min=0.120, max=0.180, weight=7,  slots='weapon,armor,medal,belt'),
    dict(key='breakdmg', min=0.120, max=0.180, weight=9,  slots='*'),
    dict(key='vsbroken', min=0.120, max=0.180, weight=8,  slots='weapon,ring,necklace,medal'),
]

# ------------------------------------------------------------------ L/E 전용: 직업 특성 스탯 (값: L, E)
CLASS_STAT = {  # E는 개수 확정(1개)이 장점이므로 수치는 L과 동일 (분석: E 수치까지 높이면 L→E 상승폭 +45%로 과도)
    'tank':    dict(stat='dr',       L=0.020, E=0.020),
    'melee':   dict(stat='critdmg',  L=0.090, E=0.090),
    'ranged':  dict(stat='crit',     L=0.025, E=0.025),
    'mage':    dict(stat='skilldmg', L=0.045, E=0.045),
    'support': dict(stat='heal',     L=0.060, E=0.060),
}

# 스킬 보너스: 직업 장비(무기·갑옷·메달)는 해당 직업 스킬 지정, 장신구는 착용자 슬롯 기준(① ② ③)
def SB(key, text, L, E, unit='%', pw=None):
    return dict(key=key, text=text, L=L, E=E, unit=unit, pw=pw)

SKILL_BONUS = {
 'tank':    [SB('s1_power', '① 도발 중 받는 피해 감소 +{v}%p', 4, 6, '%p', 1.5), SB('s1_cd', '① 도발 쿨타임 -{v}%', 10, 14, '%', 1.6),
             SB('s2_power', '② 방패 강타 위력 +{v}%', 15, 20, '%', 1.2),         SB('s2_cd', '② 방패 강타 쿨타임 -{v}%', 10, 14, '%', 1.8),
             SB('ult_power', '③ 철벽 피해 감소 +{v}%p', 5, 7, '%p', 1.7),        SB('ult_dur', '③ 철벽 지속 +{v}초', 1.0, 1.5, '초', 1.6)],
 'melee':   [SB('s1_power', '① 급소 베기 위력 +{v}%', 15, 20, '%', 1.6),        SB('s1_cd', '① 급소 베기 쿨타임 -{v}%', 10, 14, '%', 1.7),
             SB('s2_power', '② 회전 베기 위력 +{v}%', 15, 20, '%', 1.5),         SB('s2_cd', '② 회전 베기 쿨타임 -{v}%', 10, 14, '%', 1.6),
             SB('ult_power', '③ 난도질 위력 +{v}%', 15, 20, '%', 1.6),           SB('ult_hits', '③ 난도질 타수 +{v}', 1, 2, '회', 1.8)],
 'ranged':  [SB('s1_power', '① 관통 사격 위력 +{v}%', 15, 20, '%', 1.6),        SB('s1_cd', '① 관통 사격 쿨타임 -{v}%', 10, 14, '%', 1.7),
             SB('s2_power', '② 화살비 위력 +{v}%', 15, 20, '%', 1.5),            SB('s2_cd', '② 화살비 쿨타임 -{v}%', 10, 14, '%', 1.6),
             SB('ult_power', '③ 집중 사격 위력 +{v}%', 15, 20, '%', 1.6),        SB('ult_gain', '③ 필살기 충전 +{v}%', 12, 16, '%', 1.5)],
 'mage':    [SB('s1_power', '① 별빛 탄 위력 +{v}%', 15, 20, '%', 1.6),          SB('s1_cd', '① 별빛 탄 쿨타임 -{v}%', 10, 14, '%', 1.7),
             SB('s2_power', '② 유성우 위력 +{v}%', 15, 20, '%', 1.5),            SB('s2_cd', '② 유성우 쿨타임 -{v}%', 10, 14, '%', 1.6),
             SB('ult_power', '③ 대마법 위력 +{v}%', 15, 20, '%', 1.6),           SB('ult_gain', '③ 필살기 충전 +{v}%', 12, 16, '%', 1.5)],
 'support': [SB('s1_power', '① 치유 회복량 +{v}%', 15, 20, '%', 1.6),          SB('s1_cd', '① 치유 쿨타임 -{v}%', 10, 14, '%', 1.7),
             SB('s2_power', '② 광역 치유 회복량 +{v}%', 15, 20, '%', 1.5),       SB('s2_cd', '② 광역 치유 쿨타임 -{v}%', 10, 14, '%', 1.6),
             SB('ult_power', '③ 생명의 나무 회복량 +{v}%', 15, 20, '%', 1.6),    SB('ult_dur', '③ 생명의 나무 지속 +{v}초', 1.0, 1.5, '초', 1.6)],
 'common':  [SB('s1_power', '① 기본 스킬 위력·회복 +{v}%', 10, 14, '%', 1.1), SB('s2_power', '② 상황 스킬 위력·회복 +{v}%', 10, 14, '%', 1.0),
             SB('ult_power', '③ 필살기 위력·회복 +{v}%', 10, 14, '%', 1.1),     SB('s1_cd', '① 기본 스킬 쿨타임 -{v}%', 7, 10, '%', 1.2),
             SB('s2_cd', '② 상황 스킬 쿨타임 -{v}%', 7, 10, '%', 1.1),           SB('ult_gain', '③ 필살기 충전 +{v}%', 8, 11, '%', 1.0)],
}

# E 수치는 L × 1.15 로 통일 (밸런스 분석: E가 L보다 과도하게 강해지는 것 방지)
SKILL_BONUS_E_RATIO = 1.15
for _lst in SKILL_BONUS.values():
    for _b in _lst:
        _b['E'] = round(_b['L'] * SKILL_BONUS_E_RATIO, 1) if _b['unit'] in ('초',) else (max(_b['L'] + 1, round(_b['L'] * SKILL_BONUS_E_RATIO)) if _b['unit'] != '회' else _b['L'] + 1)

# ------------------------------------------------------------------ 보석 (스테이지 보스 드랍)
# 효과 개수: UC·C·R = 1 / SR·SSR·UR = 2 / L·E = 3. 첫 효과 = 보석 고유 스탯(100%), 추가 효과 = 다른 스탯/스킬 효과(60%)
GEM_EFFECT_COUNT = {'UC': 1, 'C': 1, 'R': 1, 'SR': 2, 'SSR': 2, 'UR': 2, 'L': 3, 'E': 3}
GEM_MULT = {'UC': 1.00, 'C': 1.25, 'R': 1.50, 'SR': 1.80, 'SSR': 2.10, 'UR': 2.40, 'L': 2.65, 'E': 2.90}
GEM_EXTRA_RATIO = 0.6
GEMS = [
    dict(key='ruby',     name='루비',     stat='atk_pct',  base=0.008, color='#e0405a'),
    dict(key='sapphire', name='사파이어', stat='hp_pct',   base=0.01, color='#4a7ae0'),
    dict(key='emerald',  name='에메랄드', stat='cdr',      base=0.004, color='#3fbf7a'),
    dict(key='topaz',    name='토파즈',   stat='crit',     base=0.0045, color='#f0b030'),
    dict(key='amethyst', name='자수정',   stat='skilldmg', base=0.008, color='#a060e0'),
    dict(key='diamond',  name='다이아',   stat='dr',       base=0.0035, color='#d8f0ff'),
    dict(key='opal',     name='오팔',     stat='ultgain',  base=0.01, color='#f0a0d0'),
    dict(key='pearl',    name='진주',     stat='heal',     base=0.01, color='#f0ece0'),
    dict(key='obsidian', name='흑요석',   stat='breakdmg', base=0.018, color='#3a3048'),  # 공략 보석: 그로기 피해
]
# 보석 추가 효과 풀: 스탯(위 8종 중 본 효과 제외) + 스킬 효과(① ② ③ 위력%)
GEM_SKILL_EXTRAS = [dict(key='s1_power', name='① 기본 스킬 위력', base=0.030), dict(key='s2_power', name='② 상황 스킬 위력', base=0.030), dict(key='ult_power', name='③ 필살기 위력', base=0.030)]

# ------------------------------------------------------------------ 난이도 단계 (장비가 영구 성장이므로 적도 단계별로 강해져야 함)
# hp/atk: 적 배율 (보스 포함). recGrade: 권장 장비 등급 (전 부위 평균)
TIERS = [  # 적 배율(HP·공격력 동일) = 권장 등급 풀세트 +5강(레벨 차 0)으로 탱커 파티 기믹 공략 시 '승률 85% 지점 적 배율' ÷ 장비 없음 기준 (equip_balance.cjs --calibrate / --calib-merge, 짓누름·레벨 보정 반영)
    dict(tier=1, name='견습', hp=1.26, atk=1.26, recGrade='UC'),
    dict(tier=2, name='숙련', hp=1.42, atk=1.42, recGrade='C'),
    dict(tier=3, name='정예', hp=1.67, atk=1.67, recGrade='R'),
    dict(tier=4, name='영웅', hp=2.28, atk=2.28, recGrade='SR'),
    dict(tier=5, name='전설', hp=2.55, atk=2.55, recGrade='SSR'),
    dict(tier=6, name='신화', hp=3.28, atk=3.28, recGrade='UR'),
    dict(tier=7, name='고대', hp=4.27, atk=4.27, recGrade='L'),
    dict(tier=8, name='태초', hp=5.83, atk=5.83, recGrade='E'),
]

# ------------------------------------------------------------------ 드랍 테이블: 출처 × 난이도 → 등급 가중치(합 100 아님, 상대 가중치)
def drop_row(source, tier):
    # 난이도 t에서 중심 등급 index = t-1 (+정예 +0.6, 보스 +1.2). L/E는 별도 제한.
    center = (tier - 1) + {'battle': -0.6, 'elite': 0.4, 'boss': 1.0, 'shop': -1.0}[source]
    w = []
    for i, g in enumerate(GRADES):
        d = i - center
        v = 100.0 * pow(2.718, -(d * d) / 1.3)
        if g['code'] == 'L':
            v *= {'battle': 0.15, 'elite': 0.4, 'boss': 0.8, 'shop': 0}[source] if tier >= 4 else 0
        if g['code'] == 'E':
            v *= {'battle': 0, 'elite': 0.08, 'boss': 0.35, 'shop': 0}[source] if tier >= 6 else 0
        if source == 'shop' and i > 3: v = 0          # 상점은 SR까지
        w.append(round(v, 2))
    return w

DROP_SOURCES = [('battle', '일반 전투 보상(3택1 중 장비 카드)'), ('elite', '정예 처치'), ('boss', '보스 처치(장비 1 + 보석 1)'), ('shop', '던전 상인 판매')]


# ------------------------------------------------------------------ 강화 (docs/GAME_DESIGN.md 3장)
# rate: 성공 확률 / stones·gold: 1회 비용 / 실패 보정: 실패마다 기본 확률의 10%씩(최대 2배), 장인의 기운 += 현재 확률 × 0.465
ENHANCE = dict(
    mainPerLevel=0.06,          # 강화 1단계당 주 스탯 +6%
    failBonusStep=0.10, failBonusMax=1.0, artisanFactor=0.465,
    capByGrade={'UC': 5, 'C': 7, 'R': 9, 'SR': 11, 'SSR': 13, 'UR': 15, 'L': 15, 'E': 15},
    visualTiers=[5, 10, 15],
    levels=[  # 목표 단계별 (index 0 = +1)
        dict(rate=1.00, stones=1, gold=20), dict(rate=1.00, stones=1, gold=30), dict(rate=0.95, stones=2, gold=40),
        dict(rate=0.90, stones=2, gold=55), dict(rate=0.85, stones=3, gold=70), dict(rate=0.75, stones=3, gold=90),
        dict(rate=0.65, stones=4, gold=110), dict(rate=0.55, stones=4, gold=135), dict(rate=0.45, stones=5, gold=160),
        dict(rate=0.35, stones=6, gold=190), dict(rate=0.25, stones=7, gold=230), dict(rate=0.18, stones=8, gold=270),
        dict(rate=0.12, stones=10, gold=320), dict(rate=0.08, stones=12, gold=380), dict(rate=0.05, stones=15, gold=450),
    ],
)
# 분해 시 강화석 (등급별) / 강화석 획득 (전투 종류별)
DISMANTLE = {'UC': 1, 'C': 2, 'R': 3, 'SR': 5, 'SSR': 8, 'UR': 12, 'L': 18, 'E': 25}
STONE_REWARD = {'battle': 2, 'elite': 4, 'boss': 8}

# ------------------------------------------------------------------ 갑옷 랜덤 패시브 (이름 고정, 등급 = 배율)
# kind: stat(mods 가산) / hook(전투 규칙) / trade(장점 + 고정 단점). v = UC 기준 수치, 등급 배율 PASSIVE_MULT 적용. pen = 고정 단점(배율 없음)
PASSIVE_MULT = {'UC': 1.0, 'C': 1.15, 'R': 1.3, 'SR': 1.5, 'SSR': 1.75, 'UR': 2.0, 'L': 2.3, 'E': 2.6}
# 패시브 등급 굴림: 장비 등급과 같음 / -1 / -2 / 그 아래 (장비 등급 이하)
PASSIVE_GRADE_ROLL = [25, 35, 25, 15]
PASSIVES = [
    dict(key='iron_heart',  name='무쇠 심장',     min='UC', kind='stat', stat='hp_pct',   v=0.03,  text='최대 HP +{v}'),
    dict(key='trained_arm', name='단련된 팔',     min='UC', kind='stat', stat='atk_pct',  v=0.02,  text='공격력 +{v}'),
    dict(key='light_feet',  name='가벼운 발',     min='UC', kind='stat', stat='mspd',     v=0.06,  text='이동 속도 +{v}'),
    dict(key='clear_mind',  name='맑은 정신',     min='C',  kind='stat', stat='cdr',      v=0.025, text='쿨타임 -{v}'),
    dict(key='oath_guard',  name='수호의 맹세',   min='C',  kind='stat', stat='dr',       v=0.02,  text='받는 피해 -{v}'),
    dict(key='breaker',     name='부수는 손',     min='R',  kind='stat', stat='breakdmg', v=0.06,  text='그로기 피해 +{v}'),
    dict(key='hawk_eye',    name='매의 눈',       min='R',  kind='stat', stat='crit',     v=0.025, text='치명타 확률 +{v}'),
    dict(key='finisher',    name='결정타',        min='R',  kind='stat', stat='vsbroken', v=0.06,  text='그로기 적에게 피해 +{v}'),
    dict(key='firefly',     name='반딧불 신호',   min='SR', kind='hook', v=8,     unit='',  text='차지·호출을 끊으면 필살기 게이지 +{v}'),
    dict(key='first_breath',name='첫 숨결',       min='SR', kind='hook', v=10,    unit='',  text='전투 시작 시 필살기 게이지 +{v}'),
    dict(key='stubborn',    name='끈질긴 생명',   min='SSR',kind='hook', v=1.0,   unit='초', text='HP 25% 이하가 되면 {v} 무적 (전투당 1회)'),
    dict(key='hunter_rain', name='여우비',        min='SSR',kind='hook', v=0.2,   text='적이 그로기에 빠지면 ② 쿨타임 {v} 감소'),
    dict(key='old_root',    name='늙은 참나무의 뿌리', min='UR', kind='trade', stat='breakdmg', v=0.08, pen=dict(stat='mspd', v=-0.2),  text='그로기 피해 +{v}', penText='이동 속도 -20%'),
    dict(key='berserk',     name='광전사의 피',   min='UR', kind='trade', stat='atk_pct', v=0.06, pen=dict(stat='dr', v=-0.12), text='공격력 +{v}', penText='받는 피해 +12%'),
    dict(key='moon_oath',   name='달빛 맹세',     min='L',  kind='trade', stat='vsbroken', v=0.16, pen=dict(stat='nonbroken', v=-0.2), text='그로기 적에게 피해 +{v}', penText='그로기 게이지가 있는 적이 그로기가 아닐 때 피해 -20%'),
    dict(key='first_light', name='숲의 첫 숨',    min='E',  kind='trade', stat='ultpow', v=0.13, pen=dict(stat='ultonlybreak', v=1), text='필살기 위력 +{v}', penText='필살기 게이지는 그로기 적이 있을 때만 참'),
]

# ------------------------------------------------------------------ 생성
def fmt_v(v, unit):
    if unit in ('%', '%p') and v < 1 and unit == '%' and False: return v
    return v

def build():
    grade_codes = [g['code'] for g in GRADES]
    items = []
    # 직업 장비
    for c in CLASSES:
        ck = c['key']
        for slot in ('weapon', 'armor', 'medal'):
            for n, (name, eff) in enumerate(LINES[ck][slot]):
                if slot == 'weapon':
                    main = [('atk', round(c['baseAtk'] * 0.10, 2)), WEAPON_SUB[ck]]
                elif slot == 'armor':
                    main = [('hp', round(c['baseHp'] * 0.10, 1)), ARMOR_SUB[ck]]
                else:
                    # 소울 메달 = 직업 특성 스탯 + ①(갑옷)/②(무기) 스킬 위력 강화. 필살기 변형은 캐릭터 중복 돌파로 이동
                    main = [MEDAL_MAIN[ck], ('s1pow' if n == 0 else 's2pow', 0.10)]
                items.append(dict(
                    id=f'{ck}_{slot}_{n + 1}', name=name, slot=slot, cls=ck, line=n + 1,
                    main=[dict(stat=k, base=v) for k, v in main],
                    innate=None if slot == 'medal' else dict(key=eff['key'], text=eff['text'], base=eff['base'], unit=eff['unit'], pw=eff['pw'], skill=eff['skill']),
                ))
    # 공통 장신구
    for slot, lines in ACCESSORIES.items():
        for n, (name, main) in enumerate(lines):
            items.append(dict(id=f'common_{slot}_{n + 1}', name=name, slot=slot, cls='common', line=n + 1,
                              main=[dict(stat=k, base=v) for k, v in main], innate=None))
    drops = {src: {t['tier']: drop_row(src, t['tier']) for t in TIERS} for src, _ in DROP_SOURCES}
    db = dict(
        version=1,
        grades=GRADES, lExtraWeights=L_EXTRA_WEIGHTS, eGemWeights=E_GEM_WEIGHTS, eSkillWeights=E_SKILL_WEIGHTS,
        stats=STATS, classes=CLASSES, slots=SLOTS, items=items, options=OPTIONS,
        classStat=CLASS_STAT, skillBonus=SKILL_BONUS, skillBonusERatio=SKILL_BONUS_E_RATIO,
        gems=GEMS, gemEffectCount=GEM_EFFECT_COUNT, gemMult=GEM_MULT, gemExtraRatio=GEM_EXTRA_RATIO, gemSkillExtras=GEM_SKILL_EXTRAS,
        tiers=TIERS, dropSources=[dict(key=k, name=v) for k, v in DROP_SOURCES], drops=drops,
        caps={s['key']: s['cap'] for s in STATS if 'cap' in s},
        enhance=ENHANCE, dismantle=DISMANTLE, stoneReward=STONE_REWARD,
        passives=PASSIVES, passiveMult=PASSIVE_MULT, passiveGradeRoll=PASSIVE_GRADE_ROLL,
    )
    os.makedirs(os.path.join(OUT, 'csv'), exist_ok=True)
    with open(os.path.join(OUT, 'equipment_db.json'), 'w', encoding='utf-8') as f:
        json.dump(db, f, ensure_ascii=False, indent=1)
    write_csvs(db)
    # 게임 빌드용 데이터 (src/js에 포함되어 단일 HTML로 묶임)
    with open(os.path.join(os.path.dirname(__file__), '..', 'src', 'js', '01b_equip_db.js'), 'w', encoding='utf-8') as f:
        f.write('// ===== 01b_equip_db.js : 장비 DB (tools/gen_equipment_db.py가 생성 — 직접 수정하지 말 것) =====\n')
        f.write('const EQUIP_DB = ' + json.dumps(db, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(f'items={len(items)} (직업 {sum(1 for i in items if i["cls"] != "common")} + 공통 {sum(1 for i in items if i["cls"] == "common")}), options={len(OPTIONS)}, gems={len(GEMS)}')

def wcsv(name, header, rows):
    with open(os.path.join(OUT, 'csv', name), 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f); w.writerow(header); w.writerows(rows)

def write_csvs(db):
    wcsv('grades.csv', ['Code', 'Name', 'Color', 'MainMult', 'OptionCount', 'OptionMult', 'InnateMult', 'GemMin', 'GemMax', 'ClassStatMin', 'ClassStatMax', 'SkillBonusMin', 'SkillBonusMax'],
         [[g['code'], g['name'], g['color'], g['main'], g['opt'], g['optMult'], g['innate'], g['gem'][0], g['gem'][1], g['cls'][0], g['cls'][1], g['skill'][0], g['skill'][1]] for g in db['grades']])
    wcsv('stats.csv', ['Key', 'Name', 'IsPercent', 'Cap'], [[s['key'], s['name'], s['pct'], s.get('cap', '')] for s in db['stats']])
    rows = []
    for it in db['items']:
        m = it['main'] + [dict(stat='', base='')] * (2 - len(it['main']))
        inn = it['innate'] or {}
        rows.append([it['id'], it['name'], it['slot'], it['cls'], m[0]['stat'], m[0]['base'], m[1]['stat'], m[1]['base'], inn.get('key', ''), inn.get('text', ''), inn.get('base', ''), inn.get('unit', ''), inn.get('skill', '') or ''])
    wcsv('items.csv', ['Id', 'Name', 'Slot', 'Class', 'Main1Stat', 'Main1Base', 'Main2Stat', 'Main2Base', 'InnateKey', 'InnateText', 'InnateBase', 'InnateUnit', 'InnateSkill'], rows)
    wcsv('options.csv', ['Stat', 'MinAtR', 'MaxAtR', 'Weight', 'Slots'], [[o['key'], o['min'], o['max'], o['weight'], o['slots']] for o in db['options']])
    wcsv('class_stats.csv', ['Class', 'Stat', 'ValueL', 'ValueE'], [[k, v['stat'], v['L'], v['E']] for k, v in db['classStat'].items()])
    wcsv('skill_bonus.csv', ['Class', 'Key', 'Text', 'ValueL', 'ValueE', 'Unit'], [[k, b['key'], b['text'], b['L'], b['E'], b['unit']] for k, lst in db['skillBonus'].items() for b in lst])
    wcsv('gems.csv', ['Key', 'Name', 'Stat', 'BaseAtUC'], [[g['key'], g['name'], g['stat'], g['base']] for g in db['gems']])
    wcsv('tiers.csv', ['Tier', 'Name', 'EnemyHpMult', 'EnemyAtkMult', 'RecommendedGrade'], [[t['tier'], t['name'], t['hp'], t['atk'], t['recGrade']] for t in db['tiers']])
    wcsv('drops.csv', ['Source', 'Tier'] + [g['code'] for g in db['grades']], [[src, t] + w for src, d in db['drops'].items() for t, w in d.items()])

if __name__ == '__main__':
    build()
