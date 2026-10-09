// The Finder and Languages globals (spec §2). Languages is registered with its snapshot; the
// Finder is a schema only until the snapshot converter registers it with its data.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import { CATEGORY_IDS, finderSchema, GLOBALS, languagesSchema, LEVEL_IDS } from '../contract';
import type { Loose } from './contract-fixtures';

function pathsOf(schema: z.ZodType, value: unknown): string[] {
  const issues = schema.safeParse(value).error?.issues ?? [];
  return issues.map((issue) => issue.path.map(String).join('.'));
}

describe('languages', () => {
  const file = new URL('../../../content-snapshot/languages.json', import.meta.url);
  const snapshot = JSON.parse(readFileSync(file, 'utf8')) as Loose;

  it('is registered, and the snapshot has English live and the other three not', () => {
    expect(GLOBALS.languages).toBe(languagesSchema);
    expect(languagesSchema.parse(snapshot)).toStrictEqual({
      en: { live: true },
      el: { live: false },
      it: { live: false },
      sq: { live: false },
    });
  });

  it('needs every language, and only the four', () => {
    const three = { ...snapshot };
    delete three.sq;

    expect(pathsOf(languagesSchema, three)).toEqual(['sq']);
    expect(
      languagesSchema.safeParse({ ...snapshot, fr: { live: false } }).error?.issues,
    ).toMatchObject([{ code: 'unrecognized_keys', keys: ['fr'] }]);
  });

  it('takes live as a boolean and nothing else', () => {
    expect(pathsOf(languagesSchema, { ...snapshot, el: { live: 'yes' } })).toEqual(['el.live']);
    expect(pathsOf(languagesSchema, { ...snapshot, el: { live: false, draft: true } })).toEqual([
      'el',
    ]);
  });
});

// A Finder pick for one level.
function pickFor(level: string): Loose {
  return { product: `system-${level}`, reason: { en: `Test reason ${level}` } };
}

// A Finder with a pick for every vehicle and level, and the four place notes.
function finderFixture(): Loose {
  const levels = () => Object.fromEntries(LEVEL_IDS.map((level) => [level, pickFor(level)]));
  return {
    picks: Object.fromEntries(CATEGORY_IDS.map((vehicle) => [vehicle, levels()])),
    placeNotes: {
      garage: { en: 'Test garage note' },
      shared: { en: 'Test shared note' },
      street: { en: 'Test street note' },
      varies: { en: 'Test varies note' },
    },
  };
}

describe('finder', () => {
  it('accepts a pick per vehicle and level, and a note per place', () => {
    const finder = finderFixture();

    expect(finderSchema.parse(finder)).toStrictEqual(finder);
  });

  it('is not registered yet (the converter registers it with its data)', () => {
    expect(Object.keys(GLOBALS)).not.toContain('finder');
  });

  it('needs every level of every vehicle', () => {
    const finder = finderFixture();
    delete ((finder.picks as Loose).marine as Loose)['3'];

    expect(pathsOf(finderSchema, finder)).toEqual(['picks.marine.3']);
  });

  it('rejects a vehicle or a level outside the fixed keys', () => {
    const finder = finderFixture();
    const picks = finder.picks as Loose;

    expect(
      finderSchema.safeParse({ ...finder, picks: { ...picks, truck: picks.car } }).success,
    ).toBe(false);
    expect(
      finderSchema.safeParse({
        ...finder,
        picks: { ...picks, car: { ...(picks.car as Loose), 4: {} } },
      }).success,
    ).toBe(false);
  });

  it('needs an English reason and a product id', () => {
    const finder = finderFixture();
    const car = (finder.picks as Loose).car as Loose;
    car['1'] = { product: 'Elite V3', reason: { el: 'Test (el)' } };

    expect(pathsOf(finderSchema, finder)).toEqual(['picks.car.1.product', 'picks.car.1.reason.en']);
  });

  it('needs the four place notes, each in English', () => {
    const finder = finderFixture();
    const notes = finder.placeNotes as Loose;
    delete notes.varies;
    notes.garage = { it: 'Test (it)' };

    expect(pathsOf(finderSchema, finder)).toEqual(['placeNotes.garage.en', 'placeNotes.varies']);
  });
});
