// Content Layer loader: one loader per collection, whatever the source (roadmap §3). Pages read
// the result through getCollection() and never see a source's own shapes.
import { readFile } from 'node:fs/promises';

import type { Loader, LoaderContext } from 'astro/loaders';
import type { z } from 'zod';

import { productSchema } from './contract';

// The contract schema each collection's items are validated against.
const CONTRACTS = { products: productSchema } satisfies Record<string, z.ZodType<{ id: string }>>;
export type CollectionName = keyof typeof CONTRACTS;

export const CONTENT_SOURCES = ['snapshot', 'payload'] as const;
const DEFAULT_SOURCE = 'snapshot';

export function contentLoader(collection: CollectionName): Loader {
  return {
    name: 'content-loader',
    load: async (context) => {
      // Read on every load (not when the config is evaluated), so the env of the build decides.
      const source = process.env.CONTENT_SOURCE ?? DEFAULT_SOURCE;
      switch (source) {
        case 'snapshot': {
          await loadSnapshot(collection, context);
          return;
        }
        case 'payload': {
          throw new Error('CONTENT_SOURCE=payload is implemented in Phase 5');
        }
        default: {
          throw new Error(
            `Unknown CONTENT_SOURCE "${source}": allowed values are ${CONTENT_SOURCES.join(', ')}`,
          );
        }
      }
    },
  };
}

async function loadSnapshot(
  collection: CollectionName,
  { config, store, logger }: LoaderContext,
): Promise<void> {
  const relativePath = `content-snapshot/${collection}.json`;
  // config.root, not process.cwd(): the build can be started from another directory.
  const raw = parseJson(await readFile(new URL(relativePath, config.root), 'utf8'), relativePath);
  const items = validateItems(collection, raw, relativePath);

  // The data store persists between builds: clear it so a removed or changed item is never
  // served stale. Every item was validated above, so a bad snapshot leaves the store untouched.
  // The collection schema is this same contract, so context.parseData would only re-run it.
  store.clear();
  for (const item of items) {
    store.set({ id: item.id, data: item });
  }
  logger.info(`Loaded ${String(items.length)} ${collection} from ${relativePath}`);
}

function validateItems(collection: CollectionName, raw: unknown, relativePath: string) {
  if (!Array.isArray(raw)) {
    throw new TypeError(`${relativePath}: expected a JSON array of ${collection} items`);
  }
  const schema = CONTRACTS[collection];
  const items: z.infer<typeof schema>[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const [index, candidate] of raw.entries()) {
    const result = schema.safeParse(candidate);
    if (!result.success) {
      const label = itemLabel(candidate, index);
      for (const issue of result.error.issues) {
        const field = issue.path.length > 0 ? issue.path.map(String).join('.') : '(item)';
        problems.push(`${label}, field ${field}: ${issue.message}`);
      }
      continue;
    }
    if (seen.has(result.data.id)) {
      problems.push(`item "${result.data.id}": the id appears more than once`);
      continue;
    }
    seen.add(result.data.id);
    items.push(result.data);
  }

  if (problems.length > 0) {
    throw new Error(
      `${relativePath} does not match the ${collection} contract:\n- ${problems.join('\n- ')}`,
    );
  }
  return items;
}

// JSON.parse's own message does not say which file is broken.
function parseJson(text: string, relativePath: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new SyntaxError(`${relativePath}: invalid JSON: ${reason}`, { cause: error });
  }
}

// Names an item by its id when it has a string one, else by its position in the file.
function itemLabel(candidate: unknown, index: number): string {
  if (typeof candidate === 'object' && candidate !== null && 'id' in candidate) {
    const { id } = candidate;
    if (typeof id === 'string' && id.length > 0) return `item "${id}"`;
  }
  return `item #${String(index)} (no id)`;
}
