// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Search behaviour beyond the smoke checks: typing filters locally without
 * rewriting ?q=, and the highlighter escapes every segment it emits.
 */

async function waitForMount(page) {
  await expect(page.locator('#app')).not.toBeEmpty();
  await expect(page.locator('#loading-guide')).toHaveCount(0, { timeout: 15_000 });
}

test('typing a search filters locally without rewriting ?q=', async ({ page, baseURL }) => {
  await page.goto('/search/');
  await waitForMount(page);
  const input = page.locator('input[type="text"], input[type="search"]').first();
  await input.pressSequentially('quick');
  await expect(page.locator('.search-highlight').first()).toBeVisible();
  expect(page.url()).toBe(`${baseURL}/search/`);
});

test('the search highlighter escapes markup around and inside matches', async ({ page }) => {
  await page.goto('/search/');
  await waitForMount(page);
  // Same module instance the SPA uses (utils/highlight.js), called directly.
  const html = await page.evaluate(async () => {
    const { highlightText } = await import('/js/utils/highlight.js');
    return highlightText(`<img src=x onerror="alert(1)"> Quick & 'co'`, 'quick');
  });
  expect(html).toBe(
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; <mark class="search-highlight">Quick</mark> &amp; &#039;co&#039;'
  );
});
