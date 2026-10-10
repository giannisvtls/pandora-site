// The snapshot converter on a small fixture data file (__fixtures__/prototype-data.json): the
// mapping onto the contract, the media items and their alt text (what stops it:
// convert-errors.test.ts).
import { describe, expect, it } from 'vitest';

import { convertPrototype } from '../convert-data';
import { LEFT_OUT_KEYS } from '../left-out';
import { fixtureData, INPUTS, type Loose } from './fixture';

const converted = convertPrototype(fixtureData(), INPUTS);
const items = converted.collections as unknown as Record<string, Loose[]>;

function itemOf(name: string, id: string): Loose {
  const item = items[name]?.find((candidate) => candidate.id === id);
  if (item === undefined) throw new Error(`no ${name} ${id}`);
  return item;
}

describe('the products', () => {
  it('are the systems, accessory cards apart, with the facts and texts of the data', () => {
    // `order` keeps the data's order (the build gets the collection sorted by id).
    expect(items.products?.map(({ id, order }) => [id, order])).toEqual([
      ['alpha', 1],
      ['beta', 2],
    ]);
    expect(itemOf('products', 'alpha')).toStrictEqual({
      id: 'alpha',
      slug: 'alpha-pro-v2',
      category: 'car',
      order: 1,
      brand: 'Pandora',
      showIn: ['en', 'el', 'it', 'sq'],
      name: { en: 'Alpha Pro V2' },
      tag: { en: 'Test tag alpha' },
      blurb: { en: 'Test blurb alpha.', el: 'Test blurb alpha (el).' },
      priceEur: 1499,
      highlights: ['gps', 'immo'],
      specGroups: [
        { title: { en: 'Protection' }, items: [{ en: 'Test bullet 1' }, { en: 'Test bullet 2' }] },
      ],
      box: [{ en: 'Central unit' }],
      warranty: { en: 'Test warranty' },
      specSource: 'invetec',
      matrix: expect.objectContaining({ gps: 1, wifi: 1, start: 2, preheater: 0 }) as unknown,
      matrixNotes: { siren: 'PS-332 BT', start: 'with RMD-5M' },
      image: 'alpha-package',
      gallery: ['pandora-ps-330'],
      installImage: 'install-alpha',
    });
  });

  it('keep the spec-row order in the matrix notes and drop the bullets, colour and data notes', () => {
    const alpha = itemOf('products', 'alpha');

    expect(Object.keys(alpha.matrixNotes as Loose)).toEqual(['siren', 'start']);
    expect(Object.keys(alpha.matrix as Loose)).toHaveLength(22);
    expect(alpha).not.toHaveProperty('features');
    const output = JSON.stringify([converted.collections, converted.finder]);
    expect(output).not.toMatch(/dropped|left out/iu);
  });

  it('leave out what a system lacks: matrix, notes, box, warranty, gallery, Greek', () => {
    const beta = itemOf('products', 'beta');

    expect(Object.keys(beta)).toEqual([
      'id',
      'slug',
      'category',
      'order',
      'brand',
      'showIn',
      'name',
      'tag',
      'blurb',
      'priceEur',
      'highlights',
      'specGroups',
      'specSource',
      'image',
      'gallery',
      'installImage',
    ]);
    expect(beta.blurb).toEqual({ en: 'Test blurb beta.' });
    expect(beta.gallery).toEqual([]);
  });

  it('turn the -acc products into accessory cards keyed by vehicle', () => {
    expect(items.accessoryCards).toStrictEqual([
      {
        id: 'car',
        name: { en: 'Accessories' },
        tag: { en: 'Test tag accessories' },
        blurb: { en: 'Test blurb accessories.' },
        image: 'accessories',
      },
    ]);
  });

  it('give the hues of launch systems to hues.ts and leave the others out', () => {
    expect(converted.hues.map(([id]) => id)).toEqual(['alpha']);
    expect(converted.dropped).toEqual([...LEFT_OUT_KEYS, 'hues.parked: not a launch product']);
  });

  it('report the dropped keys and every entry a parked item left behind', () => {
    const data = fixtureData((raw) => {
      (raw.productImg as Loose).parked = 'https://invetec.eu/test/parked.webp';
      (raw.productGallery as Loose).parked = ['https://invetec.eu/test/parked-2.webp'];
      (raw.catImg as Loose).multimedia = 'https://invetec.eu/test/multimedia.webp';
    });

    expect(convertPrototype(data, INPUTS).dropped).toEqual([
      ...LEFT_OUT_KEYS,
      'productImg.parked: not a launch product',
      'productGallery.parked: not a launch product',
      'catImg.multimedia: not a launch category',
      'hues.parked: not a launch product',
    ]);
    for (const key of [
      'products[].features',
      'productColor',
      'vehicles',
      'handed',
      'U',
      'dealers',
    ]) {
      expect(LEFT_OUT_KEYS.some((line) => line.startsWith(`${key}: `))).toBe(true);
    }
  });
});

describe('the other collections', () => {
  it('map accessories, with no vehicle and no image where the data has none', () => {
    expect(itemOf('accessories', 'd-061')).toMatchObject({
      code: 'D-061',
      desc: { en: 'Test remote description.', el: 'Test remote description (el).' },
      group: 'remotes',
      priceEur: 259,
      fits: ['alpha'],
      vehicles: ['car'],
      image: 'pricelist-acc-d-061',
    });
    const tester = itemOf('accessories', 'alt-307');
    expect(tester).toMatchObject({ group: 'relays-bypass', vehicles: [], fits: [] });
    expect(tester).not.toHaveProperty('image');
    expect(items.accessoryGroups).toEqual([
      { id: 'remotes', order: 1, label: { en: 'Remotes' } },
      { id: 'relays-bypass', order: 2, label: { en: 'Relays & bypass' } },
    ]);
  });

  it('map posts: a slug from the title, a partial date, paragraphs, no empty excerpt', () => {
    expect(itemOf('posts', 'first')).toMatchObject({
      slug: { en: 'pandoras-first-test-post' },
      category: 'news',
      date: '2026-01',
      excerpt: { en: 'Test excerpt.' },
      body: {
        en: [
          { type: 'paragraph', children: [{ type: 'text', text: 'Test paragraph one.' }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'Test paragraph two.' }] },
        ],
      },
      image: 'install-alpha',
    });
    expect(itemOf('posts', 'second')).toMatchObject({ category: 'tech', date: '2025' });
    expect(itemOf('posts', 'second')).not.toHaveProperty('excerpt');
  });

  it('map the fixed-key sets, leaving out an empty how or needs', () => {
    expect(items.features).toEqual([
      {
        id: 'gps',
        title: { en: 'GPS tracking' },
        what: { en: 'Test what gps.' },
        how: { en: 'Test how gps.' },
      },
      {
        id: 'immo',
        title: { en: 'Immobilizer' },
        what: { en: 'Test what immo.' },
        needs: { en: 'Test needs immo.' },
      },
    ]);
    expect(items.specRows?.[9]).toEqual({ id: 'gps', order: 10, label: { en: 'GPS' } });
    expect(itemOf('categories', 'camper')).toEqual({
      id: 'camper',
      order: 2,
      label: { en: 'For the camper' },
      title: { en: 'Camper protection' },
      desc: { en: 'Test camper description.', el: 'Test camper description (el).' },
      image: 'camper',
    });
    expect(itemOf('levels', '3')).toEqual({
      id: '3',
      title: { en: 'Recovery' },
      what: { en: 'Test what 3.' },
      items: [{ en: 'Test item 3a' }, { en: 'Test item 3b' }],
      stops: { en: 'Test stops 3.' },
      systems: ['alpha', 'beta'],
    });
  });

  it('hold the nav sections in the desktop order, the FAQ, no installers and the Finder', () => {
    expect(items.navSections?.map(({ id, order }) => `${String(order)}:${String(id)}`)).toEqual([
      '1:systems',
      '2:compare',
      '3:installers',
      '4:blog',
      '5:partners',
      '6:contact',
    ]);
    expect(itemOf('navSections', 'installers').label).toEqual({ en: 'Find an installer' });
    expect(items.faq).toEqual([
      {
        id: 'faq-1',
        order: 1,
        showIn: ['en', 'el', 'it', 'sq'],
        question: { en: 'Test question?' },
        answer: { en: 'Test answer.' },
      },
    ]);
    expect(items.installers).toEqual([]);
    expect(converted.finder.picks.camper['3']).toEqual({
      product: 'beta',
      reason: { en: 'Test reason camper 3.' },
    });
    expect(converted.finder.placeNotes.street).toEqual({ en: 'Test street note.' });
  });
});

describe('the media items', () => {
  it('are the manifest files the content uses, by file path, with the id from the path', () => {
    expect(items.media?.map(({ id }) => id)).toEqual([
      'accessories',
      'alpha-package',
      'camper',
      'car',
      'install-alpha',
      'pandora-ps-330',
      'pandora-smart-v4-homepage-frame',
      'pricelist-acc-d-061',
      'pricelist-beta',
      'rail',
    ]);
    expect(itemOf('media', 'pricelist-beta')).toEqual({
      id: 'pricelist-beta',
      file: 'src/assets/media/pricelist/beta.png',
      alt: { en: 'Pandora Beta package' },
      source: { designFile: 'img/pricelist/beta.png' },
    });
  });

  it.each([
    ['alpha-package', 'Pandora Alpha Pro V2 package'],
    ['accessories', 'Pandora Accessories package'],
    ['pricelist-acc-d-061', 'Pandora D-061'],
    // The proof rail's car and system (Site copy).
    ['rail', 'Rail Car with Pandora Alpha installed'],
    // An installation photo whose car `proofImg` names; also a post's image.
    ['install-alpha', 'Test Car with Pandora Alpha Pro V2 installed'],
    // No pattern: ALT_BY_MEDIA.
    ['pandora-ps-330', 'Pandora PS-330 siren'],
  ])('%s has the alt %j', (id, alt) => {
    expect(itemOf('media', id).alt).toEqual({ en: alt });
  });

  it('marks category heads decorative, wherever else they are used', () => {
    for (const id of ['car', 'camper']) {
      expect(itemOf('media', id)).toMatchObject({ decorative: true });
      expect(itemOf('media', id)).not.toHaveProperty('alt');
    }
  });

  it('gives the hero poster file the alt of its picture (the hero renders it with alt="")', () => {
    expect(itemOf('media', 'pandora-smart-v4-homepage-frame')).toEqual({
      id: 'pandora-smart-v4-homepage-frame',
      file: 'src/assets/media/pandora-smart-v4-homepage-frame.webp',
      alt: { en: 'Pandora Smart V4 package and the Pandora Connect app on a phone' },
      source: { url: 'https://invetec.eu/test/frame.webp' },
    });
  });

  it('take a post photo from the vehicles list when no product uses it', () => {
    const data = fixtureData((raw) => {
      (raw.installImg as Loose).alpha = 'https://invetec.eu/test/rail.jpg';
    });
    const media = convertPrototype(data, { ...INPUTS, proofShots: [] }).collections
      .media as Loose[];

    expect(media.find(({ id }) => id === 'install-alpha')?.alt).toEqual({
      en: 'Test Car with Pandora Alpha installed',
    });
  });
});
