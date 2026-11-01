import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { step } from './scene.js';
const { scene, splash } = JSON.parse(document.getElementById('ravs-data').textContent);
const start = performance.now(), loading = document.getElementById('loading');
try {
  const canvas = document.getElementById('game'), renderer = new THREE.WebGLRenderer({canvas,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.shadowMap.enabled = true;
  const world = new THREE.Scene(); world.background = new THREE.Color(scene.background ?? '#000000');
  const camera = new THREE.PerspectiveCamera(50,1,0.1,500); camera.position.set(12,10,14);
  const orbit = new OrbitControls(camera,canvas); orbit.target.set(0,1,0); orbit.update();
  world.add(new THREE.HemisphereLight(0xdcefff,0x333333,2));
  const sun = new THREE.DirectionalLight(0xffffff,3); sun.position.set(5,12,7); sun.castShadow = true; world.add(sun);
  const meshes = scene.objects.map(o => {
    const geometry = o.kind === 'sphere' ? new THREE.SphereGeometry(0.5,32,20) : o.kind === 'cylinder' ? new THREE.CylinderGeometry(0.5,0.5,1,32) : new THREE.BoxGeometry();
    const mesh = new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:o.color,roughness:0.65})); mesh.castShadow=mesh.receiveShadow=true;world.add(mesh);return mesh;
  });
  const keys = new Set();
  addEventListener('keydown',e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)){e.preventDefault();keys.add(key);}});
  addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key)); addEventListener('blur',()=>keys.clear());
  let last=performance.now();
  function frame(time) {
    const ready=time-start>=splash.duration*1000;
    if(!ready) loading.querySelector('progress').value=(time-start)/(splash.duration*1000);
    else { loading.hidden=true;loading.style.display='none';step(scene,(time-last)/1000,keys); }
    last=time;
    scene.objects.forEach((o,i)=>{const m=meshes[i];m.position.set(o.position.x,o.position.y,o.position.z);m.rotation.set(...['x','y','z'].map(a=>THREE.MathUtils.degToRad(o.rotation[a])));m.scale.set(o.scale.x,o.scale.y,o.scale.z);});
    const w=innerWidth,h=innerHeight;if(canvas.width!==Math.floor(w*renderer.getPixelRatio())||canvas.height!==Math.floor(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    orbit.update();renderer.render(world,camera);requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
} catch(error) { loading.style.display='none';document.getElementById('error').textContent='Game membutuhkan WebGL 2: '+error.message; }
