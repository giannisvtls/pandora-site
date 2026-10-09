// Image downloads over the crawler's request pipeline: `createHttp` (the limiter with 2 requests
// in flight and a 250 ms pause per slot, the 20 s timeout, retries on network errors and 5xx,
// the robots.txt check, the allowed hosts, GET only, the request log) and `fetchFollowing`
// (redirects followed by hand, each hop checked). The crawler reads response bodies as text, so
// the media fetch gives createHttp a fetch that reads an image body itself, as bytes and with a
// size cap, and hands on an empty response; the caller takes the bytes by URL once
// fetchFollowing returns. Any other response (robots.txt, a redirect, an error status, a
// non-image) passes through untouched.
import { Buffer } from 'node:buffer';

import { urlProblem } from './sources';
import { hostOf, type Politeness } from '../crawl/config';
import {
  createHttp,
  fetchFollowing,
  type FetchLike,
  type Http,
  type RequestLogEntry,
  type Sleep,
} from '../crawl/fetcher';
import { robotsMatcher } from '../crawl/robots';
import { isRobotsUnreachable, robotsRulesOf } from '../crawl/seed';

export type Download =
  | { readonly ok: true; readonly bytes: Uint8Array; readonly contentType: string }
  | { readonly ok: false; readonly reason: string };

// `image/webp; charset=binary` -> `image/webp`; null without a header.
export function mediaTypeOf(contentType: string | null): string | null {
  const type = contentType?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  return type === '' ? null : type;
}

async function readCapped(response: Response, maxBytes: number, type: string): Promise<Download> {
  const declared = Number(response.headers.get('content-length') ?? NaN);
  if (declared > maxBytes) {
    await response.body?.cancel();
    return {
      ok: false,
      reason: `too-large: Content-Length ${String(declared)} > ${String(maxBytes)} bytes`,
    };
  }
  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const chunk = reader === undefined ? { done: true as const } : await reader.read();
    if (chunk.done) {
      break;
    }
    total += chunk.value.byteLength;
    if (total > maxBytes) {
      await reader?.cancel();
      return { ok: false, reason: `too-large: more than ${String(maxBytes)} bytes` };
    }
    chunks.push(chunk.value);
  }
  return total === 0
    ? { ok: false, reason: 'empty-body' }
    : { ok: true, bytes: Buffer.concat(chunks), contentType: type };
}

// A fetch for createHttp that keeps the body of each 200 image response; see the file comment.
export function createImageTap(fetch: FetchLike, maxBytes: number) {
  const bodies = new Map<string, Download>();
  const tapped: FetchLike = async (url, init) => {
    const response = await fetch(url, init);
    const type = mediaTypeOf(response.headers.get('content-type'));
    if (response.status !== 200 || type?.startsWith('image/') !== true) {
      return response;
    }
    // A read that fails (a reset, the timeout) throws here, so createHttp retries it as it would
    // a failed request.
    bodies.set(url, await readCapped(response, maxBytes, type));
    return new Response(null, { status: response.status, headers: response.headers });
  };
  const take = (url: string): Download | undefined => {
    const body = bodies.get(url);
    bodies.delete(url);
    return body;
  };
  return { fetch: tapped, take };
}

export type ImageTap = ReturnType<typeof createImageTap>;

export interface DownloaderDeps {
  readonly fetch: FetchLike;
  readonly userAgent: string;
  readonly politeness: Politeness;
  readonly sleep: Sleep;
  readonly now: () => number;
  readonly allowedOrigins: readonly string[];
  readonly maxBytes: number;
  readonly log: (entry: RequestLogEntry) => void;
}

// Why a redirect target must not be followed: another origin (or plain HTTP), a query string.
function refuseTarget(allowedOrigins: readonly string[]) {
  return (target: URL): string | null => {
    const problem = urlProblem(target.href, allowedOrigins);
    if (problem === null) {
      return null;
    }
    return problem === 'has a query string' ? 'redirect-to-query' : 'redirect-off-site';
  };
}

// A robots.txt may only redirect to the robots.txt of an allowed origin.
function refuseRobotsTarget(allowedOrigins: readonly string[]) {
  const refuse = refuseTarget(allowedOrigins);
  return (target: URL): string | null =>
    refuse(target) ?? (target.pathname === '/robots.txt' ? null : 'redirect-off-robots');
}

export function createDownloader(deps: DownloaderDeps) {
  const tap = createImageTap(deps.fetch, deps.maxBytes);
  const matchers = new Map<string, (pathAndQuery: string) => boolean>();
  const http: Http = createHttp({
    fetch: tap.fetch,
    userAgent: deps.userAgent,
    politeness: deps.politeness,
    sleep: deps.sleep,
    now: deps.now,
    allowedHosts: new Set(deps.allowedOrigins.map((origin) => hostOf(origin))),
    // An origin whose robots.txt was not read allows nothing (its robots.txt itself is exempt).
    isRobotsAllowed: (url) => matchers.get(url.origin)?.(url.pathname + url.search) ?? false,
    signal: new AbortController().signal,
    firstSeq: 1,
    log: deps.log,
  });
  const { maxRedirects } = deps.politeness;

  // Reads an origin's robots.txt; throws (before any image request) when it is unreachable, which
  // RFC 9309 treats as "disallow all", or when it asks for a longer pause than the fixed one.
  async function readRobots(origin: string): Promise<void> {
    const trace = await fetchFollowing(`${origin}/robots.txt`, http, {
      maxRedirects,
      shouldReadBody: (status) => status >= 200 && status < 300,
      refuse: refuseRobotsTarget(deps.allowedOrigins),
    });
    if (isRobotsUnreachable(trace)) {
      const why = trace.error ?? `HTTP ${String(trace.status)}`;
      throw new Error(
        `robots.txt of ${origin} is unreachable (${why}): RFC 9309 means "disallow all"; nothing was fetched`,
      );
    }
    const rules = robotsRulesOf(trace);
    if (rules.crawlDelay !== null && rules.crawlDelay * 1000 > deps.politeness.gapMs) {
      throw new Error(
        `robots.txt of ${origin} asks for Crawl-delay ${String(rules.crawlDelay)} s, more than the ${String(deps.politeness.gapMs)} ms pause; not fetching without a decision`,
      );
    }
    matchers.set(origin, robotsMatcher(rules));
  }

  // One image: 200, an image/* type, a body within the cap, after redirects within the allowed
  // origins. Never throws for a refusal; it returns the reason.
  async function download(url: string): Promise<Download> {
    const trace = await fetchFollowing(url, http, {
      maxRedirects,
      shouldReadBody: () => false,
      refuse: refuseTarget(deps.allowedOrigins),
    });
    const body = tap.take(trace.finalUrl);
    if (trace.error !== null) {
      return { ok: false, reason: trace.error };
    }
    return trace.status === 200
      ? (body ?? { ok: false, reason: `not-image: ${trace.contentType ?? 'no Content-Type'}` })
      : { ok: false, reason: `HTTP ${String(trace.status)}` };
  }

  return { readRobots, download };
}
