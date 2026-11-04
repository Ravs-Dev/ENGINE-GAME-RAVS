import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { MESH_KINDS, LIGHT_KINDS } from './scene.js';

const geometryFor = kind =>
  kind === 'sphere' ? new THREE.SphereGeometry(0.5,32,20) :
  kind === 'cylinder' ? new THREE.CylinderGeometry(0.5,0.5,1,32) :
  kind === 'plane' ? new THREE.PlaneGeometry(1,1) :
  kind === 'cone' ? new THREE.ConeGeometry(0.5,1,32) :
  kind === 'torus' ? new THREE.TorusGeometry(0.5,0.18,16,48) :
  new THREE.BoxGeometry();

function updateRigHelper(node, rig) {
  const signature = rig ? JSON.stringify(rig) : '';
  if (node.userData.rigSignature === signature) return;
  if (node.userData.rigHelper) {
    node.remove(node.userData.rigHelper);
    node.userData.rigHelper.traverse?.(child => { child.geometry?.dispose?.(); child.material?.dispose?.(); });
    node.userData.rigHelper = null;
  }
  node.userData.rigSignature = signature;
  if (!rig?.enabled || !Array.isArray(rig.bones) || !rig.bones.length) return;
  const byId = new Map(rig.bones.map(b => [b.id, b]));
  const absolute = new Map();
  const resolve = bone => {
    if (absolute.has(bone.id)) return absolute.get(bone.id);
    const local = new THREE.Vector3(bone.position.x, bone.position.y, bone.position.z);
    const parent = bone.parent ? byId.get(bone.parent) : null;
    const value = parent ? resolve(parent).clone().add(local) : local;
    absolute.set(bone.id, value);
    return value;
  };
  const linePoints = [], jointPoints = [];
  for (const bone of rig.bones) {
    const p = resolve(bone); jointPoints.push(p);
    if (bone.parent && byId.has(bone.parent)) linePoints.push(resolve(byId.get(bone.parent)), p);
  }
  const helper = new THREE.Group();
  if (linePoints.length) {
    const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color:0x38bdf8, depthTest:false, transparent:true, opacity:.9 }));
    lines.renderOrder = 999; helper.add(lines);
  }
  if (jointPoints.length) {
    const geometry = new THREE.BufferGeometry().setFromPoints(jointPoints);
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color:0xffffff, size:.07, sizeAttenuation:true, depthTest:false }));
    points.renderOrder = 1000; helper.add(points);
  }
  helper.name = 'RAVS Armature Preview'; node.add(helper); node.userData.rigHelper = helper;
}

export function createViewport(canvas, onSelect, onTransform, onTransformEnd) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.shadowMap.enabled=true; renderer.outputColorSpace=THREE.SRGBColorSpace;
  const world=new THREE.Scene(); world.background=new THREE.Color('#080808');
  const camera=new THREE.PerspectiveCamera(50,1,0.1,2000); camera.position.set(12,10,14);
  const orbit=new OrbitControls(camera,canvas); orbit.target.set(0,1,0); orbit.update();
  const ambient=new THREE.HemisphereLight(0xc9e4ff,0x222222,2); world.add(ambient);
  const sun=new THREE.DirectionalLight(0xffffff,3); sun.position.set(5,12,7); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); world.add(sun);
  const grid=new THREE.GridHelper(40,40,0x657590,0x303d52); grid.position.y=.01; world.add(grid); world.add(new THREE.AxesHelper(2));
  const group=new THREE.Group(); world.add(group);
  const gizmo=new TransformControls(camera,canvas); world.add(gizmo.getHelper());
  gizmo.addEventListener('dragging-changed',e=>{orbit.enabled=!e.value;if(!e.value)onTransformEnd?.();});
  gizmo.addEventListener('objectChange',()=>{const m=gizmo.object;if(m)onTransform(m.userData.id,m);});
  const outline=new THREE.BoxHelper(undefined,0x00c8f5); outline.visible=false; world.add(outline);
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(); let down;
  canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,axis:gizmo.axis};});
  canvas.addEventListener('pointerup',e=>{if(!down||down.axis||gizmo.axis||e.button!==0||Math.hypot(e.clientX-down.x,e.clientY-down.y)>4)return;const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(group.children,true).find(h=>h.object.userData.id);onSelect(hit?.object.userData.id??null);});
  const nodes=new Map(); let wireframe=false,shadows=true,shading='lit';

  function createNode(o){
    let node;
    if(MESH_KINDS.includes(o.kind)){
      const lit=new THREE.MeshStandardMaterial({side:THREE.DoubleSide});
      const unlit=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
      node=new THREE.Mesh(geometryFor(o.kind),lit); node.userData.litMaterial=lit; node.userData.unlitMaterial=unlit;
    } else if(o.kind==='pointLight'){
      node=new THREE.PointLight(o.light.color,o.light.intensity,o.light.distance,o.light.decay); node.add(new THREE.PointLightHelper(node,.3));
    } else {
      node=new THREE.DirectionalLight(o.light.color,o.light.intensity); node.add(new THREE.DirectionalLightHelper(node,.7));
    }
    node.userData.id=o.id;node.userData.kind=o.kind;nodes.set(o.id,node);group.add(node);return node;
  }
  function dispose(node){
    if(node.geometry)node.geometry.dispose();
    node.userData.rigHelper?.traverse?.(child=>{child.geometry?.dispose?.();child.material?.dispose?.();});
    node.userData.litMaterial?.dispose(); node.userData.unlitMaterial?.dispose();
    if(node.material&&!node.userData.litMaterial)node.material.dispose?.();
    group.remove(node);
  }
  function sync(scene,selected,playing){
    const env=scene.environment;world.background.set(scene.background);grid.visible=scene.grid;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=env.exposure;
    ambient.color.set(env.ambientColor);ambient.groundColor.set(env.ambientGroundColor);ambient.intensity=env.ambientIntensity;
    sun.color.set(env.sunColor);sun.intensity=env.sunIntensity;world.fog=env.fogEnabled?new THREE.Fog(env.fogColor,env.fogNear,env.fogFar):null;
    for(const [id,n] of nodes)if(!scene.objects.some(o=>o.id===id)){if(gizmo.object===n)gizmo.detach();dispose(n);nodes.delete(id);}
    for(const o of scene.objects){
      let n=nodes.get(o.id);if(!n||n.userData.kind!==o.kind){if(n){dispose(n);nodes.delete(o.id);}n=createNode(o);}
      n.visible=o.active;n.position.set(o.position.x,o.position.y,o.position.z);n.rotation.set(...['x','y','z'].map(a=>THREE.MathUtils.degToRad(o.rotation[a])));n.scale.set(o.scale.x,o.scale.y,o.scale.z);
      if(MESH_KINDS.includes(o.kind)){
        const lit=n.userData.litMaterial,unlit=n.userData.unlitMaterial;
        lit.color.set(o.color);lit.roughness=o.material.roughness;lit.metalness=o.material.metalness;lit.emissive.set(o.material.emissive);lit.emissiveIntensity=o.material.emissiveIntensity;
        unlit.color.set(o.color);
        const wf=wireframe||shading==='wireframe'||o.material.wireframe;lit.wireframe=wf;unlit.wireframe=wf;n.material=shading==='unlit'?unlit:lit;
        n.castShadow=shadows&&o.render.castShadow;n.receiveShadow=shadows&&o.render.receiveShadow;updateRigHelper(n,o.rig);
      }
      if(LIGHT_KINDS.includes(o.kind)){n.color.set(o.light.color);n.intensity=o.light.intensity;n.castShadow=shadows&&o.render.castShadow;if(o.kind==='pointLight'){n.distance=o.light.distance;n.decay=o.light.decay;}}
    }
    const n=nodes.get(selected);if(n&&n.visible&&!playing){if(gizmo.object!==n)gizmo.attach(n);outline.setFromObject(n);outline.visible=true;}else{gizmo.detach();outline.visible=false;}
  }
  function frameAll(){const visible=[...nodes.values()].filter(n=>n.visible);if(!visible.length)return;const b=new THREE.Box3();visible.forEach(n=>b.expandByObject(n));const c=b.getCenter(new THREE.Vector3()),r=Math.max(2,b.getSize(new THREE.Vector3()).length()*.7),d=camera.position.clone().sub(orbit.target).normalize();orbit.target.copy(c);camera.position.copy(c).addScaledVector(d,r*2);camera.updateProjectionMatrix();orbit.update();}
  function setView(view){if(view==='perspective'){camera.up.set(0,1,0);camera.position.copy(orbit.target).add(new THREE.Vector3(12,10,14));orbit.update();return;}const ds={front:[0,0,1],back:[0,0,-1],left:[-1,0,0],right:[1,0,0],top:[0,1,0],bottom:[0,-1,0]},d=ds[view];if(!d)return;const dist=Math.max(5,camera.position.distanceTo(orbit.target));camera.up.set(0,view==='top'||view==='bottom'?0:1,view==='top'?-1:view==='bottom'?1:0);camera.position.copy(orbit.target).addScaledVector(new THREE.Vector3(...d),dist);orbit.update();}
  return {
    sync,frameAll,setView,
    setShading:v=>{if(['lit','unlit','wireframe'].includes(v))shading=v;},
    setSpace:v=>gizmo.setSpace(v==='local'?'local':'world'),
    setCameraSpeed:v=>{const s=Math.max(.25,Math.min(4,Number(v)||1));orbit.rotateSpeed=.6*s;orbit.panSpeed=.8*s;orbit.zoomSpeed=s;},
    setWireframe:v=>wireframe=!!v,
    setShadows:v=>{shadows=!!v;renderer.shadowMap.enabled=shadows;},
    setSnap:v=>{gizmo.setTranslationSnap(v?.5:null);gizmo.setRotationSnap(v?Math.PI/12:null);gizmo.setScaleSnap(v?.25:null);},
    setMode:m=>gizmo.setMode(m),
    focus(id){const n=nodes.get(id);if(!n)return;orbit.target.copy(n.position);camera.position.copy(n.position).add(new THREE.Vector3(5,4,6));orbit.update();},
    stats(){return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,lines:renderer.info.render.lines};},
    render(){const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);if(canvas.width!==Math.floor(w*renderer.getPixelRatio())||canvas.height!==Math.floor(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}orbit.update();renderer.render(world,camera);}
  };
}
