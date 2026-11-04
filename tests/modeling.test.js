import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultGeometry, defaultModifiers, normalizeGeometry, normalizeModifiers, modelingSignature } from '../src/modeling.js';

test('parametric geometry normalizes safe ranges',()=>{
  assert.deepEqual(normalizeGeometry('sphere',{radius:2,widthSegments:64,heightSegments:32}),{radius:2,widthSegments:64,heightSegments:32});
  assert.equal(normalizeGeometry('box',{width:2,height:3,depth:4,widthSegments:0,heightSegments:999,depthSegments:2}).widthSegments,1);
  assert.equal(normalizeGeometry('box',{width:2,height:3,depth:4,widthSegments:0,heightSegments:999,depthSegments:2}).heightSegments,64);
});

test('model modifiers clamp values and preserve axes',()=>{
  const m=normalizeModifiers({twist:{enabled:true,angle:1440,axis:'x'},taper:{enabled:true,amount:-5,axis:'z'}});
  assert.equal(m.twist.angle,1080);assert.equal(m.twist.axis,'x');assert.equal(m.taper.amount,-.95);assert.equal(m.taper.axis,'z');
});

test('modeling signature changes when geometry or modifier changes',()=>{
  const o={kind:'box',geometry:defaultGeometry('box'),modifiers:defaultModifiers()};
  const a=modelingSignature(o);o.geometry.width=2;const b=modelingSignature(o);assert.notEqual(a,b);o.modifiers.twist.enabled=true;assert.notEqual(b,modelingSignature(o));
});
