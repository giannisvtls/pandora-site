// The item and language rules (spec §4), on fixtures (./rules-fixtures.ts): which items a
// language shows, the relations it drops, what makes a value complete, which languages the build
// renders and when a language is ready.
import { describe, expect, it } from 'vitest';

import { byCodeUnit } from '../../../scripts/crawl/output';
import { gapsOf } from '../completeness';
import { LOCALES, type Locale } from '../contract';
import {
  assertLanguageReady,
  builtLanguages,
  contentIn,
  gapsIn,
  isComplete,
  isVisible,
  languageGaps,
  mediaById,
  sourceOf,
} from '../rules';
import { mediaReferences } from './integrity-checks';
import { fixtureContent, snapshot, withLanguage } from './rules-fixtures';

const data = fixtureContent();
const media = mediaById(data.media);

function productOf(id: string) {
  const product = data.products.find((candidate) => candidate.id === id);
  if (product === undefined) throw new Error(`no product ${id}`);
  return product;
}

const visibleIn = (id: string) =>
  LOCALES.filter((locale) => isVisible(productOf(id), locale, media));
const productIdsIn = (locale: Locale) => contentIn(data, locale).products.map(({ id }) => id);

// The car picks of the Finder in `locale`, as level -> product id.
const carPicksIn = (locale: Locale) =>
  Object.fromEntries(
    Object.entries(contentIn(data, locale).finder.picks.car ?? {}).map(([level, pick]) => [
      level,
      pick.product,
    ]),
  );

const fitsIn = (locale: Locale) =>
  contentIn(data, locale).accessories.find(({ id }) => id === 'd-061')?.fits;

const level3In = (locale: Locale) =>
  contentIn(data, locale).levels.find(({ id }) => id === '3')?.systems;

const languagesLive = (live: readonly Locale[]) => fixtureContent(live).languages;

const idsOf = (items: readonly { id: string }[]) => items.map(({ id }) => id);

const ITEM_COLLECTIONS = [
  'products',
  'accessories',
  'posts',
  'faq',
  'installers',
  'navSections',
] as const;

describe('the item rule', () => {
  it('shows an it-only item in it alone', () => {
    expect(sourceOf(productOf('tracer'))).toBe('it');
    expect(visibleIn('tracer')).toEqual(['it']);
    expect(LOCALES.filter((locale) => productIdsIn(locale).includes('tracer'))).toEqual(['it']);
  });

  it('leaves an item missing one el spec bullet out of el, and only there', () => {
    expect(gapsIn(productOf('smart'), 'el', media)).toEqual(['specGroups.0.items.1']);
    expect(visibleIn('smart')).toEqual(['en']);
    expect(visibleIn('elite')).toEqual(['en', 'el']);
  });

  it('leaves a product whose image has no el alt out of el (A3)', () => {
    expect(gapsIn(productOf('light'), 'el', media)).toEqual(['media.beta-package.alt']);
    expect(visibleIn('light')).toEqual(['en']);
  });

  it('shows an item only in the languages of its showIn, even where it is complete', () => {
    const [d061] = data.accessories;

    expect(d061?.showIn).toEqual(['en', 'el']);
    expect(d061 === undefined ? [] : gapsIn(d061, 'it', media)).toEqual([]);
    expect(
      LOCALES.filter((locale) => d061 !== undefined && isVisible(d061, locale, media)),
    ).toEqual(['en', 'el']);
  });

  // FAQ and nav sections are the snapshot's (English only); every collection hides at least one
  // item in some language, so a collection that skipped the rule would fail here.
  it.each(LOCALES)('keeps exactly the items visible in %s, in every item collection', (locale) => {
    const shown = contentIn(data, locale);

    for (const name of ITEM_COLLECTIONS) {
      const items: readonly { id: string }[] = data[name];
      const hasHidden = items.some((item) =>
        LOCALES.some((other) => !isVisible(item, other, media)),
      );

      expect(hasHidden, name).toBe(true);
      expect(idsOf(shown[name]), name).toEqual(
        idsOf(items.filter((item) => isVisible(item, locale, media))),
      );
    }
  });

  it('lists each language the planted products show in', () => {
    expect(LOCALES.map((locale) => [locale, productIdsIn(locale)])).toEqual([
      ['en', ['elite', 'smart', 'light']],
      ['el', ['elite']],
      ['it', ['tracer']],
      ['sq', []],
    ]);
  });
});

describe('relations', () => {
  it('drop an accessory fit to a product that is not visible', () => {
    expect(fitsIn('en')).toEqual(['elite', 'smart', 'light']);
    expect(fitsIn('el')).toEqual(['elite']);
  });

  it('drop a level system and a Finder pick that are not visible', () => {
    expect(level3In('el')).toEqual(['elite']);
    expect(level3In('it')).toEqual(['tracer']);
    expect(carPicksIn('en')).toEqual({ '1': 'elite', '2': 'smart' });
    expect(carPicksIn('el')).toEqual({ '1': 'elite' });
    expect(carPicksIn('it')).toEqual({ '3': 'tracer' });
  });

  it('keep highlights (features are a fixed-key set) and leave the input unchanged', () => {
    const before = structuredClone(data);
    const elite = contentIn(data, 'el').products.find(({ id }) => id === 'elite');

    expect(elite?.highlights).toEqual(productOf('elite').highlights);
    expect(data).toEqual(before);
  });
});

describe('completeness', () => {
  const none = new Map();

  it.each<[string, object, string[]]>([
    [
      'a heading payload',
      { heading: { lead: { en: 'A', el: 'A' }, payload: { en: 'B' } } },
      ['heading.payload'],
    ],
    [
      'a byCount variant',
      { seed: { '2': { en: 'Both', el: 'x' }, '3': { en: 'All three' } } },
      ['seed.3'],
    ],
    ['a rich-text body', { body: { en: [{ type: 'paragraph', children: [] }] } }, ['body']],
    ['a slug', { slug: { en: 'news' } }, ['slug']],
    [
      'a text in a list in a list',
      { groups: [{ items: [{ en: 'a', el: 'a' }, { en: 'b' }] }] },
      ['groups.0.items.1'],
    ],
  ])('counts %s', (_what, value, gaps) => {
    expect(gapsIn(value, 'el', none)).toEqual(gaps);
  });

  it("never counts a plural's few or many", () => {
    const count = { one: { en: '1 item', el: 'x' }, other: { en: '{n} items', el: 'x' } };

    expect(gapsIn({ count: { ...count, few: { en: 'a few', it: 'x' } } }, 'el', none)).toEqual([]);
    expect(gapsIn({ count: { ...count, many: { en: 'many' } } }, 'el', none)).toEqual([]);
    expect(gapsIn({ count: { ...count, other: { en: '{n} items' } } }, 'el', none)).toEqual([
      'count.other',
    ]);
  });

  it('needs a value only where the source language has one (showIn[0] for items)', () => {
    const item = { showIn: ['it', 'en'], name: { it: 'Nome' }, tag: { en: 'Only English' } };

    expect(gapsIn(item, 'en', none)).toEqual(['name']);
    expect(isComplete(item, 'it', none)).toBe(true);
    expect(gapsIn({ name: { en: 'x' } }, 'it', none)).toEqual(['name']);
  });

  it('needs the alt of every referenced media item but a decorative one, once each', () => {
    const library = mediaById([
      ...snapshot.media.filter(({ id }) => id === 'car'),
      {
        id: 'photo',
        file: 'src/assets/media/photo.jpg',
        alt: { en: 'P' },
        source: { url: 'https://invetec.eu/p.jpg' },
      },
    ]);
    const value = {
      image: 'car',
      gallery: ['photo', 'photo'],
      body: { en: [{ type: 'image', media: 'photo' }] },
      card: { photo: 'gone' },
    };

    expect(library.get('car')?.decorative).toBe(true);
    expect(gapsIn(value, 'el', library)).toEqual(['body', 'media.photo.alt', 'media.gone']);
    expect(gapsIn(value, 'en', library)).toEqual(['media.gone']);
    // An image block in the language's own rich text counts too.
    const greekBody = { body: { en: [], el: [{ type: 'image', media: 'photo' }] } };
    expect(gapsIn(greekBody, 'el', library)).toEqual(['media.photo.alt']);
  });

  it('finds every media reference the snapshot integrity test lists, and no other', () => {
    const values: object[] = Object.values(snapshot).flatMap((value: unknown) =>
      Array.isArray(value) ? (value as object[]) : [value as object],
    );
    const found = values.flatMap((value) => gapsOf(value, 'en', new Map()).media);
    const listed = mediaReferences(snapshot).map(([, id]) => `media.${id}`);

    expect(found.toSorted(byCodeUnit)).toEqual(listed.toSorted(byCodeUnit));
  });
});

describe('builtLanguages', () => {
  it('builds the live languages in LOCALES order, or all four in preview', () => {
    expect(builtLanguages(languagesLive(['en']), { preview: false })).toEqual(['en']);
    expect(builtLanguages(languagesLive(['el', 'en']), { preview: false })).toEqual(['en', 'el']);
    expect(builtLanguages(languagesLive(['en']), { preview: true })).toEqual([...LOCALES]);
  });

  it('refuses a build with no live language', () => {
    expect(() => builtLanguages(languagesLive([]), { preview: false })).toThrow(
      'No language is live',
    );
    expect(builtLanguages(languagesLive([]), { preview: true })).toEqual([...LOCALES]);
  });
});

describe('assertLanguageReady', () => {
  // The fixture with Greek live and complete wherever English is (Languages kept as they are).
  const ready = { ...withLanguage(fixtureContent(['en', 'el']), 'el'), languages: data.languages };

  it('passes for English on the snapshot and for a complete Greek', () => {
    expect(() => {
      assertLanguageReady(snapshot, 'en');
    }).not.toThrow();
    expect(languageGaps(ready, 'el')).toEqual([]);
  });

  it('names the one siteCopyHome field a live el lacks', () => {
    const broken = structuredClone(ready);
    delete broken.siteCopyHome.hero.heading.payload?.el;

    expect(languageGaps(broken, 'el')).toEqual(['siteCopyHome.hero.heading.payload']);
    expect(() => {
      assertLanguageReady(broken, 'el');
    }).toThrow(
      'The language "el" is not ready to build: 1 value(s) have no "el" text:\n- siteCopyHome.hero.heading.payload',
    );
  });

  it('checks the Site copy, the nav labels shown, the Finder, the fixed-key sets and their alt', () => {
    const gaps = languageGaps(snapshot, 'el');

    expect(gaps).toEqual(
      expect.arrayContaining([
        'siteCopyHome.hero.heading.payload',
        'navSections.systems.label',
        'finder.picks.car.1.reason',
        'features.gps.what',
        'levels.3.items.0',
        'media.pandora-dms-100-bt-black.alt',
      ]),
    );
    // The camper description has its Greek (A16); decorative heads need no alt.
    expect(gaps).not.toContain('categories.camper.desc');
    expect(gaps).toContain('categories.car.desc');
    expect(gaps.filter((gap) => gap === 'media.car.alt')).toEqual([]);
  });

  it('skips the label of a nav section not shown in the language', () => {
    const broken = structuredClone(ready);
    const [first] = broken.navSections;
    if (first !== undefined) {
      first.showIn = ['en'];
      delete first.label.el;
    }

    expect(languageGaps(broken, 'el')).toEqual([]);
  });
});
