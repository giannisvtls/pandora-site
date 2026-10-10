import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext } from '@playwright/test';

// The page shell of spec §6 on the built /en/: the theme before first paint, the self-hosted
// fonts, nothing loaded from another origin, the content without JavaScript, the skip link. The
// reveal grammar is in reveal.spec.ts.

// WCAG 2.0, 2.1 and 2.2 at levels A and AA. axe-core 4.13 defines no `wcag22a` tag.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// The built /en/ as the preview serves it (dist/en/index.html).
async function builtHome(request: APIRequestContext): Promise<string> {
  const response = await request.get('/en/');
  return response.text();
}

// The `@font-face` rules of a page's HTML: family (unquoted), src URLs and unicode ranges.
function fontFaces(html: string) {
  return html
    .matchAll(/@font-face\s*\{([^}]*)\}/gu)
    .map(([, body = '']) => ({
      family: /font-family:\s*"([^"]+)"/u.exec(body)?.[1] ?? '',
      urls: body
        .matchAll(/url\("([^"]+)"\)/gu)
        .map(([, url = '']) => url)
        .toArray(),
      ranges: /unicode-range:\s*([^;]+)/u.exec(body)?.[1]?.split(',') ?? [],
    }))
    .toArray();
}

// The code points a `U+XXXX` / `U+XXXX-YYYY` range list covers.
function covered(ranges: readonly string[]): Set<number> {
  const points = new Set<number>();
  for (const range of ranges) {
    const [from = '', to = from] = range.trim().replace(/^U\+/iu, '').split('-', 2);
    for (let point = Number.parseInt(from, 16); point <= Number.parseInt(to, 16); point += 1) {
      points.add(point);
    }
  }
  return points;
}

// Every assigned code point of the Greek and Coptic block, U+0370-03FF.
const GREEK = Array.from({ length: 0x3_ff - 0x3_70 + 1 }, (_, index) => 0x3_70 + index).filter(
  (point) => !/\p{Cn}/u.test(String.fromCodePoint(point)),
);

// An init script: records on <html> the theme as it stands when the document has been parsed.
function recordTheme() {
  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.dataset.themeAtLoad = document.documentElement.dataset.theme;
  });
}

test.describe('the theme before first paint (P1-6)', () => {
  test('applies a saved dark choice before the document has loaded', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
    });
    await page.addInitScript(recordTheme);
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveAttribute('data-theme-at-load', 'dark');
    await expect(page.locator('html')).toHaveClass('js');
  });

  test('is light on a first visit, and when storage throws', async ({ page }) => {
    await page.addInitScript(recordTheme);
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-theme-at-load', 'light');

    const errors: Error[] = [];
    page.on('pageerror', (error) => {
      errors.push(error);
    });
    await page.addInitScript(() => {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('The operation is insecure.', 'SecurityError');
        },
      });
    });
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveAttribute('data-theme-at-load', 'light');
    await expect(page.locator('html')).toHaveClass('js');
    expect(errors).toEqual([]);
  });

  test('runs before the first stylesheet in the built page', async ({ request }) => {
    const html = await builtHome(request);
    const script = html.indexOf("localStorage.getItem('theme')");
    const styles = [html.indexOf('<style'), html.indexOf('<link rel="stylesheet"')].filter(
      (index) => index !== -1,
    );

    expect(script).toBeGreaterThan(html.indexOf('<head>'));
    expect(styles).not.toEqual([]);
    expect(script).toBeLessThan(Math.min(...styles));
    // The site's CSS is past Astro's 4 KB inline threshold: one external stylesheet, after it.
    expect(html.match(/<link rel="stylesheet"/gu)).toHaveLength(1);
  });

  test('has no WCAG 2.2 AA violations in dark (axe)', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
    });
    await page.goto('/en/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    expect(results.violations).toEqual([]);
  });
});

test.describe('the self-hosted fonts (A12)', () => {
  test('load /en/ without a single request to another origin', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => {
      requests.push(request.url());
    });
    await page.goto('/en/', { waitUntil: 'networkidle' });
    await page.locator('html').evaluate(async (html) => {
      await html.ownerDocument.fonts.ready;
    });

    // The preview's origin, where /en/ came from.
    const origin = new URL(page.url()).origin;
    expect(requests.filter((url) => new URL(url).origin !== origin)).toEqual([]);
    expect(requests.filter((url) => url.includes('/_astro/fonts/'))).not.toEqual([]);
  });

  test('render the headings in Sofia Sans Extra Condensed 800 once the fonts are ready', async ({
    page,
  }) => {
    await page.goto('/en/');
    const fonts = await page.locator('html').evaluate(async (html) => {
      const { fonts: faces } = html.ownerDocument;
      await faces.ready;
      const stack = getComputedStyle(html).getPropertyValue('--display');
      const family = stack.split(',', 1)[0]?.trim().replaceAll('"', '') ?? '';
      const heading = html.querySelector('h1') ?? html;
      return {
        // The Fonts API names the face "Sofia Sans Extra Condensed-<hash>": the plain name
        // matches no face, so this check alone could not fail.
        named: faces.check('800 40px "Sofia Sans Extra Condensed"'),
        family,
        face: faces.check(`800 40px "${family}"`),
        loaded: [...faces].filter(
          (face) => face.family.replaceAll('"', '') === family && face.status === 'loaded',
        ).length,
        heading: getComputedStyle(heading).fontFamily,
      };
    });

    expect(fonts.named).toBe(true);
    expect(fonts.family).toMatch(/^Sofia Sans Extra Condensed-\w+$/u);
    expect(fonts.face).toBe(true);
    expect(fonts.loaded).toBeGreaterThan(0);
    expect(fonts.heading.startsWith(`"${fonts.family}"`)).toBe(true);
  });

  test('declare faces that cover Greek, and preload the latin face of each family', async ({
    request,
  }) => {
    const html = await builtHome(request);
    const faces = fontFaces(html).filter(({ urls }) => urls.length > 0);
    const families = [...new Set(faces.map(({ family }) => family))];
    const preloads = html
      .matchAll(/<link rel="preload" href="([^"]+)" as="font"[^>]*>/gu)
      .toArray();

    expect(families).toHaveLength(2);
    for (const family of families) {
      const ranges = faces.filter((face) => face.family === family).flatMap((face) => face.ranges);
      const points = covered(ranges);
      expect(
        GREEK.filter((point) => !points.has(point)),
        family,
      ).toEqual([]);
    }
    expect(preloads).toHaveLength(2);
    for (const [link, url = ''] of preloads) {
      const face = faces.find(({ urls }) => urls.includes(url));
      expect(link).toContain('type="font/woff2" crossorigin');
      expect(url).toMatch(/^\/_astro\/fonts\/\w+\.woff2$/u);
      expect(face?.ranges[0], url).toBe('U+0000-00FF');
    }
  });
});

test.describe('without JavaScript (A11)', () => {
  test.use({ javaScriptEnabled: false });

  test('shows every element of the header, main and footer, and a reveal start state hides nothing', async ({
    page,
  }) => {
    await page.goto('/en/');
    await expect(page.locator('html')).not.toHaveClass('js');
    // Probes of the reveal grammar, as later pages will use it.
    await page.locator('main').evaluate((main) => {
      main.insertAdjacentHTML(
        'beforeend',
        '<p class="rv" id="probe-rv">Probe</p><div class="wipe" id="probe-wipe">Wipe</div>' +
          '<h2><span class="line-rv"><span id="probe-line">Line</span></span></h2>',
      );
    });

    const hidden = await page.locator('body').evaluate((body) =>
      [
        ...body.querySelectorAll(
          ':scope > header, :scope > header *, :scope > main, :scope > main *, ' +
            ':scope > footer, :scope > footer *',
        ),
      ]
        // Hidden on purpose: an element with `hidden` (the compare count, filled in Phase 2), the
        // logo meant for the dark theme, the theme toggle (it needs JavaScript) and its script,
        // and the mobile menu (its burger needs JavaScript, its dialog is closed; the island's
        // wrapper draws no box of its own, and Astro puts its runtime style and script beside it).
        .filter(
          (element) =>
            !element.closest('[hidden], .theme-btn, .menu-btn, dialog') &&
            !element.matches('img.lw, script, style, astro-island'),
        )
        .filter((element) => {
          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          return (
            style.opacity === '0' ||
            style.visibility === 'hidden' ||
            style.display === 'none' ||
            style.transform !== 'none' ||
            box.width === 0 ||
            box.height === 0
          );
        })
        .map((element) => `${element.tagName.toLowerCase()}#${element.id}`),
    );
    const wipe = await page
      .locator('#probe-wipe')
      .evaluate((element) => getComputedStyle(element, '::after').content);

    expect(hidden).toEqual([]);
    expect(wipe).toBe('none');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // The nav and the footer links work without JavaScript (A11); the toggle is not offered.
    await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link')).toHaveCount(
      6,
    );
    await expect(page.getByRole('contentinfo').getByRole('link').first()).toBeVisible();
    await expect(page.locator('header .theme-btn')).toBeHidden();
  });
});

test.describe('the skip link', () => {
  test('appears when focused and moves focus to <main>, which shows its focus', async ({
    page,
  }) => {
    await page.goto('/en/');
    const skip = page.getByRole('link', { name: 'Skip to main content', exact: true });
    const before = await skip.boundingBox();

    await page.keyboard.press('Tab');
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    const focused = await skip.boundingBox();

    expect(before?.width).toBeLessThanOrEqual(1);
    expect(focused?.width).toBeGreaterThan(40);
    expect(focused?.height).toBeGreaterThan(20);

    await page.keyboard.press('Enter');
    await expect(page.locator('main#main')).toBeFocused();
    await expect(page.locator('main#main')).toHaveCSS('outline-style', 'solid');
  });
});
