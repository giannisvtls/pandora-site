import { expect, type Locator, type Page } from '@playwright/test';

// The mobile menu on the built /en/, for menu.spec.ts and menu-resize.spec.ts.

export const PHONE = { width: 390, height: 844 };

export interface Menu {
  readonly burger: Locator;
  readonly dialog: Locator;
  readonly close: Locator;
  readonly links: Locator;
}

export function menuOf(page: Page): Menu {
  const dialog = page.getByRole('dialog', { name: 'Mobile', exact: true });
  return {
    burger: page.getByRole('button', { name: 'Open menu', exact: true }),
    dialog,
    close: dialog.getByRole('button', { name: 'Close menu', exact: true }),
    links: dialog.getByRole('navigation', { name: 'Mobile', exact: true }).getByRole('link'),
  };
}

// /en/ at `size`, once the island has hydrated (Astro drops `ssr` from the island then).
export async function menuPage(page: Page, size = PHONE): Promise<Menu> {
  await page.setViewportSize(size);
  await page.goto('/en/');
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
  return menuOf(page);
}

// Opens the menu at `size` with a click on the burger; with `byTap`, a click that leaves focus
// where it was, as a tap does in some browsers (iOS). The browser then returns focus to <body> on
// close, so only the island's own restore can bring it back to the burger.
export async function openMenu(page: Page, { size = PHONE, byTap = false } = {}): Promise<Menu> {
  const menu = await menuPage(page, size);
  await (byTap ? menu.burger.dispatchEvent('click') : menu.burger.click());
  await expect(menu.dialog).toBeVisible();
  return menu;
}

// The focused element: inside the dialog, and the page (not the browser's UI) has focus.
export async function focusInDialog(menu: Menu) {
  return menu.dialog.evaluate((dialog) => {
    const { activeElement } = dialog.ownerDocument;
    return {
      isInside: activeElement !== null && dialog.contains(activeElement),
      hasFocus: dialog.ownerDocument.hasFocus(),
      name: `${activeElement?.tagName ?? ''} ${activeElement?.getAttribute('aria-label') ?? activeElement?.textContent ?? ''}`,
    };
  });
}

export const overflowOf = (page: Page) =>
  page.locator('html').evaluate((html) => getComputedStyle(html).overflow);
