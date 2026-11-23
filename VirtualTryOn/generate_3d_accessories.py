"""
Zyntra AR Studio - 3D Accessory Asset Generator
Generates clean Wavefront .obj/.mtl and standard glTF 2.0 Binary (.glb) assets
for AR Accessories Try-On:
1. Cyberpunk / Classic Aviator Sunglasses (Face/Nose bridge anchor)
2. Streetwear Snapback Cap (Forehead/Head anchor)
3. Luxury Chronograph Watch (Wrist anchor)
4. Cuban Link Chain (Neck/Collar anchor)

Complies with Unity URP and WebAR (Google Model-Viewer / Three.js) specifications.
"""

import struct
import json
import math
import os

def create_glb(vertices, normals, indices, material_name, base_color_factor, metallic_factor=0.8, roughness_factor=0.2):
    """
    Builds a standalone binary glTF 2.0 (.glb) buffer.
    """
    num_vertices = len(vertices) // 3
    num_indices = len(indices)

    # Calculate bounding box
    min_x = min_y = min_z = float('inf')
    max_x = max_y = max_z = float('-inf')
    for i in range(0, len(vertices), 3):
        x, y, z = vertices[i], vertices[i+1], vertices[i+2]
        if x < min_x: min_x = x
        if x > max_x: max_x = x
        if y < min_y: min_y = y
        if y > max_y: max_y = y
        if z < min_z: min_z = z
        if z > max_z: max_z = z

    # Format binary buffers (indices as unsigned short 16-bit or 32-bit, positions & normals as 32-bit floats)
    if num_vertices > 65535:
        idx_fmt = f"<{num_indices}I"
        idx_comp_type = 5125 # UNSIGNED_INT
        idx_stride = 4
    else:
        idx_fmt = f"<{num_indices}H"
        idx_comp_type = 5123 # UNSIGNED_SHORT
        idx_stride = 2

    index_data = struct.pack(idx_fmt, *indices)
    # Pad to 4-byte alignment
    while len(index_data) % 4 != 0:
        index_data += b'\x00'

    pos_data = struct.pack(f"<{len(vertices)}f", *vertices)
    norm_data = struct.pack(f"<{len(normals)}f", *normals)

    bin_buffer = index_data + pos_data + norm_data

    idx_byte_offset = 0
    idx_byte_length = num_indices * idx_stride

    pos_byte_offset = len(index_data)
    pos_byte_length = len(pos_data)

    norm_byte_offset = pos_byte_offset + pos_byte_length
    norm_byte_length = len(norm_data)

    gltf_dict = {
        "asset": {
            "version": "2.0",
            "generator": "Zyntra AR Studio Asset Pipeline"
        },
        "scene": 0,
        "scenes": [{ "nodes": [0] }],
        "nodes": [{ "mesh": 0, "name": material_name }],
        "meshes": [
            {
                "name": material_name,
                "primitives": [
                    {
                        "attributes": {
                            "POSITION": 1,
                            "NORMAL": 2
                        },
                        "indices": 0,
                        "material": 0,
                        "mode": 4 # TRIANGLES
                    }
                ]
            }
        ],
        "materials": [
            {
                "name": material_name,
                "pbrMetallicRoughness": {
                    "baseColorFactor": base_color_factor,
                    "metallicFactor": metallic_factor,
                    "roughnessFactor": roughness_factor
                },
                "doubleSided": True
            }
        ],
        "accessors": [
            {
                "bufferView": 0,
                "byteOffset": 0,
                "componentType": idx_comp_type,
                "count": num_indices,
                "type": "SCALAR"
            },
            {
                "bufferView": 1,
                "byteOffset": 0,
                "componentType": 5126, # FLOAT
                "count": num_vertices,
                "type": "VEC3",
                "min": [min_x, min_y, min_z],
                "max": [max_x, max_y, max_z]
            },
            {
                "bufferView": 2,
                "byteOffset": 0,
                "componentType": 5126, # FLOAT
                "count": num_vertices,
                "type": "VEC3"
            }
        ],
        "bufferViews": [
            {
                "buffer": 0,
                "byteOffset": idx_byte_offset,
                "byteLength": idx_byte_length,
                "target": 34963 # ELEMENT_ARRAY_BUFFER
            },
            {
                "buffer": 0,
                "byteOffset": pos_byte_offset,
                "byteLength": pos_byte_length,
                "target": 34962 # ARRAY_BUFFER
            },
            {
                "buffer": 0,
                "byteOffset": norm_byte_offset,
                "byteLength": norm_byte_length,
                "target": 34962 # ARRAY_BUFFER
            }
        ],
        "buffers": [
            {
                "byteLength": len(bin_buffer)
            }
        ]
    }

    json_str = json.dumps(gltf_dict, separators=(',', ':'))
    json_bytes = json_str.encode('utf-8')
    while len(json_bytes) % 4 != 0:
        json_bytes += b' '

    # GLB Header (12 bytes)
    magic = 0x46546C67 # "glTF"
    version = 2
    total_length = 12 + 8 + len(json_bytes) + 8 + len(bin_buffer)

    header = struct.pack("<III", magic, version, total_length)

    # JSON Chunk Header
    json_chunk_header = struct.pack("<II", len(json_bytes), 0x4E4F534A) # "JSON"
    # BIN Chunk Header
    bin_chunk_header = struct.pack("<II", len(bin_buffer), 0x004E4942) # "BIN\0"

    return header + json_chunk_header + json_bytes + bin_chunk_header + bin_buffer

def write_obj(filepath, vertices, normals, indices, obj_name):
    """
    Exports clean Wavefront OBJ format.
    """
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(f"# Zyntra AR Studio - 3D Model: {obj_name}\n")
        f.write(f"o {obj_name}\n")
        for i in range(0, len(vertices), 3):
            f.write(f"v {vertices[i]:.4f} {vertices[i+1]:.4f} {vertices[i+2]:.4f}\n")
        for i in range(0, len(normals), 3):
            f.write(f"vn {normals[i]:.4f} {normals[i+1]:.4f} {normals[i+2]:.4f}\n")
        for i in range(0, len(indices), 3):
            i1 = indices[i] + 1
            i2 = indices[i+1] + 1
            i3 = indices[i+2] + 1
            f.write(f"f {i1}//{i1} {i2}//{i2} {i3}//{i3}\n")

# ─────────────────────────────────────────────────────────────────────────────
# 1. 3D Model: Cyberpunk / Aviator Sunglasses (Anchor: Nose Bridge, 0,0,0)
# ─────────────────────────────────────────────────────────────────────────────
def generate_sunglasses():
    vertices = []
    normals = []
    indices = []

    def add_quad(p1, p2, p3, p4, normal):
        base = len(vertices) // 3
        for p in [p1, p2, p3, p4]:
            vertices.extend(p)
            normals.extend(normal)
        indices.extend([base, base + 1, base + 2, base, base + 2, base + 3])

    def add_box(cx, cy, cz, wx, wy, wz):
        hx, hy, hz = wx / 2, wy / 2, wz / 2
        # Front
        add_quad([cx - hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz + hz], [cx + hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz + hz], [0, 0, 1])
        # Back
        add_quad([cx + hx, cy - hy, cz - hz], [cx - hx, cy - hy, cz - hz], [cx - hx, cy + hy, cz - hz], [cx + hx, cy + hy, cz - hz], [0, 0, -1])
        # Left
        add_quad([cx - hx, cy - hy, cz - hz], [cx - hx, cy - hy, cz + hz], [cx - hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz - hz], [-1, 0, 0])
        # Right
        add_quad([cx + hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz - hz], [cx + hx, cy + hy, cz - hz], [cx + hx, cy + hy, cz + hz], [1, 0, 0])
        # Top
        add_quad([cx - hx, cy + hy, cz + hz], [cx + hx, cy + hy, cz + hz], [cx + hx, cy + hy, cz - hz], [cx - hx, cy + hy, cz - hz], [0, 1, 0])
        # Bottom
        add_quad([cx - hx, cy - hy, cz - hz], [cx + hx, cy - hy, cz - hz], [cx + hx, cy - hy, cz + hz], [cx - hx, cy - hy, cz + hz], [0, -1, 0])

    # Left Lens (centered around x = -0.38, y = 0, z = 0)
    add_box(-0.38, 0.0, 0.0, 0.52, 0.38, 0.04)
    # Right Lens (centered around x = 0.38, y = 0, z = 0)
    add_box(0.38, 0.0, 0.0, 0.52, 0.38, 0.04)
    # Bridge (connecting across nose x = -0.12 to 0.12)
    add_box(0.0, 0.10, 0.02, 0.28, 0.04, 0.03)
    # Brow bar
    add_box(0.0, 0.21, 0.02, 1.30, 0.03, 0.03)
    # Left Temple Arm (extending back along -Z)
    add_box(-0.65, 0.18, -0.45, 0.03, 0.04, 0.90)
    # Right Temple Arm (extending back along -Z)
    add_box(0.65, 0.18, -0.45, 0.03, 0.04, 0.90)

    return vertices, normals, indices

# ─────────────────────────────────────────────────────────────────────────────
# 2. 3D Model: Streetwear Snapback Baseball Cap (Anchor: Head Base, 0,0,0)
# ─────────────────────────────────────────────────────────────────────────────
def generate_cap():
    vertices = []
    normals = []
    indices = []

    # Domed hemisphere crown
    lat_steps = 10
    lon_steps = 18
    radius = 0.75

    grid = []
    for i in range(lat_steps + 1):
        lat = (math.pi / 2) * (i / lat_steps) # 0 to pi/2 (top)
        row = []
        for j in range(lon_steps):
            lon = 2 * math.pi * (j / lon_steps)
            x = radius * math.cos(lat) * math.cos(lon)
            y = radius * math.sin(lat) * 0.75 + 0.2 # dome height
            z = radius * math.cos(lat) * math.sin(lon) * 1.1 # slightly elongated back-to-front
            
            # Normal
            nx = math.cos(lat) * math.cos(lon)
            ny = math.sin(lat)
            nz = math.cos(lat) * math.sin(lon)
            
            idx = len(vertices) // 3
            vertices.extend([x, y, z])
            normals.extend([nx, ny, nz])
            row.append(idx)
        grid.append(row)

    for i in range(lat_steps):
        for j in range(lon_steps):
            next_j = (j + 1) % lon_steps
            p1 = grid[i][j]
            p2 = grid[i+1][j]
            p3 = grid[i+1][next_j]
            p4 = grid[i][next_j]
            indices.extend([p1, p2, p3, p1, p3, p4])

    # Visor / Brim sticking forward (+Z)
    visor_base = len(vertices) // 3
    visor_pts = [
        [-0.60, 0.20, 0.60], [0.60, 0.20, 0.60],
        [0.70, 0.15, 1.25], [-0.70, 0.15, 1.25],
        # Bottom of visor
        [-0.60, 0.17, 0.60], [0.60, 0.17, 0.60],
        [0.70, 0.12, 1.25], [-0.70, 0.12, 1.25]
    ]
    for p in visor_pts:
        vertices.extend(p)
        normals.extend([0, 1, 0])

    # Top quad
    indices.extend([visor_base, visor_base+1, visor_base+2, visor_base, visor_base+2, visor_base+3])
    # Bottom quad
    indices.extend([visor_base+4, visor_base+6, visor_base+5, visor_base+4, visor_base+7, visor_base+6])

    return vertices, normals, indices

# ─────────────────────────────────────────────────────────────────────────────
# 3. 3D Model: Luxury Chronograph Watch (Anchor: Wrist, 0,0,0)
# ─────────────────────────────────────────────────────────────────────────────
def generate_watch():
    vertices = []
    normals = []
    indices = []

    # Circular dial bezel
    steps = 24
    r_outer = 0.25
    r_inner = 0.18
    thickness = 0.06

    def add_prism_ring(r1, r2, z_front, z_back):
        ring_base = len(vertices) // 3
        for i in range(steps):
            th = 2 * math.pi * (i / steps)
            c, s = math.cos(th), math.sin(th)
            # 4 vertices per segment
            vertices.extend([r1 * c, r1 * s, z_front])
            normals.extend([0, 0, 1])
            vertices.extend([r2 * c, r2 * s, z_front])
            normals.extend([0, 0, 1])
            vertices.extend([r1 * c, r1 * s, z_back])
            normals.extend([0, 0, -1])
            vertices.extend([r2 * c, r2 * s, z_back])
            normals.extend([0, 0, -1])

        for i in range(steps):
            next_i = (i + 1) % steps
            v0 = ring_base + i * 4
            v1 = ring_base + i * 4 + 1
            v2 = ring_base + i * 4 + 2
            v3 = ring_base + i * 4 + 3

            nv0 = ring_base + next_i * 4
            nv1 = ring_base + next_i * 4 + 1
            nv2 = ring_base + next_i * 4 + 2
            nv3 = ring_base + next_i * 4 + 3

            # Front face
            indices.extend([v0, nv0, nv1, v0, nv1, v1])
            # Outer edge
            indices.extend([v0, v2, nv2, v0, nv2, nv0])

    add_prism_ring(r_outer, r_inner, thickness/2, -thickness/2)

    # Dial Face center plate
    center_idx = len(vertices) // 3
    vertices.extend([0, 0, thickness/2])
    normals.extend([0, 0, 1])

    for i in range(steps):
        th = 2 * math.pi * (i / steps)
        vertices.extend([r_inner * math.cos(th), r_inner * math.sin(th), thickness/2])
        normals.extend([0, 0, 1])

    for i in range(steps):
        next_i = (i + 1) % steps
        indices.extend([center_idx, center_idx + 1 + i, center_idx + 1 + next_i])

    # Wrist Strap links (extending along +/- Y to wrap arm)
    def add_strap_link(cy, cz, wx, wy, wz):
        hx, hy, hz = wx/2, wy/2, wz/2
        base = len(vertices) // 3
        pts = [
            [-hx, cy-hy, cz+hz], [hx, cy-hy, cz+hz], [hx, cy+hy, cz+hz], [-hx, cy+hy, cz+hz],
            [-hx, cy-hy, cz-hz], [hx, cy-hy, cz-hz], [hx, cy+hy, cz-hz], [-hx, cy+hy, cz-hz]
        ]
        for p in pts:
            vertices.extend(p)
            normals.extend([0, 1, 0])
        # 6 faces of box
        indices.extend([base, base+1, base+2, base, base+2, base+3]) # front
        indices.extend([base+5, base+4, base+7, base+5, base+7, base+6]) # back
        indices.extend([base+4, base, base+3, base+4, base+3, base+7]) # left
        indices.extend([base+1, base+5, base+6, base+1, base+6, base+2]) # right
        indices.extend([base+3, base+2, base+6, base+3, base+6, base+7]) # top
        indices.extend([base+4, base+5, base+1, base+4, base+1, base]) # bot

    # Top strap
    for k in range(5):
        add_strap_link(0.28 + k * 0.12, -0.05 * k, 0.22, 0.10, 0.04)
    # Bottom strap
    for k in range(5):
        add_strap_link(-0.28 - k * 0.12, -0.05 * k, 0.22, 0.10, 0.04)

    return vertices, normals, indices

# ─────────────────────────────────────────────────────────────────────────────
# Main Pipeline: Generate and Export to Unity & Web Client
# ─────────────────────────────────────────────────────────────────────────────
def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    unity_exports_dir = os.path.join(root_dir, "VirtualTryOn", "unity_exports")
    client_models_dir = os.path.join(root_dir, "client", "public", "models")

    os.makedirs(unity_exports_dir, exist_ok=True)
    os.makedirs(client_models_dir, exist_ok=True)

    items = [
        ("sunglasses", generate_sunglasses, [0.0, 0.94, 1.0, 1.0], 0.9, 0.1),  # Cyberpunk Cyan/Gold
        ("cap", generate_cap, [0.12, 0.12, 0.15, 1.0], 0.2, 0.8),              # Obsidian Streetwear
        ("watch", generate_watch, [0.85, 0.75, 0.40, 1.0], 0.95, 0.15)         # 18K Luxury Gold
    ]

    for name, gen_fn, color, metallic, roughness in items:
        v, n, idx = gen_fn()
        glb_data = create_glb(v, n, idx, f"{name.capitalize()}_Material", color, metallic, roughness)

        # 1. Save GLB to client/public/models/
        client_glb_path = os.path.join(client_models_dir, f"{name}.glb")
        with open(client_glb_path, "wb") as f:
            f.write(glb_data)

        # 2. Save GLB and OBJ to VirtualTryOn/unity_exports/
        unity_glb_path = os.path.join(unity_exports_dir, f"{name}.glb")
        with open(unity_glb_path, "wb") as f:
            f.write(glb_data)

        unity_obj_path = os.path.join(unity_exports_dir, f"{name}.obj")
        write_obj(unity_obj_path, v, n, idx, name)

        print(f"Generated [ {name} ]: {len(v)//3} vertices, {len(idx)//3} triangles -> {client_glb_path}")

    # Copy base garments to unity_exports for Unity package completeness
    for g in ["male_tshirt_template.glb", "female_tshirt_template.glb", "male_jeans_template.glb", "female_jeans_template.glb"]:
        src = os.path.join(client_models_dir, g)
        dst = os.path.join(unity_exports_dir, g)
        if os.path.exists(src) and not os.path.exists(dst):
            with open(src, "rb") as sf, open(dst, "wb") as df:
                df.write(sf.read())
            print(f"Copied apparel {g} to unity_exports/")

if __name__ == "__main__":
    main()
