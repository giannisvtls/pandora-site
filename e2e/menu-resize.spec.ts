import { expect, test, type Page } from '@playwright/test';

import { focusInDialog, openMenu, overflowOf, type Menu } from './menu-fixtures';

// The open mobile menu while the screen changes (spec §8): the close button stays over the burger
// through a rotation or a zoom (also after a close and a reopen in one task), and on the screen
// while the menu scrolls; the menu closes, with focus on the header's own link, once the screen
// grows past the breakpoint; focus stays inside after a click on the menu's background.

interface Size {
  readonly width: number;
  readonly height: number;
}

const size = (width: number, height: number): Size => ({ width, height });
const named = ({ width, height }: Size) => `${String(width)}×${String(height)}`;

// Screen changes while the menu is open: a phone turned upright, and back; zooming in to 125%,
// and to about 400% (the header wraps onto two rows).
const CHANGES: readonly (readonly [Size, Size])[] = [
  [size(844, 390), size(390, 844)],
  [size(390, 844), size(844, 390)],
  [size(1000, 800), size(800, 640)],
  [size(1100, 900), size(320, 256)],
];

// The close button is where the burger is (the burger sits in the inert page under the dialog),
// wholly on the screen, and the menu does not scroll sideways (WCAG 1.4.10).
async function expectCloseOnBurger(menu: Menu): Promise<void> {
  await expect(async () => {
    expect(await menu.close.boundingBox()).toEqual(await menu.burger.boundingBox());
  }).toPass();
  await expect(menu.close).toBeInViewport({ ratio: 1 });
  const { scrollWidth, clientWidth } = await menu.dialog.evaluate((dialog) => ({
    scrollWidth: dialog.scrollWidth,
    clientWidth: dialog.clientWidth,
  }));
  expect(scrollWidth).toBe(clientWidth);
}

const dialogScroll = (menu: Menu) =>
  menu.dialog.evaluate((dialog) => ({
    top: dialog.scrollTop,
    room: dialog.scrollHeight - dialog.clientHeight,
  }));

test.describe('the open mobile menu when the screen changes', () => {
  for (const [from, to] of CHANGES) {
    test(`keeps the close button over the burger from ${named(from)} to ${named(to)}`, async ({
      page,
    }) => {
      const menu = await openMenu(page, { size: from });
      await expectCloseOnBurger(menu);

      await page.setViewportSize(to);

      await expect(menu.dialog).toBeVisible();
      await expectCloseOnBurger(menu);
    });
  }

  test('keeps the close button over the burger while the menu scrolls (844×390)', async ({
    page,
  }) => {
    const menu = await openMenu(page, { size: size(844, 390) });
    const { room } = await dialogScroll(menu);
    expect(room).toBeGreaterThan(0);

    await menu.dialog.evaluate((dialog) => {
      dialog.scrollTo({ top: dialog.scrollHeight, behavior: 'instant' });
    });

    const scrolled = await dialogScroll(menu);
    expect(scrolled.top).toBe(room);
    await expectCloseOnBurger(menu);
    await expect(menu.links.last()).toBeInViewport({ ratio: 1 });
  });

  test('stops each link that takes focus while the menu scrolls below the close button', async ({
    page,
  }) => {
    const menu = await openMenu(page, { size: size(844, 390) });
    await menu.links.last().focus();
    const close = await menu.close.boundingBox();

    // Back up through the links: each one scrolls into view from above.
    for (let press = 1; press < 6; press += 1) {
      await page.keyboard.press('Shift+Tab');
      const link = await page.locator(':focus').boundingBox();
      expect(link?.y, `Shift+Tab ${String(press)}`).toBeGreaterThanOrEqual(
        (close?.y ?? 0) + (close?.height ?? 0),
      );
    }
    await expect(menu.links.first()).toBeFocused();
  });

  test('keeps the close button over the burger when the menu was closed and opened in one task', async ({
    page,
  }) => {
    const menu = await openMenu(page, { size: size(844, 390) });
    // The close event of the first session comes a task later, after the menu is open again.
    await menu.dialog.evaluate((dialog) => {
      dialog.querySelector<HTMLElement>(':scope .menu-close')?.click();
      dialog.ownerDocument.querySelector<HTMLElement>('.menu-open')?.click();
    });
    await expect(menu.dialog).toBeVisible();
    await expect(menu.links.first()).toBeFocused();

    await page.setViewportSize(size(390, 844));

    await expectCloseOnBurger(menu);
    await expect(menu.links.first()).toBeFocused();
  });

  test('closes once the screen grows past the breakpoint, with focus on the header', async ({
    page,
  }) => {
    const menu = await openMenu(page, { size: size(820, 1180) });
    await expect(menu.links.first()).toBeFocused();

    await page.setViewportSize(size(1180, 820));

    await expect(menu.dialog).toBeHidden();
    expect(await overflowOf(page)).toBe('visible');
    // The header's own link to where focus was in the menu, on the screen.
    const systems = page
      .getByRole('navigation', { name: 'Primary', exact: true })
      .getByRole('link', { name: 'Systems', exact: true });
    await expect(systems).toBeFocused();
    await expect(systems).toBeInViewport({ ratio: 1 });
  });
});

// A click on an empty part of the open menu, under its links.
async function clickBackground(page: Page): Promise<void> {
  await page.mouse.click(195, 830);
}

test.describe('focus after a click on the menu background (390×844)', () => {
  test('Shift+Tab goes to the last control and Tab to the first, never out', async ({ page }) => {
    const menu = await openMenu(page);

    await clickBackground(page);
    await page.keyboard.press('Shift+Tab');
    await expect(menu.links.last()).toBeFocused();
    expect(await focusInDialog(menu)).toMatchObject({ isInside: true, hasFocus: true });

    await clickBackground(page);
    await page.keyboard.press('Tab');
    await expect(menu.close).toBeFocused();
    expect(await focusInDialog(menu)).toMatchObject({ isInside: true, hasFocus: true });
  });
});
