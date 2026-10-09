// Test helpers for the crawler: fixtures, a fake fetch over a route table, fake clocks, and a
// guard that makes any real request outside 127.0.0.1 fail. No helper here opens a socket.
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { POLITENESS, USER_AGENT, type HostConfig, type Politeness } from '../config';
import type { FetchLike } from '../fetcher';
import type { CrawlOptions } from '../run';

export function fixture(name: string): string {
  return readFileSync(new URL(`../__fixtures__/${name}`, import.meta.url), 'utf8');
}

export interface FakeCall {
  readonly url: string;
  readonly method: string | undefined;
  readonly redirect: RequestRedirect | undefined;
  readonly headers: Headers;
  readonly hasBody: boolean;
  readonly signal: AbortSignal | null | undefined;
}

export interface FakeReply {
  readonly status?: number;
  readonly headers?: Record<string, string>;
  readonly body?: string;
}

export type Route = FakeReply | ((call: FakeCall, count: number) => FakeReply | Promise<FakeReply>);

// A fetch that answers from `routes` (404 for anything else) and records every call. Each call
// yields to the event loop first, so concurrent callers really overlap.
export function fakeFetch(routes: Record<string, Route>) {
  const calls: FakeCall[] = [];
  const counts = new Map<string, number>();
  let inFlight = 0;
  let maxInFlight = 0;
  const fetch: FetchLike = async (url, init) => {
    const call: FakeCall = {
      url,
      method: init.method,
      redirect: init.redirect,
      headers: new Headers(init.headers),
      hasBody: init.body !== undefined && init.body !== null,
      signal: init.signal,
    };
    calls.push(call);
    const count = (counts.get(url) ?? 0) + 1;
    counts.set(url, count);
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    try {
      await new Promise((resolve) => setImmediate(resolve));
      const route = routes[url];
      const reply =
        typeof route === 'function' ? await route(call, count) : (route ?? { status: 404 });
      return new Response(reply.body ?? null, {
        status: reply.status ?? 200,
        headers: reply.headers ?? {},
      });
    } finally {
      inFlight -= 1;
    }
  };
  return { fetch, calls, maxInFlight: () => maxInFlight };
}

export const html = (body: string): FakeReply => ({
  status: 200,
  headers: { 'content-type': 'text/html; charset=UTF-8' },
  body,
});

export const xml = (body: string): FakeReply => ({
  status: 200,
  headers: { 'content-type': 'application/xml; charset=UTF-8' },
  body,
});

export const text = (body: string): FakeReply => ({
  status: 200,
  headers: { 'content-type': 'text/plain; charset=UTF-8' },
  body,
});

export const redirect = (location: string, status = 301): FakeReply => ({
  status,
  headers: { location },
});

// A clock that only moves when the code under test sleeps (or never, when frozen); sleeps are
// recorded and resolve at once.
export function fakeClock({ isFrozen = false }: { isFrozen?: boolean } = {}) {
  let time = 0;
  const sleeps: number[] = [];
  return {
    now: () => time,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      if (!isFrozen) {
        time += ms;
      }
      await Promise.resolve();
    },
    advance: (ms: number) => {
      time += ms;
    },
    sleeps,
  };
}

// Replaces the global fetch so a test that forgets to inject one fails instead of reaching a
// live site. Only 127.0.0.1 passes through, to the real fetch captured at import time.
const realFetch = fetch;

export const loopbackOnlyFetch: typeof fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.hostname !== '127.0.0.1') {
    throw new Error(`test tried to reach ${url.href}; only 127.0.0.1 is allowed`);
  }
  return realFetch(input, init);
};

export async function temporaryDirectory(): Promise<{ dir: string; remove: () => Promise<void> }> {
  const dir = await mkdtemp(path.join(tmpdir(), 'pandora-crawl-'));
  return { dir, remove: () => rm(dir, { recursive: true, force: true }) };
}

export const FAST_POLITENESS: Politeness = { ...POLITENESS, gapMs: 0, backoffMs: 1 };

// Options for runCrawl with a fake site: no real time, no real network.
export function crawlOptions(
  hosts: readonly HostConfig[],
  outDir: string,
  fetch: FetchLike,
  overrides: Partial<CrawlOptions> = {},
): CrawlOptions {
  const clock = fakeClock();
  return {
    hosts,
    outDir,
    fetch,
    sleep: clock.sleep,
    now: clock.now,
    politeness: FAST_POLITENESS,
    userAgent: USER_AGENT,
    fresh: false,
    maxMinutes: null,
    maxRequests: null,
    print: () => {
      // progress lines are not asserted here
    },
    progressEvery: 1000,
    ...overrides,
  };
}
