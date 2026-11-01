import { _electron as electron } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const profile = await mkdtemp(join(tmpdir(), 'ravs-desktop-test-'));
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
  await page.locator('#save').click(); await page.reload();
  await page.waitForSelector('#hierarchy button');
  assert.equal(await page.locator('#hierarchy button').count(), 4);
  await page.locator('#play').click(); assert.equal(await page.locator('#box').isDisabled(), true);
  await page.locator('#play').click(); assert.equal(await page.locator('#box').isEnabled(), true);
  assert.deepEqual(errors, []);
  console.log('PASS: Electron file startup, isolated renderer, WebGL 3D, scene editing, persistence, Play/Stop');
} finally { await app.close(); await rm(profile, { recursive: true, force: true }); }
