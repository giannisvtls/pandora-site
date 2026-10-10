// src/assets/media/manifest.json: one record per file `npm run media:fetch` wrote (fetched media
// and chrome, copied prototype images), with where it came from and its sha256. A file whose
// bytes still match its record is current and never fetched again.
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import { byCodeUnit } from '../crawl/output';

const nonEmpty = z.string().min(1);
const urlSource = z.strictObject({ url: nonEmpty });
const designSource = z.strictObject({ designFile: nonEmpty });

export const manifestRecordSchema = z.strictObject({
  // Relative to the repository root, `/` separators.
  file: nonEmpty,
  source: z.union([urlSource, designSource]),
  bytes: z.int().positive(),
  sha256: z.string().regex(/^[\da-f]{64}$/u),
  contentType: z.string().regex(/^image\/[\w.+-]+$/u),
  fetchedAt: z.iso.datetime(),
});
export type ManifestRecord = z.infer<typeof manifestRecordSchema>;

export const manifestSchema = z.strictObject({ files: z.array(manifestRecordSchema) });

export type Source = ManifestRecord['source'];

export function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function sourceKey(source: Source): string {
  return 'url' in source ? `url ${source.url}` : `design ${source.designFile}`;
}

// The records by file; none when the manifest does not exist yet.
export async function readManifest(manifestPath: string): Promise<Map<string, ManifestRecord>> {
  let text: string;
  try {
    text = await readFile(manifestPath, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return new Map();
    }
    throw error;
  }
  const { files } = manifestSchema.parse(JSON.parse(text));
  return new Map(files.map((record) => [record.file, record]));
}

export function renderManifest(records: Iterable<ManifestRecord>): string {
  const files = [...records].toSorted((a, b) => byCodeUnit(a.file, b.file));
  return `${JSON.stringify(manifestSchema.parse({ files }), null, 2)}\n`;
}

// Removes a file if it is there; a failure here never hides the error that led to it.
async function removeQuietly(file: string): Promise<void> {
  try {
    await rm(file, { force: true });
  } catch {
    // Nothing more to do: the caller rethrows the original error.
  }
}

// Written next to the target and renamed into place, so a reader never sees half a file. When the
// write or the rename fails, the partial file is removed before the error is rethrown.
export async function writeFileAtomic(target: string, data: Uint8Array | string): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  const partial = `${target}.partial`;
  try {
    await writeFile(partial, data);
    await rename(partial, target);
  } catch (error) {
    await removeQuietly(partial);
    throw error;
  }
}

// Whether the file on disk is exactly what the record describes.
export async function isFileCurrent(root: string, record: ManifestRecord): Promise<boolean> {
  try {
    const bytes = await readFile(path.join(root, record.file));
    return bytes.byteLength === record.bytes && sha256(bytes) === record.sha256;
  } catch {
    return false;
  }
}

const TYPES_BY_EXTENSION: Readonly<Record<string, string>> = {
  avif: 'image/avif',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp',
};

// The media type a file name stands for, or null.
export function contentTypeOfFile(file: string): string | null {
  return TYPES_BY_EXTENSION[file.slice(file.lastIndexOf('.') + 1).toLowerCase()] ?? null;
}
