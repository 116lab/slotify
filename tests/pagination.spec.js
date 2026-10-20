// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Static-pagination flows (paginationMode = "static").
 *
 * This project's baseURL points at a server running the exampleSite with
 * HUGO_PARAMS_PAGINATIONMODE=static (see playwright.config.js). In that mode
 * Hugo's build-time paginator emits a real HTML+JSON document per page at
 * /page/N/ (home) and /tags/<term>/page/N/ (taxonomy term), and the SPA navigates
 * between them — page state lives in the URL, not in memory.
 *
 * These assert what the Hugo/JSON validators can't: that the SPA boots a sliced
 * feed, that the pager navigates (changing the URL and the cards), that a deep
 * link to /page/N/ resolves and highlights the right page, that page 1
 * canonicalizes, and that sections (which never paginate) emit no pager pages.
 * exampleSite ships pagerSize = 5; adjust the counts if that or the post set
 * changes.
 */

const PAGER_SIZE = 5;

/** Collect SPA-origin console/page errors (third-party widgets ignored). */
function trackErrors(page, baseURL) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const url = msg.location()?.url || '';
    if (url && baseURL && !url.startsWith(baseURL)) return;
    errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  return errors;
}

async function waitForMount(page) {
  await expect(page.locator('#app')).not.toBeEmpty();
  await expect(page.locator('#loading-guide')).toHaveCount(0, { timeout: 15_000 });
}

const postLinks = (page) => page.locator('a[href^="/posts/"]');
/** Click a Vuetify v-pagination page button by its visible number. */
const gotoPager = (page, n) =>
  page.locator('.v-pagination button', { hasText: new RegExp(`^${n}$`) }).first().click();

test('project runs against a paginationMode=static server', async ({ page }) => {
  // Fail fast if the baseURL is serving the wrong mode — a client-mode dev server
  // left running on this port would be reused (reuseExistingServer) and silently
  // invalidate every assertion below. Pin the mode the SPA actually booted with.
  await page.goto('/');
  const mode = await page.evaluate(() => window.__SLOTIFY_CONFIG__?.paginationMode);
  expect(mode, 'expected a static-mode server on this baseURL').toBe('static');
});

test('home boots a server-sliced first page with a pager', async ({ page, baseURL }) => {
  const errors = trackErrors(page, baseURL);
  await page.goto('/');
  await waitForMount(page);
  // Static mode ships only this page's cards, not the whole feed.
  await expect(postLinks(page)).toHaveCount(PAGER_SIZE);
  // More than one page of posts -> the pager renders (v-pagination hides at 1).
  await expect(page.locator('.v-pagination')).toBeVisible();
  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('clicking the pager navigates to /page/N and swaps the cards', async ({ page, baseURL }) => {
  const errors = trackErrors(page, baseURL);
  await page.goto('/');
  await waitForMount(page);
  const firstOnP1 = await postLinks(page).first().getAttribute('href');

  await gotoPager(page, 2);
  await expect(page).toHaveURL(/\/page\/2\/?$/);
  // The view remounts on the route change and re-fetches; #loading-guide is long
  // gone, so instead wait (retrying) for the feed itself to swap — the first card
  // is no longer page 1's. This is the signal that page 2's JSON has rendered.
  await expect(postLinks(page).first()).not.toHaveAttribute('href', firstOnP1 || '');
  await expect(postLinks(page)).toHaveCount(PAGER_SIZE);
  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('deep-linking /page/3/ resolves (200) and highlights page 3', async ({ page, baseURL }) => {
  const errors = trackErrors(page, baseURL);
  const res = await page.goto('/page/3/');
  expect(res?.status(), 'pager URL must serve real HTML, not 404').toBe(200);
  await waitForMount(page);
  // The active pager item reflects the URL, so a fresh deep link starts on page 3.
  await expect(page.locator('.v-pagination__item--is-active')).toHaveText('3');
  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('/page/1/ canonicalizes to the bare home URL', async ({ page, baseURL }) => {
  await page.goto('/page/1/');
  await waitForMount(page);
  await expect(page).toHaveURL(`${baseURL}/`);
});

test('taxonomy term pages paginate to /tags/<term>/page/N', async ({ page, baseURL }) => {
  const errors = trackErrors(page, baseURL);
  // 'basics' has more than one page of posts in exampleSite.
  await page.goto('/tags/basics/');
  await waitForMount(page);
  await expect(page.locator('.v-pagination')).toBeVisible();

  await gotoPager(page, 2);
  await expect(page).toHaveURL(/\/tags\/basics\/page\/2\/?$/);
  await waitForMount(page);
  // Page 2 still resolves a term list (at least one post), not a mis-routed view.
  await expect(postLinks(page).first()).toBeVisible();
  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('a pager page lists the same posts in its HTML body and its JSON', async ({ request }) => {
  // func/feed-pages.html is the single source for both outputs, so the crawlable
  // seobody of /page/2/index.html and the SPA's /page/2/index.json must range the
  // exact same posts in the exact same order. Fetched raw (no SPA boot): the
  // seobody is what a crawler sees before the app takes over.
  const html = await (await request.get('/page/2/')).text();
  const list = html.match(/<ul class="seo-post-list">([\s\S]*?)<\/ul>/);
  expect(list, 'page 2 must render the crawlable seo-post-list').not.toBeNull();
  const htmlUrls = [...list[1].matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);

  const json = await (await request.get('/page/2/index.json')).json();
  const jsonUrls = json.posts.map((p) => p.url);

  expect(htmlUrls.length).toBeGreaterThan(0);
  expect(htmlUrls).toEqual(jsonUrls);
});

test('sections are not paginated (no /posts/page/N pager page)', async ({ page }) => {
  // Only home + taxonomy terms paginate in static mode; sections ship their full
  // list, so Hugo emits no /posts/page/N pager page (and the router does not
  // canonicalize one). Pinning the 404 guards that scope boundary against a future
  // change that starts emitting — or silently stripping — section pagers.
  const res = await page.goto('/posts/page/2/');
  expect(res?.status(), 'section pager page must not exist').toBe(404);
});
