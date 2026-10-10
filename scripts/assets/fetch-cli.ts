// Command line of `npm run media:fetch [-- --design-dir <absolute path>]`. The allowed origin,
// the politeness values and the size limit are fixed in config.ts; no flag changes them. Tests
// pass their own through `overrides`.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  ALLOWED_ORIGINS,
  MANIFEST_FILE,
  MAX_IMAGE_BYTES,
  MEDIA_POLITENESS,
  SOURCES_FILE,
  USER_AGENT,
} from './config';
import {
  DesignDirRequiredError,
  runMediaFetch,
  type MediaFetchOptions,
  type MediaFetchResult,
  type RequestStats,
} from './run';
import { parseSources } from './sources';

export const MEDIA_EXIT_CODES = { ok: 0, error: 1, usage: 2, failed: 3 } as const;

const P = MEDIA_POLITENESS;

export const MEDIA_USAGE = `Usage: npm run media:fetch [-- --design-dir <absolute path>]

Makes every file of ${SOURCES_FILE} exist, as recorded in ${MANIFEST_FILE}.
A file whose sha256 matches its record is skipped; when every file is current, no request is
sent (robots.txt included). Prototype images are copied from --design-dir, which is needed only
while some are missing. Images are fetched from ${ALLOWED_ORIGINS.join(', ')} only.

Options:
  --design-dir <path>  the prototype's design_files folder (absolute path)
  -h, --help           print this help and exit (makes no request)

Politeness: GET only, never a query-string URL, robots.txt "User-agent: *" rules obeyed;
${String(P.concurrency)} requests in flight, ${String(P.gapMs)} ms pause per slot, ${String(P.timeoutMs / 1000)} s timeout, ${String(P.retries)} retries on network
errors and 5xx; redirects followed only within the allowed origin; a response that is not
image/*, or larger than ${String(MAX_IMAGE_BYTES)} bytes, is refused.

Exit codes: 0 every file current, 3 some files failed (run again to retry them), 2 bad
arguments, Node older than 24 or --design-dir needed, 1 error.
`;

export interface MediaIo {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
}

const processIo: MediaIo = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
};

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

function parseFetchArgs(argv: readonly string[]) {
  const { values } = parseArgs({
    args: [...argv],
    strict: true,
    allowPositionals: false,
    options: { 'design-dir': { type: 'string' }, help: { type: 'boolean', short: 'h' } },
  });
  const designDir = values['design-dir'] ?? null;
  if (designDir !== null && !path.isAbsolute(designDir)) {
    throw new Error('--design-dir needs an absolute path');
  }
  return { isHelp: values.help ?? false, designDir };
}

export function describeStats(stats: RequestStats): string {
  const hosts = stats.hosts.length === 0 ? 'none' : stats.hosts.join(', ');
  return `requests: ${String(stats.requests)} (robots.txt ${String(stats.robots)}, images ${String(stats.images)}, redirect hops ${String(stats.redirectHops)}, retries ${String(stats.retries)}); hosts contacted: ${hosts}`;
}

function printResult(result: MediaFetchResult, print: (line: string) => void): void {
  const total = result.current + result.copied + result.fetched + result.failed.length;
  if (result.current === total) {
    print(`every file is current (${String(total)} files); ${describeStats(result.stats)}`);
    return;
  }
  print(
    `${String(total)} files: ${String(result.current)} current, ${String(result.copied)} copied, ${String(result.fetched)} fetched, ${String(result.failed.length)} failed`,
  );
  print(describeStats(result.stats));
  print(`bytes written: ${String(result.bytesWritten)}`);
}

async function run(
  args: ReturnType<typeof parseFetchArgs>,
  overrides: Partial<MediaFetchOptions>,
  print: (line: string) => void,
): Promise<number> {
  const root = overrides.root ?? REPO_ROOT;
  const allowedOrigins = overrides.allowedOrigins ?? ALLOWED_ORIGINS;
  const sources =
    overrides.sources ??
    parseSources(await readFile(path.join(root, SOURCES_FILE), 'utf8'), allowedOrigins);
  const result = await runMediaFetch({
    fetch: (url, init) => fetch(url, init),
    sleep: async (ms) => {
      await delay(ms);
    },
    now: () => Date.now(),
    politeness: MEDIA_POLITENESS,
    userAgent: USER_AGENT,
    maxBytes: MAX_IMAGE_BYTES,
    ...overrides,
    root,
    allowedOrigins,
    sources,
    designDir: overrides.designDir ?? args.designDir,
    print,
  });
  printResult(result, print);
  return result.failed.length > 0 ? MEDIA_EXIT_CODES.failed : MEDIA_EXIT_CODES.ok;
}

export async function runCli(
  argv: readonly string[],
  overrides: Partial<MediaFetchOptions> = {},
  io: MediaIo = processIo,
): Promise<number> {
  let args: ReturnType<typeof parseFetchArgs>;
  try {
    args = parseFetchArgs(argv);
  } catch (error) {
    io.stderr(`${error instanceof Error ? error.message : String(error)}\n\n${MEDIA_USAGE}`);
    return MEDIA_EXIT_CODES.usage;
  }
  if (args.isHelp) {
    io.stdout(MEDIA_USAGE);
    return MEDIA_EXIT_CODES.ok;
  }
  const print =
    overrides.print ??
    ((line: string) => {
      io.stdout(`${line}\n`);
    });
  try {
    return await run(args, overrides, print);
  } catch (error) {
    io.stderr(`media:fetch failed: ${error instanceof Error ? error.message : String(error)}\n`);
    return error instanceof DesignDirRequiredError
      ? MEDIA_EXIT_CODES.usage
      : MEDIA_EXIT_CODES.error;
  }
}
