// @vitest-environment jsdom
// The mobile menu island (spec §8) in jsdom, with the showModal() stand-in of src/test/setup.ts:
// the burger opens the dialog with the nav and the switcher and focus moves to the first link;
// Escape, the close button and following a link close it and give focus back to the burger; Tab
// and Shift+Tab wrap at the ends; while open, the close button follows the burger through a resize
// (also when the menu was closed and opened again before the close event), and the menu closes once
// a resize hides the burger, with focus on the header's own link. What only a browser does (the
// inert page, the scroll lock, the real Tab order, layout) is in e2e/menu.spec.ts and
// e2e/menu-resize.spec.ts.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LANGUAGE_NAMES } from '../../../content/contract';
import MobileMenu, { type MobileMenuProps } from '../MobileMenu';

const PROPS: MobileMenuProps = {
  labels: { open: 'Open menu', close: 'Close menu', nav: 'Mobile', language: 'Language' },
  links: [
    { label: 'Systems', href: '/en/systems/car/', isCurrent: true },
    { label: 'Compare', href: '/en/compare/', isCurrent: false },
    { label: 'Contact', href: '/en/contact/', isCurrent: false },
  ],
  languages: [
    { locale: 'en', name: LANGUAGE_NAMES.en, path: '/en/', isCurrent: true },
    { locale: 'el', name: LANGUAGE_NAMES.el, path: '/el/', isCurrent: false },
  ],
};

// jsdom cannot navigate: links followed in these tests stay on the page.
const stayOnPage = (event: Event) => {
  event.preventDefault();
};

beforeEach(() => {
  document.addEventListener('click', stayOnPage);
});

afterEach(() => {
  document.removeEventListener('click', stayOnPage);
  vi.restoreAllMocks();
});

// Lays the burger out at `top`, `left` (jsdom lays nothing out).
function placeBurger(top: number, left: number): void {
  vi.spyOn(burger(), 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: left, y: top, width: 44, height: 44 }),
  );
}

// The close button's place, as the dialog's CSS variables give it.
const closePlace = (dialog: HTMLElement) => [
  dialog.style.getPropertyValue('--burger-top'),
  dialog.style.getPropertyValue('--burger-left'),
];

const resize = () => {
  fireEvent(globalThis as unknown as Window, new Event('resize'));
};

const burger = () => screen.getByRole('button', { name: 'Open menu' });

// Renders the menu and opens it with the burger; the dialog, found by its name.
function openMenu(): HTMLElement {
  render(<MobileMenu {...PROPS} />);
  fireEvent.click(burger());
  return screen.getByRole('dialog', { name: 'Mobile' });
}

async function expectClosed(dialog: HTMLElement): Promise<void> {
  expect(dialog).not.toHaveAttribute('open');
  expect(screen.queryByRole('dialog')).toBeNull();
  // Focus comes back with the dialog's `close` event, a task after close().
  await waitFor(() => {
    expect(burger()).toHaveFocus();
  });
}

describe('MobileMenu', () => {
  it('shows only the burger, named from Site copy, until it is opened', () => {
    render(<MobileMenu {...PROPS} />);

    expect(burger()).toHaveAttribute('aria-haspopup', 'dialog');
    expect(burger()).toHaveAttribute('aria-controls', 'm-nav');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('opens a dialog named by the mobile nav label, with the nav and the switcher', () => {
    const dialog = openMenu();
    const nav = within(dialog).getByRole('navigation', { name: 'Mobile' });
    const switcher = within(dialog).getByRole('list', { name: 'Language' });

    expect(dialog).toHaveAttribute('open');
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['Systems', '/en/systems/car/'],
      ['Compare', '/en/compare/'],
      ['Contact', '/en/contact/'],
    ]);
    expect(within(nav).getByRole('link', { name: 'Systems' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Compare' })).not.toHaveAttribute('aria-current');
    expect(within(switcher).getByText('EN')).toHaveAttribute('aria-current', 'true');
    const greek = within(switcher).getByRole('link', { name: `EL ${LANGUAGE_NAMES.el}` });
    expect(greek).toHaveAttribute('href', '/el/');
    expect(greek).toHaveAttribute('hreflang', 'el');
    expect(greek).toHaveAttribute('lang', 'el');
    expect(within(dialog).getByRole('button', { name: 'Close menu' })).toBeVisible();
  });

  it('moves focus to the first link and places the close button where the burger is', () => {
    const dialog = openMenu();

    expect(within(dialog).getByRole('link', { name: 'Systems' })).toHaveFocus();
    // jsdom lays nothing out: the burger's box is at 0, 0.
    expect(dialog.style.getPropertyValue('--burger-top')).toBe('0px');
    expect(dialog.style.getPropertyValue('--burger-left')).toBe('0px');
  });

  it('closes on Escape and gives focus back to the burger', async () => {
    const dialog = openMenu();

    fireEvent.keyDown(within(dialog).getByRole('link', { name: 'Systems' }), { key: 'Escape' });

    await expectClosed(dialog);
  });

  it('closes with the close button and gives focus back to the burger', async () => {
    const dialog = openMenu();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close menu' }));

    await expectClosed(dialog);
  });

  it.each([['Compare'], [`EL ${LANGUAGE_NAMES.el}`]])(
    'closes when the link %s is followed and gives focus back to the burger',
    async (name) => {
      const dialog = openMenu();

      fireEvent.click(within(dialog).getByRole('link', { name }));

      await expectClosed(dialog);
    },
  );

  it('opens again after it was closed', async () => {
    const dialog = openMenu();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close menu' }));
    await expectClosed(dialog);

    fireEvent.click(burger());

    expect(screen.getByRole('dialog', { name: 'Mobile' })).toHaveAttribute('open');
    expect(screen.getByRole('link', { name: 'Systems' })).toHaveFocus();
  });

  it('wraps Tab from the last control to the first, and Shift+Tab back', () => {
    const dialog = openMenu();
    const close = within(dialog).getByRole('button', { name: 'Close menu' });
    const last = within(dialog).getByRole('link', { name: `EL ${LANGUAGE_NAMES.el}` });

    last.focus();
    expect(fireEvent.keyDown(last, { key: 'Tab' })).toBe(false);
    expect(close).toHaveFocus();

    expect(fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })).toBe(false);
    expect(last).toHaveFocus();

    // Focus on the dialog itself (a click on its background) counts as an end both ways.
    dialog.tabIndex = -1;
    dialog.focus();
    expect(fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })).toBe(false);
    expect(last).toHaveFocus();
    dialog.focus();
    expect(fireEvent.keyDown(dialog, { key: 'Tab' })).toBe(false);
    expect(close).toHaveFocus();

    // Between the ends the browser moves focus itself: the key is left alone.
    const middle = within(dialog).getByRole('link', { name: 'Compare' });
    middle.focus();
    expect(fireEvent.keyDown(middle, { key: 'Tab' })).toBe(true);
    expect(fireEvent.keyDown(middle, { key: 'Tab', shiftKey: true })).toBe(true);
    expect(middle).toHaveFocus();
  });

  it('keeps the close button over the burger through a resize, until the menu closes', async () => {
    render(<MobileMenu {...PROPS} />);
    placeBurger(30, 300);
    fireEvent.click(burger());
    const dialog = screen.getByRole('dialog', { name: 'Mobile' });
    expect(closePlace(dialog)).toEqual(['30px', '300px']);

    placeBurger(40, 120);
    resize();
    expect(closePlace(dialog)).toEqual(['40px', '120px']);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close menu' }));
    await expectClosed(dialog);
    placeBurger(50, 60);
    resize();
    // Closed: the resize watch has ended.
    expect(closePlace(dialog)).toEqual(['40px', '120px']);
  });

  it('keeps the close button on the screen', () => {
    render(<MobileMenu {...PROPS} />);
    placeBurger(-20, 5000);
    fireEvent.click(burger());

    expect(closePlace(screen.getByRole('dialog', { name: 'Mobile' }))).toEqual([
      '0px',
      `${String(innerWidth - 44)}px`,
    ]);
  });

  it('keeps the resize watch and focus of a menu opened again before the close event', async () => {
    render(<MobileMenu {...PROPS} />);
    placeBurger(30, 300);
    fireEvent.click(burger());
    const dialog = screen.getByRole('dialog', { name: 'Mobile' });

    // Closed and opened again in one task: the close event of the first session comes after.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close menu' }));
    fireEvent.click(burger());
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(dialog).toHaveAttribute('open');
    expect(within(dialog).getByRole('link', { name: 'Systems' })).toHaveFocus();
    placeBurger(40, 120);
    resize();
    expect(closePlace(dialog)).toEqual(['40px', '120px']);
  });

  it('closes once a resize hides the burger, with focus on the header link to where it was', async () => {
    // The header around the island, with its own nav (shown: it has boxes) where the menu's
    // first link, Systems, is not the first.
    render(
      <header>
        <nav aria-label="Primary">
          <a href="/en/compare/">Compare</a>
          <a href="/en/systems/car/">Systems</a>
        </nav>
        <MobileMenu {...PROPS} />
      </header>,
    );
    const primary = screen.getByRole('navigation', { name: 'Primary' });
    for (const link of within(primary).getAllByRole('link')) {
      vi.spyOn(link, 'getClientRects').mockReturnValue([
        DOMRect.fromRect({ width: 80, height: 20 }),
      ] as unknown as DOMRectList);
    }
    fireEvent.click(burger());
    const dialog = screen.getByRole('dialog', { name: 'Mobile' });
    expect(within(dialog).getByRole('link', { name: 'Systems' })).toHaveFocus();

    burger().style.display = 'none';
    resize();

    expect(dialog).not.toHaveAttribute('open');
    // Never the hidden burger: the header's own Systems link (e2e/menu-resize.spec.ts).
    await waitFor(() => {
      expect(within(primary).getByRole('link', { name: 'Systems' })).toHaveFocus();
    });
  });
});
