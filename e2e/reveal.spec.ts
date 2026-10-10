import { expect, test, type Page } from '@playwright/test';

// The reveal grammar (spec §6, base.css) and BaseLayout's reveal script on the built /en/: start
// states hidden until in view, everything shown under reduced motion and in print, very tall
// elements, and browsers without IntersectionObserver.

test.describe('the reveal grammar with JavaScript', () => {
  // A reveal probe served inside /en/'s <main>, so the reveal script finds it.
  test.beforeEach(async ({ page }) => {
    await page.route('**/en/', async (route) => {
      const response = await route.fetch();
      const text = await response.text();
      const body = text.replace('</main>', '<p class="rv" id="probe-rv">Probe</p></main>');
      await route.fulfill({ response, body });
    });
  });

  test('hides a start state until it scrolls into view, then reveals it', async ({ page }) => {
    await page.goto('/en/');
    const probe = page.locator('#probe-rv');

    await expect(probe).toHaveCSS('opacity', '0');
    await probe.scrollIntoViewIfNeeded();
    await expect(probe).toHaveClass('rv in');
    await expect(probe).toHaveCSS('opacity', '1');
  });

  test('shows everything at once under reduced motion and in print', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/en/');

    await expect(page.locator('#probe-rv')).toHaveCSS('opacity', '1');
    await expect(page.locator('#probe-rv')).toHaveCSS('transform', 'none');

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(page.locator('#probe-rv')).toHaveCSS('opacity', '0');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('#probe-rv')).toHaveCSS('opacity', '1');
  });
});

// Serves /en/ with `html` added at the end of its <main>, where the reveal script finds it.
async function serveWithProbe(page: Page, html: string): Promise<void> {
  await page.route('**/en/', async (route) => {
    const response = await route.fetch();
    const text = await response.text();
    await route.fulfill({ response, body: text.replace('</main>', () => `${html}</main>`) });
  });
}

test.describe('the reveal script', () => {
  test('reveals an element taller than ten viewports while it covers the viewport', async ({
    page,
  }) => {
    await serveWithProbe(page, '<div class="rv" id="probe-tall" style="height: 1200vh">Tall</div>');
    await page.goto('/en/');
    const probe = page.locator('#probe-tall');
    await expect(probe).not.toBeInViewport();

    await probe.evaluate((element) => {
      element.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await page.mouse.wheel(0, 3000);
    // The element now covers the whole viewport, and a tenth of it can never be in view.
    await expect
      .poll(async () =>
        probe.evaluate((element) => {
          const box = element.getBoundingClientRect();
          return box.top < 0 && box.bottom > (element.ownerDocument.defaultView?.innerHeight ?? 0);
        }),
      )
      .toBe(true);
    await expect(probe).toHaveClass('rv in');
    await expect(probe).toHaveCSS('opacity', '1');
  });

  test('reveals every element at once without IntersectionObserver, with no error', async ({
    page,
  }) => {
    const errors: Error[] = [];
    page.on('pageerror', (error) => {
      errors.push(error);
    });
    await page.addInitScript(() => {
      Reflect.deleteProperty(globalThis, 'IntersectionObserver');
    });
    await serveWithProbe(
      page,
      '<p class="rv" id="probe-rv">Probe</p><div class="wipe" id="probe-wipe">Wipe</div>' +
        '<div class="zoom" id="probe-zoom"><img alt="" src="/favicon.webp"></div>' +
        '<h2><span class="line-rv" id="probe-line"><span>Line</span></span></h2>',
    );
    await page.goto('/en/');

    const targets = page.locator('.rv, .zoom, .wipe, .line-rv');
    await expect(targets).not.toHaveCount(0);
    const unrevealed = await targets.evaluateAll((elements) =>
      elements.filter((element) => !element.classList.contains('in')).map(({ id }) => id),
    );
    expect(unrevealed).toEqual([]);
    await expect(page.locator('#probe-rv')).toHaveCSS('opacity', '1');
    await expect(page.locator('#probe-rv')).toHaveCSS('transform', 'none');
    expect(errors).toEqual([]);
  });
});
