import { test } from 'node:test';
import assert from 'node:assert/strict';
import { History } from '../src/history.js';
const state = n => ({ scene: { objects: [{ x: n }] }, selected: 'object' });
test('undo and redo restore independent snapshots', () => {
  const h = new History(state(0)); const edited = state(1); h.record(edited); edited.scene.objects[0].x = 99;
  assert.equal(h.undo().scene.objects[0].x, 0);
  const restored = h.redo(); assert.equal(restored.scene.objects[0].x, 1);
  restored.scene.objects[0].x = 123; h.undo(); assert.equal(h.redo().scene.objects[0].x, 1);
});
test('editing after undo removes redo branch, selection and no-ops do not', () => {
  const h = new History(state(0)); h.record(state(1)); h.record(state(2)); h.undo();
  assert.equal(h.record({ ...state(1), selected: 'other' }), false); assert.ok(h.canRedo);
  h.record(state(3)); assert.equal(h.canRedo, false); assert.equal(h.undo().scene.objects[0].x, 1);
});
test('bounded history keeps most recent transactions', () => {
  const h = new History(state(0), 2); for (let n = 1; n <= 4; n++) h.record(state(n));
  assert.equal(h.undo().scene.objects[0].x, 3); assert.equal(h.undo().scene.objects[0].x, 2); assert.equal(h.undo(), null);
});
