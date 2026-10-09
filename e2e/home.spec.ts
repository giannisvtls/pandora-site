import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// WCAG 2.0, 2.1 and 2.2 at levels A and AA. axe-core 4.13 defines no `wcag22a` tag.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.describe('/en/ home page', () => {
  test('returns 200 with html lang="en"', async ({ page }) => {
    const response = await page.goto('/en/');

    expect(response?.status()).toBe(200);
    // goto reports the last response of a redirect chain: /en/ itself must answer 200.
    expect(response?.request().redirectedFrom()).toBeNull();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    // Locally the gate reuses any server already on port 4321. `astro dev` pages load the Vite
    // client, so a reused dev server fails here instead of passing on unbuilt output.
    await expect(page.locator('script[src*="/@vite/client"]')).toHaveCount(0);
  });

  test('shows the h1 and the product name', async ({ page }) => {
    await page.goto('/en/');

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Your car is not going anywhere without you.',
        exact: true,
      }),
    ).toBeVisible();
    // The one product in content-snapshot/products.json (camperv3). `exact`: role names
    // otherwise match case-insensitive substrings ("Camper V3 Pro" would pass).
    await expect(
      page.getByRole('heading', { level: 2, name: 'Camper V3', exact: true }),
    ).toBeVisible();
  });

  test('the skip link moves keyboard focus to main', async ({ page }) => {
    await page.goto('/en/');

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
    await expect(page.locator('main#main')).toBeFocused();
  });

  test('has no WCAG 2.2 AA violations (axe)', async ({ page }) => {
    await page.goto('/en/');

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    expect(results.violations).toEqual([]);
  });
});
