// A small crawl.json for the summary tests: 10 invetec.eu URLs and 4 lenovo.invetec.eu URLs that
// cover every CRAWL.md section (a language-tree mismatch, a redirect, a redirect loop, a 404,
// noindex pages, hreflang siblings, link-only orphans, an infotainment page). Built through
// buildOutput, so it always matches the crawl.json schema.
import { buildOutput, type CrawlOutput, type LinkCounts, type UrlRecord } from '../output';

const MAIN = 'https://invetec.eu';
const SHOP = 'https://lenovo.invetec.eu';
const INDEX = 'index, follow';

function record(url: string, overrides: Partial<UrlRecord>): UrlRecord {
  return {
    url,
    host: new URL(url).host,
    source: 'sitemap:page-sitemap',
    lastmod: null,
    status: 200,
    redirectChain: [],
    finalUrl: url,
    contentType: 'text/html; charset=UTF-8',
    htmlLang: 'el',
    pathLang: 'el',
    lang: 'el',
    pageType: 'page',
    title: null,
    canonical: null,
    hreflang: {},
    robotsMeta: INDEX,
    error: null,
    ...overrides,
  };
}

const italian = { htmlLang: 'it-IT', pathLang: 'it', lang: 'it' } as const;
const shop = { htmlLang: 'en-US', pathLang: null, lang: 'en' } as const;

export const SMALL_RECORDS: UrlRecord[] = [
  record(`${MAIN}/`, {
    pageType: 'home',
    hreflang: { el: `${MAIN}/`, en: `${MAIN}/en/`, it: `${MAIN}/it/`, sq: `${MAIN}/sq/` },
  }),
  record(`${MAIN}/b2b/it/offerta/`, {
    ...italian,
    pathLang: 'el',
    source: 'link',
    pageType: 'other',
  }),
  record(`${MAIN}/en/about/`, { htmlLang: 'en-US', pathLang: 'en', lang: 'en' }),
  record(`${MAIN}/it/infotainment-car-it/`, italian),
  record(`${MAIN}/it/old-post/`, {
    ...italian,
    source: 'sitemap:post-sitemap',
    pageType: 'post',
    redirectChain: [{ url: `${MAIN}/it/old-post/`, status: 301, location: `${MAIN}/it/new-post/` }],
    finalUrl: `${MAIN}/it/new-post/`,
  }),
  record(`${MAIN}/loop/`, {
    source: 'link',
    pageType: 'other',
    status: 301,
    redirectChain: [
      { url: `${MAIN}/loop/`, status: 301, location: `${MAIN}/loop-2/` },
      { url: `${MAIN}/loop-2/`, status: 301, location: `${MAIN}/loop/` },
    ],
    finalUrl: `${MAIN}/loop/`,
    contentType: null,
    htmlLang: null,
    robotsMeta: null,
    error: 'redirect-loop',
  }),
  record(`${MAIN}/missing/`, {
    source: 'link',
    pageType: 'other',
    status: 404,
    htmlLang: null,
    robotsMeta: null,
  }),
  record(`${MAIN}/privacy/`, { robotsMeta: 'noindex, nofollow' }),
  record(`${MAIN}/sq/tag/alarm/`, {
    htmlLang: 'sq',
    pathLang: 'sq',
    lang: 'sq',
    source: 'sitemap:post_tag-sitemap',
    pageType: 'tag',
  }),
  record(`${MAIN}/tag/alarm/`, {
    source: 'sitemap:post_tag-sitemap',
    pageType: 'tag',
    hreflang: { el: `${MAIN}/tag/alarm/`, en: `${MAIN}/en/tag/alarm/`, 'x-default': `${MAIN}/` },
  }),
  record(`${SHOP}/cart/`, {
    ...shop,
    source: 'sitemap:wp-sitemap-posts-page-1',
    pageType: 'shop-system',
    robotsMeta: 'noindex, follow',
  }),
  record(`${SHOP}/it/product/tablet-x/`, {
    ...shop,
    pathLang: 'it',
    source: 'sitemap:wp-sitemap-posts-product-1',
    pageType: 'product',
  }),
  record(`${SHOP}/product-category/multimedia/`, {
    ...shop,
    source: 'sitemap:wp-sitemap-taxonomies-product_cat-1',
    pageType: 'product-category',
  }),
  record(`${SHOP}/shop/page/2/`, { ...shop, source: 'link', pageType: 'other' }),
];

function links(linkOnlyUrls: number): LinkCounts {
  return {
    scannedPages: 5,
    pageLinks: 40,
    linkOnlyUrls,
    skippedAsset: 2,
    skippedQuery: 1,
    skippedExternal: 7,
    skippedOther: 0,
    skippedRobots: 0,
  };
}

const NO_SKIPS = { query: 0, offHost: 0, invalid: 0 };

function file(origin: string, name: string, kind: 'index' | 'urlset' | 'skipped', entries = 0) {
  return {
    url: `${origin}/${name}.xml`,
    name,
    status: kind === 'skipped' ? 404 : 200,
    kind,
    entries,
    note: kind === 'skipped' ? 'HTTP 404' : null,
  };
}

function robots(origin: string, sitemap: string) {
  return {
    url: `${origin}/robots.txt`,
    status: 200,
    sitemaps: [`${origin}/${sitemap}`],
    allow: ['/wp-admin/admin-ajax.php'],
    disallow: ['/wp-admin/'],
    crawlDelay: null,
    error: null,
  };
}

export function smallCrawl(): CrawlOutput {
  return buildOutput({
    crawledAt: '2026-10-09T06:00:00.000Z',
    tool: { name: 'pandora-site-crawl', version: '1.0.0' },
    hosts: [
      {
        host: 'invetec.eu',
        origin: MAIN,
        rootLang: 'el',
        sitemaps: [
          file(MAIN, 'sitemap_index', 'index', 3),
          file(MAIN, 'page-sitemap', 'urlset', 4),
          file(MAIN, 'post-sitemap', 'urlset', 1),
          file(MAIN, 'post_tag-sitemap', 'urlset', 2),
          file(MAIN, 'sitemap-index', 'skipped'),
        ],
      },
      {
        host: 'lenovo.invetec.eu',
        origin: SHOP,
        rootLang: null,
        sitemaps: [
          file(SHOP, 'wp-sitemap', 'index', 3),
          file(SHOP, 'wp-sitemap-posts-page-1', 'urlset', 1),
          file(SHOP, 'wp-sitemap-posts-product-1', 'urlset', 1),
          file(SHOP, 'wp-sitemap-taxonomies-product_cat-1', 'urlset', 1),
        ],
      },
    ],
    robots: {
      'invetec.eu': robots(MAIN, 'sitemap.xml'),
      'lenovo.invetec.eu': robots(SHOP, 'wp-sitemap.xml'),
    },
    sitemapCounts: {
      'invetec.eu': {
        sitemapEntries: { 'page-sitemap': 4, 'post-sitemap': 1, 'post_tag-sitemap': 2 },
        duplicateSitemapEntries: 0,
        skippedSitemapEntries: NO_SKIPS,
      },
      'lenovo.invetec.eu': {
        sitemapEntries: {
          'wp-sitemap-posts-page-1': 1,
          'wp-sitemap-posts-product-1': 1,
          'wp-sitemap-taxonomies-product_cat-1': 1,
        },
        duplicateSitemapEntries: 0,
        skippedSitemapEntries: NO_SKIPS,
      },
    },
    links: { 'invetec.eu': links(3), 'lenovo.invetec.eu': links(1) },
    records: SMALL_RECORDS,
  });
}
