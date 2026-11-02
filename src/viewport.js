import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
export function createViewport(canvas, onSelect, onTransform, onTransformEnd) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  const world = new THREE.Scene();
  world.background = new THREE.Color('#080808');
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
  camera.position.set(12, 10, 14);
  const orbit = new OrbitControls(camera, canvas);
  orbit.target.set(0, 1, 0); orbit.update();
  world.add(new THREE.HemisphereLight(0xc9e4ff, 0x222222, 2));
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
  const outline = new THREE.BoxHelper(undefined, 0x00c8f5); outline.visible = false; world.add(outline);
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2(); let down;
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, axis: gizmo.axis }; });
  canvas.addEventListener('pointerup', e => {
    if (!down || down.axis || gizmo.axis || e.button !== 0 || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
    ray.setFromCamera(pointer, camera);
    onSelect(ray.intersectObjects(group.children)[0]?.object.userData.id ?? null);
  });
  const meshes = new Map(); let wireframe = false; let shadows = true;
  function sync(scene, selected, playing) {
    world.background.set(scene.background ?? '#080808');
    grid.visible = scene.grid ?? true;
    for (const [id, m] of meshes) if (!scene.objects.some(o => o.id === id)) {
      if (gizmo.object === m) gizmo.detach(); group.remove(m); m.geometry.dispose(); m.material.dispose(); meshes.delete(id);
    }
    for (const o of scene.objects) {
      let m = meshes.get(o.id);
      if (!m) {
        m = new THREE.Mesh(
          o.kind === 'sphere' ? new THREE.SphereGeometry(0.5, 32, 20) :
          o.kind === 'cylinder' ? new THREE.CylinderGeometry(0.5, 0.5, 1, 32) :
          o.kind === 'plane' ? new THREE.PlaneGeometry(1, 1) :
          o.kind === 'cone' ? new THREE.ConeGeometry(0.5, 1, 32) :
          new THREE.BoxGeometry(),
          new THREE.MeshStandardMaterial({ roughness: 0.65, side: THREE.DoubleSide })
        );
        m.userData.id = o.id; m.userData.kind = o.kind; m.castShadow = m.receiveShadow = true; meshes.set(o.id, m); group.add(m);
      }
      if (m.userData.kind !== o.kind) {
        m.geometry.dispose();
        m.geometry =
          o.kind === 'sphere' ? new THREE.SphereGeometry(0.5, 32, 20) :
          o.kind === 'cylinder' ? new THREE.CylinderGeometry(0.5, 0.5, 1, 32) :
          o.kind === 'plane' ? new THREE.PlaneGeometry(1, 1) :
          o.kind === 'cone' ? new THREE.ConeGeometry(0.5, 1, 32) :
          new THREE.BoxGeometry();
        m.userData.kind = o.kind;
      }
      m.position.set(o.position.x, o.position.y, o.position.z);
      m.rotation.set(...['x', 'y', 'z'].map(a => THREE.MathUtils.degToRad(o.rotation[a])));
      m.scale.set(o.scale.x, o.scale.y, o.scale.z); m.material.color.set(o.color); m.material.wireframe = wireframe;
    }
    const m = meshes.get(selected);
    if (m && !playing) { if (gizmo.object !== m) gizmo.attach(m); outline.setFromObject(m); outline.visible = true; }
    else { gizmo.detach(); outline.visible = false; }
  }
  function frameAll() {
    if (!group.children.length) { orbit.target.set(0, 0, 0); camera.position.set(12, 10, 14); orbit.update(); return; }
    const bounds = new THREE.Box3().setFromObject(group);
    const center = bounds.getCenter(new THREE.Vector3());
    const radius = Math.max(2, bounds.getSize(new THREE.Vector3()).length() * 0.7);
    const direction = camera.position.clone().sub(orbit.target).normalize();
    orbit.target.copy(center);
    camera.position.copy(center).addScaledVector(direction, radius * 2);
    camera.near = Math.max(0.01, radius / 1000);
    camera.far = Math.max(500, radius * 20);
    camera.updateProjectionMatrix();
    orbit.update();
  }
  function setView(view) {
    if (view === 'perspective') { camera.up.set(0, 1, 0); camera.position.copy(orbit.target).add(new THREE.Vector3(12, 10, 14)); orbit.update(); return; }
    const directions = { front:[0,0,1],back:[0,0,-1],left:[-1,0,0],right:[1,0,0],top:[0,1,0],bottom:[0,-1,0] };
    const d = directions[view];
    if (!d) return;
    const distance = Math.max(5, camera.position.distanceTo(orbit.target));
    camera.up.set(0, view === 'top' || view === 'bottom' ? 0 : 1, view === 'top' ? -1 : view === 'bottom' ? 1 : 0);
    camera.position.copy(orbit.target).addScaledVector(new THREE.Vector3(...d),distance);
    orbit.update();
  }
  return { sync, frameAll, setView, setWireframe: enabled => { wireframe = !!enabled; }, setShadows: enabled => { shadows = !!enabled; renderer.shadowMap.enabled = shadows; for (const m of meshes.values()) m.castShadow = m.receiveShadow = shadows; }, setSnap: enabled => { gizmo.setTranslationSnap(enabled ? 0.5 : null); gizmo.setRotationSnap(enabled ? Math.PI / 12 : null); gizmo.setScaleSnap(enabled ? 0.25 : null); }, setMode: mode => gizmo.setMode(mode), focus(id) {
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
