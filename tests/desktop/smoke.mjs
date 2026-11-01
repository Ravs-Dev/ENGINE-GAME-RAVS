import { _electron as electron } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
async function main() {
const profile = await mkdtemp(join(tmpdir(), 'ravs-desktop-test-'));
const projectRoot = await mkdtemp(join(tmpdir(), 'ravs-disk-project-'));
const headless = process.platform === 'linux' && !process.env.DISPLAY;
const app = await electron.launch({
  ...(process.env.DESKTOP_EXECUTABLE ? { executablePath: process.env.DESKTOP_EXECUTABLE } : {}),
  args: [...(process.env.DESKTOP_EXECUTABLE ? [] : ['.']), `--user-data-dir=${profile}`,
    ...(headless ? ['--ozone-platform=headless', '--enable-unsafe-swiftshader'] : [])],
  timeout: 30000
});
try {
  const page = await app.firstWindow();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.waitForSelector('#hierarchy button');
  assert.ok(page.url().startsWith('file:'));
  assert.equal(await page.locator('#hierarchy button').count(), 3);
  assert.ok(!(await page.locator('#status').textContent()).includes('gagal'));
  assert.equal(await page.evaluate(() => typeof require), 'undefined');
  assert.equal(await page.evaluate(() => typeof process), 'undefined');
  assert.equal(await page.locator('canvas').evaluate(c => {
    const gl = c.getContext('webgl2'); return !!gl && gl.getError() === gl.NO_ERROR;
  }), true);
  await page.locator('#box').click();
  assert.equal(await page.locator('#hierarchy button').count(), 4);
  await app.evaluate(({ Menu }) => Menu.getApplicationMenu().items.find(i => i.label === 'Edit').submenu.items.find(i => i.label === 'Undo').click());
  await page.waitForFunction(() => document.querySelectorAll('#hierarchy button').length === 3);
  await app.evaluate(({ Menu }) => Menu.getApplicationMenu().items.find(i => i.label === 'Edit').submenu.items.find(i => i.label === 'Redo').click());
  await page.waitForFunction(() => document.querySelectorAll('#hierarchy button').length === 4);
  await page.locator('#save').click(); await page.reload();
  await page.waitForSelector('#hierarchy button');
  assert.equal(await page.locator('#hierarchy button').count(), 4);
  await page.locator('#play').click(); assert.equal(await page.locator('#box').isDisabled(), true);
  await page.locator('#play').click(); assert.equal(await page.locator('#box').isEnabled(), true);
  await app.evaluate(({ dialog }, root) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [root] }); }, projectRoot);
  await page.locator('#openProject').click();
  await page.waitForFunction(() => document.getElementById('projectTitle').textContent.includes('folder disk'));
  await page.locator('#entryName').fill('Scripts'); await page.locator('#addFolder').click();
  await page.waitForFunction(() => document.getElementById('fileFolder').textContent.includes('/Scripts'));
  await page.locator('#entryName').fill('Main.js'); await page.locator('#addFile').click();
  await page.waitForFunction(() => document.getElementById('filePath').textContent === 'Scripts/Main.js');
  await page.locator('#code').fill('// Saved from Ravs desktop\nconst speed = 5;');
  await page.locator('#saveFile').click();
  await page.waitForFunction(() => document.getElementById('status').textContent.includes('File tersimpan'));
  assert.equal(await readFile(join(projectRoot,'Scripts','Main.js'),'utf8'),'// Saved from Ravs desktop\nconst speed = 5;');
  assert.deepEqual(errors, []);
  console.log('PASS: Electron file startup, isolated renderer, WebGL 3D, scene editing, persistence, Play/Stop');
} finally { await app.close(); await rm(profile, { recursive: true, force: true }); await rm(projectRoot, { recursive: true, force: true }); }

}
main().catch(error => {
  const message = String(error.stack || error).replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
  console.error(`::error title=Desktop smoke failure::${message}`);
  process.exitCode = 1;
});
