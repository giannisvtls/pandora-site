// The level rule (spec §4, P1-7): the matrix decides for a system that has one, the levels set
// for one that has not.
import { describe, expect, it } from 'vitest';

import { readSnapshot } from '../../../scripts/snapshot/read-snapshot';
import type { Matrix } from '../contract';
import { levelOf } from '../levels';
import { matrixFixture } from './contract-fixtures';

const snapshot = await readSnapshot();

function productOf(id: string) {
  const product = snapshot.products.find((candidate) => candidate.id === id);
  if (product === undefined) throw new Error(`no product ${id}`);
  return product;
}

describe('levelOf on the snapshot', () => {
  it.each(snapshot.products.map(({ id }) => id))(
    '%s sits at the level whose systems list it',
    (id) => {
      const listing = snapshot.levels.filter(({ systems }) => systems.includes(id));

      expect(listing).toHaveLength(1);
      expect(levelOf(productOf(id), snapshot.levels)).toBe(Number(listing[0]?.id));
    },
  );

  it('puts Finder and Tracer, which have no matrix, at level 3 from the levels set', () => {
    for (const id of ['finder', 'tracer']) {
      expect(productOf(id).matrix).toBeUndefined();
      expect(levelOf(productOf(id), snapshot.levels)).toBe(3);
    }
  });

  it('drops Elite V3 to level 2 when its GPS turns optional', () => {
    const elite = productOf('elite');
    if (elite.matrix === undefined) throw new Error('Elite V3 has no matrix');

    expect(elite.matrix.gps).toBe(1);
    expect(levelOf(elite, snapshot.levels)).toBe(3);
    expect(levelOf({ ...elite, matrix: { ...elite.matrix, gps: 2 } }, snapshot.levels)).toBe(2);
  });
});

describe('levelOf', () => {
  const none = { ...matrixFixture(), gps: 0, immo: 0 } as Matrix;
  const levels = [
    { id: '1', systems: ['beta'] },
    { id: '3', systems: ['alpha'] },
  ] as const;

  it('reads the matrix first: GPS included 3, immobilizer included 2, else 1', () => {
    expect(levelOf({ id: 'beta', matrix: { ...none, gps: 1 } }, levels)).toBe(3);
    expect(levelOf({ id: 'beta', matrix: { ...none, immo: 1, gps: 2 } }, levels)).toBe(2);
    expect(levelOf({ id: 'alpha', matrix: { ...none, immo: 2 } }, levels)).toBe(1);
  });

  it('takes a system without a matrix from the level that lists it, else 0', () => {
    expect(levelOf({ id: 'alpha' }, levels)).toBe(3);
    expect(levelOf({ id: 'beta' }, levels)).toBe(1);
    expect(levelOf({ id: 'gamma' }, levels)).toBe(0);
  });
});
