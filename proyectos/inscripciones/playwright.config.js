const path = require('node:path');
const { defineConfig, devices } = require('@playwright/test');

const PORT = Number(process.env.PORT) || 4174;
const VIDEO = path.join(__dirname, 'tests', '.fixtures', 'qr.y4m');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  outputDir: process.env.PW_OUT || 'test-results',
  globalSetup: './tests/global-setup.js',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    permissions: ['camera'],
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-video-capture=${VIDEO}`
      ]
    }
  },
  webServer: {
    command: 'node tests/server.js',
    url: `http://localhost:${PORT}/index.html`,
    reuseExistingServer: true,
    env: { PORT: String(PORT) }
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1360, height: 860 } } },
    { name: 'movil', use: { ...devices['Pixel 7'] } }
  ]
});
