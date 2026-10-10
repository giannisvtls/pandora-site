// `npm run snapshot:convert` on the fixture data file in a scratch repository root: it writes
// every output file, the same bytes on a second run, a PROVENANCE.md that names the source file
// (never its path) and keeps its date while the source is unchanged.
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { runConvertCli } from '../convert-cli';
import { REPO_ROOT } from '../paths';
import { readProvenance } from '../render';
import { dataFile, fixtureJson, INPUTS, MANIFEST, type Loose } from './fixture';

const temporaryRoots: string[] = [];

afterAll(async () => {
  await Promise.all(
    temporaryRoots.map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

// A repository root with the fixture's media manifest and a home Site copy whose proof rail is
// the fixture's; returns it and the path of the data file in it.
async function sandbox(): Promise<{ root: string; source: string }> {
  const root = await mkdtemp(path.join(tmpdir(), 'snapshot-convert-'));
  temporaryRoots.push(root);
  for (const folder of ['content-snapshot', 'src/assets/media', 'src/content', 'design']) {
    await mkdir(path.join(root, folder), { recursive: true });
  }
  const files = MANIFEST.map((entry) => ({
    ...entry,
    bytes: 1,
    sha256: '0'.repeat(64),
    contentType: entry.file.endsWith('.png') ? 'image/png' : 'image/webp',
    fetchedAt: '2026-10-09T00:00:00.000Z',
  }));
  await writeFile(path.join(root, 'src/assets/media/manifest.json'), JSON.stringify({ files }));
  const homeFile = 'content-snapshot/site-copy-home.json';
  const home = JSON.parse(await readFile(path.join(REPO_ROOT, homeFile), 'utf8')) as {
    proof: Loose;
  };
  home.proof.shots = INPUTS.proofShots;
  await writeFile(path.join(root, homeFile), JSON.stringify(home));
  const source = path.join(root, 'design', 'nightwatch-data.js');
  await writeFile(source, dataFile());
  return { root, source };
}

// What the command line prints and returns.
async function run(argv: string[], root: string, today = '2026-10-09') {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runConvertCli(
    argv,
    { root, today },
    {
      stdout: (text) => {
        out.push(text);
      },
      stderr: (text) => {
        err.push(text);
      },
    },
  );
  return { code, stdout: out.join(''), stderr: err.join('') };
}

const readText = async (root: string, file: string) => readFile(path.join(root, file), 'utf8');

describe('npm run snapshot:convert', () => {
  it('writes every file, then the same bytes on a second run, keeping the date', async () => {
    const { root, source } = await sandbox();

    const first = await run(['--source', source], root);
    const products = await readText(root, 'content-snapshot/products.json');
    const second = await run(['--source', source], root, '2026-12-31');

    expect(first.code).toBe(0);
    expect(first.stdout).toContain('wrote content-snapshot/finder.json');
    expect(first.stdout).toContain('wrote src/content/hues.ts');
    expect(first.stdout).toContain('wrote content-snapshot/PROVENANCE.md');
    expect(second.code).toBe(0);
    expect(second.stdout).not.toContain('wrote ');
    expect(second.stdout.match(/^unchanged /gmu)).toHaveLength(16);
    expect(await readText(root, 'content-snapshot/products.json')).toBe(products);
    // Prettier's JSON style, as format:check expects.
    expect(products).toContain('"showIn": ["en", "el", "it", "sq"],');
    const provenance = await readText(root, 'content-snapshot/PROVENANCE.md');
    expect(readProvenance(provenance)).toMatchObject({ date: '2026-10-09' });
    expect(provenance).toContain('- Source: `nightwatch-data.js`');
    expect(provenance).not.toContain(path.basename(root));
  });

  it('records a new SHA-256 and date when the source changes', async () => {
    const { root, source } = await sandbox();
    await run(['--source', source], root);
    const before = readProvenance(await readText(root, 'content-snapshot/PROVENANCE.md'));
    await writeFile(source, dataFile(fixtureJson.replace('Test tag beta', 'Test tag gamma')));

    const changed = await run(['--source', source], root, '2026-12-31');

    expect(changed.stdout).toContain('wrote content-snapshot/products.json');
    const after = readProvenance(await readText(root, 'content-snapshot/PROVENANCE.md'));
    expect(after?.date).toBe('2026-12-31');
    expect(after?.sha256).not.toBe(before?.sha256);
  });

  it('reports the alts other than a pattern, telling the prototype alt apart, and what it left out', async () => {
    const { root, source } = await sandbox();
    const data = JSON.parse(fixtureJson) as Loose;
    (data.postImg as Loose).second = 'https://invetec.eu/test/motodays.webp';
    await writeFile(source, dataFile(JSON.stringify(data)));

    const { stdout } = await run(['--source', source], root);

    expect(stdout).toContain(
      [
        'media alt text other than its pattern:',
        '  20260218-motodays-2026-gr: "MotoDays 2026 poster, Fiera di Roma" (the prototype\'s alt)',
        '  camper: decorative',
        '  car: decorative',
        '  pandora-ps-330: "Pandora PS-330 siren" (no pattern; written after viewing)',
        '  pandora-smart-v4-homepage-frame: "Pandora Smart V4 package and the Pandora Connect app on a phone" (no pattern; written after viewing)',
        'left out:',
        '  products[].features: the feature bullets (P1-12)',
      ].join('\n'),
    );
    expect(stdout).toContain('  hues.parked: not a launch product\nwrote ');
  });

  it('writes the hues module as code', async () => {
    const { root, source } = await sandbox();
    await run(['--source', source], root);

    expect(await readText(root, 'src/content/hues.ts')).toContain(
      "  alpha: { light: ['#018BC9', '#012C55'], dark: ['#34BFFE', '#0382FC'] },\n",
    );
  });

  it('refuses a relative source path (exit 2) and reports a failed run (exit 1)', async () => {
    const { root } = await sandbox();

    const relative = await run(['--source', 'nightwatch-data.js'], root);
    expect(relative.code).toBe(2);
    expect(relative.stderr).toContain('--source needs an absolute path');
    const missing = await run(['--source', path.join(root, 'missing.js')], root);
    expect(missing.code).toBe(1);
    expect(missing.stderr).toMatch(/^snapshot:convert failed: /u);
  });
});
