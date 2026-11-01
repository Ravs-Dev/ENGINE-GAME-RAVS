import { VirtualProject, download } from './project.js';
export function createProjectPanel({ getScene, loadScene, getSplash, setSplash, status }) {
  const $ = id => document.getElementById(id), storageKey = 'ravs.project.files.v1';
  let virtual;
  try { const saved = localStorage.getItem(storageKey); virtual = new VirtualProject(saved ? JSON.parse(saved) : undefined); }
  catch { virtual = new VirtualProject(); status('Data file lokal tidak valid; proyek contoh dimuat.'); }
  let disk = false, listing = virtual.list(), selectedFolder = '', open = null, savedText = '';
  const dirty = () => !!open && $('code').value !== savedText;
  const unwrap = result => { if (!result.ok) throw Error(result.error); return result.data; };
  const persist = () => { const data = JSON.stringify(virtual.entries); if (data.length > 5e6) throw Error('Proyek lokal melebihi 5 MB; ekspor backup atau gunakan folder disk.'); localStorage.setItem(storageKey, data); };
  const read = async path => disk ? unwrap(await window.ravsDesktop.readFile(path)) : virtual.read(path);
  async function reload() { listing = disk ? unwrap(await window.ravsDesktop.listFiles()) : virtual.list(); render(); }
  const discard = () => !dirty() || confirm('File memiliki perubahan belum disimpan. Buang perubahan teks?');
  function render() {
    $('projectTitle').textContent = listing.name + (disk ? ' · folder disk' : ' · lokal aplikasi');
    $('fileTree').replaceChildren();
    const root = document.createElement('button'); root.textContent = '⌂ Root proyek'; root.onclick = () => { selectedFolder = ''; render(); }; root.className = !selectedFolder ? 'selected' : ''; $('fileTree').append(root);
    for (const entry of [...listing.entries].sort((a,b) => a.path.localeCompare(b.path))) {
      const b = document.createElement('button'); b.className = (entry.type === 'folder' && selectedFolder === entry.path || open?.path === entry.path) ? 'selected' : '';
      b.textContent = '　'.repeat(entry.path.split('/').length-1) + (entry.type === 'folder' ? '▸ ' : '▤ ') + entry.path.split('/').at(-1);
      b.title = entry.path; b.dataset.path = entry.path;
      b.onclick = async () => { try {
        if (entry.type === 'folder') { selectedFolder = entry.path; render(); return; }
        if (!discard()) return;
        const data = await read(entry.path); open = {path:entry.path,revision:data.revision}; savedText = data.content; $('code').value = data.content;
        selectedFolder = entry.path.split('/').slice(0,-1).join('/'); render(); $('code').focus();
      } catch(e) { status(e.message); } };
      $('fileTree').append(b);
    }
    $('filePath').textContent = open ? open.path + (dirty() ? ' • belum disimpan' : '') : 'Pilih file teks atau script';
    $('code').disabled = !open; $('saveFile').disabled = !open; $('fileFolder').textContent = 'Tujuan: /' + selectedFolder;
    if (listing.truncated) status('Daftar dibatasi 2000 entri / kedalaman 8; beberapa isi folder tidak ditampilkan.');
  }
  async function create(type, suppliedName, content = '') {
    const name = suppliedName ?? $('entryName').value.trim();
    if (!name || name.includes('/') || name.includes('\\')) throw Error('Isi satu nama file/folder, tanpa pemisah path.');
    const path = (selectedFolder ? selectedFolder + '/' : '') + name;
    if (disk) unwrap(await window.ravsDesktop.createEntry(path,type,content)); else { virtual.create(path,type,content); persist(); }
    $('entryName').value = ''; await reload();
    if (type === 'folder') { selectedFolder = path; render(); }
    else { const button = [...$('fileTree').querySelectorAll('button')].find(b => b.dataset.path === path); button?.click(); }
  }
  $('addFile').onclick = () => create('file').catch(e => status(e.message));
  $('addFolder').onclick = () => create('folder').catch(e => status(e.message));
  $('saveFile').onclick = async () => { try {
    if (!open) return; const content = $('code').value;
    const result = disk ? unwrap(await window.ravsDesktop.writeFile(open.path,content,open.revision)) : virtual.write(open.path,content,open.revision);
    if (!disk) persist(); open.revision = result.revision; savedText = content; render(); status('File tersimpan: ' + open.path);
  } catch(e) { status(e.message); } };
  $('code').oninput = () => { $('filePath').textContent = open.path + (dirty() ? ' • belum disimpan' : ''); };
  $('code').addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); e.stopPropagation(); $('saveFile').click(); }
    if (e.key === 'Tab') { e.preventDefault(); const input = e.target; input.setRangeText('  ', input.selectionStart,input.selectionEnd,'end'); input.dispatchEvent(new Event('input')); }
  });
  $('openProject').disabled = !window.ravsDesktop?.selectProject;
  $('openProject').onclick = async () => { try {
    if (!discard()) return; const result = unwrap(await window.ravsDesktop.selectProject()); if (!result) return;
    disk = true; listing = result; selectedFolder = ''; open = null; savedText = ''; $('code').value = ''; render();
  } catch(e) { status(e.message); } };
  $('refreshFiles').onclick = () => reload().catch(e => status(e.message));
  $('importText').onchange = async e => { try {
    for (const file of e.target.files) { if (file.size > 1024*1024) throw Error('Batas file teks 1 MB.'); const buffer = await file.arrayBuffer(); const content = new TextDecoder('utf-8',{fatal:true}).decode(buffer); if (content.includes('\0')) throw Error('File biner tidak didukung editor teks.'); await create('file',file.name,content); }
  } catch(error) { status(error.message); } e.target.value = ''; };
  $('exportProject').onclick = async () => { try {
    if (dirty()) throw Error('Simpan file yang sedang diedit sebelum ekspor proyek.');
    const entries = []; let size = 0;
    for (const e of listing.entries) { const item = {...e}; if (e.type === 'file') item.content = (await read(e.path)).content; size += JSON.stringify(item).length; if(size > 5e6) throw Error('Batas ekspor proyek teks 5 MB.'); entries.push(item); }
    download('project.ravsproject.json',JSON.stringify({version:1,entries,scene:getScene(),splash:getSplash()},null,2)); status('Backup proyek diekspor: file, scene, dan loading screen.');
  } catch(e) { status(e.message); } };
  $('importProject').onchange = async e => { try {
    const file = e.target.files[0]; if (!file || !discard()) return; if(file.size > 6e6) throw Error('Batas proyek 6 MB.');
    const data = JSON.parse(await file.text()); if(data.version !== 1) throw Error('Format proyek tidak didukung.');
    const replacement = new VirtualProject(data.entries);
    // Scene and splash are validated by the editor before replacing the active project.
    loadScene(data.scene, data.splash);
    virtual = replacement; disk = false; listing = virtual.list(); open = null; selectedFolder = ''; savedText = ''; $('code').value = ''; persist(); render(); status('Backup proyek berhasil dibuka sebagai proyek lokal.');
  } catch(error) { status('Impor proyek gagal: ' + error.message); } e.target.value = ''; };
  render();
  return { dirty, saveActive: () => $('saveFile').click(), hasTextFocus: () => document.activeElement === $('code') };
}
