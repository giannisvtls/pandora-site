// The shape of redirects/crawl.json (spec: "Output"), its builder and its atomic writer.
import { rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import { PAGE_TYPES } from './classify';

const count = z.number().int().nonnegative();

// The identity of a URL for every "same URL?" check of the crawl: percent-escape hex digits are
// upper-cased (RFC 3986 section 6.2.2.1: %ce%b5 and %CE%B5 are the same octet), nothing else
// changes (trailing slash and path case stay significant). Callers pass URL-parsed hrefs, in
// which non-ASCII is already percent-encoded. Records keep the spelling the site used.
export function urlKey(url: string): string {
  return url.replaceAll(/%[\da-f]{2}/gi, (escape) => escape.toUpperCase());
}

const redirectHopSchema = z.strictObject({
  url: z.string(),
  status: z.number().int(),
  location: z.string(),
});

export const urlRecordSchema = z.strictObject({
  url: z.string().min(1),
  host: z.string().min(1),
  source: z.string().regex(/^(?:sitemap:.+|link)$/),
  lastmod: z.string().nullable(),
  status: z.number().int().nullable(),
  redirectChain: z.array(redirectHopSchema),
  finalUrl: z.string(),
  contentType: z.string().nullable(),
  htmlLang: z.string().nullable(),
  pathLang: z.string().nullable(),
  lang: z.string().nullable(),
  pageType: z.enum(PAGE_TYPES),
  title: z.string().nullable(),
  canonical: z.string().nullable(),
  hreflang: z.record(z.string(), z.string()),
  robotsMeta: z.string().nullable(),
  // Why no final non-redirect response was received: network/timeout, robots-disallowed,
  // redirect-loop, too-many-redirects, redirect-off-site, redirect-to-query, invalid-redirect.
  error: z.string().nullable(),
});
export type UrlRecord = z.infer<typeof urlRecordSchema>;

export const sitemapFileSchema = z.strictObject({
  url: z.string(),
  name: z.string(),
  status: z.number().int().nullable(),
  kind: z.enum(['index', 'urlset', 'skipped']),
  // <sitemap> or <url> entries in the file, as listed.
  entries: count,
  note: z.string().nullable(),
});
export type SitemapFile = z.infer<typeof sitemapFileSchema>;

export const hostSummarySchema = z.strictObject({
  host: z.string(),
  origin: z.string(),
  rootLang: z.string().nullable(),
  sitemaps: z.array(sitemapFileSchema),
});
export type HostSummary = z.infer<typeof hostSummarySchema>;

export const robotsSummarySchema = z.strictObject({
  url: z.string(),
  status: z.number().int().nullable(),
  // The rules in force for the crawl: the `User-agent: *` groups, or DISALLOW_ALL/NO_RULES.
  sitemaps: z.array(z.string()),
  allow: z.array(z.string()),
  disallow: z.array(z.string()),
  crawlDelay: z.number().nonnegative().nullable(),
  error: z.string().nullable(),
});
export type RobotsSummary = z.infer<typeof robotsSummarySchema>;

export const sitemapCountsSchema = z.strictObject({
  // URLs taken from each sitemap file; equals the urls with source `sitemap:<name>`.
  sitemapEntries: z.record(z.string(), count),
  // Entries whose URL an earlier sitemap file of the host already listed.
  duplicateSitemapEntries: count,
  skippedSitemapEntries: z.strictObject({ query: count, offHost: count, invalid: count }),
});
export type SitemapCounts = z.infer<typeof sitemapCountsSchema>;

export const linkCountsSchema = z.strictObject({
  // Sitemap pages (200, HTML) whose links were read.
  scannedPages: count,
  // Same-host page links, counted once per page that has them.
  pageLinks: count,
  // Distinct page links not in any sitemap, each fetched once with source "link".
  linkOnlyUrls: count,
  skippedAsset: count,
  skippedQuery: count,
  skippedExternal: count,
  skippedOther: count,
  skippedRobots: count,
});
export type LinkCounts = z.infer<typeof linkCountsSchema>;

const hostCountsSchema = sitemapCountsSchema.extend({ urls: count, links: linkCountsSchema });

const countsSchema = z.strictObject({
  urls: count,
  byHost: z.record(z.string(), hostCountsSchema),
});

// The index of the first url that is not strictly greater than the one before it, or -1.
function firstUnsorted(urls: readonly { readonly url: string }[]): number {
  return urls.findIndex((record, index) => index > 0 && (urls[index - 1]?.url ?? '') >= record.url);
}

// The index of the first url whose urlKey an earlier url already has (%ce vs %CE), or -1.
function firstSameKey(urls: readonly { readonly url: string }[]): number {
  const keys = new Set<string>();
  return urls.findIndex(({ url }) => {
    const key = urlKey(url);
    const isRepeat = keys.has(key);
    keys.add(key);
    return isRepeat;
  });
}

export const crawlOutputSchema = z
  .strictObject({
    crawledAt: z.iso.datetime(),
    tool: z.strictObject({ name: z.string(), version: z.string() }),
    hosts: z.array(hostSummarySchema),
    robots: z.record(z.string(), robotsSummarySchema),
    counts: countsSchema,
    urls: z.array(urlRecordSchema),
  })
  .superRefine((output, context) => {
    const index = firstUnsorted(output.urls);
    if (index !== -1) {
      context.addIssue({
        code: 'custom',
        path: ['urls', index, 'url'],
        message: 'urls must be sorted by url, without duplicates',
      });
    }
    const repeat = firstSameKey(output.urls);
    if (repeat !== -1) {
      context.addIssue({
        code: 'custom',
        path: ['urls', repeat, 'url'],
        message: 'urls must not repeat a URL with other percent-escape case',
      });
    }
    if (output.counts.urls !== output.urls.length) {
      context.addIssue({
        code: 'custom',
        path: ['counts', 'urls'],
        message: 'counts.urls must equal the number of urls',
      });
    }
  });
export type CrawlOutput = z.infer<typeof crawlOutputSchema>;

// UTF-16 code-unit order (what `<` does): the same on every machine, unlike localeCompare.
export function byCodeUnit(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

// One record per URL by urlKey (the first one wins, so a sitemap's spelling beats a link's),
// sorted by code unit so the order never depends on a locale and diffs stay stable.
export function sortAndDedupe(records: Iterable<UrlRecord>): UrlRecord[] {
  const byKey = new Map<string, UrlRecord>();
  for (const record of records) {
    const key = urlKey(record.url);
    if (!byKey.has(key)) {
      byKey.set(key, record);
    }
  }
  return byKey
    .values()
    .toArray()
    .toSorted((a, b) => byCodeUnit(a.url, b.url));
}

export interface OutputInput {
  readonly crawledAt: string;
  readonly tool: { readonly name: string; readonly version: string };
  readonly hosts: HostSummary[];
  readonly robots: Record<string, RobotsSummary>;
  readonly sitemapCounts: Record<string, SitemapCounts>;
  readonly links: Record<string, LinkCounts>;
  readonly records: Iterable<UrlRecord>;
}

export function buildOutput(input: OutputInput): CrawlOutput {
  const urls = sortAndDedupe(input.records);
  const byHost: CrawlOutput['counts']['byHost'] = {};
  for (const { host } of input.hosts) {
    const sitemapCounts = input.sitemapCounts[host];
    const links = input.links[host];
    if (sitemapCounts === undefined || links === undefined) {
      throw new Error(`no counts for host ${host}`);
    }
    byHost[host] = {
      urls: urls.filter((record) => record.host === host).length,
      ...sitemapCounts,
      links,
    };
  }
  return crawlOutputSchema.parse({
    crawledAt: input.crawledAt,
    tool: { name: input.tool.name, version: input.tool.version },
    hosts: input.hosts,
    robots: input.robots,
    counts: { urls: urls.length, byHost },
    urls,
  });
}

// Written to a side file in `tempDir` first and renamed into place, so a reader never sees half a
// file. `tempDir` must be on the same volume (the crawl passes its gitignored cache folder), so
// the rename stays atomic and a killed run leaves no stray file next to crawl.json.
export async function writeJsonAtomic(
  filePath: string,
  value: unknown,
  tempDir: string,
): Promise<void> {
  const partial = path.join(tempDir, `${path.basename(filePath)}.partial`);
  await writeFile(partial, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(partial, filePath);
}
