import { readFileSync } from 'node:fs';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// The built /en/ (spec §7): the page and the interim system index (P1-8). The header is in
// header.spec.ts.

// WCAG 2.0, 2.1 and 2.2 at levels A and AA. axe-core 4.13 defines no `wcag22a` tag.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// The snapshot the build read.
function snapshotOf<T>(name: string): T {
  const file = new URL(`../content-snapshot/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

interface SnapshotProduct {
  readonly category: string;
  readonly slug: string;
  readonly name: { readonly en: string };
}

const PRODUCTS = snapshotOf<SnapshotProduct[]>('products');
const CATEGORIES = snapshotOf<{ order: number; title: { en: string } }[]>('categories');
const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;

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

// The system cards, each a list item of a category's systems.
const cardsOf = (page: Page) => page.locator('main li.sys');

test.describe('the interim system index (P1-8)', () => {
  test('opens with the home h1, then the 5 category headings in order', async ({ page }) => {
    await page.goto('/en/');

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Your car is not going anywhere without you.',
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator('main').getByRole('heading', { level: 2 })).toHaveText(
      CATEGORIES.toSorted(byOrder).map(({ title }) => title.en),
    );
  });

  test('shows the 16 systems by name, each with one level button and its feature buttons', async ({
    page,
  }) => {
    await page.goto('/en/');
    const cards = cardsOf(page);

    await expect(cards).toHaveCount(16);
    for (const { name } of PRODUCTS) {
      const card = cards.filter({
        has: page.getByRole('heading', { level: 3, name: name.en, exact: true }),
      });
      await expect(card, name.en).toHaveCount(1);
      await expect(card.locator('button[data-lvl]'), name.en).toHaveCount(1);
      expect(await card.locator('button[data-fx]').count(), name.en).toBeGreaterThan(0);
    }
  });

  test('links every system to its page, /en/systems/{vehicle}/{slug}/', async ({ page }) => {
    await page.goto('/en/');
    const links = page.getByRole('link', { name: 'See the system', exact: true });

    await expect(links).toHaveCount(16);
    for (const { name, category, slug } of PRODUCTS) {
      const card = cardsOf(page).filter({
        has: page.getByRole('heading', { level: 3, name: name.en, exact: true }),
      });
      await expect(card.getByRole('link', { name: 'See the system' }), name.en).toHaveAttribute(
        'href',
        `/en/systems/${category}/${slug}/`,
      );
    }
  });

  test('shows each package shot as astro:assets output, sized and lazy (A19)', async ({ page }) => {
    await page.goto('/en/');
    const images = page.locator('main li.sys .plate img');

    await expect(images).toHaveCount(16);
    const shots = await images.evaluateAll((elements) =>
      elements.map((image) => ({
        alt: image.getAttribute('alt') ?? '',
        src: image.getAttribute('src') ?? '',
        srcset: image.getAttribute('srcset') ?? '',
        width: image.getAttribute('width') ?? '',
        height: image.getAttribute('height') ?? '',
        loading: image.getAttribute('loading'),
      })),
    );
    for (const shot of shots) {
      expect(shot.src, shot.alt).toMatch(/^\/_astro\/[\w.-]+\.webp$/u);
      for (const candidate of shot.srcset.split(', ')) {
        expect(candidate, shot.alt).toMatch(/^\/_astro\/[\w.-]+\.webp \d+w$/u);
      }
      expect(shot.width, shot.alt).toMatch(/^\d+$/u);
      expect(shot.height, shot.alt).toMatch(/^\d+$/u);
      expect(shot.loading, shot.alt).toBe('lazy');
      expect(shot.alt).toMatch(/^Pandora .+ package$/u);
    }
  });
});
