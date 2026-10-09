// One URL of the crawl: fetch it (redirects followed by hand), read its head, and for a sitemap
// page scan its links for the one-hop queue.
import type { CacheLine, LinkScan, QueueEntry, SeedState } from './cache';
import { classifyPageType, inferLang, inferPathLang } from './classify';
import { extractHead, extractHrefs } from './extract';
import { fetchFollowing, type FollowOptions, type Http, type ShouldReadBody } from './fetcher';
import { classifyLink, type SkipReason } from './links';
import { byCodeUnit, type LinkCounts, type UrlRecord } from './output';

export interface PageContext {
  readonly http: Http;
  readonly follow: Omit<FollowOptions, 'shouldReadBody'>;
  readonly rootLang: (host: string) => string | null;
  readonly isRobotsAllowed: (url: URL) => boolean;
  readonly isSitemapUrl: (url: string) => boolean;
}

const HTML_TYPE = /^\s*(?:text\/html|application\/xhtml\+xml)\s*(?:;|$)/i;

// Only a 200 HTML body is read; anything else is cancelled unread.
export const shouldReadHtml: ShouldReadBody = (status, contentType) =>
  status === 200 && contentType !== null && HTML_TYPE.test(contentType);

const SKIP_FIELDS: Record<
  SkipReason,
  'skippedAsset' | 'skippedQuery' | 'skippedExternal' | 'skippedOther'
> = {
  asset: 'skippedAsset',
  query: 'skippedQuery',
  external: 'skippedExternal',
  other: 'skippedOther',
};

// Every link is counted once per page: by its normalized URL for a page link, by its resolved
// URL for a skipped one. Only page links outside every sitemap become candidates.
export function scanLinks(html: string, pageUrl: string, context: PageContext): LinkScan {
  const scan: LinkScan = {
    candidates: [],
    pageLinks: 0,
    skippedAsset: 0,
    skippedQuery: 0,
    skippedExternal: 0,
    skippedOther: 0,
    skippedRobots: 0,
  };
  const seen = new Set<string>();
  for (const href of extractHrefs(html)) {
    const verdict = classifyLink(href, pageUrl);
    const key =
      verdict.kind === 'page'
        ? verdict.url
        : `${verdict.reason} ${URL.parse(href.trim(), pageUrl)?.href ?? href}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (verdict.kind === 'skip') {
      scan[SKIP_FIELDS[verdict.reason]] += 1;
    } else if (context.isRobotsAllowed(new URL(verdict.url))) {
      scan.pageLinks += 1;
      if (!context.isSitemapUrl(verdict.url)) {
        scan.candidates.push(verdict.url);
      }
    } else {
      scan.skippedRobots += 1;
    }
  }
  return scan;
}

export async function crawlEntry(entry: QueueEntry, context: PageContext): Promise<CacheLine> {
  const trace = await fetchFollowing(entry.url, context.http, {
    ...context.follow,
    shouldReadBody: shouldReadHtml,
  });
  const head = trace.body === undefined ? null : extractHead(trace.body, trace.finalUrl);
  const htmlLang = head?.htmlLang ?? null;
  const pathLang = inferPathLang(entry.url, context.rootLang(entry.host));
  const record: UrlRecord = {
    url: entry.url,
    host: entry.host,
    source: entry.sitemap === null ? 'link' : `sitemap:${entry.sitemap}`,
    lastmod: entry.lastmod,
    status: trace.status,
    redirectChain: trace.redirectChain,
    finalUrl: trace.finalUrl,
    contentType: trace.contentType,
    htmlLang,
    pathLang,
    lang: inferLang(htmlLang, pathLang),
    pageType: classifyPageType(entry.url, entry.sitemap),
    title: head?.title ?? null,
    canonical: head?.canonical ?? null,
    hreflang: head?.hreflang ?? {},
    robotsMeta: head?.robotsMeta ?? null,
    error: trace.error,
  };
  const links =
    entry.sitemap !== null && trace.body !== undefined
      ? scanLinks(trace.body, trace.finalUrl, context)
      : null;
  return { record, links };
}

// A result worth another try on the next run: a network error or timeout, 403, 429 or 5xx.
// These are kept out of the resume cache, and a long streak of them stops the run.
export function isTransient(record: UrlRecord): boolean {
  const { status, error } = record;
  return status === null
    ? error === 'timeout' || (error?.startsWith('network:') ?? false)
    : status >= 500 || status === 429 || status === 403;
}

// The one-hop queue: page links found on sitemap pages that no sitemap lists, each once, sorted
// by code unit (the default string sort).
export function linkHopQueue(state: SeedState, done: ReadonlyMap<string, CacheLine>): QueueEntry[] {
  const sitemapUrls = new Set(state.entries.map((entry) => entry.url));
  const candidates = new Set<string>();
  for (const entry of state.entries) {
    const found = done.get(entry.url)?.links?.candidates ?? [];
    for (const url of found) {
      if (!sitemapUrls.has(url)) {
        candidates.add(url);
      }
    }
  }
  return candidates
    .values()
    .toArray()
    .toSorted(byCodeUnit)
    .map((url) => ({ url, host: new URL(url).host, sitemap: null, lastmod: null }));
}

export function linkCounts(
  state: SeedState,
  done: ReadonlyMap<string, CacheLine>,
  hopQueue: readonly QueueEntry[],
): Record<string, LinkCounts> {
  const counts = new Map<string, LinkCounts>(
    state.hosts.map(({ host }) => [
      host,
      {
        scannedPages: 0,
        pageLinks: 0,
        linkOnlyUrls: 0,
        skippedAsset: 0,
        skippedQuery: 0,
        skippedExternal: 0,
        skippedOther: 0,
        skippedRobots: 0,
      },
    ]),
  );
  for (const entry of state.entries) {
    const scan = done.get(entry.url)?.links;
    const total = counts.get(entry.host);
    if (scan === null || scan === undefined || total === undefined) {
      continue;
    }
    total.scannedPages += 1;
    total.pageLinks += scan.pageLinks;
    total.skippedAsset += scan.skippedAsset;
    total.skippedQuery += scan.skippedQuery;
    total.skippedExternal += scan.skippedExternal;
    total.skippedOther += scan.skippedOther;
    total.skippedRobots += scan.skippedRobots;
  }
  for (const entry of hopQueue) {
    const total = counts.get(entry.host);
    if (total !== undefined) {
      total.linkOnlyUrls += 1;
    }
  }
  return Object.fromEntries(counts);
}
