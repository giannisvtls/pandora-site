import { describe, expect, it, vi } from 'vitest';

import { PageResults, type SeedState } from '../cache';
import type { Http } from '../fetcher';
import { classifyLink, type LinkVerdict } from '../links';
import type { UrlRecord } from '../output';
import { linkHopQueue, scanLinks, type PageContext } from '../page';
import { fixture } from './helpers';

const NO_SKIPS = {
  skippedAsset: 0,
  skippedQuery: 0,
  skippedExternal: 0,
  skippedOther: 0,
  skippedRobots: 0,
};

const CONTACT_EL =
  'https://invetec.eu/%ce%b5%cf%80%ce%b9%ce%ba%ce%bf%ce%b9%ce%bd%cf%89%ce%bd%ce%af%ce%b1/';
const PRIVACY_EL = 'https://invetec.eu/%ce%b1%cf%80%cf%8c%cf%81%cf%81%ce%b7%cf%84%ce%bf/';

// The same URL over plain HTTP (built, so no insecure URL literal is needed).
function plainHttp(url: string): string {
  const insecure = new URL(url);
  insecure.protocol = 'http:';
  return insecure.href;
}

const page = (url: string): LinkVerdict => ({ kind: 'page', url });
const skip = (reason: 'asset' | 'query' | 'external' | 'other'): LinkVerdict => ({
  kind: 'skip',
  reason,
});

describe('classifyLink', () => {
  it.each<[string, LinkVerdict]>([
    // Same-host pages: resolved, fragment and empty query dropped, escapes kept as written.
    ['/en/contact/', page('https://invetec.eu/en/contact/')],
    ['  /en/contact/#map ', page('https://invetec.eu/en/contact/')],
    ['#content', page(CONTACT_EL)],
    ['/en/x?', page('https://invetec.eu/en/x')],
    ['/%ce%b1%cf%80%cf%8c%cf%81%cf%81%ce%b7%cf%84%ce%bf/', page(PRIVACY_EL)],
    [plainHttp('https://invetec.eu/en/about/'), page('https://invetec.eu/en/about/')],
    ['/legacy/index.php', page('https://invetec.eu/legacy/index.php')],
    ['/old/page.html', page('https://invetec.eu/old/page.html')],
    ['/old/page.HTM', page('https://invetec.eu/old/page.HTM')],
    // Query strings are never fetched.
    ['/?s=camper', skip('query')],
    ['/product/camper-v3/?add-to-cart=12', skip('query')],
    // WordPress uploads, REST API, admin, system files, feeds and files.
    ['/wp-content/uploads/2024/05/catalog.pdf', skip('asset')],
    ['/wp-json/wp/v2/pages/12', skip('asset')],
    ['/wp-admin/', skip('asset')],
    ['/wp-includes/js/x.js', skip('asset')],
    ['/wp-login.php', skip('asset')],
    ['/wp-cron.php', skip('asset')],
    ['/xmlrpc.php', skip('asset')],
    ['/feed/', skip('asset')],
    ['/en/news/feed/atom/', skip('asset')],
    ['/brochure.pdf', skip('asset')],
    ['/images/logo.PNG', skip('asset')],
    ['/sitemap_index.xml', skip('asset')],
    // Another host (the other crawled host included) and other schemes.
    ['https://lenovo.invetec.eu/it/product/x/', skip('external')],
    ['https://www.example.com/invetec', skip('external')],
    ['//www.example.com/x', skip('external')],
    ['mailto:info@example.com', skip('other')],
    ['tel:+302100000000', skip('other')],
    ['javascript:void(0)', skip('other')],
    ['https://[broken', skip('other')],
  ])('%s', (href, verdict) => {
    expect(classifyLink(href, CONTACT_EL)).toStrictEqual(verdict);
  });
});

const SITEMAP_PAGES = new Set([
  'https://invetec.eu/',
  CONTACT_EL,
  'https://invetec.eu/en/',
  'https://invetec.eu/en/contact/',
  'https://invetec.eu/en/legal-notice/',
]);

// scanLinks only uses the robots check and the sitemap lookup.
function pageContext(isRobotsAllowed: (url: URL) => boolean): PageContext {
  return {
    http: {} as Http,
    follow: { maxRedirects: 5, refuse: () => null },
    rootLang: () => 'el',
    isRobotsAllowed,
    isSitemapUrl: (url) => SITEMAP_PAGES.has(url),
  };
}

describe('scanLinks (one-hop filter)', () => {
  it('counts each link once per page by reason and lists only page links outside the sitemaps', () => {
    const scan = scanLinks(
      fixture('page-el-contact.html'),
      CONTACT_EL,
      pageContext(() => true),
    );

    expect(scan).toStrictEqual({
      candidates: [
        PRIVACY_EL,
        'https://invetec.eu/legacy/index.php',
        'https://invetec.eu/old/page.html',
        'https://invetec.eu/en/about/',
        'https://invetec.eu/en/unquoted/',
        'https://invetec.eu/en/upper-case-tag/',
        'https://invetec.eu/en/gt-in-attribute/',
        'https://invetec.eu/private-area/report/',
      ],
      pageLinks: 12,
      skippedAsset: 8,
      skippedQuery: 3,
      skippedExternal: 2,
      skippedOther: 3,
      skippedRobots: 0,
    });
  });

  it('counts a robots-disallowed page link instead of listing it', () => {
    const isRobotsAllowed = vi.fn((url: URL) => !url.pathname.startsWith('/private-area/'));
    const scan = scanLinks(
      fixture('page-el-contact.html'),
      CONTACT_EL,
      pageContext(isRobotsAllowed),
    );

    expect(scan.candidates).not.toContain('https://invetec.eu/private-area/report/');
    expect(scan.candidates).toHaveLength(7);
    expect(scan.pageLinks).toBe(11);
    expect(scan.skippedRobots).toBe(1);
  });

  it('counts one link for spellings that differ only in escape case, keeping the first', () => {
    const page = ['/%cf%80/', '/%CF%80/', '/π/', '/%Cf%80/#x'].map((href) => `<a href="${href}">`);

    const scan = scanLinks(
      page.join(''),
      'https://invetec.eu/en/',
      pageContext(() => true),
    );

    expect(scan.candidates).toStrictEqual(['https://invetec.eu/%cf%80/']);
    expect(scan.pageLinks).toBe(1);
  });
});

describe('linkHopQueue', () => {
  it('lists a link-only URL once across pages that spell its escapes differently', () => {
    const pages = ['https://invetec.eu/a/', 'https://invetec.eu/b/'];
    const state: SeedState = {
      version: 2,
      startedAt: '2026-10-09T10:00:00.000Z',
      hosts: [],
      robots: {},
      sitemapCounts: {},
      entries: pages.map((url) => ({
        url,
        host: 'invetec.eu',
        sitemap: 'page-sitemap',
        lastmod: null,
      })),
      warnings: [],
    };
    const results = new PageResults();
    const links = ['https://invetec.eu/%cf%80/', 'https://invetec.eu/%CF%80/'];
    for (const [index, url] of pages.entries()) {
      results.set({
        record: { url } as UrlRecord,
        links: { ...NO_SKIPS, candidates: [links[index] ?? ''], pageLinks: 1 },
        failedRuns: 0,
        isFinal: true,
      });
    }

    expect(linkHopQueue(state, results).map((entry) => entry.url)).toStrictEqual([
      'https://invetec.eu/%cf%80/',
    ]);
  });
});
