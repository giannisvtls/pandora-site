// The site's URL map (spec §4, P1-2): one path pattern per page type, filled with the parameters
// ROUTE_PARAMS (the contract) lists for its route. Every path ends in `/` (A2), except the 404
// page's. Pure: no Astro, no content; the publish rules (rules.ts) decide which pages exist.
import {
  LOCALES,
  ROUTE_PARAM_NAMES,
  ROUTE_PARAM_NOUNS,
  ROUTE_PARAMS,
  URL_SEGMENT,
  URL_SEGMENT_RULE,
  type Accessory,
  type CategoryId,
  type Locale,
  type Post,
  type Product,
  type RouteKey,
  type RouteParamName,
  type RouteTarget,
} from './contract';

// The page types: every route key but `systems`, the nav key that leads to the car category.
export type PageType = Exclude<RouteKey, 'systems'>;

// The path of each page type: `{L}` is the language, `{name}` a parameter of ROUTE_PARAMS.
export const ROUTE_PATHS: Readonly<Record<PageType, string>> = {
  home: '/{L}/',
  category: '/{L}/systems/{vehicle}/',
  product: '/{L}/systems/{vehicle}/{slug}/',
  compare: '/{L}/compare/',
  accessories: '/{L}/accessories/',
  accessoriesVehicle: '/{L}/accessories/{vehicle}/',
  accessory: '/{L}/accessories/{vehicle}/{id}/',
  blog: '/{L}/blog/',
  post: '/{L}/blog/{slug}/',
  installers: '/{L}/installers/',
  contact: '/{L}/contact/',
  partners: '/{L}/partners/',
  warranty: '/{L}/warranty/',
  notFound: '/{L}/404.html',
};

// The page types the build renders (A18). Only they appear in sitemaps, alternates and the
// language switcher; a unit test fails when one has no page file under src/pages/ or a page file
// renders a type that is not listed. The 404 pages are built too, but never listed.
export const BUILT_PAGE_TYPES: readonly PageType[] = ['home'];

export interface RouteParamValues {
  readonly vehicle: CategoryId;
  readonly slug: string;
  readonly id: string;
}

// The parameters route `K` needs, no more: `{ vehicle }` for a category, `{}` for home.
export type RouteParams<K extends RouteKey> = {
  readonly [P in (typeof ROUTE_PARAMS)[K][number]]: RouteParamValues[P];
};

// Parameters as a link target or a test gives them, before they are checked.
type RawParams = Readonly<Partial<Record<RouteParamName, string | undefined>>>;

// The parameters `route` needs, checked: each one present and a URL segment (the contract's one
// rule, URL_SEGMENT), no other one.
function checkedParams(
  route: RouteKey,
  params: RawParams,
): Partial<Record<RouteParamName, string>> {
  const needed: readonly RouteParamName[] = ROUTE_PARAMS[route];
  const values: Partial<Record<RouteParamName, string>> = {};
  for (const name of ROUTE_PARAM_NAMES) {
    const value = params[name];
    if (value !== undefined && !needed.includes(name)) {
      throw new Error(`The route "${route}" takes no ${name}`);
    }
    if (value === undefined && needed.includes(name)) {
      throw new Error(`The route "${route}" needs ${ROUTE_PARAM_NOUNS[name]}`);
    }
    if (value !== undefined && !URL_SEGMENT.test(value)) {
      throw new Error(
        `The route "${route}" needs ${ROUTE_PARAM_NOUNS[name]}: ${URL_SEGMENT_RULE}, not "${value}"`,
      );
    }
    if (value !== undefined) values[name] = value;
  }
  return values;
}

function filledPath(locale: Locale, route: RouteKey, params: RawParams): string {
  if (!(LOCALES as readonly string[]).includes(locale)) {
    throw new Error(`"${locale}" is not a language of the site`);
  }
  const values = checkedParams(route, params);
  // `systems` is the nav key of the car category page.
  const type: PageType = route === 'systems' ? 'category' : route;
  if (route === 'systems') values.vehicle = 'car';
  return ROUTE_PATHS[type]
    .replace('{L}', () => locale)
    .replaceAll(/\{(\w+)\}/gu, (_match, name: RouteParamName) => values[name] ?? '');
}

// The path of `route` in `locale`: `routePath('en', 'product', { vehicle: 'car', slug:
// 'elite-v3' })` -> `/en/systems/car/elite-v3/`.
export function routePath<K extends RouteKey>(
  locale: Locale,
  route: K,
  params: RouteParams<K>,
): string {
  return filledPath(locale, route, params);
}

// The parameters a path of page type `type` holds, named as its page file names them: `locale`
// for `{L}` (`[locale]`), the others as ROUTE_PATHS does (`[vehicle]`, `[slug]`, `[id]`). The
// inverse of routePath, for Astro's getStaticPaths: the params then always match the URL the
// builders give. A path that is not of `type` is an error.
export function pathParams(type: PageType, path: string): Readonly<Record<string, string>> {
  const parts = ROUTE_PATHS[type].split('/');
  const segments = path.split('/');
  const params: Record<string, string> = {};
  let isOfType = parts.length === segments.length;
  for (const [index, part] of parts.entries()) {
    const segment = segments[index] ?? '';
    const name = /^\{(\w+)\}$/u.exec(part)?.[1];
    if (name === undefined) {
      isOfType &&= part === segment;
    } else {
      isOfType &&= segment !== '';
      params[name === 'L' ? 'locale' : name] = segment;
    }
  }
  if (!isOfType) throw new Error(`"${path}" is not a path of the page type "${type}"`);
  return params;
}

// The href of a Site copy link target in `locale`: its path, plus `#hash` when it has one.
export function targetHref(locale: Locale, target: RouteTarget): string {
  const path = filledPath(locale, target.route, target.params ?? {});
  return target.hash === undefined ? path : `${path}#${target.hash}`;
}

// A product's page, under its category (P1-2).
export function productPath(locale: Locale, product: Pick<Product, 'category' | 'slug'>): string {
  return routePath(locale, 'product', { vehicle: product.category, slug: product.slug });
}

// An accessory's page, under its first vehicle (the canonical one, spec §4). An accessory with no
// vehicle has no URL yet: Phase 3 decides it, so asking for one is an error.
export function accessoryPath(
  locale: Locale,
  accessory: Pick<Accessory, 'id' | 'vehicles'>,
): string {
  const [vehicle] = accessory.vehicles;
  if (vehicle === undefined) {
    throw new Error(`The accessory ${accessory.id} has no vehicle, so it has no URL yet (Phase 3)`);
  }
  return routePath(locale, 'accessory', { vehicle, id: accessory.id });
}

// A post's page, with its slug in `locale` (slugs are per language).
export function postPath(locale: Locale, post: Pick<Post, 'id' | 'slug'>): string {
  const slug = post.slug[locale];
  if (slug === undefined) {
    throw new Error(`The post ${post.id} has no slug in ${locale}`);
  }
  return routePath(locale, 'post', { slug });
}
