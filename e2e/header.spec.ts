import { readFileSync } from 'node:fs';

import { expect, test, type Page } from '@playwright/test';

// The site header on the built /en/ (spec §7): the nav and its route table, the language switcher
// (P1-5), the theme toggle, and keyboard focus below the fixed header (WCAG 2.2 SC 2.4.11).

// The snapshot the build read.
function snapshotOf<T>(name: string): T {
  const file = new URL(`../content-snapshot/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

const NAV = snapshotOf<{ route: string; order: number; label: { en: string } }[]>('nav-sections');

// Spec §4's route table for the nav sections' routes, in English.
const NAV_PATHS: Readonly<Record<string, string>> = {
  home: '/en/',
  systems: '/en/systems/car/',
  compare: '/en/compare/',
  accessories: '/en/accessories/',
  blog: '/en/blog/',
  installers: '/en/installers/',
  contact: '/en/contact/',
  partners: '/en/partners/',
  warranty: '/en/warranty/',
};

const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;

test.describe('the site header', () => {
  test("links the nav sections to the route table's pages, in order", async ({ page }) => {
    await page.goto('/en/');
    const nav = page.getByRole('navigation', { name: 'Primary', exact: true });
    const expected = NAV.toSorted(byOrder).map(({ route, label }) => [label.en, NAV_PATHS[route]]);

    const links = await nav
      .getByRole('link')
      .evaluateAll((elements) =>
        elements.map((link) => [(link.textContent ?? '').trim(), link.getAttribute('href')]),
      );

    expect(links).toEqual(expected);
    await expect(nav.locator('[aria-current]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'INVETEC home', exact: true })).toHaveAttribute(
      'href',
      '/en/',
    );
    await expect(page.getByRole('link', { name: 'Compare list', exact: true })).toHaveAttribute(
      'href',
      '/en/compare/',
    );
  });

  test('shows English as the current language, and no link (only English is built)', async ({
    page,
  }) => {
    await page.goto('/en/');
    const switcher = page.getByRole('list', { name: 'Language', exact: true });

    await expect(switcher.locator('[aria-current="true"]')).toHaveText('EN English');
    await expect(switcher.getByRole('link')).toHaveCount(0);
  });

  test('flips the theme and its action label, and the choice survives a reload', async ({
    page,
  }) => {
    await page.goto('/en/');
    const html = page.locator('html');
    const toggle = page.locator('header button.theme-btn');
    await page.locator('html').evaluate((root) => {
      root.ownerDocument.addEventListener('themechange', (event) => {
        root.dataset.lastThemeChange = String((event as CustomEvent<string>).detail);
      });
    });

    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(toggle).toHaveAccessibleName('Switch to dark mode');
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveAccessibleName('Switch to light mode');
    await expect(html).toHaveAttribute('data-last-theme-change', 'dark');
    await expect(toggle).not.toHaveAttribute('aria-pressed');

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    // The label follows the saved theme before the toggle is used.
    await expect(toggle).toHaveAccessibleName('Switch to light mode');

    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(toggle).toHaveAccessibleName('Switch to dark mode');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('draws the theme button as the design does: 38px, and 46px below 900px', async ({
    page,
  }) => {
    await page.goto('/en/');
    const toggle = page.locator('header button.theme-btn');

    // The design's `all: unset` makes the button content-box: its 1px border adds to 36 / 44px.
    expect(await toggle.boundingBox()).toMatchObject({ width: 38, height: 38 });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await toggle.boundingBox()).toMatchObject({ width: 46, height: 46 });
  });

  test('keeps the toggle working when storage throws', async ({ page }) => {
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
    await page.goto('/en/');
    const toggle = page.locator('header button.theme-btn');

    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveAccessibleName('Switch to light mode');
    expect(errors).toEqual([]);
  });
});

// Waits until the page has stopped scrolling (a focus scroll is smooth without reduced motion):
// three frames in a row at the same position.
async function scrollEnd(page: Page): Promise<void> {
  await page.locator('html').evaluate(async (root) => {
    const view = root.ownerDocument.defaultView;
    let last = -1;
    let still = 0;
    while (view !== null && still < 3) {
      await new Promise((resolve) => view.requestAnimationFrame(resolve));
      still = view.scrollY === last ? still + 1 : 0;
      last = view.scrollY;
    }
  });
}

// The focused element, whether it sits in the header, and its box and the header's, once the
// page has stopped scrolling.
async function focusState(page: Page) {
  await scrollEnd(page);
  return page.locator('html').evaluate((root) => {
    const view = root.ownerDocument.defaultView;
    const focused = root.ownerDocument.activeElement ?? root;
    const header = root.ownerDocument.querySelector('header') ?? root;
    const box = focused.getBoundingClientRect();
    return {
      name: `${focused.tagName.toLowerCase()} ${(focused.textContent ?? '').trim().slice(0, 30)}`,
      isInHeader: header.contains(focused),
      top: box.top,
      bottom: box.bottom,
      headerBottom: header.getBoundingClientRect().bottom,
      viewHeight: view?.innerHeight ?? 0,
    };
  });
}

// Presses `key` `times` times; after each press, the focused element is either in the header or
// wholly below it and in view.
async function expectNothingCovered(page: Page, key: string, times: number): Promise<number> {
  let below = 0;
  for (let press = 0; press < times; press += 1) {
    await page.keyboard.press(key);
    const state = await focusState(page);
    if (state.isInHeader) continue;
    below += 1;
    expect(state.top, `${key} ${String(press)}: ${state.name}`).toBeGreaterThanOrEqual(
      state.headerBottom,
    );
    expect(state.bottom, `${key} ${String(press)}: ${state.name}`).toBeLessThanOrEqual(
      state.viewHeight,
    );
  }
  return below;
}

test.describe('the fixed header and keyboard focus (WCAG 2.2 SC 2.4.11)', () => {
  test('is as tall as --hdr, which scroll-margin-top adds 16px to', async ({ page }) => {
    await page.goto('/en/');
    const header = page.locator('header');
    const measured = await header.evaluate((element) => {
      const root = element.ownerDocument.documentElement;
      const main = root.querySelector(':scope main h2') ?? root;
      return {
        height: element.getBoundingClientRect().height,
        position: getComputedStyle(element).position,
        token: getComputedStyle(root).getPropertyValue('--hdr').trim(),
        margin: getComputedStyle(main).scrollMarginTop,
      };
    });

    expect(measured).toEqual({ height: 88, position: 'fixed', token: '88px', margin: '104px' });
  });

  test('gives every focus target below the header a scroll margin of its height plus 16px', async ({
    page,
  }) => {
    await page.goto('/en/');
    const found = await page.locator('body').evaluate((body) => {
      const header = body.querySelector(':scope > header');
      const expected = `${String((header?.getBoundingClientRect().height ?? 0) + 16)}px`;
      const focusable = ':is(a[href], button, input, select, textarea, summary, [tabindex])';
      const targets = [
        ...body.querySelectorAll(
          `:scope > main, :scope > main ${focusable}, :scope > footer ${focusable}`,
        ),
      ];
      return {
        expected,
        count: targets.length,
        wrong: targets
          .map((target) => ({ target, margin: getComputedStyle(target).scrollMarginTop }))
          .filter(({ margin }) => margin !== expected)
          .map(({ target, margin }) => `${target.tagName} ${target.className} ${margin}`),
      };
    });

    expect(found.expected).toBe('104px');
    // <main>, 16 level buttons, the feature buttons, 16 system links, the footer links.
    expect(found.count).toBeGreaterThan(150);
    expect(found.wrong).toEqual([]);
  });

  test('scrolls a feature button reached by Shift+Tab out from under the header', async ({
    page,
  }) => {
    await page.goto('/en/');
    const card = page.locator('main li.sys').nth(1);
    const button = card.locator('button[data-fx]').last();
    await card.getByRole('link', { name: 'See the system', exact: true }).focus();
    // Once the focus scroll is over, the page is scrolled so that the button before the focused
    // link sits under the header.
    await scrollEnd(page);
    await button.evaluate((element) => {
      const top = element.getBoundingClientRect().top - 30;
      element.ownerDocument.defaultView?.scrollBy({ top, behavior: 'instant' });
    });
    await scrollEnd(page);
    const under = await button.boundingBox();
    expect(under?.y).toBeGreaterThanOrEqual(0);
    expect((under?.y ?? 0) + (under?.height ?? 0)).toBeLessThan(88);

    await page.keyboard.press('Shift+Tab');
    await expect(button).toBeFocused();
    const state = await focusState(page);

    expect(state.top).toBeGreaterThanOrEqual(state.headerBottom);
    expect(state.bottom).toBeLessThanOrEqual(state.viewHeight);
  });

  test('never covers the focused element, tabbing back from the footer through the index', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 600 });
    await page.goto('/en/');
    await page.locator('footer a[href]').last().focus();

    expect(await expectNothingCovered(page, 'Shift+Tab', 70)).toBe(70);
  });

  test('never covers the focused element, tabbing through the header and the index and back', async ({
    page,
  }) => {
    await page.goto('/en/');
    // The skip link (drawn above the header while focused) first, then the header.
    await page.keyboard.press('Tab');

    const forward = await expectNothingCovered(page, 'Tab', 45);
    const back = await expectNothingCovered(page, 'Shift+Tab', 44);

    // Both runs crossed the first cards of the index, scrolling past the first screen.
    expect(forward).toBeGreaterThan(30);
    expect(back).toBeGreaterThan(30);
    await expect(page.locator('header a.home')).toBeFocused();
  });
});
