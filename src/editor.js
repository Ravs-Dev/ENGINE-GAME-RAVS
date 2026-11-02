import logo from '../assets/ravs-logo.png';
import { createProjectPanel } from './project-panel.js';
import { createGameHTML, validateSplash } from './game-export.js';
import { download } from './project.js';
import { createObject, demoScene, parseScene, step } from './scene.js';
import { History } from './history.js';
import { createViewport } from './viewport.js';
const $ = id => document.getElementById(id);
const keys = new Set(), storageKey = 'ravs.scene.3d.v2';
let scene = demoScene(), selected = scene.objects[1].id, backup = null, last = 0;
const status = text => $('status').textContent = text;
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
    field(inspector, 'Warna', o, 'color', 'color');
    field(inspector, 'Rigidbody', o.body, 'enabled', 'checkbox');
    field(inspector, 'Bounce', o.body, 'bounce', 'number', 0, 1);
    field(inspector, 'Controller', o.motion, 'enabled', 'checkbox');
    field(inspector, 'Kecepatan', o.motion, 'speed', 'number', 0, 100);
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
  for (const id of ['box', 'sphere', 'cylinder', 'new', 'background', 'grid', 'snap', 'exportGame', 'demo', 'save', 'export', 'import', 'name', 'gravity', 'mode']) $(id).disabled = !!backup;
  $('background').value = scene.background ?? '#080808';
  $('grid').checked = scene.grid ?? true;
  refreshHistory();
  viewport?.sync(scene, selected, !!backup);
}
for (const kind of ['box', 'sphere', 'cylinder']) $(kind).onclick = () => { const o = createObject(kind); scene.objects.push(o); selected = o.id; record(); refresh(); };
$('undo').onclick = () => restoreHistory('undo');
$('redo').onclick = () => restoreHistory('redo');
$('search').oninput = refresh;
$('background').onchange = e => { scene.background = e.target.value; record(); refresh(); };
$('grid').onchange = e => { scene.grid = e.target.checked; record(); refresh(); };
$('snap').onchange = e => viewport?.setSnap(e.target.checked);
$('cameraView').onchange = e => viewport?.setView(e.target.value);
$('frameAll').onclick = () => viewport?.frameAll();
$('focusSelection').onclick = () => viewport?.focus(selected);
$('new').onclick = () => {
  if (!confirm('Buat scene kosong? Scene saat ini bisa dipulihkan dengan Undo.')) return;
  scene = { version: 2, name: 'Untitled Scene', gravity: 9.81, background: '#080808', grid: true, objects: [] };
  selected = null; record(); refresh();
};
$('mode').onchange = e => viewport?.setMode(e.target.value);
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
$('play').onclick = () => {
  if (backup) { scene = backup; backup = null; keys.clear(); hideSplash(); $('play').textContent = '▶ Play'; status('Edit mode'); }
  else { backup = structuredClone(scene); $('play').textContent = '■ Stop'; $('canvas').focus(); status('Play mode · WASD / tombol panah'); showSplash(); }
  refresh();
};
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
  if (backup && !splashActive) step(scene, (time - last) / 1000, keys); last = time;
  viewport?.sync(scene, selected, !!backup); viewport?.render(); requestAnimationFrame(frame);
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
refresh(); requestAnimationFrame(frame); showSplash();
