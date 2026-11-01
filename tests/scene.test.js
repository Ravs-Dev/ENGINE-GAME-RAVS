import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createObject, demoScene, parseScene, step } from '../src/scene.js';
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
  const loaded = parseScene(JSON.stringify(s)); assert.equal(loaded.background, '#151c2a'); assert.equal(loaded.grid, true);
  assert.equal(loaded.objects.at(-1).kind, 'cylinder');
  loaded.grid = 'true'; assert.throws(() => parseScene(JSON.stringify(loaded)));
});
