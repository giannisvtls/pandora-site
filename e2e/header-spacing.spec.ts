import { expect, test, type Page } from '@playwright/test';

import { menuIsland } from './menu-fixtures';

// WCAG 1.4.12 Text Spacing and the header (spec §7, §8). With the spacing the criterion names
// (line height 1.5, letter spacing 0.12em, word spacing 0.16em, paragraph spacing 2em) applied, no
// header control is pushed out of reach at any width from 320 to 1440px: from 1120px the header is
// one fixed 88px row with every control on screen (a fixed element cannot scroll to what
// overflows); below 1120px it sits in the page flow, wraps when it must, and shows the burger in
// place of the nav and the switcher. The same holds with the four language codes the switcher will
// show once every language is live. The open menu scrolls to each of its controls on a small phone.

const TEXT_SPACING =
  '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; ' +
  'word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }';

// Every 16px from 320 to 1440, and both sides of the breakpoint.
const WIDTHS = [...Array.from({ length: 71 }, (_, index) => 320 + index * 16), 1119, 1120].toSorted(
  (a, b) => a - b,
);

async function withTextSpacing(page: Page): Promise<void> {
  await page.goto('/en/');
  await page.locator('html').evaluate(async (html) => {
    await html.ownerDocument.fonts.ready;
  });
  await page.addStyleTag({ content: TEXT_SPACING });
}

// Adds EL, IT and SQ links to the header's switcher, styled as its entries are.
async function addLanguageCodes(page: Page): Promise<void> {
  await page.locator('header .hdr-right > ul.lang').evaluate((list) => {
    const item = list.querySelector(':scope > li');
    const current = item?.querySelector('[aria-current]');
    if (item === null || current === null || current === undefined) throw new Error('No switcher');
    for (const code of ['EL', 'IT', 'SQ']) {
      const copy = item.cloneNode(false) as Element;
      const link = list.ownerDocument.createElement('a');
      for (const { name, value } of current.attributes) {
        if (name !== 'aria-current') link.setAttribute(name, value);
      }
      link.setAttribute('href', `/${code.toLowerCase()}/`);
      link.textContent = code;
      copy.append(link);
      list.append(copy);
    }
  });
}

// The header at the current width: its position and height, whether its content overflows its
// box, whether the nav and the burger show, and every shown control that is not wholly on screen.
async function headerAt(page: Page, width: number) {
  await page.setViewportSize({ width, height: 800 });
  return page.locator('header').evaluate((header) => {
    const screenWidth = header.ownerDocument.documentElement.clientWidth;
    const controls = [...header.querySelectorAll(':scope a, :scope button')].filter(
      (control) => control.getClientRects().length > 0,
    );
    const nav = header.querySelector(':scope > nav')?.getClientRects().length ?? 0;
    const burger = header.querySelector(':scope .menu-open')?.getClientRects().length ?? 0;
    return {
      position: getComputedStyle(header).position,
      height: header.getBoundingClientRect().height,
      overflows: header.scrollWidth > header.clientWidth,
      hasNav: nav > 0,
      hasBurger: burger > 0,
      controls: controls.length,
      offScreen: controls
        .filter((control) => {
          const box = control.getBoundingClientRect();
          return box.left < -0.5 || box.right > screenWidth + 0.5;
        })
        .map((control) => control.getAttribute('aria-label') ?? control.textContent),
    };
  });
}

async function expectNoControlLost(page: Page): Promise<void> {
  for (const width of WIDTHS) {
    const header = await headerAt(page, width);
    const isFixed = width >= 1120;

    expect(header.offScreen, `${String(width)}px`).toEqual([]);
    expect(header, `${String(width)}px`).toMatchObject(
      isFixed
        ? { position: 'fixed', height: 88, overflows: false, hasNav: true, hasBurger: false }
        : { position: 'relative', overflows: false, hasNav: false, hasBurger: true },
    );
    // Fixed: the logo, 6 nav links, compare, theme and the languages; in the flow: the logo,
    // compare, theme and the burger.
    expect(header.controls, `${String(width)}px`).toBeGreaterThanOrEqual(isFixed ? 9 : 4);
  }
}

test.describe('the header under text spacing (WCAG 1.4.12)', () => {
  test('keeps every control on screen from 320 to 1440px', async ({ page }) => {
    await withTextSpacing(page);

    await expectNoControlLost(page);
  });

  test('keeps every control on screen with all four language codes in the switcher', async ({
    page,
  }) => {
    await withTextSpacing(page);
    await addLanguageCodes(page);
    await expect(page.locator('header .hdr-right > ul.lang a')).toHaveCount(3);

    await expectNoControlLost(page);
  });

  test('lets the open menu scroll to each of its controls at 320 × 568', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await withTextSpacing(page);
    await expect(menuIsland(page)).not.toHaveAttribute('ssr');
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Mobile', exact: true });
    const controls = dialog.locator('a, button');

    await expect(controls).toHaveCount(7);
    // Taller than the screen: the dialog scrolls, from the top.
    expect(await dialog.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
      true,
    );
    const all = await controls.all();
    for (const control of all) {
      await control.scrollIntoViewIfNeeded();
      await expect(control).toBeInViewport({ ratio: 1 });
    }
    await dialog.evaluate((element) => {
      element.scrollTo({ top: 0, behavior: 'instant' });
    });
    await expect(controls.nth(1)).toBeInViewport({ ratio: 1 });
  });
});
