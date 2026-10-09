// The crawl, end to end: seed (robots + sitemaps, cached), every sitemap URL, then the one-hop
// link URLs. Finished URLs are appended to the resume cache as they finish; crawl.json is written
// only when every URL is done, so an interrupted run never leaves a partial crawl.json behind.
import {
  appendJsonLine,
  cachePaths,
  loadPages,
  loadState,
  prepareCache,
  saveState,
  sealTornLine,
  type CacheLine,
  type CachePaths,
  type QueueEntry,
  type SeedState,
} from './cache';
import { hostOf, TOOL, type HostConfig, type Politeness } from './config';
import { createHttp, type FetchLike, type Http, type Sleep } from './fetcher';
import { buildOutput, writeJsonAtomic } from './output';
import { crawlEntry, isTransient, linkCounts, linkHopQueue, type PageContext } from './page';
import { robotsMatcher, type RobotsRules } from './robots';
import { discoverSitemaps, fetchRobots, type SeedContext } from './seed';

export interface CrawlOptions {
  readonly hosts: readonly HostConfig[];
  // redirects/: crawl.json goes here, the cache into .crawl-cache/ below it.
  readonly outDir: string;
  readonly fetch: FetchLike;
  readonly sleep: Sleep;
  readonly now: () => number;
  readonly politeness: Politeness;
  readonly userAgent: string;
  readonly fresh: boolean;
  readonly maxMinutes: number | null;
  readonly maxRequests: number | null;
  readonly print: (line: string) => void;
  readonly progressEvery: number;
}

export type StopReason = 'max-minutes' | 'max-requests' | 'failures';

export type CrawlResult =
  | { readonly complete: true; readonly outputPath: string; readonly urls: number }
  | { readonly complete: false; readonly reason: StopReason; readonly remaining: number };

interface RunContext {
  readonly options: CrawlOptions;
  readonly paths: CachePaths;
  readonly http: Http;
  readonly page: PageContext;
  readonly done: Map<string, CacheLine>;
  readonly startedAt: number;
  stop: StopReason | null;
  failureStreak: number;
  finishedThisRun: number;
  // URLs this run knows it must finish: the sitemap URLs, then also the one-hop URLs.
  readonly known: Set<string>;
}

function refusal(
  url: URL,
  allowedHosts: ReadonlySet<string>,
  isRobotsAllowed: (url: URL) => boolean,
) {
  const isWeb = url.protocol === 'http:' || url.protocol === 'https:';
  if (!isWeb || !allowedHosts.has(url.host)) {
    return 'redirect-off-site';
  }
  if (url.search !== '') {
    return 'redirect-to-query';
  }
  return url.pathname === '/robots.txt' || isRobotsAllowed(url) ? null : 'robots-disallowed';
}

// The fixed pause is 250 ms; a robots.txt that asks for more stops the crawl before any page
// request, so a person decides (the spec has no rule for it).
function assertCrawlDelay(host: string, rules: RobotsRules, politeness: Politeness): void {
  if (rules.crawlDelay !== null && rules.crawlDelay * 1000 > politeness.gapMs) {
    throw new Error(
      `robots.txt of ${host} asks for Crawl-delay ${String(rules.crawlDelay)} s, more than this crawl's ${String(politeness.gapMs)} ms pause; not crawling without a decision`,
    );
  }
}

async function seed(
  options: CrawlOptions,
  context: SeedContext,
  register: (host: string, rules: RobotsRules) => void,
): Promise<SeedState> {
  const state: SeedState = {
    version: 1,
    startedAt: new Date(options.now()).toISOString(),
    hosts: [],
    robots: {},
    sitemapCounts: {},
    entries: [],
  };
  for (const host of options.hosts) {
    const name = hostOf(host.origin);
    const { rules, summary } = await fetchRobots(host, context);
    assertCrawlDelay(name, rules, options.politeness);
    register(name, rules);
    state.robots[name] = summary;
    const discovery = await discoverSitemaps(host, rules, context);
    state.hosts.push({
      host: name,
      origin: host.origin,
      rootLang: host.rootLang,
      sitemaps: discovery.files,
    });
    state.sitemapCounts[name] = discovery.counts;
    state.entries.push(...discovery.entries);
    options.print(
      `seed ${name}: robots.txt ${String(summary.status)}, ${String(discovery.files.length)} sitemap files, ${String(discovery.entries.length)} URLs`,
    );
  }
  return state;
}

function hasSameHosts(state: SeedState, hosts: readonly HostConfig[]): boolean {
  return (
    state.hosts.length === hosts.length &&
    state.hosts.every((host, index) => host.origin === hosts[index]?.origin)
  );
}

function elapsed(context: RunContext): string {
  const seconds = Math.round((context.options.now() - context.startedAt) / 1000);
  return `${String(Math.floor(seconds / 60))}m${String(seconds % 60).padStart(2, '0')}s`;
}

// Known URLs a later run would still fetch: not done, or done with a result kept out of the cache.
function remainingCount(context: RunContext): number {
  let remaining = 0;
  for (const url of context.known) {
    const line = context.done.get(url);
    if (line === undefined || isTransient(line.record)) {
      remaining += 1;
    }
  }
  return remaining;
}

function printProgress(context: RunContext, label: string): void {
  const total = context.known.size;
  const remaining = remainingCount(context);
  context.options.print(
    `${label}: done ${String(total - remaining)} of ${String(total)} known URLs, ${String(remaining)} remaining | this run: ${String(context.finishedThisRun)} URLs, ${String(context.http.requestCount())} requests, ${elapsed(context)}`,
  );
}

function budgetStop(context: RunContext): StopReason | null {
  const { maxMinutes, maxRequests, now } = context.options;
  if (maxMinutes !== null && now() - context.startedAt >= maxMinutes * 60_000) {
    return 'max-minutes';
  }
  const isOverRequests = maxRequests !== null && context.http.requestCount() >= maxRequests;
  return isOverRequests ? 'max-requests' : null;
}

function recordLine(context: RunContext, line: CacheLine, label: string): void {
  context.done.set(line.record.url, line);
  const isRetryLater = isTransient(line.record);
  if (!isRetryLater) {
    appendJsonLine(context.paths.pages, line);
  }
  context.failureStreak = isRetryLater ? context.failureStreak + 1 : 0;
  if (context.failureStreak >= context.options.politeness.maxConsecutiveFailures) {
    context.stop ??= 'failures';
  }
  context.finishedThisRun += 1;
  if (context.finishedThisRun % context.options.progressEvery === 0) {
    printProgress(context, label);
  }
}

// `concurrency` workers take URLs in order until the queue is empty or a stop condition holds.
// A URL already started always finishes; budgets only stop new ones.
async function processQueue(
  context: RunContext,
  queue: readonly QueueEntry[],
  label: string,
): Promise<StopReason | null> {
  let next = 0;
  const worker = async (): Promise<void> => {
    while (context.stop === null) {
      const entry = queue[next];
      if (entry === undefined) {
        return;
      }
      const stop = budgetStop(context);
      if (stop !== null) {
        context.stop = stop;
        return;
      }
      next += 1;
      recordLine(context, await crawlEntry(entry, context.page), label);
    }
  };
  await Promise.all(Array.from({ length: context.options.politeness.concurrency }, worker));
  printProgress(context, label);
  return context.stop;
}

async function finish(
  context: RunContext,
  state: SeedState,
  hopQueue: readonly QueueEntry[],
): Promise<CrawlResult> {
  const records = [...state.entries, ...hopQueue].map((entry) => {
    const line = context.done.get(entry.url);
    if (line === undefined) {
      throw new Error(`crawler bug: ${entry.url} is not done`);
    }
    return line.record;
  });
  const output = buildOutput({
    crawledAt: new Date(context.options.now()).toISOString(),
    tool: TOOL,
    hosts: state.hosts,
    robots: state.robots,
    sitemapCounts: state.sitemapCounts,
    links: linkCounts(state, context.done, hopQueue),
    records,
  });
  await writeJsonAtomic(context.paths.output, output);
  return { complete: true, outputPath: context.paths.output, urls: output.urls.length };
}

// The seed state from the cache, or a fresh seed phase (which also clears any stale cache files).
async function openState(
  options: CrawlOptions,
  paths: CachePaths,
  seedContext: SeedContext,
  register: (host: string, rules: RobotsRules) => void,
): Promise<SeedState> {
  const cached = await loadState(paths);
  if (cached === null) {
    await prepareCache(paths, true);
    const state = await seed(options, seedContext, register);
    await saveState(paths, state);
    return state;
  }
  if (!hasSameHosts(cached, options.hosts)) {
    throw new Error(`${paths.state} was made for other hosts; rerun with --fresh`);
  }
  options.print(`resuming from ${paths.dir}`);
  for (const [host, summary] of Object.entries(cached.robots)) {
    register(host, summary);
  }
  return cached;
}

function stopped(context: RunContext, reason: StopReason): CrawlResult {
  return { complete: false, reason, remaining: remainingCount(context) };
}

async function crawlPhases(context: RunContext, state: SeedState): Promise<CrawlResult> {
  const sitemapQueue = state.entries.filter((entry) => !context.done.has(entry.url));
  const sitemapStop = await processQueue(context, sitemapQueue, 'sitemap URLs');
  if (sitemapStop !== null) {
    return stopped(context, sitemapStop);
  }
  const hopQueue = linkHopQueue(state, context.done);
  for (const entry of hopQueue) {
    context.known.add(entry.url);
  }
  const pending = hopQueue.filter((entry) => !context.done.has(entry.url));
  const hopStop = await processQueue(context, pending, 'link-hop URLs');
  return hopStop === null ? finish(context, state, hopQueue) : stopped(context, hopStop);
}

export async function runCrawl(options: CrawlOptions): Promise<CrawlResult> {
  const startedAt = options.now();
  const paths = cachePaths(options.outDir);
  await prepareCache(paths, options.fresh);
  const matchers = new Map<string, (path: string) => boolean>();
  const register = (host: string, rules: RobotsRules) => {
    matchers.set(host, robotsMatcher(rules));
  };
  // A host whose robots.txt has not been read yet allows nothing but /robots.txt.
  const isRobotsAllowed = (url: URL) =>
    matchers.get(url.host)?.(`${url.pathname}${url.search}`) ?? false;
  const allowedHosts = new Set(options.hosts.map((host) => hostOf(host.origin)));
  const http = createHttp({
    fetch: options.fetch,
    userAgent: options.userAgent,
    politeness: options.politeness,
    sleep: options.sleep,
    now: options.now,
    allowedHosts,
    isRobotsAllowed,
    log: (entry) => {
      appendJsonLine(paths.requests, entry);
    },
  });
  const follow = {
    maxRedirects: options.politeness.maxRedirects,
    refuse: (url: URL) => refusal(url, allowedHosts, isRobotsAllowed),
  };
  await sealTornLine(paths.pages);
  await sealTornLine(paths.requests);
  const state = await openState(options, paths, { http, ...follow }, register);
  const { lines, unreadable } = await loadPages(paths);
  if (unreadable > 0) {
    options.print(
      `ignored ${String(unreadable)} unreadable cache line(s); those URLs are fetched again`,
    );
  }
  const sitemapUrls = new Set(state.entries.map((entry) => entry.url));
  const rootLangs = new Map(options.hosts.map((host) => [hostOf(host.origin), host.rootLang]));
  return crawlPhases(
    {
      options,
      paths,
      http,
      page: {
        http,
        follow,
        isRobotsAllowed,
        rootLang: (host) => rootLangs.get(host) ?? null,
        isSitemapUrl: (url) => sitemapUrls.has(url),
      },
      done: lines,
      startedAt,
      stop: null,
      failureStreak: 0,
      finishedThisRun: 0,
      known: new Set(sitemapUrls),
    },
    state,
  );
}
