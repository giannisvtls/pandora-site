import { expect, test, type Page } from '@playwright/test';

import { explainerNamed, explainerPage, featureButton } from './explainer-fixtures';

// The system cards of the interim index on the built /en/ (spec §7): every package plate is
// square; below 1120px every feature button takes taps in a 44px area around its unchanged 24px
// line (an invisible box), no two of those areas overlap, a tap anywhere in one opens the
// explainer and the scroll margin stays; every level chip carries the feature buttons' info mark
// while its name stays the tag.

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

interface Box {
  readonly name: string;
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

// The border box of each element `selector` matches in <main>, in page coordinates.
const boxesOf = (page: Page, selector: string) =>
  page
    .locator('main')
    .locator(selector)
    .evaluateAll((elements) =>
      elements.map((element): Box => {
        const box = element.getBoundingClientRect();
        const view = element.ownerDocument.defaultView;
        const [x, y] = [view?.scrollX ?? 0, view?.scrollY ?? 0];
        return {
          name: (element.textContent ?? '').trim(),
          left: box.left + x,
          top: box.top + y,
          right: box.right + x,
          bottom: box.bottom + y,
        };
      }),
    );

interface HitArea extends Box {
  // The height of the button as drawn (its line and dotted underline).
  readonly drawn: number;
  // Whether a point 9px above and 9px below the drawn button lands on the button.
  readonly isAboveHit: boolean;
  readonly isBelowHit: boolean;
}

// Each feature button's hit area in <main>, in page coordinates: the box of its `::before` (the
// invisible area that takes taps), measured with the button scrolled into view, and what a point
// just outside the drawn button hits.
const hitAreasOf = (page: Page) =>
  page
    .locator('main')
    .locator('button[data-fx]')
    .evaluateAll((buttons) =>
      buttons.map((button): HitArea => {
        button.scrollIntoView({ block: 'center', behavior: 'instant' });
        const view = button.ownerDocument.defaultView;
        const [x, y] = [view?.scrollX ?? 0, view?.scrollY ?? 0];
        const box = button.getBoundingClientRect();
        const area = getComputedStyle(button, '::before');
        // Lengths in px; NaN for `auto` (no such box).
        const [offset, height] = [area.top, area.height].map((value) =>
          Number(value.replace(/px$/u, '')),
        );
        const top = box.top + (offset ?? NaN);
        const middle = box.left + box.width / 2;
        const isHit = (pointY: number) =>
          button.ownerDocument.elementFromPoint(middle, pointY)?.closest('button') === button;
        return {
          name: (button.textContent ?? '').trim(),
          left: box.left + x,
          top: top + y,
          right: box.right + x,
          bottom: top + (height ?? NaN) + y,
          drawn: box.height,
          isAboveHit: isHit(box.top - 9),
          isBelowHit: isHit(box.bottom + 9),
        };
      }),
    );

// Whether two boxes share any area (touching edges do not).
const isOverlapping = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

for (const size of [DESKTOP, PHONE]) {
  test(`draws every package plate square at ${String(size.width)}px`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/en/');

    const plates = await boxesOf(page, 'li.sys .plate');

    expect(plates).toHaveLength(16);
    for (const [index, plate] of plates.entries()) {
      const [width, height] = [plate.right - plate.left, plate.bottom - plate.top];
      expect(Math.abs(width - height), `plate ${String(index + 1)}`).toBeLessThan(1);
    }
  });
}

test('gives every feature button a 44px touch target at 390px, none overlapping', async ({
  page,
}) => {
  await page.setViewportSize(PHONE);
  await page.goto('/en/');

  const targets = await hitAreasOf(page);

  expect(targets.length).toBeGreaterThan(50);
  for (const target of targets) {
    expect(target.bottom - target.top, target.name).toBeGreaterThanOrEqual(44);
    // Taps 9px above and below the drawn line still land on the button, which is drawn as on a
    // wide screen: its 24px line with the dotted underline right under the label.
    expect(target, target.name).toMatchObject({ isAboveHit: true, isBelowHit: true });
    expect(Math.round(target.drawn), target.name).toBe(24);
  }
  const overlaps = targets.flatMap((a, index) =>
    targets
      .slice(index + 1)
      .filter((b) => isOverlapping(a, b))
      .map((b) => `${a.name} / ${b.name}`),
  );
  expect(overlaps).toEqual([]);
  // The scroll margin a focused button gets (base.css) still holds.
  await expect(page.locator('main button[data-fx]').first()).toHaveCSS(
    'scroll-margin-top',
    '104px',
  );
});

test('opens the explainer on a tap 9px above or below a feature button at 390px', async ({
  page,
}) => {
  await explainerPage(page, PHONE);
  const button = featureButton(page, 'gps');
  const { dialog } = explainerNamed(page, 'GPS/GLONASS tracking');

  for (const offset of [-9, 9]) {
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    if (box === null) throw new Error('No box');
    const edge = offset < 0 ? box.y : box.y + box.height;
    await page.mouse.click(box.x + box.width / 2, edge + offset);
    await expect(dialog, String(offset)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  }
});

test('keeps the feature buttons their 24px line, and no wider hit area, from 1120px', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/en/');

  const targets = await boxesOf(page, 'button[data-fx]');

  for (const target of targets) {
    expect(Math.round(target.bottom - target.top), target.name).toBe(24);
  }
  await expect(page.locator('main button[data-fx]').first()).toHaveCSS('position', 'static');
});

for (const size of [DESKTOP, PHONE]) {
  test(`marks every level chip with the info mark, its name the tag (${String(size.width)}px)`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto('/en/');
    const chips = page.locator('main button[data-lvl]');

    await expect(chips).toHaveCount(16);
    const all = await chips.all();
    for (const chip of all) {
      const mark = chip.locator('svg');
      await expect(mark).toBeVisible();
      await expect(mark).toHaveAttribute('aria-hidden', 'true');
      expect(await mark.boundingBox()).toMatchObject({ width: 14, height: 14 });
    }
    await expect(
      page
        .locator('main li.sys')
        .first()
        .getByRole('button', { name: 'Level 3 · Recovery', exact: true }),
    ).toBeVisible();
  });
}
