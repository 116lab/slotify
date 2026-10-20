// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Theme decisions: a stored choice wins and survives a reload, a stale stored
 * personality falls back without losing its mode, the site palette deep-merges
 * onto the theme's (exampleSite adds a `brand` personality), and the declared
 * personality order sets the default.
 */

const THEME_PALETTE = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'theme-palette.json'), 'utf8')
);
// The theme's declared personality order ([params] personalityOrder in hugo.toml).
const THEME_ORDER = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'hugo.toml'), 'utf8')
    .match(/^\s*personalityOrder\s*=\s*(\[.*\])/m)[1]
);

async function waitForMount(page) {
  await expect(page.locator('#app')).not.toBeEmpty();
  await expect(page.locator('#loading-guide')).toHaveCount(0, { timeout: 15_000 });
}

test('a chosen light/dark mode is stored and wins on the next visit', async ({ page }) => {
  await page.goto('/');
  await waitForMount(page);
  await page.getByRole('button', { name: 'Switch to Dark Mode' }).click();
  await expect(page.getByRole('button', { name: 'Switch to Light Mode' })).toBeVisible();

  await page.reload();
  await waitForMount(page);
  await expect(page.getByRole('button', { name: 'Switch to Light Mode' })).toBeVisible();
});

test('a stored personality that no longer exists falls back but keeps its mode', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('user-theme', 'retired-dark'));
  await page.goto('/');
  await waitForMount(page);
  await expect(page.locator('.v-application')).toHaveClass(new RegExp(`v-theme--${THEME_ORDER[0]}-dark`));
});

test('a site palette override deep-merges onto the theme palette', async ({ page }) => {
  await page.goto('/');
  await waitForMount(page);
  const themes = await page.evaluate(() => window.__SLOTIFY_THEMES__);
  // The site's added personality is present…
  expect(Object.keys(themes)).toContain('brand');
  // …and every theme personality keeps all of its roles, unchanged.
  for (const [id, modes] of Object.entries(THEME_PALETTE)) {
    expect(themes[id], `personality ${id}`).toEqual(modes);
  }
});

test('the default personality follows personalityOrder, not alphabetical order', async ({ page }) => {
  await page.goto('/');
  await waitForMount(page);
  // A first visit (nothing stored) boots the first declared personality.
  await expect(page.locator('.v-application')).toHaveClass(new RegExp(`v-theme--${THEME_ORDER[0]}-light`));
  // The switcher order is the declared one; the site-added `brand`, which the
  // exampleSite does not list, follows it.
  const order = await page.evaluate(() => window.__SLOTIFY_PERSONALITIES__);
  expect(order).toEqual([...THEME_ORDER, 'brand']);
});
