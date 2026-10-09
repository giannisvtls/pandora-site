// Resume, budgets and the failure brake, against the fake two-host site (no socket is opened).
import { appendFile, readdir } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { cachePaths } from '../cache';
import { EXIT_CODES, runCli } from '../cli';
import type { Politeness } from '../config';
import type { UrlRecord } from '../output';
import { FAST_POLITENESS, fakeClock, redirect, text, type Route } from './helpers';
import {
  A,
  B,
  byUrl,
  captureIo,
  cliOverrides,
  crawlFake,
  EXPECTED,
  fakeSite,
  ORIGINS,
  readJsonLines,
  readOutput,
  useCrawlSandbox,
} from './run-helpers';
import { CONTACT_PATH, testSite } from './site';

const { outDir } = useCrawlSandbox();

// robots.txt and sitemap files: the seed phase.
const isSeedUrl = (url: string) => url.endsWith('/robots.txt') || url.endsWith('.xml');

describe('resume', () => {
  it('stops at the request budget without crawl.json, then resumes without refetching', async () => {
    const dir = await outDir();
    const first = fakeSite();
    const firstIo = captureIo();

    const stoppedCode = await runCli(
      ['--max-requests', '20'],
      cliOverrides(dir, first.fetch),
      firstIo,
    );

    expect(stoppedCode).toBe(EXIT_CODES.stopped);
    expect(firstIo.out.join('')).toMatch(/STOPPED \(max-requests\)/);
    expect(await readdir(dir)).toStrictEqual(['.crawl-cache']);
    const cached = await readJsonLines<{ record: UrlRecord }>(cachePaths(dir).pages);
    expect(cached.length).toBeGreaterThan(0);
    const cachedUrls = new Set(cached.map((line) => line.record.url));
    // Stopped among the 19 sitemap URLs; every cached line is one of them.
    const remaining = 19 - cachedUrls.size;
    expect(firstIo.out.join('')).toContain(
      `STOPPED (max-requests): ${String(remaining)} known URLs`,
    );

    // A torn last line (a killed run) is ignored and its URL fetched again.
    await appendFile(cachePaths(dir).pages, '{"record":{"url":"https://invetec.eu/to');
    const second = fakeSite();
    const secondIo = captureIo();
    const doneCode = await runCli([], cliOverrides(dir, second.fetch), secondIo);

    expect(doneCode).toBe(EXIT_CODES.complete);
    expect(secondIo.out.join('')).toContain('ignored 1 unreadable cache line(s)');
    const refetched = second.calls.map((call) => call.url);
    expect(refetched.filter((url) => cachedUrls.has(url))).toStrictEqual([]);
    expect(refetched.filter((url) => isSeedUrl(url))).toStrictEqual([]);
    const output = await readOutput(dir);
    expect(output.urls.map((record) => record.url)).toStrictEqual(EXPECTED);
  });

  it.each<[string, Route]>([
    ['503', { status: 503 }],
    ['403', { status: 403 }],
    ['429', { status: 429 }],
    [
      'a network error',
      () => {
        throw new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } });
      },
    ],
  ])('retries a URL that answers %s in the next runs, then keeps that result', async (_, down) => {
    const dir = await outDir();
    const routes = { ...testSite(ORIGINS), [`${A}/flaky/`]: down };

    const first = await crawlFake(dir, fakeSite(routes));
    const second = fakeSite(routes);
    const secondResult = await crawlFake(dir, second);
    const third = fakeSite(routes);
    const thirdResult = await crawlFake(dir, third);

    expect(first).toStrictEqual({ complete: false, reason: 'retry', remaining: 1 });
    expect(secondResult).toStrictEqual({ complete: false, reason: 'retry', remaining: 1 });
    expect(new Set(second.calls.map((call) => call.url))).toStrictEqual(new Set([`${A}/flaky/`]));
    expect(new Set(third.calls.map((call) => call.url))).toStrictEqual(new Set([`${A}/flaky/`]));
    expect(thirdResult).toMatchObject({ complete: true, urls: EXPECTED.length });
    const flaky = byUrl(await readOutput(dir), `${A}/flaky/`);
    expect(typeof down === 'function' ? flaky.error : flaky.status).toBe(
      typeof down === 'function' ? 'network: ECONNRESET' : down.status,
    );
  });

  it('starts over with --fresh', async () => {
    const dir = await outDir();
    await crawlFake(dir);

    const again = fakeSite();
    await crawlFake(dir, again, { fresh: true });

    const urls = again.calls.map((call) => call.url);
    expect(urls).toContain(`${A}/robots.txt`);
    expect(urls).toContain(`${A}${CONTACT_PATH}`);
  });

  it('refuses a cache made for other hosts', async () => {
    const dir = await outDir();
    await crawlFake(dir);
    const io = captureIo();
    const otherHosts = [{ origin: 'https://example.com', rootLang: null }];

    const code = await runCli(
      [],
      { ...cliOverrides(dir, fakeSite({}).fetch), hosts: otherHosts },
      io,
    );

    expect(code).toBe(EXIT_CODES.error);
    expect(io.err.join('')).toMatch(/other hosts; rerun with --fresh/);
  });
});

describe('stopping early', () => {
  it('stops after max-minutes and writes no crawl.json', async () => {
    const dir = await outDir();
    const clock = fakeClock();
    // Every request takes 30 s of fake time.
    const slowRoutes = Object.fromEntries(
      Object.entries(testSite(ORIGINS)).map(([url, route]): [string, Route] => [
        url,
        (call, count) => {
          clock.advance(30_000);
          return typeof route === 'function' ? route(call, count) : route;
        },
      ]),
    );

    const result = await crawlFake(dir, fakeSite(slowRoutes), {
      now: clock.now,
      sleep: clock.sleep,
      maxMinutes: 10,
    });

    expect(result).toMatchObject({ complete: false, reason: 'max-minutes' });
    expect(await readdir(dir)).toStrictEqual(['.crawl-cache']);
  });

  it('stops after a streak of server errors', async () => {
    const dir = await outDir();
    // Seeds answer normally; every page answers 503.
    const failingRoutes = Object.fromEntries(
      Object.entries(testSite(ORIGINS)).map(([url, route]): [string, Route] => [
        url,
        isSeedUrl(url) ? route : { status: 503 },
      ]),
    );
    const politeness: Politeness = { ...FAST_POLITENESS, maxConsecutiveFailures: 3 };
    const site = fakeSite(failingRoutes);

    const result = await crawlFake(dir, site, { politeness });

    expect(result).toMatchObject({ complete: false, reason: 'failures' });
    const pageCalls = site.calls.filter((call) => !isSeedUrl(call.url));
    // At most the 3 failing URLs plus the one other in flight, each tried 3 times.
    expect(pageCalls.length).toBeLessThanOrEqual(4 * 3);
    expect(await readdir(dir)).toStrictEqual(['.crawl-cache']);
  });
});

describe('refusing to crawl', () => {
  it('stops before any sitemap or page when robots.txt asks for a longer Crawl-delay', async () => {
    const dir = await outDir();
    const slowRobots = text('User-agent: *\nCrawl-delay: 5\nDisallow: /wp-admin/\n');
    const site = fakeSite({ ...testSite(ORIGINS), [`${A}/robots.txt`]: slowRobots });
    const io = captureIo();

    const code = await runCli([], cliOverrides(dir, site.fetch), io);

    expect(code).toBe(EXIT_CODES.error);
    expect(io.err.join('')).toMatch(/asks for Crawl-delay 5 s/);
    expect(site.calls.map((call) => call.url)).toStrictEqual([`${A}/robots.txt`]);
  });

  it('reads every robots.txt before any sitemap: a Crawl-delay on host 2 stops all sitemaps', async () => {
    const dir = await outDir();
    const slowRobots = text('User-agent: *\nCrawl-delay: 2\n');
    const site = fakeSite({ ...testSite(ORIGINS), [`${B}/robots.txt`]: slowRobots });
    const io = captureIo();

    const code = await runCli([], cliOverrides(dir, site.fetch), io);

    expect(code).toBe(EXIT_CODES.error);
    expect(io.err.join('')).toMatch(/robots\.txt of lenovo\.invetec\.eu asks for Crawl-delay 2 s/);
    expect(site.calls.map((call) => call.url)).toStrictEqual([
      `${A}/robots.txt`,
      `${B}/robots.txt`,
    ]);
  });

  it('records a redirect to another scheme on an allowed host without following it', async () => {
    const dir = await outDir();
    const site = fakeSite({
      ...testSite(ORIGINS),
      [`${A}/external/`]: redirect('wss://invetec.eu/socket'),
    });

    const result = await crawlFake(dir, site);

    expect(result.complete).toBe(true);
    expect(byUrl(await readOutput(dir), `${A}/external/`)).toMatchObject({
      status: 301,
      error: 'redirect-off-site',
    });
    expect(site.calls.map((call) => call.url)).not.toContain('wss://invetec.eu/socket');
  });
});
