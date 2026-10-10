// The converter's small rules: slugs (A17) and partial dates (A14). Media ids are the contract's
// (`mediaIdOf`, tested with the media schema).
import { describe, expect, it } from 'vitest';

import { partialDateOf, slugOf } from '../convert-text';

describe('slugOf', () => {
  it.each([
    ['Smart Pro V4 FD', 'smart-pro-v4-fd'],
    ['Elite V3', 'elite-v3'],
    ["INVETEC in La Repubblica's Affari & Finanza", 'invetec-in-la-repubblicas-affari-finanza'],
    ['Get 15% off', 'get-15-off'],
    ['Pandora Charger: smart charger-maintainer', 'pandora-charger-smart-charger-maintainer'],
    ['Café Crème', 'cafe-creme'],
  ])('%j -> %s', (text, slug) => {
    expect(slugOf(text)).toBe(slug);
  });

  it('refuses a text with no letter or digit', () => {
    expect(() => slugOf(' & ')).toThrow('" & " gives an empty slug');
  });
});

describe('partialDateOf', () => {
  it.each([
    ['Feb 11, 2026', '2026-02-11'],
    ['Mar 1, 2022', '2022-03-01'],
    ['Jan 2026', '2026-01'],
    ['2025', '2025'],
    ['Fev 11, 2026', undefined],
    ['11/02/2026', undefined],
    ['Spring 2026', undefined],
  ])('%j -> %j, never a day or month the source does not give', (source, date) => {
    expect(partialDateOf(source)).toBe(date);
  });
});
