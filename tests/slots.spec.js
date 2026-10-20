// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Slot contract (README §4.4, SKILL §13): what a site-root slot override can
 * rely on without touching framework internals — the `slotify:slot` event and
 * its `ctx`, and the semantic `slotify:theme` / `slotify:locale` broadcasts.
 *
 * Events are recorded by an init script that runs before the SPA boots, so the
 * FIRST mount on a direct deep link is observed. Each record keeps only plain
 * data (ctx carries functions and a live route object). The exampleSite's Giscus
 * override injects giscus.app on mount; that request is aborted so these tests
 * never depend on a third-party host.
 */

const A_POST = '/posts/quick-start/';
const BOTTOM_ID = 'Slotify.slots.postView.bottom';

async function recordSlotEvents(page) {
  await page.route('https://giscus.app/**', (route) => route.abort());
  await page.addInitScript(() => {
    window.__slotEvents = [];
    window.addEventListener('slotify:slot', (event) => {
      const { id, phase, ctx, el } = event.detail;
      window.__slotEvents.push({
        type: 'slot',
        id,
        phase,
        hasEl: el instanceof HTMLElement,
        siteTitle: ctx && ctx.siteConfig ? ctx.siteConfig.title : undefined,
        routePath: ctx && ctx.route ? ctx.route.path : undefined,
        theme: ctx ? ctx.theme : undefined,
        tIsFunction: Boolean(ctx) && typeof ctx.t === 'function',
        pageIdentifier: ctx ? ctx.pageIdentifier : undefined,
        hasPageData: Boolean(ctx && ctx.pageData),
      });
    });
    window.addEventListener('slotify:theme', (event) => {
      window.__slotEvents.push({ type: 'theme', detail: event.detail });
    });
    window.addEventListener('slotify:locale', (event) => {
      window.__slotEvents.push({ type: 'locale', detail: event.detail });
    });
  });
}

const eventsOf = (page, type) =>
  page.evaluate((t) => window.__slotEvents.filter((e) => e.type === t), type);

async function waitForMount(page) {
  await expect(page.locator('#app')).not.toBeEmpty();
  await expect(page.locator('#loading-guide')).toHaveCount(0, { timeout: 15_000 });
}

test('a deep-linked post mounts postView/bottom with a complete ctx', async ({ page }) => {
  await recordSlotEvents(page);
  await page.goto(A_POST);
  await waitForMount(page);

  await expect.poll(async () => (await eventsOf(page, 'slot'))
    .filter((e) => e.id === BOTTOM_ID && e.phase === 'mount').length).toBe(1);
  const [mount] = (await eventsOf(page, 'slot'))
    .filter((e) => e.id === BOTTOM_ID && e.phase === 'mount');

  // Event detail shape: { id, phase, ctx, el }.
  expect(mount.hasEl).toBe(true);
  // Reserved ambient keys, populated at the FIRST mount (no readiness gate).
  expect(mount.siteTitle).toBeTruthy();
  expect(mount.routePath).toBe(A_POST);
  expect(mount.theme).toEqual({
    name: expect.any(String),
    personality: expect.any(String),
    mode: expect.stringMatching(/^(light|dark)$/),
  });
  expect(mount.tIsFunction).toBe(true);
  // Local keys merged in by the PostView mount site.
  expect(mount.pageIdentifier).toBeTruthy();
  expect(mount.hasPageData).toBe(true);
});

test('theme and locale changes broadcast semantic slotify:* events', async ({ page }) => {
  await recordSlotEvents(page);
  await page.goto(A_POST);
  await waitForMount(page);

  const before = await page.evaluate(() =>
    document.documentElement.classList.contains('v-theme--dark') ? 'dark' : 'light');
  await page.getByRole('button', { name: /Switch to (Dark|Light) Mode/ }).click();
  await expect.poll(async () => (await eventsOf(page, 'theme')).length).toBeGreaterThan(0);
  const [theme] = (await eventsOf(page, 'theme')).slice(-1);
  expect(theme.detail).toEqual({
    name: expect.any(String),
    personality: expect.any(String),
    mode: before === 'dark' ? 'light' : 'dark',
  });

  await page.getByTitle('Switch Language').click();
  await expect.poll(async () => (await eventsOf(page, 'locale')).length).toBeGreaterThan(0);
  const [locale] = (await eventsOf(page, 'locale')).slice(-1);
  expect(locale.detail).toEqual({ locale: expect.any(String) });
  expect(locale.detail.locale).not.toBe('en');
});

test('slotify:locale follows the locale state, not a specific setter', async ({ page }) => {
  await recordSlotEvents(page);
  await page.goto(A_POST);
  await waitForMount(page);

  // Change the locale WITHOUT setLocale(): write the shared state directly. The
  // dynamic import resolves to the same module instance the SPA loaded, so only
  // a watch on that state (not an emit inside a setter) can broadcast this.
  await page.evaluate(async () => {
    const { currentLocale } = await import('/js/i18n.js');
    currentLocale.value = 'zh';
  });
  await expect.poll(async () => (await eventsOf(page, 'locale')).length).toBe(1);
  const [locale] = await eventsOf(page, 'locale');
  expect(locale.detail).toEqual({ locale: 'zh' });
});
