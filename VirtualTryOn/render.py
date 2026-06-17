import bpy
import sys
import os
import argparse
import math
import mathutils

def parse_args():
    if '--' in sys.argv:
        args_list = sys.argv[sys.argv.index('--') + 1:]
    else:
        args_list = []

    parser = argparse.ArgumentParser(description="Zyntra Headless Blender Render Script")
    parser.add_argument("--gender",  type=str, required=True, choices=["male", "female"])
    parser.add_argument("--type",    type=str, required=True, choices=["tshirt", "jeans"])
    parser.add_argument("--color",   type=str, required=True,
                        help="Primary garment colour R,G,B (0-1 floats)")
    parser.add_argument("--color2",  type=str, default="",
                        help="Optional secondary colour R,G,B (0-1 floats)")
    parser.add_argument("--output",  type=str, required=True)
    return parser.parse_args(args_list)


def parse_color(s):
    try:
        parts = [float(x.strip()) for x in s.split(",")]
        return tuple(parts[:3])
    except Exception:
        return (0.4, 0.4, 0.4)


def build_garment_material(name, c1, c2=None, z_min=0.0, z_max=100.0):
    """
    Create a Principled BSDF material with a fabric-like look.
    If c2 is provided, add a vertical gradient from c1 (bottom) to c2 (top) using World Position.
    """
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes  = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    out  = nodes.new('ShaderNodeOutputMaterial'); out.location  = (800, 0)
    bsdf = nodes.new('ShaderNodeBsdfPrincipled'); bsdf.location = (400, 0)

    # Fabric appearance: high roughness, near-zero specular
    bsdf.inputs['Roughness'].default_value = 0.90
    try:
        bsdf.inputs['Specular IOR Level'].default_value = 0.05   # Blender >= 4.0
    except KeyError:
        try:
            bsdf.inputs['Specular'].default_value = 0.02         # Blender < 4.0
        except KeyError:
            pass
    bsdf.inputs['Alpha'].default_value = 1.0

    if c2:
        # Create a vertical gradient using World Position
        geom = nodes.new('ShaderNodeNewGeometry'); geom.location = (-600, 200)
        sep  = nodes.new('ShaderNodeSeparateXYZ'); sep.location  = (-400, 200)
        
        # Map the Z coordinate from [z_min, z_max] to [0.0, 1.0]
        map_range = nodes.new('ShaderNodeMapRange'); map_range.location = (-150, 200)
        map_range.inputs['From Min'].default_value = z_min
        map_range.inputs['From Max'].default_value = z_max
        map_range.inputs['To Min'].default_value = 0.0
        map_range.inputs['To Max'].default_value = 1.0
        
        # Color Ramp
        ramp = nodes.new('ShaderNodeValToRGB'); ramp.location = (100, 200)
        ramp.color_ramp.elements[0].color = (*c1, 1.0) # bottom color
        ramp.color_ramp.elements[1].color = (*c2, 1.0) # top color
        
        # Link inputs
        links.new(geom.outputs['Position'], sep.inputs['Vector'])
        links.new(sep.outputs['Z'],         map_range.inputs['Value'])
        links.new(map_range.outputs['Result'], ramp.inputs['Fac'])
        links.new(ramp.outputs['Color'],    bsdf.inputs['Base Color'])
    else:
        bsdf.inputs['Base Color'].default_value = (*c1, 1.0)

    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    mat.blend_method = 'OPAQUE'
    try:
        mat.shadow_method = 'OPAQUE'
    except AttributeError:
        pass
    return mat


def paint_body_polygons(body_obj, gender, garment_type, garment_mat, default_mat):
    """
    Use bmesh to paint the body mesh polygons corresponding to active/default garments.
    """
    import bmesh as bm_mod
    mesh = body_obj.data

    # Add materials to slot list
    if garment_mat.name not in [m.name for m in mesh.materials if m]:
        mesh.materials.append(garment_mat)
    if default_mat.name not in [m.name for m in mesh.materials if m]:
        mesh.materials.append(default_mat)

    mat_names = [m.name for m in mesh.materials if m]
    garment_idx = mat_names.index(garment_mat.name)
    default_idx = mat_names.index(default_mat.name)

    # Locate original skin material to only paint skin polygons (preserving eyes)
    skin_idx = 0
    for i, m in enumerate(mesh.materials):
        if m and "DefaultSkin" in m.name:
            skin_idx = i
            break

    bm = bm_mod.new()
    bm.from_mesh(mesh)
    bm.faces.ensure_lookup_table()

    mat_world = body_obj.matrix_world

    for face in bm.faces:
        # Only paint faces that originally had the skin material
        if face.material_index != skin_idx:
            continue

        local_c  = face.calc_center_median()
        world_c  = mat_world @ local_c
        z = world_c.z
        x = abs(world_c.x)

        is_shirt = False
        is_jeans = False

        if gender == "male":
            # Shirt bounds
            if 81.0 <= z < 110.0:
                if x < 21.0:
                    is_shirt = True
            elif 110.0 <= z < 138.0:
                if x < 7.0 and z >= 132.0:
                    # Neck exclusion
                    pass
                elif x < 16.5:
                    is_shirt = True
                elif x < 24.5 and z < 131.0:
                    # Sleeves
                    is_shirt = True
            
            # Jeans bounds
            if 8.0 <= z <= 83.0:
                is_jeans = True

        else: # female
            # Shirt bounds
            if 75.0 <= z < 102.0:
                if x < 19.0:
                    is_shirt = True
            elif 102.0 <= z < 130.0:
                if x < 6.2 and z >= 125.0:
                    # Neck exclusion
                    pass
                elif x < 14.5:
                    is_shirt = True
                elif x < 21.5 and z < 124.0:
                    # Sleeves
                    is_shirt = True
            
            # Jeans bounds
            if 8.0 <= z <= 77.0:
                is_jeans = True

        # Assign materials based on type requested
        if garment_type == "tshirt":
            if is_shirt:
                face.material_index = garment_idx
            elif is_jeans:
                face.material_index = default_idx
        elif garment_type == "jeans":
            if is_jeans:
                face.material_index = garment_idx
            elif is_shirt:
                face.material_index = default_idx

    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    print(f"[Render] Painted '{garment_type}' on '{body_obj.name}' with default outfit layering.")


def main():
    args = parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    blend_path = os.path.join(script_dir, "virtual_tryon_assets.blend")
    print(f"[Render] Loading blend: {blend_path}")

    try:
        bpy.ops.wm.open_mainfile(filepath=blend_path)
    except Exception as e:
        print(f"[Render] Error opening blend: {e}")
        sys.exit(1)

    scene = bpy.context.scene

    # ── 1. Avatar visibility ─────────────────────────────────────────────────
    female_base = bpy.data.objects.get("Female_Base")
    male_base   = bpy.data.objects.get("Male_Base")

    def show(obj):
        if obj:
            obj.hide_viewport = False
            obj.hide_render   = False

    def hide(obj):
        if obj:
            obj.hide_viewport = True
            obj.hide_render   = True

    if args.gender == "female":
        show(female_base);  hide(male_base)
        active_base = female_base
    else:
        show(male_base);    hide(female_base)
        active_base = male_base

    if not active_base:
        print(f"[Render] ERROR: avatar object not found for gender={args.gender}")
        sys.exit(1)

    print(f"[Render] Using avatar: {active_base.name}")

    # ── 2. Determine bounds & build materials ────────────────────────────────
    # Dynamic ranges for gradient nodes
    if args.gender == "male":
        z_min_t, z_max_t = 81.0, 138.0
        z_min_j, z_max_j = 8.0, 83.0
    else:
        z_min_t, z_max_t = 75.0, 130.0
        z_min_j, z_max_j = 8.0, 77.0

    c1 = parse_color(args.color)
    c2 = parse_color(args.color2) if args.color2.strip() else None

    # Garment material (uses the requested parameters)
    if args.type == "tshirt":
        garment_mat = build_garment_material("Garment_Color", c1, c2, z_min_t, z_max_t)
        # Default jeans: clean dark denim blue
        default_mat = build_garment_material("Garment_Default_Jeans", (0.12, 0.18, 0.28))
    else:
        garment_mat = build_garment_material("Garment_Color", c1, c2, z_min_j, z_max_j)
        # Default shirt: clean off-white
        default_mat = build_garment_material("Garment_Default_Shirt", (0.92, 0.92, 0.93))

    paint_body_polygons(active_base, args.gender, args.type, garment_mat, default_mat)

    # ── 3. Studio lighting ───────────────────────────────────────────────────
    for obj in list(scene.objects):
        if obj.type == 'LIGHT':
            bpy.data.objects.remove(obj, do_unlink=True)

    bb  = [active_base.matrix_world @ mathutils.Vector(v) for v in active_base.bound_box]
    cx  = sum(p.x for p in bb) / 8
    cy  = sum(p.y for p in bb) / 8
    cz  = sum(p.z for p in bb) / 8

    target = bpy.data.objects.new("Target", None)
    target.location = (cx, cy, cz)
    scene.collection.objects.link(target)

    def area_light(name, energy, size, color, loc):
        d = bpy.data.lights.new(name, type='AREA')
        d.energy = energy;  d.size = size;  d.color = color
        o = bpy.data.objects.new(name, d)
        scene.collection.objects.link(o)
        o.location = loc
        t = o.constraints.new('TRACK_TO')
        t.target = target;  t.track_axis = 'TRACK_NEGATIVE_Z';  t.up_axis = 'UP_Y'

    area_light("Key",  80000, 25, (1.0,  0.95, 0.9),  (cx+90,  cy-120, cz+60))
    area_light("Fill", 30000, 40, (0.85, 0.9,  1.0),  (cx-90,  cy-120, cz+30))
    area_light("Rim",  50000, 20, (1.0,  1.0,  1.0),  (cx+10,  cy+110, cz+40))
    print("[Render] Studio lighting configured.")

    # ── 4. Camera ────────────────────────────────────────────────────────────
    camera = bpy.data.objects.get("Camera")
    if not camera:
        cam_data = bpy.data.cameras.new("Camera")
        camera   = bpy.data.objects.new("Camera", cam_data)
        scene.collection.objects.link(camera)
    scene.camera = camera

    camera.rotation_mode  = 'XYZ'
    camera.rotation_euler = (math.pi / 2, 0.0, 0.0)
    camera.data.type      = 'ORTHO'
    camera.data.ortho_scale = 185.0
    camera.data.clip_end  = 2000.0

    camera.location.x = active_base.location.x
    camera.location.y = -350.0
    camera.location.z = 93.0

    print(f"[Render] Camera: ortho, pos=({camera.location.x:.1f}, {camera.location.y:.1f}, {camera.location.z:.1f})")

    # ── 5. Render ────────────────────────────────────────────────────────────
    scene.render.engine                   = 'CYCLES'
    scene.cycles.device                   = 'CPU'
    scene.cycles.samples                  = 32
    scene.cycles.use_denoising           = True
    scene.render.resolution_x            = 1080
    scene.render.resolution_y            = 1350
    scene.render.film_transparent        = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath                = args.output
    scene.view_settings.view_transform   = 'Filmic'
    scene.view_settings.look             = 'Medium Contrast'

    print(f"[Render] Rendering -> {args.output}")
    try:
        bpy.ops.render.render(write_still=True)
        print("[Render] Done.")
    except Exception as e:
        print(f"[Render] Error: {e}")
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()
