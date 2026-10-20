// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Responsive guards. The header, pagination, and card layout all depend on
 * breakpoints / container queries, so these run across the desktop, mobile, and
 * tablet projects (playwright.config.js). They assert two things no smoke test
 * covers: the page never scrolls sideways, and the app header fits its width
 * (controls collapse into the drawer below md rather than overflowing).
 */

const ROUTES = ['/', '/tags/', '/search/', '/posts/quick-start/'];

async function waitForMount(page) {
  await expect(page.locator('#app')).not.toBeEmpty();
  await expect(page.locator('#loading-guide')).toHaveCount(0, { timeout: 15_000 });
}

for (const route of ROUTES) {
  test(`no horizontal overflow @ ${route}`, async ({ page }) => {
    await page.goto(route);
    await waitForMount(page);
    const { scrollW, clientW } = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    // +1 absorbs sub-pixel rounding; anything more is a real sideways scroll.
    expect(
      scrollW,
      `${route}: page overflows horizontally (scrollWidth ${scrollW} > clientWidth ${clientW})`
    ).toBeLessThanOrEqual(clientW + 1);
  });
}

test('app header fits within its own width', async ({ page }) => {
  await page.goto('/');
  await waitForMount(page);
  const bar = page.locator('.v-app-bar').first();
  await expect(bar).toBeVisible();
  const overflow = await bar.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow, 'app header controls overflow the bar width').toBeLessThanOrEqual(1);
});
