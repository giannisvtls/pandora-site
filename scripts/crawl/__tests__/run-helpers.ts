// Shared setup for the end-to-end crawl tests over the fake two-host site. The fake fetch never
// opens a socket, and the global fetch is replaced by a guard that only lets 127.0.0.1 through.
import { readFile } from 'node:fs/promises';

import { afterEach, beforeEach, vi } from 'vitest';

import { cachePaths } from '../cache';
import type { CliIo } from '../cli';
import { HOSTS } from '../config';
import type { FetchLike } from '../fetcher';
import { byCodeUnit, crawlOutputSchema, type CrawlOutput, type UrlRecord } from '../output';
import { runCrawl, type CrawlOptions, type CrawlResult } from '../run';
import {
  crawlOptions,
  fakeFetch,
  loopbackOnlyFetch,
  temporaryDirectory,
  type Route,
} from './helpers';
import { expectedUrls, testSite } from './site';

export const A = 'https://invetec.eu';
export const B = 'https://lenovo.invetec.eu';
export const ORIGINS = { a: A, b: B };
export const EXPECTED = expectedUrls(ORIGINS, true).toSorted(byCodeUnit);

export const fakeSite = (routes: Record<string, Route> = testSite(ORIGINS)) => fakeFetch(routes);

// Registers the fetch guard and the clean-up of every output folder made by `outDir`.
export function useCrawlSandbox(): { outDir: () => Promise<string> } {
  const cleanups: (() => Promise<void>)[] = [];
  beforeEach(() => {
    vi.stubGlobal('fetch', loopbackOnlyFetch);
  });
  afterEach(async () => {
    vi.unstubAllGlobals();
    await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
  });
  return {
    outDir: async () => {
      const { dir, remove } = await temporaryDirectory();
      cleanups.push(remove);
      return dir;
    },
  };
}

export function crawlFake(
  dir: string,
  site: { fetch: FetchLike } = fakeSite(),
  overrides: Partial<CrawlOptions> = {},
): Promise<CrawlResult> {
  return runCrawl(crawlOptions(HOSTS, dir, site.fetch, overrides));
}

export async function readOutput(dir: string): Promise<CrawlOutput> {
  const text = await readFile(cachePaths(dir).output, 'utf8');
  return crawlOutputSchema.parse(JSON.parse(text));
}

export async function readJsonLines<T>(file: string): Promise<T[]> {
  const text = await readFile(file, 'utf8');
  return text
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => JSON.parse(line) as T);
}

export function byUrl(output: CrawlOutput, url: string): UrlRecord {
  const found = output.urls.find((record) => record.url === url);
  if (found === undefined) {
    throw new Error(`no record for ${url}`);
  }
  return found;
}

export function captureIo(): CliIo & { out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    stdout: (text) => {
      out.push(text);
    },
    stderr: (text) => {
      err.push(text);
    },
  };
}

// runCli overrides for the fake site. The budget flags and `print` stay with the CLI, so its
// messages reach the captured io.
export function cliOverrides(dir: string, fetch: FetchLike): Partial<CrawlOptions> {
  const options = crawlOptions(HOSTS, dir, fetch);
  return {
    hosts: options.hosts,
    outDir: dir,
    fetch,
    sleep: options.sleep,
    now: options.now,
    politeness: options.politeness,
    userAgent: options.userAgent,
    progressEvery: options.progressEvery,
  };
}
