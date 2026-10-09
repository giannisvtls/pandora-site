// Every collection schema of spec §2: a valid fixture parses unchanged; a required text without
// its source-language value fails at `field.<locale>`; whitespace-only text, a repeated showIn
// language and unknown keys fail; plus each schema's own rules.
import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import {
  accessoryCardSchema,
  accessoryGroupSchema,
  accessorySchema,
  categorySchema,
  COLLECTIONS,
  faqSchema,
  featureSchema,
  installerSchema,
  levelSchema,
  mediaIdOf,
  mediaSchema,
  navSectionSchema,
  postSchema,
  productSchema,
  SPEC_ROW_KEYS,
  specRowSchema,
  type CollectionName,
} from '../contract';
import { fixtures, matrixFixture, type Loose } from './contract-fixtures';

// The paths of the issues `schema` finds in `value`, as `a.b.c` strings (none when it parses).
function pathsOf(schema: z.ZodType, value: unknown): string[] {
  const issues = schema.safeParse(value).error?.issues ?? [];
  return issues.map((issue) => issue.path.map(String).join('.'));
}

// A fresh fixture of `name` with some fields replaced.
function changed(name: CollectionName, patch: Loose): Loose {
  return { ...fixtures[name](), ...patch };
}

// What each schema requires in its source language, per spec §2, as [field, ...nested path].
const REQUIRED: Record<CollectionName, readonly string[][]> = {
  media: [['alt']],
  products: [['name'], ['tag'], ['blurb'], ['specGroups', '0', 'title'], ['box', '0']],
  accessories: [['name'], ['desc']],
  posts: [['slug'], ['title'], ['excerpt'], ['body']],
  faq: [['question'], ['answer']],
  installers: [['city']],
  navSections: [['label']],
  categories: [['label'], ['title'], ['desc']],
  accessoryCards: [['name'], ['tag'], ['blurb']],
  accessoryGroups: [['label']],
  features: [['title'], ['what'], ['how'], ['needs']],
  specRows: [['label']],
  levels: [['title'], ['what'], ['items', '0'], ['stops']],
};

// A text field of each schema, to plant whitespace in.
const TEXT_FIELD: Record<CollectionName, string> = {
  media: 'alt',
  products: 'name',
  accessories: 'name',
  posts: 'title',
  faq: 'question',
  installers: 'city',
  navSections: 'label',
  categories: 'title',
  accessoryCards: 'name',
  accessoryGroups: 'label',
  features: 'title',
  specRows: 'label',
  levels: 'title',
};

// The language map at `path` inside `value`.
function mapAt(value: Loose, path: readonly string[]): Loose {
  let current: unknown = value;
  for (const key of path) {
    current = (current as Loose)[key];
  }
  return current as Loose;
}

function sourceOf(value: Loose): string {
  return Array.isArray(value.showIn) ? String(value.showIn[0]) : 'en';
}

const NAMES = Object.keys(COLLECTIONS) as CollectionName[];

describe.each(NAMES)('%s', (name) => {
  const schema: z.ZodType = COLLECTIONS[name];

  it('accepts a valid fixture unchanged', () => {
    const valid = fixtures[name]();

    expect(schema.parse(valid)).toStrictEqual(valid);
  });

  it.each(REQUIRED[name])('requires %s in the source language', (...path) => {
    const value = fixtures[name]();
    const source = sourceOf(value);
    const languages = mapAt(value, path);
    expect(languages[source]).toBeDefined();
    Reflect.deleteProperty(languages, source);

    expect(pathsOf(schema, value)).toEqual([[...path, source].join('.')]);
  });

  it('rejects whitespace-only text', () => {
    const value = fixtures[name]();
    const field = TEXT_FIELD[name];
    mapAt(value, [field])[sourceOf(value)] = '  ';

    expect(pathsOf(schema, value)).toEqual([`${field}.${sourceOf(value)}`]);
  });

  it('rejects an unknown key', () => {
    const result = schema.safeParse(changed(name, { color: 'red' }));

    expect(result.error?.issues).toMatchObject([{ code: 'unrecognized_keys', keys: ['color'] }]);
  });
});

describe('items with showIn', () => {
  const ITEMS = ['products', 'accessories', 'posts', 'faq', 'installers', 'navSections'] as const;

  it.each(ITEMS)('%s: rejects a repeated showIn language', (name) => {
    const value = changed(name, { showIn: ['en', 'el', 'en'] });

    expect(pathsOf(COLLECTIONS[name], value)).toEqual(['showIn.2']);
  });

  it('take the source language from showIn[0], not from English', () => {
    const italian = { showIn: ['it'], name: { it: 'Test (it)' }, desc: { it: 'Test (it)' } };
    const accessory = changed('accessories', italian);

    expect(pathsOf(accessorySchema, accessory)).toEqual([]);
    expect(pathsOf(accessorySchema, { ...accessory, name: { en: 'Test' } })).toEqual(['name.it']);
  });

  it('report the source-language path of a nested text', () => {
    const items = [{ en: 'One' }, { el: 'Test' }];
    const product = changed('products', { specGroups: [{ title: { en: 'Protection' }, items }] });

    expect(pathsOf(productSchema, product)).toEqual(['specGroups.0.items.1.en']);
  });
});

describe('products', () => {
  it('rejects a matrix with 21 keys, naming the missing row', () => {
    const matrix = matrixFixture();
    delete matrix.wifi;

    expect(Object.keys(matrix)).toHaveLength(21);
    expect(pathsOf(productSchema, changed('products', { matrix }))).toEqual(['matrix.wifi']);
  });

  it('rejects a matrix row that is not a spec row, and a value other than 0, 1 or 2', () => {
    const extra = changed('products', { matrix: { ...matrixFixture(), nope: 1 } });
    const wrong = changed('products', { matrix: { ...matrixFixture(), gps: 3 } });

    expect(productSchema.safeParse(extra).error?.issues).toMatchObject([
      { code: 'unrecognized_keys', keys: ['nope'], path: ['matrix'] },
    ]);
    expect(pathsOf(productSchema, wrong)).toEqual(['matrix.gps']);
  });

  it('accepts a system without a matrix (Finder, Tracer), box, warranty or install image', () => {
    const product = fixtures.products();
    delete product.matrix;
    delete product.matrixNotes;
    delete product.box;
    delete product.warranty;
    delete product.installImage;

    expect(pathsOf(productSchema, product)).toEqual([]);
  });

  it('pins the 22 spec-row keys, each once', () => {
    expect(SPEC_ROW_KEYS).toHaveLength(22);
    expect(new Set(SPEC_ROW_KEYS).size).toBe(22);
  });

  it.each([
    ['priceEur', 899.5, 'priceEur'],
    ['priceEur', 0, 'priceEur'],
    ['slug', 'Elite V3', 'slug'],
    ['category', 'truck', 'category'],
    ['specSource', 'web', 'specSource'],
    ['highlights', [], 'highlights'],
    ['highlights', ['gps', 'gps'], 'highlights.1'],
    ['gallery', ['a', 'a'], 'gallery.1'],
    ['matrixNotes', { nope: 'PS-332' }, 'matrixNotes'],
  ])('rejects %s = %j', (field, value, path) => {
    expect(pathsOf(productSchema, changed('products', { [field]: value }))).toEqual([path]);
  });
});

describe('accessories', () => {
  it.each([
    ['fits', ['elite', 'smart', 'elite'], 'fits.2'],
    ['vehicles', ['car', 'moto', 'car'], 'vehicles.2'],
    ['vehicles', ['truck'], 'vehicles.0'],
  ])('rejects %s = %j', (field, value, path) => {
    expect(pathsOf(accessorySchema, changed('accessories', { [field]: value }))).toEqual([path]);
  });

  it('accept no vehicle: the item is then listed only under All (user decision 2026-10-09)', () => {
    expect(pathsOf(accessorySchema, changed('accessories', { vehicles: [] }))).toEqual([]);
  });
});

describe('media', () => {
  it('needs English alt text unless decorative, and a decorative image has none', () => {
    const withoutAlt = fixtures.media();
    delete withoutAlt.alt;

    expect(pathsOf(mediaSchema, withoutAlt)).toEqual(['alt.en']);
    expect(pathsOf(mediaSchema, { ...withoutAlt, decorative: true })).toEqual([]);
    expect(pathsOf(mediaSchema, changed('media', { decorative: true }))).toEqual(['alt']);
  });

  it('takes a kebab-case image file under src/assets/media/ and a manifest source', () => {
    const designed = changed('media', {
      file: 'src/assets/media/pricelist/acc-d-061.png',
      source: { designFile: 'img/pricelist/acc-d-061.png' },
    });

    expect(pathsOf(mediaSchema, designed)).toEqual([]);
    for (const file of [
      'src/assets/brand/invetec-logo.webp',
      'src/assets/media/../brand/x.webp',
      'src/assets/media/Elite.webp',
      'src/assets/media/elite.txt',
      'src/assets/media/elite.v3.webp',
      'src/assets/media/a.webp.png',
      'src/assets/media/elite',
    ]) {
      expect(pathsOf(mediaSchema, changed('media', { file }))).toEqual(['file']);
    }
  });

  it('take as id the path under src/assets/media/ without the extension, / as -', () => {
    expect(mediaIdOf('src/assets/media/pricelist/acc-band.png')).toBe('pricelist-acc-band');
    expect(mediaIdOf('src/assets/media/pandora-camper-2.webp')).toBe('pandora-camper-2');
    // A name without an extension keeps its last character; a dot in a folder is not one.
    expect(mediaIdOf('src/assets/media/pricelist/band')).toBe('pricelist-band');
    expect(mediaIdOf('src/assets/media/v1.2/band')).toBe('v1.2-band');
    expect(() => mediaIdOf('src/assets/brand/invetec-logo.webp')).toThrow('is not under');
  });
});

describe('posts', () => {
  it('take a date as precise as the source, and reject 2026-02-30', () => {
    for (const date of ['2025', '2026-01', '2026-02-11']) {
      expect(pathsOf(postSchema, changed('posts', { date }))).toEqual([]);
    }
    expect(pathsOf(postSchema, changed('posts', { date: '2026-02-30' }))).toEqual(['date']);
  });

  it('take a slug per language and a rich-text body', () => {
    const slug = changed('posts', { slug: { en: 'Not A Slug' } });
    const body = changed('posts', { body: { en: [{ type: 'quote', text: 'x' }] } });

    expect(pathsOf(postSchema, slug)).toEqual(['slug.en']);
    expect(pathsOf(postSchema, body)).toEqual(['body.en.0.type']);
  });

  it('take no excerpt: the list row then shows the title alone (user decision 2026-10-09)', () => {
    const post = fixtures.posts();
    delete post.excerpt;

    expect(pathsOf(postSchema, post)).toEqual([]);
    expect(pathsOf(postSchema, changed('posts', { excerpt: {} }))).toEqual(['excerpt.en']);
  });

  it.each(['news', 'tech'])('take the category %s', (category) => {
    expect(pathsOf(postSchema, changed('posts', { category }))).toEqual([]);
  });

  it.each(['blog', 'News', ''])('reject the category %j', (category) => {
    expect(pathsOf(postSchema, changed('posts', { category }))).toEqual(['category']);
  });
});

describe('installers', () => {
  it.each([
    ['country', 'gr', 'country'],
    ['country', 'GRC', 'country'],
    ['phone', '2100000000', 'phone'],
    ['phone', '+30 210 0000000', 'phone'],
    ['point', { lat: 91, lng: 0 }, 'point.lat'],
  ])('rejects %s = %j', (field, value, path) => {
    expect(pathsOf(installerSchema, changed('installers', { [field]: value }))).toEqual([path]);
  });
});

describe('navSections and faq', () => {
  it('take a route key and an order', () => {
    expect(pathsOf(navSectionSchema, changed('navSections', { route: 'shop' }))).toEqual(['route']);
    expect(pathsOf(faqSchema, changed('faq', { order: -1 }))).toEqual(['order']);
  });
});

describe('fixed-key sets', () => {
  it.each([
    ['categories', categorySchema, 'truck'],
    ['accessoryCards', accessoryCardSchema, 'fleet'],
    ['specRows', specRowSchema, 'nope'],
    ['levels', levelSchema, '4'],
  ] as const)('%s reject an id outside their fixed keys', (name, schema, id) => {
    expect(pathsOf(schema, changed(name, { id }))).toEqual(['id']);
  });

  it('take English as the source language and have no showIn', () => {
    const feature = changed('features', { title: { el: 'Test (el)' } });
    const group = changed('accessoryGroups', { showIn: ['en'] });

    expect(pathsOf(featureSchema, feature)).toEqual(['title.en']);
    expect(pathsOf(accessoryGroupSchema, group)).toEqual(['']);
  });

  it.each([
    [['finder', 'tracer', 'finder'], 'systems.2'],
    [['Finder'], 'systems.0'],
  ])('levels reject systems = %j', (systems, path) => {
    expect(pathsOf(levelSchema, changed('levels', { systems }))).toEqual([path]);
  });

  it('accept a feature without how and needs', () => {
    const feature = fixtures.features();
    delete feature.how;
    delete feature.needs;

    expect(pathsOf(featureSchema, feature)).toEqual([]);
  });
});
