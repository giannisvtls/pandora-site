// `npm run crawl:summary`: writes redirects/CRAWL.md from redirects/crawl.json (no network), or,
// with --check, writes nothing and fails when CRAWL.md is not exactly what crawl.json gives (a
// number edited by hand, or a crawl.json without a regenerated summary). The Markdown goes
// through Prettier with the repo's config, so `format:check` and this check agree.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { format, resolveConfig } from 'prettier';

import type { CliIo } from './cli';
import { crawlOutputSchema, type CrawlOutput } from './output';
import { renderHreflang, renderOrphans } from './summary-coverage';
import {
  MAIN_HOST,
  renderOpenItem5,
  renderOpenItem6,
  renderRedirectLimit,
} from './summary-open-items';
import {
  hostNames,
  recordsOf,
  renderCounts,
  renderHeader,
  renderNoindex,
  renderSitemaps,
  renderStatus,
  SUMMARY_COMMAND,
} from './summary-render';

export const SUMMARY_EXIT_CODES = { ok: 0, failed: 1, usage: 2 } as const;

export const SUMMARY_USAGE = `Usage: ${SUMMARY_COMMAND} -- [--check]

Writes redirects/CRAWL.md from redirects/crawl.json; makes no request.

Options:
  --check     write nothing; exit 1 when CRAWL.md differs from what crawl.json gives
  -h, --help  print this help and exit

Both modes first check crawl.json: its schema, and that every sitemap file's URL count equals
the records with that source (each sitemap URL exactly once). Exit codes: 0 done or in sync,
1 out of sync or invalid data, 2 bad arguments.
`;

export interface SummaryPaths {
  readonly crawl: string;
  readonly summary: string;
}

export const DEFAULT_SUMMARY_PATHS: SummaryPaths = {
  crawl: fileURLToPath(new URL('../../redirects/crawl.json', import.meta.url)),
  summary: fileURLToPath(new URL('../../redirects/CRAWL.md', import.meta.url)),
};

// Every way crawl.json can disagree with its own counts; empty when consistent.
export function crossCheck(crawl: CrawlOutput): string[] {
  const problems: string[] = [];
  const hosts = new Set(hostNames(crawl));
  for (const record of crawl.urls) {
    if (!hosts.has(record.host)) {
      problems.push(`${record.url}: host ${record.host} is not one of the crawled hosts`);
    }
  }
  for (const host of hosts) {
    const counts = crawl.counts.byHost[host];
    const records = recordsOf(crawl, host);
    if (counts === undefined) {
      problems.push(`${host}: no counts`);
      continue;
    }
    if (counts.urls !== records.length) {
      problems.push(
        `${host}: counts say ${String(counts.urls)} URLs, crawl.json has ${String(records.length)}`,
      );
    }
    const fromRecords = records
      .filter((record) => record.source.startsWith('sitemap:'))
      .map((record) => record.source.slice('sitemap:'.length));
    const names = new Set([...Object.keys(counts.sitemapEntries), ...fromRecords]);
    for (const name of names) {
      const taken = counts.sitemapEntries[name] ?? 0;
      const found = records.filter((record) => record.source === `sitemap:${name}`).length;
      if (taken !== found) {
        problems.push(
          `${host}: sitemap ${name} gave ${String(taken)} URLs, crawl.json has ${String(found)} records from it`,
        );
      }
    }
    const links = records.filter((record) => record.source === 'link').length;
    if (counts.links.linkOnlyUrls !== links) {
      problems.push(
        `${host}: counts say ${String(counts.links.linkOnlyUrls)} link-only URLs, crawl.json has ${String(links)}`,
      );
    }
  }
  return problems;
}

export function renderSummary(crawl: CrawlOutput): string {
  const sections = [
    renderHeader(crawl),
    renderSitemaps(crawl),
    renderCounts(crawl),
    renderStatus(crawl),
    renderNoindex(crawl),
    renderHreflang(crawl, MAIN_HOST),
    renderOrphans(crawl),
    renderOpenItem5(crawl),
    renderOpenItem6(crawl),
    renderRedirectLimit(crawl),
  ];
  return `${sections.join('\n\n')}\n`;
}

// Prettier with the repo's config for `filePath`, checked to be stable: a second pass must not
// change the text, or the --check would flap.
export async function formatSummary(markdown: string, filePath: string): Promise<string> {
  const config = (await resolveConfig(filePath, { editorconfig: true })) ?? {};
  const options = { ...config, filepath: filePath };
  const once = await format(markdown, options);
  if ((await format(once, options)) !== once) {
    throw new Error('the summary is not stable under Prettier (a generator bug)');
  }
  return once;
}

export async function loadCrawl(file: string): Promise<CrawlOutput> {
  const text = await readFile(file, 'utf8');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(
      `${file} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
  const parsed = crawlOutputSchema.safeParse(data);
  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    throw new Error(
      `${file} does not match the crawl.json schema at ${issue?.path.join('.') ?? '?'}: ${issue?.message ?? ''}`,
    );
  }
  return parsed.data;
}

// The summary text for crawl.json, or an error naming every count that does not add up.
export async function buildSummary(paths: SummaryPaths): Promise<string> {
  const crawl = await loadCrawl(paths.crawl);
  const problems = crossCheck(crawl);
  if (problems.length > 0) {
    throw new Error(`${paths.crawl} does not add up:\n  ${problems.join('\n  ')}`);
  }
  return formatSummary(renderSummary(crawl), paths.summary);
}

// The first line (1-based) where the two texts differ, with both versions; null when equal.
export function firstDifference(expected: string, actual: string) {
  if (expected === actual) {
    return null;
  }
  const want = expected.split('\n');
  const have = actual.split('\n');
  const index = want.findIndex((line, at) => line !== have[at]);
  const at = index === -1 ? want.length : index;
  return {
    line: at + 1,
    expected: want[at] ?? '(end of file)',
    actual: have[at] ?? '(end of file)',
  };
}

async function readOptional(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function check(paths: SummaryPaths, expected: string, io: CliIo): Promise<number> {
  const actual = await readOptional(paths.summary);
  if (actual === null) {
    io.stderr(`${paths.summary} does not exist; run ${SUMMARY_COMMAND} to write it.\n`);
    return SUMMARY_EXIT_CODES.failed;
  }
  const difference = firstDifference(expected, actual);
  if (difference !== null) {
    io.stderr(
      `${paths.summary} does not match ${paths.crawl} at line ${String(difference.line)}:\n  expected: ${difference.expected}\n  found:    ${difference.actual}\nRegenerate it with ${SUMMARY_COMMAND}; never edit it by hand.\n`,
    );
    return SUMMARY_EXIT_CODES.failed;
  }
  io.stdout(`${paths.summary} matches ${paths.crawl}.\n`);
  return SUMMARY_EXIT_CODES.ok;
}

const processIo: CliIo = {
  stdout: (text) => {
    process.stdout.write(text);
  },
  stderr: (text) => {
    process.stderr.write(text);
  },
};

export async function runSummaryCli(
  argv: readonly string[],
  paths: SummaryPaths = DEFAULT_SUMMARY_PATHS,
  io: CliIo = processIo,
): Promise<number> {
  let values: { check?: boolean; help?: boolean };
  try {
    ({ values } = parseArgs({
      args: [...argv],
      strict: true,
      allowPositionals: false,
      options: { check: { type: 'boolean' }, help: { type: 'boolean', short: 'h' } },
    }));
  } catch (error) {
    io.stderr(`${error instanceof Error ? error.message : String(error)}\n\n${SUMMARY_USAGE}`);
    return SUMMARY_EXIT_CODES.usage;
  }
  if (values.help === true) {
    io.stdout(SUMMARY_USAGE);
    return SUMMARY_EXIT_CODES.ok;
  }
  try {
    const expected = await buildSummary(paths);
    if (values.check === true) {
      return await check(paths, expected, io);
    }
    await writeFile(paths.summary, expected, 'utf8');
    io.stdout(`wrote ${paths.summary}\n`);
    return SUMMARY_EXIT_CODES.ok;
  } catch (error) {
    io.stderr(`crawl summary failed: ${error instanceof Error ? error.message : String(error)}\n`);
    return SUMMARY_EXIT_CODES.failed;
  }
}
