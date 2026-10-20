// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Client-mode pagination (paginationMode = "client", the chromium project's
 * server — see playwright.config.js). Client mode ships the full feed and slices
 * it in memory, so there are no /page/N/ endpoints: router.js strips a pager
 * segment from any URL and lands on the base list, instead of letting the
 * catch-all Post / taxonomy-term routes mis-fetch a paginator shape.
 */

async function waitForMount(page) {
  await expect(page.locator('#app')).not.toBeEmpty();
  await expect(page.locator('#loading-guide')).toHaveCount(0, { timeout: 15_000 });
}

test('client mode strips a /page/N pager URL to its base list', async ({ page, baseURL }) => {
  await page.goto('/page/2/');
  await waitForMount(page);
  await expect(page).toHaveURL(`${baseURL}/`);
  // Landed on the home feed, not a mis-routed Post view.
  await expect(page.locator('a[href^="/posts/"]').first()).toBeVisible();
});
