// Every HTTP request of the crawl goes through `createHttp(...).get`: GET only, never a query
// string, only to the configured hosts, only where robots.txt allows, through a limiter that
// keeps `concurrency` requests in flight with a `gapMs` pause per slot, with a timeout, and with
// retries on network errors and 5xx. Redirects are followed by hand, one logged GET per hop.
// Each request is logged just before it is sent and again when it ends, so a killed run never
// leaves a sent request out of the log. The run's abort signal (the --max-minutes deadline)
// cancels the requests in flight and refuses new ones.
import { Buffer } from 'node:buffer';

import type { Politeness } from './config';

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;
export type Sleep = (ms: number) => Promise<void>;

// The error of a request cut by the run's abort signal; its URL is left for the next run.
export const ABORTED = 'aborted';

// One line of requests.jsonl: `sent` just before a request goes out, then `done` with the same
// `seq` when it ends (its status, or an error: `timeout`, `network: <code>`, `aborted`).
export type RequestLogEntry =
  | {
      readonly event: 'sent';
      readonly seq: number;
      readonly ts: string;
      readonly method: 'GET';
      readonly url: string;
      readonly attempt: number;
      readonly robotsAllowed: boolean;
    }
  | {
      readonly event: 'done';
      readonly seq: number;
      readonly ts: string;
      readonly url: string;
      readonly status: number | null;
      readonly error: string | null;
    };

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
  // Once aborted, requests in flight are cancelled and no new one is sent.
  readonly signal: AbortSignal;
  // `seq` of this run's first request (the log continues the numbering of earlier runs).
  readonly firstSeq: number;
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

// A result worth another try in a later run: a network error or timeout, 403, 429 or 5xx.
export function isTransientOutcome(status: number | null, error: string | null): boolean {
  return status === null
    ? error === 'timeout' || (error?.startsWith('network:') ?? false)
    : status >= 500 || status === 429 || status === 403;
}

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

const UTF8 = new TextDecoder('utf-8', { fatal: true });

function percentEncodeHighBytes(location: string): string {
  return location.replaceAll(
    /[^\p{ASCII}]/gu,
    (char) => `%${(char.codePointAt(0) ?? 0).toString(16).toUpperCase()}`,
  );
}

// fetch exposes header bytes as Latin-1, one character per byte. A Location that is valid UTF-8
// (raw UTF-8 bytes, as some servers send) is decoded back to text. Any other high byte (a genuine
// Latin-1 header, or UTF-8 mixed with a stray byte) stays that byte, percent-encoded, so the URL
// followed is the one the server sent; passing it on raw would re-encode 0xE9 as UTF-8 %C3%A9.
export function repairLocation(location: string): string {
  const hasHighBytes = /[^\p{ASCII}]/u.test(location);
  const isByteString = Buffer.from(location, 'latin1').toString('latin1') === location;
  if (!hasHighBytes || !isByteString) {
    return location;
  }
  try {
    return UTF8.decode(Buffer.from(location, 'latin1'));
  } catch {
    return percentEncodeHighBytes(location);
  }
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

// One request with its timeout and the run's abort signal; the body is read or cancelled. Never
// throws.
async function send(
  deps: HttpDeps,
  url: URL,
  shouldReadBody: ShouldReadBody,
): Promise<HttpOutcome> {
  const timeout = new AbortController();
  let hasTimedOut = false;
  const timer = setTimeout(() => {
    hasTimedOut = true;
    timeout.abort();
  }, deps.politeness.timeoutMs);
  try {
    const response = await deps.fetch(url.href, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'user-agent': deps.userAgent,
        accept: 'text/html,application/xml;q=0.9,*/*;q=0.5',
      },
      signal: AbortSignal.any([timeout.signal, deps.signal]),
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
    return { ok: false, error: deps.signal.aborted ? ABORTED : describeError(error, hasTimedOut) };
  } finally {
    clearTimeout(timer);
  }
}

export function createHttp(deps: HttpDeps) {
  const { politeness } = deps;
  const limit = createLimiter(politeness, deps.sleep, deps.now);
  let requests = 0;
  let nextSeq = deps.firstSeq;
  const timestamp = () => new Date(deps.now()).toISOString();

  // The `sent` line is written before the request goes out, the `done` line after it ends.
  async function attempt(
    url: URL,
    shouldReadBody: ShouldReadBody,
    attemptNumber: number,
    isRobotsAllowed: boolean,
  ): Promise<HttpOutcome> {
    if (deps.signal.aborted) {
      return { ok: false, error: ABORTED };
    }
    const seq = nextSeq;
    nextSeq += 1;
    requests += 1;
    deps.log({
      event: 'sent',
      seq,
      ts: timestamp(),
      method: 'GET',
      url: url.href,
      attempt: attemptNumber,
      robotsAllowed: isRobotsAllowed,
    });
    const outcome = await send(deps, url, shouldReadBody);
    deps.log({
      event: 'done',
      seq,
      ts: timestamp(),
      url: url.href,
      status: outcome.ok ? outcome.status : null,
      error: outcome.ok ? null : outcome.error,
    });
    return outcome;
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
      outcome = await limit(() => attempt(url, shouldReadBody, index + 1, isRobotsAllowed));
      // An aborted request is not retried: the run is stopping.
      const shouldRetry = outcome.ok ? outcome.status >= 500 : outcome.error !== ABORTED;
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
