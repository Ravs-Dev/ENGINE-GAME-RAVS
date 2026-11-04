import logo from '../assets/ravs-logo.png';
import { createProjectPanel } from './project-panel.js';
import { createGameHTML, validateSplash } from './game-export.js';
import { download } from './project.js';
import { createObject, createScene, createHumanoidRig, createAnimationController, demoScene, parseScene, step, LIGHT_KINDS } from './scene.js';
import { History } from './history.js';
import { createViewport } from './viewport.js';
import { FEATURE_PACKS, readPackState, writePackState, isPackReady } from './feature-packs.js';
import { MODEL_KINDS, defaultGeometry, defaultModifiers, normalizeGeometry, normalizeModifiers } from './modeling.js';
const $ = id => document.getElementById(id);
const keys = new Set(), storageKey = 'ravs.scene.3d.v2';
const layoutStorageKey = 'ravs.layout.v1';
const defaultLayout = { left:285, right:330, bottom:320, contentLeft:320, toolchainHeight:112, outlinerCollapsed:false, detailsCollapsed:false, toolchainCollapsed:false, viewportMaximized:false, preset:'custom' };
let editorLayout = {...defaultLayout};
try {
  const savedLayout = JSON.parse(localStorage.getItem(layoutStorageKey) || 'null');
  if (savedLayout && typeof savedLayout === 'object') editorLayout = {...defaultLayout,...savedLayout};
} catch { editorLayout = {...defaultLayout}; }
let scene = demoScene(), selected = scene.objects[1].id, backup = null, last = 0, paused = false, stepOnce = false, activeView = 'scene', simulating = false, fpsTime = performance.now(), fpsFrames = 0, workspaceMode='level';
const consoleEntries = [];
function pushConsole(text, level='log') {
  consoleEntries.push({time:new Date().toLocaleTimeString(),text:String(text),level});
  if (consoleEntries.length > 200) consoleEntries.shift();
  const output = $('consoleOutput');
  if (output) {
    output.replaceChildren(...consoleEntries.map(entry => {
      const line=document.createElement('div'); line.className='console-line '+entry.level;
      const time=document.createElement('span'); time.className='console-time'; time.textContent=entry.time;
      const message=document.createElement('span'); message.textContent=entry.text; line.append(time,message); return line;
    }));
    output.scrollTop=output.scrollHeight; $('consoleCount').textContent=consoleEntries.length;
  }
}
const status = text => { $('status').textContent = text; pushConsole(text); };
try { const saved = localStorage.getItem(storageKey); if (saved) scene = parseScene(saved); }
catch { status('Data 3D lokal tidak valid. Demo dimuat.'); }
const history = new History({ scene, selected });
let savedScene = JSON.stringify(scene);
const record = () => { if (!backup) history.record({ scene, selected }); refreshHistory(); };
function refreshHistory() {
  $('undo').disabled = !!backup || !history.canUndo;
  $('redo').disabled = !!backup || !history.canRedo;
  $('sceneName').textContent = scene.name + (JSON.stringify(backup ?? scene) !== savedScene ? ' • belum disimpan' : '');
}
function restoreHistory(direction) {
  if (backup) return;
  const state = history[direction]();
  if (state) { scene = state.scene; selected = state.selected; refresh(); status(direction === 'undo' ? 'Perubahan dibatalkan.' : 'Perubahan diulangi.'); }
}
let projectPanel;
let splash = { title: 'Game Saya', duration: 1.5 };
try { const saved = localStorage.getItem('ravs.splash.v1'); if (saved) splash = validateSplash(JSON.parse(saved)); } catch { /* Keep defaults if settings are corrupt. */ }
$('brandLogo').src = logo;
function saveSplash() { try { splash = validateSplash({title:$('gameTitle').value,duration:Number($('splashDuration').value)}); localStorage.setItem('ravs.splash.v1',JSON.stringify(splash)); } catch(e) { status(e.message); } }
$('gameTitle').value = splash.title; $('splashDuration').value = splash.duration;
$('gameTitle').onchange = $('splashDuration').onchange = saveSplash;
function missingRequiredPacks(){
  const state=readPackState();
  return (scene.requiredPacks??[]).map(id=>FEATURE_PACKS.find(pack=>pack.id===id)).filter(Boolean).filter(pack=>!isPackReady(pack,state,detectedToolchains));
}
function assertRequiredPacksReady(){
  const missing=missingRequiredPacks();
  if(missing.length) throw Error('Build diblokir. Install feature pack yang dibutuhkan: '+missing.map(p=>p.name).join(', ')+'.');
}
$('exportGame').onclick = () => { try { assertRequiredPacksReady(); const game = createGameHTML(backup ?? scene,splash,logo,RAVS_PLAYER_SOURCE); download('game-ravs.html',game,'text/html'); status('Game HTML diekspor dengan startup splash RAVS. Script proyek belum dijalankan di game.'); } catch(e) { status(e.message); } };
let viewport;
try {
  viewport = createViewport($('canvas'), id => { if (!backup) { selected = id; refresh(); } }, (id, mesh) => {
    const o = scene.objects.find(o => o.id === id);
    if (!o || backup) return;
    for (const a of ['x', 'y', 'z']) {
      o.position[a] = Math.max(-10000, Math.min(10000, mesh.position[a]));
      o.rotation[a] = Math.max(-10000, Math.min(10000, mesh.rotation[a] * 180 / Math.PI));
      o.scale[a] = Math.max(0.05, Math.min(1000, mesh.scale[a]));
    }
    refresh();
  }, record);
} catch (error) {
  status('Renderer 3D gagal: browser membutuhkan WebGL 2. ' + error.message);
  $('play').disabled = true;
}
function field(parent, label, target, key, type, min, max) {
  const row = document.createElement('label'), input = document.createElement('input');
  row.textContent = label; input.type = type;
  if (type === 'checkbox') input.checked = target[key]; else input.value = typeof target[key] === 'number' ? Math.round(target[key] * 1000) / 1000 : target[key];
  if (type === 'number') { input.step = '0.1'; if (min !== undefined) input.min = min; if (max !== undefined) input.max = max; }
  input.disabled = !!backup;
  input.onchange = () => {
    let value = type === 'checkbox' ? input.checked : type === 'number' ? Number(input.value) : input.value;
    if (type === 'number') {
      if (!Number.isFinite(value)) return;
      value = Math.min(max ?? 10000, Math.max(min ?? -10000, value));
    }
    target[key] = value; record(); refresh();
  };
  row.append(input); parent.append(row);
}

function appendSelect(parent,label,target,key,options){
  const row=document.createElement('label');row.textContent=label;const select=document.createElement('select');
  for(const value of options){const option=document.createElement('option');option.value=value;option.textContent=value.toUpperCase();select.append(option);}
  select.value=target[key];select.disabled=!!backup;select.onchange=()=>{target[key]=select.value;record();refresh();};row.append(select);parent.append(row);
}
function modelingField(parent,label,target,key,min,max,stepValue=.1){
  const row=document.createElement('label'),input=document.createElement('input');row.textContent=label;input.type='number';input.value=target[key];input.min=min;input.max=max;input.step=stepValue;input.disabled=!!backup;
  input.onchange=()=>{const value=Number(input.value);if(!Number.isFinite(value))return;target[key]=Math.max(min,Math.min(max,value));record();refresh();};row.append(input);parent.append(row);
}
function appendModelingInspector(inspector,o){
  if(!MODEL_KINDS.includes(o.kind))return;
  o.geometry=normalizeGeometry(o.kind,o.geometry??defaultGeometry(o.kind));o.modifiers=normalizeModifiers(o.modifiers??defaultModifiers());
  const section=document.createElement('section');section.className='modeling-section';
  const title=document.createElement('h3');title.textContent='Modeling · Geometry';section.append(title);
  const grid=document.createElement('div');grid.className='modeling-grid';section.append(grid);
  const specs={
    box:[['Width','width',.01,1000,.1],['Height','height',.01,1000,.1],['Depth','depth',.01,1000,.1],['Width Segments','widthSegments',1,64,1],['Height Segments','heightSegments',1,64,1],['Depth Segments','depthSegments',1,64,1]],
    sphere:[['Radius','radius',.01,1000,.1],['Width Segments','widthSegments',3,128,1],['Height Segments','heightSegments',2,128,1]],
    cylinder:[['Radius Top','radiusTop',0,1000,.1],['Radius Bottom','radiusBottom',0,1000,.1],['Height','height',.01,1000,.1],['Radial Segments','radialSegments',3,128,1],['Height Segments','heightSegments',1,64,1]],
    plane:[['Width','width',.01,1000,.1],['Height','height',.01,1000,.1],['Width Segments','widthSegments',1,128,1],['Height Segments','heightSegments',1,128,1]],
    cone:[['Radius','radius',.01,1000,.1],['Height','height',.01,1000,.1],['Radial Segments','radialSegments',3,128,1],['Height Segments','heightSegments',1,64,1]],
    torus:[['Radius','radius',.01,1000,.1],['Tube','tube',.005,1000,.05],['Radial Segments','radialSegments',3,64,1],['Tubular Segments','tubularSegments',3,256,1]]
  };
  for(const [label,key,min,max,stepValue] of specs[o.kind])modelingField(grid,label,o.geometry,key,min,max,stepValue);
  const reset=document.createElement('button');reset.textContent='Reset Geometry';reset.disabled=!!backup;reset.onclick=()=>{o.geometry=defaultGeometry(o.kind);o.modifiers=defaultModifiers();record();refresh();status('Geometry '+o.name+' di-reset.');};section.append(reset);
  const twist=document.createElement('div');twist.className='modifier-card';const th=document.createElement('div');th.className='modifier-head';const ts=document.createElement('strong');ts.textContent='Twist Modifier';const te=document.createElement('input');te.type='checkbox';te.checked=o.modifiers.twist.enabled;te.disabled=!!backup;te.onchange=()=>{o.modifiers.twist.enabled=te.checked;record();refresh();};th.append(ts,te);twist.append(th);
  const tg=document.createElement('div');tg.className='modeling-grid';modelingField(tg,'Angle °',o.modifiers.twist,'angle',-1080,1080,5);appendSelect(tg,'Axis',o.modifiers.twist,'axis',['x','y','z']);twist.append(tg);section.append(twist);
  const taper=document.createElement('div');taper.className='modifier-card';const ph=document.createElement('div');ph.className='modifier-head';const ps=document.createElement('strong');ps.textContent='Taper Modifier';const pe=document.createElement('input');pe.type='checkbox';pe.checked=o.modifiers.taper.enabled;pe.disabled=!!backup;pe.onchange=()=>{o.modifiers.taper.enabled=pe.checked;record();refresh();};ph.append(ps,pe);taper.append(ph);
  const pg=document.createElement('div');pg.className='modeling-grid';modelingField(pg,'Amount',o.modifiers.taper,'amount',-.95,4,.05);appendSelect(pg,'Axis',o.modifiers.taper,'axis',['x','y','z']);taper.append(pg);section.append(taper);
  inspector.append(section);
}
function selectedModel(){return scene.objects.find(o=>o.id===selected&&MODEL_KINDS.includes(o.kind));}
function estimatedHalfHeight(o){
  if(!o)return 0;
  const g=normalizeGeometry(o.kind,o.geometry);
  const base=o.kind==='sphere'?g.radius:(o.kind==='cylinder'||o.kind==='cone')?g.height/2:o.kind==='torus'?g.radius+g.tube:o.kind==='plane'?0.01:g.height/2;
  return base*Math.abs(o.scale.y);
}
function setWorkspace(mode){
  workspaceMode=['level','modeling','animation','build'].includes(mode)?mode:'level';
  for(const name of ['Level','Modeling','Animation','Build']) $('workspace'+name)?.classList.toggle('active',workspaceMode===name.toLowerCase());
  $('modelingToolbar').hidden=workspaceMode!=='modeling';
  document.body.classList.toggle('workspace-build-focus',workspaceMode==='build');
  if(workspaceMode==='build')$('packManagerPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
  if(workspaceMode==='animation'){const o=scene.objects.find(o=>o.id===selected);status(o?.rig?'Animation workspace · '+o.name+' · '+o.rig.bones.length+' bones':'Animation workspace · pilih object yang memiliki Rig/Armature.');}
  else if(workspaceMode==='modeling')status('Modeling workspace · pilih mesh lalu edit Geometry/Modifiers di Details.');
  else if(workspaceMode==='build')status('Build workspace · periksa feature pack dan toolchain sebelum export.');
  else status('Level workspace.');
  refresh();
}
function refresh() {
  const hierarchy = $('hierarchy'), inspector = $('inspector'); hierarchy.replaceChildren(); inspector.replaceChildren();
  for (const o of scene.objects.filter(o => o.name.toLowerCase().includes($('search').value.toLowerCase()))) {
    const b = document.createElement('button'); b.textContent = (o.kind === 'sphere' ? '◉ ' : '◇ ') + o.name;
    b.className = o.id === selected ? 'selected' : ''; b.onclick = () => { selected = o.id; refresh(); }; hierarchy.append(b);
  }
  const o = scene.objects.find(o => o.id === selected);
  if (o) {
    field(inspector, 'Nama', o, 'name', 'text');
    for (const [key, label] of [['position', 'Position'], ['rotation', 'Rotation °'], ['scale', 'Scale']]) {
      const title = document.createElement('h2'); title.textContent = label; inspector.append(title);
      for (const a of ['x', 'y', 'z']) field(inspector, a.toUpperCase(), o[key], a, 'number', key === 'scale' ? 0.05 : -10000, key === 'scale' ? 1000 : 10000);
    }
    field(inspector, 'Active', o, 'active', 'checkbox');
    field(inspector, 'Tag', o, 'tag', 'text');
    field(inspector, 'Layer', o, 'layer', 'number', 0, 31);
    field(inspector, 'Warna', o, 'color', 'color');
    appendModelingInspector(inspector,o);
    if (LIGHT_KINDS.includes(o.kind)) {
      const lt = document.createElement('h2'); lt.textContent = 'Light'; inspector.append(lt);
      field(inspector, 'Color', o.light, 'color', 'color');
      field(inspector, 'Intensity', o.light, 'intensity', 'number', 0, 100);
      if (o.kind === 'pointLight') {
        field(inspector, 'Distance', o.light, 'distance', 'number', 0, 10000);
        field(inspector, 'Decay', o.light, 'decay', 'number', 0, 10);
      }
    } else {
      const mt = document.createElement('h2'); mt.textContent = 'Material PBR'; inspector.append(mt);
      field(inspector, 'Roughness', o.material, 'roughness', 'number', 0, 1);
      field(inspector, 'Metalness', o.material, 'metalness', 'number', 0, 1);
      field(inspector, 'Emissive', o.material, 'emissive', 'color');
      field(inspector, 'Emissive Power', o.material, 'emissiveIntensity', 'number', 0, 10);
      field(inspector, 'Wireframe', o.material, 'wireframe', 'checkbox');
      field(inspector, 'Cast Shadow', o.render, 'castShadow', 'checkbox');
      field(inspector, 'Receive Shadow', o.render, 'receiveShadow', 'checkbox');
    }
    field(inspector, 'Rigidbody', o.body, 'enabled', 'checkbox');
    field(inspector, 'Bounce', o.body, 'bounce', 'number', 0, 1);
    field(inspector, 'Controller', o.motion, 'enabled', 'checkbox');
    field(inspector, 'Kecepatan', o.motion, 'speed', 'number', 0, 100);
    if (!LIGHT_KINDS.includes(o.kind)) {
      const rt=document.createElement('h2'); rt.textContent='Rig / Armature'; inspector.append(rt);
      if (!o.rig) {
        const addRig=document.createElement('button'); addRig.textContent='+ Humanoid Rig';
        addRig.disabled=!!backup; addRig.onclick=()=>{o.rig=createHumanoidRig();o.animation=createAnimationController();if(!scene.requiredPacks.includes('character-animation'))scene.requiredPacks.push('character-animation');record();refresh();renderPackManager();status('Humanoid rig 18 bones dan Animation Controller ditambahkan. Character & Animation Pack ditandai sebagai kebutuhan project.');};
        inspector.append(addRig);
      } else {
        field(inspector,'Rig Enabled',o.rig,'enabled','checkbox');
        const info=document.createElement('p'); info.textContent=o.rig.type+' · '+o.rig.bones.length+' bones'; inspector.append(info);
        const boneList=document.createElement('details'); const summary=document.createElement('summary'); summary.textContent='Bones ('+o.rig.bones.length+')'; boneList.append(summary);
        for(const bone of o.rig.bones){const row=document.createElement('div');row.className='bone-row';row.textContent=bone.name;boneList.append(row);} inspector.append(boneList);
        const removeRig=document.createElement('button');removeRig.textContent='Remove Rig';removeRig.disabled=!!backup;removeRig.onclick=()=>{o.rig=null;o.animation=null;record();refresh();};inspector.append(removeRig);
      }
      const at=document.createElement('h2');at.textContent='Animation';inspector.append(at);
      if(o.animation){
        field(inspector,'Enabled',o.animation,'enabled','checkbox');field(inspector,'Autoplay',o.animation,'autoplay','checkbox');field(inspector,'Default Clip',o.animation,'defaultClip','text');
        for(const clip of o.animation.clips){const row=document.createElement('div');row.className='animation-clip';const name=document.createElement('strong');name.textContent=clip.name;const path=document.createElement('span');path.textContent=clip.path;row.append(name,path);inspector.append(row);}
      } else {
        const note=document.createElement('p');note.textContent='Tambahkan Humanoid Rig untuk membuat Animation Controller.';inspector.append(note);
      }
    }
    const st = document.createElement('h2'); st.textContent = 'Script Components'; inspector.append(st);
    for (const script of o.scripts) {
      const card = document.createElement('div'); card.className = 'script-component';
      const enabled = document.createElement('input'); enabled.type = 'checkbox'; enabled.checked = script.enabled; enabled.disabled = !!backup;
      enabled.onchange = () => { script.enabled = enabled.checked; record(); refresh(); };
      const lang = document.createElement('select');
      for (const [value,label] of [['lua','Lua'],['c','C'],['cpp','C++'],['csharp','C#'],['java','Java']]) { const opt=document.createElement('option'); opt.value=value; opt.textContent=label; lang.append(opt); }
      lang.value = script.language; lang.disabled = !!backup; lang.onchange=()=>{script.language=lang.value;record();refresh();};
      const path = document.createElement('input'); path.type='text'; path.value=script.path; path.placeholder='Scripts/Player.lua'; path.disabled=!!backup;
      path.onchange=()=>{script.path=path.value.trim().slice(0,240);record();refresh();};
      const remove=document.createElement('button'); remove.textContent='×'; remove.disabled=!!backup; remove.onclick=()=>{o.scripts=o.scripts.filter(s=>s!==script);record();refresh();};
      card.append(enabled,lang,path,remove); inspector.append(card);
    }
    const addScript=document.createElement('button'); addScript.textContent='+ Add Script'; addScript.disabled=!!backup;
    addScript.onclick=()=>{o.scripts.push({id:crypto.randomUUID(),language:'lua',path:'Scripts/Main.lua',enabled:true});record();refresh();}; inspector.append(addScript);
    for (const [name, action] of [
      ['Fokus', () => viewport?.focus(o.id)],
      ['Duplikat', () => { const n = structuredClone(o); n.id = crypto.randomUUID(); n.name += ' Copy'; n.position.x += 1.5; scene.objects.push(n); selected = n.id; }],
      ['Hapus', () => { scene.objects = scene.objects.filter(n => n.id !== o.id); selected = null; }]
    ]) {
      const b = document.createElement('button'); b.textContent = name; b.disabled = !!backup;
      b.onclick = () => { action(); record(); refresh(); }; inspector.append(b);
    }
  } else inspector.textContent = 'Pilih objek di viewport atau hierarchy.';
  $('name').value = scene.name; $('gravity').value = scene.gravity; $('sceneName').textContent = scene.name;
  for (const id of ['box', 'sphere', 'cylinder', 'plane', 'cone', 'torus', 'pointLight', 'directionalLight', 'new', 'background', 'grid', 'snap', 'wireframe', 'shadows', 'exportGame', 'demo', 'save', 'export', 'import', 'name', 'gravity', 'mode', 'ambientColor', 'ambientIntensity', 'sunColor', 'sunIntensity', 'exposure', 'fogEnabled', 'fogColor', 'fogNear', 'fogFar']) $(id).disabled = !!backup;
  $('background').value = scene.background ?? '#080808';
  $('grid').checked = scene.grid ?? true;
  $('ambientColor').value = scene.environment.ambientColor; $('ambientIntensity').value = scene.environment.ambientIntensity;
  $('sunColor').value = scene.environment.sunColor; $('sunIntensity').value = scene.environment.sunIntensity; $('exposure').value = scene.environment.exposure;
  $('fogEnabled').checked = scene.environment.fogEnabled; $('fogColor').value = scene.environment.fogColor; $('fogNear').value = scene.environment.fogNear; $('fogFar').value = scene.environment.fogFar;
  refreshHistory();
  viewport?.sync(scene, selected, !!backup);
}
for (const kind of ['box', 'sphere', 'cylinder', 'plane', 'cone', 'torus', 'pointLight', 'directionalLight']) $(kind).onclick = () => { const o = createObject(kind); scene.objects.push(o); selected = o.id; record(); refresh(); };
$('undo').onclick = () => restoreHistory('undo');
$('redo').onclick = () => restoreHistory('redo');
$('search').oninput = refresh;
$('background').onchange = e => { scene.background = e.target.value; record(); refresh(); };
$('grid').onchange = e => { scene.grid = e.target.checked; record(); refresh(); };
for (const [id,key,type] of [['ambientColor','ambientColor','color'],['ambientIntensity','ambientIntensity','number'],['sunColor','sunColor','color'],['sunIntensity','sunIntensity','number'],['exposure','exposure','number'],['fogEnabled','fogEnabled','checkbox'],['fogColor','fogColor','color'],['fogNear','fogNear','number'],['fogFar','fogFar','number']]) {
  $(id).onchange = e => { scene.environment[key] = type === 'checkbox' ? e.target.checked : type === 'number' ? Number(e.target.value) : e.target.value; record(); refresh(); };
}
$('snap').onchange = e => viewport?.setSnap(e.target.checked);
$('cameraView').onchange = e => viewport?.setView(e.target.value);
$('shadingMode').onchange = e => { viewport?.setShading(e.target.value); status('Viewport '+e.target.options[e.target.selectedIndex].text+' aktif.'); };
$('gizmoSpace').onchange = e => { viewport?.setSpace(e.target.value); status('Transform space: '+e.target.value+'.'); };
$('cameraSpeed').onchange = e => viewport?.setCameraSpeed(e.target.value);
$('wireframe').onchange = e => viewport?.setWireframe(e.target.checked);
$('shadows').onchange = e => viewport?.setShadows(e.target.checked);
$('frameAll').onclick = () => viewport?.frameAll();
$('focusSelection').onclick = () => viewport?.focus(selected);
$('new').onclick = () => {
  if (!confirm('Buat scene kosong? Scene saat ini bisa dipulihkan dengan Undo.')) return;
  scene = createScene();
  selected = null; record(); refresh();
};
$('name').onchange = e => { scene.name = e.target.value; record(); refresh(); };
$('gravity').onchange = e => { const n = Number(e.target.value); if (Number.isFinite(n)) scene.gravity = Math.max(0, Math.min(10000, n)); record(); refresh(); };
$('save').onclick = () => { try { localStorage.setItem(storageKey, JSON.stringify(scene)); savedScene = JSON.stringify(scene); refreshHistory(); status('Scene 3D tersimpan lokal.'); } catch (e) { status(e.message); } };
$('export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'scene.ravs3d.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('import').onchange = async e => {
  try { const file = e.target.files[0]; if (!file) return; if (file.size > 5e6) throw Error('Batas ukuran 5 MB'); scene = parseScene(await file.text()); selected = null; record(); refresh(); status('Scene 3D berhasil diimpor.'); }
  catch (error) { status('Impor gagal: ' + error.message); } e.target.value = '';
};
$('demo').onclick = () => { if (confirm('Ganti scene aktif dengan demo 3D? Ekspor dahulu untuk backup.')) { scene = demoScene(); selected = scene.objects[1].id; record(); refresh(); } };
function updatePlayUI() {
  $('play').textContent = backup ? '■' : '▶'; $('play').classList.toggle('playing',!!backup);
  $('pause').disabled = !backup; $('step').disabled = !backup; $('pause').classList.toggle('active',paused); $('simulate').classList.toggle('active',simulating);
  $('modeBadge').textContent = backup ? (paused ? 'Paused' : simulating ? 'Simulating' : 'Play Mode') : 'Edit Mode';
  $('gameTab').classList.toggle('active', activeView==='game'); $('sceneTab').classList.toggle('active',activeView==='scene');
}
function stopRuntime() {
  if (!backup) return;
  scene=backup; backup=null; paused=false; stepOnce=false; simulating=false; keys.clear(); activeView='scene'; status('Edit mode');
}
function startRuntime(mode) {
  if (backup) return;
  backup=structuredClone(scene); paused=false; stepOnce=false; simulating=mode==='simulate'; activeView=simulating?'scene':'game'; $('canvas').focus();
  status(simulating?'Simulate mode · physics berjalan di Scene viewport.':'Play mode · WASD / tombol panah');
}
$('play').onclick = () => { backup ? stopRuntime() : startRuntime('play'); updatePlayUI(); refresh(); };
$('simulate').onclick = () => { backup ? stopRuntime() : startRuntime('simulate'); updatePlayUI(); refresh(); };
$('pause').onclick = () => { if (!backup) return; paused=!paused; keys.clear(); status(paused?'Play mode dijeda.':'Play mode dilanjutkan.'); updatePlayUI(); };
$('step').onclick = () => { if (!backup) return; paused=true; stepOnce=true; status('Step satu frame.'); updatePlayUI(); };
$('sceneTab').onclick = () => { activeView='scene'; updatePlayUI(); status('Scene view aktif.'); };
$('gameTab').onclick = () => { activeView='game'; updatePlayUI(); status(backup?'Game view aktif.':'Game view preview; tekan Play untuk menjalankan scene.'); };

window.addEventListener('keydown', e => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const modifier = e.ctrlKey || e.metaKey;
  if (modifier && key === 's') { e.preventDefault(); if (projectPanel?.hasTextFocus()) { e.preventDefault(); projectPanel.saveActive(); return; } if (!backup) { document.activeElement?.blur(); $('save').click(); } return; }
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) return;
  if (modifier && key === 'z') { e.preventDefault(); restoreHistory(e.shiftKey ? 'redo' : 'undo'); return; }
  if (modifier && key === 'y') { e.preventDefault(); restoreHistory('redo'); return; }
  if (!backup && modifier && key === 'd') {
    e.preventDefault(); [...$('inspector').querySelectorAll('button')].find(b => b.textContent === 'Duplikat')?.click(); return;
  }
  if (!backup && key === 'Delete') {
    e.preventDefault(); [...$('inspector').querySelectorAll('button')].find(b => b.textContent === 'Hapus')?.click(); return;
  }
  if (key === 'Home') { e.preventDefault(); viewport?.frameAll(); return; }
  if (!backup && key === 'f') { viewport?.focus(selected); return; }
  if (!backup && ['w', 'e', 'r'].includes(key)) {
    $('mode').value = { w: 'translate', e: 'rotate', r: 'scale' }[key]; viewport?.setMode($('mode').value); return;
  }
  if (backup && ['a', 'd', 'w', 's', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) { keys.add(key); e.preventDefault(); }
});
window.ravsDesktop?.onCommand(command => {
  if (command === 'save' && projectPanel?.hasTextFocus()) { projectPanel.saveActive(); return; }
  if (command === 'save') { if (!backup) { document.activeElement?.blur(); $('save').click(); } return; }
  const element = document.activeElement;
  if (['INPUT', 'TEXTAREA'].includes(element?.tagName) || element?.isContentEditable) {
    document.execCommand(command); return;
  }
  restoreHistory(command);
});
window.addEventListener('beforeunload', event => {
  if (JSON.stringify(backup ?? scene) !== savedScene || projectPanel?.dirty()) { event.preventDefault(); event.returnValue = ''; }
});
window.addEventListener('keyup', e => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
window.addEventListener('blur', () => keys.clear());
function frame(time) {
  if (backup && (!paused || stepOnce)) { step(scene,(time-last)/1000,keys); stepOnce=false; }
  last=time; viewport?.sync(scene,selected,!!backup); viewport?.render();
  fpsFrames++;
  if (time-fpsTime>=500) {
    const fps=Math.round(fpsFrames*1000/(time-fpsTime)), stats=viewport?.stats?.()??{triangles:0};
    $('viewportStats').textContent=fps+' FPS · '+scene.objects.length+' Actors · '+stats.triangles.toLocaleString()+' Tris';
    fpsFrames=0;fpsTime=time;
  }
  requestAnimationFrame(frame);
}
projectPanel = createProjectPanel({
  getScene: () => structuredClone(backup ?? scene), getSplash: () => ({...splash}), status,
  loadScene: (value, config) => {
    if (backup) throw Error('Stop simulasi sebelum membuka proyek.');
    const nextScene = parseScene(JSON.stringify(value)), nextSplash = validateSplash(config);
    scene = nextScene; splash = nextSplash; selected = null; record(); refresh();
    $('gameTitle').value = splash.title; $('splashDuration').value = splash.duration; localStorage.setItem('ravs.splash.v1',JSON.stringify(splash));
  }
});
for (const [id,mode] of [['toolMove','translate'],['toolRotate','rotate'],['toolScale','scale']]) {
  $(id).onclick=()=>{ if(backup)return; $('mode').value=mode; viewport?.setMode(mode); for(const b of ['toolMove','toolRotate','toolScale','toolHand']) $(b).classList.toggle('active',b===id); status('Tool '+mode+' aktif.'); };
}
$('toolHand').onclick=()=>{ if(backup)return; for(const b of ['toolMove','toolRotate','toolScale','toolHand']) $(b).classList.toggle('active',b==='toolHand'); status('Hand/View tool aktif.'); };
$('mode').onchange = e => { viewport?.setMode(e.target.value); const id={translate:'toolMove',rotate:'toolRotate',scale:'toolScale'}[e.target.value]; for(const b of ['toolMove','toolRotate','toolScale','toolHand']) $(b).classList.toggle('active',b===id); };
$('projectTab').onclick=()=>{ $('contentWorkspace').classList.remove('drawer-collapsed'); $('projectView').hidden=false; $('consoleView').hidden=true; $('projectTab').classList.add('active'); $('consoleTab').classList.remove('active'); };
$('consoleTab').onclick=()=>{ $('contentWorkspace').classList.remove('drawer-collapsed'); $('projectView').hidden=true; $('consoleView').hidden=false; $('consoleTab').classList.add('active'); $('projectTab').classList.remove('active'); };
$('contentDrawer').onclick=()=>{ const collapsed=$('contentWorkspace').classList.toggle('drawer-collapsed'); $('bottomSplitter').classList.toggle('drawer-collapsed',collapsed); status(collapsed?'Content Drawer ditutup.':'Content Drawer dibuka.'); };
$('outputLog').onclick=()=>{ $('contentWorkspace').classList.remove('drawer-collapsed'); $('consoleTab').click(); status('Output Log dibuka.'); };
$('clearConsole').onclick=()=>{ consoleEntries.length=0; $('consoleOutput').replaceChildren(); $('consoleCount').textContent='0'; };

function clampLayoutValue(value,min,max){ return Math.max(min,Math.min(max,Number(value)||min)); }
function saveEditorLayout(){ try { localStorage.setItem(layoutStorageKey,JSON.stringify(editorLayout)); } catch { /* layout persistence is optional */ } }
function applyEditorLayout(){
  editorLayout.left=clampLayoutValue(editorLayout.left,160,480);
  editorLayout.right=clampLayoutValue(editorLayout.right,220,520);
  editorLayout.bottom=clampLayoutValue(editorLayout.bottom,180,620);
  editorLayout.contentLeft=clampLayoutValue(editorLayout.contentLeft,220,620);
  editorLayout.toolchainHeight=clampLayoutValue(editorLayout.toolchainHeight,72,280);
  const root=$('levelEditorLayout');
  root.style.setProperty('--ravs-outliner-width',editorLayout.left+'px');
  root.style.setProperty('--ravs-details-width',editorLayout.right+'px');
  document.documentElement.style.setProperty('--ravs-content-height',editorLayout.bottom+'px');
  document.documentElement.style.setProperty('--ravs-content-left',editorLayout.contentLeft+'px');
  document.documentElement.style.setProperty('--ravs-toolchain-height',editorLayout.toolchainHeight+'px');
  root.classList.toggle('outliner-collapsed',!!editorLayout.outlinerCollapsed);
  root.classList.toggle('details-collapsed',!!editorLayout.detailsCollapsed);
  root.classList.toggle('viewport-maximized',!!editorLayout.viewportMaximized);
  document.body.classList.toggle('viewport-maximized',!!editorLayout.viewportMaximized);
  $('toolchainPanel').classList.toggle('collapsed-panel',!!editorLayout.toolchainCollapsed);
  $('toolchainSplitter').classList.toggle('collapsed-edge',!!editorLayout.toolchainCollapsed);
  $('maximizeViewport').classList.toggle('active',!!editorLayout.viewportMaximized);
  $('layoutPreset').value = editorLayout.preset || 'custom';
  $('leftSplitter').classList.toggle('collapsed-edge',!!editorLayout.outlinerCollapsed);
  $('rightSplitter').classList.toggle('collapsed-edge',!!editorLayout.detailsCollapsed);
  $('leftSplitter').setAttribute('aria-valuenow',String(editorLayout.left));
  $('rightSplitter').setAttribute('aria-valuenow',String(editorLayout.right));
  $('bottomSplitter').setAttribute('aria-valuenow',String(editorLayout.bottom));
  $('contentSplitter').setAttribute('aria-valuenow',String(editorLayout.contentLeft));
  $('toolchainSplitter').setAttribute('aria-valuenow',String(editorLayout.toolchainHeight));
}
function resetEditorLayout(){
  editorLayout={...defaultLayout}; applyEditorLayout(); saveEditorLayout();
  $('contentWorkspace').classList.remove('drawer-collapsed'); $('bottomSplitter').classList.remove('drawer-collapsed');
  $('toolchainPanel').classList.remove('collapsed-panel'); $('toolchainSplitter').classList.remove('collapsed-edge');
  status('Layout editor dikembalikan ke default.');
}
function setPanelCollapsed(side,collapsed){
  if(side==='left') editorLayout.outlinerCollapsed=collapsed;
  else editorLayout.detailsCollapsed=collapsed;
  applyEditorLayout(); saveEditorLayout();
  status((side==='left'?'World Outliner':'Details')+(collapsed?' ditutup.':' dibuka.'));
}
function setupSplitter(id,axis,onDelta,onKeyboard){
  const splitter=$(id); let start=null;
  splitter.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    start={x:event.clientX,y:event.clientY}; splitter.setPointerCapture?.(event.pointerId);
    splitter.classList.add('dragging'); document.body.classList.add('layout-resizing',axis==='x'?'vertical-resize':'horizontal-resize');
  });
  splitter.addEventListener('pointermove',event=>{
    if(!start)return;
    const dx=event.clientX-start.x,dy=event.clientY-start.y; onDelta(axis==='x'?dx:dy); start={x:event.clientX,y:event.clientY}; applyEditorLayout();
  });
  const finish=()=>{ if(!start)return; start=null; splitter.classList.remove('dragging'); document.body.classList.remove('layout-resizing','vertical-resize','horizontal-resize'); saveEditorLayout(); };
  splitter.addEventListener('pointerup',finish); splitter.addEventListener('pointercancel',finish);
  splitter.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;
    event.preventDefault();
    if(event.key==='Home'){ resetEditorLayout(); return; }
    onKeyboard(event.key,event.shiftKey?40:10); applyEditorLayout(); saveEditorLayout();
  });
  splitter.addEventListener('dblclick',()=>resetEditorLayout());
}
setupSplitter('leftSplitter','x',dx=>{editorLayout.outlinerCollapsed=false;editorLayout.left=clampLayoutValue(editorLayout.left+dx,160,480);},(key,step)=>{
  editorLayout.outlinerCollapsed=false;if(key==='ArrowLeft')editorLayout.left-=step;if(key==='ArrowRight')editorLayout.left+=step;
});
setupSplitter('rightSplitter','x',dx=>{editorLayout.detailsCollapsed=false;editorLayout.right=clampLayoutValue(editorLayout.right-dx,220,520);},(key,step)=>{
  editorLayout.detailsCollapsed=false;if(key==='ArrowLeft')editorLayout.right+=step;if(key==='ArrowRight')editorLayout.right-=step;
});
setupSplitter('bottomSplitter','y',dy=>{editorLayout.bottom=clampLayoutValue(editorLayout.bottom-dy,180,620);},(key,step)=>{
  if(key==='ArrowUp')editorLayout.bottom+=step;if(key==='ArrowDown')editorLayout.bottom-=step;
});
setupSplitter('contentSplitter','x',dx=>{editorLayout.contentLeft=clampLayoutValue(editorLayout.contentLeft+dx,220,620);editorLayout.preset='custom';},(key,step)=>{
  if(key==='ArrowLeft')editorLayout.contentLeft-=step;if(key==='ArrowRight')editorLayout.contentLeft+=step;editorLayout.preset='custom';
});
setupSplitter('toolchainSplitter','y',dy=>{editorLayout.toolchainCollapsed=false;editorLayout.toolchainHeight=clampLayoutValue(editorLayout.toolchainHeight-dy,72,280);editorLayout.preset='custom';},(key,step)=>{
  editorLayout.toolchainCollapsed=false;if(key==='ArrowUp')editorLayout.toolchainHeight+=step;if(key==='ArrowDown')editorLayout.toolchainHeight-=step;editorLayout.preset='custom';
});
$('collapseOutliner').onclick=()=>setPanelCollapsed('left',true);
$('collapseDetails').onclick=()=>setPanelCollapsed('right',true);
$('collapseToolchain').onclick=()=>{editorLayout.toolchainCollapsed=true;editorLayout.preset='custom';applyEditorLayout();saveEditorLayout();status('Toolchain Manager ditutup.');};
$('leftSplitter').addEventListener('click',()=>{if(editorLayout.outlinerCollapsed)setPanelCollapsed('left',false);});
$('rightSplitter').addEventListener('click',()=>{if(editorLayout.detailsCollapsed)setPanelCollapsed('right',false);});
$('toolchainSplitter').addEventListener('click',()=>{if(editorLayout.toolchainCollapsed){editorLayout.toolchainCollapsed=false;applyEditorLayout();saveEditorLayout();status('Toolchain Manager dibuka.');}});
$('resetLayout').onclick=resetEditorLayout;
$('maximizeViewport').onclick=()=>{editorLayout.viewportMaximized=!editorLayout.viewportMaximized;editorLayout.preset='custom';applyEditorLayout();saveEditorLayout();status(editorLayout.viewportMaximized?'Viewport dimaksimalkan.':'Viewport dikembalikan ke layout editor.');};
const layoutPresets={
  level:{left:285,right:330,bottom:320,contentLeft:320,toolchainHeight:112,outlinerCollapsed:false,detailsCollapsed:false,toolchainCollapsed:false,viewportMaximized:false},
  scripting:{left:220,right:280,bottom:500,contentLeft:260,toolchainHeight:82,outlinerCollapsed:false,detailsCollapsed:false,toolchainCollapsed:true,viewportMaximized:false},
  cinematic:{left:180,right:260,bottom:220,contentLeft:280,toolchainHeight:82,outlinerCollapsed:true,detailsCollapsed:false,toolchainCollapsed:true,viewportMaximized:false}
};
$('layoutPreset').onchange=e=>{
  const preset=e.target.value;if(preset==='custom')return;
  editorLayout={...editorLayout,...layoutPresets[preset],preset};applyEditorLayout();saveEditorLayout();status('Layout '+e.target.options[e.target.selectedIndex].text+' diterapkan.');
};
applyEditorLayout();

const menuPopup = $('engineMenuPopup');
function selectedObject() { return scene.objects.find(o=>o.id===selected); }
function addObject(kind) {
  if (backup) return;
  const o=createObject(kind); scene.objects.push(o); selected=o.id; record(); refresh(); status(o.name+' dibuat.');
}
function addComponent(type) {
  const o=selectedObject(); if (!o || backup) { status('Pilih GameObject terlebih dahulu.'); return; }
  if (type==='rigidbody') o.body.enabled=true;
  if (type==='controller') o.motion.enabled=true;
  if (type==='script') o.scripts.push({id:crypto.randomUUID(),language:'lua',path:'Scripts/Main.lua',enabled:true});
  record(); refresh(); status('Component '+type+' ditambahkan ke '+o.name+'.');
}
const menuDefinitions = {
  file:[
    ['New Scene',()=>$('new').click()],['Save Scene',()=>$('save').click()],['Export Scene JSON',()=>$('export').click()],
    ['Import Scene…',()=>$('import').click()],['Export Game HTML',()=>$('exportGame').click()]
  ],
  edit:[
    ['Undo',()=>$('undo').click()],['Redo',()=>$('redo').click()],
    ['Duplicate',()=>[...$('inspector').querySelectorAll('button')].find(b=>b.textContent==='Duplikat')?.click()],
    ['Delete',()=>[...$('inspector').querySelectorAll('button')].find(b=>b.textContent==='Hapus')?.click()]
  ],
  assets:[
    ['Open Project Folder…',()=>$('openProject').click()],['Refresh Project',()=>$('refreshFiles').click()],
    ['Create Folder',()=>{ $('projectTab').click(); $('entryName').focus(); status('Isi nama lalu tekan + Folder.'); }],
    ['Create File',()=>{ $('projectTab').click(); $('entryName').focus(); status('Isi nama lalu tekan + File.'); }]
  ],
  gameObject:[
    ['Cube',()=>addObject('box')],['Sphere',()=>addObject('sphere')],['Cylinder',()=>addObject('cylinder')],
    ['Plane',()=>addObject('plane')],['Cone',()=>addObject('cone')],['Torus',()=>addObject('torus')],
    ['Point Light',()=>addObject('pointLight')],['Directional Light',()=>addObject('directionalLight')]
  ],
  component:[
    ['Rigidbody',()=>addComponent('rigidbody')],['Controller',()=>addComponent('controller')],['Script',()=>addComponent('script')]
  ],
  window:[
    ['Content Browser',()=>$('projectTab').click()],['Output Log',()=>$('consoleTab').click()],
    ['Toggle World Outliner',()=>setPanelCollapsed('left',!editorLayout.outlinerCollapsed)],
    ['Toggle Details',()=>setPanelCollapsed('right',!editorLayout.detailsCollapsed)],
    ['Maximize Viewport',()=>$('maximizeViewport').click()],['Reset Layout',resetEditorLayout],
    ['Toolchain Manager',()=>{ $('scanToolchains').scrollIntoView({behavior:'smooth',block:'center'}); status('Toolchain Manager ditampilkan.'); }]
  ],
  help:[
    ['About RAVS Engine',()=>status('RAVS Engine 3D v0.8.0 · resizable desktop workspace.')],
    ['Controls',()=>status('Q View · W Move · E Rotate · R Scale · F Focus · Ctrl+S Save · Ctrl+D Duplicate')]
  ]
};
function closeMenu(){ menuPopup.hidden=true; menuPopup.replaceChildren(); }
function openMenu(button,key){
  const items=menuDefinitions[key]??[]; menuPopup.replaceChildren();
  for(const [label,action] of items){
    const item=document.createElement('button'); item.textContent=label;
    item.onclick=()=>{closeMenu();action();}; menuPopup.append(item);
  }
  const rect=button.getBoundingClientRect(); menuPopup.style.left=rect.left+'px'; menuPopup.style.top=rect.bottom+'px'; menuPopup.hidden=false;
}
document.querySelectorAll('.menu-item').forEach(button=>button.onclick=e=>{e.stopPropagation();if(!menuPopup.hidden&&menuPopup.dataset.menu===button.dataset.menu){closeMenu();return;}menuPopup.dataset.menu=button.dataset.menu;openMenu(button,button.dataset.menu);});
document.addEventListener('pointerdown',e=>{if(!menuPopup.hidden&&!menuPopup.contains(e.target)&&!e.target.classList.contains('menu-item'))closeMenu();});
$('hierarchyCreate').onclick=e=>{ const source=document.querySelector('[data-menu="gameObject"]'); openMenu(source,'gameObject'); menuPopup.style.left=e.currentTarget.getBoundingClientRect().left+'px'; menuPopup.style.top=e.currentTarget.getBoundingClientRect().bottom+'px'; };
$('workspaceLevel').onclick=()=>setWorkspace('level');
$('workspaceModeling').onclick=()=>setWorkspace('modeling');
$('workspaceAnimation').onclick=()=>setWorkspace('animation');
$('workspaceBuild').onclick=()=>setWorkspace('build');
$('modelAdd').onclick=()=>{if(backup)return;const o=createObject($('modelPrimitive').value);scene.objects.push(o);selected=o.id;record();refresh();status(o.name+' ditambahkan dari Modeling toolbar.');};
$('modelDuplicate').onclick=()=>{if(backup)return;const o=selectedModel();if(!o){status('Pilih mesh untuk Duplicate.');return;}const n=structuredClone(o);n.id=crypto.randomUUID();n.name+=' Copy';n.position.x+=1;scene.objects.push(n);selected=n.id;record();refresh();};
$('modelCenter').onclick=()=>{const o=selectedModel();if(!o||backup)return;o.position.x=0;o.position.z=0;record();refresh();status(o.name+' dipusatkan ke X/Z 0.');};
$('modelGround').onclick=()=>{const o=selectedModel();if(!o||backup)return;o.position.y=estimatedHalfHeight(o);record();refresh();status(o.name+' ditempatkan di ground.');};
$('modelResetRotation').onclick=()=>{const o=selectedModel();if(!o||backup)return;o.rotation={x:0,y:0,z:0};record();refresh();};
$('modelResetScale').onclick=()=>{const o=selectedModel();if(!o||backup)return;o.scale={x:1,y:1,z:1};record();refresh();};
setWorkspace('level'); updatePlayUI(); refresh(); requestAnimationFrame(frame);


let detectedToolchains = [];
let packState = readPackState();
async function syncDesktopPacks(){
  if(!window.ravsDesktop?.listPacks)return;
  const result=await window.ravsDesktop.listPacks();
  if(!result.ok){status('Gagal membaca feature packs: '+result.error);return;}
  const next={...packState};
  for(const pack of FEATURE_PACKS) if(pack.kind==='engine') delete next[pack.id];
  for(const item of result.data) next[item.id]={installed:true,version:item.version,desktop:true};
  packState=next;writePackState(packState);renderPackManager();
}
function renderPackManager(){
  const list=$('packList'); if(!list)return; list.replaceChildren();
  for(const pack of FEATURE_PACKS){
    const ready=isPackReady(pack,packState,detectedToolchains);
    const required=scene.requiredPacks?.includes(pack.id);
    const card=document.createElement('article'); card.className='pack-card'+(ready?' ready':'')+(required?' required':'');
    const head=document.createElement('div'); head.className='pack-card-head';
    const title=document.createElement('strong'); title.textContent=pack.name;
    const state=document.createElement('span'); state.className='pack-state'; state.textContent=ready?'Ready':required?'Required':'Not installed';
    head.append(title,state);
    const meta=document.createElement('small'); meta.textContent=pack.category+' · '+pack.size;
    const desc=document.createElement('p'); desc.textContent=pack.description;
    const actions=document.createElement('div');actions.className='pack-card-actions';
    const download=document.createElement('button');download.textContent=pack.kind==='external'?'Official Download':'RAVS Downloads';
    download.onclick=async()=>{if(window.ravsDesktop?.openExternal){const result=await window.ravsDesktop.openExternal(pack.url);if(!result.ok)status(result.error);}else status('Download link tersedia pada aplikasi desktop.');};
    actions.append(download);
    if(pack.kind==='engine'){
      const note=document.createElement('span');note.className='pack-install-note';note.textContent=ready?'Pack installed':'Download lalu install .ravspack';actions.append(note);
      if(ready&&packState[pack.id]?.desktop&&window.ravsDesktop?.removePack){
        const remove=document.createElement('button');remove.textContent='Uninstall';remove.onclick=async()=>{const result=await window.ravsDesktop.removePack(pack.id);if(!result.ok){status(result.error);return;}await syncDesktopPacks();status(pack.name+' dihapus.');};actions.append(remove);
      }
    }
    card.append(head,meta,desc,actions);list.append(card);
  }
  const missing=(scene.requiredPacks??[]).filter(id=>FEATURE_PACKS.some(pack=>pack.id===id&&!isPackReady(pack,packState,detectedToolchains)));
  if($('dockStatus')) $('dockStatus').textContent=missing.length?'RAVS Engine 3D · Missing '+missing.length+' required pack(s)':'RAVS Engine 3D · All required packs ready';
}
$('refreshPacks').onclick=async()=>{await syncDesktopPacks();renderPackManager();status('Status feature pack diperbarui.');};
$('installDownloadedPack').onclick=async()=>{
  if(!window.ravsDesktop?.installPack){status('Install pack langsung hanya tersedia di aplikasi desktop.');return;}
  const result=await window.ravsDesktop.installPack();
  if(!result.ok){status('Install pack gagal: '+result.error);return;}
  if(!result.data){status('Install pack dibatalkan.');return;}
  await syncDesktopPacks();status('Feature pack '+result.data.id+' terpasang.');
};
$('featurePackImport').onchange=async e=>{
  const file=e.target.files?.[0]; if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    if(!data || typeof data.id!=='string' || !FEATURE_PACKS.some(p=>p.id===data.id) || typeof data.version!=='string') throw Error('File .ravspack tidak valid.');
    packState[data.id]={installed:true,version:data.version};writePackState(packState);renderPackManager();status('Feature pack '+data.id+' berhasil diregistrasikan.');
  }catch(error){status('Import pack gagal: '+error.message);} finally {e.target.value='';}
};
renderPackManager();
syncDesktopPacks();

const toolchainNames = { lua:'Lua', c:'C', cpp:'C++', csharp:'C#', java:'Java' };
$('scanToolchains').onclick = async () => {
  const box = $('toolchainStatus');
  if (!window.ravsDesktop?.scanToolchains) { box.textContent = 'Toolchain scan hanya tersedia pada aplikasi desktop.'; return; }
  box.textContent = 'Memindai...';
  const result = await window.ravsDesktop.scanToolchains();
  if (!result.ok) { box.textContent = result.error; return; }
  detectedToolchains = result.data; renderPackManager();
  box.replaceChildren();
  for (const item of result.data) {
    const row = document.createElement('div'); row.className = 'toolchain-row';
    const need = scene.objects.some(o => o.scripts?.some(s => s.enabled && s.language === item.language));
    row.textContent = (item.available ? '✓ ' : '○ ') + toolchainNames[item.language] + ' · ' + (item.available ? item.version : 'belum terdeteksi') + (need ? ' · diperlukan scene' : '');
    box.append(row);
  }
};
