// The resume cache in redirects/.crawl-cache/ (gitignored):
// - state.json      the seed phase: robots rules, sitemap files, every sitemap URL (written once)
// - pages.jsonl     one finished URL per line, appended as it finishes
// - requests.jsonl  one line per HTTP request: method, url, status, attempt, robots verdict
// A run killed mid-write leaves at most one torn last line, which the next run ignores.
import { appendFileSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import {
  hostSummarySchema,
  robotsSummarySchema,
  sitemapCountsSchema,
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
  version: z.literal(1),
  startedAt: z.iso.datetime(),
  hosts: z.array(hostSummarySchema),
  robots: z.record(z.string(), robotsSummarySchema),
  sitemapCounts: z.record(z.string(), sitemapCountsSchema),
  entries: z.array(queueEntrySchema),
});
export type SeedState = z.infer<typeof seedStateSchema>;

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
});
export type CacheLine = z.infer<typeof cacheLineSchema>;

export interface CachePaths {
  readonly dir: string;
  readonly state: string;
  readonly pages: string;
  readonly requests: string;
  readonly output: string;
}

export function cachePaths(outDir: string): CachePaths {
  const dir = path.join(outDir, '.crawl-cache');
  return {
    dir,
    state: path.join(dir, 'state.json'),
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

export async function loadState(paths: CachePaths): Promise<SeedState | null> {
  const text = await readOptional(paths.state);
  if (text === null) {
    return null;
  }
  const parsed = seedStateSchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error(
      `${paths.state} is not a crawl state this version can read; rerun with --fresh`,
    );
  }
  return parsed.data;
}

export async function saveState(paths: CachePaths, state: SeedState): Promise<void> {
  await writeJsonAtomic(paths.state, state);
}

function parseLine(line: string): CacheLine | null {
  try {
    const parsed = cacheLineSchema.safeParse(JSON.parse(line));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// Finished URLs by url; a later line for the same url replaces an earlier one.
export async function loadPages(
  paths: CachePaths,
): Promise<{ lines: Map<string, CacheLine>; unreadable: number }> {
  const text = (await readOptional(paths.pages)) ?? '';
  const lines = new Map<string, CacheLine>();
  let unreadable = 0;
  for (const raw of text.split('\n')) {
    if (raw.trim() === '') {
      continue;
    }
    const line = parseLine(raw);
    if (line === null) {
      unreadable += 1;
    } else {
      lines.set(line.record.url, line);
    }
  }
  return { lines, unreadable };
}

// Synchronous, so lines land in the order the requests finished and survive a crash.
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
