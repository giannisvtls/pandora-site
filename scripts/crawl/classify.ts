// Language and page-type inference for one URL.
import { PATH_LANGS } from './config';

export const PAGE_TYPES = [
  'home',
  'page',
  'post',
  'category',
  'tag',
  'author',
  'product',
  'product-category',
  'product-tag',
  'shop-system',
  'other',
] as const;
export type PageType = (typeof PAGE_TYPES)[number];

function pathSegments(url: string): string[] {
  return new URL(url).pathname.split('/').filter((segment) => segment !== '');
}

const PATH_LANG_SET: ReadonlySet<string | undefined> = new Set(PATH_LANGS);

function isPathLang(segment: string | undefined): boolean {
  return PATH_LANG_SET.has(segment);
}

// /en/, /it/ or /sq/ as the first path segment; otherwise the host's root language.
export function inferPathLang(url: string, rootLang: string | null): string | null {
  const [first] = pathSegments(url);
  return first !== undefined && isPathLang(first) ? first : rootLang;
}

// <html lang> wins (its primary subtag, lower-cased: en-US -> en), then the path language.
export function inferLang(htmlLang: string | null, pathLang: string | null): string | null {
  const primary = htmlLang?.split(/[-_]/, 1)[0]?.trim().toLowerCase() ?? '';
  return primary === '' ? pathLang : primary;
}

// WooCommerce system pages (English slugs and the Italian defaults).
const SHOP_SYSTEM_SLUGS = new Set([
  'shop',
  'cart',
  'checkout',
  'my-account',
  'negozio',
  'carrello',
  'pagamento',
  'mio-account',
]);

// The lookup tables below are Maps, not objects: their keys come from the site (a sitemap name,
// a path segment), and `constructor`, `toString` or `__proto__` must not find an
// Object.prototype member.

// Object types named in sitemap files: Yoast `<type>-sitemap<N>`, WordPress core
// `wp-sitemap-posts-<type>-<N>`, `wp-sitemap-taxonomies-<type>-<N>`, `wp-sitemap-users-<N>`.
const SITEMAP_OBJECT_TYPES: ReadonlyMap<string, PageType> = new Map([
  ['post', 'post'],
  ['page', 'page'],
  ['category', 'category'],
  ['post_tag', 'tag'],
  ['author', 'author'],
  ['users', 'author'],
  ['product', 'product'],
  ['product_cat', 'product-category'],
  ['product_tag', 'product-tag'],
]);

function sitemapObjectType(name: string): string | null {
  const core = /^wp-sitemap-(?:posts|taxonomies)-(.+)-\d+$/.exec(name);
  if (core?.[1] !== undefined) {
    return core[1];
  }
  const yoastType = /^(.+)-sitemap\d*$/.exec(name)?.[1] ?? null;
  return /^wp-sitemap-users-\d+$/.test(name) ? 'users' : yoastType;
}

// First path segment (after a language prefix) -> page type, for URLs not typed by a sitemap.
const PATH_TYPES: ReadonlyMap<string, PageType> = new Map([
  ['category', 'category'],
  ['tag', 'tag'],
  ['author', 'author'],
  ['product', 'product'],
  ['product-category', 'product-category'],
  ['product-tag', 'product-tag'],
]);

function typeFromPath(segments: string[]): PageType {
  const [first] = segments;
  if (first === undefined) {
    return 'home';
  }
  const isShopSystem = segments.length === 1 && SHOP_SYSTEM_SLUGS.has(first);
  return isShopSystem ? 'shop-system' : (PATH_TYPES.get(first) ?? 'other');
}

// Home first (the root or a bare language root), then a WooCommerce system page, then the
// sitemap's object type, then the URL pattern.
export function classifyPageType(url: string, sitemap: string | null): PageType {
  const all = pathSegments(url);
  const segments = isPathLang(all[0]) ? all.slice(1) : all;
  const byPath = typeFromPath(segments);
  if (byPath === 'home' || byPath === 'shop-system') {
    return byPath;
  }
  const objectType = sitemap === null ? null : sitemapObjectType(sitemap);
  const bySitemap = objectType === null ? undefined : SITEMAP_OBJECT_TYPES.get(objectType);
  return bySitemap ?? byPath;
}
