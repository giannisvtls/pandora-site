// The SEO files (spec §9) from the generators in seo.ts, on fixtures (./rules-fixtures.ts) built
// with English only, English + Greek and Italian only, and a preview build (every language built,
// English alone live): the sitemap index, each language's sitemap with its hreflang alternates,
// robots.txt and the root redirect line of `_redirects`; then XML escaping and the Organization
// JSON-LD. ./seo-xml.test.ts reads the XML with a parser.
import { describe, expect, it } from 'vitest';

import type { Locale } from '../contract';
import { createQuery } from '../query';
import type { PageType } from '../routes';
import { createSite, sitemapEntries, type SitemapEntry } from '../rules';
import {
  organizationJsonLd,
  redirectsFile,
  robotsTxt,
  scriptJson,
  SITEMAP_NAMESPACE,
  sitemapIndexXml,
  sitemapXml,
  XHTML_NAMESPACE,
  xmlEscape,
} from '../seo';
import { fixtureContent, snapshot, withLanguage } from './rules-fixtures';

const SITE = new URL('https://invetec.eu');

// Every page type a later phase builds, the 404 pages included: they still never reach a sitemap.
const PAGE_TYPES: readonly PageType[] = ['home', 'category', 'product', 'post', 'notFound'];

// The texts between each `start` and the next `end` in `text`, as written.
const allBetween = (text: string, start: string, end: string) =>
  text
    .split(start)
    .slice(1)
    .map((part) => part.split(end, 1)[0] ?? '');

// The value of the attribute `name` in the attribute list `attributes`, as written.
const attribute = (attributes: string, name: string) =>
  allBetween(attributes, ` ${name}="`, '"')[0] ?? '';

// The `<loc>` URLs of a sitemap or a sitemap index, as written.
const locsOf = (xml: string) => allBetween(xml, '<loc>', '</loc>');

// Each `<url>` of a sitemap, as written: its `<loc>` and its alternates as `hreflang href`.
const urlsOf = (xml: string) =>
  allBetween(xml, '<url>', '</url>').map((url) => ({
    loc: locsOf(url)[0],
    alternates: allBetween(url, '<xhtml:link', '/>').map(
      (link) => `${attribute(link, 'hreflang')} ${attribute(link, 'href')}`,
    ),
  }));

// What urlsOf gives for `entries`, every path made absolute.
const expectedUrls = (entries: readonly SitemapEntry[]) =>
  entries.map(({ path, alternates }) => ({
    loc: new URL(path, SITE).href,
    alternates: alternates.map((link) => `${link.hreflang} ${new URL(link.path, SITE).href}`),
  }));

describe('English only (the Phase 1 build)', () => {
  const data = fixtureContent(['en']);
  const query = createQuery(data, { preview: false });

  it('indexes the English sitemap alone', () => {
    expect(sitemapIndexXml(SITE, query.built)).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<sitemapindex xmlns="${SITEMAP_NAMESPACE}">`,
        '  <sitemap>',
        '    <loc>https://invetec.eu/sitemap-en.xml</loc>',
        '  </sitemap>',
        '</sitemapindex>',
        '',
      ].join('\n'),
    );
  });

  it('lists /en/ alone, with its en and x-default alternates and no lastmod', () => {
    expect(sitemapXml(SITE, query.sitemapEntries('en'))).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<urlset xmlns="${SITEMAP_NAMESPACE}" xmlns:xhtml="${XHTML_NAMESPACE}">`,
        '  <url>',
        '    <loc>https://invetec.eu/en/</loc>',
        '    <xhtml:link rel="alternate" hreflang="en" href="https://invetec.eu/en/"/>',
        '    <xhtml:link rel="alternate" hreflang="x-default" href="https://invetec.eu/en/"/>',
        '  </url>',
        '</urlset>',
        '',
      ].join('\n'),
    );
  });

  it('sends the root to /en/ with a 302 on line 1 of _redirects', () => {
    expect(redirectsFile(data.languages)).toBe('/  /en/  302\n');
  });
});

describe('English and Greek', () => {
  const data = withLanguage(fixtureContent(['en', 'el']), 'el');
  const query = createQuery(data, { preview: false, pageTypes: PAGE_TYPES });

  it('indexes a sitemap per language, in their order', () => {
    expect(locsOf(sitemapIndexXml(SITE, query.built))).toEqual([
      'https://invetec.eu/sitemap-en.xml',
      'https://invetec.eu/sitemap-el.xml',
    ]);
  });

  it("lists each language's pages with their alternates as the head links them", () => {
    for (const locale of query.built) {
      const entries = query.sitemapEntries(locale);
      expect(urlsOf(sitemapXml(SITE, entries)), locale).toEqual(expectedUrls(entries));
    }
    const greek = sitemapXml(SITE, query.sitemapEntries('el'));
    expect(urlsOf(greek)).toContainEqual({
      loc: 'https://invetec.eu/el/systems/car/elite/',
      alternates: [
        'en https://invetec.eu/en/systems/car/elite/',
        'el https://invetec.eu/el/systems/car/elite/',
        'x-default https://invetec.eu/el/systems/car/elite/',
      ],
    });
  });

  it('never lists a 404 page, as a page or as an alternate, though the build has them', () => {
    expect(query.staticPaths('notFound')).toHaveLength(2);
    for (const locale of query.built) {
      const xml = sitemapXml(SITE, query.sitemapEntries(locale));
      expect(xml, locale).not.toContain('404');
      expect(urlsOf(xml).length, locale).toBeGreaterThan(1);
    }
  });

  it('sends the root to /el/ with a 301', () => {
    expect(redirectsFile(data.languages)).toBe('/  /el/  301\n');
  });
});

describe('Italian only', () => {
  // The publish rules alone (rules.ts): the fixture's Site copy has no Italian, so a query would
  // fail its readiness check.
  const data = fixtureContent(['it']);
  const site = createSite(data, { preview: false, pageTypes: PAGE_TYPES });

  it('lists the Italian pages, the it-only product included, with no x-default', () => {
    expect(locsOf(sitemapIndexXml(SITE, site.built))).toEqual([
      'https://invetec.eu/sitemap-it.xml',
    ]);
    const urls = urlsOf(sitemapXml(SITE, sitemapEntries(site, 'it')));
    expect(urls).toContainEqual({
      loc: 'https://invetec.eu/it/systems/car/tracer/',
      alternates: ['it https://invetec.eu/it/systems/car/tracer/'],
    });
    const links = urls.flatMap(({ alternates }) => alternates);
    expect(links.filter((link) => link.startsWith('x-default'))).toEqual([]);
  });

  it('sends the root to /it/ with a 302', () => {
    expect(redirectsFile(data.languages)).toBe('/  /it/  302\n');
  });
});

describe('a preview build (every language built, English alone live)', () => {
  const data = fixtureContent(['en']);
  const query = createQuery(data, { preview: true });

  it('indexes a sitemap per built language', () => {
    const locales: readonly Locale[] = ['en', 'el', 'it', 'sq'];

    expect(locsOf(sitemapIndexXml(SITE, query.built))).toEqual(
      locales.map((locale) => `https://invetec.eu/sitemap-${locale}.xml`),
    );
  });

  it('sends the root to the live English, with a 302: Greek is built, not live', () => {
    expect(query.built).toContain('el');
    expect(redirectsFile(data.languages)).toBe('/  /en/  302\n');
  });
});

describe('robots.txt', () => {
  it('lets every crawler fetch everything and names the sitemap index on the site', () => {
    expect(robotsTxt(SITE)).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://invetec.eu/sitemap-index.xml\n',
    );
    expect(robotsTxt(new URL('https://preview.invetec.eu'))).toContain(
      'Sitemap: https://preview.invetec.eu/sitemap-index.xml\n',
    );
  });
});

describe('XML escaping', () => {
  it('escapes the five XML special characters', () => {
    expect(xmlEscape(`a & b < c > d " e ' f`)).toBe('a &amp; b &lt; c &gt; d &quot; e &apos; f');
  });

  it('escapes every URL of a sitemap, in a loc and in an alternate', () => {
    const xml = sitemapXml(SITE, [
      { path: '/en/?a=1&b=2', alternates: [{ hreflang: 'en', path: "/en/it's/?x=1&y=2" }] },
    ]);

    expect(urlsOf(xml)).toEqual([
      {
        loc: 'https://invetec.eu/en/?a=1&amp;b=2',
        alternates: ['en https://invetec.eu/en/it&apos;s/?x=1&amp;y=2'],
      },
    ]);
  });
});

describe('the Organization JSON-LD', () => {
  const footer = snapshot.siteCopyFooter;
  const urls = { site: SITE, logo: '/_astro/invetec-logo.hash.webp' };

  it('is the footer company block as an Organization with a PostalAddress, no sameAs', () => {
    const json = organizationJsonLd(footer, 'en', urls);

    expect(JSON.parse(json)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'INVETEC E.E.',
      url: 'https://invetec.eu/',
      logo: 'https://invetec.eu/_astro/invetec-logo.hash.webp',
      email: footer.company.email,
      telephone: footer.company.phone,
      address: {
        '@type': 'PostalAddress',
        streetAddress: footer.company.street.en,
        addressLocality: footer.company.locality.en,
        postalCode: footer.company.postalCode,
      },
    });
    expect(json).not.toContain('sameAs');
  });

  it("gives the address in the page's language", () => {
    const greek = withLanguage(footer, 'el');
    greek.company.street = { ...greek.company.street, el: 'Ιερά Οδός 330' };

    expect(JSON.parse(organizationJsonLd(greek, 'el', urls))).toMatchObject({
      address: { streetAddress: 'Ιερά Οδός 330' },
    });
    expect(() => organizationJsonLd(footer, 'el', urls)).toThrow(
      'siteCopyFooter.company.street has no "el" text',
    );
  });

  it('writes no `<`, so no value can end the script element, and parses to the same value', () => {
    const name = 'INVETEC </script><script>alert(1)</script> <!-- E.E.';
    const json = organizationJsonLd(
      { ...footer, company: { ...footer.company, name } },
      'en',
      urls,
    );

    expect(json).not.toContain('<');
    expect((JSON.parse(json) as { name: string }).name).toBe(name);
    // `<` is written as a backslash and `u003c`.
    expect(scriptJson({ a: '</b>' })).toBe(`{"a":"${String.fromCodePoint(0x5c)}u003c/b>"}`);
  });
});
