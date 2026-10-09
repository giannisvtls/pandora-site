// The publish rules (spec §4): which items a language shows (the item rule: ./completeness.ts),
// which languages the build renders, whether a language is ready, which pages exist where, and
// the links between languages (alternates, the switcher, the root redirect). Pure TypeScript over
// content shaped by the contract, passed in by the caller (the query module): no Astro, no files.
import type { z } from 'zod';

import { gapsOf, isVisible, mediaById } from './completeness';
import {
  LOCALES,
  SITE_COPY,
  type CategoryId,
  type COLLECTIONS,
  type CollectionName,
  type Finder,
  type GLOBALS,
  type GlobalName,
  type Languages,
  type LevelId,
  type Locale,
  type SiteCopyName,
} from './contract';
import {
  accessoryPath,
  BUILT_PAGE_TYPES,
  postPath,
  productPath,
  routePath,
  type PageType,
} from './routes';

export { gapsIn, isComplete, isVisible, mediaById, sourceOf, type MediaById } from './completeness';

// Every collection (a list of items) and global (one object), as the contract types them.
export type ContentData = {
  readonly [K in CollectionName]: readonly z.infer<(typeof COLLECTIONS)[K]>[];
} & { readonly [K in GlobalName]: z.infer<(typeof GLOBALS)[K]> };

type FinderPick = Finder['picks'][CategoryId][LevelId];

// The Finder in a language: a pick whose product is not visible there is dropped.
export interface FinderIn {
  readonly picks: Readonly<
    Partial<Record<CategoryId, Readonly<Partial<Record<LevelId, FinderPick>>>>>
  >;
  readonly placeNotes: Finder['placeNotes'];
}

export type ContentIn = Omit<ContentData, 'finder'> & { readonly finder: FinderIn };

// The content as `locale` shows it: the items visible there, and every relation to a product
// that is not visible dropped (accessory fits, level systems, Finder picks). Highlights stay
// (features are a fixed-key set); fixed-key sets, media and globals stay as they are, since
// assertLanguageReady requires them complete.
export function contentIn(data: ContentData, locale: Locale): ContentIn {
  const media = mediaById(data.media);
  const visible = <T extends object>(items: readonly T[]): T[] =>
    items.filter((item) => isVisible(item, locale, media));
  const products = visible(data.products);
  const ids = new Set(products.map(({ id }) => id));
  const kept = (list: readonly string[]) => list.filter((id) => ids.has(id));
  const picks = Object.entries(data.finder.picks).map(([vehicle, byLevel]) => [
    vehicle,
    Object.fromEntries(Object.entries(byLevel).filter(([, pick]) => ids.has(pick.product))),
  ]);
  return {
    ...data,
    products,
    accessories: visible(data.accessories).map((item) => ({ ...item, fits: kept(item.fits) })),
    posts: visible(data.posts),
    faq: visible(data.faq),
    installers: visible(data.installers),
    navSections: visible(data.navSections),
    levels: data.levels.map((level) => ({ ...level, systems: kept(level.systems) })),
    finder: { ...data.finder, picks: Object.fromEntries(picks) as FinderIn['picks'] },
  };
}

export interface BuildOptions {
  // Preview builds every language, live or not (Phase 6).
  readonly preview: boolean;
}

// The languages the build renders, in LOCALES order: all four in preview, else the live ones. No
// live language is an error: the site would have no page at all.
export function builtLanguages(languages: Languages, options: BuildOptions): Locale[] {
  if (options.preview) return [...LOCALES];
  const live = LOCALES.filter((locale) => languages[locale].live);
  if (live.length === 0) {
    throw new Error('No language is live: set "live": true for at least one in languages.json');
  }
  return live;
}

const FIXED_KEY_SETS = [
  'categories',
  'accessoryCards',
  'accessoryGroups',
  'features',
  'specRows',
  'levels',
] as const satisfies readonly CollectionName[];

const SITE_COPY_NAMES = Object.keys(SITE_COPY) as SiteCopyName[];

// Everything a language lacks before it can be built: in each Site copy group, the labels of the
// nav sections shown in it, the Finder and every fixed-key set, with their media alt text.
export function languageGaps(data: ContentData, locale: Locale): string[] {
  const media = mediaById(data.media);
  const gaps = new Set<string>();
  const add = (prefix: string, value: object) => {
    const found = gapsOf(value, locale, media);
    for (const path of found.texts) gaps.add(`${prefix}.${path}`);
    for (const path of found.media) gaps.add(path);
  };
  for (const name of SITE_COPY_NAMES) add(name, data[name]);
  for (const section of data.navSections) {
    if (section.showIn.includes(locale)) add(`navSections.${section.id}`, section);
  }
  add('finder', data.finder);
  for (const name of FIXED_KEY_SETS) {
    const entries: readonly { readonly id: string }[] = data[name];
    for (const entry of entries) add(`${name}.${entry.id}`, entry);
  }
  return [...gaps];
}

// Throws one error that lists every missing path (`siteCopyHome.hero.heading.payload`,
// `features.gps.what`, `media.<id>.alt`) unless `locale` is ready to be built.
export function assertLanguageReady(data: ContentData, locale: Locale): void {
  const gaps = languageGaps(data, locale);
  if (gaps.length > 0) {
    throw new Error(
      `The language "${locale}" is not ready to build: ${String(gaps.length)} value(s) have no "${locale}" text:\n- ${gaps.join('\n- ')}`,
    );
  }
}

const ROOT_ORDER: readonly Locale[] = ['el', 'en', 'it', 'sq'];

// The root's language: Greek once it is built, else the first built of English, Italian and
// Albanian. The root 404 page uses it too.
export function rootLanguage(built: readonly Locale[]): Locale {
  const locale = ROOT_ORDER.find((candidate) => built.includes(candidate));
  if (locale === undefined) throw new Error('No language is built, so the root has no language');
  return locale;
}

export interface RootRedirect {
  readonly from: '/';
  readonly to: string;
  readonly status: 301 | 302;
}

// `/` -> `/el/` 301 once Greek is built (live); otherwise a 302 to the root language's home.
export function rootRedirect(built: readonly Locale[]): RootRedirect {
  const locale = rootLanguage(built);
  return { from: '/', to: routePath(locale, 'home', {}), status: locale === 'el' ? 301 : 302 };
}

type ItemPageType = 'product' | 'accessory' | 'post';
type VehiclePageType = 'category' | 'accessoriesVehicle';

// A page: a static page by its type, a vehicle page by its vehicle, an item page by the item's
// id (its path differs per language: a post's slug does).
export type Page =
  | { readonly type: Exclude<PageType, ItemPageType | VehiclePageType> }
  | { readonly type: VehiclePageType; readonly vehicle: CategoryId }
  | { readonly type: ItemPageType; readonly id: string };

export interface SiteOptions extends BuildOptions {
  // The page types the build renders: BUILT_PAGE_TYPES unless a test passes others.
  readonly pageTypes?: readonly PageType[];
}

// What a build renders: its languages, its page types and the content as each language shows it.
export interface Site {
  readonly built: readonly Locale[];
  readonly pageTypes: readonly PageType[];
  readonly contentIn: (locale: Locale) => ContentIn;
}

export function createSite(data: ContentData, options: SiteOptions): Site {
  const cache = new Map<Locale, ContentIn>();
  return {
    built: builtLanguages(data.languages, options),
    pageTypes: options.pageTypes ?? BUILT_PAGE_TYPES,
    contentIn: (locale) => {
      const content = cache.get(locale) ?? contentIn(data, locale);
      cache.set(locale, content);
      return content;
    },
  };
}

// A predicate: the item whose id is `id`.
const withId = (id: string) => (item: { readonly id: string }) => item.id === id;

function pathIn(content: ContentIn, page: Page, locale: Locale): string | undefined {
  switch (page.type) {
    case 'category': {
      const { vehicle } = page;
      return content.categories.some(withId(vehicle))
        ? routePath(locale, 'category', { vehicle })
        : undefined;
    }
    case 'accessoriesVehicle': {
      const { vehicle } = page;
      return content.accessoryCards.some(withId(vehicle))
        ? routePath(locale, 'accessoriesVehicle', { vehicle })
        : undefined;
    }
    case 'product': {
      const product = content.products.find(withId(page.id));
      return product === undefined ? undefined : productPath(locale, product);
    }
    case 'accessory': {
      // An accessory with no vehicle has no page until Phase 3 gives it a URL.
      const accessory = content.accessories.find(withId(page.id));
      return accessory === undefined || accessory.vehicles.length === 0
        ? undefined
        : accessoryPath(locale, accessory);
    }
    case 'post': {
      const post = content.posts.find(withId(page.id));
      return post === undefined ? undefined : postPath(locale, post);
    }
    default: {
      return routePath(locale, page.type, {});
    }
  }
}

// The path of `page` in `locale`; undefined when that language or page type is not built, or the
// item (a vehicle for a vehicle page) is not visible there.
export function pageUrl(site: Site, page: Page, locale: Locale): string | undefined {
  const isBuilt = site.built.includes(locale) && site.pageTypes.includes(page.type);
  return isBuilt ? pathIn(site.contentIn(locale), page, locale) : undefined;
}

// Whether `page` exists in `locale` (spec §4 `pageExists`): static pages in every built
// language, item pages where the item is visible.
export function hasPage(site: Site, page: Page, locale: Locale): boolean {
  return pageUrl(site, page, locale) !== undefined;
}

export interface Alternate {
  readonly hreflang: Locale | 'x-default';
  readonly path: string;
}

// The page in every built language where it exists, in LOCALES order, then `x-default`: its
// Greek path, else its English one, else none. A 404 page has none (A18).
export function alternates(site: Site, page: Page): Alternate[] {
  if (page.type === 'notFound') return [];
  const found = site.built.flatMap((locale): Alternate[] => {
    const path = pageUrl(site, page, locale);
    return path === undefined ? [] : [{ hreflang: locale, path }];
  });
  const fallback =
    found.find(({ hreflang }) => hreflang === 'el') ??
    found.find(({ hreflang }) => hreflang === 'en');
  return fallback === undefined
    ? found
    : [...found, { hreflang: 'x-default', path: fallback.path }];
}

const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;

// Every page of `type` a language can have.
function pagesOf(type: PageType, content: ContentIn): Page[] {
  switch (type) {
    case 'category': {
      return content.categories.toSorted(byOrder).map(({ id }) => ({ type, vehicle: id }));
    }
    case 'accessoriesVehicle': {
      return content.accessoryCards.map(({ id }) => ({ type, vehicle: id }));
    }
    case 'product': {
      return content.products.map(({ id }) => ({ type, id }));
    }
    case 'accessory': {
      return content.accessories.map(({ id }) => ({ type, id }));
    }
    case 'post': {
      return content.posts.map(({ id }) => ({ type, id }));
    }
    case 'notFound': {
      return [];
    }
    default: {
      return [{ type }];
    }
  }
}

export interface SitemapEntry {
  readonly path: string;
  readonly alternates: readonly Alternate[];
}

// Every page of a built page type that exists in `locale`, each with its alternates; never a 404
// page.
export function sitemapEntries(site: Site, locale: Locale): SitemapEntry[] {
  if (!site.built.includes(locale)) return [];
  const content = site.contentIn(locale);
  return site.pageTypes
    .flatMap((type) => pagesOf(type, content))
    .flatMap((page): SitemapEntry[] => {
      const path = pageUrl(site, page, locale);
      return path === undefined ? [] : [{ path, alternates: alternates(site, page) }];
    });
}

export interface SwitcherTarget {
  readonly locale: Locale;
  readonly path: string;
  readonly isCurrent: boolean;
}

// One link per built language (P1-5: live languages only): the page there, else that language's
// home. `current` is the language of the page the switcher is on.
export function switcherTargets(site: Site, page: Page, current: Locale): SwitcherTarget[] {
  return site.built.map((locale) => ({
    locale,
    path: pageUrl(site, page, locale) ?? routePath(locale, 'home', {}),
    isCurrent: locale === current,
  }));
}
