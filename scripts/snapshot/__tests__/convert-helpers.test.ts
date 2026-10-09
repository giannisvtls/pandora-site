// The converter's small rules: slugs (A17), partial dates (A14) and media ids (lead decision,
// cycle 2).
import { describe, expect, it } from 'vitest';

import { mediaIdOf, partialDateOf, slugOf } from '../convert-text';

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

describe('mediaIdOf', () => {
  it('is the path under src/assets/media/ without the extension, / as -', () => {
    expect(mediaIdOf('src/assets/media/pricelist/acc-band.png')).toBe('pricelist-acc-band');
    expect(mediaIdOf('src/assets/media/pandora-camper-2.webp')).toBe('pandora-camper-2');
    expect(() => mediaIdOf('src/assets/brand/invetec-logo.webp')).toThrow('is not under');
  });
});
