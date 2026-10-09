// The requests of the seed phase: a host's robots.txt, and every sitemap file reachable from its
// `Sitemap:` lines and the two WordPress defaults, sitemap indexes expanded recursively. Each
// sitemap URL keeps the name of the file that listed it and its <lastmod>. seeding.ts runs them in
// order and decides when a seed is complete.
import type { QueueEntry } from './cache';
import { hostOf, MAX_SITEMAP_FILES, SITEMAP_SEED_PATHS, type HostConfig } from './config';
import {
  fetchFollowing,
  isTransientOutcome,
  type FetchTrace,
  type FollowOptions,
  type Http,
} from './fetcher';
import { urlKey, type RobotsSummary, type SitemapCounts, type SitemapFile } from './output';
import { DISALLOW_ALL, NO_RULES, parseRobots, type RobotsRules } from './robots';
import { parseSitemap, sitemapName, type ParsedSitemap, type SitemapEntry } from './sitemaps';

export interface SeedContext {
  readonly http: Http;
  readonly maxRedirects: number;
  readonly refuse: FollowOptions['refuse'];
}

// A seed request that failed in a way worth another seed attempt.
export interface TransientSeedRequest {
  readonly url: string;
  readonly status: number | null;
  readonly error: string | null;
}

const isSuccess = (status: number) => status >= 200 && status < 300;

type RobotsTrace = Pick<FetchTrace, 'status' | 'body' | 'error'>;

// RFC 9309 "unreachable": 429, 5xx, a network error, or a redirect the crawl refused or could not
// finish (to another site, say). Any 4xx but 429 is "unavailable" instead: no rules.
export function isRobotsUnreachable({ status, body, error }: RobotsTrace): boolean {
  if (status === null || error !== null) {
    return true;
  }
  const isRead = body !== undefined && isSuccess(status);
  const isUnavailable = status >= 400 && status < 500 && status !== 429;
  return !isRead && !isUnavailable;
}

// 2xx: its `User-agent: *` rules. Unreachable: disallow everything. Unavailable: no rules.
export function robotsRulesOf(trace: RobotsTrace): RobotsRules {
  if (isRobotsUnreachable(trace)) {
    return DISALLOW_ALL;
  }
  const { status, body } = trace;
  return body !== undefined && status !== null && isSuccess(status) ? parseRobots(body) : NO_RULES;
}

// Network error, timeout, 429 or 5xx; for a sitemap file also 403, as for pages. A robots.txt 403
// is RFC 9309's "unavailable" (no rules), a final answer.
export function isTransientSeed(trace: FetchTrace, kind: 'robots' | 'sitemap'): boolean {
  const isTransient = isTransientOutcome(trace.status, trace.error);
  return isTransient && !(kind === 'robots' && trace.status === 403);
}

export async function fetchRobots(
  host: HostConfig,
  context: SeedContext,
): Promise<{ rules: RobotsRules; summary: RobotsSummary; trace: FetchTrace }> {
  const url = `${host.origin}/robots.txt`;
  const trace = await fetchFollowing(url, context.http, {
    maxRedirects: context.maxRedirects,
    shouldReadBody: isSuccess,
    refuse: context.refuse,
  });
  const rules = robotsRulesOf(trace);
  return { rules, summary: { url, status: trace.status, ...rules, error: trace.error }, trace };
}

export interface Discovery {
  readonly files: SitemapFile[];
  readonly entries: QueueEntry[];
  readonly counts: SitemapCounts;
  readonly transient: TransientSeedRequest[];
}

type EntrySkip = 'invalid' | 'offHost' | 'query';

function entrySkip(url: URL | null, host: string): EntrySkip | null {
  if (url === null || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
    return 'invalid';
  }
  if (url.host !== host) {
    return 'offHost';
  }
  return url.search === '' ? null : 'query';
}

// Why a sitemap file URL is not fetched, or null.
function fileSkip(url: URL | null, host: string): string | null {
  const skip = entrySkip(url, host);
  const notes: Record<EntrySkip, string> = {
    invalid: 'invalid URL',
    offHost: 'another host',
    query: 'query string',
  };
  return skip === null ? null : notes[skip];
}

const ALREADY_READ = 'already-read';

function safeName(url: string): string {
  return URL.canParse(url) ? sitemapName(url) : url;
}

// Walks the sitemap files of one host; `visit` reads one file and returns the child sitemaps of
// an index, which the caller visits next. URLs are compared by urlKey.
class SitemapWalk {
  private readonly perFile = new Map<string, number>();
  private readonly listed = new Set<string>();
  private readonly seen = new Set<string>();
  private readonly skipped: Record<EntrySkip, number> = { query: 0, offHost: 0, invalid: 0 };
  private duplicates = 0;
  private fetched = 0;
  private readonly files: SitemapFile[] = [];
  private readonly entries: QueueEntry[] = [];
  private readonly transient: TransientSeedRequest[] = [];

  constructor(
    private readonly host: string,
    private readonly context: SeedContext,
  ) {}

  private skip(url: string, status: number | null, note: string): void {
    this.files.push({ url, name: safeName(url), status, kind: 'skipped', entries: 0, note });
  }

  private problemOf(trace: FetchTrace): string | null {
    if (trace.error === ALREADY_READ) {
      return `redirects to ${trace.redirectChain.at(-1)?.location ?? '?'}, already read`;
    }
    return trace.status === 200 ? null : (trace.error ?? `HTTP ${String(trace.status)}`);
  }

  private record(href: string, trace: FetchTrace, parsed: ParsedSitemap): string[] {
    if (parsed.kind === 'unknown') {
      this.skip(href, trace.status, 'not a sitemap');
      return [];
    }
    const name = sitemapName(trace.finalUrl);
    this.files.push({
      url: href,
      name,
      status: trace.status,
      kind: parsed.kind,
      entries: parsed.entries.length,
      note: trace.finalUrl === href ? null : `redirected to ${trace.finalUrl}`,
    });
    if (parsed.kind === 'index') {
      return parsed.entries.map((entry) => entry.loc);
    }
    for (const entry of parsed.entries) {
      this.addUrl(entry, name);
    }
    return [];
  }

  // The first spelling of a URL is kept; a later one that differs only in escape case is a
  // duplicate.
  private addUrl(entry: SitemapEntry, name: string): void {
    const url = URL.parse(entry.loc);
    const skip = entrySkip(url, this.host);
    if (url === null || skip !== null) {
      this.skipped[skip ?? 'invalid'] += 1;
      return;
    }
    url.hash = '';
    const key = urlKey(url.href);
    if (this.listed.has(key)) {
      this.duplicates += 1;
      return;
    }
    this.listed.add(key);
    this.entries.push({ url: url.href, host: this.host, sitemap: name, lastmod: entry.lastmod });
    this.perFile.set(name, (this.perFile.get(name) ?? 0) + 1);
  }

  // Reads one sitemap file; returns the child sitemaps of an index for the caller to visit.
  async visit(raw: string): Promise<string[]> {
    const url = URL.parse(raw);
    const skip = fileSkip(url, this.host);
    if (url === null || skip !== null) {
      this.skip(raw, null, skip ?? 'invalid URL');
      return [];
    }
    if (this.seen.has(urlKey(url.href))) {
      return [];
    }
    if (this.fetched >= MAX_SITEMAP_FILES) {
      this.skip(url.href, null, `over the limit of ${String(MAX_SITEMAP_FILES)} sitemap files`);
      return [];
    }
    this.seen.add(urlKey(url.href));
    this.fetched += 1;
    const trace = await fetchFollowing(url.href, this.context.http, {
      maxRedirects: this.context.maxRedirects,
      shouldReadBody: (status) => status === 200,
      // A redirect to a sitemap already read (wp-sitemap.xml -> sitemap_index.xml) stops there.
      refuse: (target) =>
        this.seen.has(urlKey(target.href)) ? ALREADY_READ : this.context.refuse(target),
    });
    const problem = this.problemOf(trace);
    if (problem !== null || trace.body === undefined) {
      this.skip(url.href, trace.status, problem ?? 'no body');
      if (isTransientSeed(trace, 'sitemap')) {
        this.transient.push({ url: url.href, status: trace.status, error: trace.error });
      }
      return [];
    }
    this.seen.add(urlKey(trace.finalUrl));
    return this.record(url.href, trace, parseSitemap(trace.body));
  }

  result(): Discovery {
    return {
      files: this.files,
      entries: this.entries,
      counts: {
        sitemapEntries: Object.fromEntries(this.perFile),
        duplicateSitemapEntries: this.duplicates,
        skippedSitemapEntries: { ...this.skipped },
      },
      transient: this.transient,
    };
  }
}

export async function discoverSitemaps(
  host: HostConfig,
  robots: RobotsRules,
  context: SeedContext,
): Promise<Discovery> {
  const walk = new SitemapWalk(hostOf(host.origin), context);
  const queue = [...robots.sitemaps, ...SITEMAP_SEED_PATHS.map((path) => `${host.origin}${path}`)];
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    queue.push(...(await walk.visit(next)));
  }
  return walk.result();
}
