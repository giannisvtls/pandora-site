// The crawl summary (CRAWL.md): its numbers from a small fixture, the cross-check of crawl.json's
// own counts, Prettier stability, and the CLI's write and --check modes. No network.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { format, resolveConfig } from 'prettier';
import { describe, expect, it } from 'vitest';

import type { CrawlOutput } from '../output';
import {
  crossCheck,
  DEFAULT_SUMMARY_PATHS,
  firstDifference,
  formatSummary,
  renderSummary,
  runSummaryCli,
  SUMMARY_EXIT_CODES,
  SUMMARY_USAGE,
  type SummaryPaths,
} from '../summary-cli';
import { captureIo, useCrawlSandbox } from './run-helpers';
import { smallCrawl } from './summary-fixture';

const { outDir } = useCrawlSandbox();

async function sandbox(crawl: unknown = smallCrawl()): Promise<SummaryPaths> {
  const dir = await outDir();
  const paths = { crawl: path.join(dir, 'crawl.json'), summary: path.join(dir, 'CRAWL.md') };
  await writeFile(paths.crawl, `${JSON.stringify(crawl, null, 2)}\n`, 'utf8');
  return paths;
}

describe('crossCheck', () => {
  it('passes when every sitemap count equals its records', () => {
    expect(crossCheck(smallCrawl())).toStrictEqual([]);
  });

  it('names a sitemap whose count differs from its records', () => {
    const crawl = smallCrawl();
    const counts = crawl.counts.byHost['invetec.eu']!;
    counts.sitemapEntries['page-sitemap'] = 5;
    expect(crossCheck(crawl)).toStrictEqual([
      'invetec.eu: sitemap page-sitemap gave 5 URLs, crawl.json has 4 records from it',
      'invetec.eu: its sitemap files list 7 URLs, but 8 are taken, duplicates or skipped',
    ]);
  });

  it('names a record from a sitemap the counts do not know, and a record of another host', () => {
    const crawl = smallCrawl();
    const privacy = crawl.urls.find((record) => record.url.endsWith('/privacy/'))!;
    privacy.source = 'sitemap:ghost';
    crawl.urls.push({ ...privacy, url: 'https://example.com/', host: 'example.com' });
    expect(crossCheck(crawl)).toStrictEqual([
      'https://example.com/: host example.com is not one of the crawled hosts',
      'invetec.eu: sitemap page-sitemap gave 4 URLs, crawl.json has 3 records from it',
      'invetec.eu: sitemap ghost gave 0 URLs, crawl.json has 1 records from it',
    ]);
  });

  it('names a host whose sitemap files list more URLs than were taken, duplicated or skipped', () => {
    const crawl = smallCrawl();
    const file = crawl.hosts[1]!.sitemaps.find((sitemap) => sitemap.kind === 'urlset')!;
    file.entries += 2;
    crawl.counts.byHost['lenovo.invetec.eu']!.duplicateSitemapEntries = 1;
    expect(crossCheck(crawl)).toStrictEqual([
      'lenovo.invetec.eu: its sitemap files list 5 URLs, but 4 are taken, duplicates or skipped',
    ]);
  });

  it('names link-only and per-host URL counts that differ', () => {
    const crawl = smallCrawl();
    const counts = crawl.counts.byHost['lenovo.invetec.eu']!;
    counts.urls = 5;
    counts.links.linkOnlyUrls = 2;
    expect(crossCheck(crawl)).toStrictEqual([
      'lenovo.invetec.eu: counts say 5 URLs, crawl.json has 4',
      'lenovo.invetec.eu: counts say 2 link-only URLs, crawl.json has 1',
    ]);
  });
});

describe('renderSummary', () => {
  const text = renderSummary(smallCrawl());

  it('has every section of the spec, in order', () => {
    const headings = text.split('\n').filter((line) => line.startsWith('## '));
    expect(headings).toStrictEqual([
      '## Sitemaps and robots.txt',
      '## URLs by host, language and page type',
      '## Status',
      '## noindex pages (2)',
      '## hreflang coverage of Greek pages',
      '## Orphans found by the link hop',
      '## Open item 5: language trees on invetec.eu',
      '## Open item 6: URL groups with no planned new home',
      '## `_redirects` rule limit (for Phase 7)',
    ]);
  });

  it('counts URLs per host and source', () => {
    expect(text).toContain('| invetec.eu | 10 | 7 | 3 |');
    expect(text).toContain('| lenovo.invetec.eu | 4 | 3 | 1 |');
    expect(text).toContain('| All hosts | 14 | 10 | 4 |');
    expect(text).toContain(
      '| `https://invetec.eu/page-sitemap.xml` | 200 | urlset | 4 | 4 | 4 |  |',
    );
  });

  it('counts host x lang x page type, only for the page types present', () => {
    expect(text).toContain(
      '| Host | Lang | home | page | post | tag | product | product-category | shop-system | other | Total |',
    );
    expect(text).toContain('| invetec.eu | el | 1 | 1 | 0 | 1 | 0 | 0 | 0 | 2 | 5 |');
    expect(text).toContain('| invetec.eu | it | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 3 |');
    expect(text).toContain('| invetec.eu | all | 1 | 3 | 1 | 2 | 0 | 0 | 0 | 3 | 10 |');
    expect(text).toContain('| lenovo.invetec.eu | en | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 1 | 4 |');
  });

  it('lists final results, non-200 URLs, loops and redirects', () => {
    expect(text).toContain('| invetec.eu | HTTP 200 | 8 | 1 |');
    expect(text).toContain('| invetec.eu | HTTP 404 | 1 | 0 |');
    expect(text).toContain('| invetec.eu | redirect-loop | 1 | 1 |');
    expect(text).toContain('### Not 200 (2)');
    expect(text).toContain('- `https://invetec.eu/missing/`: HTTP 404 (`link`)');
    expect(text).toContain(
      '- `https://invetec.eu/loop/` → `https://invetec.eu/loop/` (301, 301; redirect-loop)',
    );
    expect(text).toContain('### Redirects (1)');
    expect(text).toContain('Chains: 1 hop 1.');
    expect(text).toContain(
      '- `https://invetec.eu/it/old-post/` → `https://invetec.eu/it/new-post/` (301; HTTP 200)',
    );
  });

  it('lists noindex pages', () => {
    expect(text).toContain('- `https://invetec.eu/privacy/`: `noindex, nofollow` (el, page)');
    expect(text).toContain(
      '- `https://lenovo.invetec.eu/cart/`: `noindex, follow` (en, shop-system)',
    );
  });

  it('counts hreflang siblings of Greek pages, without x-default', () => {
    expect(text).toContain('| home | 1 | 1 | 1 | 1 | 1 | 0 |');
    expect(text).toContain('| tag | 1 | 1 | 0 | 0 | 0 | 0 |');
    expect(text).toContain('| all | 3 | 2 | 1 | 1 | 1 | 1 |');
  });

  it('lists the link-hop orphans per host', () => {
    expect(text).toContain('| invetec.eu | 5 | 40 | 3 | 2 | 1 | 7 | 0 | 0 |');
    expect(text).toContain('### invetec.eu (3)');
    expect(text).toContain('- `https://invetec.eu/b2b/it/offerta/`: HTTP 200 (it, other)');
    expect(text).toContain('### lenovo.invetec.eu (1)');
  });

  it('answers Open item 5 from <html lang> per path tree', () => {
    expect(text).toContain(
      '**Answer:** invetec.eu serves 4 language trees: root `/` (`<html lang="el">` on 3 of 4 pages), `/en/` (`<html lang="en-US">` on 1 of 1 pages), `/it/` (`<html lang="it-IT">` on 1 of 1 pages), `/sq/` (`<html lang="sq">` on 1 of 1 pages).',
    );
    expect(text).toContain('| root `/` | 4 | `el` 3, `it-IT` 1 |');
    expect(text).toContain(
      '- `https://invetec.eu/b2b/it/offerta/`: tree root `/`, `<html lang>` `it-IT` (other)',
    );
    expect(text).toContain('| root `/` (no language) | 3 | `en-US` 3 |');
  });

  it('groups Open item 6 candidates without mapping them', () => {
    expect(text).toContain('Apart from posts (the model holds 8, against the count below), none');
    expect(text).toContain('| lenovo.invetec.eu product pages | product | 1 | 1 | 1 | en 1 |');
    expect(text).toContain(
      '| lenovo.invetec.eu other URLs | other 1, shop-system 1 | 2 | 2 | 2 | en 2 |',
    );
    // The one post redirects: it ends in a 200 but is not a page of its own.
    expect(text).toContain(
      '| invetec.eu posts (the content model holds 8) | post | 1 | 1 | 0 | it 1 |',
    );
    expect(text).toContain('| invetec.eu tag archives | tag | 2 | 2 | 2 | el 1, sq 1 |');
    expect(text).toContain('| invetec.eu author archives | author | 0 | 0 | 0 | (none) |');
    expect(text).toContain('Not grouped: 3 URLs of invetec.eu have page type `other` (3 of them');
    expect(text).toContain('Not in the table either: home 1, page 3 (page types of invetec.eu');
    expect(text).toContain(
      '- `https://invetec.eu/it/infotainment-car-it/`: HTTP 200 (it, page, `sitemap:page-sitemap`)',
    );
  });

  it('compares the total to the _redirects static limit without deciding', () => {
    expect(text).toContain(
      '14 crawled URLs (invetec.eu 10, lenovo.invetec.eu 4) against the Cloudflare Pages `_redirects` limit of 2000 static and 100 dynamic rules (roadmap section 1): one static rule per crawled URL is within the static limit. Flagged for Phase 7; no decision here.',
    );
  });
});

describe('formatSummary', () => {
  it('returns Prettier-formatted Markdown that a second pass leaves unchanged', async () => {
    const file = DEFAULT_SUMMARY_PATHS.summary;
    const formatted = await formatSummary(renderSummary(smallCrawl()), file);
    const config = (await resolveConfig(file, { editorconfig: true })) ?? {};
    expect(await format(formatted, { ...config, filepath: file })).toBe(formatted);
    expect(formatted).toContain('| invetec.eu        |   10 |             7 |             3 |');
  });
});

describe('firstDifference', () => {
  it('names the first differing line, or null', () => {
    expect(firstDifference('a\nb\n', 'a\nb\n')).toBeNull();
    expect(firstDifference('a\nb\nc', 'a\nB\nc')).toStrictEqual({
      line: 2,
      expected: 'b',
      actual: 'B',
    });
    expect(firstDifference('a\nb', 'a')).toStrictEqual({
      line: 2,
      expected: 'b',
      actual: '(end of file)',
    });
  });
});

describe('runSummaryCli', () => {
  it('writes CRAWL.md, then --check passes', async () => {
    const paths = await sandbox();
    const writeIo = captureIo();
    expect(await runSummaryCli([], paths, writeIo)).toBe(SUMMARY_EXIT_CODES.ok);
    expect(writeIo.out.join('')).toBe(`wrote ${paths.summary}\n`);
    const written = await readFile(paths.summary, 'utf8');
    const expected = renderSummary(smallCrawl());
    expect(written).toBe(await formatSummary(expected, paths.summary));

    const checkIo = captureIo();
    expect(await runSummaryCli(['--check'], paths, checkIo)).toBe(SUMMARY_EXIT_CODES.ok);
    expect(checkIo.out.join('')).toContain('matches');
    expect(await readFile(paths.summary, 'utf8')).toBe(written);
  });

  it('--check fails on a number edited by hand and names the line', async () => {
    const paths = await sandbox();
    await runSummaryCli([], paths, captureIo());
    const written = await readFile(paths.summary, 'utf8');
    const edited = written.replace('14 crawled URLs', '15 crawled URLs');
    expect(edited).not.toBe(written);
    await writeFile(paths.summary, edited, 'utf8');

    const io = captureIo();
    expect(await runSummaryCli(['--check'], paths, io)).toBe(SUMMARY_EXIT_CODES.failed);
    const line = written.split('\n').findIndex((text) => text.startsWith('14 crawled URLs')) + 1;
    const error = io.err.join('');
    expect(error).toContain(`at line ${String(line)}:`);
    expect(error).toContain('expected: 14 crawled URLs');
    expect(error).toContain('found:    15 crawled URLs');
    expect(await readFile(paths.summary, 'utf8')).toBe(edited);
  });

  it('--check fails when CRAWL.md is missing', async () => {
    const paths = await sandbox();
    const io = captureIo();
    expect(await runSummaryCli(['--check'], paths, io)).toBe(SUMMARY_EXIT_CODES.failed);
    expect(io.err.join('')).toContain('does not exist');
  });

  it('refuses a crawl.json whose counts do not add up, and writes nothing', async () => {
    const crawl: CrawlOutput = smallCrawl();
    crawl.counts.byHost['invetec.eu']!.sitemapEntries['post-sitemap'] = 2;
    const paths = await sandbox(crawl);
    const io = captureIo();
    expect(await runSummaryCli([], paths, io)).toBe(SUMMARY_EXIT_CODES.failed);
    expect(io.err.join('')).toContain(
      'invetec.eu: sitemap post-sitemap gave 2 URLs, crawl.json has 1 records from it',
    );
    await expect(readFile(paths.summary, 'utf8')).rejects.toThrow(/ENOENT/);
  });

  it('refuses a crawl.json that breaks the schema, naming the file and the path', async () => {
    const crawl = smallCrawl();
    const paths = await sandbox({ ...crawl, counts: { ...crawl.counts, urls: 99 } });
    const io = captureIo();
    expect(await runSummaryCli(['--check'], paths, io)).toBe(SUMMARY_EXIT_CODES.failed);
    expect(io.err.join('')).toContain(
      `${paths.crawl} does not match the crawl.json schema at counts.urls`,
    );
  });

  it('prints the usage for --help and on a bad flag', async () => {
    const help = captureIo();
    expect(await runSummaryCli(['--help'], DEFAULT_SUMMARY_PATHS, help)).toBe(
      SUMMARY_EXIT_CODES.ok,
    );
    expect(help.out.join('')).toBe(SUMMARY_USAGE);

    const bad = captureIo();
    expect(await runSummaryCli(['--fix'], DEFAULT_SUMMARY_PATHS, bad)).toBe(
      SUMMARY_EXIT_CODES.usage,
    );
    expect(bad.err.join('')).toContain(SUMMARY_USAGE);
  });
});

describe('the committed inventory', () => {
  it('redirects/CRAWL.md matches redirects/crawl.json', async () => {
    const io = captureIo();
    const code = await runSummaryCli(['--check'], DEFAULT_SUMMARY_PATHS, io);
    expect(io.err.join('')).toBe('');
    expect(code).toBe(SUMMARY_EXIT_CODES.ok);
  });
});
