# 숲속 원정대 3D 에셋 키트 (Blender bpy · Cycles CPU)
#   python3 tools/3d/kit.py dungeon [cave|mine|crypt|abyss|all]   → 던전 복도 배경 (가로로 이어 붙는 타일)
#   python3 tools/3d/kit.py props [이름|all]                        → 마을·필드 소품 스프라이트 (투명 배경)
# 결과: assets_src/3d/render/*.png (게임용 그림) · assets_src/3d/glb/*.glb (3D 모델) — 이어서 tools/3d/pack.py 가 게임에 넣는다
# 화풍: 치비 일러스트와 어울리게 — 따뜻한 키 라이트 + 차가운 보조광, 거친 손그림 느낌의 절차적 재질, 약간 과장된 비율
import bpy, bmesh, math, random, os, sys
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT_R = os.path.join(ROOT, 'assets_src', '3d', 'render'); OUT_G = os.path.join(ROOT, 'assets_src', '3d', 'glb')
os.makedirs(OUT_R, exist_ok=True); os.makedirs(OUT_G, exist_ok=True)
SAMPLES = int(os.environ.get('SAMPLES', 48))

# ------------------------------------------------------------------ 공통
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 4; sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.08, 0.07, 0.1, 1); bg.inputs[1].default_value = 0.6
    return sc

def mat(name, base, rough=0.85, noise=0.25, scale=6.0, emit=None, emit_str=0, metal=0.0, voronoi=False, dark=None):
    """손그림 느낌: 기본색에 큰 노이즈 얼룩 + (선택) 보로노이 돌 무늬 · 틈은 어둡게"""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links
    bsdf = N['Principled BSDF']; bsdf.inputs['Roughness'].default_value = rough; bsdf.inputs['Metallic'].default_value = metal
    tc = N.new('ShaderNodeTexCoord'); nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 6
    L.new(tc.outputs['Object'], nz.inputs['Vector'])
    ramp = N.new('ShaderNodeValToRGB'); r = ramp.color_ramp
    c0 = tuple(max(0, x * (1 - noise)) for x in base[:3]) + (1,); c1 = tuple(min(1, x * (1 + noise)) for x in base[:3]) + (1,)
    r.elements[0].color = c0; r.elements[1].color = c1
    L.new(nz.outputs['Fac'], ramp.inputs['Fac'])
    col = ramp.outputs['Color']
    if voronoi:
        vo = N.new('ShaderNodeTexVoronoi'); vo.feature = 'DISTANCE_TO_EDGE'; vo.inputs['Scale'].default_value = scale * 0.6
        L.new(tc.outputs['Object'], vo.inputs['Vector'])
        edge = N.new('ShaderNodeMapRange'); edge.inputs['From Min'].default_value = 0.0; edge.inputs['From Max'].default_value = 0.035
        L.new(vo.outputs['Distance'], edge.inputs['Value'])
        mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'
        mix.inputs['A'].default_value = (dark or tuple(x * 0.35 for x in base[:3])) + (1,) if len(dark or base) == 3 else (0, 0, 0, 1)
        L.new(edge.outputs['Result'], mix.inputs['Factor']); L.new(col, mix.inputs['B']); col = mix.outputs['Result']
    L.new(col, bsdf.inputs['Base Color'])
    if emit:
        bsdf.inputs['Emission Color'].default_value = emit + (1,); bsdf.inputs['Emission Strength'].default_value = emit_str
    return m

def obj(mesh_name, verts=None, faces=None):
    me = bpy.data.meshes.new(mesh_name); me.from_pydata(verts, [], faces); me.update()
    o = bpy.data.objects.new(mesh_name, me); bpy.context.scene.collection.objects.link(o); return o

def add(kind, loc=(0, 0, 0), size=(1, 1, 1), rot=(0, 0, 0), m=None, bevel=0.0, seg=16, name=None):
    ops = { 'cube': lambda: bpy.ops.mesh.primitive_cube_add(size=1), 'cyl': lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=seg, radius=0.5, depth=1),
            'cone': lambda: bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=0.5, radius2=0, depth=1), 'sphere': lambda: bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(6, seg // 2), radius=0.5),
            'ico': lambda: bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.5), 'torus': lambda: bpy.ops.mesh.primitive_torus_add(major_radius=0.5, minor_radius=0.12, major_segments=seg, minor_segments=8) }
    ops[kind](); o = bpy.context.active_object
    o.location = loc; o.scale = size; o.rotation_euler = rot
    if name: o.name = name
    if m: o.data.materials.append(m)
    if bevel:
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        b = o.modifiers.new('bv', 'BEVEL'); b.width = bevel; b.segments = 2
    for p in o.data.polygons: p.use_smooth = kind in ('sphere', 'ico', 'cyl', 'cone', 'torus')
    return o

def jitter(o, amt, seed):
    """손으로 깎은 느낌: 꼭짓점을 조금씩 흔든다"""
    rnd = random.Random(seed)
    bpy.context.view_layer.objects.active = o; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for v in o.data.vertices: v.co += Vector((rnd.uniform(-amt, amt), rnd.uniform(-amt, amt), rnd.uniform(-amt, amt)))

def light(kind, loc, energy, color=(1, 1, 1), size=1.0, rot=(0, 0, 0)):
    ld = bpy.data.lights.new('l', kind); ld.energy = energy; ld.color = color
    if kind == 'AREA': ld.size = size
    if kind == 'POINT': ld.shadow_soft_size = size
    if kind == 'SUN': ld.angle = 0.2
    lo = bpy.data.objects.new('l', ld); lo.location = loc; lo.rotation_euler = rot; bpy.context.scene.collection.objects.link(lo); return lo

def ortho_cam(loc, rot, scale):
    c = bpy.data.cameras.new('cam'); c.type = 'ORTHO'; c.ortho_scale = scale
    co = bpy.data.objects.new('cam', c); co.location = loc; co.rotation_euler = rot
    bpy.context.scene.collection.objects.link(co); bpy.context.scene.camera = co; return co

def export_glb(name, objs=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in (objs or bpy.context.scene.objects):
        if o.type == 'MESH': o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_G, name + '.glb'), use_selection=True, export_format='GLB', export_apply=True)

# ------------------------------------------------------------------ 던전 복도 (가로 타일)
THEMES = {
    'cave':  { 'wall': (0.24, 0.2, 0.3), 'floor': (0.25, 0.21, 0.3), 'accent': (0.28, 0.2, 0.12), 'torch': (1.0, 0.55, 0.2), 'fill': (0.4, 0.5, 0.9) },
    'mine':  { 'wall': (0.33, 0.24, 0.16), 'floor': (0.3, 0.23, 0.16), 'accent': (0.42, 0.27, 0.13), 'torch': (1.0, 0.6, 0.25), 'fill': (0.5, 0.45, 0.6) },
    'crypt': { 'wall': (0.2, 0.23, 0.29), 'floor': (0.19, 0.21, 0.26), 'accent': (0.3, 0.32, 0.33), 'torch': (0.45, 0.7, 1.0), 'fill': (0.4, 0.6, 1.0) },
    'abyss': { 'wall': (0.16, 0.08, 0.09), 'floor': (0.17, 0.09, 0.09), 'accent': (0.1, 0.06, 0.06), 'torch': (1.0, 0.35, 0.12), 'fill': (0.8, 0.2, 0.15) },
}
P = 12.0  # 한 타일 폭 (게임 1152px)

def dungeon(theme):
    reset(); T = THEMES[theme]; rnd = random.Random(7)
    sc = bpy.context.scene
    m_wall = mat('wall', T['wall'], scale=2.5, noise=0.35)
    m_wall2 = mat('wall2', tuple(x * 0.82 for x in T['wall']), scale=2.5, noise=0.35)
    m_floor = mat('floor', tuple(x * 0.62 for x in T['floor']), scale=1.6, noise=0.3)
    m_floor2 = mat('floor2', tuple(x * 0.5 for x in T['floor']), scale=1.6, noise=0.3)
    m_acc = mat('acc', T['accent'], scale=4, noise=0.3)
    m_wood = mat('wood', (0.36, 0.22, 0.12), scale=8, noise=0.35)
    m_iron = mat('iron', (0.3, 0.3, 0.33), rough=0.5, metal=0.6, scale=10, noise=0.2)
    m_fire = mat('fire', (1, 0.6, 0.2), emit=T['torch'], emit_str=1.6)
    m_gap = mat('gap', tuple(x * 0.3 for x in T['floor']), scale=3, noise=0.2)
    m_moss = mat('moss', (0.18, 0.3, 0.14), scale=5, noise=0.4)
    m_lava = mat('lava', (1, 0.3, 0.05), emit=(1, 0.3, 0.05), emit_str=2.2)
    m_bone = mat('bone', (0.82, 0.78, 0.66), scale=6)
    objs = []
    # 바닥 · 뒷벽 (넓게)
    objs.append(add('cube', (0, 0.5, -0.3), (P * 3, 10, 0.5), m=m_gap)) # 돌판 사이 틈
    for k in range(-1, 2):
        ox = k * P; r = random.Random(11)
        # 바닥 돌판 (주기마다 같은 배치)
        for row in range(7):
            y = 3.3 - row * 1.05; off = (row % 2) * 0.7; x = -P / 2 + off - 1.4
            while x < P / 2:
                w = r.uniform(1.1, 1.7); cx = x + w / 2
                if -P / 2 - 0.9 < cx < P / 2 + 0.9:
                    f = add('cube', (ox + cx, y, -0.08 + r.uniform(-0.03, 0.03)), (w - 0.07, 0.98, 0.2), m=m_floor if r.random() < 0.55 else m_floor2, bevel=0.05); jitter(f, 0.02, r.random()); objs.append(f)
                x += w
        # 돌벽: 벽돌을 한 장씩 (주기마다 같은 배치 = 이어 붙인다)
        for row in range(9):
            y = 0.35 + row * 0.62; off = 0.6 if row % 2 else 0
            x = -P / 2 + off - 1.2
            while x < P / 2:
                w = r.uniform(0.9, 1.4); cx = x + w / 2
                if -P / 2 - 0.7 < cx < P / 2 + 0.7:
                    b = add('cube', (ox + cx, 4.0 + r.uniform(-0.06, 0.06), y), (w - 0.08, 0.5, 0.56), m=m_wall if r.random() < 0.6 else m_wall2, bevel=0.07); jitter(b, 0.03, r.random()); objs.append(b)
                x += w
        # 기둥 2개 + 횃불
        for px in (-P / 4, P / 4):
            objs.append(add('cube', (ox + px, 3.5, 2.6), (0.9, 0.9, 5.4), m=m_acc if theme != 'mine' else m_wood, bevel=0.06))
            objs.append(add('cube', (ox + px, 3.5, 5.3), (1.2, 1.2, 0.35), m=m_acc if theme != 'mine' else m_wood, bevel=0.05))
            objs.append(add('cube', (ox + px, 3.5, 0.15), (1.2, 1.2, 0.3), m=m_acc if theme != 'mine' else m_wood, bevel=0.05))
            tx = ox + px + 0.75
            objs.append(add('cyl', (tx, 3.4, 2.3), (0.1, 0.1, 0.6), m=m_iron))
            objs.append(add('cone', (tx, 3.4, 2.75), (0.22, 0.22, 0.45), m=m_fire))
            light('POINT', (tx, 2.8, 2.8), 120, T['torch'], 0.25)
        # 테마 소품
        if theme == 'cave':
            for i in range(5): # 늘어진 나무뿌리
                x = ox - P / 2 + (i + 0.5) * P / 5 + r.uniform(-0.6, 0.6)
                bpy.ops.curve.primitive_bezier_curve_add(); cu = bpy.context.active_object; cu.data.bevel_depth = r.uniform(0.1, 0.17); cu.data.bevel_resolution = 3; cu.data.dimensions = '3D'
                sp = cu.data.splines[0]; sp.bezier_points[0].co = (x, 3.6, 6.5); sp.bezier_points[1].co = (x + r.uniform(-0.6, 0.6), 3.4, r.uniform(2.2, 4.2))
                for bp in sp.bezier_points: bp.handle_left_type = bp.handle_right_type = 'AUTO'
                cu.data.materials.append(m_acc); objs.append(cu)
            for i in range(4): # 버섯 · 돌
                x = ox - P / 2 + r.uniform(0, P); objs.append(add('cyl', (x, 3.0, 0.2), (0.1, 0.1, 0.4), m=m_bone))
                objs.append(add('sphere', (x, 3.0, 0.45), (0.45, 0.45, 0.22), m=mat('cap%d' % i, (0.6, 0.25, 0.5), emit=(0.6, 0.3, 1.0), emit_str=1.5)))
            for i in range(3): objs.append(add('ico', (ox + r.uniform(-P / 2, P / 2), 2.6, 0.15), (r.uniform(0.4, 0.8),) * 3, m=m_wall))
        elif theme == 'mine':
            for x in (-P / 2, 0): # 나무 지지대
                objs.append(add('cube', (ox + x, 3.2, 2.5), (0.35, 0.35, 5.0), m=m_wood, bevel=0.04)); objs.append(add('cube', (ox + x, 3.2, 5.0), (2.6, 0.4, 0.4), m=m_wood, bevel=0.04))
            for y in (0.9, 1.7): objs.append(add('cube', (ox, y, 0.05), (P, 0.08, 0.06), m=m_iron)) # 레일
            for i in range(int(P / 0.8)): objs.append(add('cube', (ox - P / 2 + i * 0.8, 1.3, 0.01), (0.25, 1.2, 0.05), m=m_wood))
            for i in range(4): # 광석 결정
                x = ox + r.uniform(-P / 2, P / 2); objs.append(add('cone', (x, 3.6, r.uniform(1.0, 4.0)), (0.25, 0.25, 0.6), rot=(r.uniform(-0.6, 0.6), 0, 0), seg=6, m=mat('ore%d' % i, (0.4, 0.75, 1.0), emit=(0.2, 0.55, 1.0), emit_str=1.2)))
        elif theme == 'crypt':
            for i in range(3): # 묘비 · 관
                x = ox - P / 2 + (i + 0.5) * P / 3 + r.uniform(-0.5, 0.5)
                t = add('cube', (x, 3.0, 0.7), (0.8, 0.25, 1.4), m=m_acc, bevel=0.06); objs.append(t)
                objs.append(add('cyl', (x, 3.0, 1.4), (0.8, 0.25, 0.8), rot=(math.pi / 2, 0, 0), m=m_acc))
            for i in range(5): # 촛불
                x = ox + r.uniform(-P / 2, P / 2); objs.append(add('cyl', (x, 2.6, 0.2), (0.08, 0.08, 0.4), m=m_bone)); objs.append(add('sphere', (x, 2.6, 0.45), (0.08, 0.08, 0.14), m=m_fire))
            for i in range(3): objs.append(add('sphere', (ox + r.uniform(-P / 2, P / 2), 2.4, 0.12), (0.28, 0.24, 0.24), m=m_bone)) # 해골
        else: # abyss
            for i in range(6): # 용암 틈
                x = ox - P / 2 + (i + 0.5) * P / 6; objs.append(add('cube', (x + r.uniform(-0.4, 0.4), r.uniform(0.0, 2.0), 0.01), (r.uniform(0.8, 1.6), 0.12, 0.04), rot=(0, 0, r.uniform(-0.5, 0.5)), m=m_lava))
            for i in range(4): # 가시 · 사슬
                x = ox + r.uniform(-P / 2, P / 2); objs.append(add('cone', (x, 3.4, 0.6), (0.4, 0.4, 1.4), seg=5, m=m_acc))
            for x in (-P / 3, P / 6):
                for j in range(8): objs.append(add('torus', (ox + x, 3.7, 6.2 - j * 0.32), (0.22, 0.22, 0.22), rot=(0, (j % 2) * math.pi / 2, 0), m=m_iron))
            light('POINT', (ox, 1.0, 0.4), 60, (1, 0.3, 0.1), 1.5)
    # 조명: 따뜻한 횃불 + 차가운 보조 + 약한 정면광
    light('AREA', (0, -6, 7), 160, T['fill'], 10, rot=(0.9, 0, 0))
    light('SUN', (0, 0, 10), 0.35, (1, 0.9, 0.8), rot=(0.7, 0.2, 0))
    sc.world.node_tree.nodes['Background'].inputs[1].default_value = 0.3
    # 카메라: 정사영 · 살짝 내려다봄 · 한 주기(12)를 가로로 꽉 (1152×648)
    # 게임 좌표: 이 그림 = 화면 y -108..540 (1152×648), 벽 아래(바닥 시작) = 게임 y 288 → 그림 396줄
    pitch = math.radians(65); upp = P / 1152; wall_y = 3.75
    up = Vector((0, math.cos(pitch), math.sin(pitch))); d = Vector((0, math.sin(pitch), -math.cos(pitch)))
    tz = (396 - 324) * upp / math.sin(pitch); T0 = Vector((0, wall_y, tz))
    ortho_cam(T0 - d * 30, (pitch, 0, 0), P)
    sc.render.resolution_x = 1152; sc.render.resolution_y = 648; sc.render.film_transparent = False
    sc.render.filepath = os.path.join(OUT_R, 'dungeon_%s.png' % theme)
    bpy.ops.render.render(write_still=True)
    if os.environ.get('GLB'): export_glb('dungeon_%s' % theme) # 벽돌 하나하나라 4MB+ — 필요할 때만 (GLB=1)

# ------------------------------------------------------------------ 소품 (투명 배경 스프라이트)
def prop_scene():
    sc = reset()
    light('SUN', (0, 0, 10), 2.6, (1, 0.9, 0.78), rot=(math.radians(50), 0, math.radians(-35)))
    light('AREA', (-5, -6, 4), 260, (0.55, 0.65, 1.0), 8, rot=(1.1, 0, -0.7))
    w = sc.world.node_tree.nodes['Background']; w.inputs[0].default_value = (0.55, 0.6, 0.7, 1); w.inputs[1].default_value = 0.45
    sc.render.film_transparent = True
    return sc

def render_prop(name, px=512):
    sc = bpy.context.scene
    # 경계 상자에 맞춰 3/4 시점 정사영 카메라
    mins = Vector((1e9,) * 3); maxs = Vector((-1e9,) * 3)
    for o in sc.objects:
        if o.type not in ('MESH', 'CURVE'): continue
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c); mins = Vector(map(min, mins, w)); maxs = Vector(map(max, maxs, w))
    ctr = (mins + maxs) / 2; size = maxs - mins
    pitch = math.radians(55); d = 30
    cam = ortho_cam((ctr.x, ctr.y - d * math.sin(pitch), ctr.z + d * math.cos(pitch)), (pitch, 0, 0), 1)
    # 화면에 보이는 폭/높이 (정사영): 가로 = x 폭, 세로 = y깊이*cos + z높이*sin
    vw = size.x; vh = size.y * math.cos(pitch) + size.z * math.sin(pitch)
    cam.data.ortho_scale = max(vw, vh) * 1.08
    ar = vw / max(vh, 1e-3)
    sc.render.resolution_x = int(px * min(1, ar)); sc.render.resolution_y = int(px * min(1, 1 / ar))
    sc.render.filepath = os.path.join(OUT_R, 'prop_%s.png' % name)
    # 바닥 중심(정렬 기준점)이 그림의 어디인지 — 게임에서 발밑 기준으로 세운다
    from bpy_extras.object_utils import world_to_camera_view
    bpy.context.view_layer.update()
    a = world_to_camera_view(sc, cam, Vector((ctr.x, ctr.y, 0)))
    import json; json.dump({ 'ax': round(a.x, 4), 'ay': round(1 - a.y, 4) }, open(os.path.join(OUT_R, 'prop_%s.json' % name), 'w'))
    bpy.ops.render.render(write_still=True)
    export_glb('prop_' + name)

def ground_disc(m, r=1.4):
    o = add('cyl', (0, 0, -0.05), (r * 2, r * 2, 0.1), m=m, seg=24); return o

M = {}
def mats():
    M['stone'] = mat('stone', (0.46, 0.43, 0.4), voronoi=True, scale=2, noise=0.25)
    M['wood'] = mat('wood', (0.45, 0.28, 0.15), scale=9, noise=0.35)
    M['dwood'] = mat('dwood', (0.3, 0.18, 0.1), scale=9, noise=0.3)
    M['roof_r'] = mat('roof_r', (0.62, 0.2, 0.15), scale=7, noise=0.3)
    M['roof_b'] = mat('roof_b', (0.2, 0.32, 0.55), scale=7, noise=0.3)
    M['plaster'] = mat('plaster', (0.88, 0.8, 0.66), scale=5, noise=0.15)
    M['leaf'] = mat('leaf', (0.2, 0.45, 0.2), scale=4, noise=0.35)
    M['leaf2'] = mat('leaf2', (0.16, 0.36, 0.22), scale=4, noise=0.35)
    M['bark'] = mat('bark', (0.35, 0.22, 0.13), scale=12, noise=0.35)
    M['gold'] = mat('gold', (0.9, 0.65, 0.2), rough=0.35, metal=0.9, scale=10, noise=0.15)
    M['iron'] = mat('iron', (0.32, 0.32, 0.36), rough=0.45, metal=0.7, scale=10, noise=0.15)
    M['cloth_r'] = mat('cloth_r', (0.8, 0.22, 0.18), scale=6, noise=0.15)
    M['cloth_w'] = mat('cloth_w', (0.95, 0.9, 0.8), scale=6, noise=0.1)
    M['water'] = mat('water', (0.2, 0.4, 0.6), rough=0.1, scale=3, noise=0.2)
    M['magic'] = mat('magic', (0.4, 0.75, 1.0), emit=(0.2, 0.5, 1.0), emit_str=1.3)
    M['fire'] = mat('fire', (1, 0.55, 0.15), emit=(1, 0.45, 0.1), emit_str=1.8)
    M['lava'] = mat('lava', (1, 0.35, 0.05), emit=(1, 0.3, 0.05), emit_str=1.5)
    M['rock'] = mat('rock', (0.42, 0.4, 0.37), scale=2, noise=0.35)
    M['brock'] = mat('brock', (0.13, 0.1, 0.1), voronoi=True, scale=2, noise=0.3)
    M['grass'] = mat('grass', (0.25, 0.48, 0.25), scale=3, noise=0.3)
    M['purple'] = mat('purple', (0.38, 0.25, 0.55), scale=6, noise=0.2)

def tree_round(seed=1, s=1.0):
    r = random.Random(seed)
    add('cyl', (0, 0, 1.0 * s), (0.6 * s, 0.6 * s, 2.0 * s), m=M['bark'], seg=10)
    for i in range(9):
        a = r.uniform(0, 6.28); d = r.uniform(0.4, 1.3) * s
        b = add('ico', (math.cos(a) * d, math.sin(a) * d, (2.9 + r.uniform(-0.3, 0.9)) * s), (r.uniform(1.8, 2.5) * s,) * 3, m=M['leaf'] if i % 3 else M['leaf2']); jitter(b, 0.12 * s, seed + i)

PROPS = {}
def fence(rx, ry):
    """뾰족한 목책 (앞쪽은 낮게 — 건물이 가리지 않게)"""
    n = 26
    for i in range(n):
        a = i / n * 6.283; x, y = math.cos(a) * rx, math.sin(a) * ry
        if abs(x) < 0.7 and y < 0: continue  # 입구
        h = 0.8 if y < 0 else 1.1
        add('cyl', (x, y, h / 2), (0.24, 0.24, h), m=M['wood'], seg=6); add('cone', (x, y, h + 0.12), (0.24, 0.24, 0.25), m=M['wood'], seg=6)
def prop(fn): PROPS[fn.__name__] = fn; return fn

@prop
def house_a():
    add('cube', (0, 0, 0.5), (3.2, 2.6, 1.0), m=M['stone'], bevel=0.06)
    add('cube', (0, 0, 1.7), (3.0, 2.4, 1.4), m=M['plaster'], bevel=0.03)
    for x in (-1.45, 1.45): add('cube', (x, -1.21, 1.7), (0.16, 0.06, 1.4), m=M['dwood'])
    add('cube', (0, -1.21, 1.35), (3.0, 0.06, 0.14), m=M['dwood'])
    roof = add('cone', (0, 0, 3.15), (3.6 * 1.2, 3.0 * 1.2, 1.6), seg=4, rot=(0, 0, math.pi / 4), m=M['roof_r']); jitter(roof, 0.05, 3)
    add('cube', (0, -1.25, 0.75), (0.7, 0.08, 1.3), m=M['dwood'])
    for x in (-0.95, 0.95): add('cube', (x, -1.24, 1.9), (0.55, 0.06, 0.5), m=M['magic'] if x < 0 else M['water'])
    add('cube', (1.0, 0.4, 3.6), (0.4, 0.4, 1.0), m=M['stone'])
@prop
def house_b():
    add('cube', (0, 0, 0.45), (2.6, 2.2, 0.9), m=M['stone'], bevel=0.06)
    add('cube', (0, 0, 1.5), (2.4, 2.0, 1.3), m=M['wood'], bevel=0.03)
    roof = add('cone', (0, 0, 2.85), (3.0 * 1.2, 2.6 * 1.2, 1.4), seg=4, rot=(0, 0, math.pi / 4), m=M['roof_b']); jitter(roof, 0.05, 5)
    add('cube', (0, -1.02, 0.7), (0.6, 0.08, 1.2), m=M['dwood']); add('cube', (0.75, -1.02, 1.7), (0.45, 0.06, 0.45), m=M['fire'])
@prop
def tree():
    tree_round(1)
@prop
def tree_b():
    add('cyl', (0, 0, 0.8), (0.35, 0.35, 1.6), m=M['bark'], seg=10)
    for i, (z, r) in enumerate([(1.6, 2.2), (2.5, 1.7), (3.3, 1.2)]): c = add('cone', (0, 0, z), (r, r, 1.6), seg=10, m=M['leaf2']); jitter(c, 0.08, i)
@prop
def well():
    ring = add('cyl', (0, 0, 0.45), (1.8, 1.8, 0.9), m=M['stone'], seg=20); add('cyl', (0, 0, 0.92), (1.4, 1.4, 0.05), m=M['water'], seg=20)
    for x in (-0.85, 0.85): add('cube', (x, 0, 1.5), (0.15, 0.15, 2.0), m=M['dwood'])
    add('cone', (0, 0, 2.75), (2.4, 1.6, 0.9), seg=4, rot=(0, 0, math.pi / 4), m=M['roof_r']); add('cyl', (0, 0, 1.9), (0.12, 0.12, 1.7), rot=(0, math.pi / 2, 0), m=M['dwood'])
@prop
def forge():
    add('cube', (-0.6, 0, 0.7), (1.6, 1.4, 1.4), m=M['stone'], bevel=0.08); add('cube', (-0.6, -0.71, 0.6), (0.8, 0.05, 0.6), m=M['fire'])
    add('cube', (-0.9, 0.3, 2.0), (0.6, 0.6, 1.6), m=M['stone'], bevel=0.05)
    add('cube', (0.9, 0, 0.35), (0.5, 0.5, 0.7), m=M['dwood']); add('cube', (0.9, 0, 0.8), (1.0, 0.45, 0.25), m=M['iron'], bevel=0.04)
    light('POINT', (-0.6, -1.2, 0.8), 80, (1, 0.5, 0.15), 0.3)
@prop
def stall():
    add('cube', (0, 0, 0.45), (2.6, 1.1, 0.9), m=M['wood'], bevel=0.04)
    for x in (-1.25, 1.25): add('cube', (x, -0.5, 1.2), (0.1, 0.1, 2.4), m=M['dwood']); add('cube', (x, 0.5, 1.2), (0.1, 0.1, 2.4), m=M['dwood'])
    for i in range(6): add('cube', (-1.15 + i * 0.46, 0, 2.45), (0.46, 1.5, 0.1), rot=(0.25, 0, 0), m=M['cloth_r'] if i % 2 else M['cloth_w'])
    for i, c in enumerate([(0.9, 0.3, 0.3), (0.3, 0.6, 0.9), (0.4, 0.85, 0.5), (1, 0.85, 0.3)]): add('sphere', (-0.9 + i * 0.6, -0.2, 1.05), (0.28, 0.28, 0.32), m=mat('pot%d' % i, c, emit=c, emit_str=0.6))
@prop
def chest():
    add('cube', (0, 0, 0.35), (1.1, 0.75, 0.7), m=M['wood'], bevel=0.04); add('cyl', (0, 0, 0.7), (0.72, 0.75, 1.1), rot=(0, math.pi / 2, 0), m=M['wood'], seg=20)
    for x in (-0.45, 0.45): add('cube', (x, 0, 0.52), (0.08, 0.8, 1.0), m=M['gold'])
    add('cube', (0, -0.39, 0.6), (0.18, 0.05, 0.22), m=M['gold'])
@prop
def storage():
    add('cube', (0, 0, 0.45), (1.6, 1.0, 0.9), m=M['purple'], bevel=0.05); add('cube', (0, 0, 0.95), (1.7, 1.1, 0.15), m=M['dwood'], bevel=0.03)
    for x in (-0.7, 0.7): add('cube', (x, 0, 0.5), (0.1, 1.05, 1.0), m=M['gold'])
    add('cube', (0, -0.52, 0.6), (0.25, 0.05, 0.3), m=M['gold'])
@prop
def portal():
    for x in (-1.2, 1.2): p = add('cube', (x, 0, 1.6), (0.6, 0.6, 3.2), m=M['stone'], bevel=0.08); jitter(p, 0.03, 1)
    add('cube', (0, 0, 3.4), (3.2, 0.7, 0.6), m=M['stone'], bevel=0.08)
    add('cyl', (0, 0, 1.6), (2.0, 2.0, 0.08), rot=(math.pi / 2, 0, 0), m=M['magic'], seg=32)
    for i in range(5): add('ico', (math.cos(i * 1.256) * 1.3, -0.4, 1.6 + math.sin(i * 1.256) * 1.3), (0.18,) * 3, m=M['magic'])
    add('cyl', (0, 0, 0.05), (3.6, 3.6, 0.1), m=M['stone'], seg=24)
@prop
def waypoint():
    add('cyl', (0, 0, 0.12), (2.6, 2.6, 0.24), m=M['stone'], seg=28); add('cyl', (0, 0, 0.25), (2.0, 2.0, 0.04), m=M['magic'], seg=28)
    for i in range(4): a = i * math.pi / 2 + 0.4; s = add('cube', (math.cos(a) * 1.15, math.sin(a) * 1.15, 0.8), (0.3, 0.3, 1.3), rot=(0, 0, a), m=M['stone'], bevel=0.05); jitter(s, 0.04, i)
    add('ico', (0, 0, 1.4), (0.5,) * 3, m=M['magic'])
@prop
def cave_gate():
    for i in range(14):
        a = math.pi * i / 13; r = add('ico', (math.cos(a) * 2.2, 0, math.sin(a) * 2.4), (1.2, 1.4, 1.2), m=M['rock']); jitter(r, 0.15, i)
    add('cube', (0, 0.3, 0.9), (2.6, 0.4, 2.2), m=mat('void', (0.02, 0.02, 0.03)))
    for x in (-1.6, 1.6): add('cyl', (x, -0.8, 0.8), (0.1, 0.1, 1.6), m=M['dwood']); add('cone', (x, -0.8, 1.75), (0.25, 0.25, 0.4), m=M['fire'])
@prop
def tower():
    for x in (-0.8, 0.8):
        for y in (-0.8, 0.8): add('cube', (x, y, 2.0), (0.18, 0.18, 4.0), m=M['dwood'])
    add('cube', (0, 0, 3.4), (2.2, 2.2, 0.15), m=M['wood']); add('cube', (0, 0, 3.75), (2.0, 2.0, 0.6), m=M['wood'], bevel=0.02)
    add('cone', (0, 0, 4.6), (3.0, 3.0, 1.2), seg=4, rot=(0, 0, math.pi / 4), m=M['dwood'])
    fence(2.3, 2.0)
@prop
def tent():
    add('cone', (0, 0, 1.0), (2.8, 2.8, 2.0), seg=6, m=M['cloth_r']); add('cube', (0, -0.95, 0.45), (0.5, 0.05, 0.9), m=mat('dark', (0.08, 0.06, 0.05)))
    add('cyl', (0, 0, 2.3), (0.06, 0.06, 0.8), m=M['dwood'])
    fence(2.3, 2.0)
@prop
def fort():
    add('cube', (0, 0, 1.0), (2.8, 2.4, 2.0), m=M['stone'], bevel=0.06)
    for i in range(5): add('cube', (-1.12 + i * 0.56, -1.2, 2.2), (0.32, 0.3, 0.4), m=M['stone'])
    for x in (-1.5, 1.5): add('cyl', (x, -1.1, 1.3), (0.9, 0.9, 2.6), m=M['stone'], seg=12); add('cone', (x, -1.1, 3.0), (1.1, 1.1, 1.0), seg=12, m=M['roof_b'])
    add('cube', (0, -1.21, 0.6), (0.7, 0.05, 1.2), m=mat('door', (0.08, 0.06, 0.06)))
    fence(2.6, 2.3)
@prop
def rock():
    for i in range(3): r = add('ico', (i * 0.7 - 0.6, (i % 2) * 0.3, 0.4), (1.4 - i * 0.3, 1.1, 0.9 - i * 0.15), m=M['rock']); jitter(r, 0.12, i)
@prop
def dead_tree():
    add('cyl', (0, 0, 1.2), (0.35, 0.35, 2.4), m=M['dwood'], seg=8)
    for i, (a, z) in enumerate([(0.6, 2.0), (-0.7, 1.6), (0.2, 2.5)]): add('cyl', (math.sin(a) * 0.5, 0, z + 0.3), (0.12, 0.12, 1.3), rot=(0, a, 0), m=M['dwood'], seg=6)
@prop
def spire():
    s = add('cone', (0, 0, 1.6), (1.2, 1.2, 3.2), seg=6, m=M['brock']); jitter(s, 0.1, 3)
    add('cone', (0.7, 0.3, 0.8), (0.6, 0.6, 1.6), seg=5, m=M['brock'])
    add('cyl', (0, 0, 0.03), (2.2, 1.4, 0.06), m=M['lava'], seg=16)
@prop
def altar():
    add('cube', (0, 0, 0.4), (2.0, 1.2, 0.8), m=M['stone'], bevel=0.06); add('cube', (0, 0, 0.9), (2.2, 1.4, 0.2), m=M['stone'], bevel=0.04)
    add('cone', (0, 0, 1.5), (0.6, 0.6, 1.1), seg=6, m=M['magic']); add('cone', (0, 0, 0.95), (0.6, 0.6, -0.5), seg=6, m=M['magic'])
    for x in (-0.8, 0.8): add('cyl', (x, -0.3, 1.15), (0.08, 0.08, 0.3), m=M['cloth_w']); add('sphere', (x, -0.3, 1.35), (0.07, 0.07, 0.12), m=M['fire'])

def props(which):
    names = list(PROPS) if which == 'all' else [which]
    for n in names:
        prop_scene(); mats(); PROPS[n](); render_prop(n, 384 if n in ('chest', 'storage', 'rock') else 512)
        print('prop', n, 'ok', flush=True)

if __name__ == '__main__':
    a = sys.argv[1:] or ['props', 'all']
    if a[0] == 'dungeon':
        for t in (THEMES if (len(a) < 2 or a[1] == 'all') else [a[1]]): dungeon(t); print('dungeon', t, 'ok', flush=True)
    else: props(a[1] if len(a) > 1 else 'all')
