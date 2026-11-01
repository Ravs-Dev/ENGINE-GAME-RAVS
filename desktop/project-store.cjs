const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const MAX_TEXT = 1024 * 1024;
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
class ProjectStore {
  constructor() { this.root = null; }
  async select(root) { this.root = await fs.realpath(root); if (!(await fs.stat(this.root)).isDirectory()) throw Error('Pilih sebuah folder.'); return this.list(); }
  async resolve(relative, allowMissing = false) {
    if (!this.root) throw Error('Pilih folder proyek terlebih dahulu.');
    if (typeof relative !== 'string' || relative.length > 500 || relative.includes('\\') || path.isAbsolute(relative)) throw Error('Path proyek tidak valid.');
    const parts = relative ? relative.split('/') : [];
    if (parts.some(p => !p || p.startsWith('.') || /[<>:"|?*\x00-\x1f]/.test(p) || /[. ]$/.test(p) || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i.test(p))) throw Error('Nama file/folder tidak valid atau dilindungi.');
    let result = this.root;
    for (let i = 0; i < parts.length; i++) {
      result = path.join(result, parts[i]);
      try { if ((await fs.lstat(result)).isSymbolicLink()) throw Error('Symlink tidak dibuka oleh editor proyek.'); }
      catch (error) { if (!(allowMissing && i === parts.length - 1 && error.code === 'ENOENT')) throw error; }
    }
    return result;
  }
  async list() {
    if (!this.root) throw Error('Pilih folder proyek terlebih dahulu.');
    const entries = []; let truncated = false;
    const walk = async (directory, prefix, depth) => {
      for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((a,b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))) {
        if (entry.name.startsWith('.') || ['node_modules', 'dist'].includes(entry.name) || entry.isSymbolicLink()) continue;
        if (entries.length >= 2000) { truncated = true; return; }
        const relative = prefix + entry.name;
        entries.push({ path: relative, type: entry.isDirectory() ? 'folder' : 'file' });
        if (entry.isDirectory()) { if (depth < 8) await walk(path.join(directory, entry.name), relative + '/', depth + 1); else truncated = true; }
      }
    };
    await walk(this.root, '', 0);
    return { name: path.basename(this.root), entries, truncated };
  }
  async read(relative) {
    const file = await this.resolve(relative), stat = await fs.stat(file);
    if (!stat.isFile() || stat.size > MAX_TEXT) throw Error('Editor teks mendukung file maksimal 1 MB.');
    const buffer = await fs.readFile(file);
    if (buffer.includes(0)) throw Error('File biner tidak dapat diedit sebagai teks.');
    let content;
    try { content = new TextDecoder('utf-8', { fatal: true }).decode(buffer); } catch { throw Error('File harus berupa teks UTF-8.'); }
    return { content, revision: hash(buffer) };
  }
  async create(relative, type, content = '') {
    const file = await this.resolve(relative, true);
    if (!relative) throw Error('Nama wajib diisi.');
    if (type === 'folder') await fs.mkdir(file);
    else if (type === 'file' && typeof content === 'string' && Buffer.byteLength(content) <= MAX_TEXT && !content.includes('\0')) await fs.writeFile(file, content, { flag: 'wx' });
    else throw Error('Tipe atau ukuran file tidak valid.');
    return this.list();
  }
  async write(relative, content, revision) {
    if (typeof content !== 'string' || (Buffer.byteLength(content) > MAX_TEXT || content.includes('\0'))) throw Error('Batas ukuran teks 1 MB.');
    const file = await this.resolve(relative), current = await this.read(relative);
    if (current.revision !== revision) throw Error('File berubah di luar editor. Buka ulang file sebelum menyimpan agar perubahan tidak tertimpa.');
    await fs.writeFile(file, content);
    return { revision: hash(Buffer.from(content)) };
  }
}
module.exports = { ProjectStore };
