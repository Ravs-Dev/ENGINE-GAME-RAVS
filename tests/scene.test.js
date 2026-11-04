import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createObject, createHumanoidRig, createAnimationController, demoScene, parseScene, step } from '../src/scene.js';
test('3D scene roundtrip preserves XYZ transforms and components', () => {
  const s = demoScene(); assert.deepEqual(parseScene(JSON.stringify(s)), s);
});
test('reject legacy 2D, duplicate IDs, malformed and negative scales', () => {
  for (const raw of ['null', '{"version":1}']) assert.throws(() => parseScene(raw));
  const s = demoScene(); s.objects.push(s.objects[0]); assert.throws(() => parseScene(JSON.stringify(s)));
  s.objects.pop(); s.objects[0].scale.z = -1; assert.throws(() => parseScene(JSON.stringify(s)));
});
test('body lands on ground along Y', () => {
  const s = demoScene(), p = s.objects[1]; p.body.bounce = 0;
  for (let i = 0; i < 300; i++) step(s, 1 / 60);
  assert.equal(p.position.y, 0.5); assert.equal(p.body.vy, 0);
});
test('WASD moves X/Z with normalized diagonal speed', () => {
  const s = demoScene(), p = s.objects[1], start = structuredClone(p.position);
  step(s, 1 / 60, new Set(['d', 'w']));
  assert.ok(p.position.x > start.x && p.position.z < start.z);
  assert.ok(Math.abs(Math.hypot(p.position.x - start.x, p.position.z - start.z) - 4 / 60) < 1e-10);
  assert.equal(s.objects[0].position.x, 0);
});
test('objects outside platform Z bounds keep falling', () => {
  const s = demoScene(), p = s.objects[1]; p.position.z = 20;
  for (let i = 0; i < 60; i++) step(s, 1 / 60);
  assert.ok(p.position.y < 0);
});
test('clamp large delta', () => {
  const o = createObject(); o.motion.enabled = true;
  step({ objects: [o], gravity: 0 }, 10, new Set(['d']));
  assert.equal(o.position.x, 4 / 30);
});
test('legacy 3D scenes receive settings and cylinders roundtrip', () => {
  const s = demoScene(); delete s.background; delete s.grid;
  s.objects.push(createObject('cylinder'));
  const loaded = parseScene(JSON.stringify(s)); assert.equal(loaded.background, '#080808'); assert.equal(loaded.grid, true);
  assert.equal(loaded.objects.at(-1).kind, 'cylinder');
  loaded.grid = 'true'; assert.throws(() => parseScene(JSON.stringify(loaded)));
});

test('new engine components roundtrip with PBR, lights, fog and scripts', () => {
  const s = demoScene();
  s.environment.fogEnabled = true; s.environment.fogNear = 5; s.environment.fogFar = 50;
  const light = createObject('pointLight'); light.light.intensity = 7;
  const torus = createObject('torus'); torus.material.metalness = 0.8; torus.scripts.push({id:'script-1',language:'lua',path:'Scripts/Main.lua',enabled:true});
  s.objects.push(light, torus);
  const loaded = parseScene(JSON.stringify(s));
  assert.equal(loaded.objects.at(-2).kind, 'pointLight');
  assert.equal(loaded.objects.at(-1).material.metalness, 0.8);
  assert.equal(loaded.objects.at(-1).scripts[0].language, 'lua');
  assert.equal(loaded.environment.fogEnabled, true);
});
test('legacy v2 scenes receive new component defaults', () => {
  const old = demoScene(); delete old.environment;
  for (const o of old.objects) { delete o.material; delete o.render; delete o.active; delete o.tag; delete o.layer; delete o.scripts; }
  const loaded = parseScene(JSON.stringify(old));
  assert.equal(loaded.environment.exposure, 1);
  assert.equal(loaded.objects[0].active, true);
  assert.equal(loaded.objects[0].material.roughness, 0.65);
  assert.deepEqual(loaded.objects[0].scripts, []);
});

test('humanoid rig, animation controller and required packs roundtrip', () => {
  const s=demoScene(), p=s.objects[1];p.rig=createHumanoidRig();p.animation=createAnimationController();s.requiredPacks.push('character-animation');
  const loaded=parseScene(JSON.stringify(s));
  assert.equal(loaded.objects[1].rig.type,'humanoid');
  assert.equal(loaded.objects[1].rig.bones.length,18);
  assert.equal(loaded.objects[1].animation.defaultClip,'Idle');
  assert.deepEqual(loaded.requiredPacks,['character-animation']);
});
test('invalid rig parent references are rejected', () => {
  const s=demoScene(), p=s.objects[1];p.rig=createHumanoidRig();p.rig.bones[1].parent='missing-bone';
  assert.throws(()=>parseScene(JSON.stringify(s)));
});

test('cyclic rig hierarchy and duplicate animation clip ids are rejected', () => {
  const s=demoScene(),p=s.objects[1];p.rig=createHumanoidRig();p.animation=createAnimationController();
  p.rig.bones[0].parent=p.rig.bones[1].id;p.rig.bones[1].parent=p.rig.bones[0].id;
  assert.throws(()=>parseScene(JSON.stringify(s)));
  p.rig=createHumanoidRig();p.animation=createAnimationController();p.animation.clips[1].id=p.animation.clips[0].id;
  assert.throws(()=>parseScene(JSON.stringify(s)));
});

test('camera actor and imported OBJ asset roundtrip', () => {
  const s=demoScene();
  const camera=createObject('camera');camera.camera.fov=75;s.objects.push(camera);
  const model=createObject('model');model.asset={format:'obj',name:'triangle.obj',data:'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n'};s.objects.push(model);
  const loaded=parseScene(JSON.stringify(s));
  assert.equal(loaded.objects.at(-2).camera.fov,75);
  assert.equal(loaded.objects.at(-1).asset.name,'triangle.obj');
});
test('modeled primitive geometry and modifiers roundtrip',()=>{
  const s=demoScene(),box=s.objects[0];
  box.geometry.width=3;box.geometry.heightSegments=4;box.modifiers.twist={enabled:true,angle:90,axis:'y'};
  const loaded=parseScene(JSON.stringify(s));
  assert.equal(loaded.objects[0].geometry.width,3);
  assert.equal(loaded.objects[0].geometry.heightSegments,4);
  assert.equal(loaded.objects[0].modifiers.twist.angle,90);
});

test('terrain actor configuration roundtrip',()=>{
  const s=demoScene(),terrain=createObject('terrain');terrain.terrain={width:80,depth:60,segments:32,height:8,frequency:.08,seed:42};s.objects.push(terrain);
  const loaded=parseScene(JSON.stringify(s));const t=loaded.objects.at(-1);
  assert.equal(t.kind,'terrain');assert.equal(t.terrain.width,80);assert.equal(t.terrain.seed,42);
});
