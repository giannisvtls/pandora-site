// Command line of `npm run snapshot:convert -- --source <absolute path>`: reads the prototype's
// data file, converts it (convert-data.ts) and writes every collection file and finder.json in
// content-snapshot/, src/content/hues.ts and content-snapshot/PROVENANCE.md. It makes no request.
// Written to run once (P1-10); it is deterministic, so a second run on the same file writes the
// same bytes, and PROVENANCE.md keeps its date while the source's SHA-256 is unchanged.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { PROTOTYPE_ALT_IDS } from './alt-text';
import { convertPrototype, type Converted, type ProofShot } from './convert-data';
import { HUES_FILE, PROVENANCE_FILE, REPO_ROOT } from './paths';
import { readPrototype } from './prototype';
import { formatForRepo, readProvenance, renderHues, renderJson, renderProvenance } from './render';
import {
  COLLECTIONS,
  siteCopyHomeSchema,
  snapshotFileName,
  type CollectionName,
} from '../../src/content/contract';
import { MANIFEST_FILE } from '../assets/config';
import { readManifest, sha256 } from '../assets/manifest';

export const CONVERT_EXIT_CODES = { ok: 0, failed: 1, usage: 2 } as const;

export const CONVERT_USAGE = `Usage: npm run snapshot:convert -- --source <absolute path to nightwatch-data.js>

Converts the prototype's data file into content-snapshot/ (every collection file and
finder.json), src/content/hues.ts and content-snapshot/PROVENANCE.md. It runs once: afterwards
content-snapshot/ is the source of truth and is edited directly. Makes no request.

Options:
  --source <path>  the prototype's data file (absolute path); read as data, never run
  -h, --help       print this help and exit

Exit codes: 0 written (or already the same), 1 invalid data, 2 bad arguments.
`;

export interface ConvertIo {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
}

const processIo: ConvertIo = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
};

export interface ConvertRun {
  // The repository root the inputs are read from and the output written to.
  readonly root: string;
  // Today's date (YYYY-MM-DD), recorded in PROVENANCE.md when the source is new.
  readonly today: string;
}

function parseConvertArgs(argv: readonly string[]) {
  const { values } = parseArgs({
    args: [...argv],
    strict: true,
    allowPositionals: false,
    options: { source: { type: 'string' }, help: { type: 'boolean', short: 'h' } },
  });
  const source = values.source;
  if (values.help !== true && (source === undefined || !path.isAbsolute(source))) {
    throw new Error('--source needs an absolute path');
  }
  return { isHelp: values.help ?? false, source: source ?? '' };
}

async function readOptional(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch {
    return null;
  }
}

// The cars of the home proof rail, from the committed Site copy.
async function proofShotsOf(root: string): Promise<readonly ProofShot[]> {
  const file = path.join(root, 'content-snapshot', snapshotFileName('siteCopyHome'));
  const home = siteCopyHomeSchema.parse(JSON.parse(await readFile(file, 'utf8')));
  return home.proof.shots;
}

// Every output file (repository path -> text, before Prettier).
function outputsOf(converted: Converted): [string, string][] {
  const names = Object.keys(COLLECTIONS) as CollectionName[];
  return [
    ...names.map((name): [string, string] => [
      `content-snapshot/${snapshotFileName(name)}`,
      renderJson(converted.collections[name]),
    ]),
    [`content-snapshot/${snapshotFileName('finder')}`, renderJson(converted.finder)],
    [HUES_FILE, renderHues(converted.hues)],
  ];
}

// How a media item got an alt other than its pattern's.
function altNote({ id, text }: Converted['media'][number]): string {
  if ('decorative' in text) return 'decorative';
  if (PROTOTYPE_ALT_IDS.has(id)) return `"${text.alt}" (the prototype's alt)`;
  return text.pattern === undefined
    ? `"${text.alt}" (no pattern; written after viewing)`
    : `"${text.alt}" (the pattern gives "${text.pattern}")`;
}

// What the run did, for the person who runs it.
function report(converted: Converted, written: readonly string[]): string {
  const counts = Object.entries(converted.collections).map(
    ([name, items]) => `  ${name}: ${String(items.length)}`,
  );
  const altLines = converted.media
    .filter(({ text }) => !('alt' in text) || text.pattern !== text.alt)
    .map((media) => `  ${media.id}: ${altNote(media)}`);
  return [
    'items:',
    ...counts,
    `  hues: ${String(converted.hues.length)}`,
    'media alt text other than its pattern:',
    ...altLines,
    'left out:',
    ...converted.dropped.map((line) => `  ${line}`),
    ...written,
    '',
  ].join('\n');
}

// Converts `source` into the snapshot under `run.root`; returns the report.
export async function runConvert(source: string, run: ConvertRun): Promise<string> {
  const bytes = await readFile(source);
  const data = readPrototype(new TextDecoder().decode(bytes));
  const manifest = await readManifest(path.join(run.root, MANIFEST_FILE));
  const converted = convertPrototype(data, {
    manifest: manifest.values().toArray(),
    proofShots: await proofShotsOf(run.root),
  });

  const hash = sha256(bytes);
  const previous = readProvenance((await readOptional(path.join(run.root, PROVENANCE_FILE))) ?? '');
  const date = previous?.sha256 === hash ? previous.date : run.today;
  const outputs = [
    ...outputsOf(converted),
    [
      PROVENANCE_FILE,
      renderProvenance({ sourceName: path.basename(source), sha256: hash, date }),
    ] as [string, string],
  ];

  const written: string[] = [];
  for (const [repoPath, raw] of outputs) {
    const text = await formatForRepo(raw, repoPath);
    const target = path.join(run.root, repoPath);
    if ((await readOptional(target)) === text) {
      written.push(`unchanged ${repoPath}`);
    } else {
      await writeFile(target, text, 'utf8');
      written.push(`wrote ${repoPath}`);
    }
  }
  return report(converted, written);
}

export async function runConvertCli(
  argv: readonly string[],
  run?: ConvertRun,
  io: ConvertIo = processIo,
): Promise<number> {
  const where = run ?? { root: REPO_ROOT, today: new Date().toISOString().slice(0, 10) };
  let args: ReturnType<typeof parseConvertArgs>;
  try {
    args = parseConvertArgs(argv);
  } catch (error) {
    io.stderr(`${error instanceof Error ? error.message : String(error)}\n\n${CONVERT_USAGE}`);
    return CONVERT_EXIT_CODES.usage;
  }
  if (args.isHelp) {
    io.stdout(CONVERT_USAGE);
    return CONVERT_EXIT_CODES.ok;
  }
  try {
    io.stdout(await runConvert(args.source, where));
    return CONVERT_EXIT_CODES.ok;
  } catch (error) {
    io.stderr(
      `snapshot:convert failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return CONVERT_EXIT_CODES.failed;
  }
}
