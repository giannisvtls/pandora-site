// One valid value per contract schema, for tests that break one field at a time. Independent of
// content-snapshot/, which the converter rewrites. Each call returns a fresh copy.
import { SPEC_ROW_KEYS } from '../contract';

// Looser than the contract on purpose, so a test can delete or plant any value.
export type Loose = Record<string, unknown>;

export function matrixFixture(): Loose {
  return Object.fromEntries(SPEC_ROW_KEYS.map((key, index) => [key, index % 3]));
}

export const fixtures = {
  media: (): Loose => ({
    id: 'elite-v3-package',
    file: 'src/assets/media/elite-v3-package.webp',
    alt: { en: 'Pandora Elite V3 package', el: 'Test alt (el)' },
    source: { url: 'https://invetec.eu/wp-content/uploads/2023/03/Elite-V3-package.webp' },
  }),
  products: (): Loose => ({
    id: 'elite',
    slug: 'elite-v3',
    category: 'car',
    brand: 'Pandora',
    showIn: ['en', 'el', 'it', 'sq'],
    name: { en: 'Elite V3' },
    tag: { en: 'Test tag' },
    blurb: { en: 'Test blurb', el: 'Test blurb (el)' },
    priceEur: 1499,
    highlights: ['lte', 'gps'],
    specGroups: [
      { title: { en: 'Protection' }, items: [{ en: 'Test bullet 1' }, { en: 'Test bullet 2' }] },
    ],
    box: [{ en: 'Central unit' }],
    warranty: { en: 'Lifetime warranty' },
    specSource: 'pricelist',
    matrix: matrixFixture(),
    matrixNotes: { siren: 'PS-332' },
    image: 'elite-v3-package',
    gallery: ['elite-v3-front'],
    installImage: 'elite-v3-install',
  }),
  accessories: (): Loose => ({
    id: 'd-061',
    code: 'D-061',
    showIn: ['en', 'el'],
    name: { en: 'Test remote' },
    desc: { en: 'Test description', el: 'Test description (el)' },
    group: 'remotes',
    priceEur: 259,
    fits: ['elite', 'smart'],
    vehicles: ['car'],
    image: 'pricelist-acc-d-061',
  }),
  posts: (): Loose => ({
    id: 'motodays',
    showIn: ['en'],
    slug: { en: 'pandora-at-motodays-2026' },
    category: 'news',
    date: '2026-02-11',
    title: { en: 'Test title' },
    excerpt: { en: 'Test excerpt' },
    body: { en: [{ type: 'paragraph', children: [{ type: 'text', text: 'Test paragraph.' }] }] },
    image: 'motodays-poster',
  }),
  faq: (): Loose => ({
    id: 'alarm-vs-immobilizer',
    order: 1,
    showIn: ['en'],
    question: { en: 'Test question?' },
    answer: { en: 'Test answer.' },
  }),
  installers: (): Loose => ({
    id: 'test-installer',
    showIn: ['el', 'en'],
    name: 'Test Installer',
    city: { el: 'Test city (el)', en: 'Test city' },
    postcode: '10431',
    country: 'GR',
    point: { lat: 37.98, lng: 23.73 },
    phone: '+302100000000',
  }),
  navSections: (): Loose => ({
    id: 'systems',
    route: 'systems',
    order: 1,
    showIn: ['en'],
    label: { en: 'Systems' },
  }),
  categories: (): Loose => ({
    id: 'car',
    order: 1,
    label: { en: 'For the car' },
    title: { en: 'Car protection' },
    desc: { en: 'Test description' },
    image: 'car',
  }),
  accessoryCards: (): Loose => ({
    id: 'car',
    name: { en: 'Pandora accessories' },
    tag: { en: 'Test tag' },
    blurb: { en: 'Test blurb' },
    image: 'pandora-accessories',
  }),
  accessoryGroups: (): Loose => ({ id: 'remotes', order: 1, label: { en: 'Remotes' } }),
  features: (): Loose => ({
    id: 'gps',
    title: { en: 'GPS/GLONASS tracking' },
    what: { en: 'Test what' },
    how: { en: 'Test how' },
    needs: { en: 'Test needs' },
  }),
  specRows: (): Loose => ({ id: 'gps', order: 10, label: { en: 'GPS / GLONASS / GNSS' } }),
  levels: (): Loose => ({
    id: '3',
    title: { en: 'Recovery' },
    what: { en: 'Test what' },
    items: [{ en: 'Everything in level 2' }],
    stops: { en: 'Test stops' },
    systems: ['finder', 'tracer'],
  }),
} as const;
