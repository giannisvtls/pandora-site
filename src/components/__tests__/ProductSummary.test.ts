import { readFileSync } from 'node:fs';

import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import { productSchema } from '../../content/contract';
import ProductSummary from '../ProductSummary.astro';

const SNAPSHOT = new URL('../../../content-snapshot/products.json', import.meta.url);
const product = productSchema.parse((JSON.parse(readFileSync(SNAPSHOT, 'utf8')) as unknown[])[0]);
const { name, tag, blurb } = product;

describe('ProductSummary', () => {
  it('renders the name, tag and blurb in English for en, and no price', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProductSummary, {
      props: { product, locale: 'en' },
    });

    expect(html).toContain(`<h2>${name.en!}</h2>`);
    expect(html).toContain(`<p>${tag.en!}</p>`);
    expect(html).toContain(`<p>${blurb.en!}</p>`);
    expect(html).not.toContain(blurb.el!);
    expect(html).not.toContain(String(product.priceEur));
  });

  it('renders the Greek blurb for el, with no English filler', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProductSummary, {
      props: { product, locale: 'el' },
    });

    expect(html).toContain(`<p>${blurb.el!}</p>`);
    expect(html).not.toContain(name.en!);
    expect(html).not.toContain(tag.en!);
    expect(html).not.toContain(blurb.en!);
  });
});
