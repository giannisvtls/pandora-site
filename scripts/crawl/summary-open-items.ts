// The roadmap sections of redirects/CRAWL.md: Open item 5 (language trees), Open item 6 (URL
// groups with no planned new home) and the `_redirects` rule-limit line for Phase 7. Facts from
// crawl.json only: nothing here maps an old URL to a new page or makes a decision.
import type { PageType } from './classify';
import { byCodeUnit, type UrlRecord } from './output';
import {
  breakdown,
  bullets,
  code,
  langBreakdown,
  NONE,
  plural,
  sortedLangs,
  table,
  tally,
  type Align,
} from './summary-markdown';
import {
  finalResult,
  hostNames,
  isDirectPage,
  isOk,
  recordsOf,
  type Crawl,
} from './summary-render';

// The two crawled hosts (scripts/crawl/config.ts HOSTS).
export const MAIN_HOST = 'invetec.eu';
export const SHOP_HOST = 'lenovo.invetec.eu';

// Cloudflare Pages `_redirects` limits, as the roadmap states them (section 1).
export const PAGES_STATIC_REDIRECTS = 2000;
export const PAGES_DYNAMIC_REDIRECTS = 100;

// The roadmap's content model (section 4) holds 8 posts (BRIEF).
const PLANNED_POSTS = 8;

function treeLabel(pathLang: string | null): string {
  if (pathLang === null) {
    return `root ${code('/')} (no language)`;
  }
  return ['en', 'it', 'sq'].includes(pathLang) ? code(`/${pathLang}/`) : `root ${code('/')}`;
}

const primary = (htmlLang: string | null): string | null =>
  htmlLang?.split(/[-_]/, 1)[0]?.toLowerCase() ?? null;

// The `<html lang>` values of a tree's pages, the most frequent first (then by code unit).
function htmlLangs(pages: readonly UrlRecord[]): [string, number][] {
  return [...tally(pages, (record) => record.htmlLang)].toSorted(
    ([a, countA], [b, countB]) => countB - countA || byCodeUnit(a, b),
  );
}

function treeTable(pages: readonly UrlRecord[]): string {
  const byTree = tally(pages, (record) => record.pathLang);
  const rows = sortedLangs(byTree.keys()).map((tree) => {
    const ofTree = pages.filter((record) => (record.pathLang ?? NONE) === tree);
    const langs = htmlLangs(ofTree).map(
      ([lang, n]) => `${lang === NONE ? NONE : code(lang)} ${String(n)}`,
    );
    return [treeLabel(tree === NONE ? null : tree), String(ofTree.length), langs.join(', ')];
  });
  return table(['Tree', 'Pages', '`<html lang>` values'], rows, ['left', 'right', 'left']);
}

function answerLine(pages: readonly UrlRecord[]): string {
  const byTree = tally(pages, (record) => record.pathLang);
  const trees = sortedLangs(byTree.keys()).map((tree) => {
    const ofTree = pages.filter((record) => (record.pathLang ?? NONE) === tree);
    const [top] = htmlLangs(ofTree);
    const lang = top === undefined || top[0] === NONE ? NONE : `\`<html lang="${top[0]}">\``;
    return `${treeLabel(tree === NONE ? null : tree)} (${lang} on ${String(top?.[1] ?? 0)} of ${String(ofTree.length)} pages)`;
  });
  return `**Answer:** ${MAIN_HOST} serves ${plural(trees.length, 'language tree', 'language trees')}: ${trees.join(', ')}.`;
}

export function renderOpenItem5(crawl: Crawl): string {
  const pages = recordsOf(crawl, MAIN_HOST).filter((record) => isDirectPage(record));
  const mismatched = pages.filter(
    (record) => record.pathLang !== null && primary(record.htmlLang) !== record.pathLang,
  );
  const shopPages = recordsOf(crawl, SHOP_HOST).filter((record) => isDirectPage(record));
  return [
    '## Open item 5: language trees on invetec.eu',
    'Pages are URLs that answered 200 without a redirect. A tree is the path prefix (`/en/`, `/it/`, `/sq/`, else the root); `<html lang>` is read from each page.',
    answerLine(pages),
    treeTable(pages),
    `### Pages whose \`<html lang>\` does not match their tree (${String(mismatched.length)})`,
    bullets(
      mismatched.map(
        (record) =>
          `${code(record.url)}: tree ${treeLabel(record.pathLang)}, \`<html lang>\` ${record.htmlLang === null ? NONE : code(record.htmlLang)} (${record.pageType})`,
      ),
    ),
    `### ${SHOP_HOST}`,
    `For comparison (its paths have no root language): ${plural(shopPages.length, 'page', 'pages')}.`,
    treeTable(shopPages),
  ].join('\n\n');
}

interface Group {
  readonly label: string;
  readonly host: string;
  readonly types: readonly PageType[];
}

const SHOP_OTHER: readonly PageType[] = [
  'home',
  'page',
  'post',
  'category',
  'tag',
  'author',
  'shop-system',
  'other',
];

const GROUPS: readonly Group[] = [
  { label: `${SHOP_HOST} product pages`, host: SHOP_HOST, types: ['product'] },
  { label: `${SHOP_HOST} product categories`, host: SHOP_HOST, types: ['product-category'] },
  { label: `${SHOP_HOST} product tags`, host: SHOP_HOST, types: ['product-tag'] },
  { label: `${SHOP_HOST} other URLs`, host: SHOP_HOST, types: SHOP_OTHER },
  {
    label: `${MAIN_HOST} posts (the content model holds ${String(PLANNED_POSTS)})`,
    host: MAIN_HOST,
    types: ['post'],
  },
  { label: `${MAIN_HOST} tag archives`, host: MAIN_HOST, types: ['tag'] },
  { label: `${MAIN_HOST} category archives`, host: MAIN_HOST, types: ['category'] },
  { label: `${MAIN_HOST} author archives`, host: MAIN_HOST, types: ['author'] },
  {
    label: `${MAIN_HOST} shop, cart, checkout and account pages`,
    host: MAIN_HOST,
    types: ['shop-system'],
  },
];

function decodedPath(url: string): string {
  const path = new URL(url).pathname;
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function groupRow(crawl: Crawl, group: Group): string[] {
  const records = recordsOf(crawl, group.host).filter((record) =>
    group.types.includes(record.pageType),
  );
  const types =
    group.types.length > 1
      ? breakdown(tally(records, (record) => record.pageType))
      : group.types.join('');
  return [
    group.label,
    types,
    String(records.length),
    String(records.filter((record) => isOk(record)).length),
    langBreakdown(tally(records, (record) => record.lang)),
  ];
}

export function renderOpenItem6(crawl: Crawl): string {
  const infotainment = crawl.urls.filter((record) => /infotainment/i.test(decodedPath(record.url)));
  const align: Align[] = ['left', 'left', 'right', 'right', 'left'];
  const untyped = recordsOf(crawl, MAIN_HOST).filter((record) => record.pageType === 'other');
  const untypedLinks = untyped.filter((record) => record.source === 'link').length;
  return [
    '## Open item 6: URL groups with no planned new home',
    `The roadmap's content model (section 4) has products (16 systems), accessories, ${String(PLANNED_POSTS)} posts, FAQ, installers and one site-copy global per page group; L1 Infotainment (Italian only) is outside the build scope. None of the groups below has a page type in that model; for posts the model holds ${String(PLANNED_POSTS)} against the count below. This section maps no URL to a new page: Phase 7 decides.`,
    table(
      ['Group', 'Page types', 'URLs', 'Answer 200', 'Languages (`lang`)'],
      GROUPS.map((group) => groupRow(crawl, group)),
      align,
    ),
    `Not grouped: ${plural(untyped.length, 'URL', 'URLs')} of ${MAIN_HOST} have page type \`other\` (${String(untypedLinks)} of them link-only, listed under Orphans); the crawl cannot tell whether they have a new home.`,
    `### URLs whose path mentions infotainment (${String(infotainment.length)})`,
    'The roadmap names `/it/infotainment-car-carplay-android-auto-universal-it/` as an example of an old URL with no new home.',
    bullets(
      infotainment.map(
        (record) =>
          `${code(record.url)}: ${finalResult(record)} (${record.lang ?? NONE}, ${record.pageType}, ${code(record.source)})`,
      ),
    ),
  ].join('\n\n');
}

export function renderRedirectLimit(crawl: Crawl): string {
  const total = crawl.urls.length;
  const perHost = hostNames(crawl)
    .map((host) => `${host} ${String(recordsOf(crawl, host).length)}`)
    .join(', ');
  const side = total > PAGES_STATIC_REDIRECTS ? 'above' : 'within';
  return [
    '## `_redirects` rule limit (for Phase 7)',
    `${String(total)} crawled URLs (${perHost}) against the Cloudflare Pages \`_redirects\` limit of ${String(PAGES_STATIC_REDIRECTS)} static and ${String(PAGES_DYNAMIC_REDIRECTS)} dynamic rules (roadmap section 1): one static rule per crawled URL is ${side} the static limit. Flagged for Phase 7; no decision here.`,
  ].join('\n\n');
}
