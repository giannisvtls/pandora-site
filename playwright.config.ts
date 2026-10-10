import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const BASE_URL = `http://localhost:${String(PORT)}`;

// The e2e suite runs against the built site (`astro build` + `astro preview`), not the dev server.
// `astro preview` does not apply dist/_redirects (the build writes it; the preview serves it as a
// plain file), so `/` is a 404 here: the server is probed on /en/, and e2e/seo.spec.ts checks the
// redirect line in the file.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // `open: 'never'`: the default html reporter serves the report on failure and blocks the gate.
  reporter: [[process.env.CI ? 'github' : 'list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run preview',
    url: `${BASE_URL}/en/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
