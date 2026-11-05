import bpy, json, os, math
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'art','source','meshy-console-original.glb'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
report=[]
for o in meshes:
 report.append(dict(name=o.name,dimensions=list(o.dimensions),location=list(o.location),rotation=list(o.rotation_euler),verts=len(o.data.vertices),polygons=len(o.data.polygons),materials=[m.name for m in o.data.materials]))
print(json.dumps(report,indent=2))
with open(os.path.join(ROOT,'art','source','raw-inspection.json'),'w')as f:json.dump(report,f,indent=2)
allpts=[o.matrix_world@Vector(c)for o in meshes for c in o.bound_box];mn=Vector([min(p[i]for p in allpts)for i in range(3)]);mx=Vector([max(p[i]for p in allpts)for i in range(3)]);center=(mn+mx)/2
print('BOUNDS',list(mn),list(mx))
for o in meshes:o.location-=center
size=max(mx-mn);sc=4/size
for o in meshes:o.location*=sc;o.scale*=sc
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world.color=(.2,.2,.2)
def area(name,loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.name=name;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,0))-l.location).to_track_quat('-Z','Y').to_euler()
area('Key',(-3,-4,6),600,5);area('Fill',(4,2,4),400,4)
bpy.ops.object.camera_add(location=(5,-7,4));cam=bpy.context.object;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=5.4;scene.camera=cam
scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(ROOT,'art','source','raw-console.png');bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art','blender','raw-console.blend'));bpy.ops.render.render(write_still=True)
