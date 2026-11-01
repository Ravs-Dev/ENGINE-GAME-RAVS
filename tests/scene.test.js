import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoScene,parseScene,step} from '../src/scene.js';
test('scene roundtrip',()=>{const s=demoScene();assert.deepEqual(parseScene(JSON.stringify(s)),s);});
test('reject duplicate IDs and unsupported versions',()=>{const s=demoScene();s.objects.push(s.objects[0]);assert.throws(()=>parseScene(JSON.stringify(s)));assert.throws(()=>parseScene('{"version":2}'));});
test('body lands on platform',()=>{const s=demoScene(),p=s.objects[1];p.body.bounce=0;for(let i=0;i<300;i++)step(s,1/60);assert.equal(p.y,376);assert.equal(p.body.vy,0);});
test('controller moves player',()=>{const s=demoScene();step(s,1/60,new Set(['d']));assert.equal(s.objects[1].x,223);assert.equal(s.objects[0].x,400);});
