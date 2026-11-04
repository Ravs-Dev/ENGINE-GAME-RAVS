import { defaultTerrain, normalizeTerrain } from './terrain.js';
import { MODEL_KINDS, defaultGeometry, defaultModifiers, normalizeGeometry, normalizeModifiers, validateModeling } from './modeling.js';
const finite = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 10000;
const color = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
function rigParentsValid(rig) {
  const byId=new Map(rig.bones.map(b=>[b.id,b]));
  const visiting=new Set(),done=new Set();
  const visit=bone=>{
    if(done.has(bone.id))return true;
    if(visiting.has(bone.id))return false;
    visiting.add(bone.id);
    if(bone.parent){const parent=byId.get(bone.parent);if(!parent||!visit(parent))return false;}
    visiting.delete(bone.id);done.add(bone.id);return true;
  };
  return rig.bones.every(visit);
}
export const MESH_KINDS = [...MODEL_KINDS];
export const LIGHT_KINDS = ['pointLight', 'directionalLight'];
export const CAMERA_KINDS = ['camera'];
export const MODEL_ASSET_KINDS = ['model'];
export const TERRAIN_KINDS = ['terrain'];
export const RENDERABLE_KINDS = [...MESH_KINDS, ...MODEL_ASSET_KINDS, ...TERRAIN_KINDS];
const ALL_KINDS = [...MESH_KINDS, ...MODEL_ASSET_KINDS, ...TERRAIN_KINDS, ...LIGHT_KINDS, ...CAMERA_KINDS];

export function defaultEnvironment() {
  return {
    ambientColor: '#c9e4ff',
    ambientGroundColor: '#222222',
    ambientIntensity: 2,
    sunColor: '#ffffff',
    sunIntensity: 3,
    exposure: 1,
    fogEnabled: false,
    fogColor: '#080808',
    fogNear: 20,
    fogFar: 120
  };
}

export function createScene(name = 'Untitled Scene') {
  return { version: 2, name, gravity: 9.81, background: '#080808', grid: true, environment: defaultEnvironment(), requiredPacks: [], objects: [] };
}

export function createHumanoidRig() {
  const bone = (name,parent,position) => ({ id: crypto.randomUUID(), name, parent, position, rotation:{x:0,y:0,z:0}, scale:{x:1,y:1,z:1} });
  const bones = [];
  const root=bone('Root',null,{x:0,y:0,z:0}); bones.push(root);
  const hips=bone('Hips',root.id,{x:0,y:0.9,z:0}); bones.push(hips);
  const spine=bone('Spine',hips.id,{x:0,y:0.35,z:0}); bones.push(spine);
  const chest=bone('Chest',spine.id,{x:0,y:0.35,z:0}); bones.push(chest);
  const neck=bone('Neck',chest.id,{x:0,y:0.28,z:0}); bones.push(neck);
  const head=bone('Head',neck.id,{x:0,y:0.25,z:0}); bones.push(head);
  const lua=bone('LeftUpperArm',chest.id,{x:-0.32,y:0.22,z:0}); bones.push(lua);
  const lla=bone('LeftLowerArm',lua.id,{x:-0.38,y:0,z:0}); bones.push(lla);
  bones.push(bone('LeftHand',lla.id,{x:-0.32,y:0,z:0}));
  const rua=bone('RightUpperArm',chest.id,{x:0.32,y:0.22,z:0}); bones.push(rua);
  const rla=bone('RightLowerArm',rua.id,{x:0.38,y:0,z:0}); bones.push(rla);
  bones.push(bone('RightHand',rla.id,{x:0.32,y:0,z:0}));
  const lul=bone('LeftUpperLeg',hips.id,{x:-0.17,y:-0.42,z:0}); bones.push(lul);
  const lll=bone('LeftLowerLeg',lul.id,{x:0,y:-0.48,z:0}); bones.push(lll);
  bones.push(bone('LeftFoot',lll.id,{x:0,y:-0.42,z:0.12}));
  const rul=bone('RightUpperLeg',hips.id,{x:0.17,y:-0.42,z:0}); bones.push(rul);
  const rll=bone('RightLowerLeg',rul.id,{x:0,y:-0.48,z:0}); bones.push(rll);
  bones.push(bone('RightFoot',rll.id,{x:0,y:-0.42,z:0.12}));
  return { enabled:true, type:'humanoid', rootBone:root.id, bones };
}

export function createAnimationController() {
  return { enabled:true, autoplay:true, defaultClip:'Idle', clips:[
    { id:crypto.randomUUID(), name:'Idle', path:'Animations/Idle.anim', loop:true, speed:1 },
    { id:crypto.randomUUID(), name:'Walk', path:'Animations/Walk.anim', loop:true, speed:1 }
  ] };
}

export function createObject(kind = 'box', id = crypto.randomUUID()) {
  if (!ALL_KINDS.includes(kind)) kind = 'box';
  const names = { box: 'Cube', sphere: 'Sphere', cylinder: 'Cylinder', plane: 'Plane', cone: 'Cone', torus: 'Torus', model:'Imported Model', terrain:'Terrain', pointLight: 'Point Light', directionalLight: 'Directional Light', camera:'Camera' };
  const object = {
    id, name: names[kind], kind, active: true, tag: 'Untagged', layer: 0,
    position: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 },
    color: LIGHT_KINDS.includes(kind) ? '#ffd166' : '#00c8f5',
    material: { roughness: 0.65, metalness: 0, emissive: '#000000', emissiveIntensity: 0, wireframe: false },
    render: { castShadow: true, receiveShadow: true },
    body: { enabled: false, vy: 0, bounce: 0.3 },
    motion: { enabled: false, speed: 4 },
    scripts: [],
    rig: null,
    animation: null,
    geometry: MESH_KINDS.includes(kind) ? defaultGeometry(kind) : null,
    modifiers: MESH_KINDS.includes(kind) ? defaultModifiers() : null
  };
  if (LIGHT_KINDS.includes(kind)) object.light = { color: '#ffffff', intensity: kind === 'pointLight' ? 4 : 3, distance: kind === 'pointLight' ? 20 : 0, decay: 2 };
  if (CAMERA_KINDS.includes(kind)) object.camera = { fov:60, near:0.1, far:2000, primary:true };
  if (MODEL_ASSET_KINDS.includes(kind)) object.asset = { format:'obj', name:'model.obj', data:'' };
  if (TERRAIN_KINDS.includes(kind)) object.terrain = defaultTerrain();
  return object;
}

export function demoScene() {
  const scene = createScene('Demo 3D');
  const floor = createObject();
  Object.assign(floor, { name: 'Ground', position: { x: 0, y: -0.25, z: 0 }, scale: { x: 16, y: 0.5, z: 16 }, color: '#33475e' });
  const player = createObject();
  Object.assign(player, { name: 'Player', position: { x: -2, y: 3, z: 0 }, color: '#ffbc70', body: { enabled: true, vy: 0, bounce: 0.3 }, motion: { enabled: true, speed: 4 } });
  const ball = createObject('sphere');
  Object.assign(ball, { position: { x: 2, y: 1, z: -1 }, color: '#51d6b0', scale: { x: 2, y: 2, z: 2 }, material: { ...ball.material, roughness: 0.25, metalness: 0.15 } });
  scene.objects.push(floor, player, ball);
  return scene;
}

function applyDefaults(s) {
  s.background ??= '#080808';
  s.grid ??= true;
  s.environment = { ...defaultEnvironment(), ...(s.environment ?? {}) };
  s.requiredPacks ??= [];
  for (const o of s.objects ?? []) {
    o.active ??= true;
    o.tag ??= 'Untagged';
    o.layer ??= 0;
    o.material = { roughness: 0.65, metalness: 0, emissive: '#000000', emissiveIntensity: 0, wireframe: false, ...(o.material ?? {}) };
    o.render = { castShadow: true, receiveShadow: true, ...(o.render ?? {}) };
    o.scripts ??= [];
    o.rig ??= null;
    o.animation ??= null;
    if (MESH_KINDS.includes(o.kind)) { o.geometry = normalizeGeometry(o.kind,o.geometry ?? defaultGeometry(o.kind)); o.modifiers = normalizeModifiers(o.modifiers ?? defaultModifiers()); }
    else { o.geometry ??= null; o.modifiers ??= null; }
    if (LIGHT_KINDS.includes(o.kind)) o.light = { color: '#ffffff', intensity: o.kind === 'pointLight' ? 4 : 3, distance: o.kind === 'pointLight' ? 20 : 0, decay: 2, ...(o.light ?? {}) };
    if (CAMERA_KINDS.includes(o.kind)) o.camera = { fov:60, near:0.1, far:2000, primary:true, ...(o.camera ?? {}) };
    if (MODEL_ASSET_KINDS.includes(o.kind)) o.asset = { format:'obj', name:'model.obj', data:'', ...(o.asset ?? {}) };
    if (TERRAIN_KINDS.includes(o.kind)) o.terrain = normalizeTerrain(o.terrain ?? defaultTerrain());
  }
  return s;
}

export function parseScene(text) {
  const s = applyDefaults(JSON.parse(text));
  if (!s || s.version !== 2 || typeof s.name !== 'string' || !finite(s.gravity) || s.gravity < 0 || !Array.isArray(s.objects) || s.objects.length > 2000) throw Error('Scene harus berformat RAVS 3D versi 2. Scene 2D tidak didukung.');
  const e = s.environment;
  if (!color(s.background) || typeof s.grid !== 'boolean' || !e || !color(e.ambientColor) || !color(e.ambientGroundColor) || !color(e.sunColor) ||
      !finite(e.ambientIntensity) || e.ambientIntensity < 0 || e.ambientIntensity > 100 ||
      !finite(e.sunIntensity) || e.sunIntensity < 0 || e.sunIntensity > 100 ||
      !finite(e.exposure) || e.exposure < 0.1 || e.exposure > 5 ||
      typeof e.fogEnabled !== 'boolean' || !color(e.fogColor) || !finite(e.fogNear) || !finite(e.fogFar) || e.fogNear < 0 || e.fogFar <= e.fogNear) {
    throw Error('Pengaturan scene tidak valid.');
  }
  if (!Array.isArray(s.requiredPacks) || s.requiredPacks.some(p => typeof p !== 'string' || p.length > 80)) throw Error('Daftar feature pack scene tidak valid.');
  const ids = new Set();
  for (const o of s.objects) {
    const lightValid = !LIGHT_KINDS.includes(o.kind) || (o.light && color(o.light.color) && finite(o.light.intensity) && o.light.intensity >= 0 && o.light.intensity <= 100 &&
      finite(o.light.distance) && o.light.distance >= 0 && finite(o.light.decay) && o.light.decay >= 0 && o.light.decay <= 10);
    const terrainValid = !TERRAIN_KINDS.includes(o.kind) || JSON.stringify(normalizeTerrain(o.terrain))===JSON.stringify(o.terrain);
    const assetValid = !MODEL_ASSET_KINDS.includes(o.kind) || (o.asset && o.asset.format==='obj' && typeof o.asset.name==='string' && o.asset.name.length<=160 && typeof o.asset.data==='string' && o.asset.data.length<=4000000);
    const cameraValid = !CAMERA_KINDS.includes(o.kind) || (o.camera && finite(o.camera.fov) && o.camera.fov >= 10 && o.camera.fov <= 170 &&
      finite(o.camera.near) && o.camera.near >= 0.01 && finite(o.camera.far) && o.camera.far > o.camera.near && o.camera.far <= 10000 && typeof o.camera.primary === 'boolean');
    const rigValid = o.rig === null || (MESH_KINDS.includes(o.kind) && o.rig && typeof o.rig.enabled === 'boolean' && ['generic','humanoid'].includes(o.rig.type) &&
      typeof o.rig.rootBone === 'string' && Array.isArray(o.rig.bones) && o.rig.bones.length > 0 && o.rig.bones.length <= 256 &&
      new Set(o.rig.bones.map(b=>b.id)).size === o.rig.bones.length &&
      o.rig.bones.every(b => b && typeof b.id === 'string' && typeof b.name === 'string' && b.name.length <= 80 &&
        (b.parent === null || typeof b.parent === 'string') &&
        ['position','rotation','scale'].every(k => b[k] && ['x','y','z'].every(a => finite(b[k][a]))) &&
        ['x','y','z'].every(a => b.scale[a] > 0)) &&
      o.rig.bones.some(b=>b.id===o.rig.rootBone) && rigParentsValid(o.rig));
    const animationValid = o.animation === null || (MESH_KINDS.includes(o.kind) && o.animation && typeof o.animation.enabled === 'boolean' &&
      typeof o.animation.autoplay === 'boolean' && typeof o.animation.defaultClip === 'string' && o.animation.defaultClip.length <= 120 &&
      Array.isArray(o.animation.clips) && o.animation.clips.length <= 128 && new Set(o.animation.clips.map(clip=>clip?.id)).size === o.animation.clips.length &&
      o.animation.clips.every(clip => clip && typeof clip.id === 'string' && typeof clip.name === 'string' && clip.name.length <= 120 &&
        typeof clip.path === 'string' && clip.path.length <= 240 && typeof clip.loop === 'boolean' && finite(clip.speed) && clip.speed >= 0 && clip.speed <= 20));
    if (!o || typeof o.id !== 'string' || ids.has(o.id) || typeof o.name !== 'string' || !ALL_KINDS.includes(o.kind) ||
      typeof o.active !== 'boolean' || typeof o.tag !== 'string' || o.tag.length > 64 || !Number.isInteger(o.layer) || o.layer < 0 || o.layer > 31 ||
      !['position', 'rotation', 'scale'].every(k => o[k] && ['x', 'y', 'z'].every(a => finite(o[k][a]))) ||
      !['x', 'y', 'z'].every(a => o.scale[a] > 0) || !color(o.color) ||
      !o.material || !finite(o.material.roughness) || o.material.roughness < 0 || o.material.roughness > 1 ||
      !finite(o.material.metalness) || o.material.metalness < 0 || o.material.metalness > 1 || !color(o.material.emissive) ||
      !finite(o.material.emissiveIntensity) || o.material.emissiveIntensity < 0 || o.material.emissiveIntensity > 10 || typeof o.material.wireframe !== 'boolean' ||
      !o.render || typeof o.render.castShadow !== 'boolean' || typeof o.render.receiveShadow !== 'boolean' ||
      typeof o.body?.enabled !== 'boolean' || !finite(o.body.vy) || !finite(o.body.bounce) || o.body.bounce < 0 || o.body.bounce > 1 ||
      typeof o.motion?.enabled !== 'boolean' || !finite(o.motion.speed) || o.motion.speed < 0 ||
      !validateModeling(o.kind,o.geometry,o.modifiers) ||
      !Array.isArray(o.scripts) || o.scripts.length > 32 || o.scripts.some(s => !s || typeof s.id !== 'string' || typeof s.path !== 'string' || s.path.length > 240 ||
        !['lua','c','cpp','csharp','java'].includes(s.language) || typeof s.enabled !== 'boolean') || !lightValid || !terrainValid || !assetValid || !cameraValid || !rigValid || !animationValid) throw Error('Objek 3D tidak valid.');
    ids.add(o.id);
  }
  return s;
}

export function step(scene, dt, keys = new Set()) {
  dt = Math.min(Math.max(dt, 0), 1 / 30);
  for (const o of scene.objects) {
    if (!o.active) continue;
    if (o.motion.enabled) {
      let x = Number(keys.has('d') || keys.has('ArrowRight')) - Number(keys.has('a') || keys.has('ArrowLeft'));
      let z = Number(keys.has('s') || keys.has('ArrowDown')) - Number(keys.has('w') || keys.has('ArrowUp'));
      const length = Math.hypot(x, z) || 1;
      o.position.x += x / length * o.motion.speed * dt;
      o.position.z += z / length * o.motion.speed * dt;
    }
    if (!o.body.enabled || !MESH_KINDS.includes(o.kind)) continue;
    const bottom = o.position.y - o.scale.y / 2;
    o.body.vy -= scene.gravity * dt;
    o.position.y += o.body.vy * dt;
    for (const floor of scene.objects) {
      if (floor === o || !floor.active || floor.body.enabled || !MESH_KINDS.includes(floor.kind)) continue;
      const top = floor.position.y + floor.scale.y / 2;
      if (o.body.vy <= 0 && bottom >= top - 0.001 && o.position.y - o.scale.y / 2 <= top &&
        Math.abs(o.position.x - floor.position.x) < (o.scale.x + floor.scale.x) / 2 &&
        Math.abs(o.position.z - floor.position.z) < (o.scale.z + floor.scale.z) / 2) {
        o.position.y = top + o.scale.y / 2;
        o.body.vy = -o.body.vy * o.body.bounce;
        if (Math.abs(o.body.vy) < 0.1) o.body.vy = 0;
      }
    }
    if (o.position.y < -100) { o.position.y = 8; o.body.vy = 0; }
  }
}
