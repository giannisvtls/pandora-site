// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';

import FixtureToggle from './FixtureToggle';

describe('FixtureToggle', () => {
  it('flips aria-pressed on click', () => {
    render(<FixtureToggle />);
    const button = screen.getByRole('button', { name: 'Fixture toggle' });

    expect(button).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });
});
