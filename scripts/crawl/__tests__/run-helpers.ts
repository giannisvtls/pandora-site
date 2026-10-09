// Shared setup for the end-to-end crawl tests over the fake two-host site. The fake fetch never
// opens a socket; the global fetch guard (fetch-guard-setup.ts, every test file) only lets
// 127.0.0.1 through.
import { readFile } from 'node:fs/promises';

import { afterEach } from 'vitest';

import { cachePaths } from '../cache';
import type { CliIo } from '../cli';
import { HOSTS, type HostConfig } from '../config';
import type { FetchLike, RequestLogEntry } from '../fetcher';
import { byCodeUnit, crawlOutputSchema, type CrawlOutput, type UrlRecord } from '../output';
import { runCrawl, type CrawlOptions, type CrawlResult } from '../run';
import { crawlOptions, fakeFetch, temporaryDirectory, text, xml, type Route } from './helpers';
import { expectedUrls, testSite } from './site';

export const A = 'https://invetec.eu';
export const B = 'https://lenovo.invetec.eu';
export const ORIGINS = { a: A, b: B };
export const EXPECTED = expectedUrls(ORIGINS, true).toSorted(byCodeUnit);

export const fakeSite = (routes: Record<string, Route> = testSite(ORIGINS)) => fakeFetch(routes);

// A one-host site for focused tests: invetec.eu alone.
export const ONE_HOST: readonly HostConfig[] = [{ origin: A, rootLang: 'el' }];

// Routes of a one-host site: a robots.txt without rules, /sitemap_index.xml listing
// /<name>.xml, that sitemap listing `locs`, and the given page routes.
export function oneHostSite(
  locs: readonly string[],
  pages: Record<string, Route>,
  name = 'page-sitemap',
): Record<string, Route> {
  const urls = locs.map((loc) => `<url><loc>${loc}</loc></url>`).join('');
  return {
    [`${A}/robots.txt`]: text('User-agent: *\nDisallow:\n'),
    [`${A}/sitemap_index.xml`]: xml(
      `<sitemapindex><sitemap><loc>${A}/${name}.xml</loc></sitemap></sitemapindex>`,
    ),
    [`${A}/${name}.xml`]: xml(`<urlset>${urls}</urlset>`),
    ...pages,
  };
}

export function crawlOneHost(
  dir: string,
  site: { fetch: FetchLike },
  overrides: Partial<CrawlOptions> = {},
): Promise<CrawlResult> {
  return runCrawl(crawlOptions(ONE_HOST, dir, site.fetch, overrides));
}

// Registers the clean-up of every output folder made by `outDir`.
export function useCrawlSandbox(): { outDir: () => Promise<string> } {
  const cleanups: (() => Promise<void>)[] = [];
  afterEach(async () => {
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

export type SentRequest = Extract<RequestLogEntry, { event: 'sent' }>;
export type DoneRequest = Extract<RequestLogEntry, { event: 'done' }>;

// requests.jsonl split into its `sent` and `done` lines.
export async function readRequestLog(
  dir: string,
): Promise<{ sent: SentRequest[]; done: DoneRequest[] }> {
  const lines = await readJsonLines<RequestLogEntry>(cachePaths(dir).requests);
  return {
    sent: lines.filter((line): line is SentRequest => line.event === 'sent'),
    done: lines.filter((line): line is DoneRequest => line.event === 'done'),
  };
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
