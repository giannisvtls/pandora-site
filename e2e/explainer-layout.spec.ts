import { expect, test, type Page } from '@playwright/test';

import {
  explainerPage,
  featureButton,
  levelButton,
  openExplainer,
  type Explainer,
} from './explainer-fixtures';

// The open explainer on small screens and at 400% zoom (spec §8): the panel fills the screen and
// scrolls inside, the close button stays in its corner and in reach, nothing scrolls sideways
// (WCAG 1.4.10) and a focused link is never under the close button (2.4.11). After a click on the
// panel's text the keyboard scrolls the panel. The opening slides in, unless reduced motion is
// asked for. Focus lands somewhere visible when the button that opened it is hidden meanwhile. A
// long title ends 8px before the close button, also while the panel scrolls under the button.

const GPS = 'GPS/GLONASS tracking';
const LEVEL_3 = 'Level 3 · Recovery';

// A phone, and 1280 × 1024 at 400% zoom.
const SCREENS = [
  { width: 390, height: 844 },
  { width: 320, height: 256 },
];

// The panel scrolls inside, not sideways; the close button is wholly on the screen, at the
// panel's top right corner.
async function expectInReach(explainer: Explainer): Promise<void> {
  const panel = await explainer.panel.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    right: element.getBoundingClientRect().right,
  }));
  expect(panel.scrollWidth).toBe(panel.clientWidth);
  await expect(explainer.close).toBeInViewport({ ratio: 1 });
  const close = await explainer.close.boundingBox();
  expect(close?.y).toBe(14);
  expect((close?.x ?? 0) + (close?.width ?? 0)).toBe(panel.right - 14);
}

for (const screen of SCREENS) {
  const size = `${String(screen.width)}×${String(screen.height)}`;

  test.describe(`the open explainer at ${size}`, () => {
    for (const [name, open] of [
      [GPS, (page: Page) => featureButton(page, 'gps')],
      [LEVEL_3, (page: Page) => levelButton(page, '3')],
    ] as const) {
      test(`"${name}" fills the screen, scrolls inside and keeps the close button in reach`, async ({
        page,
      }) => {
        await explainerPage(page, screen);
        const explainer = await openExplainer(page, open(page), name);
        const box = await explainer.dialog.boundingBox();
        expect(box?.width).toBe(screen.width);
        await expectInReach(explainer);

        await explainer.panel.evaluate((panel) => {
          panel.scrollTo({ top: panel.scrollHeight, behavior: 'instant' });
        });

        expect(await explainer.panel.evaluate((panel) => panel.scrollTop)).toBeGreaterThan(0);
        await expectInReach(explainer);
        await expect(explainer.dialog.getByRole('link').last()).toBeInViewport({ ratio: 1 });
      });
    }

    test('never leaves a focused link under the close button or off the screen', async ({
      page,
    }) => {
      await explainerPage(page, screen);
      const explainer = await openExplainer(page, featureButton(page, 'gps'), GPS);
      const close = await explainer.close.boundingBox();
      const below = (close?.y ?? 0) + (close?.height ?? 0);

      // Down through the 13 links, then back up: each one scrolls into view clear of the button
      // and on the screen (to the pixel: the text's box can end a fraction past the edge).
      const keys = [
        ...Array.from({ length: 13 }, () => 'Tab'),
        ...Array.from({ length: 12 }, () => 'Shift+Tab'),
      ];
      for (const [press, key] of keys.entries()) {
        await page.keyboard.press(key);
        const link = await page.locator(':focus').boundingBox();
        const label = `${key} ${String(press + 1)}`;
        expect(link?.y, label).toBeGreaterThanOrEqual(below);
        expect(Math.floor((link?.y ?? 0) + (link?.height ?? 0)), label).toBeLessThanOrEqual(
          screen.height,
        );
      }
      await expect(explainer.dialog.getByRole('link').first()).toBeFocused();
    });
  });
}

test.describe('the title and the close button', () => {
  for (const size of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    test(`keep a long title clear of Close, also while the panel scrolls (${String(size.width)}px)`, async ({
      page,
    }) => {
      await explainerPage(page, size);
      await openExplainer(page, featureButton(page, 'gps'), GPS);
      // Located by class: the long title renames the dialog.
      const heading = page.locator('dialog.fx-panel h2');
      const close = page.locator('dialog.fx-panel .fx-close');
      const panel = page.locator('dialog.fx-panel .fx-body');
      await heading.evaluate((title) => {
        title.textContent = Array.from({ length: 4 }, () => title.textContent).join(' ');
      });

      for (const top of [0, 30, 60]) {
        await panel.evaluate((element, scrolled) => {
          element.scrollTop = scrolled;
        }, top);
        const [title, button] = [await heading.boundingBox(), await close.boundingBox()];
        if (title === null || button === null) throw new Error('No box');
        const isOverlapping =
          title.x < button.x + button.width &&
          button.x < title.x + title.width &&
          title.y < button.y + button.height &&
          button.y < title.y + title.height;
        expect(isOverlapping, `scrolled ${String(top)}px`).toBe(false);
        expect(title.x + title.width, `scrolled ${String(top)}px`).toBeLessThanOrEqual(
          button.x - 8,
        );
      }
    });
  }
});

test.describe('the keyboard after a click on the panel', () => {
  test('scrolls the panel, and Tab still goes to Close (390×600)', async ({ page }) => {
    await explainerPage(page, { width: 390, height: 600 });
    const explainer = await openExplainer(page, levelButton(page, '3'), LEVEL_3);

    // The click focuses the panel (it can take focus), not the dialog, and shows no ring.
    await explainer.dialog.locator('.fx-what').click();
    const focus = await explainer.panel.evaluate((panel) => ({
      isFocused: panel.matches(':focus'),
      hasRing: panel.matches(':focus-visible'),
    }));
    expect(focus).toEqual({ isFocused: true, hasRing: false });
    await page.keyboard.press('PageDown');

    await expect
      .poll(async () => explainer.panel.evaluate((panel) => panel.scrollTop))
      .toBeGreaterThan(0);
    await page.keyboard.press('Tab');
    await expect(explainer.close).toBeFocused();
  });
});

test.describe('motion', () => {
  test('slides the panel in and fades the backdrop, unless reduced motion is asked for', async ({
    page,
  }) => {
    await explainerPage(page);

    for (const [reducedMotion, expected] of [
      ['no-preference', ['fx-in', 'fx-fade']],
      ['reduce', ['none', 'none']],
    ] as const) {
      await page.emulateMedia({ reducedMotion });
      const explainer = await openExplainer(page, featureButton(page, 'gps'), GPS);
      const animations = await explainer.dialog.evaluate((dialog) => [
        getComputedStyle(dialog).animationName,
        getComputedStyle(dialog, '::backdrop').animationName,
      ]);
      expect(animations, reducedMotion).toEqual(expected);
      await page.keyboard.press('Escape');
      await expect(explainer.dialog).toBeHidden();
    }
  });
});

test.describe('focus after closing', () => {
  test('lands on <main>, in view, when the card of the button that opened it was hidden meanwhile', async ({
    page,
  }) => {
    await explainerPage(page);
    const button = levelButton(page, '3');
    const explainer = await openExplainer(page, button, LEVEL_3);
    await button.evaluate((element) => {
      element.closest('li')?.style.setProperty('display', 'none');
    });

    await page.keyboard.press('Escape');

    await expect(explainer.dialog).toBeHidden();
    await expect(page.locator('main')).toBeFocused();
    await expect(page.locator('main')).toBeInViewport();
  });
});
