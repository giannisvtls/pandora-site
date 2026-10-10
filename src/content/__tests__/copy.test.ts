// Reading Site copy in a language: a value or an error naming the field, and templates filled
// only through their placeholders.
import { describe, expect, it } from 'vitest';

import { fill, textIn } from '../copy';

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
