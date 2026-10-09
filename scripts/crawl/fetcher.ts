// Every HTTP request of the crawl goes through `createHttp(...).get`: GET only, never a query
// string, only to the configured hosts, only where robots.txt allows, through a limiter that
// keeps `concurrency` requests in flight with a `gapMs` pause per slot, with a timeout, and with
// retries on network errors and 5xx. Redirects are followed by hand, one logged GET per hop.
import { Buffer } from 'node:buffer';

import type { Politeness } from './config';

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;
export type Sleep = (ms: number) => Promise<void>;

export interface RequestLogEntry {
  readonly ts: string;
  readonly method: 'GET';
  readonly url: string;
  readonly status: number | null;
  readonly attempt: number;
  readonly robotsAllowed: boolean;
  readonly error: string | null;
}

export interface HttpDeps {
  readonly fetch: FetchLike;
  readonly userAgent: string;
  readonly politeness: Politeness;
  readonly sleep: Sleep;
  readonly now: () => number;
  // host (with port) values a request may go to.
  readonly allowedHosts: ReadonlySet<string>;
  // robots.txt verdict for a URL; /robots.txt itself is always fetched.
  readonly isRobotsAllowed: (url: URL) => boolean;
  readonly log: (entry: RequestLogEntry) => void;
}

// Whether to read the body of a response; any other body is cancelled unread.
export type ShouldReadBody = (status: number, contentType: string | null) => boolean;

export type HttpOutcome =
  | {
      readonly ok: true;
      readonly status: number;
      readonly contentType: string | null;
      readonly location: string | null;
      readonly body: string | undefined;
    }
  | { readonly ok: false; readonly error: string };

export function createLimiter(
  politeness: Pick<Politeness, 'concurrency' | 'gapMs'>,
  sleep: Sleep,
  now: () => number,
) {
  const slots = Array.from({ length: politeness.concurrency }, () => ({
    isBusy: false,
    readyAt: 0,
  }));
  const waiting: (() => void)[] = [];

  async function acquire() {
    for (;;) {
      const slot = slots.find((candidate) => !candidate.isBusy);
      if (slot !== undefined) {
        slot.isBusy = true;
        return slot;
      }
      await new Promise<void>((resolve) => {
        waiting.push(resolve);
      });
    }
  }

  return async function run<T>(task: () => Promise<T>): Promise<T> {
    const slot = await acquire();
    try {
      const wait = slot.readyAt - now();
      if (wait > 0) {
        await sleep(wait);
      }
      return await task();
    } finally {
      slot.isBusy = false;
      slot.readyAt = now() + politeness.gapMs;
      waiting.shift()?.();
    }
  };
}

// A Location header with raw UTF-8 bytes reaches fetch as one Latin-1 character per byte; such a
// value round-trips through Latin-1 unchanged and has characters above ASCII.
export function repairLocation(location: string): string {
  const isLatin1 = Buffer.from(location, 'latin1').toString('latin1') === location;
  return isLatin1 && /[^\p{ASCII}]/u.test(location)
    ? Buffer.from(location, 'latin1').toString('utf8')
    : location;
}

function describeError(error: unknown, hasTimedOut: boolean): string {
  if (hasTimedOut) {
    return 'timeout';
  }
  if (!(error instanceof Error)) {
    return `network: ${String(error)}`;
  }
  const cause: unknown = error.cause;
  const code =
    cause !== null && typeof cause === 'object' && 'code' in cause ? String(cause.code) : null;
  return `network: ${code ?? error.message}`;
}

function assertRequestable(url: URL, allowedHosts: ReadonlySet<string>): void {
  let problem: string | null = null;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    problem = 'not http(s)';
  } else if (!allowedHosts.has(url.host)) {
    problem = 'host not allowed';
  } else if (url.search !== '') {
    problem = 'query string';
  }
  if (problem !== null) {
    throw new Error(`crawler bug: refusing to request ${url.href} (${problem})`);
  }
}

export function createHttp(deps: HttpDeps) {
  const { politeness } = deps;
  const limit = createLimiter(politeness, deps.sleep, deps.now);
  let requests = 0;

  async function attempt(url: URL, shouldReadBody: ShouldReadBody): Promise<HttpOutcome> {
    const controller = new AbortController();
    let hasTimedOut = false;
    const timer = setTimeout(() => {
      hasTimedOut = true;
      controller.abort();
    }, politeness.timeoutMs);
    try {
      requests += 1;
      const response = await deps.fetch(url.href, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'user-agent': deps.userAgent,
          accept: 'text/html,application/xml;q=0.9,*/*;q=0.5',
        },
        signal: controller.signal,
      });
      const contentType = response.headers.get('content-type');
      const location = response.headers.get('location');
      const body = shouldReadBody(response.status, contentType) ? await response.text() : undefined;
      if (body === undefined) {
        await response.body?.cancel();
      }
      return {
        ok: true,
        status: response.status,
        contentType,
        location: location === null ? null : repairLocation(location),
        body,
      };
    } catch (error) {
      return { ok: false, error: describeError(error, hasTimedOut) };
    } finally {
      clearTimeout(timer);
    }
  }

  async function get(url: URL, shouldReadBody: ShouldReadBody): Promise<HttpOutcome> {
    assertRequestable(url, deps.allowedHosts);
    const isRobotsAllowed = url.pathname === '/robots.txt' || deps.isRobotsAllowed(url);
    if (!isRobotsAllowed) {
      return { ok: false, error: 'robots-disallowed' };
    }
    let outcome: HttpOutcome = { ok: false, error: 'not requested' };
    for (let index = 0; index <= politeness.retries; index += 1) {
      if (index > 0) {
        await deps.sleep(politeness.backoffMs * 2 ** (index - 1));
      }
      outcome = await limit(() => attempt(url, shouldReadBody));
      deps.log({
        ts: new Date(deps.now()).toISOString(),
        method: 'GET',
        url: url.href,
        status: outcome.ok ? outcome.status : null,
        attempt: index + 1,
        robotsAllowed: isRobotsAllowed,
        error: outcome.ok ? null : outcome.error,
      });
      const shouldRetry = !outcome.ok || outcome.status >= 500;
      if (!shouldRetry) {
        break;
      }
    }
    return outcome;
  }

  return { get, requestCount: () => requests };
}

export type Http = ReturnType<typeof createHttp>;

export interface RedirectHop {
  readonly url: string;
  readonly status: number;
  readonly location: string;
}

// status, finalUrl and contentType describe the last response received. `error` says why the
// chain did not end in a non-redirect response (or why nothing was received).
export interface FetchTrace {
  readonly redirectChain: RedirectHop[];
  readonly finalUrl: string;
  readonly status: number | null;
  readonly contentType: string | null;
  readonly body: string | undefined;
  readonly error: string | null;
}

export interface FollowOptions {
  readonly maxRedirects: number;
  readonly shouldReadBody: ShouldReadBody;
  // Why a redirect target must not be requested (another site, a query string, robots.txt).
  readonly refuse: (target: URL) => string | null;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function redirectStop(target: URL, chain: RedirectHop[], options: FollowOptions): string | null {
  if (chain.some((hop) => hop.url === target.href)) {
    return 'redirect-loop';
  }
  return chain.length > options.maxRedirects ? 'too-many-redirects' : options.refuse(target);
}

export async function fetchFollowing(
  start: string,
  http: Http,
  options: FollowOptions,
): Promise<FetchTrace> {
  const redirectChain: RedirectHop[] = [];
  let current = new URL(start);
  for (;;) {
    const outcome = await http.get(current, options.shouldReadBody);
    if (!outcome.ok) {
      return {
        redirectChain,
        finalUrl: current.href,
        status: null,
        contentType: null,
        body: undefined,
        error: outcome.error,
      };
    }
    const trace: FetchTrace = {
      redirectChain,
      finalUrl: current.href,
      status: outcome.status,
      contentType: outcome.contentType,
      body: outcome.body,
      error: null,
    };
    if (!REDIRECT_STATUSES.has(outcome.status) || outcome.location === null) {
      return trace;
    }
    const target = URL.parse(outcome.location, current.href);
    if (target === null) {
      return { ...trace, error: 'invalid-redirect' };
    }
    target.hash = '';
    redirectChain.push({ url: current.href, status: outcome.status, location: target.href });
    const stop = redirectStop(target, redirectChain, options);
    if (stop !== null) {
      return { ...trace, error: stop };
    }
    current = target;
  }
}
