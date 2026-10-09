// How media:fetch keeps src/assets/media/manifest.json true, against loopback sites under the
// global fetch guard: a record no source lists leaves the manifest (whether or not anything is
// downloaded) and is reported only once that is saved; a file whose source URL changed is fetched
// again, and keeps its previous record while the new download fails; an atomic write that fails
// leaves no `.partial` file behind.
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { MANIFEST_FILE, MEDIA_DIR } from '../config';
import { sha256, writeFileAtomic } from '../manifest';
import { runMediaFetch } from '../run';
import {
  fileSha,
  hasFile,
  manifestRecords,
  OPEN_ROBOTS,
  optionsFor,
  sourcesOf,
  useSandboxes,
} from './fetch-setup';
import { bytesOf, image, robotsTxt, useSites, type Site } from './loopback-site';

const startSite = useSites();
const sandbox = useSandboxes();

const DROPPED_LINE = `dropped the manifest record of ${MEDIA_DIR}/gone.webp: no source lists it (the file stays)`;

// A site with robots.txt and the images a.webp and gone.webp, and a root where both were fetched.
async function fetchedTwo(): Promise<{ site: Site; root: string }> {
  const site = await startSite();
  site.routes.set('/robots.txt', robotsTxt(OPEN_ROBOTS));
  site.routes.set('/a.webp', image(bytesOf('a')));
  site.routes.set('/gone.webp', image(bytesOf('gone')));
  const root = await sandbox();
  const both = sourcesOf([`${site.origin}/a.webp`, `${site.origin}/gone.webp`]);
  await runMediaFetch(optionsFor(root, site.origin, both).options);
  return { site, root };
}

async function filesOf(root: string): Promise<string[]> {
  const records = await manifestRecords(root);
  return records.map((record) => record.file);
}

describe('a manifest record that no source lists', () => {
  it('is dropped without a request when nothing is left to download', async () => {
    const { site, root } = await fetchedTwo();
    const hitsBefore = site.hits.length;

    const { options, lines } = optionsFor(root, site.origin, sourcesOf([`${site.origin}/a.webp`]));
    const result = await runMediaFetch(options);

    expect(result).toMatchObject({ current: 1, fetched: 0, failed: [] });
    expect(site.hits).toHaveLength(hitsBefore);
    expect(await filesOf(root)).toEqual([`${MEDIA_DIR}/a.webp`]);
    expect(lines).toEqual([DROPPED_LINE]);
    expect(await hasFile(root, `${MEDIA_DIR}/gone.webp`)).toBe(true);
  });

  it('is dropped even when every pending download fails', async () => {
    const { site, root } = await fetchedTwo();
    const missing = `${site.origin}/missing.webp`;

    const { options, lines } = optionsFor(
      root,
      site.origin,
      sourcesOf([`${site.origin}/a.webp`, missing]),
    );
    const result = await runMediaFetch(options);

    expect(result).toMatchObject({ current: 1, fetched: 0, failed: [{ url: missing }] });
    expect(await filesOf(root)).toEqual([`${MEDIA_DIR}/a.webp`]);
    expect(lines).toContain(DROPPED_LINE);
  });

  it('is reported dropped only after the manifest without it is saved', async () => {
    const { site, root } = await fetchedTwo();
    // A non-empty directory where the atomic write puts its partial file: the save fails.
    await mkdir(path.join(root, `${MANIFEST_FILE}.partial`, 'child'), { recursive: true });

    const { options, lines } = optionsFor(root, site.origin, sourcesOf([`${site.origin}/a.webp`]));

    await expect(runMediaFetch(options)).rejects.toThrow();
    expect(lines).not.toContain(DROPPED_LINE);
    expect(await filesOf(root)).toEqual([`${MEDIA_DIR}/a.webp`, `${MEDIA_DIR}/gone.webp`]);
  });
});

describe('a file whose source URL changed', () => {
  it('is fetched again from the new URL and recorded with it', async () => {
    const site = await startSite();
    site.routes.set('/robots.txt', robotsTxt(OPEN_ROBOTS));
    site.routes.set('/v1/a.webp', image(bytesOf('v1')));
    site.routes.set('/v2/a.webp', image(bytesOf('v2')));
    const root = await sandbox();
    await runMediaFetch(
      optionsFor(root, site.origin, sourcesOf([`${site.origin}/v1/a.webp`])).options,
    );

    const result = await runMediaFetch(
      optionsFor(root, site.origin, sourcesOf([`${site.origin}/v2/a.webp`])).options,
    );

    expect(result).toMatchObject({ current: 0, fetched: 1, failed: [] });
    expect(site.paths()).toContain('/v2/a.webp');
    expect(await fileSha(root, `${MEDIA_DIR}/a.webp`)).toBe(sha256(bytesOf('v2')));
    expect(await manifestRecords(root)).toMatchObject([
      { file: `${MEDIA_DIR}/a.webp`, source: { url: `${site.origin}/v2/a.webp` } },
    ]);
  });

  it('keeps its previous record when the new download fails, while a stale one is dropped', async () => {
    const site = await startSite();
    site.routes.set('/robots.txt', robotsTxt(OPEN_ROBOTS));
    site.routes.set('/v1/a.webp', image(bytesOf('v1')));
    site.routes.set('/gone.webp', image(bytesOf('gone')));
    const root = await sandbox();
    const first = sourcesOf([`${site.origin}/v1/a.webp`, `${site.origin}/gone.webp`]);
    await runMediaFetch(optionsFor(root, site.origin, first).options);

    // /v2/a.webp has no route: the site answers 404.
    const moved = `${site.origin}/v2/a.webp`;
    const { options, lines } = optionsFor(root, site.origin, sourcesOf([moved]));
    const result = await runMediaFetch(options);

    const v1Sha = sha256(bytesOf('v1'));
    expect(result).toMatchObject({ current: 0, fetched: 0, failed: [{ url: moved }] });
    expect(lines).toContain(DROPPED_LINE);
    expect(await manifestRecords(root)).toEqual([
      expect.objectContaining({
        file: `${MEDIA_DIR}/a.webp`,
        source: { url: `${site.origin}/v1/a.webp` },
        sha256: v1Sha,
      }),
    ]);
    expect(await fileSha(root, `${MEDIA_DIR}/a.webp`)).toBe(v1Sha);
  });
});

describe('writeFileAtomic', () => {
  it('removes the partial file and rethrows when the rename fails', async () => {
    const root = await sandbox();
    // A non-empty directory where the file should go: the rename cannot replace it.
    const target = path.join(root, 'in-the-way');
    await mkdir(path.join(target, 'child'), { recursive: true });

    await expect(writeFileAtomic(target, 'bytes')).rejects.toMatchObject({ syscall: 'rename' });
    expect(await readdir(root)).toEqual(['in-the-way']);
  });
});
