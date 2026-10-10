import { expect, test, type Locator } from '@playwright/test';

import { openMenu } from './menu-fixtures';

// The icon-only controls in forced-colors mode (Windows High Contrast): the browser repaints every
// colour from the system palette, backgrounds with the Canvas colour, so a mark drawn as a
// background disappears and leaves an empty box. Each control must still show its mark.

// The share of the control's inner area (inside its border, kept clear of it by 4px) painted in
// another colour than that area's corner: its mark. The control's own screenshot, read back
// through a canvas in the page.
async function markShare(control: Locator): Promise<number> {
  const shot = await control.screenshot();
  return control.evaluate(async (element, data) => {
    const document_ = element.ownerDocument;
    const image = document_.createElement('img');
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document_.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (context === null) return -1;
    context.drawImage(image, 0, 0);
    const inset = 4;
    const { data: pixels } = context.getImageData(
      inset,
      inset,
      canvas.width - 2 * inset,
      canvas.height - 2 * inset,
    );
    const [red = 0, green = 0, blue = 0] = pixels;
    let marked = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const distance = Math.max(
        Math.abs((pixels[index] ?? 0) - red),
        Math.abs((pixels[index + 1] ?? 0) - green),
        Math.abs((pixels[index + 2] ?? 0) - blue),
      );
      if (distance > 64) marked += 1;
    }
    return marked / (pixels.length / 4);
  }, shot.toString('base64'));
}

for (const forcedColors of ['none', 'active'] as const) {
  test.describe(`forced colors ${forcedColors}`, () => {
    test('shows the burger bars and the close X of the mobile menu', async ({ page }) => {
      await page.emulateMedia({ forcedColors });
      const menu = await openMenu(page);
      await menu.close.blur();

      // Two 20 × 2px bars (and the X) in a 36 × 36px inner area: about 6% of it.
      expect(await markShare(menu.close)).toBeGreaterThan(0.03);
      await page.keyboard.press('Escape');
      await expect(menu.dialog).toBeHidden();
      await menu.burger.blur();
      expect(await markShare(menu.burger)).toBeGreaterThan(0.03);
    });
  });
}
