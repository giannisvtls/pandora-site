// Shared setup for the media-fetch tests: a temporary repository root per test, sources built
// from URLs, and runMediaFetch options that reach only the given origin through the global
// (loopback-only) fetch, with no pause between requests.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { afterEach } from 'vitest';

import { temporaryDirectory } from '../../crawl/__tests__/helpers';
import { POLITENESS, type Politeness } from '../../crawl/config';
import { MANIFEST_FILE, MAX_IMAGE_BYTES, MEDIA_DIR, USER_AGENT } from '../config';
import { manifestSchema, sha256, type ManifestRecord } from '../manifest';
import type { MediaFetchOptions } from '../run';
import { mediaFileName, type MediaSources, type UrlSource } from '../sources';

export const FAST: Politeness = { ...POLITENESS, gapMs: 0, backoffMs: 1 };

export const OPEN_ROBOTS = 'User-agent: *\nDisallow:\n';

// Temporary folders for one test, removed after it.
export function useSandboxes(): () => Promise<string> {
  const removals: (() => Promise<void>)[] = [];
  afterEach(async () => {
    await Promise.all(removals.splice(0).map((remove) => remove()));
  });
  return async () => {
    const { dir, remove } = await temporaryDirectory();
    removals.push(remove);
    return dir;
  };
}

export function mediaEntry(url: string): UrlSource {
  return { url, file: `${MEDIA_DIR}/${mediaFileName(url)}`, uses: ['test'] };
}

export function sourcesOf(
  urls: readonly string[],
  extra: Partial<MediaSources> = {},
): MediaSources {
  return { media: urls.map((url) => mediaEntry(url)), chrome: [], designFiles: [], ...extra };
}

export function optionsFor(
  root: string,
  origin: string,
  sources: MediaSources,
  overrides: Partial<MediaFetchOptions> = {},
): { options: MediaFetchOptions; lines: string[] } {
  const lines: string[] = [];
  const options: MediaFetchOptions = {
    root,
    sources,
    designDir: null,
    allowedOrigins: [origin],
    fetch: (url, init) => fetch(url, init),
    sleep: async (ms) => {
      await delay(ms);
    },
    now: () => Date.now(),
    politeness: FAST,
    userAgent: USER_AGENT,
    maxBytes: MAX_IMAGE_BYTES,
    print: (line) => {
      lines.push(line);
    },
    ...overrides,
  };
  return { options, lines };
}

export async function manifestRecords(root: string): Promise<ManifestRecord[]> {
  const text = await readFile(path.join(root, MANIFEST_FILE), 'utf8');
  return manifestSchema.parse(JSON.parse(text)).files;
}

export async function hasFile(root: string, file: string): Promise<boolean> {
  try {
    await readFile(path.join(root, file));
    return true;
  } catch {
    return false;
  }
}

// The sha256 of a file under the root.
export async function fileSha(root: string, file: string): Promise<string> {
  const bytes = await readFile(path.join(root, file));
  return sha256(bytes);
}

// Collects what runCli writes.
export function captureIo() {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    io: {
      stdout: (text: string) => {
        out.push(text);
      },
      stderr: (text: string) => {
        err.push(text);
      },
    },
  };
}
