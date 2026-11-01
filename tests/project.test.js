import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { VirtualProject } from '../src/project.js';
const { ProjectStore } = createRequire(import.meta.url)('../desktop/project-store.cjs');
test('virtual project files persist through serialization and revision checks', () => {
  const p = new VirtualProject([]); p.create('Scripts','folder'); p.create('Scripts/Main.js','file','first');
  const file = p.read('Scripts/Main.js'); p.write('Scripts/Main.js','edited',file.revision);
  assert.throws(() => p.write('Scripts/Main.js','stale',file.revision));
  const restored = new VirtualProject(JSON.parse(JSON.stringify(p.entries)));
  assert.equal(restored.read('Scripts/Main.js').content,'edited');
  for(const path of ['../escape.js','/tmp/a','Scripts/../x','.git/config','CON','bad\\name']) assert.throws(() => p.create(path,'file'));
});
test('desktop folder creates and saves actual files, rejects conflicts and path escape', async () => {
  const root = await mkdtemp(join(tmpdir(),'ravs-project-'));
  try {
    const p = new ProjectStore(); await p.select(root); await p.create('Scripts','folder'); await p.create('Scripts/Main.js','file','original');
    const file = await p.read('Scripts/Main.js'); await p.write('Scripts/Main.js','saved',file.revision);
    assert.equal(await readFile(join(root,'Scripts/Main.js'),'utf8'),'saved');
    await assert.rejects(p.create('Scripts/Main.js','file','overwrite'));
    const saved = await p.read('Scripts/Main.js'); await writeFile(join(root,'Scripts/Main.js'),'external change');
    await assert.rejects(p.write('Scripts/Main.js','overwrite',saved.revision),/berubah/);
    for(const path of ['../outside','/etc/passwd','.git/config','Scripts/../secret']) await assert.rejects(p.read(path));
    await writeFile(join(root,'binary.bin'),Buffer.from([1,0,2])); await assert.rejects(p.read('binary.bin'),/biner/);
    if(process.platform !== 'win32') { await symlink(tmpdir(),join(root,'outside')); await assert.rejects(p.read('outside/secret'),/Symlink/); }
    assert.ok((await p.list()).entries.some(e=>e.path==='Scripts/Main.js'));
  } finally { await rm(root,{recursive:true,force:true}); }
});
