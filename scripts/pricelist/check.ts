// The pricelist check (`npm run check:pricelist`): the snapshot's facts against PRICELIST 2026 as
// transcribed in the project's pricelist catalogue spec. The constants are the transcription,
// held verbatim from the framework tool this replaces (tools/check-pricelist.mjs of the design
// folder); a change to the transcription is made in both until that tool retires. The checks are
// the tool's, read through the content contract instead of the prototype data:
// - the matrix (p. 16, product-page overrides applied): the spec rows in order, the systems that
//   have a matrix, a feature explainer per row, every value;
// - the system prices and the accessory prices, groups and fits;
// - the launch catalogue is exactly the pricelist's systems (the tool checked the parked items
//   and the hidden multimedia category; the snapshot has neither, so it checks the product set);
// - the Finder picks and the level lists, with the level rule of P1-7: a system with a matrix
//   takes its level from it, one without from the levels set that lists it.
import type { Product } from '../../src/content/contract';
import { byCodeUnit } from '../crawl/output';
import { REPO_ROOT } from '../snapshot/paths';
import { readSnapshot, type SnapshotData } from '../snapshot/read-snapshot';

// Spec 1.1: columns and rows of the p. 16 transcription (product-page overrides applied).
// prettier-ignore
export const SYS: readonly string[] = ['elite', 'professional', 'smartpro', 'smart', 'lightpro', 'light', 'primo', 'immo',
  'camperv3', 'camperpro', 'motoevo', 'motov2', 'marine', 'truck'];
// prettier-ignore
export const MATRIX: Readonly<Record<string, string>> = {
  accel: '11111111111111', siren: '11111110111111', immo: '11111111111011', bt: '11111011111011',
  pin: '11111110111011', smarttag: '11111010111011', nodisarm: '11111010110001', hijack: '11111111111011',
  jammer: '11110010111011', gps: '11112020111011', wifi: '10000000000000', lbs: '11110000111011',
  lte: '11110000111011', blackbox: '11110000111011', app: '11111011111111', push: '11111010111011',
  selfcall: '11110000111011', oem: '11111110110001', remote: '11001100111111', start: '22222200220001',
  keyless: '11111100110000', preheater: '11111100110000',
};

// Spec 1.3 + car prices (pricelist product pages, valid from 5/2026).
// prettier-ignore
export const PRICES: Readonly<Record<string, number>> = { elite: 1499, professional: 989, smartpro: 689, smart: 519, lightpro: 399, light: 269, primo: 299, immo: 179,
  camperpro: 1499, camperv3: 899, motoevo: 499, motov2: 319, marine: 799, truck: 799, finder: 195, tracer: 219 };

// Spec 1.4: accessories and their prices.
// prettier-ignore
export const ACC: Readonly<Record<string, number>> = { 'd-061': 259, 'd-061-camper': 269, 'd-062': 199, 'd-022-lora': 149, 'd-010': 89, 'd-011': 89, 'r-500-bt': 139,
  'r-387-r-389': 25, band: 75, 'ps-330': 35, 'ps-331-bt': 69, 'ps-332-bt': 85, 'ps-333': 39, 'vs-22d': 59, 'dms-100-bt': 69,
  'dms-101-bt': 69, 'dms-105-bt': 149, 'pir-100-bt': 99, 'pir-100-btm': 115, 'bt-01': 47, 'bt-02': 105, 'btr-101': 89,
  'rmd-5m': 49, 'rmd-bmw-v2': 279, 'di-02': 29, 'di-03': 45, 'di-04': 79, 'bt-790': 59, 'nav-x': 199, 'nav-035-bt': 79,
  powercab: 19, 'moto-evo-harness': 45, 'led-valet-2': 9, 'zdr-gm-50': 39, 'd-010-cover': 19, 'lc-d-010': 12,
  'd-022-cover': 29, 'alt-307': 249 };

const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;

// A system's protection level (P1-7): with a matrix, GPS included -> 3, immobilizer included -> 2,
// else 1; without one, the level whose `systems` lists it; 0 when neither.
export function levelOf(snapshot: SnapshotData, product: Product): number {
  const { matrix } = product;
  if (matrix !== undefined) {
    if (matrix.gps === 1) return 3;
    return matrix.immo === 1 ? 2 : 1;
  }
  const level = snapshot.levels.find(({ systems }) => systems.includes(product.id));
  return level === undefined ? 0 : Number(level.id);
}

function matrixProblems(snapshot: SnapshotData): string[] {
  const problems: string[] = [];
  const check = (isOk: boolean, message: string) => {
    if (!isOk) problems.push(message);
  };
  const keys = snapshot.specRows.toSorted(byOrder).map(({ id }) => id);
  check(
    JSON.stringify(keys) === JSON.stringify(Object.keys(MATRIX)),
    `specRows order: ${keys.join(',')}`,
  );
  const withMatrix = snapshot.products
    .filter(({ matrix }) => matrix !== undefined)
    .map(({ id }) => id);
  check(
    JSON.stringify(withMatrix.toSorted(byCodeUnit)) === JSON.stringify(SYS.toSorted(byCodeUnit)),
    `specs systems: ${withMatrix.join(',')}`,
  );
  const features = new Set(snapshot.features.map(({ id }) => id));
  const productById = new Map(snapshot.products.map((product) => [product.id, product]));
  for (const [key, row] of Object.entries(MATRIX)) {
    check(features.has(key), `no explainer for row ${key}`);
    for (const [index, id] of SYS.entries()) {
      const value = (productById.get(id)?.matrix as Readonly<Record<string, number>> | undefined)?.[
        key
      ];
      check(
        value === Number(row[index]),
        `specs.${id}.${key} = ${String(value)}, expected ${row[index] ?? ''}`,
      );
    }
  }
  return problems;
}

function priceProblems(snapshot: SnapshotData): string[] {
  const problems: string[] = [];
  const check = (isOk: boolean, message: string) => {
    if (!isOk) problems.push(message);
  };
  const productById = new Map(snapshot.products.map((product) => [product.id, product]));
  for (const [id, eur] of Object.entries(PRICES)) {
    const price = productById.get(id)?.priceEur;
    check(price === eur, `product ${id} priceEur = ${String(price)}, expected ${String(eur)}`);
    check(productById.has(id), `product ${id} missing`);
  }
  const accessoryById = new Map(snapshot.accessories.map((accessory) => [accessory.id, accessory]));
  const groups = new Set(snapshot.accessoryGroups.map(({ id }) => id));
  check(
    snapshot.accessories.length === Object.keys(ACC).length,
    `accessories: ${String(snapshot.accessories.length)}, expected ${String(Object.keys(ACC).length)}`,
  );
  for (const [id, eur] of Object.entries(ACC)) {
    const accessory = accessoryById.get(id);
    check(
      accessory?.priceEur === eur,
      `accessory ${id} price ${String(accessory?.priceEur)}, expected ${String(eur)}`,
    );
    if (accessory === undefined) continue;
    check(groups.has(accessory.group), `accessory ${id} group ${accessory.group} unknown`);
    for (const system of accessory.fits) {
      check(productById.has(system), `accessory ${id} fits unknown ${system}`);
    }
  }
  return problems;
}

function catalogueProblems(snapshot: SnapshotData): string[] {
  const problems: string[] = [];
  const check = (isOk: boolean, message: string) => {
    if (!isOk) problems.push(message);
  };
  const categories = new Set(snapshot.categories.map(({ id }) => id));
  for (const product of snapshot.products) {
    check(Object.hasOwn(PRICES, product.id), `product ${product.id} is not in the pricelist`);
    check(
      categories.has(product.category),
      `product ${product.id} in hidden category ${product.category}`,
    );
  }
  const productById = new Map(snapshot.products.map((product) => [product.id, product]));
  for (const [vehicle, picks] of Object.entries(snapshot.finder.picks)) {
    for (const [level, { product: id }] of Object.entries(picks)) {
      const product = productById.get(id);
      check(
        product !== undefined,
        `finder.picks.${vehicle}.${level} = ${id} is not a visible product`,
      );
      const reached = product === undefined ? 0 : levelOf(snapshot, product);
      check(
        reached >= Number(level),
        `finder.picks.${vehicle}.${level} = ${id} sits at level ${String(reached)}`,
      );
    }
  }
  for (const level of snapshot.levels) {
    for (const id of level.systems) {
      const product = productById.get(id);
      check(product !== undefined, `levels ${level.id} lists hidden ${id}`);
      if (product?.matrix === undefined) continue;
      const derived = levelOf(snapshot, product);
      check(
        derived === Number(level.id),
        `levels ${level.id} lists ${id}, derived level ${String(derived)}`,
      );
    }
  }
  return problems;
}

// Every problem the check finds in the snapshot; none means clean.
export function pricelistProblems(snapshot: SnapshotData): string[] {
  return [...matrixProblems(snapshot), ...priceProblems(snapshot), ...catalogueProblems(snapshot)];
}

// The line a clean run prints.
export function cleanLine(snapshot: SnapshotData): string {
  return `clean: ${String(SYS.length)} systems × ${String(snapshot.specRows.length)} rows, ${String(Object.keys(PRICES).length)} system prices, ${String(snapshot.accessories.length)} accessories, finder + tiers consistent`;
}

export interface CheckIo {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
}

const processIo: CheckIo = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
};

// Reads the committed snapshot under `root` and prints the clean line (exit code 0) or every
// problem and their count (exit code 1).
export async function runCheckPricelist(
  root: string = REPO_ROOT,
  io: CheckIo = processIo,
): Promise<number> {
  let snapshot: SnapshotData;
  try {
    snapshot = await readSnapshot(root);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    io.stderr(`check:pricelist failed: ${reason}\n`);
    return 1;
  }
  const problems = pricelistProblems(snapshot);
  if (problems.length > 0) {
    io.stderr(`${problems.join('\n')}\n\n${String(problems.length)} problem(s)\n`);
    return 1;
  }
  io.stdout(`${cleanLine(snapshot)}\n`);
  return 0;
}
