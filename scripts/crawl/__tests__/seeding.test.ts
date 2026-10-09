// The seed phase across runs: robots.txt first, transient seed failures retried by the next run,
// and accepted (with a warning) after 3 failed seed attempts in a row. No socket is opened.
import { access, readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { cachePaths } from '../cache';
import { EXIT_CODES, runCli } from '../cli';
import type { FetchTrace } from '../fetcher';
import { DISALLOW_ALL, NO_RULES } from '../robots';
import { isTransientSeed, robotsRulesOf } from '../seed';
import type { Route } from './helpers';
import {
  A,
  B,
  captureIo,
  cliOverrides,
  EXPECTED,
  fakeSite,
  ORIGINS,
  readOutput,
  readRequestLog,
  useCrawlSandbox,
} from './run-helpers';
import { testSite } from './site';

const { outDir } = useCrawlSandbox();

const isSeedUrl = (url: string) => url.endsWith('/robots.txt') || url.endsWith('.xml');

function trace(status: number | null, error: string | null = null, body?: string): FetchTrace {
  return { redirectChain: [], finalUrl: `${A}/robots.txt`, status, contentType: null, body, error };
}

describe('robotsRulesOf', () => {
  it('parses a 200 robots.txt', () => {
    expect(robotsRulesOf(trace(200, null, 'User-agent: *\nDisallow: /private/\n'))).toStrictEqual({
      sitemaps: [],
      allow: [],
      disallow: ['/private/'],
      crawlDelay: null,
    });
  });

  it.each([400, 401, 403, 404, 410])(
    'allows everything on a %i (RFC 9309 "unavailable")',
    (status) => {
      expect(robotsRulesOf(trace(status))).toStrictEqual(NO_RULES);
    },
  );

  it.each<[string, FetchTrace]>([
    ['429', trace(429)],
    ['500', trace(500)],
    ['503', trace(503)],
    ['a network error', trace(null, 'network: ECONNRESET')],
    ['a timeout', trace(null, 'timeout')],
    ['a redirect off the site', trace(301, 'redirect-off-site')],
  ])('disallows everything on %s (RFC 9309 "unreachable")', (_, failed) => {
    expect(robotsRulesOf(failed)).toStrictEqual(DISALLOW_ALL);
  });
});

describe('isTransientSeed', () => {
  it.each<[string, boolean, boolean, FetchTrace]>([
    ['503', true, true, trace(503)],
    ['429', true, true, trace(429)],
    ['a network error', true, true, trace(null, 'network: ECONNRESET')],
    ['a timeout', true, true, trace(null, 'timeout')],
    ['403', false, true, trace(403)],
    ['404', false, false, trace(404)],
    ['410', false, false, trace(410)],
    ['200', false, false, trace(200)],
  ])('%s: transient for robots.txt %s, for a sitemap file %s', (_, isRobots, isSitemap, failed) => {
    expect(isTransientSeed(failed, 'robots')).toBe(isRobots);
    expect(isTransientSeed(failed, 'sitemap')).toBe(isSitemap);
  });
});

// The test site, where a URL answers `down` while `isDown(url)` holds.
function siteWithOutage(isDown: (url: string) => boolean, down: Route) {
  const routes = Object.entries(testSite(ORIGINS)).map(([url, normal]): [string, Route] => [
    url,
    (call, count) => {
      const route = isDown(url) ? down : normal;
      return typeof route === 'function' ? route(call, count) : route;
    },
  ]);
  return fakeSite(Object.fromEntries(routes));
}

async function isOnDisk(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

// One CLI run; `calls` are the URLs requested by this run only.
async function crawlCli(dir: string, site: ReturnType<typeof fakeSite>) {
  const io = captureIo();
  const before = site.calls.length;
  const code = await runCli([], cliOverrides(dir, site.fetch), io);
  return { code, out: io.out.join(''), calls: site.calls.slice(before).map((call) => call.url) };
}

describe('a transient seed failure', () => {
  it('leaves the seed incomplete after a robots.txt 503 and a sitemap 503; the next run seeds again', async () => {
    const dir = await outDir();
    let isDown = true;
    const failing = new Set([`${B}/robots.txt`, `${A}/page-sitemap.xml`]);
    const site = siteWithOutage((url) => isDown && failing.has(url), { status: 503 });

    const first = await crawlCli(dir, site);

    expect(first.code).toBe(EXIT_CODES.stopped);
    expect(first.out).toContain(
      `SEED INCOMPLETE: ${B}/robots.txt HTTP 503 (failed 1 of 3 seed attempts in a row)`,
    );
    expect(first.out).toContain('STOPPED (seed-incomplete): the seed is incomplete;');
    // Every robots.txt first; with one of them failing, no sitemap is requested at all.
    expect(first.calls).toStrictEqual([
      `${A}/robots.txt`,
      `${B}/robots.txt`,
      `${B}/robots.txt`,
      `${B}/robots.txt`,
    ]);
    expect(await isOnDisk(cachePaths(dir).state)).toBe(false);

    isDown = false;
    const second = await crawlCli(dir, site);

    expect(second.code).toBe(EXIT_CODES.complete);
    expect(second.calls).toContain(`${B}/robots.txt`);
    const output = await readOutput(dir);
    expect(output.urls.map((record) => record.url)).toStrictEqual(EXPECTED);
    expect(output.robots['lenovo.invetec.eu']).toMatchObject({ status: 200 });
    expect(output.counts.byHost['invetec.eu']?.sitemapEntries['page-sitemap']).toBe(7);
    expect(await isOnDisk(cachePaths(dir).seedFailures)).toBe(false);
  });

  it('leaves the seed incomplete after a sitemap 503; the next run gets the file and its URLs', async () => {
    const dir = await outDir();
    let isDown = true;
    const site = siteWithOutage((url) => isDown && url === `${A}/page-sitemap.xml`, {
      status: 503,
    });

    const first = await crawlCli(dir, site);

    expect(first.code).toBe(EXIT_CODES.stopped);
    expect(first.out).toContain(
      `SEED INCOMPLETE: ${A}/page-sitemap.xml HTTP 503 (failed 1 of 3 seed attempts in a row)`,
    );
    expect(first.calls.filter((url) => !isSeedUrl(url))).toStrictEqual([]);
    expect(await isOnDisk(cachePaths(dir).state)).toBe(false);

    isDown = false;
    const second = await crawlCli(dir, site);

    expect(second.code).toBe(EXIT_CODES.complete);
    const output = await readOutput(dir);
    expect(output.urls.map((record) => record.url)).toStrictEqual(EXPECTED);
    expect(output.counts.byHost['invetec.eu']?.sitemapEntries['page-sitemap']).toBe(7);
  });

  it('treats a sitemap 403 as transient, as for pages', async () => {
    const dir = await outDir();
    const site = siteWithOutage((url) => url === `${A}/post-sitemap.xml`, { status: 403 });

    const first = await crawlCli(dir, site);

    expect(first.code).toBe(EXIT_CODES.stopped);
    expect(first.out).toContain(`SEED INCOMPLETE: ${A}/post-sitemap.xml HTTP 403`);
  });

  it('keeps a sitemap 404 as "not present" and a robots.txt 403 as "no rules"', async () => {
    const dir = await outDir();
    const site = siteWithOutage((url) => url === `${B}/robots.txt`, { status: 403 });

    const result = await crawlCli(dir, site);

    expect(result.code).toBe(EXIT_CODES.complete);
    expect(result.out).not.toContain('SEED INCOMPLETE');
    const output = await readOutput(dir);
    expect(output.robots['lenovo.invetec.eu']).toMatchObject({ status: 403, disallow: [] });
    const category = output.hosts[0]?.sitemaps.find((file) => file.name === 'category-sitemap');
    expect(category).toMatchObject({ kind: 'skipped', status: 404 });
  });
});

describe('a seed request that keeps failing', () => {
  it('is accepted after 3 seed attempts in a row: a sitemap file is skipped and warned', async () => {
    const dir = await outDir();
    const site = siteWithOutage((url) => url === `${A}/page-sitemap.xml`, { status: 503 });
    const warning = `WARNING: ${A}/page-sitemap.xml failed in 3 seed attempts in a row (HTTP 503)`;

    const runs = [await crawlCli(dir, site), await crawlCli(dir, site), await crawlCli(dir, site)];

    expect(runs.map((run) => run.code)).toStrictEqual([3, 3, 0]);
    expect(runs[1]?.out).toContain('(failed 2 of 3 seed attempts in a row)');
    // Named when the seed completes and again after COMPLETE.
    expect(runs[2]?.out.split(warning)).toHaveLength(3);
    const output = await readOutput(dir);
    const pageSitemap = output.hosts[0]?.sitemaps.find((file) => file.name === 'page-sitemap');
    expect(pageSitemap).toMatchObject({ kind: 'skipped', status: 503 });
    expect(pageSitemap?.note).toBe('HTTP 503; failed in 3 seed attempts in a row, accepted');
    expect(output.counts.byHost['invetec.eu']?.sitemapEntries).toStrictEqual({ 'post-sitemap': 9 });
    expect(output.urls.some((record) => record.source === 'sitemap:page-sitemap')).toBe(false);

    // Every later run names it again: once when it resumes, once after COMPLETE.
    const later = await crawlCli(dir, site);
    expect(later.code).toBe(EXIT_CODES.complete);
    expect(later.out.split(warning)).toHaveLength(3);
    expect(later.calls).toStrictEqual([]);
  });

  it('is accepted after 3 seed attempts in a row: a robots.txt makes its host disallow-all', async () => {
    const dir = await outDir();
    const site = siteWithOutage(
      (url) => url === `${B}/robots.txt`,
      () => {
        throw new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } });
      },
    );

    const runs = [await crawlCli(dir, site), await crawlCli(dir, site), await crawlCli(dir, site)];

    expect(runs.map((run) => run.code)).toStrictEqual([3, 3, 0]);
    expect(runs[2]?.out).toContain(
      `WARNING: ${B}/robots.txt failed in 3 seed attempts in a row (network: ECONNREFUSED); its host is treated as disallow-all`,
    );
    const output = await readOutput(dir);
    expect(output.robots['lenovo.invetec.eu']).toMatchObject({
      status: null,
      error: 'network: ECONNREFUSED',
      disallow: ['/'],
    });
    expect(output.urls.some((record) => record.host === 'lenovo.invetec.eu')).toBe(false);
    const toLenovo = site.calls.map((call) => call.url).filter((url) => url.startsWith(B));
    expect(new Set(toLenovo)).toStrictEqual(new Set([`${B}/robots.txt`]));
  });

  it('counts only the seed attempts that reach it, and is not accepted once it answers', async () => {
    const dir = await outDir();
    const down = new Set([`${A}/post-sitemap.xml`]);
    const site = siteWithOutage((url) => down.has(url), { status: 500 });
    const failures = async () =>
      JSON.parse(await readFile(cachePaths(dir).seedFailures, 'utf8')) as unknown;

    await crawlCli(dir, site);
    expect(await failures()).toMatchObject({
      failures: [{ kind: 'sitemap', url: `${A}/post-sitemap.xml`, failedSeeds: 1 }],
    });
    // A robots.txt failure ends the attempt before any sitemap: the sitemap count carries over.
    down.add(`${B}/robots.txt`);
    await crawlCli(dir, site);
    expect(await failures()).toStrictEqual({
      version: 1,
      failures: [
        { kind: 'robots', url: `${B}/robots.txt`, status: 500, error: null, failedSeeds: 1 },
        { kind: 'sitemap', url: `${A}/post-sitemap.xml`, status: 500, error: null, failedSeeds: 1 },
      ],
    });
    down.delete(`${B}/robots.txt`);
    await crawlCli(dir, site);
    expect(await failures()).toMatchObject({
      failures: [{ kind: 'sitemap', url: `${A}/post-sitemap.xml`, failedSeeds: 2 }],
    });
    down.clear();
    const recovered = await crawlCli(dir, site);

    expect(recovered.code).toBe(EXIT_CODES.complete);
    expect(recovered.out).not.toContain('WARNING');
    expect(await isOnDisk(cachePaths(dir).seedFailures)).toBe(false);
  });
});

describe('the request log across seed attempts', () => {
  it('keeps the requests of an incomplete seed; only --fresh deletes the log', async () => {
    const dir = await outDir();
    let isDown = true;
    const site = siteWithOutage((url) => isDown && url === `${B}/robots.txt`, { status: 503 });

    await crawlCli(dir, site);
    const afterFirst = await readRequestLog(dir);
    isDown = false;
    await crawlCli(dir, site);
    const afterSecond = await readRequestLog(dir);

    expect(afterFirst.sent.map((entry) => entry.url)).toStrictEqual([
      `${A}/robots.txt`,
      `${B}/robots.txt`,
      `${B}/robots.txt`,
      `${B}/robots.txt`,
    ]);
    expect(afterSecond.sent.slice(0, 4)).toStrictEqual(afterFirst.sent);
    expect(afterSecond.sent.map((entry) => entry.seq)).toStrictEqual(
      afterSecond.sent.map((_, index) => index + 1),
    );
    expect(afterSecond.sent).toHaveLength(site.calls.length);

    const fresh = fakeSite();
    await runCli(['--fresh'], cliOverrides(dir, fresh.fetch), captureIo());
    const afterFresh = await readRequestLog(dir);
    expect(afterFresh.sent).toHaveLength(fresh.calls.length);
    expect(afterFresh.sent[0]?.seq).toBe(1);
  });
});
