import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
export function createViewport(canvas, onSelect, onTransform, onTransformEnd) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  const world = new THREE.Scene();
  world.background = new THREE.Color('#151c2a');
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
  camera.position.set(12, 10, 14);
  const orbit = new OrbitControls(camera, canvas);
  orbit.target.set(0, 1, 0); orbit.update();
  world.add(new THREE.HemisphereLight(0xc9e4ff, 0x3b3545, 2));
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.position.set(5, 12, 7); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 });
  sun.shadow.mapSize.set(1024, 1024); world.add(sun);
  const grid = new THREE.GridHelper(40, 40, 0x657590, 0x303d52); grid.position.y = 0.01; world.add(grid);
  world.add(new THREE.AxesHelper(2));
  const group = new THREE.Group(); world.add(group);
  const gizmo = new TransformControls(camera, canvas); world.add(gizmo.getHelper());
  gizmo.addEventListener('dragging-changed', e => { orbit.enabled = !e.value; if (!e.value) onTransformEnd?.(); });
  gizmo.addEventListener('objectChange', () => {
    const m = gizmo.object;
    if (m) onTransform(m.userData.id, m);
  });
  const outline = new THREE.BoxHelper(undefined, 0xcbb6ff); outline.visible = false; world.add(outline);
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2(); let down;
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, axis: gizmo.axis }; });
  canvas.addEventListener('pointerup', e => {
    if (!down || down.axis || gizmo.axis || e.button !== 0 || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
    ray.setFromCamera(pointer, camera);
    onSelect(ray.intersectObjects(group.children)[0]?.object.userData.id ?? null);
  });
  const meshes = new Map();
  function sync(scene, selected, playing) {
    world.background.set(scene.background ?? '#151c2a');
    grid.visible = scene.grid ?? true;
    for (const [id, m] of meshes) if (!scene.objects.some(o => o.id === id)) {
      if (gizmo.object === m) gizmo.detach(); group.remove(m); m.geometry.dispose(); m.material.dispose(); meshes.delete(id);
    }
    for (const o of scene.objects) {
      let m = meshes.get(o.id);
      if (!m) {
        m = new THREE.Mesh(o.kind === 'sphere' ? new THREE.SphereGeometry(0.5, 32, 20) : o.kind === 'cylinder' ? new THREE.CylinderGeometry(0.5, 0.5, 1, 32) : new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ roughness: 0.65 }));
        m.userData.id = o.id; m.userData.kind = o.kind; m.castShadow = m.receiveShadow = true; meshes.set(o.id, m); group.add(m);
      }
      if (m.userData.kind !== o.kind) {
        m.geometry.dispose();
        m.geometry = o.kind === 'sphere' ? new THREE.SphereGeometry(0.5, 32, 20) : o.kind === 'cylinder' ? new THREE.CylinderGeometry(0.5, 0.5, 1, 32) : new THREE.BoxGeometry();
        m.userData.kind = o.kind;
      }
      m.position.set(o.position.x, o.position.y, o.position.z);
      m.rotation.set(...['x', 'y', 'z'].map(a => THREE.MathUtils.degToRad(o.rotation[a])));
      m.scale.set(o.scale.x, o.scale.y, o.scale.z); m.material.color.set(o.color);
    }
    const m = meshes.get(selected);
    if (m && !playing) { if (gizmo.object !== m) gizmo.attach(m); outline.setFromObject(m); outline.visible = true; }
    else { gizmo.detach(); outline.visible = false; }
  }
  return { sync, setSnap: enabled => { gizmo.setTranslationSnap(enabled ? 0.5 : null); gizmo.setRotationSnap(enabled ? Math.PI / 12 : null); gizmo.setScaleSnap(enabled ? 0.25 : null); }, setMode: mode => gizmo.setMode(mode), focus(id) {
    const m = meshes.get(id); if (!m) return;
    orbit.target.copy(m.position); camera.position.copy(m.position).add(new THREE.Vector3(5, 4, 6)); orbit.update();
  }, render() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    orbit.update(); renderer.render(world, camera);
  } };
}
