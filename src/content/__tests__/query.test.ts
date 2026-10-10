// The query module (spec §5) on fixtures (./rules-fixtures.ts) and on the snapshot: the items each
// language shows, with their links; the static paths of the built languages; the readiness check
// that fails a build; and the rule that under src/ only content.config.ts and query.ts (the
// adapter) import astro:content, no page among them.
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { byCodeUnit } from '../../../scripts/crawl/output';
import { LOCALES, SITE_COPY, type Locale } from '../contract';
import { createQuery } from '../query';
import { fixtureContent, snapshot, withLanguage } from './rules-fixtures';

const SRC_DIR = fileURLToPath(new URL('../../', import.meta.url));

const idsOf = (items: readonly { id: string }[]) => items.map(({ id }) => id);

// Every language built (no readiness check), English only, and English + a complete Greek.
const preview = createQuery(fixtureContent(), { preview: true });
const englishOnly = createQuery(fixtureContent(), { preview: false });
const withGreek = createQuery(withLanguage(fixtureContent(['en', 'el']), 'el'), {
  preview: false,
});
const site = createQuery(snapshot, { preview: false });

// The Phase 2 page types, built in these tests only.
const ITEM_PAGES = createQuery(fixtureContent(), {
  preview: true,
  pageTypes: ['home', 'category', 'product', 'accessory', 'post'],
});

describe('the items a language shows', () => {
  it('lists the visible products per language, each with its page and level', () => {
    expect(LOCALES.map((locale) => [locale, idsOf(preview.products(locale))])).toEqual([
      ['en', ['elite', 'smart', 'light']],
      ['el', ['elite']],
      ['it', ['tracer']],
      ['sq', []],
    ]);
    expect(preview.products('el')).toMatchObject([
      { id: 'elite', url: '/el/systems/car/elite/', level: 1 },
    ]);
    expect(preview.products('it')).toMatchObject([{ url: '/it/systems/car/tracer/' }]);
  });

  it('gives the snapshot products their level, Finder and Tracer 3 (P1-7)', () => {
    const levels = Object.fromEntries(site.products('en').map(({ id, level }) => [id, level]));

    expect(levels).toMatchObject({ finder: 3, tracer: 3, elite: 3, light: 2, motov2: 1 });
    expect(site.products('en')).toHaveLength(16);
  });

  it('gives an accessory its page under its first vehicle, and none without a vehicle', () => {
    expect(preview.accessories('en')).toMatchObject([
      { id: 'd-061', url: '/en/accessories/car/d-061/', fits: ['elite', 'smart', 'light'] },
      { id: 'band', url: undefined },
    ]);
    expect(preview.accessories('el')).toMatchObject([{ id: 'd-061', fits: ['elite'] }]);
  });

  it("gives a post its page with the language's slug", () => {
    expect(preview.posts('en')).toMatchObject([{ id: 'motodays', url: '/en/blog/news-en/' }]);
    expect(preview.posts('el')).toMatchObject([{ id: 'motodays', url: '/el/blog/news-el/' }]);
    expect(preview.posts('it')).toEqual([]);
  });

  it('lists the categories and the nav sections in their order, the sections with their link', () => {
    expect(idsOf(site.categories('en'))).toEqual(['car', 'moto', 'camper', 'marine', 'fleet']);
    expect(site.navSections('en').map(({ id, url }) => [id, url])).toEqual([
      ['systems', '/en/systems/car/'],
      ['compare', '/en/compare/'],
      ['installers', '/en/installers/'],
      ['blog', '/en/blog/'],
      ['partners', '/en/partners/'],
      ['contact', '/en/contact/'],
    ]);
  });

  it('sorts categories and nav sections by their order, not by their place in the file', () => {
    const reversed = createQuery(
      {
        ...snapshot,
        categories: snapshot.categories.toReversed(),
        navSections: snapshot.navSections.toReversed(),
      },
      { preview: false },
    );

    expect(idsOf(reversed.categories('en'))).toEqual(idsOf(site.categories('en')));
    expect(idsOf(reversed.navSections('en'))).toEqual(idsOf(site.navSections('en')));
  });

  it('gives the Site copy groups by short name, and the Finder as the language shows it', () => {
    const copy = site.siteCopy('en');

    expect(Object.keys(copy)).toHaveLength(Object.keys(SITE_COPY).length);
    expect(copy.home).toEqual(snapshot.siteCopyHome);
    expect(copy.notFound).toEqual(snapshot.siteCopyNotFound);
    expect(preview.finder('el').picks.car).toEqual({
      '1': expect.objectContaining({ product: 'elite' }),
    });
  });

  it('answers only for a built language: content and images', () => {
    expect(englishOnly.built).toEqual(['en']);
    expect(() => englishOnly.products('el')).toThrow('The language "el" is not built (built: en)');
    expect(() => englishOnly.explainer('it')).toThrow('The language "it" is not built');
    // `car` is decorative: its empty alt would do in any language, but Greek is not built.
    expect(englishOnly.image('car', 'en').alt).toBe('');
    expect(() => englishOnly.image('car', 'el')).toThrow(
      'The language "el" is not built (built: en)',
    );
  });

  it('gives the page rules for the built languages only: nothing for another one', () => {
    const home = { type: 'home' } as const;

    expect(englishOnly.pageUrl(home, 'el')).toBeUndefined();
    expect(englishOnly.sitemapEntries('el')).toEqual([]);
    expect(englishOnly.alternates(home)).toEqual([
      { hreflang: 'en', path: '/en/' },
      { hreflang: 'x-default', path: '/en/' },
    ]);
    // On a page in a language that is not built, the switcher lists the built ones, none current.
    expect(englishOnly.switcherTargets(home, 'el')).toEqual([
      { locale: 'en', path: '/en/', isCurrent: false },
    ]);
  });

  it('passes the page rules through for the built languages', () => {
    const home = { type: 'home' } as const;

    expect(withGreek.pageUrl(home, 'el')).toBe('/el/');
    expect(withGreek.alternates(home).map(({ hreflang }) => hreflang)).toEqual([
      'en',
      'el',
      'x-default',
    ]);
    expect(withGreek.switcherTargets(home, 'en')).toHaveLength(2);
    expect(withGreek.sitemapEntries('el').map(({ path }) => path)).toEqual(['/el/']);
  });
});

// The static path of home in `locale`.
const home = (locale: Locale) => ({
  params: { locale },
  props: { locale, page: { type: 'home' } },
});

describe('staticPaths', () => {
  it('gives home in every built language: the live ones, or all four in preview', () => {
    expect(englishOnly.staticPaths('home')).toEqual([home('en')]);
    expect(withGreek.staticPaths('home')).toEqual([home('en'), home('el')]);
    expect(preview.staticPaths('home')).toEqual(LOCALES.map((locale) => home(locale)));
    expect(site.staticPaths('home')).toEqual([home('en')]);
  });

  it('refuses a page type the build does not render (BUILT_PAGE_TYPES)', () => {
    expect(() => site.staticPaths('product')).toThrow(
      'The page type "product" is not built: BUILT_PAGE_TYPES lists home',
    );
  });

  it('gives an item page per built language and visible item, its params from its URL', () => {
    expect(ITEM_PAGES.staticPaths('product').map(({ params }) => params)).toEqual([
      { locale: 'en', vehicle: 'car', slug: 'elite' },
      { locale: 'en', vehicle: 'car', slug: 'smart' },
      { locale: 'en', vehicle: 'car', slug: 'light' },
      { locale: 'el', vehicle: 'car', slug: 'elite' },
      { locale: 'it', vehicle: 'car', slug: 'tracer' },
    ]);
    expect(ITEM_PAGES.staticPaths('post')).toEqual([
      {
        params: { locale: 'en', slug: 'news-en' },
        props: { locale: 'en', page: { type: 'post', id: 'motodays' } },
      },
      {
        params: { locale: 'el', slug: 'news-el' },
        props: { locale: 'el', page: { type: 'post', id: 'motodays' } },
      },
    ]);
    expect(ITEM_PAGES.staticPaths('accessory').map(({ params }) => params)).toEqual([
      { locale: 'en', vehicle: 'car', id: 'd-061' },
      { locale: 'el', vehicle: 'car', id: 'd-061' },
    ]);
    expect(ITEM_PAGES.staticPaths('category')).toHaveLength(5 * LOCALES.length);
  });
});

describe('the readiness check', () => {
  const greekLive = {
    ...structuredClone(snapshot),
    languages: { ...snapshot.languages, el: { live: true } },
  };

  it('fails a build whose live Greek has gaps, listing every missing path', () => {
    expect(() => createQuery(greekLive, { preview: false })).toThrow(
      /^The language "el" is not ready to build: \d+ value\(s\) have no "el" text or alt:\n- /u,
    );
    expect(() => createQuery(greekLive, { preview: false })).toThrow(
      /\n- siteCopyHome\.hero\.heading\.lead\n[\s\S]*\n- features\.gps\.what\n/u,
    );
  });

  it('lets a preview build show every language without the check', () => {
    expect(createQuery(greekLive, { preview: true }).built).toEqual([...LOCALES]);
    expect(site.built).toEqual(['en']);
  });
});

// The files that can hold an import: every page and endpoint kind Astro accepts (`.astro`, `.md`,
// `.mdx`, `.js` / `.ts` and their `c`, `m` and `x` forms).
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?|astro|mdx?)$/u;

// Every such file under `root` but the tests, relative to `root`, with `/`.
function sourceFiles(root: string): string[] {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && SOURCE_FILE.test(entry.name))
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)))
    .map((file) => file.replaceAll('\\', '/'))
    .filter((file) => !file.includes('__tests__/'));
}

const IMPORTS_CONTENT = /(?:from\s+|import\s*\(\s*)['"]astro:content['"]/u;

// The files under `root` that import astro:content.
const importersIn = (root: string) =>
  sourceFiles(root).filter((file) =>
    IMPORTS_CONTENT.test(readFileSync(path.join(root, file), 'utf8')),
  );

// A scratch src/ whose pages/ holds `files`, each importing astro:content.
function probeImporters(files: readonly string[]): string[] {
  const root = mkdtempSync(path.join(tmpdir(), 'content-guard-'));
  try {
    mkdirSync(path.join(root, 'pages'));
    for (const file of files) {
      writeFileSync(
        path.join(root, 'pages', file),
        "import { getCollection } from 'astro:content';",
      );
    }
    return importersIn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('astro:content', () => {
  const importers = importersIn(SRC_DIR);

  it('is imported by no page: pages read through the query module (P1-1)', () => {
    expect(importers.filter((file) => file.startsWith('pages/'))).toEqual([]);
  });

  it('is imported only by the collection config and the query adapter', () => {
    expect(importers.toSorted(byCodeUnit)).toEqual(['content.config.ts', 'content/query.ts']);
  });

  it('is found by the import check in both import forms', () => {
    expect(IMPORTS_CONTENT.test("import { getCollection } from 'astro:content';")).toBe(true);
    expect(IMPORTS_CONTENT.test("await import('astro:content')")).toBe(true);
    expect(IMPORTS_CONTENT.test("import { z } from 'zod';")).toBe(false);
  });

  it('is found in every page and endpoint kind, a .js endpoint included', () => {
    const kinds = ['feed.js', 'feed.mjs', 'feed.ts', 'list.astro', 'post.md', 'post.mdx'];

    expect(probeImporters([...kinds, 'data.json', 'style.css']).toSorted(byCodeUnit)).toEqual(
      kinds.map((file) => `pages/${file}`).toSorted(byCodeUnit),
    );
  });
});
