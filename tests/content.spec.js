// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Content rendering and layout: lazy vendor loading, the invariant reading
 * column, and the server-rendered crawlable body. Math is injected into the
 * post payload here, so these checks do not depend on demo article content.
 */

const A_POST = '/posts/quick-start/';
const LAZY = /\/vendor\/js\/(katex|mermaid)\.min\.js$/;

async function waitForMount(page) {
  await expect(page.locator('#app')).not.toBeEmpty();
  await expect(page.locator('#loading-guide')).toHaveCount(0, { timeout: 15_000 });
}

function trackLazy(page) {
  const loaded = [];
  page.on('request', (req) => { if (LAZY.test(req.url())) loaded.push(new URL(req.url()).pathname); });
  return loaded;
}

test('KaTeX and Mermaid are not downloaded on pages without math or diagrams', async ({ page }) => {
  const loaded = trackLazy(page);
  for (const route of ['/', A_POST]) {
    await page.goto(route);
    await waitForMount(page);
  }
  await page.waitForLoadState('networkidle');
  expect(loaded).toEqual([]);
});

test('KaTeX is downloaded and renders once a page contains math', async ({ page }) => {
  await page.route(`**${A_POST}index.json`, async (route) => {
    const res = await route.fetch();
    const json = await res.json();
    json.content += '<p><span class="math inline" data-math="x^2">x^2</span></p>';
    await route.fulfill({ response: res, json });
  });
  const loaded = trackLazy(page);
  await page.goto(A_POST);
  await waitForMount(page);
  await expect(page.locator('.katex').first()).toBeVisible();
  expect(loaded).toEqual(['/vendor/js/katex.min.js']);
});

test('the reading column has the same geometry on list and article routes', async ({ page }) => {
  const boxes = {};
  for (const route of ['/', '/search/', A_POST]) {
    await page.goto(route);
    await waitForMount(page);
    // The content row is the shell's last row (PostView adds a header row above).
    const col = page.locator('main .v-col--cols-lg-8 > .mx-auto').last();
    await expect(col).toBeVisible();
    const box = await col.boundingBox();
    boxes[route] = { x: Math.round(box.x), width: Math.round(box.width) };
  }
  expect(boxes['/search/']).toEqual(boxes['/']);
  expect(boxes[A_POST]).toEqual(boxes['/']);
});

test('a post ships its article as server-rendered HTML for crawlers', async ({ request }) => {
  const json = await (await request.get(`${A_POST}index.json`)).json();
  const html = await (await request.get(A_POST)).text();
  const seo = html.match(/<div id="seo-content"[\s\S]*?<\/article>/);
  expect(seo, 'post HTML must carry the #seo-content article').not.toBeNull();
  expect(seo[0]).toContain(json.title);
  expect(seo[0]).toContain('Add the theme');
});
