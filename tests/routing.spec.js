// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Route vs in-page navigation (config/routes.js): anchor navigation (the Table
 * of Contents hash scroll) moves the viewport without changing the route or
 * refetching data. Runs on the client-mode server (chromium project).
 */

const A_POST = '/posts/quick-start/';

async function waitForMount(page) {
  await expect(page.locator('#app')).not.toBeEmpty();
  await expect(page.locator('#loading-guide')).toHaveCount(0, { timeout: 15_000 });
}

test('a Table of Contents click changes only the hash, with no route change or refetch', async ({ page, baseURL }) => {
  await page.goto(A_POST);
  await waitForMount(page);
  const tocLink = page.locator('.toc-link').nth(1);
  await expect(tocLink).toBeVisible();
  const href = await tocLink.getAttribute('href');

  const fetched = [];
  page.on('request', (req) => { if (req.url().endsWith('index.json')) fetched.push(req.url()); });

  await tocLink.click();
  await expect.poll(() => new URL(page.url()).hash).toBe(href);
  const url = new URL(page.url());
  expect(`${url.origin}${url.pathname}${url.search}`).toBe(`${baseURL}${A_POST}`);
  expect(fetched).toEqual([]);
});
