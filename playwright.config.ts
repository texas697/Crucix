import { defineConfig, devices } from '@playwright/test';

// P0 browser harness. Runs the legacy UI against the loopback fixture server (test/fixtures/server.mjs)
// with every third-party request routed to pinned local copies by test/e2e helpers. No credentials,
// no collectors, no production writes.
//
// testDir is test/e2e only. Vitest (added in P1/P2) must exclude test/e2e, and `npm test` (node --test
// over test/*.test.mjs) never collects these files.
const PORT = Number(process.env.FIXTURE_PORT) || 4173;
const baseURL = `http://127.0.0.1:${PORT}`;
// A second fixture server serves the built React surfaces (requires `npm run build`); the react-*
// specs target it. When the build is absent the server falls back to legacy and those specs skip.
const REACT_PORT = PORT + 1;
const reactBaseURL = `http://127.0.0.1:${REACT_PORT}`;

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', testIgnore: /[\\/]react-[^\\/]*\.spec\.ts$/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions: { args: ['--force-color-profile=srgb'] } } },
    { name: 'chromium-mobile', testIgnore: /[\\/]react-[^\\/]*\.spec\.ts$/, use: { ...devices['Pixel 7'], launchOptions: { args: ['--force-color-profile=srgb'] } } },
    // Smoke coverage on the other engines (core navigation/reader/media) per section 6.
    { name: 'firefox-smoke', testIgnore: /[\\/]react-[^\\/]*\.spec\.ts$/, use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } }, grep: /@smoke/ },
    { name: 'webkit-smoke', testIgnore: /[\\/]react-[^\\/]*\.spec\.ts$/, use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } }, grep: /@smoke/ },
    // Migrated React surfaces, served from the built bundle on the second fixture server.
    { name: 'react-chromium', testMatch: /[\\/]react-[^\\/]*\.spec\.ts$/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: reactBaseURL, launchOptions: { args: ['--force-color-profile=srgb'] } } },
    { name: 'react-mobile', testMatch: /[\\/]react-[^\\/]*\.spec\.ts$/, use: { ...devices['Pixel 7'], baseURL: reactBaseURL, launchOptions: { args: ['--force-color-profile=srgb'] } } },
  ],
  webServer: [
    {
      command: 'node test/fixtures/server.mjs',
      url: `${baseURL}/api/healthz`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        PORT: String(PORT),
        FIXTURE: process.env.FIXTURE || 'minimal',
        FIXTURE_STATE: process.env.FIXTURE_STATE || 'ready',
        AUTH_MODE: process.env.AUTH_MODE || 'off',
        HOSTING_PROXY: process.env.HOSTING_PROXY || 'false',
      },
    },
    {
      command: 'node test/fixtures/server.mjs',
      url: `${reactBaseURL}/api/healthz`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        PORT: String(REACT_PORT),
        FIXTURE: process.env.FIXTURE || 'minimal',
        FIXTURE_STATE: process.env.FIXTURE_STATE || 'ready',
        AUTH_MODE: process.env.AUTH_MODE || 'off',
        HOSTING_PROXY: process.env.HOSTING_PROXY || 'false',
        FIXTURE_UI: 'react',
      },
    },
  ],
});
