// @vitest-environment jsdom
// The explainer island (spec §8) in jsdom, with the showModal() stand-in of src/test/setup.ts:
// closing and focus. Escape, the close button, a click on the backdrop and following a system link
// close it, and focus goes back to the button that opened it (another one each time), or to <main>
// once that button has gone or is hidden; a click inside the panel leaves it open; Tab and
// Shift+Tab wrap at the ends; a dialog closed and opened again in one task keeps its new view.
import { fireEvent, screen, waitFor, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { dialogNamed, opener, renderPage } from './explainer-fixtures';

// jsdom cannot navigate: links followed in these tests stay on the page.
const stayOnPage = (event: Event) => {
  if (event.target instanceof Element && event.target.closest('a') !== null) {
    event.preventDefault();
  }
};

beforeEach(() => {
  document.addEventListener('click', stayOnPage);
});

afterEach(() => {
  document.removeEventListener('click', stayOnPage);
});

// The ways out of the open dialog.
const CLOSE_PATHS: readonly (readonly [string, (dialog: HTMLElement) => void])[] = [
  [
    'Escape',
    (dialog) => {
      fireEvent.keyDown(within(dialog).getByRole('button', { name: 'Close' }), { key: 'Escape' });
    },
  ],
  [
    'the close button',
    (dialog) => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    },
  ],
  // The browser gives a click on the backdrop the dialog itself as its target.
  [
    'a click on the backdrop',
    (dialog) => {
      fireEvent.click(dialog);
    },
  ],
  [
    'following a system link',
    (dialog) => {
      fireEvent.click(within(dialog).getByRole('link', { name: 'Light Pro V2' }));
    },
  ],
];

async function expectClosedWithFocusOn(target: HTMLElement): Promise<void> {
  expect(screen.queryByRole('dialog')).toBeNull();
  // Focus comes back with the dialog's `close` event, a task after close().
  await waitFor(() => {
    expect(target).toHaveFocus();
  });
}

describe('closing the explainer', () => {
  it.each(CLOSE_PATHS)('closes on %s and gives focus back to its button', async (_, close) => {
    renderPage();
    const button = opener('GPS on another card');
    fireEvent.click(button);

    close(dialogNamed('GPS/GLONASS tracking'));

    await expectClosedWithFocusOn(button);
  });

  it('gives focus back to the button that opened it each time', async () => {
    renderPage();
    fireEvent.click(opener('GPS/GLONASS tracking'));
    fireEvent.click(
      within(dialogNamed('GPS/GLONASS tracking')).getByRole('button', { name: 'Close' }),
    );
    await expectClosedWithFocusOn(opener('GPS/GLONASS tracking'));

    fireEvent.click(opener('Level 3 · Recovery'));
    fireEvent.click(dialogNamed('Level 3 · Recovery'));

    await expectClosedWithFocusOn(opener('Level 3 · Recovery'));
  });

  it('stays open on a click inside the panel', () => {
    renderPage();
    fireEvent.click(opener('Level 3 · Recovery'));
    const dialog = dialogNamed('Level 3 · Recovery');

    fireEvent.click(dialog.querySelector('.fx-body') ?? dialog);
    fireEvent.click(within(dialog).getByRole('heading', { level: 2 }));
    fireEvent.click(within(dialog).getByText('Cost.'));

    expect(dialog).toHaveAttribute('open');
  });

  it.each([
    [
      'has gone',
      (button: HTMLElement) => {
        button.remove();
      },
    ],
    [
      'is hidden',
      (button: HTMLElement) => {
        button.style.display = 'none';
      },
    ],
    [
      'sits in a hidden card',
      (button: HTMLElement) => {
        button.parentElement?.style.setProperty('display', 'none');
      },
    ],
  ])('gives focus to <main> when its button %s', async (_, change) => {
    renderPage();
    const button = opener('Wi-Fi positioning');
    fireEvent.click(button);

    change(button);
    fireEvent.click(
      within(dialogNamed('Wi-Fi positioning')).getByRole('button', { name: 'Close' }),
    );

    await expectClosedWithFocusOn(screen.getByRole('main'));
  });
});

describe('focus in the open explainer', () => {
  it('wraps Tab from the last link to the close button, and Shift+Tab back', () => {
    renderPage();
    fireEvent.click(opener('GPS/GLONASS tracking'));
    const dialog = dialogNamed('GPS/GLONASS tracking');
    const close = within(dialog).getByRole('button', { name: 'Close' });
    const last = within(dialog).getByRole('link', { name: 'Light Pro V2' });

    last.focus();
    expect(fireEvent.keyDown(last, { key: 'Tab' })).toBe(false);
    expect(close).toHaveFocus();
    expect(fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })).toBe(false);
    expect(last).toHaveFocus();

    // Focus on the dialog itself (a click on its background) counts as an end both ways.
    dialog.tabIndex = -1;
    dialog.focus();
    expect(fireEvent.keyDown(dialog, { key: 'Tab' })).toBe(false);
    expect(close).toHaveFocus();
    // Between the ends the browser moves focus itself.
    expect(fireEvent.keyDown(close, { key: 'Tab' })).toBe(true);
  });

  it('keeps the view and focus of a dialog opened again before the close event', async () => {
    renderPage();
    fireEvent.click(opener('GPS/GLONASS tracking'));

    // Closed and opened from another button in one task: the close event comes after.
    fireEvent.click(
      within(dialogNamed('GPS/GLONASS tracking')).getByRole('button', { name: 'Close' }),
    );
    fireEvent.click(opener('Level 3 · Recovery'));
    await new Promise((resolve) => setTimeout(resolve, 10));

    const dialog = dialogNamed('Level 3 · Recovery');
    expect(dialog).toHaveAttribute('open');
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus();
  });
});
