// Running a queue of URLs: `concurrency` workers take URLs in order, each result is appended to
// pages.jsonl as it finishes, and the run stops on a budget, on the failure brake or on an error.
// A URL that fails transiently (network error, timeout, 403, 429, 5xx) stays open for the next
// run until it has failed in `maxFailedRuns` runs; that last result is then final.
import {
  appendJsonLine,
  type CacheLine,
  type CachePaths,
  type PageResults,
  type QueueEntry,
} from './cache';
import type { Politeness } from './config';
import { ABORTED, type Http } from './fetcher';
import { urlKey } from './output';
import { crawlEntry, isTransient, type PageContext, type PageResult } from './page';

export type StopReason = 'max-minutes' | 'max-requests' | 'failures';

export interface QueueOptions {
  readonly politeness: Politeness;
  readonly now: () => number;
  readonly maxMinutes: number | null;
  readonly maxRequests: number | null;
  readonly print: (line: string) => void;
  readonly progressEvery: number;
}

// The run's abort signal: aborted by the --max-minutes timer (requests in flight are cancelled
// and their URLs left for the next run) or by a worker's crash.
export interface Deadline {
  readonly signal: AbortSignal;
  readonly hasExpired: () => boolean;
  readonly abort: () => void;
  readonly clear: () => void;
}

// setTimeout runs a longer delay at once; a budget that long gets no timer.
const MAX_TIMER_MS = 2_147_483_647;

export function startDeadline(maxMinutes: number | null): Deadline {
  const controller = new AbortController();
  let isExpired = false;
  const ms = maxMinutes === null ? Infinity : maxMinutes * 60_000;
  const timer =
    ms <= MAX_TIMER_MS
      ? setTimeout(() => {
          isExpired = true;
          controller.abort();
        }, ms)
      : undefined;
  return {
    signal: controller.signal,
    hasExpired: () => isExpired,
    abort: () => {
      controller.abort();
    },
    clear: () => {
      clearTimeout(timer);
    },
  };
}

export interface RunContext {
  readonly options: QueueOptions;
  readonly paths: CachePaths;
  readonly http: Http;
  readonly page: PageContext;
  readonly results: PageResults;
  readonly deadline: Deadline;
  readonly startedAt: number;
  // urlKeys of the URLs this run knows it must finish: the sitemap URLs, then the one-hop URLs.
  readonly known: Set<string>;
  // urlKeys of the URLs this run already tried; a URL is tried at most once per run.
  readonly attempted: Set<string>;
  stop: StopReason | null;
  failureStreak: number;
  finishedThisRun: number;
}

function elapsed(context: RunContext): string {
  const seconds = Math.round((context.options.now() - context.startedAt) / 1000);
  return `${String(Math.floor(seconds / 60))}m${String(seconds % 60).padStart(2, '0')}s`;
}

// Known URLs without a final result: a later run still fetches them.
export function remainingCount(context: RunContext): number {
  let remaining = 0;
  for (const key of context.known) {
    if (context.results.get(key)?.isFinal !== true) {
      remaining += 1;
    }
  }
  return remaining;
}

export function printProgress(context: RunContext, label: string): void {
  const total = context.known.size;
  const remaining = remainingCount(context);
  context.options.print(
    `${label}: done ${String(total - remaining)} of ${String(total)} known URLs, ${String(remaining)} remaining | this run: ${String(context.finishedThisRun)} URLs, ${String(context.http.requestCount())} requests, ${elapsed(context)}`,
  );
}

function budgetStop(context: RunContext): StopReason | null {
  const { maxMinutes, maxRequests, now } = context.options;
  const isPastMinutes = maxMinutes !== null && now() - context.startedAt >= maxMinutes * 60_000;
  if (isPastMinutes || context.deadline.hasExpired()) {
    return 'max-minutes';
  }
  const isOverRequests = maxRequests !== null && context.http.requestCount() >= maxRequests;
  return isOverRequests ? 'max-requests' : null;
}

// Appends the result to pages.jsonl. Only a transient failure of a URL that had not failed in an
// earlier run feeds the failure brake, so known-bad URLs cannot stop every run. A fetch cut by the
// deadline is dropped: not a failure, not cached, fetched again next run.
function recordResult(context: RunContext, result: PageResult, label: string): void {
  if (result.record.error === ABORTED) {
    return;
  }
  const failedBefore = context.results.get(result.record.url)?.failedRuns ?? 0;
  const isFailure = isTransient(result.record);
  const failedRuns = isFailure ? failedBefore + 1 : failedBefore;
  const line: CacheLine = {
    ...result,
    failedRuns,
    isFinal: !isFailure || failedRuns >= context.options.politeness.maxFailedRuns,
  };
  context.results.set(line);
  appendJsonLine(context.paths.pages, line);
  context.attempted.add(urlKey(line.record.url));
  if (!isFailure) {
    context.failureStreak = 0;
  } else if (failedBefore === 0) {
    context.failureStreak += 1;
  }
  if (context.failureStreak >= context.options.politeness.maxConsecutiveFailures) {
    context.stop ??= 'failures';
  }
  context.finishedThisRun += 1;
  if (context.finishedThisRun % context.options.progressEvery === 0) {
    printProgress(context, label);
  }
}

// `concurrency` workers take URLs in order until the queue is empty or a stop condition holds.
// A budget stops new URLs; the deadline also aborts the ones in flight. When a worker throws, the
// run stops: no new URL starts, requests in flight are aborted, and the first error is rethrown
// once every worker has ended.
export async function processQueue(
  context: RunContext,
  queue: readonly QueueEntry[],
  label: string,
): Promise<void> {
  let next = 0;
  const errors: unknown[] = [];
  const work = async (): Promise<void> => {
    while (context.stop === null && errors.length === 0) {
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
      recordResult(context, await crawlEntry(entry, context.page), label);
    }
  };
  const worker = async (): Promise<void> => {
    try {
      await work();
    } catch (error) {
      errors.push(error);
      context.deadline.abort();
    }
  };
  await Promise.allSettled(
    Array.from({ length: context.options.politeness.concurrency }, () => worker()),
  );
  if (errors.length > 0) {
    throw errors[0];
  }
  if (context.deadline.hasExpired()) {
    context.stop ??= 'max-minutes';
  }
  printProgress(context, label);
}
