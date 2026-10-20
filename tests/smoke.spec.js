// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Browser smoke tests for the Slotify SPA (exampleSite).
 *
 * Goal: catch problems the Hugo/JSON validators can't see — a module that fails
 * to load, a router base mistake, broken slot hydration, a Mermaid or code-copy
 * error. These are shallow ("does it boot and move") rather than deep
 * behavioural assertions, so they stay stable as content changes. Adjust the
 * post path below if exampleSite content is renamed.
 */

const A_POST = '/posts/quick-start/';

/** Attach a console-error / pageerror collector; returns the captured list. */
function trackErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    // Count only errors from the SPA's own origin. A cross-origin location means a
    // third-party widget (e.g. a comments iframe a site adds via a slot override),
    // which is outside these smoke tests' scope. Drop anything not served from the dev origin.
    const url = msg.location()?.url || '';
    if (url && !url.startsWith('http://localhost:1313')) return;
    errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  return errors;
}

/** The SPA removes #loading-guide once mounted; wait for that as "booted". */
async function waitForMount(page) {
  await expect(page.locator('#app')).not.toBeEmpty();
  await expect(page.locator('#loading-guide')).toHaveCount(0, { timeout: 15_000 });
}

test('home page boots without console errors', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await waitForMount(page);
  // The SPA replaces the server-rendered #seo-content; the app shell is live.
  await expect(page.locator('#app')).toBeVisible();
  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('client-side navigation into a post works', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await waitForMount(page);

  // Follow the first in-app link that points at a post, then assert the SPA
  // swapped content without a full reload (URL changed, app still mounted).
  const postLink = page.locator('a[href*="/posts/"]').first();
  await postLink.click();
  await expect(page).toHaveURL(/\/posts\//);
  await expect(page.locator('#app')).not.toBeEmpty();
  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('deep-linking directly to a post resolves (SEO/200, not a redirect)', async ({ page }) => {
  const errors = trackErrors(page);
  const response = await page.goto(A_POST);
  expect(response?.status(), 'deep link must serve real HTML, not 404').toBe(200);
  await waitForMount(page);
  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('deep-linking to a #hash scrolls to that heading, not the top', async ({ page }) => {
  // A shared link like /posts/x/#section must land on the section. The SPA owns
  // this: body scroll is locked and the real scroller is .v-application, so the
  // browser's native anchor jump can't fire — useRouteScroll resolves the hash
  // once the content paints. The heading id ('3-write-a-post') is Hugo's
  // autoHeadingID slug for the "3. Write a post" h2 in quick-start.
  const errors = trackErrors(page);
  await page.goto(`${A_POST}#3-write-a-post`);
  await waitForMount(page);

  const heading = page.locator('[id="3-write-a-post"]').first();
  await expect(heading).toBeVisible();

  // Wait for the smooth scroll to settle: the container must have moved off 0.
  await expect
    .poll(async () => page.evaluate(() => document.querySelector('.v-application')?.scrollTop ?? 0))
    .toBeGreaterThan(50);

  // The heading must land NEAR the top (not its natural position far down the
  // article) but BELOW the fixed app bar, not hidden behind it: scroll-margin-top
  // offsets the anchor by the bar height (~64px) + a gap, so it settles ~80px down.
  const box = await heading.boundingBox();
  expect(box, 'heading should have a layout box').not.toBeNull();
  expect(box.y, 'heading should clear the fixed app bar, not hide behind it').toBeGreaterThan(50);
  expect(box.y, 'heading should still be near the top after the hash scroll').toBeLessThan(200);
  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('reduced-motion: a #hash deep link still lands on the heading', async ({ page }) => {
  // With prefers-reduced-motion the smooth scroll falls back to an instant jump
  // (scrollBehavior() in utils/motion.js), because an explicit behavior:'smooth'
  // would otherwise override the CSS scroll-behavior reset. The anchor must still
  // resolve — reduced motion changes the animation, not the destination.
  const errors = trackErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${A_POST}#3-write-a-post`);
  await waitForMount(page);

  const heading = page.locator('[id="3-write-a-post"]').first();
  await expect(heading).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => document.querySelector('.v-application')?.scrollTop ?? 0))
    .toBeGreaterThan(50);
  const box = await heading.boundingBox();
  expect(box, 'heading should have a layout box').not.toBeNull();
  expect(box.y, 'heading should clear the app bar under reduced motion too').toBeGreaterThan(50);
  expect(box.y).toBeLessThan(200);
  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('back navigation restores the previous scroll position', async ({ page }) => {
  // Returning to a long feed should land where the reader left off, not at the
  // top. The SPA owns this (scrollRestoration='manual'): useRouteScroll records
  // the .v-application scrollTop per route and restores it on a pop navigation.
  const errors = trackErrors(page);
  await page.goto('/');
  await waitForMount(page);

  // Scroll the real scroller down. The home feed ships every post in client mode,
  // so it is comfortably taller than this.
  await page.evaluate(() => document.querySelector('.v-application').scrollTo(0, 700));
  const before = await page.evaluate(() => document.querySelector('.v-application').scrollTop);
  expect(before, 'home must be scrollable for this test').toBeGreaterThan(100);

  // Navigate away via the fixed app-bar search button: a header control does not
  // auto-scroll the container, so the position saved for "/" stays the one above.
  await page.locator('header a[href$="/search/"]').first().click();
  await expect(page).toHaveURL(/\/search\/?$/);

  // Back to home: the saved position is restored rather than reset to the top.
  await page.goBack();
  await expect(page).toHaveURL(/localhost:1313\/$/);
  await expect
    .poll(async () => page.evaluate(() => document.querySelector('.v-application')?.scrollTop ?? 0))
    .toBeGreaterThan(before - 100);
  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('search route loads and mounts a search field', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/search/');
  await waitForMount(page);
  await expect(page.locator('input[type="text"], input[type="search"]').first()).toBeVisible();
  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('whitespace-only search query stays in the search prompt state', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/search/?q=%20%20%20');
  await waitForMount(page);

  const searchInput = page.locator('input[type="text"], input[type="search"]').first();
  await expect(searchInput).toHaveValue('   ');
  const promptText = /Enter keywords above to start searching|輸入關鍵字開始搜尋/;
  const searchPrompt = page.locator('.v-alert').filter({ hasText: promptText });
  await expect(searchPrompt).toBeVisible({ timeout: 10_000 });
  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('landmarks: one <main>, and no empty rail landmarks', async ({ page }) => {
  // (a) Exactly one <main> per route (Vuetify's <v-main>; ContentShell uses divs).
  // (b) The complementary landmark belongs to the labelled sidebar widgets (ToC /
  //     Series Navigator), which appear on post routes. Other routes — and the
  //     decorative demo rails (<div>, not <aside>) — should have no aside.
  // (a) Exactly one <main> on every route.
  for (const route of ['/', '/search/', '/about/', '/tags/', A_POST]) {
    await page.goto(route);
    await waitForMount(page);
    await expect(page.locator('main'), `route ${route}: exactly one <main>`).toHaveCount(1);
  }
  // (b) Non-post routes carry no complementary landmark. The post route is
  // excluded because its rails (ToC/Series) ARE complementary when populated.
  for (const route of ['/', '/search/', '/about/', '/tags/']) {
    await page.goto(route);
    await waitForMount(page);
    await expect(
      page.locator('aside, [role="complementary"]'),
      `route ${route}: no empty rail landmarks`
    ).toHaveCount(0);
  }
});

test('post content hydration (code-copy / mermaid / images) raises no errors', async ({ page, context }) => {
  // Grant clipboard so navigator.clipboard.writeText resolves deterministically.
  // Without it, automation can reject the write ("Document is not focused"), which
  // would trip the copy button's failure state even though the handler is correct
  // (it has an execCommand fallback and never throws).
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const errors = trackErrors(page);
  await page.goto(A_POST);
  await waitForMount(page);

  // Code-copy buttons are injected by useContentHydration into rendered code
  // blocks. If present, clicking must not throw (clipboard is guarded with an
  // execCommand fallback). Soft: not every post has a code block.
  const copyBtn = page.locator('.code-copy-btn').first();
  if (await copyBtn.count()) {
    await copyBtn.click();
    await expect(copyBtn).not.toHaveText(/error/i);
  }
  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('post content math hydration renders KaTeX correctly without errors', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/posts/showcase/');
  await waitForMount(page);

  // Assert that KaTeX rendered HTML elements exist
  const katexHtml = page.locator('.katex-html');
  await expect(katexHtml.first()).toBeVisible({ timeout: 10_000 });
  expect(await katexHtml.count()).toBeGreaterThan(0);

  // Assert that KaTeX display block is rendered
  const katexDisplay = page.locator('.katex-display');
  await expect(katexDisplay.first()).toBeVisible();

  // Assert that html has slotify-js class and all math elements have been processed
  await expect(page.locator('html')).toHaveClass(/slotify-js/);
  await expect(page.locator('.math:not([data-processed])')).toHaveCount(0);
  await expect(page.locator('.math[data-processed="error"]')).toHaveCount(0);
  await expect(page.locator('.math[data-processed="empty"]')).toHaveCount(0);

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('search keyword highlighting wraps query terms in search-highlight marks', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/search/?q=quick');
  await waitForMount(page);

  // Assert that search-highlight mark elements exist and contain the query keyword
  const highlights = page.locator('.search-highlight');
  await expect(highlights.first()).toBeVisible({ timeout: 10_000 });
  expect(await highlights.count()).toBeGreaterThan(0);
  await expect(highlights.first()).toHaveText(/quick/i);

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('clearing search field resets query and raises no console errors', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/search/?q=quick');
  await waitForMount(page);

  // Clear icon appears inside the text field when populated
  const clearBtn = page.locator('.v-field__clearable .v-icon, [aria-label*="clear" i]').first();
  await expect(clearBtn).toBeVisible({ timeout: 10_000 });
  await clearBtn.click();

  // Clearing a linked query removes q; results and highlights should clear too.
  await expect(page).toHaveURL(/\/search\/?$/);
  await expect(page.locator('.search-highlight')).toHaveCount(0);
  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});
