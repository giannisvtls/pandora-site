// Shared setup for the fetcher tests: createHttp over a fake fetch and a fake clock.
import { POLITENESS, USER_AGENT, type Politeness } from '../config';
import { createHttp, type FetchLike, type FollowOptions, type RequestLogEntry } from '../fetcher';
import { fakeClock, fakeFetch, type Route } from './helpers';

export const ORIGIN = 'https://invetec.eu';
export const HOSTS = new Set(['invetec.eu', 'lenovo.invetec.eu']);

export function setup(
  routes: Record<string, Route>,
  options: {
    politeness?: Partial<Politeness>;
    isRobotsAllowed?: (url: URL) => boolean;
    isClockFrozen?: boolean;
    signal?: AbortSignal;
    // Called with the log as it is at the moment fetch is called, before fetch runs.
    onFetch?: (log: readonly RequestLogEntry[]) => void;
  } = {},
) {
  const site = fakeFetch(routes);
  const clock = fakeClock({ isFrozen: options.isClockFrozen ?? false });
  const log: RequestLogEntry[] = [];
  const http = createHttp({
    fetch: (url, init) => {
      options.onFetch?.([...log]);
      return site.fetch(url, init);
    },
    userAgent: USER_AGENT,
    politeness: { ...POLITENESS, ...options.politeness },
    sleep: clock.sleep,
    now: clock.now,
    allowedHosts: HOSTS,
    isRobotsAllowed: options.isRobotsAllowed ?? (() => true),
    signal: options.signal ?? new AbortController().signal,
    firstSeq: 1,
    log: (entry) => {
      log.push(entry);
    },
  });
  return { site, clock, log, http };
}

// The log as [event, seq, attempt or status] rows.
export function logRows(log: readonly RequestLogEntry[]): [string, number, number | null][] {
  return log.map((entry) =>
    entry.event === 'sent'
      ? [entry.event, entry.seq, entry.attempt]
      : [entry.event, entry.seq, entry.status],
  );
}

export const follow: FollowOptions = {
  maxRedirects: POLITENESS.maxRedirects,
  shouldReadBody: (status) => status === 200,
  refuse: (url) => (HOSTS.has(url.host) ? null : 'redirect-off-site'),
};

// A fetch that never answers until its signal aborts.
export const hang: FetchLike = (_url, init) =>
  new Promise((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => {
      reject(new DOMException('aborted', 'AbortError'));
    });
  });
