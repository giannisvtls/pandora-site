// The build's files beside its pages (spec §9), finished once Astro has written everything
// (`astro:build:done`, in dist/):
// - `_redirects`, the static host's redirect file: line 1 is the root redirect from the live
//   languages (seo.ts `redirectsFile`); a different _redirects already in dist/ (a
//   public/_redirects) fails the build. The query module needs Vite and astro:content, which
//   this hook does not have, so it reads the snapshot through the converter's reader and the
//   publish rules (rules.ts);
// - each language's 404 page moved from {L}/404/index.html to {L}/404.html, its URL (routes.ts):
//   Astro writes only the root /404 route as 404.html;
// - the images in _astro/ that no built file names deleted: media.ts imports every media file, so
//   Astro writes each original, and it deletes only the originals an <Image> transformed whose
//   raw `src` nothing read.
import { readdir, readFile, rename, rmdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';

import { readSnapshot } from '../../scripts/snapshot/read-snapshot';
import { LOCALES, type Languages, type Locale } from '../content/contract';
import { liveLanguages } from '../content/rules';
import { redirectsFile } from '../content/seo';

const isFile = async (file: string): Promise<boolean> => {
  try {
    const stats = await stat(file);
    return stats.isFile();
  } catch {
    return false;
  }
};

// Moves each language's {L}/404/index.html under `dir` to {L}/404.html and removes the emptied
// folder (a folder that holds anything else fails). Returns the languages moved.
export async function moveNotFoundPages(dir: string): Promise<Locale[]> {
  const moved: Locale[] = [];
  for (const locale of LOCALES) {
    const folder = path.join(dir, locale, '404');
    if (!(await isFile(path.join(folder, 'index.html')))) continue;
    await rename(path.join(folder, 'index.html'), path.join(dir, locale, '404.html'));
    await rmdir(folder);
    moved.push(locale);
  }
  return moved;
}

// An image Astro writes into _astro/ (an original, or an <Image> output).
const IMAGE_FILE = /^_astro\/[^/]+\.(?:avif|gif|jpe?g|png|svg|webp)$/iu;
// Files that cannot name another file: raster images and fonts. Every other file (HTML, CSS,
// JavaScript, XML, SVG, text) is searched.
const BINARY_FILE = /\.(?:avif|gif|ico|jpe?g|png|webp|woff2?|ttf|otf)$/iu;

// The file names among `names` that no text in `texts` holds, as written or URL-encoded. A name
// carries Astro's content hash, so it does not turn up by chance; a match anywhere (a src, a
// srcset, a CSS url(), a script, a JSON prop) keeps the file.
export function unreferenced(names: readonly string[], texts: readonly string[]): string[] {
  return names.filter((name) =>
    texts.every((text) => !text.includes(name) && !text.includes(encodeURIComponent(name))),
  );
}

// Every file under `dir`, relative to it, with `/`.
async function filesIn(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)))
    .map((file) => file.replaceAll('\\', '/'));
}

export interface Pruned {
  // The deleted file names, in _astro/.
  readonly files: readonly string[];
  readonly bytes: number;
}

// Deletes the images directly in `dir`/_astro/ that no other built file names; fonts
// (_astro/fonts/) and the files of public/ are never touched.
export async function pruneUnreferencedImages(dir: string): Promise<Pruned> {
  const files = await filesIn(dir);
  const names = files
    .filter((file) => IMAGE_FILE.test(file))
    .map((file) => path.posix.basename(file));
  const sources = files.filter((file) => !BINARY_FILE.test(file));
  const texts = await Promise.all(sources.map((file) => readFile(path.join(dir, file), 'utf8')));
  const deleted = unreferenced(names, texts);
  let bytes = 0;
  for (const name of deleted) {
    const file = path.join(dir, '_astro', name);
    const { size } = await stat(file);
    await unlink(file);
    bytes += size;
  }
  return { files: deleted, bytes };
}

export interface Finished {
  readonly redirects: string;
  readonly moved: readonly Locale[];
  readonly pruned: Pruned;
}

// The text of `file`, or undefined when there is no such file.
async function textOfFile(file: string): Promise<string | undefined> {
  return (await isFile(file)) ? readFile(file, 'utf8') : undefined;
}

// Writes `redirects` as `dir`/_redirects. Astro copies public/ into dist/ first, so an existing
// file that says something else came from a public/_redirects, whose rules the generated file
// would silently replace: that fails the build. The same text again (the hook run once more over
// a finished dist/) passes.
async function writeRedirects(dir: string, redirects: string): Promise<void> {
  const file = path.join(dir, '_redirects');
  const existing = await textOfFile(file);
  if (existing !== undefined && existing !== redirects) {
    throw new Error(
      'The build writes _redirects from the live languages, but dist/ already has a different ' +
        '_redirects (from a public/_redirects?): remove public/_redirects and add its rules ' +
        'through redirectsFile in src/content/seo.ts',
    );
  }
  await writeFile(file, redirects);
}

// Finishes the build in `dir` (dist/) for the `languages` global: writes `_redirects` (refusing a
// different one already there), moves the 404 pages (every live language must then have its
// {L}/404.html) and prunes the images.
export async function finishBuild(dir: string, languages: Languages): Promise<Finished> {
  const redirects = redirectsFile(languages);
  await writeRedirects(dir, redirects);
  const moved = await moveNotFoundPages(dir);
  for (const locale of liveLanguages(languages)) {
    if (!(await isFile(path.join(dir, locale, '404.html')))) {
      throw new Error(`The build has no 404 page for "${locale}": ${locale}/404.html is missing`);
    }
  }
  return { redirects, moved, pruned: await pruneUnreferencedImages(dir) };
}

// The integration (astro.config.mjs): reads the snapshot under the project root once the build
// is done, then finishes dist/.
export function buildFiles(): AstroIntegration {
  let root = '';
  return {
    name: 'build-files',
    hooks: {
      'astro:config:done': ({ config }) => {
        root = fileURLToPath(config.root);
      },
      'astro:build:done': async ({ dir, logger }) => {
        const { languages } = await readSnapshot(root);
        const { redirects, moved, pruned } = await finishBuild(fileURLToPath(dir), languages);
        const kilobytes = Math.round(pruned.bytes / 1024);
        logger.info(`_redirects: ${redirects.trimEnd()}`);
        const pages = moved.map((locale) => `${locale}/404.html`);
        logger.info(`404 pages moved: ${pages.join(', ') || 'none'}`);
        logger.info(
          `${String(pruned.files.length)} unreferenced images deleted (${String(kilobytes)} KB)`,
        );
      },
    },
  };
}
