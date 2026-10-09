import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { LoaderContext } from 'astro/loaders';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { COLLECTIONS, GLOBALS, snapshotFileName, text, type ContentName } from '../contract';
import {
  contentLoader,
  createContentLoader,
  definitionOf,
  type ContentDefinition,
} from '../loader';

const REPO_ROOT = new URL('../../../', import.meta.url);
const SNAPSHOT = new URL('content-snapshot/products.json', REPO_ROOT);

// A loader context with a fake store that records the order of clear() and set() calls.
function fakeContext(root: URL) {
  const calls: string[] = [];
  const entries = new Map<string, unknown>([['stale-item', { id: 'stale-item' }]]);
  const store = {
    clear: () => {
      calls.push('clear');
      entries.clear();
    },
    set: ({ id, data }: { id: string; data: unknown }) => {
      calls.push(`set:${id}`);
      entries.set(id, data);
      return true;
    },
  };
  const context = {
    collection: 'test',
    config: { root },
    store,
    logger: { info: vi.fn() },
  } as unknown as LoaderContext;
  return { context, calls, entries };
}

const temporaryRoots: string[] = [];

// A project root whose content-snapshot/<file> holds the given text.
async function rootWithFile(file: string, content: string): Promise<URL> {
  const directory = await mkdtemp(path.join(tmpdir(), 'content-loader-'));
  temporaryRoots.push(directory);
  await mkdir(path.join(directory, 'content-snapshot'));
  await writeFile(path.join(directory, 'content-snapshot', file), content);
  return pathToFileURL(`${directory}${path.sep}`);
}

// A project root whose content-snapshot/products.json holds the given items.
async function rootWithProducts(items: unknown): Promise<URL> {
  return rootWithFile('products.json', JSON.stringify(items));
}

function snapshotProducts(): { id: string; name: Record<string, string> }[] {
  return JSON.parse(readFileSync(SNAPSHOT, 'utf8')) as {
    id: string;
    name: Record<string, string>;
  }[];
}

// Each test sets CONTENT_SOURCE itself; the shell's value never leaks in.
beforeEach(() => {
  vi.stubEnv('CONTENT_SOURCE', undefined);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(
    temporaryRoots.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('contentLoader', () => {
  it('defaults to the snapshot: clears the store, then sets every item by id', async () => {
    const { context, calls, entries } = fakeContext(REPO_ROOT);

    await contentLoader('products').load(context);

    expect(calls).toStrictEqual(['clear', 'set:camperv3']);
    expect([...entries]).toStrictEqual([['camperv3', snapshotProducts()[0]]]);
  });

  it('names the item id and the field path when an item breaks the contract', async () => {
    const [item] = snapshotProducts();
    delete item!.name.en;
    const { context, calls } = fakeContext(await rootWithProducts([item]));

    await expect(contentLoader('products').load(context)).rejects.toThrow(
      /item "camperv3", field name\.en: Required in the source language "en"/,
    );
    // Validation runs before the store is touched.
    expect(calls).toStrictEqual([]);
  });

  it('rejects a snapshot that repeats an id, before touching the store', async () => {
    const [item] = snapshotProducts();
    const { context, calls } = fakeContext(await rootWithProducts([item, item]));

    await expect(contentLoader('products').load(context)).rejects.toThrow(
      /item "camperv3": the id appears more than once/,
    );
    expect(calls).toStrictEqual([]);
  });

  it('names the snapshot file when it is not valid JSON', async () => {
    const { context, calls } = fakeContext(
      await rootWithFile('products.json', '[{"id": "camperv3",}]'),
    );

    await expect(contentLoader('products').load(context)).rejects.toThrow(
      /^content-snapshot\/products\.json: invalid JSON: /,
    );
    expect(calls).toStrictEqual([]);
  });

  it('reads CONTENT_SOURCE when it loads, not when it is created', async () => {
    const loader = contentLoader('products');
    vi.stubEnv('CONTENT_SOURCE', 'payload');
    const { context, calls } = fakeContext(REPO_ROOT);

    await expect(loader.load(context)).rejects.toThrow(
      new Error('CONTENT_SOURCE=payload is implemented in Phase 5'),
    );
    expect(calls).toStrictEqual([]);
  });

  it('throws naming an unknown CONTENT_SOURCE and the allowed values', async () => {
    vi.stubEnv('CONTENT_SOURCE', 'nope');
    const { context, calls } = fakeContext(REPO_ROOT);

    await expect(contentLoader('products').load(context)).rejects.toThrow(
      new Error('Unknown CONTENT_SOURCE "nope": allowed values are snapshot, payload'),
    );
    expect(calls).toStrictEqual([]);
  });
});

describe('every registered collection and global', () => {
  const names = [...Object.keys(COLLECTIONS), ...Object.keys(GLOBALS)] as ContentName[];

  it('reads content-snapshot/<kebab-case name>.json', () => {
    expect(snapshotFileName('products')).toBe('products.json');
    expect(snapshotFileName('navSections')).toBe('nav-sections.json');
    expect(snapshotFileName('siteCopyHome')).toBe('site-copy-home.json');
  });

  it.each(names)('%s loads from the committed snapshot', async (name) => {
    const file = new URL(`content-snapshot/${snapshotFileName(name)}`, REPO_ROOT);
    const content = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    const { context, calls } = fakeContext(REPO_ROOT);

    await contentLoader(name).load(context);

    const expected =
      definitionOf(name).kind === 'global'
        ? ['set:global']
        : (content as { id: string }[]).map((item) => `set:${item.id}`);
    expect(calls).toStrictEqual(['clear', ...expected]);
  });
});

describe('a global', () => {
  const fixtureGlobal: ContentDefinition = {
    kind: 'global',
    schema: z.strictObject({ title: text('en'), count: z.int() }),
  };
  const FILE = 'site-fixture.json';

  it('is one object, stored as the entry `global`', async () => {
    const value = { title: { en: 'Test title' }, count: 3 };
    const { context, calls, entries } = fakeContext(
      await rootWithFile(FILE, JSON.stringify(value)),
    );

    await createContentLoader('siteFixture', fixtureGlobal).load(context);

    expect(calls).toStrictEqual(['clear', 'set:global']);
    expect([...entries]).toStrictEqual([['global', value]]);
  });

  it('fails naming the file when the file holds an array, before touching the store', async () => {
    const { context, calls } = fakeContext(
      await rootWithFile(FILE, JSON.stringify([{ title: { en: 'Test title' }, count: 3 }])),
    );

    await expect(createContentLoader('siteFixture', fixtureGlobal).load(context)).rejects.toThrow(
      new TypeError(
        'content-snapshot/site-fixture.json: expected one JSON object (the siteFixture global)',
      ),
    );
    expect(calls).toStrictEqual([]);
  });

  it('names the field path when it breaks its contract, before touching the store', async () => {
    const { context, calls } = fakeContext(
      await rootWithFile(FILE, JSON.stringify({ title: { el: 'Test' }, count: 3 })),
    );

    await expect(createContentLoader('siteFixture', fixtureGlobal).load(context)).rejects.toThrow(
      /^content-snapshot\/site-fixture\.json does not match the siteFixture contract:\n- global, field title\.en: /u,
    );
    expect(calls).toStrictEqual([]);
  });
});
