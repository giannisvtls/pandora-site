import { readFileSync } from 'node:fs';

import { expect, test, type Locator, type Page } from '@playwright/test';

// The overlay header (spec §7), until Phase 2 builds a page with a hero: a fixture page made from
// the built /en/, its header switched to the overlay variant as SiteHeader.astro renders it (the
// `overlay` class, no spacer, the overlay script copied from the component's source). The page's
// first section is the index heading. Phase 2 tests the real hero page.

const SOURCE = readFileSync(new URL('../src/components/SiteHeader.astro', import.meta.url), 'utf8');
const SCRIPT_START = "{variant === 'overlay' && <script is:inline>";

// The overlay variant's inline script, as the component writes it.
function overlayScript(): string {
  const start = SOURCE.indexOf(SCRIPT_START) + SCRIPT_START.length;
  const end = SOURCE.indexOf('</script>', start);
  if (end === -1 || start < SCRIPT_START.length) throw new Error('No overlay script found');
  return SOURCE.slice(start, end);
}

// The built page with the overlay header in place of the solid one.
function asOverlayPage(html: string): string {
  const spacerStart = html.indexOf('<div class="hdr-space"');
  const spacerEnd = html.indexOf('</div>', spacerStart) + '</div>'.length;
  if (spacerStart === -1 || !html.includes('<header class="hdr solid"')) {
    throw new Error('The built page has no solid header');
  }
  return `${html.slice(0, spacerStart)}${html.slice(spacerEnd)}`
    .replace('<header class="hdr solid"', '<header class="hdr overlay"')
    .replace('</header>', () => `<script>${overlayScript()}</script></header>`);
}

async function openOverlayPage(page: Page): Promise<Locator> {
  await page.route('**/en/', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: asOverlayPage(await response.text()) });
  });
  await page.goto('/en/');
  return page.locator('header');
}

// The header's computed background, once its 0.4s background transition is over.
async function backgroundOf(header: Locator) {
  return header.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map(async (animation) => animation.finished));
    const style = getComputedStyle(element);
    return { image: style.backgroundImage.split('(', 1)[0], color: style.backgroundColor };
  });
}

// The design's solid header: `rgba(var(--night-rgb), 0.92)`, in the night tokens of an overlay
// without `.solid`, or in the page's own (light) tokens once it has `.solid`.
const NIGHT_SOLID = { image: 'none', color: 'rgba(17, 26, 34, 0.92)' };
const LIGHT_SOLID = { image: 'none', color: 'rgba(244, 247, 250, 0.92)' };
const TRANSPARENT = { image: 'linear-gradient', color: 'rgba(0, 0, 0, 0)' };

test.describe('the overlay header', () => {
  test('is transparent over the first section and solid once it has scrolled away', async ({
    page,
  }) => {
    const header = await openOverlayPage(page);

    await expect(header).toHaveCSS('position', 'fixed');
    await expect(header).not.toHaveClass(/\bsolid\b/u);
    expect(await backgroundOf(header)).toEqual(TRANSPARENT);

    await page.locator('main section').nth(1).scrollIntoViewIfNeeded();
    await expect(header).toHaveClass(/\bsolid\b/u);
    expect(await backgroundOf(header)).toEqual(LIGHT_SOLID);

    await page.locator('main h1').scrollIntoViewIfNeeded();
    await expect(header).not.toHaveClass(/\bsolid\b/u);
    expect(await backgroundOf(header)).toEqual(TRANSPARENT);
  });

  test('is solid from the start without IntersectionObserver', async ({ page }) => {
    await page.addInitScript(() => {
      Reflect.deleteProperty(globalThis, 'IntersectionObserver');
    });
    const header = await openOverlayPage(page);

    await expect(header).toHaveClass(/\bsolid\b/u);
    expect(await backgroundOf(header)).toEqual(LIGHT_SOLID);
  });

  test('is solid in the page flow below 1120px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const header = await openOverlayPage(page);

    await expect(header).toHaveCSS('position', 'relative');
    expect(await backgroundOf(header)).toEqual(NIGHT_SOLID);
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('is solid, with its light ink on the night background', async ({ page }) => {
      const header = await openOverlayPage(page);

      await expect(page.locator('html')).not.toHaveClass('js');
      await expect(header).not.toHaveClass(/\bsolid\b/u);
      expect(await backgroundOf(header)).toEqual(NIGHT_SOLID);
      await expect(header).toHaveCSS('color', 'rgb(242, 246, 248)');
    });
  });
});
