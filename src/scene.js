const finite = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 10000;
const color = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
export const MESH_KINDS = ['box', 'sphere', 'cylinder', 'plane', 'cone', 'torus'];
export const LIGHT_KINDS = ['pointLight', 'directionalLight'];
const ALL_KINDS = [...MESH_KINDS, ...LIGHT_KINDS];

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
  return { version: 2, name, gravity: 9.81, background: '#080808', grid: true, environment: defaultEnvironment(), objects: [] };
}

export function createObject(kind = 'box', id = crypto.randomUUID()) {
  if (!ALL_KINDS.includes(kind)) kind = 'box';
  const names = { box: 'Cube', sphere: 'Sphere', cylinder: 'Cylinder', plane: 'Plane', cone: 'Cone', torus: 'Torus', pointLight: 'Point Light', directionalLight: 'Directional Light' };
  const object = {
    id, name: names[kind], kind, active: true, tag: 'Untagged', layer: 0,
    position: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 },
    color: LIGHT_KINDS.includes(kind) ? '#ffd166' : '#00c8f5',
    material: { roughness: 0.65, metalness: 0, emissive: '#000000', emissiveIntensity: 0, wireframe: false },
    render: { castShadow: true, receiveShadow: true },
    body: { enabled: false, vy: 0, bounce: 0.3 },
    motion: { enabled: false, speed: 4 },
    scripts: []
  };
  if (LIGHT_KINDS.includes(kind)) object.light = { color: '#ffffff', intensity: kind === 'pointLight' ? 4 : 3, distance: kind === 'pointLight' ? 20 : 0, decay: 2 };
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
  for (const o of s.objects ?? []) {
    o.active ??= true;
    o.tag ??= 'Untagged';
    o.layer ??= 0;
    o.material = { roughness: 0.65, metalness: 0, emissive: '#000000', emissiveIntensity: 0, wireframe: false, ...(o.material ?? {}) };
    o.render = { castShadow: true, receiveShadow: true, ...(o.render ?? {}) };
    o.scripts ??= [];
    if (LIGHT_KINDS.includes(o.kind)) o.light = { color: '#ffffff', intensity: o.kind === 'pointLight' ? 4 : 3, distance: o.kind === 'pointLight' ? 20 : 0, decay: 2, ...(o.light ?? {}) };
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
  const ids = new Set();
  for (const o of s.objects) {
    const lightValid = !LIGHT_KINDS.includes(o.kind) || (o.light && color(o.light.color) && finite(o.light.intensity) && o.light.intensity >= 0 && o.light.intensity <= 100 &&
      finite(o.light.distance) && o.light.distance >= 0 && finite(o.light.decay) && o.light.decay >= 0 && o.light.decay <= 10);
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
      !Array.isArray(o.scripts) || o.scripts.length > 32 || o.scripts.some(s => !s || typeof s.id !== 'string' || typeof s.path !== 'string' || s.path.length > 240 ||
        !['lua','c','cpp','csharp','java'].includes(s.language) || typeof s.enabled !== 'boolean') || !lightValid) throw Error('Objek 3D tidak valid.');
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
