import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { LoaderContext } from 'astro/loaders';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { contentLoader } from '../loader';

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
    collection: 'products',
    config: { root },
    store,
    logger: { info: vi.fn() },
  } as unknown as LoaderContext;
  return { context, calls, entries };
}

const temporaryRoots: string[] = [];

// A project root whose content-snapshot/products.json holds the given text.
async function rootWithSnapshotText(text: string): Promise<URL> {
  const directory = await mkdtemp(path.join(tmpdir(), 'content-loader-'));
  temporaryRoots.push(directory);
  await mkdir(path.join(directory, 'content-snapshot'));
  await writeFile(path.join(directory, 'content-snapshot', 'products.json'), text);
  return pathToFileURL(`${directory}${path.sep}`);
}

// A project root whose content-snapshot/products.json holds the given items.
async function rootWithSnapshot(items: unknown): Promise<URL> {
  return rootWithSnapshotText(JSON.stringify(items));
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
    const [item] = JSON.parse(readFileSync(SNAPSHOT, 'utf8')) as unknown[];
    expect([...entries]).toStrictEqual([['camperv3', item]]);
  });

  it('names the item id and the field path when an item breaks the contract', async () => {
    const [item] = JSON.parse(readFileSync(SNAPSHOT, 'utf8')) as {
      name: Record<string, string>;
    }[];
    delete item!.name.en;
    const { context, calls } = fakeContext(await rootWithSnapshot([item]));

    await expect(contentLoader('products').load(context)).rejects.toThrow(
      /item "camperv3", field name\.en: /,
    );
    // Validation runs before the store is touched.
    expect(calls).toStrictEqual([]);
  });

  it('rejects a snapshot that repeats an id, before touching the store', async () => {
    const [item] = JSON.parse(readFileSync(SNAPSHOT, 'utf8')) as unknown[];
    const { context, calls } = fakeContext(await rootWithSnapshot([item, item]));

    await expect(contentLoader('products').load(context)).rejects.toThrow(
      /item "camperv3": the id appears more than once/,
    );
    expect(calls).toStrictEqual([]);
  });

  it('names the snapshot file when it is not valid JSON', async () => {
    const { context, calls } = fakeContext(await rootWithSnapshotText('[{"id": "camperv3",}]'));

    await expect(contentLoader('products').load(context)).rejects.toThrow(
      /^content-snapshot\/products\.json: invalid JSON: /,
    );
    expect(calls).toStrictEqual([]);
  });

  it('throws the Phase 5 message for CONTENT_SOURCE=payload', async () => {
    vi.stubEnv('CONTENT_SOURCE', 'payload');
    const { context } = fakeContext(REPO_ROOT);

    await expect(contentLoader('products').load(context)).rejects.toThrow(
      new Error('CONTENT_SOURCE=payload is implemented in Phase 5'),
    );
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
