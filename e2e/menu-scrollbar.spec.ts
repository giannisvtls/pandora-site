import { expect, test, type Page } from '@playwright/test';

import { menuPage, PHONE } from './menu-fixtures';

// The mobile menu with the page's classic scrollbar shown. Playwright's headless Chromium hides
// scrollbars only through its default `--hide-scrollbars` argument; without it the page draws its
// 10px scrollbar (base.css). The menu's scroll lock takes that scrollbar away, which moves the
// burger: the close button, measured once the dialog is open, must still land on it.

// A worker-scoped option: it has to be set for the whole file, not inside a describe.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

// The width the page's vertical scrollbar takes.
const scrollbarWidth = (page: Page) =>
  page
    .locator('html')
    .evaluate((html) => (html.ownerDocument.defaultView?.innerWidth ?? 0) - html.clientWidth);

for (const size of [PHONE, { width: 1000, height: 800 }]) {
  test(`puts the close button on the burger with the scrollbar shown (${String(size.width)}×${String(size.height)})`, async ({
    page,
  }) => {
    const menu = await menuPage(page, size);
    expect(await scrollbarWidth(page)).toBe(10);

    await menu.burger.click();
    await expect(menu.dialog).toBeVisible();

    // The scroll lock took the scrollbar away, and the burger moved with the page.
    expect(await scrollbarWidth(page)).toBe(0);
    expect(await menu.close.boundingBox()).toEqual(await menu.burger.boundingBox());
  });
}
