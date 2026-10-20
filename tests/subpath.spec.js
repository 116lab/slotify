// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Subpath deployment (the `subpath` project: the exampleSite served under
 * /slotify/, like a GitHub Pages project site). Templates emit base-less route
 * targets (func/route-path.html) and the router / withBase re-add the base, so
 * links and fetches carry the base exactly once — never /slotify/slotify/.
 */

const BASE = '/slotify/';

async function waitForMount(page) {
  await expect(page.locator('#app')).not.toBeEmpty();
  await expect(page.locator('#loading-guide')).toHaveCount(0, { timeout: 15_000 });
}

/** Same-origin responses that failed (a doubled or missing base 404s). */
function trackFailures(page) {
  const failures = [];
  page.on('response', (res) => {
    if (res.url().startsWith('http://localhost:1315/') && res.status() >= 400) {
      failures.push(`${res.status()} ${res.url()}`);
    }
  });
  return failures;
}

test('links and navigation under a subpath carry the base exactly once', async ({ page }) => {
  const failures = trackFailures(page);
  await page.goto('');
  await waitForMount(page);

  const postLink = page.locator(`a[href^="${BASE}posts/"]`).first();
  await expect(postLink).toBeVisible();
  const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(hrefs.filter((h) => h.startsWith(`${BASE}slotify/`))).toEqual([]);

  const href = await postLink.getAttribute('href');
  await postLink.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.locator('#app h1').first()).toBeVisible();
  expect(failures).toEqual([]);
});

test('a deep link under a subpath loads the post', async ({ page }) => {
  const failures = trackFailures(page);
  const res = await page.goto('posts/quick-start/');
  expect(res?.status()).toBe(200);
  await waitForMount(page);
  await expect(page.locator('#app h1').first()).toHaveText(/Quick Start/);
  expect(failures).toEqual([]);
});
