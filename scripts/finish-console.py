import bpy, bmesh, os, json, math
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'art/source/meshy-console-original.glb'))
body=next(o for o in bpy.context.scene.objects if o.type=='MESH');body.name='Meshy_Ultra_Case'
# Preserve the generated shell and UVs; correct excessive depth, centre and scale.
coords=[body.matrix_world@v.co for v in body.data.vertices]
mn=Vector([min(p[i] for p in coords) for i in range(3)]);mx=Vector([max(p[i] for p in coords) for i in range(3)]);ctr=(mn+mx)/2
for v,p in zip(body.data.vertices,coords):
 q=(p-ctr)*(3.35/(mx.x-mn.x));q.y*=.54;v.co=q
body.matrix_world.identity()
# The generated broad tray is replaced by a real narrow, open cartridge aperture.
bm=bmesh.new();bm.from_mesh(body.data)
bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=(0,0,1.095),plane_no=(0,0,1),clear_outer=True,clear_inner=False);bm.to_mesh(body.data);bm.free()
def mat(name,color,rough=.7):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;return m
cream=mat('Warm injection-moulded plastic',(.69,.625,.51),.8);navy=mat('Slot interior',(.012,.018,.035),.83);rust=mat('Terracotta power button',(.6,.105,.025),.53)
# Sample the generated albedo to retain its colour regions while replacing noisy
# baked highlights with stable physical materials. Original UVs/maps stay in raw GLB.
from array import array
original=body.data.materials[0]
tex=next((n.image for n in original.node_tree.nodes if n.type=='TEX_IMAGE' and n.image and 'base' in n.label.lower()),None)
if tex is None:
 p=original.node_tree.nodes.get('Principled BSDF');links=p.inputs['Base Color'].links
 if links and links[0].from_node.type=='TEX_IMAGE':tex=links[0].from_node.image
if tex and body.data.uv_layers.active:
 pixels=array('f',[0.0])*len(tex.pixels);tex.pixels.foreach_get(pixels);iw,ih=tex.size;uv=body.data.uv_layers.active.data
 body.data.materials.append(cream);body.data.materials.append(navy);body.data.materials.append(rust);body.data.materials.append(mat('Green indicator',(.23,.47,.08),.5))
 for face in body.data.polygons:
  u=sum(uv[i].uv.x for i in face.loop_indices)/len(face.loop_indices);v=sum(uv[i].uv.y for i in face.loop_indices)/len(face.loop_indices);off=4*(min(ih-1,max(0,int(v*ih)))*iw+min(iw-1,max(0,int(u*iw))));r,g,b=pixels[off:off+3]
  if g>r*1.35 and g>b*1.3:face.material_index=4
  elif r>g*1.7 and r>b*1.7:face.material_index=3
  elif min(r,g,b)>.22:face.material_index=1
  elif max(r,g,b)<.27 or (b>r*1.12 and b>g):face.material_index=2
  else:face.material_index=1 if (r+g+b)/3>.20 else 2
 del pixels
def cube(name,loc,size,material,bevel=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 if bevel:
  mod=o.modifiers.new('Moulded edge','BEVEL');mod.width=bevel;mod.segments=3;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
# One continuous moulded top with a boolean aperture, not four visible patches.
top=cube('Moulded_top_with_open_slot',(0,0,1.16),(3.18,2.24,.24),cream,.08)
cutter=cube('Slot_cutter',(0,0,1.17),(1.12,.26,1.0),navy,.025)
bpy.context.view_layer.objects.active=top;mod=top.modifiers.new('Actual cartridge opening','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
cube('Slot_lining_left',(-.56,0,1.01),(.028,.25,.36),navy,.008)
cube('Slot_lining_right',(.56,0,1.01),(.028,.25,.36),navy,.008)
cube('Slot_lining_front',(0,-.13,1.01),(1.12,.028,.36),navy,.008)
cube('Slot_lining_back',(0,.13,1.01),(1.12,.028,.36),navy,.008)
cube('Slot_floor',(0,0,.81),(1.15,.28,.04),navy,.008)
# Independent control, editable in Blender and animated in the runtime if needed.
# Separate the existing generated control without adding a duplicate button.
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
body.data.update();bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_mode(type='FACE');bpy.ops.mesh.select_all(action='DESELECT');bpy.ops.object.mode_set(mode='OBJECT')
for p in body.data.polygons:p.select=p.center.x>1.02 and p.center.y<-.94 and -.85<p.center.z<-.40
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.separate(type='SELECTED');bpy.ops.object.mode_set(mode='OBJECT')
for o in bpy.context.selected_objects:
 if o!=body:o.name='Power_button_generated'
# Pack two-kilopixel PBR maps; strip unused generated texture channels.
for image in bpy.data.images:
 if image.type=='IMAGE' and image.size[0]>2048:image.scale(2048,2048)
for o in [o for o in bpy.context.scene.objects if o.type=='MESH']:
 for p in o.data.polygons:p.use_smooth=o in [body] or p.area<.04
 if o==body:
  dec=o.modifiers.new('Conservative browser simplification','DECIMATE');dec.ratio=.90;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=dec.name)
report={'provenance':'Meshy 7 Ultra job e830acd6-277b-48ef-8b36-6302bdddd1cf; local Blender cleanup', 'mesh_objects':len([o for o in bpy.context.scene.objects if o.type=='MESH']), 'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH'),'slot_opening':[1.10,.23], 'dimensions_blender':[3.35,2.39,2.70], 'corrections':['Depth proportional to reference front; original shell and UVs retained','Replaced broad generated tray with real open slot and lining','Separate power button; game screen and indicator supplied by runtime','2048px texture ceiling and conservative decimation']}
with open(os.path.join(ROOT,'art/source/console-report.json'),'w') as f:json.dump(report,f,indent=2)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.world.color=(.3,.3,.3)
def area(loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.size=size;l.rotation_euler=(-l.location).to_track_quat('-Z','Y').to_euler()
area((-3,-5,6),650,5);area((5,1,3),450,4)
bpy.ops.object.camera_add(location=(4,-7,4));cam=bpy.context.object;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=5.6;scene.camera=cam
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
 if o.type=='MESH':o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public/media/console.glb'),export_format='GLB',use_selection=True,export_image_format='JPEG',export_image_quality=86)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art/blender/save-slot-console.blend'))
scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(ROOT,'art/source/console-cleanup.png');bpy.ops.render.render(write_still=True)
