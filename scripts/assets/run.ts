// The run behind `npm run media:fetch` (the command line is fetch-cli.ts): makes every file of
// scripts/assets/media-sources.json exist in the repository, as recorded in
// src/assets/media/manifest.json. A file whose bytes match its record is current and skipped, so a
// run after a complete one sends no request at all (robots.txt included). Prototype images are
// copied from the design folder, which only a run that has some to copy needs. Missing images are
// downloaded from the allowed origin after its robots.txt is read; the manifest is saved after
// every file, so a run that fails part-way keeps what it wrote and the next run fetches only what
// is still missing.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { MANIFEST_FILE } from './config';
import { createDownloader, isRobotsTxt } from './download';
import {
  contentTypeOfFile,
  isFileCurrent,
  readManifest,
  renderManifest,
  sha256,
  sourceKey,
  writeFileAtomic,
  type ManifestRecord,
  type Source,
} from './manifest';
import { checkSources, type MediaSources } from './sources';
import type { Politeness } from '../crawl/config';
import type { FetchLike, RequestLogEntry, Sleep } from '../crawl/fetcher';

export interface MediaFetchOptions {
  // The repository root; every `file` is relative to it.
  readonly root: string;
  readonly sources: MediaSources;
  // The prototype's design folder, for the images copied rather than fetched.
  readonly designDir: string | null;
  readonly allowedOrigins: readonly string[];
  readonly fetch: FetchLike;
  readonly sleep: Sleep;
  readonly now: () => number;
  readonly politeness: Politeness;
  readonly userAgent: string;
  readonly maxBytes: number;
  readonly print: (line: string) => void;
}

// Every sent request lands in exactly one bucket: a repeated attempt is a retry, whatever its
// URL; a first attempt is a robots.txt request, an image request or a redirect hop. So
// requests = robots + images + redirectHops + retries.
export interface RequestStats {
  readonly requests: number;
  readonly robots: number;
  readonly images: number;
  readonly redirectHops: number;
  readonly retries: number;
  readonly hosts: string[];
}

export interface MediaFetchResult {
  readonly current: number;
  readonly copied: number;
  readonly fetched: number;
  readonly failed: { readonly url: string; readonly reason: string }[];
  readonly bytesWritten: number;
  readonly stats: RequestStats;
}

interface Target {
  readonly file: string;
  readonly source: Source;
}
type CopyTarget = Target & { readonly source: { readonly designFile: string } };
type DownloadTarget = Target & { readonly source: { readonly url: string } };

// Thrown before anything is written or requested: prototype images must be copied, and no
// design folder was given.
export class DesignDirRequiredError extends Error {}

function targetsOf(sources: MediaSources): Target[] {
  return [
    ...[...sources.media, ...sources.chrome].map(({ file, url }) => ({ file, source: { url } })),
    ...sources.designFiles.map(({ file, designFile }) => ({ file, source: { designFile } })),
  ];
}

function statsOf(log: readonly RequestLogEntry[], imageUrls: ReadonlySet<string>): RequestStats {
  const sent = log.filter((entry) => entry.event === 'sent');
  const first = sent.filter((entry) => entry.attempt === 1);
  const robots = first.filter((entry) => isRobotsTxt(entry.url)).length;
  const images = first.filter((entry) => !isRobotsTxt(entry.url) && imageUrls.has(entry.url));
  return {
    requests: sent.length,
    robots,
    images: images.length,
    redirectHops: first.length - robots - images.length,
    retries: sent.length - first.length,
    hosts: [...new Set(sent.map((entry) => new URL(entry.url).host))],
  };
}

// Saves the manifest one write at a time; each write holds every record so far.
function manifestSaver(manifestPath: string, records: ReadonlyMap<string, ManifestRecord>) {
  let queue: Promise<void> = Promise.resolve();
  const writeAfter = async (previous: Promise<void>) => {
    await previous;
    await writeFileAtomic(manifestPath, renderManifest(records.values()));
  };
  return async () => {
    queue = writeAfter(queue);
    await queue;
  };
}

async function splitCurrent(options: MediaFetchOptions, targets: readonly Target[]) {
  const previous = await readManifest(path.join(options.root, MANIFEST_FILE));
  const records = new Map<string, ManifestRecord>();
  const pending: Target[] = [];
  for (const target of targets) {
    const record = previous.get(target.file);
    const isSameSource =
      record !== undefined && sourceKey(record.source) === sourceKey(target.source);
    if (isSameSource && (await isFileCurrent(options.root, record))) {
      records.set(target.file, record);
    } else {
      pending.push(target);
    }
  }
  const listed = new Set(targets.map((target) => target.file));
  const dropped = previous
    .keys()
    .filter((file) => !listed.has(file))
    .toArray();
  return { records, pending, dropped };
}

function recordOf(
  { file, source }: Target,
  bytes: Uint8Array,
  contentType: string,
  now: number,
): ManifestRecord {
  return {
    file,
    source,
    bytes: bytes.byteLength,
    sha256: sha256(bytes),
    contentType,
    fetchedAt: new Date(now).toISOString(),
  };
}

async function copyDesignFiles(
  options: MediaFetchOptions,
  copies: readonly CopyTarget[],
  records: Map<string, ManifestRecord>,
): Promise<number> {
  let bytesWritten = 0;
  for (const target of copies) {
    const { file, source } = target;
    const bytes = await readFile(path.join(options.designDir ?? '', source.designFile));
    const contentType = contentTypeOfFile(file);
    if (contentType === null || bytes.byteLength === 0) {
      throw new Error(`${source.designFile}: not a non-empty image file`);
    }
    await writeFileAtomic(path.join(options.root, file), bytes);
    records.set(file, recordOf(target, bytes, contentType, options.now()));
    bytesWritten += bytes.byteLength;
    options.print(`copied ${file} (${String(bytes.byteLength)} bytes)`);
  }
  return bytesWritten;
}

// Logs every request and prints one line per finished request.
function requestPrinter(options: MediaFetchOptions, log: RequestLogEntry[]) {
  const attempts = new Map<number, number>();
  return (entry: RequestLogEntry) => {
    log.push(entry);
    if (entry.event === 'sent') {
      attempts.set(entry.seq, entry.attempt);
      return;
    }
    const attempt = String(attempts.get(entry.seq) ?? 0);
    options.print(
      `GET ${entry.url} (attempt ${attempt}) -> ${entry.error ?? String(entry.status)}`,
    );
  };
}

// What the downloads update: the records, the manifest saver and the request log.
interface RunState {
  readonly records: Map<string, ManifestRecord>;
  readonly save: () => Promise<void>;
  readonly log: RequestLogEntry[];
}

// Reads robots.txt, then downloads every target, 2 in flight; returns the failures and the bytes.
async function downloadAll(
  options: MediaFetchOptions,
  downloads: readonly DownloadTarget[],
  { records, save, log }: RunState,
) {
  const failed: { url: string; reason: string }[] = [];
  let bytesWritten = 0;
  const downloader = createDownloader({ ...options, log: requestPrinter(options, log) });
  const origins = new Set(downloads.map(({ source }) => new URL(source.url).origin));
  for (const origin of origins) {
    await downloader.readRobots(origin);
  }
  const fail = (url: string, reason: string) => {
    failed.push({ url, reason });
    options.print(`FAILED ${url}: ${reason}`);
  };
  const fetchOne = async (target: DownloadTarget) => {
    const { file, source } = target;
    const result = await downloader.download(source.url);
    if (!result.ok) {
      fail(source.url, result.reason);
      return;
    }
    // The file name decides how the site serves the bytes, so a response of another type (an SVG
    // behind a .webp name, say) is refused and nothing is written.
    const named = contentTypeOfFile(file);
    if (named !== result.contentType) {
      fail(source.url, `type-mismatch: ${result.contentType}, the file name says ${String(named)}`);
      return;
    }
    await writeFileAtomic(path.join(options.root, file), result.bytes);
    records.set(file, recordOf(target, result.bytes, result.contentType, options.now()));
    bytesWritten += result.bytes.byteLength;
    options.print(
      `fetched ${file} (${result.contentType}, ${String(result.bytes.byteLength)} bytes)`,
    );
    await save();
  };
  await Promise.all(downloads.map((target) => fetchOne(target)));
  return { failed, bytesWritten };
}

export async function runMediaFetch(options: MediaFetchOptions): Promise<MediaFetchResult> {
  const problems = checkSources(options.sources, options.allowedOrigins);
  if (problems.length > 0) {
    throw new Error(`invalid media sources, nothing requested:\n  ${problems.join('\n  ')}`);
  }
  const { records, pending, dropped } = await splitCurrent(options, targetsOf(options.sources));
  const current = records.size;
  const copies = pending.filter((target): target is CopyTarget => 'designFile' in target.source);
  if (copies.length > 0 && options.designDir === null) {
    throw new DesignDirRequiredError(
      `${String(copies.length)} prototype images are missing or changed (${copies[0]?.file ?? ''} first); run again with --design-dir <absolute path of the design folder>. Nothing was requested.`,
    );
  }
  const downloads = pending.filter((target): target is DownloadTarget => 'url' in target.source);
  const save = manifestSaver(path.join(options.root, MANIFEST_FILE), records);
  // A record no source lists leaves the manifest now, before any download that could fail.
  if (dropped.length > 0) {
    await save();
    for (const file of dropped) {
      options.print(`dropped the manifest record of ${file}: no source lists it (the file stays)`);
    }
  }
  const copiedBytes = await copyDesignFiles(options, copies, records);
  if (copies.length > 0) {
    await save();
  }
  const log: RequestLogEntry[] = [];
  const fetched =
    downloads.length === 0
      ? { failed: [], bytesWritten: 0 }
      : await downloadAll(options, downloads, { records, save, log });
  return {
    current,
    copied: copies.length,
    fetched: downloads.length - fetched.failed.length,
    failed: fetched.failed,
    bytesWritten: copiedBytes + fetched.bytesWritten,
    stats: statsOf(log, new Set(downloads.map(({ source }) => source.url))),
  };
}
