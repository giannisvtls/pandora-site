// The seed phase, per host: robots.txt, then every sitemap file reachable from its `Sitemap:`
// lines and the two WordPress defaults, sitemap indexes expanded recursively. Each sitemap URL
// keeps the name of the file that listed it and its <lastmod>.
import type { QueueEntry } from './cache';
import { hostOf, MAX_SITEMAP_FILES, SITEMAP_SEED_PATHS, type HostConfig } from './config';
import { fetchFollowing, type FetchTrace, type FollowOptions, type Http } from './fetcher';
import type { RobotsSummary, SitemapCounts, SitemapFile } from './output';
import { DISALLOW_ALL, NO_RULES, parseRobots, type RobotsRules } from './robots';
import { parseSitemap, sitemapName, type ParsedSitemap, type SitemapEntry } from './sitemaps';

export interface SeedContext {
  readonly http: Http;
  readonly maxRedirects: number;
  readonly refuse: FollowOptions['refuse'];
}

const isSuccess = (status: number) => status >= 200 && status < 300;

// 2xx: its `User-agent: *` rules. 4xx: no rules. 5xx, network errors and broken redirects:
// disallow everything (RFC 9309: an unreachable robots.txt means "do not crawl").
function robotsRulesOf({ status, body, error }: FetchTrace): RobotsRules {
  if (status === null || error !== null) {
    return DISALLOW_ALL;
  }
  if (body !== undefined && isSuccess(status)) {
    return parseRobots(body);
  }
  return status >= 400 && status < 500 ? NO_RULES : DISALLOW_ALL;
}

export async function fetchRobots(
  host: HostConfig,
  context: SeedContext,
): Promise<{ rules: RobotsRules; summary: RobotsSummary }> {
  const url = `${host.origin}/robots.txt`;
  const trace = await fetchFollowing(url, context.http, {
    maxRedirects: context.maxRedirects,
    shouldReadBody: isSuccess,
    refuse: context.refuse,
  });
  const rules = robotsRulesOf(trace);
  return { rules, summary: { url, status: trace.status, ...rules, error: trace.error } };
}

interface Discovery {
  readonly files: SitemapFile[];
  readonly entries: QueueEntry[];
  readonly counts: SitemapCounts;
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
// an index, which the caller visits next.
class SitemapWalk {
  private readonly perFile = new Map<string, number>();
  private readonly listed = new Set<string>();
  private readonly seen = new Set<string>();
  private readonly skipped: Record<EntrySkip, number> = { query: 0, offHost: 0, invalid: 0 };
  private duplicates = 0;
  private fetched = 0;
  private readonly files: SitemapFile[] = [];
  private readonly entries: QueueEntry[] = [];

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

  private addUrl(entry: SitemapEntry, name: string): void {
    const url = URL.parse(entry.loc);
    const skip = entrySkip(url, this.host);
    if (url === null || skip !== null) {
      this.skipped[skip ?? 'invalid'] += 1;
      return;
    }
    url.hash = '';
    if (this.listed.has(url.href)) {
      this.duplicates += 1;
      return;
    }
    this.listed.add(url.href);
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
    if (this.seen.has(url.href)) {
      return [];
    }
    if (this.fetched >= MAX_SITEMAP_FILES) {
      this.skip(url.href, null, `over the limit of ${String(MAX_SITEMAP_FILES)} sitemap files`);
      return [];
    }
    this.seen.add(url.href);
    this.fetched += 1;
    const trace = await fetchFollowing(url.href, this.context.http, {
      maxRedirects: this.context.maxRedirects,
      shouldReadBody: (status) => status === 200,
      // A redirect to a sitemap already read (wp-sitemap.xml -> sitemap_index.xml) stops there.
      refuse: (target) => (this.seen.has(target.href) ? ALREADY_READ : this.context.refuse(target)),
    });
    const problem = this.problemOf(trace);
    if (problem !== null || trace.body === undefined) {
      this.skip(url.href, trace.status, problem ?? 'no body');
      return [];
    }
    this.seen.add(trace.finalUrl);
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
