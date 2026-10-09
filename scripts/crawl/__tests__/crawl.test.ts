// End-to-end runs of the crawler against the fake two-host site (no socket is opened).
import { readdir } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { cachePaths } from '../cache';
import { EXIT_CODES, runCli, USAGE } from '../cli';
import { byCodeUnit } from '../output';
import {
  A,
  B,
  byUrl,
  captureIo,
  cliOverrides,
  crawlFake,
  EXPECTED,
  fakeSite,
  readOutput,
  readRequestLog,
  useCrawlSandbox,
} from './run-helpers';
import { CONTACT_PATH, DISALLOWED_PREFIX, PRIVACY_PATH, WORDPRESS_SYSTEM } from './site';

const { outDir } = useCrawlSandbox();

describe('crawl CLI', () => {
  it('prints the usage for --help and makes no request', async () => {
    const dir = await outDir();
    const site = fakeSite();
    const io = captureIo();

    const code = await runCli(['--help'], cliOverrides(dir, site.fetch), io);

    expect(code).toBe(EXIT_CODES.complete);
    expect(io.out.join('')).toBe(USAGE);
    expect(site.calls).toHaveLength(0);
    expect(await readdir(dir)).toStrictEqual([]);
  });

  it.each<string[]>([
    ['--max-minutes', 'soon'],
    ['--max-requests', '2.5'],
    ['--hosts', 'x'],
    ['extra'],
  ])('rejects %s with exit code 2 and no request', async (...argv: string[]) => {
    const site = fakeSite();
    const io = captureIo();

    const code = await runCli(argv, cliOverrides(await outDir(), site.fetch), io);

    expect(code).toBe(EXIT_CODES.usage);
    expect(io.err.join('')).toContain('Usage:');
    expect(site.calls).toHaveLength(0);
  });
});

describe('a complete crawl of the fake site', () => {
  it('writes crawl.json with every sitemap and one-hop URL once, sorted', async () => {
    const dir = await outDir();

    const result = await crawlFake(dir);

    expect(result).toStrictEqual({
      complete: true,
      outputPath: cachePaths(dir).output,
      urls: EXPECTED.length,
      warnings: [],
    });
    const output = await readOutput(dir);
    expect(output.urls.map((record) => record.url)).toStrictEqual(EXPECTED);
    expect(output.tool).toStrictEqual({ name: 'pandora-site-crawl', version: '1.0.0' });
    expect(output.hosts.map((host) => host.host)).toStrictEqual([
      'invetec.eu',
      'lenovo.invetec.eu',
    ]);
  });

  it('records redirects, retries, errors and robots refusals per URL', async () => {
    const dir = await outDir();
    await crawlFake(dir);
    const output = await readOutput(dir);

    expect(byUrl(output, `${A}/en/news/camper-v3-launch/`)).toMatchObject({
      status: 200,
      finalUrl: `${A}/en/news/camper-v3/`,
      redirectChain: [
        { url: `${A}/en/news/camper-v3-launch/`, status: 301, location: `${A}/en/news/camper-v3/` },
      ],
      title: 'Camper V3',
      error: null,
    });
    const oldPost = byUrl(output, `${A}/old-post/`);
    expect(oldPost.redirectChain.map((hop) => hop.status)).toStrictEqual([301, 302]);
    expect(byUrl(output, `${A}/flaky/`)).toMatchObject({ status: 200, error: null });
    expect(byUrl(output, `${A}/gone/`)).toMatchObject({ status: 404, error: null, title: null });
    expect(byUrl(output, `${A}/loop-a/`)).toMatchObject({ status: 301, error: 'redirect-loop' });
    expect(byUrl(output, `${A}/to-shop/`)).toMatchObject({
      status: 200,
      finalUrl: `${B}/it/product/thinkpad-x1-carbon-gen-12/`,
    });
    expect(byUrl(output, `${A}/external/`)).toMatchObject({
      status: 301,
      error: 'redirect-off-site',
      finalUrl: `${A}/external/`,
    });
    expect(byUrl(output, `${A}${DISALLOWED_PREFIX}secret-post/`)).toMatchObject({
      status: null,
      error: 'robots-disallowed',
      redirectChain: [],
    });
    expect(byUrl(output, `${B}/it/product/thinkcentre-neo-50q/`)).toMatchObject({ status: 410 });
  });

  it('fills the head, language and type fields', async () => {
    const dir = await outDir();
    await crawlFake(dir);
    const output = await readOutput(dir);

    expect(byUrl(output, `${A}${CONTACT_PATH}`)).toMatchObject({
      host: 'invetec.eu',
      source: 'sitemap:page-sitemap',
      lastmod: '2026-05-14T07:21:33+00:00',
      contentType: 'text/html; charset=UTF-8',
      htmlLang: 'el',
      pathLang: 'el',
      lang: 'el',
      pageType: 'page',
      canonical: `${A}${CONTACT_PATH}`,
      hreflang: {
        el: `${A}${CONTACT_PATH}`,
        en: `${A}/en/contact/`,
        'x-default': `${A}${CONTACT_PATH}`,
      },
    });
    expect(byUrl(output, `${A}${CONTACT_PATH}`).title).toMatch(/^\p{Script=Greek}+ . INVETEC$/u);
    expect(byUrl(output, `${A}/en/legal-notice/`)).toMatchObject({
      robotsMeta: 'noindex, follow',
      htmlLang: 'en-US',
      lang: 'en',
    });
    expect(byUrl(output, `${A}/`)).toMatchObject({ pageType: 'home', lang: 'el' });
    expect(byUrl(output, `${B}/it/product/thinkpad-t14s-gen-6/`)).toMatchObject({
      host: 'lenovo.invetec.eu',
      source: 'sitemap:wp-sitemap-posts-product-1',
      pathLang: 'it',
      lang: 'it',
      pageType: 'product',
      lastmod: '2026-08-19T12:41:55+00:00',
    });
    expect(byUrl(output, `${A}${PRIVACY_PATH}`)).toMatchObject({
      source: 'link',
      lastmod: null,
      status: 200,
      lang: 'el',
      pageType: 'other',
    });
  });

  it('counts sitemap entries, skips, duplicates and links per host', async () => {
    const dir = await outDir();
    await crawlFake(dir);
    const { counts, hosts, robots } = await readOutput(dir);

    expect(counts.urls).toBe(EXPECTED.length);
    expect(counts.byHost['invetec.eu']).toMatchObject({
      urls: 23,
      sitemapEntries: { 'post-sitemap': 9, 'page-sitemap': 7 },
      duplicateSitemapEntries: 1,
      skippedSitemapEntries: { query: 1, offHost: 2, invalid: 0 },
      links: { linkOnlyUrls: 7, skippedRobots: 1, skippedQuery: 3, skippedAsset: 8 },
    });
    expect(counts.byHost['lenovo.invetec.eu']).toMatchObject({
      urls: 3,
      sitemapEntries: { 'wp-sitemap-posts-product-1': 3 },
      links: { linkOnlyUrls: 0 },
    });
    expect(robots['invetec.eu']).toMatchObject({
      status: 200,
      disallow: ['/wp-admin/', '/wp-content/plugins/', DISALLOWED_PREFIX],
    });
    const yoastFiles = hosts[0]?.sitemaps.map((file) => [file.name, file.kind, file.status]);
    expect(yoastFiles).toStrictEqual([
      ['sitemap_index', 'index', 200],
      ['wp-sitemap', 'skipped', 301],
      ['post-sitemap', 'urlset', 200],
      ['page-sitemap', 'urlset', 200],
      ['category-sitemap', 'skipped', 404],
      ['post_tag-sitemap', 'skipped', 404],
      ['author-sitemap', 'skipped', 404],
    ]);
  });

  it('logs every request: GET only, robots-allowed, no query string, no disallowed path', async () => {
    const dir = await outDir();
    const site = fakeSite();
    await crawlFake(dir, site);

    const { sent, done } = await readRequestLog(dir);

    // Logged in the order sent; seq numbers 1..n, each joined by exactly one outcome.
    expect(sent.map((entry) => entry.url)).toStrictEqual(site.calls.map((call) => call.url));
    expect(sent.map((entry) => entry.seq)).toStrictEqual(sent.map((_, index) => index + 1));
    expect(done.map((entry) => entry.seq).toSorted((a, b) => a - b)).toStrictEqual(
      sent.map((entry) => entry.seq),
    );
    // The outcome names the same URL; the order can differ, since two requests are in flight.
    const doneUrls = done.map((entry) => entry.url).toSorted(byCodeUnit);
    expect(doneUrls).toStrictEqual(sent.map((entry) => entry.url).toSorted(byCodeUnit));
    expect(new Set(sent.map((entry) => entry.method))).toStrictEqual(new Set(['GET']));
    expect(new Set(site.calls.map((call) => call.method))).toStrictEqual(new Set(['GET']));
    for (const entry of sent) {
      expect(entry.robotsAllowed).toBe(true);
      const url = new URL(entry.url);
      expect(url.search).toBe('');
      expect(['invetec.eu', 'lenovo.invetec.eu']).toContain(url.host);
      expect(url.pathname.startsWith(DISALLOWED_PREFIX)).toBe(false);
      expect(url.pathname).not.toMatch(WORDPRESS_SYSTEM);
    }
  });
});
