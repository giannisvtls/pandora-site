// Content Layer loader: one loader per collection or global, whatever the source (roadmap §3).
// Pages read the result through getCollection() / getEntry() and never see a source's own shapes.
import { readFile } from 'node:fs/promises';

import type { Loader, LoaderContext } from 'astro/loaders';
import type { z } from 'zod';

import {
  COLLECTIONS,
  GLOBAL_ENTRY_ID,
  GLOBALS,
  snapshotFileName,
  type ContentName,
  type GlobalName,
} from './contract';

// What the loader validates a snapshot file against: a collection is a JSON array of items,
// each stored under its `id`; a global is one JSON object, stored as the entry `global`.
export type ContentDefinition =
  | { readonly kind: 'collection'; readonly schema: z.ZodType<{ readonly id: string }> }
  | { readonly kind: 'global'; readonly schema: z.ZodType<Record<string, unknown>> };

interface Entry {
  readonly id: string;
  readonly data: Record<string, unknown>;
}

export const CONTENT_SOURCES = ['snapshot', 'payload'] as const;
const DEFAULT_SOURCE = 'snapshot';

const isGlobalName = (name: ContentName): name is GlobalName => Object.hasOwn(GLOBALS, name);

export function definitionOf(name: ContentName): ContentDefinition {
  return isGlobalName(name)
    ? { kind: 'global', schema: GLOBALS[name] }
    : { kind: 'collection', schema: COLLECTIONS[name] };
}

// The loader of a registered collection or global.
export function contentLoader(name: ContentName): Loader {
  return createContentLoader(name, definitionOf(name));
}

// The loader of any name and definition; contentLoader() is this with the registry's entry.
export function createContentLoader(name: string, definition: ContentDefinition): Loader {
  return {
    name: 'content-loader',
    load: async (context) => {
      // Read on every load (not when the config is evaluated), so the env of the build decides.
      const source = process.env.CONTENT_SOURCE ?? DEFAULT_SOURCE;
      switch (source) {
        case 'snapshot': {
          await loadSnapshot(name, definition, context);
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
  name: string,
  definition: ContentDefinition,
  { config, store, logger }: LoaderContext,
): Promise<void> {
  const relativePath = `content-snapshot/${snapshotFileName(name)}`;
  // config.root, not process.cwd(): the build can be started from another directory.
  const raw = parseJson(await readFile(new URL(relativePath, config.root), 'utf8'), relativePath);
  const entries =
    definition.kind === 'global'
      ? [validateGlobal(name, definition.schema, raw, relativePath)]
      : validateItems(name, definition.schema, raw, relativePath);

  // The data store persists between builds: clear it so a removed or changed entry is never
  // served stale. Everything was validated above, so a bad snapshot leaves the store untouched.
  // The collection schema is this same contract, so context.parseData would only re-run it.
  store.clear();
  for (const entry of entries) {
    store.set({ id: entry.id, data: entry.data });
  }
  logger.info(
    definition.kind === 'global'
      ? `Loaded the ${name} global from ${relativePath}`
      : `Loaded ${String(entries.length)} ${name} from ${relativePath}`,
  );
}

// One problem line per issue: where it is, which field, what is wrong.
function issueLines(label: string, issues: readonly z.core.$ZodIssue[]): string[] {
  return issues.map((issue) => {
    const field = issue.path.length > 0 ? issue.path.map(String).join('.') : '(item)';
    return `${label}, field ${field}: ${issue.message}`;
  });
}

function contractError(relativePath: string, name: string, problems: readonly string[]): Error {
  return new Error(
    `${relativePath} does not match the ${name} contract:\n- ${problems.join('\n- ')}`,
  );
}

function validateItems(
  name: string,
  schema: z.ZodType<{ readonly id: string }>,
  raw: unknown,
  relativePath: string,
): Entry[] {
  if (!Array.isArray(raw)) {
    throw new TypeError(`${relativePath}: expected a JSON array of ${name} items`);
  }
  const entries: Entry[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const [index, candidate] of raw.entries()) {
    const result = schema.safeParse(candidate);
    if (!result.success) {
      problems.push(...issueLines(itemLabel(candidate, index), result.error.issues));
      continue;
    }
    if (seen.has(result.data.id)) {
      problems.push(`item "${result.data.id}": the id appears more than once`);
      continue;
    }
    seen.add(result.data.id);
    entries.push({ id: result.data.id, data: result.data });
  }

  if (problems.length > 0) {
    throw contractError(relativePath, name, problems);
  }
  return entries;
}

function validateGlobal(
  name: string,
  schema: z.ZodType<Record<string, unknown>>,
  raw: unknown,
  relativePath: string,
): Entry {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new TypeError(`${relativePath}: expected one JSON object (the ${name} global)`);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw contractError(relativePath, name, issueLines('global', result.error.issues));
  }
  return { id: GLOBAL_ENTRY_ID, data: result.data };
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
