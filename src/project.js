export const validPath = path => typeof path === 'string' && path.length > 0 && path.length <= 500 && path.split('/').every(p => p && !p.startsWith('.') && !/[\\<>:"|?*\x00-\x1f]/.test(p) && !/[. ]$/.test(p) && !/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i.test(p));
export class VirtualProject {
  constructor(entries = [{ path: 'Scripts', type: 'folder' }, { path: 'Scripts/Main.js', type: 'file', content: '// Script proyek Ravs.\n// Editor ini menyimpan teks; script belum dieksekusi oleh engine.\n' }]) {
    if (!Array.isArray(entries) || entries.length > 2000 || JSON.stringify(entries).length > 5e6) throw Error('Data proyek tidak valid atau terlalu besar.');
    this.entries = []; this.revision = 0;
    for (const e of [...entries].sort((a,b) => String(a.path).split('/').length - String(b.path).split('/').length)) this.create(e.path, e.type, e.content ?? '');
  }
  list() { return { name: 'Proyek Lokal', entries: this.entries.map(({path,type}) => ({path,type})), truncated: false }; }
  create(path, type, content = '') {
    if (!validPath(path) || !['file','folder'].includes(type) || this.entries.some(e => e.path === path)) throw Error('Nama tidak valid atau sudah ada.');
    const parent = path.split('/').slice(0,-1).join('/');
    if (parent && !this.entries.some(e => e.path === parent && e.type === 'folder')) throw Error('Folder induk tidak ditemukan.');
    if (typeof content !== 'string' || new TextEncoder().encode(content).length > 1024 * 1024 || content.includes('\0')) throw Error('Batas file teks UTF-8 adalah 1 MB.');
    this.entries.push(type === 'file' ? {path,type,content,revision:++this.revision} : {path,type}); return this.list();
  }
  read(path) { const e = this.entries.find(e => e.path === path && e.type === 'file'); if (!e) throw Error('File tidak ditemukan.'); return {content:e.content,revision:e.revision}; }
  write(path, content, revision) {
    const e = this.entries.find(e => e.path === path && e.type === 'file');
    if (!e || e.revision !== revision) throw Error('File berubah. Buka ulang sebelum menyimpan.');
    if (typeof content !== 'string' || new TextEncoder().encode(content).length > 1024 * 1024 || content.includes('\0')) throw Error('Batas file teks adalah 1 MB.');
    e.content = content; e.revision = ++this.revision; return {revision:e.revision};
  }
}
export function download(name, content, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], {type})), a = document.createElement('a');
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
