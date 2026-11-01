import { createObject, demoScene, parseScene, step } from './scene.js';
import { createViewport } from './viewport.js';
const $ = id => document.getElementById(id);
const keys = new Set(), storageKey = 'ravs.scene.3d.v2';
let scene = demoScene(), selected = scene.objects[1].id, backup = null, last = 0;
const status = text => $('status').textContent = text;
try { const saved = localStorage.getItem(storageKey); if (saved) scene = parseScene(saved); }
catch { status('Data 3D lokal tidak valid. Demo dimuat.'); }
let viewport;
try {
  viewport = createViewport($('canvas'), id => { if (!backup) { selected = id; refresh(); } }, (id, mesh) => {
    const o = scene.objects.find(o => o.id === id);
    if (!o || backup) return;
    for (const a of ['x', 'y', 'z']) {
      o.position[a] = mesh.position[a]; o.rotation[a] = mesh.rotation[a] * 180 / Math.PI;
      o.scale[a] = Math.max(0.05, Math.min(1000, mesh.scale[a]));
    }
    refresh();
  });
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
    target[key] = value; refresh();
  };
  row.append(input); parent.append(row);
}
function refresh() {
  const hierarchy = $('hierarchy'), inspector = $('inspector'); hierarchy.replaceChildren(); inspector.replaceChildren();
  for (const o of scene.objects) {
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
      b.onclick = () => { action(); refresh(); }; inspector.append(b);
    }
  } else inspector.textContent = 'Pilih objek di viewport atau hierarchy.';
  $('name').value = scene.name; $('gravity').value = scene.gravity; $('sceneName').textContent = scene.name;
  for (const id of ['box', 'sphere', 'demo', 'save', 'export', 'import', 'name', 'gravity', 'mode']) $(id).disabled = !!backup;
  viewport?.sync(scene, selected, !!backup);
}
for (const kind of ['box', 'sphere']) $(kind).onclick = () => { const o = createObject(kind); scene.objects.push(o); selected = o.id; refresh(); };
$('mode').onchange = e => viewport?.setMode(e.target.value);
$('name').onchange = e => { scene.name = e.target.value; refresh(); };
$('gravity').onchange = e => { const n = Number(e.target.value); if (Number.isFinite(n)) scene.gravity = Math.max(0, Math.min(10000, n)); refresh(); };
$('save').onclick = () => { try { localStorage.setItem(storageKey, JSON.stringify(scene)); status('Scene 3D tersimpan di browser.'); } catch (e) { status(e.message); } };
$('export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'scene.ravs3d.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('import').onchange = async e => {
  try { const file = e.target.files[0]; if (!file) return; if (file.size > 5e6) throw Error('Batas ukuran 5 MB'); scene = parseScene(await file.text()); selected = null; refresh(); status('Scene 3D berhasil diimpor.'); }
  catch (error) { status('Impor gagal: ' + error.message); } e.target.value = '';
};
$('demo').onclick = () => { if (confirm('Ganti scene aktif dengan demo 3D? Ekspor dahulu untuk backup.')) { scene = demoScene(); selected = scene.objects[1].id; refresh(); } };
$('play').onclick = () => {
  if (backup) { scene = backup; backup = null; keys.clear(); $('play').textContent = '▶ Play'; status('Edit mode'); }
  else { backup = structuredClone(scene); $('play').textContent = '■ Stop'; $('canvas').focus(); status('Play mode · WASD / tombol panah'); }
  refresh();
};
window.addEventListener('keydown', e => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (backup && ['a', 'd', 'w', 's', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) { keys.add(key); e.preventDefault(); }
});
window.addEventListener('keyup', e => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
window.addEventListener('blur', () => keys.clear());
function frame(time) {
  if (backup) step(scene, (time - last) / 1000, keys); last = time;
  viewport?.sync(scene, selected, !!backup); viewport?.render(); requestAnimationFrame(frame);
}
refresh(); requestAnimationFrame(frame);
