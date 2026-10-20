// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * UI-language (i18n.js) decisions: chrome-only switching, initial-locale
 * detection, and boot resilience. The exampleSite declares en (EN) + zh (繁).
 */

const A_POST = '/posts/quick-start/';

async function waitForMount(page) {
  await expect(page.locator('#app')).not.toBeEmpty();
  await expect(page.locator('#loading-guide')).toHaveCount(0, { timeout: 15_000 });
}

/** The header language switcher; its label is the current locale's label. */
const langButton = (page) => page.locator('.v-app-bar button:has(.mdi-translate)');

test('switching language changes neither the route nor the loaded content', async ({ page, baseURL }) => {
  await page.goto(A_POST);
  await waitForMount(page);
  await expect(langButton(page)).toHaveText(/EN/);

  const fetched = [];
  page.on('request', (req) => { if (req.url().endsWith('index.json')) fetched.push(req.url()); });
  await langButton(page).click();
  await expect(langButton(page)).toHaveText(/繁/);

  expect(page.url()).toBe(`${baseURL}${A_POST}`);
  expect(fetched).toEqual([]);
});

test.describe('initial locale detection', () => {
  test.use({ locale: 'zh-TW' });

  const bootWithStored = async (page, stored) => {
    if (stored !== null) {
      await page.addInitScript((v) => localStorage.setItem('user-locale', v), stored);
    }
    await page.goto('/');
    await waitForMount(page);
  };

  test('the browser language is used when nothing is stored', async ({ page }) => {
    await bootWithStored(page, null);
    await expect(langButton(page)).toHaveText(/繁/);
  });

  test('a stored locale code wins over the browser language', async ({ page }) => {
    await bootWithStored(page, 'en');
    await expect(langButton(page)).toHaveText(/EN/);
  });

  test('an unknown stored code is ignored', async ({ page }) => {
    await bootWithStored(page, 'xx');
    await expect(langButton(page)).toHaveText(/繁/);
  });
});

test('the app still mounts when the locale tables fail to load', async ({ page }) => {
  await page.route('**/js/i18n/*.json', (route) => route.abort());
  await page.goto('/');
  await waitForMount(page);
  await expect(page.locator('.v-app-bar')).toBeVisible();
});

test('the app boots and switches theme when storage throws', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() { throw new DOMException('blocked', 'SecurityError'); },
    });
  });
  await page.goto('/');
  await waitForMount(page);
  await page.getByRole('button', { name: 'Switch to Dark Mode' }).click();
  await expect(page.getByRole('button', { name: 'Switch to Light Mode' })).toBeVisible();
});
