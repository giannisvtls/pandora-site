// Reading Site copy in a language: a value or an error naming the field, templates filled only
// through their placeholders, and counted text in the form the language's plural rules pick.
import { describe, expect, it } from 'vitest';

import { fill, pluralIn, textIn } from '../copy';

describe('textIn', () => {
  it("gives the language's value", () => {
    expect(textIn({ en: 'Skip', el: 'Παράλειψη' }, 'el', 'siteCopyCommon.skipLink')).toBe(
      'Παράλειψη',
    );
  });

  it('refuses a missing value, naming the field and the language (never English filler)', () => {
    expect(() => textIn({ en: 'Skip' }, 'el', 'siteCopyCommon.skipLink')).toThrow(
      'siteCopyCommon.skipLink has no "el" text',
    );
    expect(() => textIn(undefined, 'en', 'siteCopyHome.title')).toThrow(
      'siteCopyHome.title has no "en" text',
    );
  });
});

describe('fill', () => {
  it('replaces every placeholder, wherever the language puts it', () => {
    expect(fill('{page} — INVETEC', { page: 'Compare' })).toBe('Compare — INVETEC');
    expect(fill('Level {n} · {title}', { title: 'Recovery', n: '3' })).toBe('Level 3 · Recovery');
    expect(fill('{n}{n}', { n: '1' })).toBe('11');
  });

  it('inserts a value as it is, `$&` and all', () => {
    expect(fill('{page} — INVETEC', { page: 'A $& B $1' })).toBe('A $& B $1 — INVETEC');
  });

  it('refuses a placeholder without a value, an inherited key included', () => {
    expect(() => fill('{page} — INVETEC', {})).toThrow('No value for {page} in "{page} — INVETEC"');
    expect(() => fill('{constructor}', {})).toThrow('No value for {constructor}');
  });
});

describe('pluralIn', () => {
  const ACCESSORIES = {
    one: { en: '{count} accessory', it: '{count} accessorio' },
    other: { en: '{count} accessories', it: '{count} accessori' },
  };
  const FIELD = 'siteCopyCommon.accessoryCount';

  it("picks the language's form for the count and writes the number its way", () => {
    expect(pluralIn(ACCESSORIES, 'en', FIELD, { count: 1 })).toBe('1 accessory');
    expect(pluralIn(ACCESSORIES, 'en', FIELD, { count: 0 })).toBe('0 accessories');
    expect(pluralIn(ACCESSORIES, 'en', FIELD, { count: 1200 })).toBe('1,200 accessories');
  });

  it('falls back to `other` when the selected form is absent in the language', () => {
    // Italian selects `many` for a million; nobody wrote it.
    expect(new Intl.PluralRules('it').select(1_000_000)).toBe('many');
    expect(pluralIn(ACCESSORIES, 'it', FIELD, { count: 1_000_000 })).toBe('1.000.000 accessori');
    const withMany = { ...ACCESSORIES, many: { it: '{count} di accessori' } };
    expect(pluralIn(withMany, 'it', FIELD, { count: 1_000_000 })).toBe('1.000.000 di accessori');
  });

  it('fills the other placeholders, and refuses a language with no `other`', () => {
    const systems = {
      one: { en: '{count} system for {vehicle}' },
      other: { en: '{count} systems for {vehicle}' },
    };

    expect(pluralIn(systems, 'en', 'x', { count: 2, vehicle: 'boat' })).toBe('2 systems for boat');
    expect(() => pluralIn(systems, 'el', 'siteCopyCatalogue.count', { count: 2 })).toThrow(
      'siteCopyCatalogue.count.other has no "el" text',
    );
  });
});
