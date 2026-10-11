const { defineConfig, devices } = require('@playwright/test');

const PORT = Number(process.env.PORT) || 4175;

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  outputDir: process.env.PW_OUT || 'test-results',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
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
