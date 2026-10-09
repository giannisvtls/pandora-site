// The pricelist check (`npm run check:pricelist`) on the committed snapshot, which is clean, and
// on copies with one fact changed, which it names.
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { REPO_ROOT } from '../../snapshot/paths';
import { readSnapshot, type SnapshotData } from '../../snapshot/read-snapshot';
import {
  ACC,
  cleanLine,
  MATRIX,
  PRICES,
  pricelistProblems,
  runCheckPricelist,
  SYS,
} from '../check';

type Loose = Record<string, unknown>;

// The snapshot as plain data a test can change: lists of items, and global objects.
type Copy = {
  -readonly [K in keyof SnapshotData]: SnapshotData[K] extends readonly unknown[] ? Loose[] : Loose;
};

const snapshot = await readSnapshot();

// A copy of the snapshot with `change` applied to its plain data.
function changed(change: (copy: Copy) => void): SnapshotData {
  const copy = structuredClone(snapshot) as unknown as Copy;
  change(copy);
  return copy as unknown as SnapshotData;
}

function itemOf(list: Loose[], id: string): Loose {
  const item = list.find((candidate) => candidate.id === id);
  if (item === undefined) throw new Error(`no ${id}`);
  return item;
}

const temporaryRoots: string[] = [];

afterAll(async () => {
  await Promise.all(
    temporaryRoots.map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

// What `runCheckPricelist` prints and returns for `root`.
async function runOn(root: string) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCheckPricelist(root, {
    stdout: (text) => {
      out.push(text);
    },
    stderr: (text) => {
      err.push(text);
    },
  });
  return { code, stdout: out.join(''), stderr: err.join('') };
}

describe('the transcription', () => {
  it('holds the framework tool constants: 14 systems x 22 rows, 16 prices, 38 accessories', () => {
    expect(SYS).toHaveLength(14);
    expect(Object.keys(MATRIX)).toHaveLength(22);
    expect(Object.values(MATRIX).every((row) => row.length === SYS.length)).toBe(true);
    expect(Object.keys(PRICES)).toHaveLength(16);
    expect(Object.keys(ACC)).toHaveLength(38);
  });
});

describe('the committed snapshot', () => {
  it('has no problem, and the run prints the clean line and exits 0', async () => {
    expect(pricelistProblems(snapshot)).toEqual([]);
    expect(cleanLine(snapshot)).toBe(
      'clean: 14 systems × 22 rows, 16 system prices, 38 accessories, finder + tiers consistent',
    );
    expect(await runOn(REPO_ROOT)).toEqual({
      code: 0,
      stdout: `${cleanLine(snapshot)}\n`,
      stderr: '',
    });
  });
});

describe('a copy with one fact changed', () => {
  it('names a wrong accessory price, and the run on a copied snapshot exits 1', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'check-pricelist-'));
    temporaryRoots.push(root);
    await cp(path.join(REPO_ROOT, 'content-snapshot'), path.join(root, 'content-snapshot'), {
      recursive: true,
    });
    const file = path.join(root, 'content-snapshot', 'accessories.json');
    const accessories = JSON.parse(await readFile(file, 'utf8')) as Loose[];
    itemOf(accessories, 'd-061').priceEur = 260;
    await writeFile(file, JSON.stringify(accessories));

    const run = await runOn(root);

    expect(run.code).toBe(1);
    expect(run.stdout).toBe('');
    expect(run.stderr).toBe('accessory d-061 price 260, expected 259\n\n1 problem(s)\n');
  });

  it.each([
    [
      'a matrix value',
      (copy: Copy) => {
        (itemOf(copy.products, 'elite').matrix as Loose).wifi = 0;
      },
      ['specs.elite.wifi = 0, expected 1'],
    ],
    [
      'a system price',
      (copy: Copy) => {
        itemOf(copy.products, 'tracer').priceEur = 229;
      },
      ['product tracer priceEur = 229, expected 219'],
    ],
    [
      'an accessory group',
      (copy: Copy) => {
        itemOf(copy.accessories, 'band').group = 'watches';
      },
      ['accessory band group watches unknown'],
    ],
    [
      'a Finder pick below its level',
      (copy: Copy) => {
        const picks = (copy.finder.picks as Record<string, Record<string, Loose>>).car;
        if (picks?.['3'] !== undefined) picks['3'].product = 'light';
      },
      ['finder.picks.car.3 = light sits at level 2'],
    ],
    [
      'a level list (Tracer without a matrix leaves level 3)',
      (copy: Copy) => {
        const three = itemOf(copy.levels, '3');
        three.systems = (three.systems as string[]).filter((id) => id !== 'tracer');
      },
      ['finder.picks.fleet.2 = tracer sits at level 0'],
    ],
    [
      'a matrix level that disagrees with its level list',
      (copy: Copy) => {
        (itemOf(copy.products, 'smart').matrix as Loose).gps = 2;
      },
      ['specs.smart.gps = 2, expected 1', 'levels 3 lists smart, derived level 2'],
    ],
    [
      'a product outside the pricelist',
      (copy: Copy) => {
        copy.products.push({ ...itemOf(copy.products, 'tracer'), id: 'tracer-pro' });
      },
      ['product tracer-pro is not in the pricelist'],
    ],
  ])('names %s', (_what, change, problems) => {
    expect(pricelistProblems(changed(change))).toEqual(problems);
  });
});
