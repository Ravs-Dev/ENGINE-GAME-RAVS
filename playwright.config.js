import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', workers: 1,
  use: { baseURL: 'http://127.0.0.1:3100', launchOptions: {
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--enable-unsafe-swiftshader']
  } },
  webServer: { command: 'npm start', env: { PORT: '3100' }, url: 'http://127.0.0.1:3100', reuseExistingServer: false }
});
