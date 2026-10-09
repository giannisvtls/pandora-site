// --max-minutes as a hard bound (fake timers), and the request log written before each request
// is sent. No socket is opened.
import { readFileSync } from 'node:fs';
import { access } from 'node:fs/promises';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { cachePaths } from '../cache';
import type { FetchLike, RequestLogEntry } from '../fetcher';
import { FAST_POLITENESS, type Route } from './helpers';
import {
  A,
  crawlFake,
  EXPECTED,
  fakeSite,
  ORIGINS,
  readRequestLog,
  useCrawlSandbox,
} from './run-helpers';
import { testSite } from './site';

const { outDir } = useCrawlSandbox();

afterEach(() => {
  vi.useRealTimers();
});

const isSeedUrl = (url: string) => url.endsWith('/robots.txt') || url.endsWith('.xml');

async function isOnDisk(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

// The test site where the matching URLs never answer until their request is aborted;
// `started` resolves with the first of them to be requested.
function hangingSite(shouldHang: (url: string) => boolean) {
  const { promise: started, resolve: markStarted } = Promise.withResolvers<string>();
  const hang: Route = (call) =>
    new Promise((_resolve, reject) => {
      call.signal?.addEventListener('abort', () => {
        reject(new DOMException('aborted', 'AbortError'));
      });
      markStarted(call.url);
    });
  const routes = Object.entries(testSite(ORIGINS)).map(([url, route]): [string, Route] => [
    url,
    shouldHang(url) ? hang : route,
  ]);
  return { site: fakeSite(Object.fromEntries(routes)), started };
}

// A request timeout far beyond the deadline, so only the deadline can end a hanging request.
const SLOW_TIMEOUT = { ...FAST_POLITENESS, timeoutMs: 60 * 60_000 };

describe('--max-minutes', () => {
  it('aborts the requests in flight at the deadline and leaves their URLs for the next run', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const dir = await outDir();
    const { site, started } = hangingSite((url) => !isSeedUrl(url));

    const running = crawlFake(dir, site, { maxMinutes: 1, politeness: SLOW_TIMEOUT });
    await started;
    await vi.advanceTimersByTimeAsync(60_000);
    const result = await running;

    expect(result).toStrictEqual({ complete: false, reason: 'max-minutes', remaining: 19 });
    // Not failures, not cached: no page result at all.
    expect(await isOnDisk(cachePaths(dir).pages)).toBe(false);
    const { sent, done } = await readRequestLog(dir);
    const pageSent = sent.filter((entry) => !isSeedUrl(entry.url));
    expect(pageSent.length).toBeGreaterThan(0);
    expect(pageSent.length).toBeLessThanOrEqual(2);
    // Each aborted once, never retried, and logged as aborted.
    expect(new Set(pageSent.map((entry) => entry.url)).size).toBe(pageSent.length);
    for (const entry of pageSent) {
      expect(done.find((line) => line.seq === entry.seq)).toMatchObject({
        url: entry.url,
        status: null,
        error: 'aborted',
      });
    }

    vi.useRealTimers();
    const next = fakeSite();
    const finished = await crawlFake(dir, next);

    expect(finished).toMatchObject({ complete: true, urls: EXPECTED.length });
    const nextUrls = next.calls.map((call) => call.url);
    for (const entry of pageSent) {
      expect(nextUrls).toContain(entry.url);
    }
  });

  it('counts the seed against the budget: a hanging robots.txt is aborted at the deadline', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const dir = await outDir();
    const { site, started } = hangingSite((url) => url === `${A}/robots.txt`);

    const running = crawlFake(dir, site, { maxMinutes: 2, politeness: SLOW_TIMEOUT });
    await started;
    await vi.advanceTimersByTimeAsync(2 * 60_000);
    const result = await running;

    expect(result).toStrictEqual({ complete: false, reason: 'max-minutes', remaining: null });
    expect(site.calls.map((call) => call.url)).toStrictEqual([`${A}/robots.txt`]);
    // The attempt is dropped: no state, and no failure counted against the seed.
    expect(await isOnDisk(cachePaths(dir).state)).toBe(false);
    expect(await isOnDisk(cachePaths(dir).seedFailures)).toBe(false);
    const { done } = await readRequestLog(dir);
    expect(done).toMatchObject([{ url: `${A}/robots.txt`, error: 'aborted' }]);
  });
});

describe('the request log', () => {
  it('has the sent line of every request before the request goes out', async () => {
    const dir = await outDir();
    const requests = cachePaths(dir).requests;
    const inner = fakeSite();
    const unlogged: string[] = [];
    // What a process killed inside fetch would leave behind: the log as it is at that moment.
    const fetch: FetchLike = (url, init) => {
      const lines = readFileSync(requests, 'utf8').trim().split('\n');
      const last = JSON.parse(lines.at(-1) ?? '{}') as Partial<RequestLogEntry>;
      if (last.event !== 'sent' || last.url !== url) {
        unlogged.push(url);
      }
      return inner.fetch(url, init);
    };

    const result = await crawlFake(dir, { fetch });

    expect(result.complete).toBe(true);
    expect(inner.calls.length).toBeGreaterThan(30);
    expect(unlogged).toStrictEqual([]);
    const { sent, done } = await readRequestLog(dir);
    expect(sent).toHaveLength(inner.calls.length);
    expect(done).toHaveLength(inner.calls.length);
  });
});
