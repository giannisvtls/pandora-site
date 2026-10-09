import { describe, expect, it } from 'vitest';

import { parseSitemap, sitemapName } from '../sitemaps';
import { fixture } from './helpers';

const CONTACT_EL =
  'https://invetec.eu/%ce%b5%cf%80%ce%b9%ce%ba%ce%bf%ce%b9%ce%bd%cf%89%ce%bd%ce%af%ce%b1/';

describe('parseSitemap: Yoast SEO', () => {
  it('reads a sitemap index with each child and its lastmod', () => {
    const parsed = parseSitemap(fixture('sitemap-index-yoast.xml'));

    expect(parsed.kind).toBe('index');
    expect(parsed.entries).toStrictEqual([
      { loc: 'https://invetec.eu/post-sitemap.xml', lastmod: '2026-09-30T08:12:44+00:00' },
      { loc: 'https://invetec.eu/page-sitemap.xml', lastmod: '2026-09-28T14:03:10+00:00' },
      { loc: 'https://invetec.eu/category-sitemap.xml', lastmod: '2026-09-30T08:12:44+00:00' },
      { loc: 'https://invetec.eu/post_tag-sitemap.xml', lastmod: '2026-09-30T08:12:44+00:00' },
      { loc: 'https://invetec.eu/author-sitemap.xml', lastmod: '2026-07-02T09:45:00+00:00' },
    ]);
  });

  it('reads a urlset, skipping image:loc and keeping percent-encoded Greek byte for byte', () => {
    const parsed = parseSitemap(fixture('sitemap-page-yoast.xml'));

    expect(parsed.kind).toBe('urlset');
    expect(parsed.entries.map((entry) => entry.loc)).toStrictEqual([
      'https://invetec.eu/',
      CONTACT_EL,
      'https://invetec.eu/en/',
      'https://invetec.eu/en/contact/',
      'https://invetec.eu/it/contatti/',
      'https://invetec.eu/sq/kontakt/',
      'https://invetec.eu/en/legal-notice/',
    ]);
    expect(parsed.entries[1]).toStrictEqual({
      loc: CONTACT_EL,
      lastmod: '2026-05-14T07:21:33+00:00',
    });
    expect(Buffer.from(parsed.entries[1]!.loc)).toStrictEqual(Buffer.from(CONTACT_EL));
  });
});

describe('parseSitemap: WordPress core', () => {
  it('reads a one-line sitemap index without lastmod', () => {
    const parsed = parseSitemap(fixture('sitemap-index-wp-core.xml'));

    expect(parsed.kind).toBe('index');
    expect(parsed.entries).toStrictEqual([
      { loc: 'https://lenovo.invetec.eu/wp-sitemap-posts-product-1.xml', lastmod: null },
      { loc: 'https://lenovo.invetec.eu/wp-sitemap-posts-page-1.xml', lastmod: null },
      { loc: 'https://lenovo.invetec.eu/wp-sitemap-taxonomies-product_cat-1.xml', lastmod: null },
      { loc: 'https://lenovo.invetec.eu/wp-sitemap-taxonomies-product_tag-1.xml', lastmod: null },
    ]);
  });

  it('reads a one-line urlset, with and without lastmod', () => {
    const parsed = parseSitemap(fixture('sitemap-products-wp-core.xml'));

    expect(parsed).toStrictEqual({
      kind: 'urlset',
      entries: [
        {
          loc: 'https://lenovo.invetec.eu/it/product/thinkpad-x1-carbon-gen-12/',
          lastmod: '2026-08-19T12:40:08+00:00',
        },
        {
          loc: 'https://lenovo.invetec.eu/it/product/thinkpad-t14s-gen-6/',
          lastmod: '2026-08-19T12:41:55+00:00',
        },
        { loc: 'https://lenovo.invetec.eu/it/product/thinkcentre-neo-50q/', lastmod: null },
      ],
    });
  });
});

describe('parseSitemap: edge cases', () => {
  it('decodes XML entities and unwraps CDATA, and ignores commented-out entries', () => {
    const parsed = parseSitemap(
      [
        '<urlset>',
        '<!-- <url><loc>https://invetec.eu/commented/</loc></url> -->',
        '<url><loc> https://invetec.eu/a/?x=1&amp;y=2 </loc></url>',
        '<url><loc><![CDATA[https://invetec.eu/b/]]></loc><lastmod> 2026-01-01 </lastmod></url>',
        '<url><lastmod>2026-01-02</lastmod></url>',
        '</urlset>',
      ].join('\n'),
    );

    expect(parsed.entries).toStrictEqual([
      { loc: 'https://invetec.eu/a/?x=1&y=2', lastmod: null },
      { loc: 'https://invetec.eu/b/', lastmod: '2026-01-01' },
    ]);
  });

  it('reports anything else as unknown', () => {
    expect(parseSitemap('<!doctype html><html><body>Not found</body></html>')).toStrictEqual({
      kind: 'unknown',
      entries: [],
    });
  });
});

describe('sitemapName', () => {
  it.each([
    ['https://invetec.eu/post-sitemap.xml', 'post-sitemap'],
    ['https://invetec.eu/post_tag-sitemap2.xml', 'post_tag-sitemap2'],
    ['https://lenovo.invetec.eu/wp-sitemap-posts-product-1.xml', 'wp-sitemap-posts-product-1'],
    ['https://lenovo.invetec.eu/wp-sitemap.xml', 'wp-sitemap'],
  ])('%s -> %s', (url, name) => {
    expect(sitemapName(url)).toBe(name);
  });
});
