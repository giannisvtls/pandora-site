// The query module (spec §5, P1-1): the one way pages read content.
// - `createQuery(data, options)` is pure: it checks that every live language is ready (a live
//   language with gaps fails the build; a preview build shows all four without the check), then
//   answers per built language with the contract's types, the publish rules applied (rules.ts),
//   plus the links and levels those rules give. The content answers and `image()` refuse a
//   language that is not built; the page rules (`pageUrl`, `alternates`, `switcherTargets`,
//   `sitemapEntries`) answer for the built languages only.
// - `siteQuery()` is the adapter: it loads every collection and global once per build through
//   astro:content (the only code besides content.config.ts that imports it) and hands them to
//   createQuery. Phase 6 puts a live backend behind the same functions.
import {
  COLLECTIONS,
  GLOBAL_ENTRY_ID,
  GLOBALS,
  SITE_COPY,
  type Accessory,
  type Category,
  type CollectionName,
  type GlobalName,
  type Locale,
  type NavSection,
  type Post,
  type Product,
  type SiteCopyName,
} from './contract';
import { explainerIn, type Explainer } from './explainer';
import { levelOf, type ProductLevel } from './levels';
import { createMediaResolver, type MediaResolver } from './media';
import {
  accessoryPath,
  pathParams,
  postPath,
  productPath,
  targetHref,
  type PageType,
  type RouteParams,
} from './routes';
import {
  alternates,
  assertLanguageReady,
  createSite,
  pagesIn,
  pageUrl,
  sitemapEntries,
  switcherTargets,
  type Alternate,
  type ContentData,
  type ContentIn,
  type FinderIn,
  type Page,
  type SiteOptions,
  type SitemapEntry,
  type SwitcherTarget,
} from './rules';

// `preview`: build every language without the readiness check; `pageTypes`: what tests build in
// place of BUILT_PAGE_TYPES.
export type QueryOptions = SiteOptions;

// A product visible in the language, with its page (P1-2) and its level (P1-7). The page exists
// once product pages are built (Phase 2); the interim index links to it already. Products come in
// their `order` (the data store hands them over sorted by id).
export type ProductIn = Product & { readonly url: string; readonly level: ProductLevel };
// An accessory with its page under its first vehicle; none without a vehicle (Phase 3).
export type AccessoryIn = Accessory & { readonly url: string | undefined };
export type PostIn = Post & { readonly url: string };
export type NavSectionIn = NavSection & { readonly url: string };

// The Site copy groups by short name: `siteCopyHome` -> `home`.
type CopyKey<K extends string> = K extends `siteCopy${infer Group}` ? Uncapitalize<Group> : never;
export type SiteCopy = { readonly [K in SiteCopyName as CopyKey<K>]: ContentData[K] };

// What Astro's getStaticPaths takes: the page file's params (`[locale]`, `[vehicle]`, ...) and
// the props the page reads.
export interface StaticPath<T extends PageType> {
  readonly params: { readonly locale: Locale } & RouteParams<T>;
  readonly props: { readonly locale: Locale; readonly page: Page };
}

export interface Query {
  // The languages the build renders (live ones, or all four in preview).
  readonly built: readonly Locale[];
  readonly products: (locale: Locale) => readonly ProductIn[];
  // In their order.
  readonly categories: (locale: Locale) => readonly Category[];
  readonly accessories: (locale: Locale) => readonly AccessoryIn[];
  readonly posts: (locale: Locale) => readonly PostIn[];
  // The sections shown in the language, in their order.
  readonly navSections: (locale: Locale) => readonly NavSectionIn[];
  readonly siteCopy: (locale: Locale) => SiteCopy;
  readonly finder: (locale: Locale) => FinderIn;
  readonly explainer: (locale: Locale) => Explainer;
  // A media id -> its image file and its alt text in a built language (./media.ts).
  readonly image: MediaResolver;
  // One entry per built language and, for item page types, per item visible there.
  readonly staticPaths: <T extends PageType>(type: T) => StaticPath<T>[];
  readonly pageUrl: (page: Page, locale: Locale) => string | undefined;
  readonly alternates: (page: Page) => Alternate[];
  readonly switcherTargets: (page: Page, current: Locale) => SwitcherTarget[];
  readonly sitemapEntries: (locale: Locale) => SitemapEntry[];
}

const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;

const COPY_NAMES = Object.keys(SITE_COPY) as SiteCopyName[];

function siteCopyOf(content: ContentIn): SiteCopy {
  const groups = COPY_NAMES.map((name) => {
    const group = name.slice('siteCopy'.length);
    return [`${group.charAt(0).toLowerCase()}${group.slice(1)}`, content[name]];
  });
  return Object.fromEntries(groups) as SiteCopy;
}

// The answers for one language, computed once.
interface LocaleView {
  readonly content: ContentIn;
  readonly products: readonly ProductIn[];
  readonly accessories: readonly AccessoryIn[];
  readonly posts: readonly PostIn[];
  readonly navSections: readonly NavSectionIn[];
  readonly explainer: Explainer;
}

function viewOf(content: ContentIn, locale: Locale): LocaleView {
  const products = content.products.toSorted(byOrder).map((product) => ({
    ...product,
    url: productPath(locale, product),
    level: levelOf(product, content.levels),
  }));
  return {
    content,
    products,
    accessories: content.accessories.map((accessory) => ({
      ...accessory,
      url: accessory.vehicles.length === 0 ? undefined : accessoryPath(locale, accessory),
    })),
    posts: content.posts.map((post) => ({ ...post, url: postPath(locale, post) })),
    navSections: content.navSections
      .toSorted(byOrder)
      .map((section) => ({ ...section, url: targetHref(locale, { route: section.route }) })),
    explainer: explainerIn(content, products, locale),
  };
}

export function createQuery(data: ContentData, options: QueryOptions): Query {
  const site = createSite(data, options);
  if (!options.preview) {
    for (const locale of site.built) assertLanguageReady(data, locale);
  }
  // Asking for a language that is not built is an error.
  const assertBuilt = (locale: Locale): void => {
    if (!site.built.includes(locale)) {
      throw new Error(`The language "${locale}" is not built (built: ${site.built.join(', ')})`);
    }
  };
  const views = new Map<Locale, LocaleView>();
  // The answers for a built language.
  const viewIn = (locale: Locale): LocaleView => {
    assertBuilt(locale);
    const view = views.get(locale) ?? viewOf(site.contentIn(locale), locale);
    views.set(locale, view);
    return view;
  };
  const staticPaths = <T extends PageType>(type: T): StaticPath<T>[] => {
    if (!site.pageTypes.includes(type)) {
      throw new Error(
        `The page type "${type}" is not built: BUILT_PAGE_TYPES lists ${site.pageTypes.join(', ')}`,
      );
    }
    return site.built.flatMap((locale) =>
      pagesIn(site, type, locale).map((page) => ({
        params: pathParams(type, pageUrl(site, page, locale) ?? '') as StaticPath<T>['params'],
        props: { locale, page },
      })),
    );
  };
  const resolveImage = createMediaResolver(data.media);
  return {
    built: site.built,
    products: (locale) => viewIn(locale).products,
    categories: (locale) => viewIn(locale).content.categories.toSorted(byOrder),
    accessories: (locale) => viewIn(locale).accessories,
    posts: (locale) => viewIn(locale).posts,
    navSections: (locale) => viewIn(locale).navSections,
    siteCopy: (locale) => siteCopyOf(viewIn(locale).content),
    finder: (locale) => viewIn(locale).content.finder,
    explainer: (locale) => viewIn(locale).explainer,
    image: (id, locale) => {
      assertBuilt(locale);
      return resolveImage(id, locale);
    },
    staticPaths,
    pageUrl: (page, locale) => pageUrl(site, page, locale),
    alternates: (page) => alternates(site, page),
    switcherTargets: (page, current) => switcherTargets(site, page, current),
    sitemapEntries: (locale) => sitemapEntries(site, locale),
  };
}

// Every collection and global through astro:content, as the contract types them (the loader
// validated each one against the contract before the store took it).
async function loadContent(): Promise<ContentData> {
  const { getCollection, getEntry } = await import('astro:content');
  const collections = (Object.keys(COLLECTIONS) as CollectionName[]).map(async (name) => {
    const entries = await getCollection(name);
    return [name, entries.map(({ data }) => data)] as const;
  });
  const globals = (Object.keys(GLOBALS) as GlobalName[]).map(async (name) => {
    const entry = await getEntry(name, GLOBAL_ENTRY_ID);
    if (entry === undefined) {
      throw new Error(`The global ${name} has no "${GLOBAL_ENTRY_ID}" entry`);
    }
    return [name, entry.data] as const;
  });
  const entries = await Promise.all([...collections, ...globals]);
  return Object.fromEntries(entries) as ContentData;
}

// The query of this build, created on first use and shared by every page: the content is loaded
// and checked once. A failed check rejects it, so the build stops with the list of gaps.
function once<T>(make: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | undefined;
  return () => {
    promise ??= make();
    return promise;
  };
}

// Phase 1 builds the live languages only; preview arrives with Phase 6's live backend.
export const siteQuery = once(async () => createQuery(await loadContent(), { preview: false }));
