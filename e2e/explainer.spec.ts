import { EOL } from 'node:os';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  entries,
  explainerIsland,
  explainerNamed,
  explainerPage,
  featureButton,
  levelButton,
  openExplainer,
  stayOnPage,
} from './explainer-fixtures';
import { focusInDialog, overflowOf } from './menu-fixtures';

// The explainer island on the built /en/ (spec §8, A10): every feature and level button opens a
// native modal dialog named by its title, with focus on Close; Tab stays inside; Escape, the close
// button, a click on the backdrop and following a link close it, focus goes back to the button
// that opened it, and the page does not scroll meanwhile. Its props stay under 40 KB, axe finds
// nothing with it open. Small screens, zoom and motion are in explainer-layout.spec.ts.

// WCAG 2.0, 2.1 and 2.2 at levels A and AA. axe-core 4.13 defines no `wcag22a` tag.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const GPS = 'GPS/GLONASS tracking';
const LEVEL_3 = 'Level 3 · Recovery';

async function expectClosedWithFocusOn(page: Page, dialog: Locator, button: Locator) {
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
  expect(await overflowOf(page)).toBe('visible');
}

test.describe('the explainer', () => {
  test(`opens "${GPS}" from its button, with focus on Close and 11 systems`, async ({ page }) => {
    await explainerPage(page);
    const explainer = await openExplainer(page, featureButton(page, 'gps'), GPS);

    await expect(explainer.close).toBeFocused();
    await expect(explainer.dialog.getByRole('heading', { level: 3 })).toHaveText([
      'How it works',
      'Needs',
      'On these systems',
    ]);
    const systems = await entries(explainer, 'On these systems');
    expect(systems).toHaveLength(11);
    expect(systems.filter(([, beside]) => beside === 'Optional')).toEqual([
      ['Light Pro V2', 'Optional'],
      ['Primo', 'Optional'],
    ]);
    expect(systems.filter(([, beside]) => beside === 'Included')).toHaveLength(9);
    await expect(explainer.dialog.getByRole('link', { name: 'Elite V3' })).toHaveAttribute(
      'href',
      '/en/systems/car/elite-v3/',
    );
    // The page under it does not scroll.
    expect(await overflowOf(page)).toBe('hidden');
  });

  test('keeps Tab inside, and Escape gives focus back to the button', async ({ page }) => {
    await explainerPage(page);
    const button = featureButton(page, 'gps');
    const explainer = await openExplainer(page, button, GPS, { byTap: true });

    const names = new Set<string>();
    for (let press = 1; press <= 15; press += 1) {
      await page.keyboard.press('Tab');
      const focus = await focusInDialog(explainer);
      expect(focus, `Tab ${String(press)}`).toMatchObject({ isInside: true, hasFocus: true });
      names.add(focus.name);
    }
    // 15 presses went round the 12 controls: Close and 11 system links.
    expect(names.size).toBe(12);
    await explainer.close.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(explainer.dialog.getByRole('link').last()).toBeFocused();
    expect(await focusInDialog(explainer)).toMatchObject({ isInside: true, hasFocus: true });

    await page.keyboard.press('Escape');

    await expectClosedWithFocusOn(page, explainer.dialog, button);
  });

  test('lists only Elite V3 for Wi-Fi positioning (a button /en/ does not show, added)', async ({
    page,
  }) => {
    await explainerPage(page);
    // No system on the index highlights Wi-Fi positioning; a page that does (the product page's
    // specification, Phase 2) gets the same document-level listener.
    await page.locator('main').evaluate((main) => {
      main.insertAdjacentHTML(
        'beforeend',
        '<button type="button" data-fx="wifi" aria-haspopup="dialog">Wi-Fi positioning</button>',
      );
    });

    const explainer = await openExplainer(page, featureButton(page, 'wifi'), 'Wi-Fi positioning');

    expect(await entries(explainer, 'On these systems')).toEqual([['Elite V3', 'Included']]);
    await expect(explainer.dialog.getByRole('heading', { level: 3 })).toHaveText([
      'On these systems',
    ]);
  });

  test(`opens "${LEVEL_3}" from a level button, listing 11 systems with Finder and Tracer`, async ({
    page,
  }) => {
    await explainerPage(page);
    const explainer = await openExplainer(page, levelButton(page, '3'), LEVEL_3);

    await expect(explainer.close).toBeFocused();
    await expect(explainer.dialog.getByRole('heading', { level: 3 })).toHaveText([
      'What you get',
      'Where it stops',
      'Systems that reach this level',
    ]);
    const systems = await entries(explainer, 'Systems that reach this level');
    expect(systems).toHaveLength(11);
    expect(systems).toEqual(
      expect.arrayContaining([
        ['Finder', 'trucks & trackers'],
        ['Tracer', 'trucks & trackers'],
        ['Elite V3', 'car'],
      ]),
    );
  });

  test('closes on a click on the backdrop, not on a click inside the panel', async ({ page }) => {
    await explainerPage(page);
    const button = levelButton(page, '3');
    const explainer = await openExplainer(page, button, LEVEL_3, { byTap: true });
    const box = await explainer.dialog.boundingBox();
    if (box === null) throw new Error('The dialog has no box');

    // The panel's own padding (top left, left, bottom right) and its border: inside the dialog's
    // box, so not the backdrop, though nothing there but the panel takes the click.
    await page.mouse.click(box.x + 6, box.y + 6);
    await page.mouse.click(box.x + 20, box.y + box.height / 2);
    await page.mouse.click(box.x + box.width - 6, box.y + box.height - 6);
    await page.mouse.click(box.x, box.y + box.height / 2);
    await expect(explainer.dialog).toBeVisible();

    await page.mouse.click(box.x - 200, box.y + box.height / 2);

    await expectClosedWithFocusOn(page, explainer.dialog, button);
  });

  test('closes with the close button and when a system link is followed', async ({ page }) => {
    await explainerPage(page);
    await stayOnPage(page);
    const first = featureButton(page, 'gps');
    const other = page.locator('main button[data-fx="gps"]').nth(3);

    const explainer = await openExplainer(page, first, GPS, { byTap: true });
    await explainer.close.click();
    await expectClosedWithFocusOn(page, explainer.dialog, first);

    // Another button for the same feature, on another card: focus goes back to that one.
    await openExplainer(page, other, GPS, { byTap: true });
    await explainer.dialog.getByRole('link', { name: 'Primo', exact: true }).click();
    await expectClosedWithFocusOn(page, explainer.dialog, other);
  });

  test('opens on a click the instant the island has hydrated', async ({ page }) => {
    // Clicks the GPS button in the microtask after Astro removes the explainer island's `ssr`
    // attribute, before the next frame.
    await page.addInitScript(() => {
      const observer = new MutationObserver((records) => {
        for (const { target } of records) {
          const isIdleIsland =
            target instanceof Element && target.getAttribute('client') === 'idle';
          if (!isIdleIsland || target.hasAttribute('ssr')) continue;
          observer.disconnect();
          document.querySelector<HTMLElement>('main button[data-fx="gps"]')?.click();
        }
      });
      observer.observe(document, { subtree: true, attributeFilter: ['ssr'] });
    });

    await page.goto('/en/');

    await expect(explainerNamed(page, GPS).dialog).toBeVisible();
  });

  test('carries its props in under 40 KB on /en/', async ({ request }, testInfo) => {
    const response = await request.get('/en/');
    const html = await response.text();
    const island = /<astro-island[^>]* client="idle"[^>]*>/u.exec(html)?.[0] ?? '';
    const props = / props="([^"]*)"/u.exec(island)?.[1] ?? '';
    const bytes = Buffer.byteLength(props);

    testInfo.annotations.push({ type: 'explainer props', description: `${String(bytes)} bytes` });
    process.stdout.write(`explainer props on /en/: ${String(bytes)} bytes${EOL}`);
    expect(bytes).toBeGreaterThan(1000);
    expect(bytes).toBeLessThan(40_000);
  });

  for (const theme of ['light', 'dark']) {
    test(`has no WCAG 2.2 AA violations with it open, in ${theme} (axe)`, async ({ page }) => {
      await page.addInitScript((saved) => {
        localStorage.setItem('theme', saved);
      }, theme);
      await explainerPage(page);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

      for (const [button, name] of [
        [featureButton(page, 'gps'), GPS],
        [levelButton(page, '3'), LEVEL_3],
      ] as const) {
        const explainer = await openExplainer(page, button, name);
        const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
        expect(results.violations, name).toEqual([]);
        await explainer.close.click();
        await expect(explainer.dialog).toBeHidden();
      }
    });
  }
});

test.describe('the explainer island', () => {
  test('hydrates when the browser is idle, on every width', async ({ page }) => {
    await explainerPage(page, { width: 390, height: 844 });

    await expect(explainerIsland(page)).toHaveCount(1);
    await expect(featureButton(page, 'gps')).toBeVisible();
    await expect(featureButton(page, 'gps')).toHaveAttribute('aria-haspopup', 'dialog');
  });
});
