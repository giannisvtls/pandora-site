// The inventory sections of redirects/CRAWL.md, computed from crawl.json only: totals, sitemaps
// and robots.txt, counts by host x lang x page type, status and noindex. hreflang and the
// link-hop orphans are in summary-coverage.ts, the open items in summary-open-items.ts.
import type { CrawlOutput, UrlRecord } from './output';
import {
  breakdown,
  bullets,
  code,
  NONE,
  plural,
  presentPageTypes,
  sortedKeys,
  sortedLangs,
  table,
  tally,
  type Align,
} from './summary-markdown';

export type Crawl = CrawlOutput;

export const SUMMARY_COMMAND = 'npm run crawl:summary';

export const isOk = (record: UrlRecord): boolean => record.status === 200 && record.error === null;

// A page of its own: 200 without a redirect (a redirected URL describes its target).
export const isDirectPage = (record: UrlRecord): boolean =>
  isOk(record) && record.redirectChain.length === 0;

export function recordsOf(crawl: Crawl, host: string): UrlRecord[] {
  return crawl.urls.filter((record) => record.host === host);
}

export function hostNames(crawl: Crawl): string[] {
  return crawl.hosts.map((host) => host.host);
}

// `HTTP 404`, or the error that ended the URL (`redirect-loop`, `network: ...`, `timeout`).
export function finalResult(record: UrlRecord): string {
  if (record.error !== null) {
    return record.error;
  }
  return record.status === null ? NONE : `HTTP ${String(record.status)}`;
}

function sourceCount(records: readonly UrlRecord[], source: string): number {
  return records.filter((record) => record.source === source).length;
}

export function renderHeader(crawl: Crawl): string {
  const rows = hostNames(crawl).map((host) => {
    const records = recordsOf(crawl, host);
    const links = sourceCount(records, 'link');
    return [host, String(records.length), String(records.length - links), String(links)];
  });
  const links = sourceCount(crawl.urls, 'link');
  rows.push([
    'All hosts',
    String(crawl.urls.length),
    String(crawl.urls.length - links),
    String(links),
  ]);
  return [
    '# Live URL inventory',
    `Generated from \`crawl.json\` by \`${SUMMARY_COMMAND}\`; do not edit by hand. \`${SUMMARY_COMMAND} -- --check\` fails when this file and \`crawl.json\` disagree.`,
    `Crawled at ${crawl.crawledAt} by ${crawl.tool.name} ${crawl.tool.version}.`,
    table(['Host', 'URLs', 'From sitemaps', 'Link hop only'], rows, [
      'left',
      'right',
      'right',
      'right',
    ]),
  ].join('\n\n');
}

function robotsLine(crawl: Crawl, host: string): string {
  const robots = crawl.robots[host];
  if (robots === undefined) {
    return 'robots.txt: not in crawl.json.';
  }
  const list = (rules: readonly string[]) =>
    rules.length === 0 ? NONE : rules.map((rule) => code(rule)).join(', ');
  // A refused robots.txt has both (`HTTP 301, redirect-off-site`): the host is disallow-all.
  const result = [
    robots.status === null ? null : `HTTP ${String(robots.status)}`,
    robots.error,
  ].filter((part) => part !== null);
  const status = result.length === 0 ? NONE : result.join(', ');
  const delay = robots.crawlDelay === null ? NONE : `${String(robots.crawlDelay)} s`;
  return [
    `robots.txt (${code(robots.url)}): ${status}.`,
    `\`User-agent: *\` disallows ${list(robots.disallow)}; allows ${list(robots.allow)}; Crawl-delay: ${delay}.`,
    `Sitemap lines: ${list(robots.sitemaps)}.`,
  ].join(' ');
}

function sitemapTable(crawl: Crawl, host: string): string {
  const summary = crawl.hosts.find((entry) => entry.host === host);
  const taken = crawl.counts.byHost[host]?.sitemapEntries ?? {};
  const records = recordsOf(crawl, host);
  const rows = (summary?.sitemaps ?? []).map((file) => {
    const fromFile = taken[file.name];
    return [
      code(file.url),
      file.status === null ? NONE : String(file.status),
      file.kind,
      String(file.entries),
      fromFile === undefined ? '-' : String(fromFile),
      fromFile === undefined ? '-' : String(sourceCount(records, `sitemap:${file.name}`)),
      file.note ?? '',
    ];
  });
  const align: Align[] = ['left', 'right', 'left', 'right', 'right', 'right', 'left'];
  const header = ['Sitemap file', 'HTTP', 'Kind', 'Entries', 'URLs taken', 'Records', 'Note'];
  return table(header, rows, align);
}

export function renderSitemaps(crawl: Crawl): string {
  const parts = [
    '## Sitemaps and robots.txt',
    '`Entries` is what the file lists, `URLs taken` what the crawl took from it, `Records` the URLs in `crawl.json` whose `source` is that file. The generator refuses to write this file unless `URLs taken` equals `Records` for every file, so every sitemap URL has exactly one record.',
  ];
  for (const host of hostNames(crawl)) {
    const counts = crawl.counts.byHost[host];
    const skipped = counts?.skippedSitemapEntries;
    parts.push(
      `### ${host}`,
      robotsLine(crawl, host),
      sitemapTable(crawl, host),
      `Duplicate sitemap entries: ${String(counts?.duplicateSitemapEntries ?? 0)}. Skipped entries: ${String(skipped?.query ?? 0)} with a query string, ${String(skipped?.offHost ?? 0)} on another host, ${String(skipped?.invalid ?? 0)} invalid.`,
    );
  }
  return parts.join('\n\n');
}

export function renderCounts(crawl: Crawl): string {
  const types = presentPageTypes(crawl.urls.map((record) => record.pageType));
  const rows: string[][] = [];
  for (const host of hostNames(crawl)) {
    const records = recordsOf(crawl, host);
    const byLang = tally(records, (record) => record.lang);
    for (const lang of sortedLangs(byLang.keys())) {
      const ofLang = records.filter((record) => (record.lang ?? NONE) === lang);
      const byType = tally(ofLang, (record) => record.pageType);
      rows.push([
        host,
        lang,
        ...types.map((type) => String(byType.get(type) ?? 0)),
        String(ofLang.length),
      ]);
    }
    const byType = tally(records, (record) => record.pageType);
    rows.push([
      host,
      'all',
      ...types.map((type) => String(byType.get(type) ?? 0)),
      String(records.length),
    ]);
  }
  const align: Align[] = ['left', 'left', ...types.map((): Align => 'right'), 'right'];
  return [
    '## URLs by host, language and page type',
    "`lang` is the primary subtag of the final page's `<html lang>`, else the path language (`/en/`, `/it/`, `/sq/`; any other path is `el` on invetec.eu and has none on lenovo.invetec.eu). The page type comes from the sitemap file, else the URL pattern.",
    table(['Host', 'Lang', ...types, 'Total'], rows, align),
  ].join('\n\n');
}

function statusTable(crawl: Crawl): string {
  const rows: string[][] = [];
  for (const host of hostNames(crawl)) {
    const records = recordsOf(crawl, host);
    const byResult = tally(records, finalResult);
    for (const result of sortedKeys(byResult)) {
      const ofResult = records.filter((record) => finalResult(record) === result);
      const redirected = ofResult.filter((record) => record.redirectChain.length > 0).length;
      rows.push([host, result, String(ofResult.length), String(redirected)]);
    }
  }
  return table(['Host', 'Final result', 'URLs', 'After a redirect'], rows, [
    'left',
    'left',
    'right',
    'right',
  ]);
}

function hops(record: UrlRecord): string {
  return record.redirectChain.map((hop) => String(hop.status)).join(', ');
}

function redirectItem(record: UrlRecord): string {
  const last = record.redirectChain.at(-1);
  const target = record.error === null ? record.finalUrl : (last?.location ?? record.finalUrl);
  return `${code(record.url)} → ${code(target)} (${hops(record)}; ${finalResult(record)})`;
}

export function renderStatus(crawl: Crawl): string {
  const notOk = crawl.urls.filter((record) => !isOk(record));
  const stopped = notOk.filter(
    (record) => record.redirectChain.length > 0 && record.error !== null,
  );
  const redirected = crawl.urls.filter(
    (record) => record.redirectChain.length > 0 && record.error === null,
  );
  const chains = tally(redirected, (record) => plural(record.redirectChain.length, 'hop', 'hops'));
  return [
    '## Status',
    statusTable(crawl),
    `### Not 200 (${String(notOk.length)})`,
    bullets(
      notOk.map((record) => {
        const after =
          record.redirectChain.length > 0
            ? `, after ${hops(record)} → ${code(record.finalUrl)}`
            : '';
        return `${code(record.url)}: ${finalResult(record)}${after} (${code(record.source)})`;
      }),
    ),
    `### Redirect loops and stopped redirects (${String(stopped.length)})`,
    bullets(stopped.map((record) => redirectItem(record))),
    `### Redirects (${String(redirected.length)})`,
    `Redirect statuses per hop, then the final result. Chains: ${breakdown(chains)}.`,
    bullets(redirected.map((record) => redirectItem(record))),
  ].join('\n\n');
}

export function renderNoindex(crawl: Crawl): string {
  const metaRows: string[][] = [];
  for (const host of hostNames(crawl)) {
    const metas = tally(recordsOf(crawl, host), (record) => record.robotsMeta);
    for (const meta of sortedKeys(metas)) {
      metaRows.push([host, meta === NONE ? NONE : code(meta), String(metas.get(meta) ?? 0)]);
    }
  }
  // `none` is `noindex, nofollow`.
  const noindex = crawl.urls.filter((record) =>
    /\b(?:noindex|none)\b/i.test(record.robotsMeta ?? ''),
  );
  const pages = noindex.filter((record) => isDirectPage(record));
  const redirected = noindex.filter((record) => !isDirectPage(record));
  return [
    `## noindex pages (${String(pages.length)})`,
    '`<meta name="robots">` of the final page, per host (none: no tag, or the body was not read because the page did not answer 200 HTML):',
    table(['Host', 'Robots meta', 'URLs'], metaRows, ['left', 'left', 'right']),
    bullets(
      pages.map(
        (record) =>
          `${code(record.url)}: ${code(record.robotsMeta ?? '')} (${record.lang ?? NONE}, ${record.pageType})`,
      ),
    ),
    `### URLs that redirect to a noindex page (${String(redirected.length)})`,
    bullets(
      redirected.map(
        (record) =>
          `${code(record.url)} → ${code(record.finalUrl)}: ${code(record.robotsMeta ?? '')}`,
      ),
    ),
  ].join('\n\n');
}
