// The coverage sections of redirects/CRAWL.md: hreflang siblings of the Greek pages and the
// orphans found by the one-hop link scan. Counted from crawl.json only.
import type { UrlRecord } from './output';
import { bullets, code, NONE, presentPageTypes, table, type Align } from './summary-markdown';
import { finalResult, hostNames, isDirectPage, recordsOf, type Crawl } from './summary-render';

const SIBLING_LANGS = ['en', 'it', 'sq'] as const;

// The other languages a page links with hreflang: primary subtags, without its own and x-default.
function siblingLangs(record: UrlRecord): Set<string> {
  return new Set(
    Object.keys(record.hreflang)
      .map((key) => key.split(/[-_]/, 1)[0]?.toLowerCase() ?? '')
      .filter((lang) => lang !== '' && lang !== 'x' && lang !== 'el'),
  );
}

function hreflangRow(label: string, records: readonly UrlRecord[]): string[] {
  const sets = records.map((record) => siblingLangs(record));
  const withLang = (lang: string) => String(sets.filter((set) => set.has(lang)).length);
  const all = sets.filter((set) => SIBLING_LANGS.every((lang) => set.has(lang))).length;
  const none = sets.filter((set) => set.size === 0).length;
  return [
    label,
    String(records.length),
    ...SIBLING_LANGS.map((lang) => withLang(lang)),
    String(all),
    String(none),
  ];
}

export function renderHreflang(crawl: Crawl, host: string): string {
  const greek = recordsOf(crawl, host).filter(
    (record) => isDirectPage(record) && record.lang === 'el',
  );
  const types = presentPageTypes(greek.map((record) => record.pageType));
  const rows = types.map((type) =>
    hreflangRow(
      type,
      greek.filter((record) => record.pageType === type),
    ),
  );
  rows.push(hreflangRow('all', greek));
  const header = ['Page type', 'Greek pages', ...SIBLING_LANGS, 'All three', 'None'];
  return [
    '## hreflang coverage of Greek pages',
    `Greek pages: ${host} URLs with \`lang\` \`el\` that answered 200 without a redirect. A sibling is an \`hreflang\` link of the page to another language (\`x-default\` is not counted).`,
    table(header, rows, ['left', ...header.slice(1).map((): Align => 'right')]),
  ].join('\n\n');
}

function linkRow(crawl: Crawl, host: string): string[] {
  const links = crawl.counts.byHost[host]?.links;
  const values =
    links === undefined
      ? []
      : [
          links.scannedPages,
          links.pageLinks,
          links.linkOnlyUrls,
          links.skippedAsset,
          links.skippedQuery,
          links.skippedExternal,
          links.skippedOther,
          links.skippedRobots,
        ];
  return [host, ...values.map(String)];
}

function orphanItem(record: UrlRecord): string {
  const target = record.redirectChain.length > 0 ? ` → ${code(record.finalUrl)}` : '';
  return `${code(record.url)}: ${finalResult(record)}${target} (${record.lang ?? NONE}, ${record.pageType})`;
}

export function renderOrphans(crawl: Crawl): string {
  const header = [
    'Host',
    'Pages scanned',
    'Page links',
    'Link-only URLs',
    'Skipped: asset',
    'query',
    'other host',
    'other',
    'robots',
  ];
  const parts = [
    '## Orphans found by the link hop',
    'Same-host page links on sitemap pages that no sitemap lists, each fetched once (`source: "link"`; their own links were not followed). Page links are counted once per page that has them; skipped links are counted, not listed.',
    table(
      header,
      hostNames(crawl).map((host) => linkRow(crawl, host)),
      ['left', ...header.slice(1).map((): Align => 'right')],
    ),
  ];
  for (const host of hostNames(crawl)) {
    const orphans = recordsOf(crawl, host).filter((record) => record.source === 'link');
    parts.push(
      `### ${host} (${String(orphans.length)})`,
      bullets(orphans.map((record) => orphanItem(record))),
    );
  }
  return parts.join('\n\n');
}
