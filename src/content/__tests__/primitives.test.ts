import { describe, expect, it } from 'vitest';

import {
  byCount,
  heading,
  idSchema,
  isPartialDate,
  LANGUAGE_NAMES,
  LOCALES,
  localizedText,
  partialDate,
  placeholdersOf,
  plural,
  showIn,
  slugSchema,
  template,
  text,
} from '../contract';

// The paths of a failed parse, as `a.b.c` strings.
function issuePaths(result: { error?: { issues: { path: PropertyKey[] }[] } }): string[] {
  return (result.error?.issues ?? []).map((issue) => issue.path.map(String).join('.'));
}

describe('languages', () => {
  it('are en, el, it and sq, each named in its own language', () => {
    expect(LOCALES).toEqual(['en', 'el', 'it', 'sq']);
    expect(LANGUAGE_NAMES).toEqual({
      en: 'English',
      el: expect.stringMatching(/^\p{Script=Greek}+$/u),
      it: 'Italiano',
      sq: 'Shqip',
    });
  });
});

describe('localizedText', () => {
  it('accepts a value per language and no key for a missing language', () => {
    expect(localizedText.safeParse({ en: 'Camper V3', el: 'Test (el)' }).success).toBe(true);
    expect(localizedText.safeParse({}).success).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['spaces only', ' '.repeat(3)],
    ['a tab and a new line only', '\t\n'],
    ['a no-break space only', String.fromCodePoint(0xa0)],
    ['leading whitespace', ' Camper V3'],
    ['trailing whitespace', 'Camper V3 '],
  ])('rejects a value that is %s', (_label, value) => {
    const result = localizedText.safeParse({ en: value });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(['en']);
  });

  it('rejects a language that is not one of the four', () => {
    const result = localizedText.safeParse({ en: 'Camper V3', de: 'Test' });

    expect(result.error?.issues).toMatchObject([{ code: 'unrecognized_keys', keys: ['de'] }]);
  });

  it('requires the source language when text() is given one, reporting the locale', () => {
    expect(issuePaths(text('el').safeParse({ en: 'Only English' }))).toEqual(['el']);
    expect(text('el').safeParse({ el: 'Test (el)' }).success).toBe(true);
    expect(text().safeParse({}).success).toBe(true);
  });
});

describe('showIn', () => {
  it('accepts distinct languages, the first being the source language', () => {
    expect(showIn.safeParse(['it']).success).toBe(true);
    expect(showIn.safeParse(['en', 'el', 'it', 'sq']).success).toBe(true);
  });

  it('rejects a repeated language at its index, and an empty list', () => {
    const repeated = showIn.safeParse(['en', 'el', 'en']);

    expect(repeated.error?.issues).toMatchObject([
      { path: [2], message: '"en" appears more than once' },
    ]);
    expect(showIn.safeParse([]).success).toBe(false);
  });
});

describe('template', () => {
  const sentence = template(['count', 'name']);

  it('accepts values that use exactly the declared placeholders, in any order', () => {
    const result = sentence.safeParse({
      en: '{count} systems for {name}',
      it: 'Per {name}: {count} sistemi ({count})',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a missing placeholder in the language that misses it', () => {
    const result = sentence.safeParse({ en: '{count} systems for {name}', el: '{count} test' });

    expect(issuePaths(result)).toEqual(['el']);
    expect(result.error?.issues[0]?.message).toBe(
      'Placeholders must be exactly {count} {name}: missing {name}',
    );
  });

  it('rejects an extra placeholder', () => {
    const result = sentence.safeParse({ en: '{count} systems for {name} in {city}' });

    expect(issuePaths(result)).toEqual(['en']);
    expect(result.error?.issues[0]?.message).toContain('unknown {city}');
  });

  it('allows no placeholder at all when none is declared', () => {
    expect(template([]).safeParse({ en: 'Both' }).success).toBe(true);
    expect(issuePaths(template([]).safeParse({ en: 'All {n}' }))).toEqual(['en']);
  });

  it('requires the source language when given one', () => {
    expect(issuePaths(template(['count'], 'en').safeParse({ el: '{count} test' }))).toEqual(['en']);
  });

  it('reads placeholders in order of appearance', () => {
    expect(placeholdersOf('{a} and {b2} then {a}, not { c } or {}')).toEqual(['a', 'b2', 'a']);
  });
});

describe('plural', () => {
  const systems = plural(['count'], 'en');

  it('needs one and other, and takes few and many as options', () => {
    expect(
      systems.safeParse({ one: { en: '{count} system' }, other: { en: '{count} systems' } })
        .success,
    ).toBe(true);
    expect(issuePaths(systems.safeParse({ other: { en: '{count} systems' } }))).toEqual(['one']);
  });

  it('checks the placeholders of every variant', () => {
    const result = systems.safeParse({
      one: { en: 'One system' },
      other: { en: '{count} systems' },
      few: { en: '{count} test' },
    });

    expect(issuePaths(result)).toEqual(['one.en']);
  });
});

describe('byCount', () => {
  it('needs the variants for 2, 3 and 4', () => {
    const grammar = byCount([], 'en');
    const all = { '2': { en: 'Both' }, '3': { en: 'All three' }, '4': { en: 'All four' } };

    expect(grammar.safeParse(all).success).toBe(true);
    expect(issuePaths(grammar.safeParse({ '2': all['2'], '3': all['3'] }))).toEqual(['4']);
  });
});

describe('heading', () => {
  it('is valid without a payload', () => {
    expect(heading('en').safeParse({ lead: { en: 'Your car is not going' } }).success).toBe(true);
  });

  it('needs the lead, and a payload in the source language when there is one', () => {
    const result = heading('en').safeParse({ lead: {}, payload: { el: 'Test (el)' } });

    expect(issuePaths(result)).toEqual(['lead.en', 'payload.en']);
  });
});

describe('partialDate', () => {
  it.each(['2025', '2026-01', '2026-02-11', '2024-02-29', '2026-12-31'])('accepts %s', (date) => {
    expect(partialDate.safeParse(date).success).toBe(true);
  });

  it.each([
    '2026-02-30',
    '2025-02-29',
    '2026-04-31',
    '2026-13',
    '2026-00',
    '2026-01-00',
    '26',
    '2026-1-05',
    '2026-02-11T10:00',
    'Feb 11, 2026',
  ])('rejects %s', (date) => {
    expect(isPartialDate(date)).toBe(false);
    expect(partialDate.safeParse(date).success).toBe(false);
  });
});

describe('ids and slugs', () => {
  it('accept lower-case ASCII letters, digits and hyphens', () => {
    expect(idSchema.safeParse('d-061-camper').success).toBe(true);
    expect(idSchema.safeParse('Elite').success).toBe(false);
    expect(idSchema.safeParse('elite v3').success).toBe(false);
    expect(slugSchema.safeParse('smart-pro-v4-fd').success).toBe(true);
    expect(slugSchema.safeParse('-elite').success).toBe(false);
    expect(slugSchema.safeParse('elite--v3').success).toBe(false);
  });
});
