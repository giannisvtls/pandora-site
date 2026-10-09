// Content for the publish-rule tests: the committed snapshot's globals and fixed-key sets
// (English only), with small item collections planted for each rule, all checked against the
// contract. Each call returns a fresh copy.
import { readSnapshot } from '../../../scripts/snapshot/read-snapshot';
import {
  accessorySchema,
  installerSchema,
  LOCALES,
  mediaSchema,
  postSchema,
  productSchema,
  type Locale,
} from '../contract';
import type { ContentData } from '../rules';
import { fixtures, type Loose } from './contract-fixtures';

export const snapshot = await readSnapshot();

const isObject = (value: unknown): value is Loose =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isLanguageMap = (value: Loose): boolean =>
  Object.keys(value).length > 0 &&
  Object.keys(value).every((key) => (LOCALES as readonly string[]).includes(key));

// A copy of `value` where every language map that has English also has `locale`, a copy of the
// English: the language is then complete wherever English is.
export function withLanguage<T>(value: T, locale: Locale): T {
  if (Array.isArray(value)) return value.map((item: unknown) => withLanguage(item, locale)) as T;
  if (!isObject(value)) return value;
  if (isLanguageMap(value)) {
    return value.en === undefined ? { ...value } : { ...value, [locale]: value.en };
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, withLanguage(child, locale)]),
  ) as T;
}

// A copy of `value` where every language map holds only `locale`, with the English value.
function onlyIn<T>(value: T, locale: Locale): T {
  if (Array.isArray(value)) return value.map((item: unknown) => onlyIn(item, locale)) as T;
  if (!isObject(value)) return value;
  return (
    isLanguageMap(value)
      ? { [locale]: value.en }
      : Object.fromEntries(
          Object.entries(value).map(([key, child]) => [key, onlyIn(child, locale)]),
        )
  ) as T;
}

const SOURCE = { url: 'https://invetec.eu/wp-content/uploads/test.webp' };

// `alpha-package` has alt text in English, Greek and Italian; `beta-package` in English only.
const MEDIA = [
  { id: 'alpha-package', alt: { en: 'Alpha package', el: 'Alpha (el)', it: 'Alpha (it)' } },
  { id: 'beta-package', alt: { en: 'Beta package' } },
].map(({ id, alt }) =>
  mediaSchema.parse({ id, file: `src/assets/media/${id}.webp`, alt, source: SOURCE }),
);

function product(id: string, patch: Loose = {}): Loose {
  const value: Loose = {
    ...fixtures.products(),
    id,
    slug: id,
    image: 'alpha-package',
    gallery: [],
  };
  Reflect.deleteProperty(value, 'installImage');
  return { ...value, ...patch };
}

// Products: `elite` complete in English and Greek; `smart` with one Greek spec bullet missing;
// `light` complete in both, but its image has no Greek alt; `tracer` shown in Italian only.
function products() {
  const smart = withLanguage(product('smart'), 'el');
  const bullets = (smart.specGroups as { items: Loose[] }[])[0]?.items;
  if (bullets?.[1] !== undefined) delete bullets[1].el;
  const tracer = { ...onlyIn(product('tracer'), 'it'), showIn: ['it'] };
  return [
    withLanguage(product('elite'), 'el'),
    smart,
    withLanguage(product('light', { image: 'beta-package' }), 'el'),
    tracer,
  ].map((value) => productSchema.parse(value));
}

// Accessories: `d-061` fits every product and is shown in English and Greek, though complete in
// Italian too; `band` has no vehicle and English only.
function accessories() {
  const d061 = withLanguage(
    withLanguage(
      {
        ...fixtures.accessories(),
        fits: ['elite', 'smart', 'light', 'tracer'],
        image: 'alpha-package',
      },
      'el',
    ),
    'it',
  );
  const band = { ...fixtures.accessories(), id: 'band', code: 'BAND', vehicles: [], fits: [] };
  return [d061, { ...band, showIn: [...LOCALES], desc: { en: 'Test band' } }].map((value) =>
    accessorySchema.parse(value),
  );
}

// A post in English and Greek, with a slug per language.
function posts() {
  const post = withLanguage(
    { ...fixtures.posts(), showIn: ['en', 'el'], image: 'alpha-package' },
    'el',
  );
  return [postSchema.parse({ ...post, slug: { en: 'news-en', el: 'news-el' } })];
}

// The snapshot's globals and fixed-key sets with the planted items; level 3 lists every product
// and the car picks are elite, smart and tracer; `live` lists the live languages.
export function fixtureContent(live: readonly Locale[] = ['en']): ContentData {
  const picks = structuredClone(snapshot.finder.picks);
  picks.car['1'].product = 'elite';
  picks.car['2'].product = 'smart';
  picks.car['3'].product = 'tracer';
  return {
    ...structuredClone(snapshot),
    media: [...structuredClone(snapshot.media), ...MEDIA],
    products: products(),
    accessories: accessories(),
    posts: posts(),
    // An installer in Greek and English (the snapshot has none).
    installers: [installerSchema.parse(fixtures.installers())],
    levels: snapshot.levels.map((level) => ({
      ...level,
      systems: level.id === '3' ? ['elite', 'smart', 'light', 'tracer'] : [],
    })),
    finder: { ...snapshot.finder, picks },
    languages: {
      en: { live: live.includes('en') },
      el: { live: live.includes('el') },
      it: { live: live.includes('it') },
      sq: { live: live.includes('sq') },
    },
  };
}
