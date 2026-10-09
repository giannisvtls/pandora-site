// The seed phase of a run. Every host's robots.txt is read first, and a Crawl-delay longer than
// the crawl's pause stops the crawl before any sitemap request; then every host's sitemap files.
// A request that fails transiently (network error, timeout, 429, 5xx; 403 for a sitemap file)
// makes the seed incomplete: state.json is not written, the run prints SEED INCOMPLETE lines and
// stops, and the next run seeds again. A request that failed in `maxFailedRuns` seed attempts in
// a row is accepted as failed instead: a robots.txt as disallow-all for its host (RFC 9309), a
// sitemap file as skipped. Each accepted failure is kept in state.json as a warning, and so is a
// host whose robots.txt makes it disallow-all for a final reason (a refused redirect, say).
import {
  loadSeedFailures,
  saveSeedFailures,
  saveState,
  type CachePaths,
  type SeedFailure,
  type SeedState,
} from './cache';
import { hostOf, type HostConfig, type Politeness } from './config';
import type { RobotsSummary, SitemapFile } from './output';
import type { RobotsRules } from './robots';
import {
  discoverSitemaps,
  fetchRobots,
  isRobotsUnreachable,
  isTransientSeed,
  type Discovery,
  type SeedContext,
  type TransientSeedRequest,
} from './seed';

export interface SeedOptions {
  readonly hosts: readonly HostConfig[];
  readonly politeness: Politeness;
  readonly now: () => number;
  readonly print: (line: string) => void;
}

export interface SeedRun extends SeedContext {
  // The run's abort signal: once aborted (the --max-minutes deadline), the attempt is dropped.
  readonly signal: AbortSignal;
  readonly register: (host: string, rules: RobotsRules) => void;
}

export type SeedOutcome =
  | { readonly kind: 'complete'; readonly state: SeedState }
  | { readonly kind: 'incomplete' }
  | { readonly kind: 'interrupted' };

interface HostRobots {
  readonly config: HostConfig;
  readonly name: string;
  readonly rules: RobotsRules;
  readonly summary: RobotsSummary;
  // Why the host is disallow-all when that is a final answer (a refused redirect, say), not a
  // transient failure; null otherwise.
  readonly refused: string | null;
}

function describe(status: number | null, error: string | null): string {
  return error ?? `HTTP ${String(status)}`;
}

// The fixed pause is 250 ms; a robots.txt that asks for more stops the crawl before any sitemap
// or page request, so a person decides (the spec has no rule for it).
function assertCrawlDelay(host: string, rules: RobotsRules, politeness: Politeness): void {
  if (rules.crawlDelay !== null && rules.crawlDelay * 1000 > politeness.gapMs) {
    throw new Error(
      `robots.txt of ${host} asks for Crawl-delay ${String(rules.crawlDelay)} s, more than this crawl's ${String(politeness.gapMs)} ms pause; not crawling without a decision`,
    );
  }
}

// The transient failures of one seed attempt, each with its count of attempts in a row.
class SeedAttempt {
  readonly failures: SeedFailure[] = [];

  constructor(
    private readonly previous: readonly SeedFailure[],
    private readonly limit: number,
  ) {}

  add(kind: SeedFailure['kind'], request: TransientSeedRequest): void {
    const before = this.previous.find(
      (failure) => failure.kind === kind && failure.url === request.url,
    );
    this.failures.push({ kind, ...request, failedSeeds: (before?.failedSeeds ?? 0) + 1 });
  }

  isAccepted(failure: SeedFailure): boolean {
    return failure.failedSeeds >= this.limit;
  }

  hasPending(): boolean {
    return this.failures.some((failure) => !this.isAccepted(failure));
  }

  printIncomplete(print: (line: string) => void): void {
    for (const failure of this.failures) {
      const accepted = this.isAccepted(failure) ? '; accepted as failed' : '';
      print(
        `SEED INCOMPLETE: ${failure.url} ${describe(failure.status, failure.error)} (failed ${String(failure.failedSeeds)} of ${String(this.limit)} seed attempts in a row${accepted})`,
      );
    }
  }

  warnings(): string[] {
    return this.failures.map((failure) => {
      const what = `${failure.url} failed in ${String(failure.failedSeeds)} seed attempts in a row (${describe(failure.status, failure.error)})`;
      return failure.kind === 'robots'
        ? `${what}; its host is treated as disallow-all (RFC 9309), so none of its URLs is crawled`
        : `${what}; it is recorded as a skipped sitemap file, so the URLs it lists are missing`;
    });
  }
}

async function robotsStage(
  options: SeedOptions,
  run: SeedRun,
  attempt: SeedAttempt,
): Promise<HostRobots[] | null> {
  const robots: HostRobots[] = [];
  for (const config of options.hosts) {
    const name = hostOf(config.origin);
    const { rules, summary, trace } = await fetchRobots(config, run);
    if (run.signal.aborted) {
      return null;
    }
    assertCrawlDelay(name, rules, options.politeness);
    const isTransient = isTransientSeed(trace, 'robots');
    if (isTransient) {
      attempt.add('robots', { url: summary.url, status: trace.status, error: trace.error });
    }
    const refused =
      !isTransient && isRobotsUnreachable(trace) ? describe(trace.status, trace.error) : null;
    options.print(`seed ${name}: robots.txt ${describe(trace.status, trace.error)}`);
    robots.push({ config, name, rules, summary, refused });
  }
  return robots;
}

async function sitemapStage(
  options: SeedOptions,
  run: SeedRun,
  robots: readonly HostRobots[],
  attempt: SeedAttempt,
): Promise<Discovery[] | null> {
  const discoveries: Discovery[] = [];
  for (const host of robots) {
    const discovery = await discoverSitemaps(host.config, host.rules, run);
    if (run.signal.aborted) {
      return null;
    }
    for (const request of discovery.transient) {
      attempt.add('sitemap', request);
    }
    options.print(
      `seed ${host.name}: ${String(discovery.files.length)} sitemap files, ${String(discovery.entries.length)} URLs`,
    );
    discoveries.push(discovery);
  }
  return discoveries;
}

function noteAccepted(files: readonly SitemapFile[], attempt: SeedAttempt): SitemapFile[] {
  return files.map((file) => {
    const failure = attempt.failures.find(
      (item) => item.kind === 'sitemap' && item.url === file.url,
    );
    if (failure === undefined || file.kind !== 'skipped') {
      return file;
    }
    const note = `${file.note ?? 'failed'}; failed in ${String(failure.failedSeeds)} seed attempts in a row, accepted`;
    return { ...file, note };
  });
}

// A host disallow-all for a final reason still yields no URL: say so on every run, as for an
// accepted failure.
function refusedWarnings(robots: readonly HostRobots[]): string[] {
  return robots.flatMap((host) =>
    host.refused === null
      ? []
      : `${host.summary.url} ended in ${host.refused}; its host is treated as disallow-all (RFC 9309), so none of its URLs is crawled`,
  );
}

function buildState(
  options: SeedOptions,
  robots: readonly HostRobots[],
  discoveries: readonly Discovery[],
  attempt: SeedAttempt,
): SeedState {
  const hosts = robots.map((host, index) => ({ host, discovery: discoveries[index] }));
  return {
    version: 2,
    startedAt: new Date(options.now()).toISOString(),
    hosts: hosts.map(({ host, discovery }) => ({
      host: host.name,
      origin: host.config.origin,
      rootLang: host.config.rootLang,
      sitemaps: noteAccepted(discovery?.files ?? [], attempt),
    })),
    robots: Object.fromEntries(robots.map((host) => [host.name, host.summary])),
    sitemapCounts: Object.fromEntries(
      hosts.map(({ host, discovery }) => [
        host.name,
        discovery?.counts ?? {
          sitemapEntries: {},
          duplicateSitemapEntries: 0,
          skippedSitemapEntries: { query: 0, offHost: 0, invalid: 0 },
        },
      ]),
    ),
    entries: discoveries.flatMap((discovery) => discovery.entries),
    warnings: [...attempt.warnings(), ...refusedWarnings(robots)],
  };
}

// One seed attempt. Its outcome is saved: state.json when complete, else seed-failures.json.
export async function runSeed(
  options: SeedOptions,
  run: SeedRun,
  paths: CachePaths,
): Promise<SeedOutcome> {
  const previous = await loadSeedFailures(paths);
  const attempt = new SeedAttempt(previous, options.politeness.maxFailedRuns);
  const robots = await robotsStage(options, run, attempt);
  if (robots === null) {
    return { kind: 'interrupted' };
  }
  if (attempt.hasPending()) {
    // No sitemap was requested: the sitemap failures of the last attempt carry over unchanged.
    const carried = previous.filter((failure) => failure.kind === 'sitemap');
    await saveSeedFailures(paths, [...attempt.failures, ...carried]);
    attempt.printIncomplete(options.print);
    return { kind: 'incomplete' };
  }
  for (const host of robots) {
    run.register(host.name, host.rules);
  }
  const discoveries = await sitemapStage(options, run, robots, attempt);
  if (discoveries === null) {
    return { kind: 'interrupted' };
  }
  if (attempt.hasPending()) {
    await saveSeedFailures(paths, attempt.failures);
    attempt.printIncomplete(options.print);
    return { kind: 'incomplete' };
  }
  const state = buildState(options, robots, discoveries, attempt);
  await saveState(paths, state);
  await saveSeedFailures(paths, []);
  return { kind: 'complete', state };
}
