import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// WCAG 2.0, 2.1 and 2.2 at levels A and AA. axe-core 4.13 defines no `wcag22a` tag.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.describe('/en/ home page', () => {
  test('returns 200 with html lang="en"', async ({ page }) => {
    const response = await page.goto('/en/');

    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('shows the h1 and the product name', async ({ page }) => {
    await page.goto('/en/');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Your car is not going anywhere without you.' }),
    ).toBeVisible();
    // The one product in content-snapshot/products.json (camperv3).
    await expect(page.getByRole('heading', { level: 2, name: 'Camper V3' })).toBeVisible();
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
