import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildOutput,
  crawlOutputSchema,
  sortAndDedupe,
  writeJsonAtomic,
  type LinkCounts,
  type UrlRecord,
} from '../output';
import { temporaryDirectory } from './helpers';

function record(url: string, overrides: Partial<UrlRecord> = {}): UrlRecord {
  return {
    url,
    host: new URL(url).host,
    source: 'sitemap:page-sitemap',
    lastmod: null,
    status: 200,
    redirectChain: [],
    finalUrl: url,
    contentType: 'text/html; charset=UTF-8',
    htmlLang: 'el',
    pathLang: 'el',
    lang: 'el',
    pageType: 'page',
    title: null,
    canonical: null,
    hreflang: {},
    robotsMeta: null,
    error: null,
    ...overrides,
  };
}

const NO_LINKS: LinkCounts = {
  scannedPages: 0,
  pageLinks: 0,
  linkOnlyUrls: 0,
  skippedAsset: 0,
  skippedQuery: 0,
  skippedExternal: 0,
  skippedOther: 0,
  skippedRobots: 0,
};

function input(records: UrlRecord[]) {
  return {
    crawledAt: '2026-10-09T10:00:00.000Z',
    tool: { name: 'pandora-site-crawl', version: '1.0.0' },
    hosts: [{ host: 'invetec.eu', origin: 'https://invetec.eu', rootLang: 'el', sitemaps: [] }],
    robots: {},
    sitemapCounts: {
      'invetec.eu': {
        sitemapEntries: {},
        duplicateSitemapEntries: 0,
        skippedSitemapEntries: { query: 0, offHost: 0, invalid: 0 },
      },
    },
    links: { 'invetec.eu': NO_LINKS },
    records,
  };
}

describe('sortAndDedupe', () => {
  it('keeps the first record per url and sorts by code unit, not by locale', () => {
    const records = [
      record('https://invetec.eu/en/b/'),
      record('https://invetec.eu/%ce%b1/'),
      record('https://invetec.eu/en/a/', { title: 'first' }),
      record('https://invetec.eu/en/B/'),
      record('https://invetec.eu/en/a/', { title: 'second' }),
      record('https://invetec.eu/%CE%B1/'),
    ];

    const sorted = sortAndDedupe(records);

    expect(sorted.map((item) => item.url)).toStrictEqual([
      'https://invetec.eu/%CE%B1/',
      'https://invetec.eu/%ce%b1/',
      'https://invetec.eu/en/B/',
      'https://invetec.eu/en/a/',
      'https://invetec.eu/en/b/',
    ]);
    expect(sorted.find((item) => item.url === 'https://invetec.eu/en/a/')?.title).toBe('first');
  });
});

describe('buildOutput', () => {
  it('builds the spec shape with urls sorted, unique and counted per host', () => {
    const output = buildOutput(
      input([
        record('https://invetec.eu/en/'),
        record('https://invetec.eu/'),
        record('https://invetec.eu/en/'),
      ]),
    );

    expect(Object.keys(output)).toStrictEqual([
      'crawledAt',
      'tool',
      'hosts',
      'robots',
      'counts',
      'urls',
    ]);
    expect(output.urls.map((item) => item.url)).toStrictEqual([
      'https://invetec.eu/',
      'https://invetec.eu/en/',
    ]);
    expect(output.counts.urls).toBe(2);
    expect(output.counts.byHost['invetec.eu']?.urls).toBe(2);
  });

  it('rejects a record with a field the spec does not list', () => {
    const extra = { ...record('https://invetec.eu/'), surprise: true } as UrlRecord;
    expect(() => buildOutput(input([extra]))).toThrow();
  });
});

describe('crawlOutputSchema', () => {
  const valid = buildOutput(
    input([record('https://invetec.eu/'), record('https://invetec.eu/en/')]),
  );

  it('accepts the built output', () => {
    expect(crawlOutputSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects unsorted or duplicate urls and a wrong total', () => {
    const [first, second] = valid.urls;
    const unsorted = { ...valid, urls: [second, first] };
    const duplicated = { ...valid, urls: [first, first] };
    const miscounted = { ...valid, counts: { ...valid.counts, urls: 3 } };

    expect(crawlOutputSchema.safeParse(unsorted).success).toBe(false);
    expect(crawlOutputSchema.safeParse(duplicated).success).toBe(false);
    expect(crawlOutputSchema.safeParse(miscounted).success).toBe(false);
  });
});

describe('writeJsonAtomic', () => {
  const cleanups: (() => Promise<void>)[] = [];
  afterEach(async () => {
    await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
  });

  it('writes pretty UTF-8 JSON with real Greek characters and leaves no side file', async () => {
    const { dir, remove } = await temporaryDirectory();
    cleanups.push(remove);
    const file = path.join(dir, 'crawl.json');

    await writeJsonAtomic(file, { title: 'Επικοινωνία' });

    expect(await readFile(file, 'utf8')).toBe('{\n  "title": "Επικοινωνία"\n}\n');
    expect(await readdir(dir)).toStrictEqual(['crawl.json']);
  });
});
