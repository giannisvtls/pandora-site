// The URL map (spec §4): every route's path, the parameter table shared with the Site copy link
// targets, the item paths, and BUILT_PAGE_TYPES against the page files under src/pages/.
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  linkItem,
  LOCALES,
  ROUTE_KEYS,
  ROUTE_PARAMS,
  routeTarget,
  type RouteKey,
  type RouteTarget,
} from '../contract';
import {
  accessoryPath,
  BUILT_PAGE_TYPES,
  postPath,
  productPath,
  ROUTE_PATHS,
  routePath,
  targetHref,
  type PageType,
} from '../routes';

const PAGES_DIR = fileURLToPath(new URL('../../pages/', import.meta.url));

// Spec §4's route table, filled for English.
const SPEC_TABLE: readonly (readonly [RouteKey, Readonly<Record<string, string>>, string])[] = [
  ['home', {}, '/en/'],
  ['systems', {}, '/en/systems/car/'],
  ['category', { vehicle: 'marine' }, '/en/systems/marine/'],
  ['product', { vehicle: 'car', slug: 'elite-v3' }, '/en/systems/car/elite-v3/'],
  ['compare', {}, '/en/compare/'],
  ['accessories', {}, '/en/accessories/'],
  ['accessoriesVehicle', { vehicle: 'moto' }, '/en/accessories/moto/'],
  ['accessory', { vehicle: 'car', id: 'd-061' }, '/en/accessories/car/d-061/'],
  ['blog', {}, '/en/blog/'],
  ['post', { slug: 'pandora-at-motodays-2026' }, '/en/blog/pandora-at-motodays-2026/'],
  ['installers', {}, '/en/installers/'],
  ['contact', {}, '/en/contact/'],
  ['partners', {}, '/en/partners/'],
  ['warranty', {}, '/en/warranty/'],
  ['notFound', {}, '/en/404.html'],
];

// The URL segment rule, as the messages name it.
const SEGMENT_RULE = 'lowercase words of a-z and 0-9 joined by single hyphens';

// The item routes (lead decision, cycle 5: no Site copy link names one), and the others.
const ITEM_ROUTES: ReadonlySet<RouteKey> = new Set(['product', 'accessory', 'post']);
const LINK_ROUTES = ROUTE_KEYS.filter((route) => !ITEM_ROUTES.has(route));

// Builds a route with loosely typed params (the tests break them on purpose).
const looseRoutePath = (
  locale: string,
  route: RouteKey,
  params: Readonly<Record<string, string | undefined>>,
) =>
  (
    routePath as (l: string, r: RouteKey, p: Readonly<Record<string, string | undefined>>) => string
  )(locale, route, params);

describe('the route table', () => {
  it('builds the path of spec §4 for every route key', () => {
    expect(SPEC_TABLE.map(([route]) => route)).toEqual([...ROUTE_KEYS]);
    for (const [route, params, expected] of SPEC_TABLE) {
      expect(looseRoutePath('en', route, params), route).toBe(expected);
    }
  });

  it('ends every path in / in every language, the 404 page excepted', () => {
    for (const locale of LOCALES) {
      for (const [route, params] of SPEC_TABLE) {
        const built = looseRoutePath(locale, route, params);
        expect(built.startsWith(`/${locale}/`), built).toBe(true);
        expect(built.endsWith('/'), built).toBe(route !== 'notFound');
      }
    }
  });

  it('fills exactly the parameters ROUTE_PARAMS lists for each path pattern', () => {
    for (const [type, pattern] of Object.entries(ROUTE_PATHS)) {
      const names = pattern
        .matchAll(/\{(\w+)\}/gu)
        .map((match) => match[1])
        .toArray();
      expect(names, type).toEqual(['L', ...ROUTE_PARAMS[type as PageType]]);
    }
  });

  it.each([
    ['a missing parameter', 'category', {}, 'The route "category" needs a vehicle'],
    ['an extra parameter', 'home', { vehicle: 'car' }, 'The route "home" takes no vehicle'],
    ['a segment with a dot and a slash', 'post', { slug: '../admin' }, 'needs a slug'],
    ['an empty segment', 'accessory', { vehicle: 'car', id: '' }, 'needs an id'],
    ['a double hyphen', 'accessory', { vehicle: 'car', id: 'a--b' }, 'needs an id'],
    ['a leading hyphen', 'accessory', { vehicle: 'car', id: '-x' }, 'needs an id'],
    ['a trailing hyphen', 'product', { vehicle: 'car', slug: 'x-' }, 'needs a slug'],
  ])('refuses %s', (_what, route, params, message) => {
    expect(() => looseRoutePath('en', route as RouteKey, params)).toThrow(message);
  });

  it('names the segment rule and the value it refuses', () => {
    expect(() => looseRoutePath('en', 'accessory', { vehicle: 'car', id: 'a--b' })).toThrow(
      `The route "accessory" needs an id: ${SEGMENT_RULE}, not "a--b"`,
    );
  });

  it('refuses a language the site does not have', () => {
    expect(() => looseRoutePath('fr', 'home', {})).toThrow('"fr" is not a language of the site');
  });
});

// A link target with the parameters `route` needs, minus `without`.
function targetFor(route: RouteKey, without?: string): RouteTarget {
  const values = { vehicle: 'car', slug: 'elite-v3', id: 'd-061' };
  const names: readonly string[] = ROUTE_PARAMS[route];
  const params = Object.fromEntries(
    Object.entries(values).filter(([name]) => names.includes(name) && name !== without),
  );
  return names.length === 0 ? { route } : { route, params };
}

// The paths of the issues `routeTarget` finds in `target`.
const targetIssuePaths = (target: unknown) =>
  (routeTarget.safeParse(target).error?.issues ?? []).map((issue) => issue.path.join('.'));

describe('Site copy link targets', () => {
  it('take exactly the parameters the path builders need, from the same table', () => {
    for (const route of LINK_ROUTES) {
      const target = targetFor(route);
      expect(routeTarget.safeParse(target).success, route).toBe(true);
      expect(targetHref('en', target), route).toBe(
        looseRoutePath('en', route, target.params ?? {}),
      );
      const names = ROUTE_PARAMS[route];
      for (const name of names) {
        const broken = targetFor(route, name);
        expect(targetIssuePaths(broken), route).toEqual([`params.${name}`]);
        expect(() => targetHref('en', broken)).toThrow(`needs a ${name}`);
      }
    }
  });

  it('name static and category pages only: every item route fails at route', () => {
    expect(LINK_ROUTES).toContain('category');
    expect(LINK_ROUTES).toContain('accessoriesVehicle');
    for (const route of ITEM_ROUTES) {
      const result = routeTarget.safeParse(targetFor(route));

      expect(result.error?.issues, route).toMatchObject([
        {
          path: ['route'],
          message: `A Site copy link names a static or category page, not the item route "${route}"`,
        },
      ]);
    }
    expect(targetIssuePaths({ route: 'post', params: { slug: 'x' } })).toEqual(['route']);
  });

  it('report an item route at the route of a footer link', () => {
    const link = { label: { en: 'News' }, target: { route: 'post', params: { slug: 'x' } } };
    const issues = linkItem.safeParse(link).error?.issues ?? [];

    expect(issues.map((issue) => issue.path.join('.'))).toEqual(['target.route']);
  });

  it('refuse a parameter the route does not take', () => {
    const issues = routeTarget.safeParse({ route: 'contact', params: { vehicle: 'car' } }).error
      ?.issues;

    expect(issues).toMatchObject([
      { path: ['params', 'vehicle'], message: 'The route "contact" takes no vehicle' },
    ]);
  });

  it.each([
    ['id', 'a--b', 'an id'],
    ['id', '-x', 'an id'],
    ['id', 'x-', 'an id'],
    ['slug', 'a--b', 'a slug'],
  ])('refuse the %s %s, which no path could hold', (name, value, noun) => {
    const issues = routeTarget.safeParse({ route: 'contact', params: { [name]: value } }).error
      ?.issues;

    expect(issues).toMatchObject([
      { path: ['params', name], message: `Expected ${noun}: ${SEGMENT_RULE}` },
    ]);
  });

  it('add the hash after the path', () => {
    expect(targetHref('el', { route: 'contact', hash: 'faq' })).toBe('/el/contact/#faq');
    expect(targetHref('en', { route: 'category', params: { vehicle: 'fleet' } })).toBe(
      '/en/systems/fleet/',
    );
  });
});

describe('item paths', () => {
  it('put a product under its category, with its one slug', () => {
    expect(productPath('it', { category: 'camper', slug: 'camper-pro-v2' })).toBe(
      '/it/systems/camper/camper-pro-v2/',
    );
  });

  it('put an accessory under its first vehicle, and refuse one with no vehicle (Phase 3)', () => {
    expect(accessoryPath('en', { id: 'ps-331-bt', vehicles: ['car', 'marine'] })).toBe(
      '/en/accessories/car/ps-331-bt/',
    );
    expect(() => accessoryPath('en', { id: 'band', vehicles: [] })).toThrow(
      'The accessory band has no vehicle, so it has no URL yet (Phase 3)',
    );
  });

  it("use a post's slug in the page's language", () => {
    const post = { id: 'motodays', slug: { en: 'motodays-2026', el: 'motodays-2026-el' } };

    expect(postPath('el', post)).toBe('/el/blog/motodays-2026-el/');
    expect(() => postPath('it', post)).toThrow('The post motodays has no slug in it');
  });
});

// The page type each `.astro` page file renders: its route pattern (`[locale]` -> `{L}`, `[x]` ->
// `{x}`, `index` dropped) looked up in ROUTE_PATHS. The 404 pages are never listed (A18), and
// `.ts` endpoints (sitemaps, robots.txt) are not pages.
function pageTypesOf(files: readonly string[]): { types: PageType[]; unknown: string[] } {
  const typeByPath = new Map(Object.entries(ROUTE_PATHS).map(([type, route]) => [route, type]));
  const types: PageType[] = [];
  const unknown: string[] = [];
  for (const file of files) {
    if (!file.endsWith('.astro') || /(?:^|\/)404\.astro$/u.test(file)) continue;
    const segments = file
      .replace(/\.astro$/u, '')
      .split('/')
      .filter((segment, index, all) => !(segment === 'index' && index === all.length - 1))
      .map((segment) => segment.replace(/^\[locale\]$/u, '{L}').replace(/^\[(\w+)\]$/u, '{$1}'));
    const type = typeByPath.get(`/${segments.join('/')}/`);
    if (type === undefined) unknown.push(file);
    else types.push(type as PageType);
  }
  return { types, unknown };
}

function pageFiles(): string[] {
  return readdirSync(PAGES_DIR, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(PAGES_DIR, path.join(entry.parentPath, entry.name)))
    .map((file) => file.replaceAll('\\', '/'));
}

describe('BUILT_PAGE_TYPES', () => {
  it('is home only in Phase 1', () => {
    expect(BUILT_PAGE_TYPES).toEqual(['home']);
  });

  it('lists exactly the page types the files under src/pages/ render', () => {
    const { types, unknown } = pageTypesOf(pageFiles());

    expect(unknown).toEqual([]);
    expect(new Set(types)).toEqual(new Set(BUILT_PAGE_TYPES));
  });

  it('tells a page file from the route table, so a mismatch fails the check above', () => {
    expect(
      pageTypesOf([
        '[locale]/index.astro',
        '[locale]/systems/[vehicle]/[slug].astro',
        '[locale]/blog/[slug]/index.astro',
        '[locale]/404.astro',
        '404.astro',
        'sitemap-[locale].xml.ts',
        '[locale]/shop.astro',
      ]),
    ).toEqual({ types: ['home', 'product', 'post'], unknown: ['[locale]/shop.astro'] });
  });
});
