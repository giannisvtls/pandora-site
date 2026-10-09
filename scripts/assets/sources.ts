// scripts/assets/media-sources.json: every image the launch site takes from the live site or the
// prototype folder, each with the repository file it becomes and every place the prototype uses
// it. `npm run media:sources` writes it, `npm run media:fetch` reads it. Both run `checkSources`,
// so a hand-edited file can name neither another site, nor a query string, nor a path outside
// the asset folders.
import { z } from 'zod';

import { BRAND_DIR, DESIGN_IMAGE_PREFIX, FAVICON_FILE, MEDIA_DIR } from './config';
import { byCodeUnit } from '../crawl/output';

const usesSchema = z.array(z.string().min(1)).min(1);

export const urlSourceSchema = z.strictObject({
  url: z.string(),
  file: z.string(),
  uses: usesSchema,
});
export type UrlSource = z.infer<typeof urlSourceSchema>;

export const designSourceSchema = z.strictObject({
  designFile: z.string(),
  file: z.string(),
  uses: usesSchema,
});
export type DesignSource = z.infer<typeof designSourceSchema>;

export const mediaSourcesSchema = z.strictObject({
  // Content images: the launch catalogue, categories, the home page and the posts.
  media: z.array(urlSourceSchema),
  // Site chrome: the logos and the favicon.
  chrome: z.array(urlSourceSchema),
  // Images already in the prototype folder, copied rather than fetched.
  designFiles: z.array(designSourceSchema),
});
export type MediaSources = z.infer<typeof mediaSourcesSchema>;

// The parts WordPress appends to an upload's name: an intermediate size (`-300x90`), the
// big-image copy (`-scaled`) and an edited copy (`-e1770714262162`).
const WORDPRESS_SUFFIX_PART = /^(?:\d+x\d+|scaled|e\d{10,})$/u;
const IMAGE_EXTENSIONS = new Set(['avif', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp']);
const KEBAB_NAME = /^[a-z\d]+(?:-[a-z\d]+)*\.[a-z\d]+$/u;

function decodedBasename(pathname: string): string {
  const raw = pathname.slice(pathname.lastIndexOf('/') + 1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

// The file name an image URL is stored under: its basename in lower-case kebab-case, without the
// WordPress suffixes. Throws when nothing usable is left.
export function mediaFileName(url: string): string {
  const base = decodedBasename(new URL(url).pathname);
  const dot = base.lastIndexOf('.');
  const extension = dot === -1 ? '' : base.slice(dot + 1).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(extension)) {
    throw new Error(`${url}: the file name has no image extension`);
  }
  const parts = base
    .slice(0, dot)
    .toLowerCase()
    .split(/[^a-z\d]+/u)
    .filter((part) => part !== '');
  while (parts.length > 1 && WORDPRESS_SUFFIX_PART.test(parts.at(-1) ?? '')) {
    parts.pop();
  }
  if (parts.length === 0) {
    throw new Error(`${url}: the file name has no letters or digits to keep`);
  }
  return `${parts.join('-')}.${extension}`;
}

// Where a prototype image is copied: `img/pricelist/acc-band.png` -> src/assets/media/pricelist/.
export function designTargetFile(designFile: string): string {
  return `${MEDIA_DIR}/${designFile.slice(DESIGN_IMAGE_PREFIX.length)}`;
}

// Why `url` may not be requested, or null: only plain https URLs on an allowed origin, without
// credentials, a query string or a fragment.
export function urlProblem(url: string, allowedOrigins: readonly string[]): string | null {
  const parsed = URL.parse(url);
  if (parsed === null) {
    return 'not a URL';
  }
  if (!allowedOrigins.includes(parsed.origin)) {
    return `origin ${parsed.origin} is not allowed`;
  }
  if (parsed.username !== '' || parsed.password !== '') {
    return 'has credentials';
  }
  if (url.includes('?')) {
    return 'has a query string';
  }
  return url.includes('#') ? 'has a fragment' : null;
}

function expectedUrlFile(kind: 'media' | 'chrome', url: string): string[] {
  const name = mediaFileName(url);
  return kind === 'media' ? [`${MEDIA_DIR}/${name}`] : [`${BRAND_DIR}/${name}`, FAVICON_FILE];
}

function urlEntryProblems(
  kind: 'media' | 'chrome',
  entry: UrlSource,
  allowedOrigins: readonly string[],
): string[] {
  const problem = urlProblem(entry.url, allowedOrigins);
  if (problem !== null) {
    return [`${kind} ${entry.url}: ${problem}`];
  }
  try {
    const allowed = expectedUrlFile(kind, entry.url);
    return allowed.includes(entry.file)
      ? []
      : [`${kind} ${entry.url}: file must be ${allowed.join(' or ')}, not ${entry.file}`];
  } catch (error) {
    return [`${kind} ${error instanceof Error ? error.message : String(error)}`];
  }
}

const DESIGN_FILE =
  /^img\/(?:[a-z\d]+(?:-[a-z\d]+)*\/)*[a-z\d]+(?:-[a-z\d]+)*\.(?:jpe?g|png|webp)$/u;

function designEntryProblems(entry: DesignSource): string[] {
  if (!DESIGN_FILE.test(entry.designFile)) {
    return [`design file ${entry.designFile}: not a kebab-case image path under img/`];
  }
  const file = designTargetFile(entry.designFile);
  return entry.file === file
    ? []
    : [`design file ${entry.designFile}: file must be ${file}, not ${entry.file}`];
}

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      repeated.add(value);
    }
    seen.add(value);
  }
  return [...repeated].toSorted(byCodeUnit);
}

// Every problem of a sources file, or an empty list.
export function checkSources(sources: MediaSources, allowedOrigins: readonly string[]): string[] {
  const urlEntries = [
    ...sources.media.map((entry) => ({ kind: 'media' as const, entry })),
    ...sources.chrome.map((entry) => ({ kind: 'chrome' as const, entry })),
  ];
  const files = [
    ...urlEntries.map(({ entry }) => entry.file),
    ...sources.designFiles.map((entry) => entry.file),
  ];
  return [
    ...urlEntries.flatMap(({ kind, entry }) => urlEntryProblems(kind, entry, allowedOrigins)),
    ...sources.designFiles.flatMap((entry) => designEntryProblems(entry)),
    ...files
      .filter((file) => !KEBAB_NAME.test(file.slice(file.lastIndexOf('/') + 1)))
      .map((file) => `file ${file}: the name is not lower-case kebab-case`),
    ...duplicates(urlEntries.map(({ entry }) => entry.url)).map(
      (url) => `URL listed twice: ${url}`,
    ),
    ...duplicates(sources.designFiles.map((entry) => entry.designFile)).map(
      (file) => `design file listed twice: ${file}`,
    ),
    ...duplicates(files).map((file) => `two sources write ${file}`),
  ];
}

// Parses and checks a sources file; throws with every problem.
export function parseSources(text: string, allowedOrigins: readonly string[]): MediaSources {
  const sources = mediaSourcesSchema.parse(JSON.parse(text));
  const problems = checkSources(sources, allowedOrigins);
  if (problems.length > 0) {
    throw new Error(`invalid media sources:\n  ${problems.join('\n  ')}`);
  }
  return sources;
}

function byFile<T extends { file: string }>(entries: readonly T[]): T[] {
  return entries.toSorted((a, b) => byCodeUnit(a.file, b.file));
}

// The committed form: entries sorted by file, two-space JSON, one final newline.
export function renderSources(sources: MediaSources): string {
  const sorted: MediaSources = {
    media: byFile(sources.media),
    chrome: byFile(sources.chrome),
    designFiles: byFile(sources.designFiles),
  };
  return `${JSON.stringify(sorted, null, 2)}\n`;
}
