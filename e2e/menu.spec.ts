import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import {
  focusInDialog,
  menuIsland,
  menuOf,
  menuPage,
  openMenu,
  overflowOf,
  PHONE,
  type Menu,
} from './menu-fixtures';

// The mobile menu island on the built /en/ (spec §8, A10, A11): below 1120px the burger opens a
// native modal dialog with the nav and the switcher, keeps focus inside and gives it back, and the
// page under it does not scroll; from 1120px the island's script is never requested; without
// JavaScript the nav stays inline. The header keeps every control within reach under WCAG 1.4.12
// text spacing at every width (header-spacing.spec.ts); resizes while the menu is open are in
// menu-resize.spec.ts.

// WCAG 2.0, 2.1 and 2.2 at levels A and AA. axe-core 4.13 defines no `wcag22a` tag.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const scrollOf = (page: Page) =>
  page.locator('html').evaluate((html) => html.ownerDocument.defaultView?.scrollY ?? -1);

// The page's scroll position once it has stopped moving: five frames in a row at the same place.
async function settledScroll(page: Page): Promise<number> {
  return page.locator('html').evaluate(async (html) => {
    const view = html.ownerDocument.defaultView;
    let last = -1;
    let still = 0;
    while (view !== null && still < 5) {
      await new Promise((resolve) => view.requestAnimationFrame(resolve));
      still = view.scrollY === last ? still + 1 : 0;
      last = view.scrollY;
    }
    return last;
  });
}

async function expectClosedWithFocusOnBurger(page: Page, menu: Menu): Promise<void> {
  await expect(menu.dialog).toBeHidden();
  await expect(menu.burger).toBeFocused();
  expect(await overflowOf(page)).toBe('visible');
}

test.describe('the mobile menu at 390 × 844', () => {
  test('shows the burger, and neither the desktop nav nor the switcher', async ({ page }) => {
    const menu = await menuPage(page);

    await expect(menu.burger).toBeVisible();
    await expect(menu.burger).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(page.getByRole('navigation', { name: 'Primary', exact: true })).toBeHidden();
    await expect(page.locator('header .hdr-right > ul.lang')).toBeHidden();
    await expect(menu.dialog).toBeHidden();
  });

  test('opens on a click the instant the island has hydrated', async ({ page }) => {
    await page.setViewportSize(PHONE);
    // Clicks the burger in the microtask after Astro removes the island's `ssr` attribute, before
    // the next frame, and records whether the menu opened.
    await page.addInitScript(() => {
      const observer = new MutationObserver((records) => {
        for (const { target } of records) {
          if (!(target instanceof Element) || target.hasAttribute('ssr')) continue;
          const burger = target.querySelector<HTMLElement>('.menu-open');
          if (burger === null) continue;
          observer.disconnect();
          burger.click();
          const isOpen = target.querySelector('dialog')?.open;
          document.documentElement.dataset.openedAtHydration = String(isOpen);
        }
      });
      observer.observe(document, { subtree: true, attributeFilter: ['ssr'] });
    });

    await page.goto('/en/');

    await expect(page.locator('html')).toHaveAttribute('data-opened-at-hydration', 'true');
    await expect(menuOf(page).dialog).toBeVisible();
  });

  test('opens with focus on the first link and the close button where the burger was', async ({
    page,
  }) => {
    const menu = await menuPage(page);
    const burgerBox = await menu.burger.boundingBox();
    await menu.burger.click();

    await expect(menu.links.first()).toBeFocused();
    await expect(menu.links).toHaveCount(6);
    await expect(
      menu.dialog.getByRole('list', { name: 'Language', exact: true }).locator('[aria-current]'),
    ).toHaveText('EN English');
    expect(await menu.close.boundingBox()).toEqual(burgerBox);
    // The links and the switcher sit in the middle of the screen, as the design's centred menu.
    const space = await menu.dialog.evaluate((dialog) => {
      const first = dialog.querySelector(':scope nav a')?.getBoundingClientRect();
      const last = dialog.querySelector(':scope ul.lang')?.getBoundingClientRect();
      return { above: first?.top ?? 0, below: dialog.clientHeight - (last?.bottom ?? 0) };
    });
    expect(Math.abs(space.above - space.below)).toBeLessThan(1);
  });

  test('keeps Tab inside for 10 presses, and Shift+Tab from the first control reaches the last', async ({
    page,
  }) => {
    const menu = await openMenu(page);

    const names = new Set<string>();
    for (let press = 1; press <= 10; press += 1) {
      await page.keyboard.press('Tab');
      const focus = await focusInDialog(menu);
      expect(focus, `Tab ${String(press)}`).toMatchObject({ isInside: true, hasFocus: true });
      names.add(focus.name);
    }
    // 10 presses went round the 7 controls (the close button and 6 links; English is text).
    expect(names.size).toBe(7);

    await menu.close.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(menu.links.last()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(menu.close).toBeFocused();
  });

  test('closes on Escape and gives focus back to the burger', async ({ page }) => {
    const menu = await openMenu(page, { byTap: true });

    await page.keyboard.press('Escape');

    await expectClosedWithFocusOnBurger(page, menu);
  });

  test('closes with the close button and gives focus back to the burger', async ({ page }) => {
    const menu = await openMenu(page, { byTap: true });

    await menu.close.click();

    await expectClosedWithFocusOnBurger(page, menu);
  });

  test('closes when a link is followed', async ({ page }) => {
    const menu = await openMenu(page, { byTap: true });
    // The links lead to Phase 2 pages: the click stays on this page once the menu has seen it.
    await menu.dialog.evaluate((dialog) => {
      dialog.ownerDocument.addEventListener('click', (event) => {
        event.preventDefault();
      });
    });

    await menu.links.nth(1).click();

    await expectClosedWithFocusOnBurger(page, menu);
  });

  test('keeps the page from scrolling while open, and where it was after', async ({ page }) => {
    const menu = await menuPage(page);
    await page.locator('html').evaluate((html) => {
      html.ownerDocument.defaultView?.scrollTo({ top: 10, behavior: 'instant' });
    });
    expect(await settledScroll(page)).toBe(10);
    await menu.burger.click();
    await expect(menu.dialog).toBeVisible();

    expect(await overflowOf(page)).toBe('hidden');
    await page.mouse.wheel(0, 600);
    await page.keyboard.press('PageDown');
    await page.keyboard.press('End');
    expect(await settledScroll(page)).toBe(10);

    await page.keyboard.press('Escape');
    await expect(menu.dialog).toBeHidden();
    expect(await scrollOf(page)).toBe(10);
  });

  for (const theme of ['light', 'dark']) {
    test(`has no WCAG 2.2 AA violations with the menu open, in ${theme} (axe)`, async ({
      page,
    }) => {
      await page.addInitScript((saved) => {
        localStorage.setItem('theme', saved);
      }, theme);
      await openMenu(page);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

      expect(results.violations).toEqual([]);
    });
  }
});

// The menu island's component script, as the page names it. (Preact and its renderer load on
// every page for the explainer, client:idle.)
async function menuScript(page: Page): Promise<string> {
  const url = (await menuIsland(page).getAttribute('component-url')) ?? '';
  return new URL(url, page.url()).href;
}

// /en/ at `width`: the menu's script and every URL the page requested once the network is idle.
async function loadAt(page: Page, width: number) {
  const requested: string[] = [];
  page.on('request', (request) => {
    requested.push(request.url());
  });
  await page.setViewportSize({ width, height: 800 });
  await page.goto('/en/', { waitUntil: 'networkidle' });
  return { script: await menuScript(page), requested };
}

test.describe('from 1120px', () => {
  for (const width of [1280, 1120]) {
    test(`hides the burger at ${String(width)}px and never requests the island's script`, async ({
      page,
    }) => {
      const { script, requested } = await loadAt(page, width);

      await expect(menuOf(page).burger).toBeHidden();
      await expect(page.getByRole('navigation', { name: 'Primary', exact: true })).toBeVisible();
      expect(script).toMatch(/\/MobileMenu\.[\w-]+\.js$/u);
      expect(requested).not.toContain(script);
    });
  }

  test("requests it at 1119px, where the burger shows (the island's media query is the CSS one)", async ({
    page,
  }) => {
    const { script, requested } = await loadAt(page, 1119);

    await expect(menuOf(page).burger).toBeVisible();
    expect(requested).toContain(script);
  });
});

test.describe('without JavaScript at 390px (A11)', () => {
  test.use({ javaScriptEnabled: false, viewport: PHONE });

  test('shows the nav links and the switcher in the header, and hides the burger', async ({
    page,
  }) => {
    await page.goto('/en/');
    const nav = page.getByRole('navigation', { name: 'Primary', exact: true });

    await expect(page.locator('html')).not.toHaveClass('js');
    await expect(nav.getByRole('link')).toHaveCount(6);
    const links = await nav.getByRole('link').all();
    for (const link of links) await expect(link).toBeVisible();
    await expect(page.locator('header .hdr-right > ul.lang')).toBeVisible();
    await expect(page.locator('header .menu-open')).toBeHidden();
    await expect(page.locator('dialog.m-nav')).toBeHidden();
  });
});
