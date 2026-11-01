const finite = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 10000;
export function createObject(kind = 'box', id = crypto.randomUUID()) {
  return { id, name: kind === 'sphere' ? 'Sphere' : kind === 'cylinder' ? 'Cylinder' : 'Cube', kind,
    position: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 }, color: '#8c79ff',
    body: { enabled: false, vy: 0, bounce: 0.3 }, motion: { enabled: false, speed: 4 } };
}
export function demoScene() {
  const floor = createObject();
  Object.assign(floor, { name: 'Ground', position: { x: 0, y: -0.25, z: 0 }, scale: { x: 16, y: 0.5, z: 16 }, color: '#33475e' });
  const player = createObject();
  Object.assign(player, { name: 'Player', position: { x: -2, y: 3, z: 0 }, color: '#ffbc70', body: { enabled: true, vy: 0, bounce: 0.3 }, motion: { enabled: true, speed: 4 } });
  const ball = createObject('sphere');
  Object.assign(ball, { position: { x: 2, y: 1, z: -1 }, color: '#51d6b0', scale: { x: 2, y: 2, z: 2 } });
  return { version: 2, name: 'Demo 3D', gravity: 9.81, background: '#151c2a', grid: true, objects: [floor, player, ball] };
}
export function parseScene(text) {
  const s = JSON.parse(text);
  if (!s || s.version !== 2 || typeof s.name !== 'string' || !finite(s.gravity) || s.gravity < 0 || !Array.isArray(s.objects) || s.objects.length > 2000) throw Error('Scene harus berformat RAVS 3D versi 2. Scene 2D tidak didukung.');
  s.background ??= '#151c2a';
  s.grid ??= true;
  if (!/^#[0-9a-f]{6}$/i.test(s.background) || typeof s.grid !== 'boolean') throw Error('Pengaturan scene tidak valid.');
  const ids = new Set();
  for (const o of s.objects) {
    if (!o || typeof o.id !== 'string' || ids.has(o.id) || typeof o.name !== 'string' || !['box', 'sphere', 'cylinder'].includes(o.kind) ||
      !['position', 'rotation', 'scale'].every(k => o[k] && ['x', 'y', 'z'].every(a => finite(o[k][a]))) ||
      !['x', 'y', 'z'].every(a => o.scale[a] > 0) || !/^#[0-9a-f]{6}$/i.test(o.color) ||
      typeof o.body?.enabled !== 'boolean' || !finite(o.body.vy) || !finite(o.body.bounce) || o.body.bounce < 0 || o.body.bounce > 1 ||
      typeof o.motion?.enabled !== 'boolean' || !finite(o.motion.speed) || o.motion.speed < 0) throw Error('Objek 3D tidak valid.');
    ids.add(o.id);
  }
  return s;
}
export function step(scene, dt, keys = new Set()) {
  dt = Math.min(Math.max(dt, 0), 1 / 30);
  for (const o of scene.objects) {
    if (o.motion.enabled) {
      let x = Number(keys.has('d') || keys.has('ArrowRight')) - Number(keys.has('a') || keys.has('ArrowLeft'));
      let z = Number(keys.has('s') || keys.has('ArrowDown')) - Number(keys.has('w') || keys.has('ArrowUp'));
      const length = Math.hypot(x, z) || 1;
      o.position.x += x / length * o.motion.speed * dt;
      o.position.z += z / length * o.motion.speed * dt;
    }
    if (!o.body.enabled) continue;
    const bottom = o.position.y - o.scale.y / 2;
    o.body.vy -= scene.gravity * dt;
    o.position.y += o.body.vy * dt;
    for (const floor of scene.objects) {
      if (floor === o || floor.body.enabled) continue;
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
