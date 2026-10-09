// The crawl, end to end: the seed (seeding.ts), then every sitemap URL and the one-hop link URLs.
// Each run tries the URLs it never tried before the ones that failed in an earlier run. Results
// are appended to the resume cache as they finish; crawl.json is written only by a run that ends
// with a final result for every URL, so an interrupted run never leaves a partial crawl.json.
// runCrawl has no defaults: the caller passes hosts, fetch, clock and output folder (cli.ts).
import {
  appendJsonLine,
  cachePaths,
  clearPages,
  loadPages,
  loadState,
  nextRequestSeq,
  prepareCache,
  sealTornLine,
  type CachePaths,
  type QueueEntry,
  type SeedState,
} from './cache';
import { hostOf, TOOL, type HostConfig, type Politeness } from './config';
import { createHttp, type FetchLike, type Http, type Sleep } from './fetcher';
import { buildOutput, urlKey, writeJsonAtomic } from './output';
import { linkCounts, linkHopQueue, type PageContext } from './page';
import {
  printProgress,
  processQueue,
  remainingCount,
  startDeadline,
  type Deadline,
  type RunContext,
  type StopReason,
} from './queue';
import { robotsMatcher, type RobotsRules } from './robots';
import { runSeed, type SeedRun } from './seeding';

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

// `retry`: every URL was tried, but some failed transiently and have runs left.
// `seed-incomplete`: a robots.txt or sitemap request failed transiently; the next run seeds again.
export type CrawlStop = StopReason | 'retry' | 'seed-incomplete';

export type CrawlResult =
  | {
      readonly complete: true;
      readonly outputPath: string;
      readonly urls: number;
      readonly warnings: readonly string[];
    }
  // `remaining` is null when the run stopped before the seed was complete.
  | { readonly complete: false; readonly reason: CrawlStop; readonly remaining: number | null };

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

function hasSameHosts(state: SeedState, hosts: readonly HostConfig[]): boolean {
  return (
    state.hosts.length === hosts.length &&
    state.hosts.every((host, index) => host.origin === hosts[index]?.origin)
  );
}

// The HTTP client of one run: robots rules registered per host, requests logged to
// requests.jsonl, the deadline's signal on every request.
function runHttp(
  options: CrawlOptions,
  paths: CachePaths,
  deadline: Deadline,
  firstSeq: number,
): { http: Http; seedRun: SeedRun; isRobotsAllowed: (url: URL) => boolean } {
  const matchers = new Map<string, (path: string) => boolean>();
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
    signal: deadline.signal,
    firstSeq,
    log: (entry) => {
      appendJsonLine(paths.requests, entry);
    },
  });
  const seedRun: SeedRun = {
    http,
    maxRedirects: options.politeness.maxRedirects,
    refuse: (url: URL) => refusal(url, allowedHosts, isRobotsAllowed),
    signal: deadline.signal,
    register: (host: string, rules: RobotsRules) => {
      matchers.set(host, robotsMatcher(rules));
    },
  };
  return { http, seedRun, isRobotsAllowed };
}

// The seed state from the cache, or a new seed attempt; a CrawlResult when the seed is not done.
async function openState(
  options: CrawlOptions,
  paths: CachePaths,
  seedRun: SeedRun,
): Promise<SeedState | CrawlResult> {
  const cached = await loadState(paths);
  if (cached !== null) {
    if (!hasSameHosts(cached, options.hosts)) {
      throw new Error(`${paths.state} was made for other hosts; rerun with --fresh`);
    }
    options.print(`resuming from ${paths.dir}`);
    for (const [host, summary] of Object.entries(cached.robots)) {
      seedRun.register(host, summary);
    }
    return cached;
  }
  await clearPages(paths);
  const outcome = await runSeed(options, seedRun, paths);
  if (outcome.kind === 'complete') {
    return outcome.state;
  }
  const reason = outcome.kind === 'incomplete' ? 'seed-incomplete' : 'max-minutes';
  return { complete: false, reason, remaining: null };
}

async function finish(
  context: RunContext,
  state: SeedState,
  hopQueue: readonly QueueEntry[],
): Promise<CrawlResult> {
  const records = [...state.entries, ...hopQueue].map((entry) => {
    const line = context.results.get(entry.url);
    if (line?.isFinal !== true) {
      throw new Error(`crawler bug: ${entry.url} has no final result`);
    }
    return line.record;
  });
  const output = buildOutput({
    crawledAt: new Date(context.options.now()).toISOString(),
    tool: TOOL,
    hosts: state.hosts,
    robots: state.robots,
    sitemapCounts: state.sitemapCounts,
    links: linkCounts(state, context.results, hopQueue),
    records,
  });
  await writeJsonAtomic(context.paths.output, output, context.paths.dir);
  return {
    complete: true,
    outputPath: context.paths.output,
    urls: output.urls.length,
    warnings: state.warnings,
  };
}

// URLs this run never tried and no earlier run finished.
function untried(context: RunContext, entries: readonly QueueEntry[]): QueueEntry[] {
  return entries.filter(
    (entry) =>
      context.results.get(entry.url) === undefined && !context.attempted.has(urlKey(entry.url)),
  );
}

// URLs that failed transiently in an earlier run and have runs left.
function retryable(context: RunContext, entries: readonly QueueEntry[]): QueueEntry[] {
  return entries.filter((entry) => {
    const line = context.results.get(entry.url);
    return line?.isFinal === false && !context.attempted.has(urlKey(entry.url));
  });
}

// Untried sitemap URLs, untried link-hop URLs, the URLs to retry, and last the link-hop URLs
// found on sitemap pages that answered on their retry.
async function crawlPhases(context: RunContext, state: SeedState): Promise<CrawlResult> {
  const hopQueue = () => {
    const queue = linkHopQueue(state, context.results);
    for (const entry of queue) {
      context.known.add(urlKey(entry.url));
    }
    return queue;
  };
  const phases: [string, () => QueueEntry[]][] = [
    ['sitemap URLs', () => untried(context, state.entries)],
    ['link-hop URLs', () => untried(context, hopQueue())],
    ['retries', () => retryable(context, [...state.entries, ...hopQueue()])],
    ['link-hop URLs', () => untried(context, hopQueue())],
  ];
  for (const [label, queueOf] of phases) {
    const queue = queueOf();
    if (queue.length > 0) {
      await processQueue(context, queue, label);
    }
    if (context.stop !== null) {
      return { complete: false, reason: context.stop, remaining: remainingCount(context) };
    }
  }
  printProgress(context, 'run');
  const remaining = remainingCount(context);
  return remaining > 0
    ? { complete: false, reason: 'retry', remaining }
    : finish(context, state, hopQueue());
}

async function crawl(options: CrawlOptions, deadline: Deadline): Promise<CrawlResult> {
  const startedAt = options.now();
  const paths = cachePaths(options.outDir);
  // Only --fresh deletes the cache, the request log included.
  await prepareCache(paths, options.fresh);
  await sealTornLine(paths.pages);
  const firstSeq = await nextRequestSeq(paths.requests);
  const { http, seedRun, isRobotsAllowed } = runHttp(options, paths, deadline, firstSeq);
  const opened = await openState(options, paths, seedRun);
  if (!('entries' in opened)) {
    return opened;
  }
  const state = opened;
  for (const warning of state.warnings) {
    options.print(`WARNING: ${warning}`);
  }
  const { results, unreadable } = await loadPages(paths);
  if (unreadable > 0) {
    options.print(
      `ignored ${String(unreadable)} unreadable cache line(s); those URLs are fetched again`,
    );
  }
  const sitemapKeys = new Set(state.entries.map((entry) => urlKey(entry.url)));
  const rootLangs = new Map(options.hosts.map((host) => [hostOf(host.origin), host.rootLang]));
  const page: PageContext = {
    http,
    follow: { maxRedirects: seedRun.maxRedirects, refuse: seedRun.refuse },
    isRobotsAllowed,
    rootLang: (host) => rootLangs.get(host) ?? null,
    isSitemapUrl: (url) => sitemapKeys.has(urlKey(url)),
  };
  return crawlPhases(
    {
      options,
      paths,
      http,
      page,
      results,
      deadline,
      startedAt,
      known: new Set(sitemapKeys),
      attempted: new Set(),
      stop: null,
      failureStreak: 0,
      finishedThisRun: 0,
    },
    state,
  );
}

// The --max-minutes deadline starts with the run, so the seed counts against it too.
export async function runCrawl(options: CrawlOptions): Promise<CrawlResult> {
  const deadline = startDeadline(options.maxMinutes);
  try {
    return await crawl(options, deadline);
  } finally {
    deadline.clear();
  }
}
