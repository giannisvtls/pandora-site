// The committed media: scripts/assets/media-sources.json is valid,
// src/assets/media/manifest.json holds exactly one record per source whose file exists in the
// repository with that sha256 and size, and the asset folders hold no image file without a
// record. No network: this reads committed files only, so CI checks that no image was edited,
// lost or added without its record.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { byCodeUnit } from '../../crawl/output';
import {
  ALLOWED_ORIGINS,
  BRAND_DIR,
  FAVICON_FILE,
  MANIFEST_FILE,
  MEDIA_DIR,
  SOURCES_FILE,
} from '../config';
import { contentTypeOfFile, readManifest, sha256, sourceKey } from '../manifest';
import { parseSources } from '../sources';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

// Files an operating system leaves in a folder (both are in .gitignore), never committed.
const OS_FILES = new Set(['.DS_Store', 'Thumbs.db']);

// Every file under `dir` (relative to the repository root), as a path from the root with `/`.
async function filesUnder(dir: string): Promise<string[]> {
  const entries = await readdir(path.join(ROOT, dir), { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && !OS_FILES.has(entry.name))
    .map((entry) => path.relative(ROOT, path.join(entry.parentPath, entry.name)))
    .map((file) => file.replaceAll(path.sep, '/'));
}

const sourcesText = await readFile(path.join(ROOT, SOURCES_FILE), 'utf8');
const sources = parseSources(sourcesText, ALLOWED_ORIGINS);
const records = await readManifest(path.join(ROOT, MANIFEST_FILE));

const keyed = [
  ...[...sources.media, ...sources.chrome].map(({ file, url }) => [file, sourceKey({ url })]),
  ...sources.designFiles.map(({ file, designFile }) => [file, sourceKey({ designFile })]),
].toSorted(([a = ''], [b = '']) => byCodeUnit(a, b));

describe('the committed media sources', () => {
  it('list the launch images, the chrome and the prototype images, all on the allowed origin', () => {
    expect(sources.media).toHaveLength(54);
    expect(sources.chrome.map(({ file }) => file).toSorted(byCodeUnit)).toEqual([
      FAVICON_FILE,
      `${BRAND_DIR}/invetec-logo-lettering-white.webp`,
      `${BRAND_DIR}/invetec-logo.webp`,
    ]);
    expect(sources.designFiles).toHaveLength(38);
    const origins = [...sources.media, ...sources.chrome].map(({ url }) => new URL(url).origin);
    expect(new Set(origins)).toEqual(new Set(['https://invetec.eu']));
  });
});

describe('the committed media manifest', () => {
  it('holds one record per source, with the same source', () => {
    const recorded = records
      .values()
      .map((record) => [record.file, sourceKey(record.source)])
      .toArray()
      .toSorted(([a = ''], [b = '']) => byCodeUnit(a, b));
    expect(recorded).toEqual(keyed);
  });

  it('records the 38 prototype images with source.designFile under the pricelist folder', () => {
    const designRecords = records
      .values()
      .filter((record) => 'designFile' in record.source)
      .toArray();
    expect(designRecords).toHaveLength(38);
    for (const record of designRecords) {
      expect(record.file.startsWith(`${MEDIA_DIR}/pricelist/`)).toBe(true);
      expect(record.contentType).toBe('image/png');
    }
  });

  it('records for every file the type its name stands for', () => {
    for (const record of records.values()) {
      expect({ file: record.file, contentType: record.contentType }).toEqual({
        file: record.file,
        contentType: contentTypeOfFile(record.file),
      });
    }
  });

  it('records every image file of the asset folders and the favicon, and nothing else', async () => {
    const media = await filesUnder(MEDIA_DIR);
    const brand = await filesUnder(BRAND_DIR);
    const favicon = await filesUnder(path.posix.dirname(FAVICON_FILE));
    const onDisk = [
      ...media.filter((file) => file !== MANIFEST_FILE),
      ...brand,
      ...favicon.filter((file) => file === FAVICON_FILE),
    ];

    expect(onDisk.toSorted(byCodeUnit)).toEqual(records.keys().toArray().toSorted(byCodeUnit));
  });

  it('matches every file in the repository by size and sha256', async () => {
    for (const record of records.values()) {
      const bytes = await readFile(path.join(ROOT, record.file));
      expect({ file: record.file, bytes: bytes.byteLength, sha256: sha256(bytes) }).toEqual({
        file: record.file,
        bytes: record.bytes,
        sha256: record.sha256,
      });
    }
  });
});
