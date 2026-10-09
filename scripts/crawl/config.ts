// Fixed settings of the read-only redirect crawl (spec: "Redirect crawl"). The CLI has no flag
// that changes the hosts or the politeness values; tests pass their own through code.

export const TOOL = { name: 'pandora-site-crawl', version: '1.0.0' } as const;

// Names the purpose and nothing personal: no e-mail address, no person's name, no phone number.
export const USER_AGENT = `${TOOL.name}/${TOOL.version} (read-only URL inventory for the invetec.eu site rebuild; plans redirects; GET only, obeys robots.txt)`;

export interface HostConfig {
  // Scheme + host (+ port), no trailing slash, e.g. https://invetec.eu
  readonly origin: string;
  // The language of paths without an /en/, /it/ or /sq/ prefix; null when unknown.
  readonly rootLang: string | null;
}

export const HOSTS: readonly HostConfig[] = [
  { origin: 'https://invetec.eu', rootLang: 'el' },
  { origin: 'https://lenovo.invetec.eu', rootLang: null },
];

export interface Politeness {
  // Requests in flight at once, across all hosts.
  readonly concurrency: number;
  // Pause between the end of one request and the start of the next on the same slot.
  readonly gapMs: number;
  // Per request, body included.
  readonly timeoutMs: number;
  // Extra attempts after a network error or a 5xx response.
  readonly retries: number;
  // The first retry waits backoffMs, the second twice that.
  readonly backoffMs: number;
  // Redirects followed per URL; the next one is recorded but not followed.
  readonly maxRedirects: number;
  // A run stops early after this many URLs in a row ended in a network error, timeout, 403, 429
  // or 5xx. Only URLs that had not failed in an earlier run count: it is an outage/WAF brake.
  readonly maxConsecutiveFailures: number;
  // Runs in which a URL may end that way before its last result is kept as final; also the seed
  // attempts in a row a robots.txt or sitemap file may fail before it is accepted as failed.
  readonly maxFailedRuns: number;
}

export const POLITENESS: Politeness = {
  concurrency: 2,
  gapMs: 250,
  timeoutMs: 20_000,
  retries: 2,
  backoffMs: 1000,
  maxRedirects: 5,
  maxConsecutiveFailures: 20,
  maxFailedRuns: 3,
};

// Fetched on every host besides the robots.txt `Sitemap:` lines (Yoast, then WordPress core).
export const SITEMAP_SEED_PATHS = ['/sitemap_index.xml', '/wp-sitemap.xml'] as const;

// Language path prefixes; any other path is in the host's rootLang.
export const PATH_LANGS = ['en', 'it', 'sq'] as const;

// Guards against a sitemap index that points at itself through many files.
export const MAX_SITEMAP_FILES = 200;

export function hostOf(origin: string): string {
  return new URL(origin).host;
}
