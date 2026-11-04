import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { step, MESH_KINDS, LIGHT_KINDS, parseScene } from './scene.js';
import { normalizeGeometry, normalizeModifiers } from './modeling.js';
const payload=JSON.parse(document.getElementById('ravs-data').textContent),scene=parseScene(JSON.stringify(payload.scene)),splash=payload.splash;
const start=performance.now(),ravsSplash=document.getElementById('ravs-splash');
function applyModifiers(geometry,raw){
 const m=normalizeModifiers(raw),position=geometry.getAttribute('position');if(!position)return geometry;
 geometry.computeBoundingBox();const box=geometry.boundingBox,min=box.min,max=box.max,axisIndex={x:0,y:1,z:2};
 for(let i=0;i<position.count;i++){
  const p=[position.getX(i),position.getY(i),position.getZ(i)];
  if(m.twist.enabled&&Math.abs(m.twist.angle)>.0001){const ai=axisIndex[m.twist.axis],range=Math.max(.0001,max.getComponent(ai)-min.getComponent(ai)),t=(p[ai]-min.getComponent(ai))/range-.5,a=(ai+1)%3,b=(ai+2)%3,angle=THREE.MathUtils.degToRad(m.twist.angle)*t,ca=Math.cos(angle),sa=Math.sin(angle),pa=p[a],pb=p[b];p[a]=pa*ca-pb*sa;p[b]=pa*sa+pb*ca;}
  if(m.taper.enabled&&Math.abs(m.taper.amount)>.0001){const ai=axisIndex[m.taper.axis],range=Math.max(.0001,max.getComponent(ai)-min.getComponent(ai)),t=(p[ai]-min.getComponent(ai))/range,scale=Math.max(.02,1+m.taper.amount*(t-.5)),a=(ai+1)%3,b=(ai+2)%3;p[a]*=scale;p[b]*=scale;}
  position.setXYZ(i,p[0],p[1],p[2]);
 }
 position.needsUpdate=true;geometry.computeVertexNormals();return geometry;
}
const geometryFor=o=>{const g=normalizeGeometry(o.kind,o.geometry);const geometry=o.kind==='sphere'?new THREE.SphereGeometry(g.radius,g.widthSegments,g.heightSegments):o.kind==='cylinder'?new THREE.CylinderGeometry(g.radiusTop,g.radiusBottom,g.height,g.radialSegments,g.heightSegments):o.kind==='plane'?new THREE.PlaneGeometry(g.width,g.height,g.widthSegments,g.heightSegments):o.kind==='cone'?new THREE.ConeGeometry(g.radius,g.height,g.radialSegments,g.heightSegments):o.kind==='torus'?new THREE.TorusGeometry(g.radius,g.tube,g.radialSegments,g.tubularSegments):new THREE.BoxGeometry(g.width,g.height,g.depth,g.widthSegments,g.heightSegments,g.depthSegments);return applyModifiers(geometry,o.modifiers);};
try{
 const canvas=document.getElementById('game'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=scene.environment.exposure;
 const world=new THREE.Scene();world.background=new THREE.Color(scene.background);world.fog=scene.environment.fogEnabled?new THREE.Fog(scene.environment.fogColor,scene.environment.fogNear,scene.environment.fogFar):null;
 const camera=new THREE.PerspectiveCamera(50,1,.1,2000);camera.position.set(12,10,14);const orbit=new OrbitControls(camera,canvas);orbit.target.set(0,1,0);orbit.update();
 world.add(new THREE.HemisphereLight(scene.environment.ambientColor,scene.environment.ambientGroundColor,scene.environment.ambientIntensity));
 const sun=new THREE.DirectionalLight(scene.environment.sunColor,scene.environment.sunIntensity);sun.position.set(5,12,7);sun.castShadow=true;world.add(sun);
 const nodes=scene.objects.map(o=>{let n;if(MESH_KINDS.includes(o.kind)){n=new THREE.Mesh(geometryFor(o),new THREE.MeshStandardMaterial({color:o.color,roughness:o.material.roughness,metalness:o.material.metalness,emissive:o.material.emissive,emissiveIntensity:o.material.emissiveIntensity,wireframe:o.material.wireframe,side:THREE.DoubleSide}));n.castShadow=o.render.castShadow;n.receiveShadow=o.render.receiveShadow;}else if(o.kind==='pointLight'){n=new THREE.PointLight(o.light.color,o.light.intensity,o.light.distance,o.light.decay);}else{n=new THREE.DirectionalLight(o.light.color,o.light.intensity);}n.visible=o.active;world.add(n);return n;});
 const keys=new Set();addEventListener('keydown',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)){e.preventDefault();keys.add(k);}});addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));addEventListener('blur',()=>keys.clear());
 let last=performance.now();function frame(time){const ready=time-start>=splash.duration*1000;if(!ready)ravsSplash.querySelector('progress').value=(time-start)/(splash.duration*1000);else{ravsSplash.hidden=true;ravsSplash.style.display='none';step(scene,(time-last)/1000,keys);}last=time;scene.objects.forEach((o,i)=>{const n=nodes[i];n.visible=o.active;n.position.set(o.position.x,o.position.y,o.position.z);n.rotation.set(...['x','y','z'].map(a=>THREE.MathUtils.degToRad(o.rotation[a])));n.scale.set(o.scale.x,o.scale.y,o.scale.z);});const w=innerWidth,h=innerHeight;if(canvas.width!==Math.floor(w*renderer.getPixelRatio())||canvas.height!==Math.floor(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}orbit.update();renderer.render(world,camera);requestAnimationFrame(frame);}requestAnimationFrame(frame);
}catch(error){ravsSplash.style.display='none';document.getElementById('error').textContent='Game membutuhkan WebGL 2: '+error.message;}
