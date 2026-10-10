import { expect, type Locator, type Page } from '@playwright/test';

// The explainer on the built /en/, for explainer.spec.ts and explainer-layout.spec.ts.

export const DESKTOP = { width: 1280, height: 800 };

// The explainer's island: the page's only one hydrated when idle.
export const explainerIsland = (page: Page) => page.locator('astro-island[client="idle"]');

export interface Explainer {
  readonly dialog: Locator;
  readonly close: Locator;
  readonly panel: Locator;
}

export function explainerNamed(page: Page, name: string): Explainer {
  const dialog = page.getByRole('dialog', { name, exact: true });
  return {
    dialog,
    close: dialog.getByRole('button', { name: 'Close', exact: true }),
    panel: dialog.locator('.fx-body'),
  };
}

// The first explainer button on /en/ for a feature key or a level.
export const featureButton = (page: Page, key: string) =>
  page.locator(`main button[data-fx="${key}"]`).first();
export const levelButton = (page: Page, level: string) =>
  page.locator(`main button[data-lvl="${level}"]`).first();

// /en/ at `size`, once the explainer has hydrated (its listeners are wired inside hydrate(), so
// the buttons work once Astro drops `ssr`).
export async function explainerPage(page: Page, size = DESKTOP): Promise<void> {
  await page.setViewportSize(size);
  await page.goto('/en/');
  await expect(explainerIsland(page)).not.toHaveAttribute('ssr');
}

// Once the opening animations (the panel's slide, the backdrop's fade) have finished.
export async function settled(page: Page): Promise<void> {
  await page.locator('html').evaluate(async (html) => {
    await Promise.all(
      html.ownerDocument.getAnimations().map(async (animation) => animation.finished),
    );
  });
}

// Opens the explainer `name` with `button`; with `byTap`, a click that leaves focus where it was,
// as a tap does in some browsers, so only the island's own restore brings focus back.
export async function openExplainer(
  page: Page,
  button: Locator,
  name: string,
  { byTap = false } = {},
): Promise<Explainer> {
  await (byTap ? button.dispatchEvent('click') : button.click());
  const explainer = explainerNamed(page, name);
  await expect(explainer.dialog).toBeVisible();
  await settled(page);
  return explainer;
}

// The entries of the list named `name`: each system's name and what stands beside it.
export const entries = (explainer: Explainer, name: string) =>
  explainer.dialog
    .getByRole('list', { name, exact: true })
    .getByRole('listitem')
    .evaluateAll((items) =>
      items.map((item) => [
        item.querySelector('a')?.textContent ?? '',
        item.querySelector('span')?.textContent ?? '',
      ]),
    );

// Follows links to the Phase 2 product pages without leaving: the click stays on this page once
// the dialog has seen it.
export async function stayOnPage(page: Page): Promise<void> {
  await page.locator('html').evaluate((html) => {
    html.ownerDocument.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('a') !== null) {
        event.preventDefault();
      }
    });
  });
}
