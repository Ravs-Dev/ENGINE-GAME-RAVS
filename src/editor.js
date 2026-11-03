import logo from '../assets/ravs-logo.png';
import { createProjectPanel } from './project-panel.js';
import { createGameHTML, validateSplash } from './game-export.js';
import { download } from './project.js';
import { createObject, createScene, demoScene, parseScene, step, LIGHT_KINDS } from './scene.js';
import { History } from './history.js';
import { createViewport } from './viewport.js';
const $ = id => document.getElementById(id);
const keys = new Set(), storageKey = 'ravs.scene.3d.v2';
let scene = demoScene(), selected = scene.objects[1].id, backup = null, last = 0, paused = false, stepOnce = false, activeView = 'scene', simulating = false, fpsTime = performance.now(), fpsFrames = 0;
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
let splash = { title: 'Game Saya', duration: 1.5 }, splashTimer = null, splashActive = false;
try { const saved = localStorage.getItem('ravs.splash.v1'); if (saved) splash = validateSplash(JSON.parse(saved)); } catch { /* Keep defaults if settings are corrupt. */ }
$('brandLogo').src = $('splashLogo').src = logo;
function hideSplash() { clearInterval(splashTimer); splashTimer = null; splashActive = false; $('splashOverlay').hidden = true; }
function showSplash() {
  hideSplash(); splashActive = true; $('splashOverlay').hidden = false; $('splashTitle').textContent = splash.title;
  const start = performance.now(); $('splashProgress').value = 0;
  splashTimer = setInterval(() => { const progress = (performance.now() - start) / (splash.duration * 1000); $('splashProgress').value = Math.min(1,progress); if (progress >= 1) hideSplash(); }, 30);
}
function saveSplash() { try { splash = validateSplash({title:$('gameTitle').value,duration:Number($('splashDuration').value)}); localStorage.setItem('ravs.splash.v1',JSON.stringify(splash)); } catch(e) { status(e.message); } }
$('gameTitle').value = splash.title; $('splashDuration').value = splash.duration;
$('gameTitle').onchange = $('splashDuration').onchange = saveSplash;
$('closeSplash').onclick = hideSplash; $('previewSplash').onclick = showSplash;
$('exportGame').onclick = () => { try { const game = createGameHTML(backup ?? scene,splash,logo,RAVS_PLAYER_SOURCE); download('game-ravs.html',game,'text/html'); status('Game HTML diekspor dengan loading screen Ravs. Script proyek belum dijalankan di game.'); } catch(e) { status(e.message); } };
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
  scene=backup; backup=null; paused=false; stepOnce=false; simulating=false; keys.clear(); hideSplash(); activeView='scene'; status('Edit mode');
}
function startRuntime(mode) {
  if (backup) return;
  backup=structuredClone(scene); paused=false; stepOnce=false; simulating=mode==='simulate'; activeView=simulating?'scene':'game'; $('canvas').focus();
  status(simulating?'Simulate mode · physics berjalan di Scene viewport.':'Play mode · WASD / tombol panah');
  if (!simulating) showSplash();
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
  if (backup && !splashActive && (!paused || stepOnce)) { step(scene,(time-last)/1000,keys); stepOnce=false; }
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
$('contentDrawer').onclick=()=>{ $('contentWorkspace').classList.toggle('drawer-collapsed'); status($('contentWorkspace').classList.contains('drawer-collapsed')?'Content Drawer ditutup.':'Content Drawer dibuka.'); };
$('outputLog').onclick=()=>{ $('contentWorkspace').classList.remove('drawer-collapsed'); $('consoleTab').click(); status('Output Log dibuka.'); };
$('clearConsole').onclick=()=>{ consoleEntries.length=0; $('consoleOutput').replaceChildren(); $('consoleCount').textContent='0'; };
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
    ['Toolchain Manager',()=>{ $('scanToolchains').scrollIntoView({behavior:'smooth',block:'center'}); status('Toolchain Manager ditampilkan.'); }]
  ],
  help:[
    ['About RAVS Engine',()=>status('RAVS Engine 3D v0.7.0 · editor game 3D desktop.')],
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
updatePlayUI(); refresh(); requestAnimationFrame(frame); showSplash();

const toolchainNames = { lua:'Lua', c:'C', cpp:'C++', csharp:'C#', java:'Java' };
$('scanToolchains').onclick = async () => {
  const box = $('toolchainStatus');
  if (!window.ravsDesktop?.scanToolchains) { box.textContent = 'Toolchain scan hanya tersedia pada aplikasi desktop.'; return; }
  box.textContent = 'Memindai...';
  const result = await window.ravsDesktop.scanToolchains();
  if (!result.ok) { box.textContent = result.error; return; }
  box.replaceChildren();
  for (const item of result.data) {
    const row = document.createElement('div'); row.className = 'toolchain-row';
    const need = scene.objects.some(o => o.scripts?.some(s => s.enabled && s.language === item.language));
    row.textContent = (item.available ? '✓ ' : '○ ') + toolchainNames[item.language] + ' · ' + (item.available ? item.version : 'belum terdeteksi') + (need ? ' · diperlukan scene' : '');
    box.append(row);
  }
};
