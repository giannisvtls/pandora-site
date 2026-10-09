// Command line of the crawl. Hosts, output folder and politeness are fixed here (config.ts); no
// flag can point the crawler at another site. Tests pass their own through `overrides`.
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { HOSTS, POLITENESS, USER_AGENT } from './config';
import { runCrawl, type CrawlOptions } from './run';

export const EXIT_CODES = { complete: 0, error: 1, usage: 2, stopped: 3 } as const;

export const USAGE = `Usage: npm run crawl -- [options]

Read-only inventory of the live URLs of ${HOSTS.map((host) => host.origin).join(' and ')}:
robots.txt, every sitemap URL, then one hop of internal page links. Writes redirects/crawl.json
once every URL is done. Progress is kept in redirects/.crawl-cache/, so a stopped run resumes
where it left off when started again; requests.jsonl there logs every request.

Options:
  --max-minutes <n>   start no new URL after n minutes (URLs in flight finish)
  --max-requests <n>  start no new URL after n HTTP requests in this run
  --fresh             delete redirects/.crawl-cache/ and start over
  -h, --help          print this help and exit (makes no request)

Politeness: GET only, never a query-string URL; robots.txt "User-agent: *" rules obeyed;
${String(POLITENESS.concurrency)} requests in flight, ${String(POLITENESS.gapMs)} ms pause per slot, ${String(POLITENESS.timeoutMs / 1000)} s timeout, ${String(POLITENESS.retries)} retries with backoff on
network errors and 5xx; up to ${String(POLITENESS.maxRedirects)} redirects followed per URL; stops after ${String(POLITENESS.maxConsecutiveFailures)} failures in a row,
and before any page when a robots.txt Crawl-delay asks for a longer pause.

Exit codes: 0 complete (crawl.json written), 3 stopped early (run again to resume),
2 bad arguments, 1 error.
`;

export interface CliIo {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
}

const processIo: CliIo = {
  stdout: (text) => {
    process.stdout.write(text);
  },
  stderr: (text) => {
    process.stderr.write(text);
  },
};

function defaultOptions(io: CliIo): CrawlOptions {
  return {
    hosts: HOSTS,
    outDir: fileURLToPath(new URL('../../redirects/', import.meta.url)),
    fetch: (url, init) => fetch(url, init),
    sleep: async (ms) => {
      await delay(ms);
    },
    now: () => Date.now(),
    politeness: POLITENESS,
    userAgent: USER_AGENT,
    fresh: false,
    maxMinutes: null,
    maxRequests: null,
    print: (line) => {
      io.stdout(`${line}\n`);
    },
    progressEvery: 25,
  };
}

class UsageError extends Error {}

function positive(
  value: string | undefined,
  flag: string,
  requiresInteger: boolean,
): number | null {
  if (value === undefined) {
    return null;
  }
  const number = Number(value);
  const isWhole = Number.isSafeInteger(number);
  if (!Number.isFinite(number) || number <= 0 || (requiresInteger && !isWhole)) {
    const kind = requiresInteger ? 'whole number' : 'number';
    throw new UsageError(`${flag} needs a positive ${kind}, got "${value}"`);
  }
  return number;
}

function parseCli(argv: readonly string[]) {
  try {
    const { values } = parseArgs({
      args: [...argv],
      strict: true,
      allowPositionals: false,
      options: {
        help: { type: 'boolean', short: 'h' },
        fresh: { type: 'boolean' },
        'max-minutes': { type: 'string' },
        'max-requests': { type: 'string' },
      },
    });
    return {
      isHelp: values.help ?? false,
      budget: {
        fresh: values.fresh ?? false,
        maxMinutes: positive(values['max-minutes'], '--max-minutes', false),
        maxRequests: positive(values['max-requests'], '--max-requests', true),
      },
    };
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error));
  }
}

export async function runCli(
  argv: readonly string[],
  overrides: Partial<CrawlOptions> = {},
  io: CliIo = processIo,
): Promise<number> {
  let flags: ReturnType<typeof parseCli>;
  try {
    flags = parseCli(argv);
  } catch (error) {
    io.stderr(`${error instanceof Error ? error.message : String(error)}\n\n${USAGE}`);
    return EXIT_CODES.usage;
  }
  if (flags.isHelp) {
    io.stdout(USAGE);
    return EXIT_CODES.complete;
  }
  const options: CrawlOptions = { ...defaultOptions(io), ...flags.budget, ...overrides };
  try {
    const result = await runCrawl(options);
    if (result.complete) {
      options.print(`COMPLETE: wrote ${result.outputPath} (${String(result.urls)} URLs)`);
      return EXIT_CODES.complete;
    }
    options.print(
      `STOPPED (${result.reason}): ${String(result.remaining)} known URLs remaining; crawl.json was not written. Run the same command again to resume.`,
    );
    return EXIT_CODES.stopped;
  } catch (error) {
    io.stderr(`crawl failed: ${error instanceof Error ? error.message : String(error)}\n`);
    return EXIT_CODES.error;
  }
}
