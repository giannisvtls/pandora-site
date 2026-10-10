import { existsSync, readFileSync } from 'node:fs';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

// The SEO files and the 404 pages of the build (spec §9), as `astro preview` serves them:
// robots.txt, the sitemap index and the English sitemap, the root redirect line of `_redirects`
// (written by the build integration; the preview serves it as a plain file and does not apply
// it), the Organization JSON-LD on /en/, and the 404 pages. And every /_astro/ file a built page
// names is served: the build deleted only the images nothing names.

// WCAG 2.0, 2.1 and 2.2 at levels A and AA. axe-core 4.13 defines no `wcag22a` tag.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// astro.config.mjs `site`.
const ORIGIN = 'https://invetec.eu';

// The snapshot the build read.
function snapshotOf<T>(name: string): T {
  const file = new URL(`../content-snapshot/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

interface English {
  readonly en: string;
}

const COMPANY = snapshotOf<{
  company: {
    name: string;
    phone: string;
    email: string;
    street: English;
    locality: English;
    postalCode: string;
  };
}>('site-copy-footer').company;
const NOT_FOUND = snapshotOf<{
  title: { lead: English; payload: English };
  homeLink: English;
}>('site-copy-not-found');

// The texts between each `start` and the next `end` in `text` (up to the next `start` when no
// `end` comes first).
function allBetween(text: string, start: string, end: string): string[] {
  return text
    .split(start)
    .slice(1)
    .map((part) => part.split(end, 1)[0] ?? '');
}

// The `<loc>` URLs of a sitemap or a sitemap index.
const locsOf = (xml: string) => allBetween(xml, '<loc>', '</loc>');

// The `xhtml:link` alternates of a sitemap, as [hreflang, href].
const alternatesOf = (xml: string) =>
  allBetween(xml, '<xhtml:link ', '/>').map((link) => [
    allBetween(link, 'hreflang="', '"')[0],
    allBetween(link, 'href="', '"')[0],
  ]);

async function textOf(request: APIRequestContext, path: string): Promise<string> {
  const response = await request.get(path);
  expect(response.status(), path).toBe(200);
  return response.text();
}

async function statusOf(request: APIRequestContext, path: string): Promise<number> {
  const response = await request.get(path);
  return response.status();
}

// A file of the built dist/ (the preview serves it).
const dist = (path: string) => new URL(`../dist/${path}`, import.meta.url);

test.describe('the SEO files', () => {
  test('robots.txt lets every crawler in and names the sitemap index', async ({ request }) => {
    expect(await textOf(request, '/robots.txt')).toBe(
      `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap-index.xml\n`,
    );
  });

  test('the sitemap index lists only the English sitemap', async ({ request }) => {
    expect(locsOf(await textOf(request, '/sitemap-index.xml'))).toEqual([
      `${ORIGIN}/sitemap-en.xml`,
    ]);
  });

  test('the English sitemap lists only /en/, with its en and x-default alternates', async ({
    request,
  }) => {
    const xml = await textOf(request, '/sitemap-en.xml');

    expect(locsOf(xml)).toEqual([`${ORIGIN}/en/`]);
    expect(alternatesOf(xml)).toEqual([
      ['en', `${ORIGIN}/en/`],
      ['x-default', `${ORIGIN}/en/`],
    ]);
    expect(xml).not.toContain('<lastmod>');
  });

  test('_redirects sends the root to /en/ with a 302 on line 1', async ({ request }) => {
    const redirects = await textOf(request, '/_redirects');

    expect(redirects.split('\n', 1)).toEqual(['/  /en/  302']);
  });

  test('no 404 URL is in a sitemap, an alternate or a canonical link', async ({
    page,
    request,
  }) => {
    const sitemaps = await Promise.all(
      ['/sitemap-index.xml', '/sitemap-en.xml'].map((path) => textOf(request, path)),
    );
    await page.goto('/en/');
    const links = await page
      .locator('link[rel="alternate"], link[rel="canonical"]')
      .evaluateAll((elements) => elements.map((element) => element.getAttribute('href') ?? ''));
    const urls = [
      ...sitemaps.flatMap((xml) => locsOf(xml)),
      ...sitemaps.flatMap((xml) => alternatesOf(xml).map(([, href = '']) => href)),
      ...links,
    ];

    // 2 sitemap locs, the 2 sitemap alternates, and /en/'s canonical and 2 alternates.
    expect(urls).toHaveLength(7);
    for (const url of urls) expect(url).not.toContain('404');
  });

  test('the Organization JSON-LD on /en/ is JSON from the footer company block', async ({
    page,
    request,
  }) => {
    await page.goto('/en/');
    const script = page.locator('head script[type="application/ld+json"]');

    await expect(script).toHaveCount(1);
    const data = JSON.parse((await script.textContent()) ?? '') as { logo: string };
    expect(data).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'INVETEC E.E.',
      url: `${ORIGIN}/`,
      logo: expect.stringMatching(/^https:\/\/invetec\.eu\/_astro\/invetec-logo\.[\w-]+\.webp$/u),
      email: COMPANY.email,
      telephone: COMPANY.phone,
      address: {
        '@type': 'PostalAddress',
        streetAddress: COMPANY.street.en,
        addressLocality: COMPANY.locality.en,
        postalCode: COMPANY.postalCode,
      },
    });
    expect(COMPANY.name).toBe('INVETEC E.E.');
    expect(await statusOf(request, new URL(data.logo).pathname)).toBe(200);
  });
});

test.describe('the build output', () => {
  test('has the 404 pages as {L}/404.html, no {L}/404/ folder, and the generated _redirects', () => {
    expect(existsSync(dist('404.html'))).toBe(true);
    expect(existsSync(dist('en/404.html'))).toBe(true);
    expect(existsSync(dist('en/404'))).toBe(false);
    expect(readFileSync(dist('_redirects'), 'utf8').split('\n', 1)).toEqual(['/  /en/  302']);
  });

  test('serves no /en/404/index.html', async ({ request }) => {
    expect(await statusOf(request, '/en/404/index.html')).toBe(404);
  });
});

// The /_astro/ paths a text names (src, srcset, href, CSS url(), island URLs): each up to the
// first character that ends a URL in HTML, in an attribute's escaped JSON or in CSS.
const astroPathsIn = (text: string) =>
  text
    .split('/_astro/')
    .slice(1)
    .map((rest) => `/_astro/${rest.split(/[\s"'(),;&<>\\]/u, 1)[0] ?? ''}`);

test('every /_astro/ file a built page or its CSS names is served (none was pruned)', async ({
  request,
}) => {
  const pages = await Promise.all(
    ['/en/', '/en/404.html', '/404.html'].map((path) => textOf(request, path)),
  );
  const fromPages = new Set(pages.flatMap((html) => astroPathsIn(html)));
  const styles = [...fromPages].filter((path) => path.endsWith('.css'));
  const fromStyles = await Promise.all(
    styles.map(async (path) => astroPathsIn(await textOf(request, path))),
  );
  const paths = new Set([...fromPages, ...fromStyles.flat()]);

  expect([...paths].filter((path) => path.endsWith('.webp')).length).toBeGreaterThan(16);
  for (const path of paths) expect(await statusOf(request, path), path).toBe(200);
});

// The notFound h1 as Site copy joins it: `lead <span class="b">payload</span>`.
const NOT_FOUND_H1 = `${NOT_FOUND.title.lead.en} ${NOT_FOUND.title.payload.en}`;

const notFoundH1 = (page: Page) =>
  page.getByRole('heading', { level: 1, name: NOT_FOUND_H1, exact: true });

for (const path of ['/en/404.html', '/404.html']) {
  test.describe(`the 404 page ${path}`, () => {
    test('answers 200 in English with noindex, the notFound h1 and a link to /en/', async ({
      page,
    }) => {
      const response = await page.goto(path);

      expect(response?.status()).toBe(200);
      expect(response?.request().redirectedFrom()).toBeNull();
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page).toHaveTitle('Page not found — INVETEC');
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
      await expect(notFoundH1(page)).toBeVisible();
      await expect(
        page.locator('main').getByRole('link', { name: NOT_FOUND.homeLink.en, exact: true }),
      ).toHaveAttribute('href', '/en/');
    });

    test('has no canonical, alternate, og:url, JSON-LD or explainer island', async ({ page }) => {
      await page.goto(path);

      await expect(
        page.locator(
          'link[rel="canonical"], link[rel="alternate"], meta[property="og:url"], script[type="application/ld+json"]',
        ),
      ).toHaveCount(0);
      await expect(page.locator('astro-island[client="idle"], dialog.fx-panel')).toHaveCount(0);
    });

    for (const theme of ['light', 'dark']) {
      test(`has no WCAG 2.2 AA violations in ${theme} (axe)`, async ({ page }) => {
        // The saved theme, applied before first paint (a toggle press would animate the colours
        // while axe reads them).
        await page.addInitScript((saved) => {
          localStorage.setItem('theme', saved);
        }, theme);
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

        const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

        expect(results.violations).toEqual([]);
      });
    }
  });
}

test('an unknown URL gets the root 404 page with a 404 status', async ({ page }) => {
  const response = await page.goto('/en/no-such-page/');

  expect(response?.status()).toBe(404);
  await expect(notFoundH1(page)).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});
