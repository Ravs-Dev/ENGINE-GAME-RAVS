import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultBuildSettings, normalizeBuildSettings, BUILD_TARGETS } from '../src/build-settings.js';

test('build settings normalize supported targets and resolution',()=>{
  const v=normalizeBuildSettings({target:'android',quality:'ultra',width:99999,height:100,fullscreen:1,development:true});
  assert.equal(v.target,'android');assert.equal(v.quality,'ultra');assert.equal(v.width,7680);assert.equal(v.height,240);assert.equal(v.fullscreen,true);
});
test('build target catalog exposes web and native platform targets',()=>{
  assert.deepEqual(BUILD_TARGETS.map(t=>t.id),['web','windows','linux','android']);
  assert.equal(defaultBuildSettings().target,'web');
});
