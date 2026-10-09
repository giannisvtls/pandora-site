// Hostile or awkward site data, and a crash inside a run: prototype-named keys, URLs that differ
// only in percent-escape case, a robots.txt that redirects, and a worker that throws. No socket
// is opened.
import { setTimeout as delay } from 'node:timers/promises';

import { describe, expect, it } from 'vitest';

import { EXIT_CODES, runCli } from '../cli';
import { fakeFetch, html, redirect, type Route } from './helpers';
import {
  A,
  B,
  captureIo,
  cliOverrides,
  crawlOneHost,
  fakeSite,
  oneHostSite,
  ORIGINS,
  readOutput,
  readRequestLog,
  useCrawlSandbox,
} from './run-helpers';
import { testSite } from './site';

const { outDir } = useCrawlSandbox();

describe('prototype-named keys from the site', () => {
  it('crawls /constructor/, /toString/ and a __proto__ sitemap with &constructor; titles', async () => {
    const dir = await outDir();
    const title = '<title>Q &constructor; &__proto__; &toString; &valueOf;</title>';
    const page = html(`<html lang="el"><head>${title}</head></html>`);
    const urls = [`${A}/constructor/`, `${A}/toString/`, `${A}/__proto__/`];
    const pages: Record<string, Route> = Object.fromEntries(urls.map((url) => [url, page]));
    const site = fakeSite(oneHostSite(urls, pages, '__proto__-sitemap'));

    const result = await crawlOneHost(dir, site);

    expect(result).toMatchObject({ complete: true, urls: 3 });
    const output = await readOutput(dir);
    for (const record of output.urls) {
      expect(record).toMatchObject({
        source: 'sitemap:__proto__-sitemap',
        pageType: 'other',
        title: 'Q &constructor; &__proto__; &toString; &valueOf;',
      });
    }
    expect(output.counts.byHost['invetec.eu']?.sitemapEntries).toStrictEqual({
      '__proto__-sitemap': 3,
    });
  });
});

// The sitemap writes lower-case escapes, as WordPress does; links use other spellings.
const ALPHA_LOWER = `${A}/%ce%b1/`;
const ALPHA_UPPER = `${A}/%CE%B1/`;
const LINKS = `${A}/links/`;

function escapeCaseSite() {
  const links = ['/%CE%B1/', '/α/', '/%ce%b1/'].map((href) => `<a href="${href}">x</a>`);
  const linksPage = html(`<html lang="el"><head></head><body>${links.join('')}</body></html>`);
  const routes = oneHostSite([ALPHA_LOWER, ALPHA_UPPER, LINKS], {
    [ALPHA_LOWER]: html('<html lang="el"><head><title>Alpha</title></head></html>'),
    [LINKS]: linksPage,
  });
  return fakeSite(routes);
}

describe('URL identity ignores percent-escape case', () => {
  it('lists a sitemap URL once and counts its other escape case as a duplicate', async () => {
    const dir = await outDir();
    const crawl = escapeCaseSite();

    await crawlOneHost(dir, crawl);

    const output = await readOutput(dir);
    expect(output.urls.map((record) => record.url)).toStrictEqual([ALPHA_LOWER, LINKS]);
    expect(output.counts.byHost['invetec.eu']).toMatchObject({
      duplicateSitemapEntries: 1,
      sitemapEntries: { 'page-sitemap': 2 },
    });
    const pageCalls = crawl.calls.map((call) => call.url).filter((url) => url.includes('%'));
    expect(pageCalls).toStrictEqual([ALPHA_LOWER]);
  });

  it('does not fetch a %CE or raw-Greek link to a %ce sitemap URL as a link-only URL', async () => {
    const dir = await outDir();

    await crawlOneHost(dir, escapeCaseSite());

    const output = await readOutput(dir);
    expect(output.urls.some((record) => record.source === 'link')).toBe(false);
    expect(output.counts.byHost['invetec.eu']?.links).toMatchObject({
      scannedPages: 2,
      pageLinks: 1,
      linkOnlyUrls: 0,
    });
  });
});

describe('a robots.txt that makes its host disallow-all for good', () => {
  it.each([
    ['to another site', 'https://www.invetec.eu/robots.txt', 'redirect-off-site'],
    ['to another path on its host', `${B}/robots.txt/`, 'robots-disallowed'],
  ])('is named in a WARNING on every run when it redirects %s', async (_, location, reason) => {
    const dir = await outDir();
    const site = fakeSite({ ...testSite(ORIGINS), [`${B}/robots.txt`]: redirect(location) });
    const warning = `WARNING: ${B}/robots.txt ended in ${reason}; its host is treated as disallow-all (RFC 9309), so none of its URLs is crawled`;
    const io = captureIo();

    const code = await runCli([], cliOverrides(dir, site.fetch), io);

    expect(code).toBe(EXIT_CODES.complete);
    // Named when the seed completes and again after COMPLETE.
    expect(io.out.join('').split(warning)).toHaveLength(3);
    const output = await readOutput(dir);
    expect(output.robots['lenovo.invetec.eu']).toMatchObject({
      status: 301,
      error: reason,
      disallow: ['/'],
    });
    expect(output.urls.some((record) => record.host === 'lenovo.invetec.eu')).toBe(false);
  });
});

// Twelve plain pages on one host.
function twelvePages() {
  const pages = Array.from({ length: 12 }, (_, index) => `${A}/p${String(index)}/`);
  const page = html('<html lang="el"><head><title>P</title></head></html>');
  const routes: Record<string, Route> = Object.fromEntries(pages.map((url) => [url, page]));
  return fakeFetch(oneHostSite(pages, routes));
}

describe('a worker that throws', () => {
  it('stops the run: no new request starts after the throw', async () => {
    const dir = await outDir();
    const crawl = twelvePages();
    let callsAtThrow = -1;
    // The first progress line throws, as a failed append would; the other worker goes on.
    const print = (line: string) => {
      if (callsAtThrow !== -1 || !line.startsWith('sitemap URLs:')) {
        return;
      }
      callsAtThrow = crawl.calls.length;
      throw new Error('first failure');
    };

    await expect(crawlOneHost(dir, crawl, { print, progressEvery: 1 })).rejects.toThrow(
      'first failure',
    );
    const callsAtReject = crawl.calls.length;
    await delay(50);

    expect(callsAtThrow).toBeGreaterThan(0);
    expect(callsAtThrow).toBeLessThan(12);
    expect(callsAtReject).toBe(callsAtThrow);
    expect(crawl.calls).toHaveLength(callsAtReject);
    // Every request that was sent has its outcome in the log.
    const { sent, done } = await readRequestLog(dir);
    expect(done.map((entry) => entry.seq).toSorted((a, b) => a - b)).toStrictEqual(
      sent.map((entry) => entry.seq),
    );
  });

  it('rethrows the first error when both workers throw', async () => {
    const dir = await outDir();
    let throws = 0;
    const print = (line: string) => {
      if (!line.startsWith('sitemap URLs:')) {
        return;
      }
      throws += 1;
      throw new Error(`failure ${String(throws)}`);
    };

    await expect(crawlOneHost(dir, twelvePages(), { print, progressEvery: 1 })).rejects.toThrow(
      'failure 1',
    );
    expect(throws).toBe(2);
  });
});
