// Every committed snapshot file read through the content contract, as one typed object: the
// checks that look across collections (the snapshot integrity test, `npm run check:pricelist`)
// read content the way the site does. A file that breaks the contract is an error naming the
// file, the item and the field.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { z } from 'zod';

import { REPO_ROOT } from './paths';
import {
  COLLECTIONS,
  GLOBALS,
  snapshotFileName,
  type CollectionName,
  type GlobalName,
} from '../../src/content/contract';
import type { ContentData } from '../../src/content/rules';

// The snapshot is the site's content (the type the publish rules read).
export type SnapshotData = ContentData;

// The parsed JSON of `content-snapshot/<file>` under `root`.
export async function readSnapshotJson(root: string, name: string): Promise<unknown> {
  const file = path.join(root, 'content-snapshot', snapshotFileName(name));
  return JSON.parse(await readFile(file, 'utf8')) as unknown;
}

function problemsOf(label: string, issues: readonly z.core.$ZodIssue[]): string[] {
  return issues.map(
    (issue) => `${label}, field ${issue.path.map(String).join('.') || '(item)'}: ${issue.message}`,
  );
}

function itemLabel(item: unknown, index: number): string {
  const id = (item as { id?: unknown } | null)?.id;
  return typeof id === 'string' ? `item "${id}"` : `item #${String(index)}`;
}

export async function readSnapshot(root: string = REPO_ROOT): Promise<SnapshotData> {
  const problems: string[] = [];
  const data: Record<string, unknown> = {};
  for (const [name, schema] of Object.entries(COLLECTIONS) as [CollectionName, z.ZodType][]) {
    const raw = await readSnapshotJson(root, name);
    const items = Array.isArray(raw) ? (raw as unknown[]) : [];
    if (!Array.isArray(raw)) problems.push(`${snapshotFileName(name)}: expected a JSON array`);
    data[name] = items.map((item, index) => {
      const result = schema.safeParse(item);
      if (!result.success) {
        const label = `${snapshotFileName(name)} ${itemLabel(item, index)}`;
        problems.push(...problemsOf(label, result.error.issues));
      }
      return result.data;
    });
  }
  for (const [name, schema] of Object.entries(GLOBALS) as [GlobalName, z.ZodType][]) {
    const result = schema.safeParse(await readSnapshotJson(root, name));
    if (!result.success) {
      problems.push(...problemsOf(`${snapshotFileName(name)} global`, result.error.issues));
    }
    data[name] = result.data;
  }
  if (problems.length > 0) {
    throw new Error(`the snapshot does not match the contract:\n- ${problems.join('\n- ')}`);
  }
  return data as SnapshotData;
}
