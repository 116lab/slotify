// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright config for the Slotify theme browser smoke tests.
 *
 * The theme is a no-bundler SPA: the only runtime checks possible without a
 * browser are Hugo build + JSON validators. These tests cover the behaviour
 * those can't see — module loading, client-side routing, slot hydration,
 * Mermaid render, and code-copy — by driving a real `hugo server` of the
 * exampleSite. The webServer command mirrors the build command in the README
 * (`--themesDir ../..` because exampleSite sets `theme = 'slotify'` and the
 * theme lives in the repo root, one level above exampleSite's parent).
 */
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // CI also writes JUnit XML, uploaded with the Playwright report by GitHub Actions.
  reporter: process.env.CI
    ? [['list'], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : 'list',
  use: {
    baseURL: 'http://localhost:1313',
    trace: 'on-first-retry',
  },
  // Two servers, each PINNED to a pagination mode via `env` (the exampleSite
  // default is irrelevant to the suite, so both modes stay covered): client on
  // 1313 (full suite) and static on 1314 (the pagination.spec checks). `env`
  // sets the Hugo param cross-platform — no inline `VAR=val` shell prefix, which
  // Windows cmd wouldn't parse. Each server renders to its OWN --destination:
  // with --renderStaticToDisk a shared exampleSite/public would let the client
  // server fall back to the static server's (or a prior build's) /page/N/ files
  // on disk and boot them in the wrong mode.
  webServer: [
    {
      command: 'hugo server --source exampleSite --themesDir ../.. --port 1313 --disableFastRender --renderStaticToDisk --destination public-client',
      url: 'http://localhost:1313',
      env: { HUGO_PARAMS_PAGINATIONMODE: 'client' },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'hugo server --source exampleSite --themesDir ../.. --port 1314 --disableFastRender --renderStaticToDisk --destination public-static',
      url: 'http://localhost:1314',
      env: { HUGO_PARAMS_PAGINATIONMODE: 'static' },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    // A project-site deployment (e.g. GitHub Pages at /<repo>/) serves the site
    // under a subpath; this server mirrors that with --baseURL so the base-aware
    // routing contract is exercised, not just the root case.
    {
      command: 'hugo server --source exampleSite --themesDir ../.. --port 1315 --baseURL http://localhost:1315/slotify/ --disableFastRender --renderStaticToDisk --destination public-subpath',
      url: 'http://localhost:1315/slotify/',
      env: { HUGO_PARAMS_PAGINATIONMODE: 'client' },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
  projects: [
    // Desktop runs the full suite (the smoke flows assume the desktop header
    // layout) EXCEPT the static-pagination and subpath specs, which point at the
    // 1314 and 1315 servers.
    { name: 'chromium', testIgnore: /(pagination|subpath)\.spec\.js/, use: { ...devices['Desktop Chrome'] } },
    // Static-pagination flows: same desktop engine, baseURL -> the 1314
    // (paginationMode=static) server. Scoped to pagination.spec.js only.
    { name: 'static-pagination', testMatch: /pagination\.spec\.js/, use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:1314' } },
    // Subpath deployment: baseURL -> the 1315 server under /slotify/.
    { name: 'subpath', testMatch: /subpath\.spec\.js/, use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:1315/slotify/' } },
    // Mobile + tablet run ONLY the responsive checks — testMatch scopes them so
    // the smoke flows (which click desktop-only header links) don't run there.
    { name: 'mobile', testMatch: /responsive\.spec\.js/, use: { ...devices['Pixel 5'] } },
    // Tablet width on the Chromium engine (a real iPad device profile would pull
    // in WebKit); ~820px lands in Vuetify's `sm` band, between mobile and desktop.
    { name: 'tablet', testMatch: /responsive\.spec\.js/, use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 } } },
  ],
});
