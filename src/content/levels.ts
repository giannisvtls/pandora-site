// A system's protection level (spec §4, P1-7): 1 Detection, 2 Prevention, 3 Recovery. The rule
// stays in code (A7). Pure: no Astro, no content of its own.
import type { LevelId, Product } from './contract';

// 0 when a system has neither a matrix nor a level that lists it.
export type ProductLevel = 0 | 1 | 2 | 3;

const LEVEL_NUMBERS: Readonly<Record<LevelId, ProductLevel>> = { '1': 1, '2': 2, '3': 3 };

// From the matrix when the system has one: GPS included -> 3, immobilizer included -> 2, else 1.
// A system without a matrix (Finder, Tracer) takes the level whose `systems` lists it, else 0.
export function levelOf(
  product: Pick<Product, 'id' | 'matrix'>,
  levels: readonly { readonly id: LevelId; readonly systems: readonly string[] }[],
): ProductLevel {
  const { matrix } = product;
  if (matrix !== undefined) {
    if (matrix.gps === 1) return 3;
    return matrix.immo === 1 ? 2 : 1;
  }
  const level = levels.find(({ systems }) => systems.includes(product.id));
  return level === undefined ? 0 : LEVEL_NUMBERS[level.id];
}
