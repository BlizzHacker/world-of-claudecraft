"""Fit an approved static Meshy humanoid to the shared animated game skeleton.

The source asset remains the visible mesh and material.  The donor contributes
only a 24-bone rest skeleton; animation clips are added later by
``_retarget_meshy_rig.mjs``.  This is deterministic and entirely offline so the
forged output can be rebuilt and audited without a remote generation service.
"""

import json
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Matrix, Vector


def mesh_bounds(objects):
    points = []
    for obj in objects:
        if obj.type != "MESH":
            continue
        world = obj.matrix_world
        points.extend(world @ vertex.co for vertex in obj.data.vertices)
    if not points:
        raise RuntimeError("target has no mesh vertices")
    axes = [sorted(point[index] for point in points) for index in range(3)]

    def percentile(values, amount):
        index = min(len(values) - 1, max(0, int((len(values) - 1) * amount)))
        return values[index]

    # Static Meshy presentation files often stage a weapon or effect far to one
    # side of the actual T-pose. Full min/max bounds shift the inferred skeleton
    # into that prop. Quantiles and the vertex median recover the body frame while
    # still retaining the complete arm span and the top/bottom of the silhouette.
    center_x = percentile(axes[0], 0.5)
    center_y = percentile(axes[1], 0.5)
    radius_x = max(center_x - percentile(axes[0], 0.01), percentile(axes[0], 0.99) - center_x)
    radius_y = max(center_y - percentile(axes[1], 0.01), percentile(axes[1], 0.99) - center_y)
    low = Vector(
        (
            center_x - radius_x,
            center_y - radius_y,
            percentile(axes[2], 0.005),
        )
    )
    high = Vector(
        (
            center_x + radius_x,
            center_y + radius_y,
            percentile(axes[2], 0.995),
        )
    )
    return low, high


def import_glb(file_path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(file_path), import_shading="NORMALS")
    return [obj for obj in bpy.data.objects if obj not in before]


def join_mesh_objects(meshes):
    """Join imported mesh objects so cleanup sees one global island set.

    Meshy exports clothing, effects, weapons, and the body as separate mesh
    objects. Cleaning each object independently made every detached prop look
    like a primary body component, so it survived and orbited the animated rig.
    Blender's join keeps material slots while giving the island pass a global
    largest-body reference.
    """

    if len(meshes) <= 1:
        return meshes
    bpy.ops.object.select_all(action="DESELECT")
    active = max(meshes, key=lambda item: (len(item.data.vertices), item.name))
    for mesh in meshes:
        mesh.select_set(True)
    bpy.context.view_layer.objects.active = active
    bpy.ops.object.join()
    return [active]


def strip_side_props(mesh, low, high):
    """Remove detached weapons/effects authored beside a static T-pose.

    The approved Classic models frequently include a bow, staff, shield, or
    spell effect floating beside the body. Runtime equipment is attached to
    animated hand bones, so retaining these baked side props creates duplicate
    or orbiting weapons. A conservative T-pose body/arm envelope removes even
    degenerate-edge-welded props, then connected-island cleanup removes the
    remnants without cutting legitimate limbs or clothing.
    """

    height = high.z - low.z
    center_x = (low.x + high.x) * 0.5
    world = mesh.matrix_world
    bm = bmesh.new()
    bm.from_mesh(mesh.data)
    center_y = (low.y + high.y) * 0.5

    def inside_body_envelope(point):
        vertical = (point.z - low.z) / height
        side = abs(point.x - center_x) / height
        depth = abs(point.y - center_y) / height
        lower_body = vertical <= 0.58 and side <= 0.22 and depth <= 0.28
        torso_or_head = vertical >= 0.48 and side <= 0.25 and depth <= 0.32
        t_pose_arms = 0.62 <= vertical <= 0.86 and side <= 0.62 and depth <= 0.20
        return lower_body or torso_or_head or t_pose_arms

    # First cut geometry outside a conservative T-pose silhouette. Generated
    # source files sometimes weld display-layout weapons to the main mesh with
    # degenerate edges, so connected-component checks alone cannot remove them.
    envelope_doomed = [
        vertex for vertex in bm.verts if not inside_body_envelope(world @ vertex.co)
    ]
    bmesh.ops.delete(bm, geom=envelope_doomed, context="VERTS")

    # Many static Meshy files duplicate every triangle corner, so a visually
    # continuous body initially appears to be thousands of disconnected
    # three-vertex islands. Weld coincident positions before island analysis;
    # loop-level UVs remain intact while body, clothing, and staged props become
    # meaningful spatial components.
    if bm.verts:
        bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=max(height * 1e-6, 1e-7))

    # The silhouette cut can leave a thin piece of a staff crossing the arm
    # corridor. Remove any resulting island that is neither the primary body
    # nor anchored to the torso, legs, or shoulders.
    unseen = set(bm.verts)
    components = []
    while unseen:
        first = unseen.pop()
        stack = [first]
        component = [first]
        while stack:
            current = stack.pop()
            for edge in current.link_edges:
                neighbor = edge.other_vert(current)
                if neighbor in unseen:
                    unseen.remove(neighbor)
                    stack.append(neighbor)
                    component.append(neighbor)
        components.append(component)

    largest = max((len(component) for component in components), default=0)
    component_doomed = []
    for component in components:
        points = [world @ vertex.co for vertex in component]
        vertical_low = (min(point.z for point in points) - low.z) / height
        vertical_high = (max(point.z for point in points) - low.z) / height
        vertical_span = vertical_high - vertical_low
        touches_core = any(
            0.34 <= (point.z - low.z) / height <= 0.98
            and abs(point.x - center_x) <= height * 0.19
            and abs(point.y - center_y) <= height * 0.18
            for point in points
        )
        touches_leg = vertical_low < 0.38 and vertical_span >= 0.07 and any(
            abs(point.x - center_x) <= height * 0.16
            and abs(point.y - center_y) <= height * 0.16
            for point in points
        )
        touches_shoulder = (
            vertical_low < 0.86
            and vertical_high > 0.62
            and any(
                abs(point.x - center_x) <= height * 0.22
                and abs(point.y - center_y) <= height * 0.18
                for point in points
            )
        )
        is_primary_body = len(component) == largest
        substantial = len(component) >= max(80, int(largest * 0.003))
        if not is_primary_body and not (
            substantial and (touches_core or touches_leg or touches_shoulder)
        ):
            component_doomed.extend(component)
    bmesh.ops.delete(bm, geom=component_doomed, context="VERTS")
    bm.to_mesh(mesh.data)
    bm.free()
    mesh.data.update()
    return len(envelope_doomed) + len(component_doomed)


def fit_t_pose(armature, low, high):
    height = high.z - low.z
    center_x = (low.x + high.x) * 0.5
    center_y = (low.y + high.y) * 0.5
    z = lambda ratio: low.z + height * ratio
    hip_x = height * 0.10
    knee_x = height * 0.105
    ankle_x = height * 0.11
    shoulder_x = height * 0.17
    elbow_x = min((high.x - center_x) * 0.62, height * 0.42)
    wrist_x = min((high.x - center_x) * 0.88, height * 0.58)
    forward = height * 0.055

    def point(x, y, vertical):
        return Vector((center_x + x, center_y + y, z(vertical)))

    placements = {
        "Hips": (point(0, 0, 0.48), point(0, 0, 0.55)),
        "LeftUpLeg": (point(hip_x, 0, 0.48), point(knee_x, 0, 0.27)),
        "LeftLeg": (point(knee_x, 0, 0.27), point(ankle_x, 0, 0.07)),
        "LeftFoot": (point(ankle_x, 0, 0.07), point(ankle_x, -forward, 0.025)),
        "LeftToeBase": (point(ankle_x, -forward, 0.025), point(ankle_x, -forward * 2.0, 0.025)),
        "RightUpLeg": (point(-hip_x, 0, 0.48), point(-knee_x, 0, 0.27)),
        "RightLeg": (point(-knee_x, 0, 0.27), point(-ankle_x, 0, 0.07)),
        "RightFoot": (point(-ankle_x, 0, 0.07), point(-ankle_x, -forward, 0.025)),
        "RightToeBase": (point(-ankle_x, -forward, 0.025), point(-ankle_x, -forward * 2.0, 0.025)),
        "Spine02": (point(0, 0, 0.48), point(0, 0, 0.58)),
        "Spine01": (point(0, 0, 0.58), point(0, 0, 0.67)),
        "Spine": (point(0, 0, 0.67), point(0, 0, 0.76)),
        "LeftShoulder": (point(0, 0, 0.75), point(shoulder_x, 0, 0.75)),
        "LeftArm": (point(shoulder_x, 0, 0.75), point(elbow_x, 0, 0.75)),
        "LeftForeArm": (point(elbow_x, 0, 0.75), point(wrist_x, 0, 0.75)),
        "LeftHand": (point(wrist_x, 0, 0.75), point(wrist_x + height * 0.08, 0, 0.75)),
        "RightShoulder": (point(0, 0, 0.75), point(-shoulder_x, 0, 0.75)),
        "RightArm": (point(-shoulder_x, 0, 0.75), point(-elbow_x, 0, 0.75)),
        "RightForeArm": (point(-elbow_x, 0, 0.75), point(-wrist_x, 0, 0.75)),
        "RightHand": (point(-wrist_x, 0, 0.75), point(-wrist_x - height * 0.08, 0, 0.75)),
        "neck": (point(0, 0, 0.75), point(0, 0, 0.82)),
        "Head": (point(0, 0, 0.82), point(0, 0, 0.94)),
        "head_end": (point(0, 0, 0.94), point(0, 0, 0.995)),
        "headfront": (point(0, 0, 0.87), point(0, -forward, 0.87)),
    }

    armature.matrix_world = Matrix.Identity(4)
    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for name, (head, tail) in placements.items():
        bone = armature.data.edit_bones.get(name)
        if bone is None:
            continue
        bone.head = head
        bone.tail = tail
        bone.roll = 0.0
        bone.use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.context.view_layer.update()
    return placements


def point_segment_distance(point, head, tail):
    segment = tail - head
    denominator = segment.length_squared
    if denominator <= 1e-12:
        return (point - head).length
    amount = max(0.0, min(1.0, (point - head).dot(segment) / denominator))
    return (point - (head + segment * amount)).length


def apply_geometric_weights(mesh, armature, placements, low, high):
    height = high.z - low.z
    center_x = (low.x + high.x) * 0.5
    shoulder_width = height * 0.17
    groups = {name: mesh.vertex_groups.new(name=name) for name in placements}
    world = mesh.matrix_world
    for vertex in mesh.data.vertices:
        point = world @ vertex.co
        vertical = (point.z - low.z) / height
        offset_x = point.x - center_x
        side = "Left" if offset_x >= 0 else "Right"
        if 0.1 < vertical < 0.5 and abs(offset_x) < height * 0.24:
            # Robes, tabards, and coat hems must not be torn into two long leg
            # ribbons. Keep their central fabric on the pelvis/spine while the
            # actual outer legs continue to articulate normally.
            groups["Hips"].add([vertex.index], 0.82, "REPLACE")
            groups["Spine02"].add([vertex.index], 0.18, "REPLACE")
            continue
        if vertical < 0.5:
            candidates = [f"{side}ToeBase", f"{side}Foot", f"{side}Leg", f"{side}UpLeg", "Hips"]
        elif vertical > 0.68 and abs(offset_x) > shoulder_width * 0.72:
            candidates = [f"{side}Shoulder", f"{side}Arm", f"{side}ForeArm", f"{side}Hand", "Spine"]
        elif vertical > 0.79:
            candidates = ["neck", "Head", "head_end", "headfront", "Spine"]
        else:
            candidates = ["Hips", "Spine02", "Spine01", "Spine", "neck"]
        distances = sorted(
            ((name, point_segment_distance(point, *placements[name])) for name in candidates),
            key=lambda item: item[1],
        )[:4]
        raw = [(name, 1.0 / max(distance, height * 0.018) ** 2) for name, distance in distances]
        total = sum(weight for _, weight in raw)
        for name, weight in raw:
            groups[name].add([vertex.index], weight / total, "REPLACE")
    modifier = mesh.modifiers.new(name="Armature", type="ARMATURE")
    modifier.object = armature
    mesh.parent = armature


def main():
    if len(sys.argv) != 4:
        raise SystemExit("usage: rig_static_humanoid.py TARGET.glb DONOR.glb OUTPUT.glb")
    target_path = Path(sys.argv[1]).resolve()
    donor_path = Path(sys.argv[2]).resolve()
    output_path = Path(sys.argv[3]).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    target_objects = import_glb(target_path)
    target_meshes = [obj for obj in target_objects if obj.type == "MESH"]
    if not target_meshes:
        raise RuntimeError("target has no mesh")
    target_meshes = join_mesh_objects(target_meshes)
    target_low, target_high = mesh_bounds(target_meshes)
    stripped_vertices = sum(strip_side_props(mesh, target_low, target_high) for mesh in target_meshes)
    target_low, target_high = mesh_bounds(target_meshes)

    donor_objects = import_glb(donor_path)
    armature = next((obj for obj in donor_objects if obj.type == "ARMATURE"), None)
    if armature is None:
        raise RuntimeError("donor has no armature")
    donor_meshes = [obj for obj in donor_objects if obj.type == "MESH"]
    if not donor_meshes:
        raise RuntimeError("donor has no skinned mesh")
    if armature.animation_data:
        armature.animation_data_clear()
    armature.data.pose_position = "REST"

    placements = fit_t_pose(armature, target_low, target_high)
    for mesh in target_meshes:
        for modifier in list(mesh.modifiers):
            mesh.modifiers.remove(modifier)
        for group in list(mesh.vertex_groups):
            mesh.vertex_groups.remove(group)
    weight_mode = "geometric"
    for mesh in target_meshes:
        apply_geometric_weights(mesh, armature, placements, target_low, target_high)

    for donor_mesh in donor_meshes:
        bpy.data.objects.remove(donor_mesh, do_unlink=True)

    armature.data.pose_position = "POSE"
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format="GLB",
        export_animations=False,
        export_yup=True,
        export_apply=False,
    )
    print(json.dumps({
        "output": str(output_path),
        "targetBounds": {"low": list(target_low), "high": list(target_high)},
        "meshes": [mesh.name for mesh in target_meshes],
        "strippedVertices": stripped_vertices,
        "vertexGroups": {mesh.name: len(mesh.vertex_groups) for mesh in target_meshes},
        "bones": len(armature.data.bones),
        "weightMode": weight_mode,
    }))


if __name__ == "__main__":
    main()
