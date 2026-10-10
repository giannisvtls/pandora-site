// Command line of `npm run media:sources -- --design-dir <absolute path> [--check]`: reads the
// prototype's data file and page from the design folder, applies the rule of extract.ts and
// writes scripts/assets/media-sources.json, or with --check only compares. It makes no request.
import { access, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { ALLOWED_ORIGINS, DESIGN_DATA_FILE, DESIGN_HTML_FILE, SOURCES_FILE } from './config';
import { extractSources, parsePrototypeData, type Extraction } from './extract';
import { checkSources, renderSources, type MediaSources } from './sources';
import { byCodeUnit } from '../crawl/output';

export const EXTRACT_EXIT_CODES = { ok: 0, failed: 1, usage: 2 } as const;

export const EXTRACT_USAGE = `Usage: npm run media:sources -- --design-dir <absolute path> [--check]

Reads ${DESIGN_DATA_FILE} and ${DESIGN_HTML_FILE} in the design folder and writes
${SOURCES_FILE}: every image the launch site uses, with its file and its uses. Makes no request.

Options:
  --design-dir <path>  the prototype's design_files folder (absolute path)
  --check              write nothing; exit 1 when the committed file differs
  -h, --help           print this help and exit

Exit codes: 0 written or in sync, 1 out of sync or invalid data, 2 bad arguments.
`;

export interface ExtractIo {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
}

const processIo: ExtractIo = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
};

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

function parseExtractArgs(argv: readonly string[]) {
  const { values } = parseArgs({
    args: [...argv],
    strict: true,
    allowPositionals: false,
    options: {
      'design-dir': { type: 'string' },
      check: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  const designDir = values['design-dir'];
  if (values.help !== true && (designDir === undefined || !path.isAbsolute(designDir))) {
    throw new Error('--design-dir needs an absolute path');
  }
  return {
    isHelp: values.help ?? false,
    isCheck: values.check ?? false,
    designDir: designDir ?? '',
  };
}

// Every design file must exist; files in their folders that no source names are reported.
async function designFileNotes(designDir: string, sources: MediaSources): Promise<string[]> {
  const folders = new Set<string>();
  for (const { designFile } of sources.designFiles) {
    folders.add(path.posix.dirname(designFile));
    try {
      await access(path.join(designDir, designFile));
    } catch {
      throw new Error(`missing design file ${designFile}`);
    }
  }
  const named = new Set(sources.designFiles.map(({ designFile }) => designFile));
  const notes: string[] = [];
  for (const folder of [...folders].toSorted(byCodeUnit)) {
    const names = await readdir(path.join(designDir, folder));
    const unnamed = names.map((name) => `${folder}/${name}`).filter((file) => !named.has(file));
    for (const file of unnamed.toSorted(byCodeUnit)) {
      notes.push(`not referenced by the launch site, not copied: ${file}`);
    }
  }
  return notes;
}

function summary(extraction: Extraction, notes: readonly string[]): string {
  const { sources, leftOut } = extraction;
  const lines = [
    `media: ${String(sources.media.length)} URLs`,
    `chrome: ${String(sources.chrome.length)} URLs`,
    `design files: ${String(sources.designFiles.length)}`,
    `left out: ${String(leftOut.length)} image references of ${DESIGN_DATA_FILE}`,
    ...leftOut.map(({ ref, at }) => `  ${ref}  <- ${at.join(', ')}`),
    ...notes,
  ];
  return `${lines.join('\n')}\n`;
}

async function readCommitted(target: string): Promise<string> {
  try {
    return await readFile(target, 'utf8');
  } catch {
    return '';
  }
}

// Extracts, prints the summary, and writes (or compares) the sources file; returns the exit code.
async function extractInto(
  args: ReturnType<typeof parseExtractArgs>,
  root: string,
  io: ExtractIo,
): Promise<number> {
  const dataText = await readFile(path.join(args.designDir, DESIGN_DATA_FILE), 'utf8');
  const html = await readFile(path.join(args.designDir, DESIGN_HTML_FILE), 'utf8');
  const extraction = extractSources(parsePrototypeData(dataText), html);
  const problems = checkSources(extraction.sources, ALLOWED_ORIGINS);
  if (problems.length > 0) {
    throw new Error(`the selected sources are invalid:\n  ${problems.join('\n  ')}`);
  }
  io.stdout(summary(extraction, await designFileNotes(args.designDir, extraction.sources)));
  const text = renderSources(extraction.sources);
  const target = path.join(root, SOURCES_FILE);
  if (!args.isCheck) {
    await writeFile(target, text, 'utf8');
    io.stdout(`wrote ${SOURCES_FILE}\n`);
    return EXTRACT_EXIT_CODES.ok;
  }
  const isSame = (await readCommitted(target)) === text;
  io.stdout(isSame ? `${SOURCES_FILE} is in sync\n` : `${SOURCES_FILE} differs\n`);
  return isSame ? EXTRACT_EXIT_CODES.ok : EXTRACT_EXIT_CODES.failed;
}

export async function runExtractCli(
  argv: readonly string[],
  root: string = REPO_ROOT,
  io: ExtractIo = processIo,
): Promise<number> {
  let args: ReturnType<typeof parseExtractArgs>;
  try {
    args = parseExtractArgs(argv);
  } catch (error) {
    io.stderr(`${error instanceof Error ? error.message : String(error)}\n\n${EXTRACT_USAGE}`);
    return EXTRACT_EXIT_CODES.usage;
  }
  if (args.isHelp) {
    io.stdout(EXTRACT_USAGE);
    return EXTRACT_EXIT_CODES.ok;
  }
  try {
    return await extractInto(args, root, io);
  } catch (error) {
    io.stderr(`media:sources failed: ${error instanceof Error ? error.message : String(error)}\n`);
    return EXTRACT_EXIT_CODES.failed;
  }
}
