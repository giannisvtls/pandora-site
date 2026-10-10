// @vitest-environment jsdom
// The explainer island (spec §8) in jsdom, with the showModal() stand-in of src/test/setup.ts: its
// views. A feature button opens the feature view (title, what, "How it works", "Needs", "On these
// systems" with each system's link and Included / Optional), leaving out a section without text; a
// level button opens the level view (title, what, "What you get", "Where it stops", "Systems that
// reach this level" with each vehicle word); focus goes to the close button. Closing and focus are
// in explainer-dialog.test.tsx; what only a browser does is in e2e/explainer.spec.ts.
import { fireEvent, screen, within } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';

import { dialogNamed, opener, renderPage } from './explainer-fixtures';

// The headings of the open dialog, in order.
const headings = (dialog: HTMLElement) =>
  within(dialog)
    .getAllByRole('heading')
    .map((heading) => `${heading.tagName} ${heading.textContent}`);

// A list of the dialog, named by its heading: each item's text and link.
const items = (dialog: HTMLElement, name: string) =>
  within(within(dialog).getByRole('list', { name }))
    .getAllByRole('listitem')
    .map((item) => ({
      text: item.textContent,
      href: item.querySelector('a')?.getAttribute('href'),
    }));

describe('Explainer', () => {
  it('renders a closed dialog, with nothing in it but the close button, until a button opens it', () => {
    renderPage();

    expect(screen.queryByRole('dialog')).toBeNull();
    const dialog = document.querySelector('dialog');
    expect(dialog).not.toHaveAttribute('open');
    expect(dialog?.querySelectorAll('h2, p, ul')).toHaveLength(0);
    // No name pointing at a title that is not there.
    expect(dialog).not.toHaveAttribute('aria-labelledby');
  });

  it('opens the feature view, named by its title, with focus on the close button', () => {
    renderPage();

    fireEvent.click(opener('GPS/GLONASS tracking'));

    const dialog = dialogNamed('GPS/GLONASS tracking');
    expect(dialog).toHaveAttribute('open');
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus();
    expect(headings(dialog)).toEqual([
      'H2 GPS/GLONASS tracking',
      'H3 How it works',
      'H3 Needs',
      'H3 On these systems',
    ]);
    expect(within(dialog).getByText('Shows where the vehicle is.')).toHaveClass('fx-what');
    expect(within(dialog).getByText('A satellite receiver logs each position.')).toBeVisible();
    expect(within(dialog).getByText('An antenna with a view of the sky.')).toBeVisible();
    expect(items(dialog, 'On these systems')).toEqual([
      { text: 'Elite V3Included', href: '/en/systems/car/elite-v3/' },
      { text: 'Light Pro V2Optional', href: '/en/systems/car/light-pro-v2/' },
    ]);
  });

  it('leaves out a section without text: no "How it works" or "Needs" for Wi-Fi positioning', () => {
    renderPage();

    fireEvent.click(opener('Wi-Fi positioning'));

    const dialog = dialogNamed('Wi-Fi positioning');
    expect(headings(dialog)).toEqual(['H2 Wi-Fi positioning', 'H3 On these systems']);
    expect(items(dialog, 'On these systems')).toEqual([
      { text: 'Elite V3Included', href: '/en/systems/car/elite-v3/' },
    ]);
  });

  it('opens the level view with its four sections and each system with its vehicle word', () => {
    renderPage();

    fireEvent.click(opener('Level 3 · Recovery'));

    const dialog = dialogNamed('Level 3 · Recovery');
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus();
    expect(headings(dialog)).toEqual([
      'H2 Level 3 · Recovery',
      'H3 What you get',
      'H3 Where it stops',
      'H3 Systems that reach this level',
    ]);
    expect(within(dialog).getByText('You know where the vehicle is.')).toHaveClass('fx-what');
    expect(items(dialog, 'What you get').map(({ text }) => text)).toEqual([
      'Everything in level 2',
      'GPS tracking',
    ]);
    expect(within(dialog).getByText('Cost.')).toBeVisible();
    expect(items(dialog, 'Systems that reach this level')).toEqual([
      { text: 'Elite V3car', href: '/en/systems/car/elite-v3/' },
      { text: 'Tracertrucks & trackers', href: '/en/systems/fleet/tracer/' },
    ]);
  });

  it('opens nothing for a key it has no view for, an inherited one included', () => {
    renderPage();

    fireEvent.click(opener('Unknown'));
    fireEvent.click(opener('Inherited'));

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens from a button added to the page after it hydrated', () => {
    renderPage();
    const late = document.createElement('button');
    late.dataset.fx = 'wifi';
    late.textContent = 'Wi-Fi (added later)';
    document.querySelector('main')?.append(late);

    fireEvent.click(late);

    expect(dialogNamed('Wi-Fi positioning')).toHaveAttribute('open');
  });

  it('keeps the reveal classes out of its markup (the reveal script never sees it)', () => {
    renderPage();
    fireEvent.click(opener('Level 3 · Recovery'));

    const classes = [...dialogNamed('Level 3 · Recovery').querySelectorAll('[class]')].flatMap(
      (element) => [...element.classList],
    );
    expect(classes).not.toEqual([]);
    expect(
      classes.filter((name) => ['rv', 'rv-g', 'zoom', 'wipe', 'line-rv', 'in'].includes(name)),
    ).toEqual([]);
  });
});
