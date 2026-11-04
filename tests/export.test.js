import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameHTML, validateSplash } from '../src/game-export.js';
import { demoScene } from '../src/scene.js';
test('game export embeds scene, Ravs branding and runtime without title/script injection', () => {
  const scene=demoScene();scene.name='</script><script>alert(1)</script>';
  const html=createGameHTML(scene,{title:'<img src=x onerror=alert(1)>',duration:1},'data:image/png;base64,AA==','console.log("runtime");');
  assert.ok(html.includes('Made with RAVS Engine')); assert.ok(html.includes('<h1>RAVS ENGINE</h1>'));
  assert.ok(html.includes('id="ravs-splash"'));
  assert.ok(!html.includes('<img src=x onerror=alert(1)>')); assert.ok(html.includes('\\u003c/script>'));
  assert.ok(html.includes('console.log("runtime");'));
  assert.throws(()=>validateSplash({title:'Game',duration:100}));
});
