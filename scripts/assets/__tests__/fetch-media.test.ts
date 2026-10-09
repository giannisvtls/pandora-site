// media:fetch against a loopback site (127.0.0.1, ephemeral port) under the global fetch guard:
// what it fetches and records, that a run after a complete one sends no request at all
// (robots.txt included), the 2-in-flight limit, the prototype-image copies and the command line.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { byCodeUnit } from '../../crawl/output';
import { BRAND_DIR, FAVICON_FILE, MANIFEST_FILE, MEDIA_DIR, USER_AGENT } from '../config';
import { MEDIA_EXIT_CODES, runCli } from '../fetch-cli';
import { sha256 } from '../manifest';
import { DesignDirRequiredError, runMediaFetch } from '../run';
import type { MediaSources } from '../sources';
import {
  captureIo,
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

const ELITE = bytesOf('elite');
const LOGO = bytesOf('logo');
const ICON = bytesOf('icon');

// A site with robots.txt, one content image (with a WordPress size suffix) and two chrome files.
async function siteWithImages(): Promise<{ site: Site; sources: MediaSources }> {
  const site = await startSite();
  site.routes.set('/robots.txt', robotsTxt(OPEN_ROBOTS));
  site.routes.set('/up/Elite-V3-package-300x200.webp', image(ELITE));
  site.routes.set('/up/Logo.webp', image(LOGO));
  site.routes.set('/up/favi.webp', image(ICON, 'image/webp; charset=binary'));
  const sources = sourcesOf([`${site.origin}/up/Elite-V3-package-300x200.webp`], {
    chrome: [
      { url: `${site.origin}/up/Logo.webp`, file: `${BRAND_DIR}/logo.webp`, uses: ['logo'] },
      { url: `${site.origin}/up/favi.webp`, file: FAVICON_FILE, uses: ['favicon'] },
    ],
  });
  return { site, sources };
}

describe('media:fetch', () => {
  it('fetches every missing file, GET only with its User-Agent, and records each one', async () => {
    const { site, sources } = await siteWithImages();
    const root = await sandbox();
    const result = await runMediaFetch(optionsFor(root, site.origin, sources).options);

    expect(result).toMatchObject({ current: 0, copied: 0, fetched: 3, failed: [] });
    expect(result.stats).toEqual({
      requests: 4,
      robots: 1,
      retries: 0,
      redirectHops: 0,
      hosts: [new URL(site.origin).host],
    });
    expect(site.paths().toSorted(byCodeUnit)).toEqual([
      '/robots.txt',
      '/up/Elite-V3-package-300x200.webp',
      '/up/Logo.webp',
      '/up/favi.webp',
    ]);
    expect(new Set(site.hits.map((hit) => hit.method))).toEqual(new Set(['GET']));
    expect(new Set(site.hits.map((hit) => hit.userAgent))).toEqual(new Set([USER_AGENT]));

    const records = await manifestRecords(root);
    expect(records.map((record) => record.file)).toEqual([
      FAVICON_FILE,
      `${BRAND_DIR}/logo.webp`,
      `${MEDIA_DIR}/elite-v3-package.webp`,
    ]);
    expect(records[2]).toMatchObject({
      source: { url: `${site.origin}/up/Elite-V3-package-300x200.webp` },
      bytes: ELITE.byteLength,
      sha256: sha256(ELITE),
      contentType: 'image/webp',
    });
    expect(records[0]).toMatchObject({ sha256: sha256(ICON), contentType: 'image/webp' });
    expect(Number.isNaN(Date.parse(records[2]?.fetchedAt ?? ''))).toBe(false);
    for (const record of records) {
      expect(await fileSha(root, record.file)).toBe(record.sha256);
    }
  });

  it('sends no request at all on a run after a complete one, robots.txt included', async () => {
    const { site, sources } = await siteWithImages();
    const root = await sandbox();
    const { options } = optionsFor(root, site.origin, sources);
    await runMediaFetch(options);
    const manifestBefore = await readFile(path.join(root, MANIFEST_FILE), 'utf8');
    const hitsBefore = site.hits.length;

    const lines: string[] = [];
    const { io } = captureIo();
    const print = (line: string) => {
      lines.push(line);
    };
    const code = await runCli([], { ...options, print }, io);

    expect(code).toBe(MEDIA_EXIT_CODES.ok);
    expect(site.hits).toHaveLength(hitsBefore);
    expect(lines).toEqual([
      'every file is current (3 files); requests: 0 (robots.txt 0, images 0, redirect hops 0, retries 0); hosts contacted: none',
    ]);
    expect(await readFile(path.join(root, MANIFEST_FILE), 'utf8')).toBe(manifestBefore);
  });

  it('fetches again only a file whose bytes no longer match its record', async () => {
    const { site, sources } = await siteWithImages();
    const root = await sandbox();
    const { options } = optionsFor(root, site.origin, sources);
    await runMediaFetch(options);
    await writeFile(path.join(root, BRAND_DIR, 'logo.webp'), 'edited');
    const hitsBefore = site.hits.length;

    const result = await runMediaFetch(options);

    expect(result).toMatchObject({ current: 2, fetched: 1, failed: [] });
    expect(site.paths().slice(hitsBefore)).toEqual(['/robots.txt', '/up/Logo.webp']);
    expect(await fileSha(root, `${BRAND_DIR}/logo.webp`)).toBe(sha256(LOGO));
  });

  it('keeps at most 2 requests in flight', async () => {
    const site = await startSite();
    site.routes.set('/robots.txt', robotsTxt(OPEN_ROBOTS));
    const urls = ['a', 'b', 'c', 'd', 'e', 'f'].map((name) => {
      site.routes.set(`/${name}.webp`, image(bytesOf(name), 'image/webp', 40));
      return `${site.origin}/${name}.webp`;
    });
    const root = await sandbox();
    const result = await runMediaFetch(optionsFor(root, site.origin, sourcesOf(urls)).options);

    expect(result.fetched).toBe(6);
    expect(site.maxInFlight()).toBe(2);
  });
});

describe('prototype images', () => {
  const DESIGN_FILE = 'img/pricelist/acc-d-061.png';
  const PNG = bytesOf('acc-d-061');
  const sources: MediaSources = {
    media: [],
    chrome: [],
    designFiles: [
      {
        designFile: DESIGN_FILE,
        file: `${MEDIA_DIR}/pricelist/acc-d-061.png`,
        uses: ['accessories.d-061'],
      },
    ],
  };

  async function designFolder(): Promise<string> {
    const design = await sandbox();
    await mkdir(path.join(design, 'img', 'pricelist'), { recursive: true });
    await writeFile(path.join(design, DESIGN_FILE), PNG);
    return design;
  }

  it('are copied from the design folder with source.designFile, without a request', async () => {
    const site = await startSite();
    const root = await sandbox();
    const designDir = await designFolder();
    const result = await runMediaFetch(
      optionsFor(root, site.origin, sources, { designDir }).options,
    );

    expect(result).toMatchObject({ copied: 1, fetched: 0, failed: [] });
    expect(result.stats.requests).toBe(0);
    expect(site.hits).toEqual([]);
    expect(await manifestRecords(root)).toEqual([
      {
        file: `${MEDIA_DIR}/pricelist/acc-d-061.png`,
        source: { designFile: DESIGN_FILE },
        bytes: PNG.byteLength,
        sha256: sha256(PNG),
        contentType: 'image/png',
        fetchedAt: expect.any(String),
      },
    ]);
  });

  it('need --design-dir only while one is missing, and ask for it before any request', async () => {
    const site = await startSite();
    site.routes.set('/robots.txt', robotsTxt(OPEN_ROBOTS));
    site.routes.set('/a.webp', image(bytesOf('a')));
    const both: MediaSources = { ...sources, media: sourcesOf([`${site.origin}/a.webp`]).media };
    const root = await sandbox();

    await expect(runMediaFetch(optionsFor(root, site.origin, both).options)).rejects.toThrow(
      DesignDirRequiredError,
    );
    expect(site.hits).toEqual([]);
    expect(await hasFile(root, `${MEDIA_DIR}/a.webp`)).toBe(false);

    const designDir = await designFolder();
    await runMediaFetch(optionsFor(root, site.origin, both, { designDir }).options);
    const again = await runMediaFetch(optionsFor(root, site.origin, both).options);
    expect(again).toMatchObject({ current: 2, copied: 0, fetched: 0 });
  });
});

describe('the media:fetch command line', () => {
  it('prints its usage for --help and makes no request', async () => {
    const { out, io } = captureIo();
    expect(await runCli(['--help'], {}, io)).toBe(MEDIA_EXIT_CODES.ok);
    expect(out.join('')).toContain('Usage: npm run media:fetch');
  });

  it('refuses a relative --design-dir and an unknown option', async () => {
    const { err, io } = captureIo();
    expect(await runCli(['--design-dir', 'design_files'], {}, io)).toBe(MEDIA_EXIT_CODES.usage);
    expect(await runCli(['--fresh'], {}, io)).toBe(MEDIA_EXIT_CODES.usage);
    expect(err.join('')).toContain('--design-dir needs an absolute path');
  });

  it('exits 2 when prototype images need --design-dir, and 3 when an image failed', async () => {
    const site = await startSite();
    site.routes.set('/robots.txt', robotsTxt(OPEN_ROBOTS));
    const root = await sandbox();
    const design: MediaSources = {
      media: [],
      chrome: [],
      designFiles: [{ designFile: 'img/a.png', file: `${MEDIA_DIR}/a.png`, uses: ['test'] }],
    };
    const missing = sourcesOf([`${site.origin}/missing.webp`]);
    const { io, err } = captureIo();

    const designCode = await runCli([], optionsFor(root, site.origin, design).options, io);
    const failedCode = await runCli([], optionsFor(root, site.origin, missing).options, io);

    expect(designCode).toBe(MEDIA_EXIT_CODES.usage);
    expect(err.join('')).toContain('run again with --design-dir');
    expect(failedCode).toBe(MEDIA_EXIT_CODES.failed);
  });
});
