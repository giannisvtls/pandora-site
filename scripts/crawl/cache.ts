// The resume cache in redirects/.crawl-cache/ (gitignored). Only --fresh deletes it.
// - state.json          the finished seed: robots rules, sitemap files, every sitemap URL, and the
//                       seed requests accepted as failed (written once, when the seed completes)
// - seed-failures.json  until then: the robots.txt and sitemap files that failed transiently in
//                       the last seed attempt, with how many attempts in a row they failed
// - pages.jsonl         one line per URL per run that tried it: its result, the runs in which it
//                       failed transiently so far, and whether the result is final
// - requests.jsonl      every HTTP request: a `sent` line before it goes out, a `done` line after
// A run killed mid-write leaves at most one torn last line, which the next run ignores.
import { appendFileSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import {
  hostSummarySchema,
  robotsSummarySchema,
  sitemapCountsSchema,
  urlKey,
  urlRecordSchema,
  writeJsonAtomic,
} from './output';

const count = z.number().int().nonnegative();

export const queueEntrySchema = z.strictObject({
  url: z.string(),
  host: z.string(),
  // The sitemap file name, or null for a link-hop URL.
  sitemap: z.string().nullable(),
  lastmod: z.string().nullable(),
});
export type QueueEntry = z.infer<typeof queueEntrySchema>;

export const seedStateSchema = z.strictObject({
  version: z.literal(2),
  startedAt: z.iso.datetime(),
  hosts: z.array(hostSummarySchema),
  robots: z.record(z.string(), robotsSummarySchema),
  sitemapCounts: z.record(z.string(), sitemapCountsSchema),
  entries: z.array(queueEntrySchema),
  // One sentence per seed request accepted as failed; every later run prints them as WARNING.
  warnings: z.array(z.string()),
});
export type SeedState = z.infer<typeof seedStateSchema>;

export const seedFailureSchema = z.strictObject({
  kind: z.enum(['robots', 'sitemap']),
  url: z.string(),
  status: z.number().int().nullable(),
  error: z.string().nullable(),
  // Seed attempts in a row in which this request failed transiently.
  failedSeeds: z.number().int().positive(),
});
export type SeedFailure = z.infer<typeof seedFailureSchema>;

const seedFailuresSchema = z.strictObject({
  version: z.literal(1),
  failures: z.array(seedFailureSchema),
});

export const linkScanSchema = z.strictObject({
  // Distinct same-host page links of this page that no sitemap lists.
  candidates: z.array(z.string()),
  pageLinks: count,
  skippedAsset: count,
  skippedQuery: count,
  skippedExternal: count,
  skippedOther: count,
  skippedRobots: count,
});
export type LinkScan = z.infer<typeof linkScanSchema>;

export const cacheLineSchema = z.strictObject({
  record: urlRecordSchema,
  // Link scan of a sitemap page that returned HTML; null otherwise.
  links: linkScanSchema.nullable(),
  // Runs in which this URL ended in a network error, timeout, 403, 429 or 5xx, so far.
  failedRuns: count,
  // A final result is never fetched again; any other is retried by the next run.
  isFinal: z.boolean(),
});
export type CacheLine = z.infer<typeof cacheLineSchema>;

export interface CachePaths {
  readonly dir: string;
  readonly state: string;
  readonly seedFailures: string;
  readonly pages: string;
  readonly requests: string;
  readonly output: string;
}

export function cachePaths(outDir: string): CachePaths {
  const dir = path.join(outDir, '.crawl-cache');
  return {
    dir,
    state: path.join(dir, 'state.json'),
    seedFailures: path.join(dir, 'seed-failures.json'),
    pages: path.join(dir, 'pages.jsonl'),
    requests: path.join(dir, 'requests.jsonl'),
    output: path.join(outDir, 'crawl.json'),
  };
}

export async function prepareCache(paths: CachePaths, shouldReset: boolean): Promise<void> {
  if (shouldReset) {
    await rm(paths.dir, { recursive: true, force: true });
  }
  await mkdir(paths.dir, { recursive: true });
}

// A new seed means a new URL list: page results go, the request log and seed failures stay.
export async function clearPages(paths: CachePaths): Promise<void> {
  await rm(paths.pages, { force: true });
}

async function readOptional(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function readJson<T>(file: string, schema: z.ZodType<T>): Promise<T | null> {
  const text = await readOptional(file);
  if (text === null) {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    value = undefined;
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`${file} is not a crawl cache file this version can read; rerun with --fresh`);
  }
  return parsed.data;
}

export async function loadState(paths: CachePaths): Promise<SeedState | null> {
  return readJson(paths.state, seedStateSchema);
}

export async function saveState(paths: CachePaths, state: SeedState): Promise<void> {
  await writeJsonAtomic(paths.state, state, paths.dir);
}

export async function loadSeedFailures(paths: CachePaths): Promise<SeedFailure[]> {
  const saved = await readJson(paths.seedFailures, seedFailuresSchema);
  return saved?.failures ?? [];
}

// An empty list removes the file: the seed is complete.
export async function saveSeedFailures(
  paths: CachePaths,
  failures: readonly SeedFailure[],
): Promise<void> {
  if (failures.length === 0) {
    await rm(paths.seedFailures, { force: true });
    return;
  }
  await writeJsonAtomic(paths.seedFailures, { version: 1, failures }, paths.dir);
}

function parseLine(line: string): CacheLine | null {
  try {
    const parsed = cacheLineSchema.safeParse(JSON.parse(line));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// Page results by urlKey, so %ce%b5 and %CE%B5 are one URL; the last line per URL wins.
export class PageResults {
  private readonly byKey = new Map<string, CacheLine>();

  get(url: string): CacheLine | undefined {
    return this.byKey.get(urlKey(url));
  }

  set(line: CacheLine): void {
    this.byKey.set(urlKey(line.record.url), line);
  }
}

export async function loadPages(
  paths: CachePaths,
): Promise<{ results: PageResults; unreadable: number }> {
  const text = (await readOptional(paths.pages)) ?? '';
  const results = new PageResults();
  let unreadable = 0;
  for (const raw of text.split('\n')) {
    if (raw.trim() === '') {
      continue;
    }
    const line = parseLine(raw);
    if (line === null) {
      unreadable += 1;
    } else {
      results.set(line);
    }
  }
  return { results, unreadable };
}

// Synchronous, so lines land in the order they happen and survive a crash.
export function appendJsonLine(file: string, value: unknown): void {
  appendFileSync(file, `${JSON.stringify(value)}\n`, 'utf8');
}

// Ends a torn last line (a killed run) so the next appended line starts on its own line.
export async function sealTornLine(file: string): Promise<void> {
  const text = await readOptional(file);
  if (text !== null && text !== '' && !text.endsWith('\n')) {
    appendFileSync(file, '\n', 'utf8');
  }
}

function seqOf(line: string): number {
  try {
    const value: unknown = JSON.parse(line);
    const isEntry = typeof value === 'object' && value !== null && 'seq' in value;
    return isEntry && typeof value.seq === 'number' ? value.seq : 0;
  } catch {
    return 0;
  }
}

// The `seq` of this run's first request: one more than the highest in the request log.
export async function nextRequestSeq(file: string): Promise<number> {
  await sealTornLine(file);
  const text = (await readOptional(file)) ?? '';
  let last = 0;
  for (const line of text.split('\n')) {
    last = Math.max(last, seqOf(line));
  }
  return last + 1;
}
