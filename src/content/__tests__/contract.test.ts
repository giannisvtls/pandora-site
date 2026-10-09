import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { productSchema } from '../contract';

const SNAPSHOT = new URL('../../../content-snapshot/products.json', import.meta.url);

function readSnapshot(): unknown[] {
  return JSON.parse(readFileSync(SNAPSHOT, 'utf8')) as unknown[];
}

// Looser than the contract on purpose, so a test can plant values the contract rejects.
interface ProductInput {
  showIn: string[];
  priceEur: number;
  name: Record<string, string>;
  tag: Record<string, string>;
  blurb: Record<string, string>;
}

// A valid product to break one field at a time (a deep copy of the snapshot's first item).
function validProduct(): ProductInput {
  return structuredClone(readSnapshot()[0]) as ProductInput;
}

describe('productSchema', () => {
  it('accepts every item of the snapshot unchanged', () => {
    const snapshot = readSnapshot();

    expect(snapshot.length).toBeGreaterThan(0);
    for (const item of snapshot) {
      expect(productSchema.parse(item)).toStrictEqual(item);
    }
  });

  it('rejects a product with no name in its source language (showIn[0] = en)', () => {
    const product = validProduct();
    delete product.name.en;

    const result = productSchema.safeParse(product);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toMatchObject([{ code: 'custom', path: ['name', 'en'] }]);
  });

  it('rejects a product with no blurb in its source language (showIn[0] = en)', () => {
    const product = validProduct();
    delete product.blurb.en;

    const result = productSchema.safeParse(product);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toMatchObject([{ code: 'custom', path: ['blurb', 'en'] }]);
  });

  it('takes the source language from showIn[0], not from English', () => {
    const product = validProduct();
    product.showIn = ['it'];
    product.name = { it: 'Test name' };
    product.tag = {};
    product.blurb = { it: 'Test blurb' };

    expect(productSchema.safeParse(product).success).toBe(true);
  });

  it('rejects a non-integer priceEur', () => {
    const product = validProduct();
    product.priceEur = 899.5;

    const result = productSchema.safeParse(product);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toMatchObject([{ path: ['priceEur'] }]);
  });

  it('rejects a localized text with an unknown locale key', () => {
    const product = validProduct();
    product.tag.de = 'Test tag';

    const result = productSchema.safeParse(product);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toMatchObject([
      { code: 'unrecognized_keys', keys: ['de'], path: ['tag'] },
    ]);
  });
});
