// The text of every file the snapshot converter writes: the snapshot JSON files, the product
// hues module and PROVENANCE.md. Each goes through Prettier with the repository's config, so
// `npm run format:check` accepts the output and a second run writes the same bytes.
import path from 'node:path';

import { REPO_ROOT } from './paths';
import type { PrototypeHue } from './prototype';
import { formatSummary } from '../crawl/summary-cli';

// Prettier with the config and plugins of the repository for `repoPath` (relative to the
// repository root), whichever folder the text is written to.
export async function formatForRepo(text: string, repoPath: string): Promise<string> {
  return formatSummary(text, path.join(REPO_ROOT, repoPath));
}

export function renderJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

const pair = ([primary, secondary]: readonly [string, string]) => `['${primary}', '${secondary}']`;

// src/content/hues.ts: code, not content (A7).
export function renderHues(hues: readonly (readonly [string, PrototypeHue])[]): string {
  const lines = hues.map(
    ([id, hue]) => `  '${id}': { light: ${pair(hue.light)}, dark: ${pair(hue.dark)} },`,
  );
  return [
    '// Product hues (A7: they stay in code): the primary and secondary colour of each system in the',
    "// light and the dark theme (the prototype's `--hue-l`, `--hue-l2`, `--hue-d` and `--hue-d2`), by",
    '// product id. A system without an entry has none. Converted once from the prototype data by',
    '// `npm run snapshot:convert` (content-snapshot/PROVENANCE.md); edit this file directly now.',
    'export interface ProductHue {',
    '  readonly light: readonly [string, string];',
    '  readonly dark: readonly [string, string];',
    '}',
    '',
    'export const PRODUCT_HUES: Readonly<Record<string, ProductHue>> = {',
    ...lines,
    '};',
    '',
  ].join('\n');
}

export interface Provenance {
  readonly sourceName: string;
  readonly sha256: string;
  readonly date: string;
}

const SHA_LINE = /^- SHA-256: `([\da-f]{64})`$/mu;
const DATE_LINE = /^- Converted: (\d{4}-\d{2}-\d{2})$/mu;

// The SHA-256 and the date a committed PROVENANCE.md records, or null.
export function readProvenance(text: string): { sha256: string; date: string } | null {
  const sha256 = SHA_LINE.exec(text)?.[1];
  const date = DATE_LINE.exec(text)?.[1];
  return sha256 === undefined || date === undefined ? null : { sha256, date };
}

// The file name only: the repository is public, so a local path never goes in.
export function renderProvenance({ sourceName, sha256, date }: Provenance): string {
  return `# Content snapshot provenance

\`npm run snapshot:convert\` (\`scripts/snapshot/\`) converted the prototype's data file into
this folder once (decision P1-10). This folder is now the source of truth: content edits go into
these files directly, never through the converter.

- Source: \`${sourceName}\`
- SHA-256: \`${sha256}\`
- Converted: ${date}

The converter wrote every collection file, \`finder.json\` and \`src/content/hues.ts\`. Not
converted from the data file:

- the Site copy files (\`site-copy-*.json\`) and \`languages.json\`, transcribed from the
  prototype page, except the new English the prototype has no text for (decision A6): the 404
  copy (\`site-copy-not-found.json\`, its \`name\` for the page title included) and the skip link
  (\`skipLink\` in \`site-copy-common.json\`);
- the nav section labels, transcribed from the prototype page's header (\`NAV_SECTIONS\` in
  \`scripts/snapshot/convert-data.ts\`);
- the media alt text no pattern gives, written after viewing each image (\`ALT_BY_MEDIA\` in
  \`scripts/snapshot/alt-text.ts\`);
- the media files and their sources, from \`src/assets/media/manifest.json\`.
`;
}
