// URLs that keep failing: retried by later runs after the untried URLs, never able to trip the
// failure brake again, and final after 3 failed runs. No socket is opened.
import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { cachePaths } from '../cache';
import { EXIT_CODES, runCli } from '../cli';
import { FAST_POLITENESS, html, type Route } from './helpers';
import {
  A,
  captureIo,
  cliOverrides,
  fakeSite,
  ONE_HOST,
  oneHostSite,
  readOutput,
  useCrawlSandbox,
} from './run-helpers';

const { outDir } = useCrawlSandbox();

// 25 URLs that always answer 500, then /ok/.
const BAD = Array.from({ length: 25 }, (_, index) => `${A}/bad-${String(index).padStart(2, '0')}/`);
const OK = `${A}/ok/`;

function failingSite() {
  const pages: Record<string, Route> = Object.fromEntries(
    BAD.map((url): [string, Route] => [url, { status: 500 }]),
  );
  pages[OK] = html('<html lang="el"><head><title>OK</title></head></html>');
  return fakeSite(oneHostSite([...BAD, OK], pages));
}

const isPage = (url: string) => !url.endsWith('/robots.txt') && !url.endsWith('.xml');

const MAX_RUNS = 6;

// Runs the CLI until it completes (at most MAX_RUNS runs); per run: exit code, output, page URLs
// and the number of lines in pages.jsonl.
async function runUntilComplete(dir: string, maxConsecutiveFailures: number) {
  const site = failingSite();
  const runs: { code: number; out: string; pages: string[]; cacheLines: number }[] = [];
  for (let run = 0; run < MAX_RUNS; run += 1) {
    const io = captureIo();
    const before = site.calls.length;
    const code = await runCli(
      [],
      {
        ...cliOverrides(dir, site.fetch),
        hosts: ONE_HOST,
        politeness: { ...FAST_POLITENESS, maxConsecutiveFailures },
      },
      io,
    );
    const pages = site.calls
      .slice(before)
      .map((call) => call.url)
      .filter((url) => isPage(url));
    const cache = await readFile(cachePaths(dir).pages, 'utf8');
    runs.push({ code, out: io.out.join(''), pages, cacheLines: cache.trim().split('\n').length });
    if (code !== EXIT_CODES.stopped) {
      break;
    }
  }
  return runs;
}

describe('URLs that keep failing across runs', () => {
  it('cannot stall the crawl: every run makes progress and the last one completes', async () => {
    const dir = await outDir();

    const runs = await runUntilComplete(dir, 20);

    expect(runs.map((run) => run.code)).toStrictEqual([3, 3, 3, 0]);
    // Run 1: 20 untried URLs fail in a row, the outage brake stops it.
    expect(runs[0]?.out).toMatch(/STOPPED \(failures\)/);
    expect(runs[0]?.pages).not.toContain(OK);
    // Run 2: the untried URLs first (/ok/ among them), then every earlier failure once more;
    // those known-bad URLs cannot trip the brake again.
    expect(runs[1]?.pages).toContain(OK);
    expect(new Set(runs[1]?.pages)).toStrictEqual(new Set([...BAD, OK]));
    expect(runs[1]?.out).toContain('STOPPED (retry): 25 URLs to retry;');
    // Every run adds results to the cache.
    const lines = runs.map((run) => run.cacheLines);
    expect(lines).toStrictEqual(lines.toSorted((a, b) => a - b));
    expect(new Set(lines).size).toBe(lines.length);
    // The last run ends with nothing left.
    expect(runs[3]?.out).toMatch(/run: done 26 of 26 known URLs, 0 remaining/);
    expect(runs[3]?.out).toContain('COMPLETE: wrote');
    const output = await readOutput(dir);
    expect(output.urls).toHaveLength(26);
    expect(output.urls.filter((record) => record.status === 500)).toHaveLength(25);
    expect(output.urls.find((record) => record.url === OK)).toMatchObject({ status: 200 });
  });

  it('fetches /ok/ in run 1 when the failures stay under the brake, and completes after 3 runs', async () => {
    const dir = await outDir();

    const runs = await runUntilComplete(dir, 30);

    expect(runs.map((run) => run.code)).toStrictEqual([3, 3, 0]);
    expect(runs[0]?.pages).toContain(OK);
    expect(runs[0]?.out).toContain('STOPPED (retry): 25 URLs to retry;');
    // Run 2 and 3 retry only the failing URLs.
    expect(new Set(runs[1]?.pages)).toStrictEqual(new Set(BAD));
    expect(new Set(runs[2]?.pages)).toStrictEqual(new Set(BAD));
    const output = await readOutput(dir);
    expect(output.urls.map((record) => record.url)).toStrictEqual([...BAD, OK]);
  });

  it('keeps a result that answered on a retry, and fetches the links that page has', async () => {
    const dir = await outDir();
    const linked = `${A}/linked/`;
    let isDown = true;
    const site = fakeSite(
      oneHostSite([OK], {
        [OK]: () =>
          isDown
            ? { status: 503 }
            : html(`<html lang="el"><head></head><body><a href="/linked/">x</a></body></html>`),
        [linked]: html('<html lang="el"><head><title>Linked</title></head></html>'),
      }),
    );
    const overrides = { ...cliOverrides(dir, site.fetch), hosts: ONE_HOST };

    const first = await runCli([], overrides, captureIo());
    isDown = false;
    const second = await runCli([], overrides, captureIo());

    expect([first, second]).toStrictEqual([EXIT_CODES.stopped, EXIT_CODES.complete]);
    const output = await readOutput(dir);
    expect(output.urls.map((record) => [record.url, record.source, record.status])).toStrictEqual([
      [linked, 'link', 200],
      [OK, 'sitemap:page-sitemap', 200],
    ]);
  });
});
