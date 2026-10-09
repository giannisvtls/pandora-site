import { describe, expect, it } from 'vitest';

import { classifyPageType, inferLang, inferPathLang, type PageType } from '../classify';

const CONTACT_EL =
  'https://invetec.eu/%ce%b5%cf%80%ce%b9%ce%ba%ce%bf%ce%b9%ce%bd%cf%89%ce%bd%ce%af%ce%b1/';

describe('inferPathLang', () => {
  it.each([
    ['https://invetec.eu/en/contact/', 'el', 'en'],
    ['https://invetec.eu/it/', 'el', 'it'],
    ['https://invetec.eu/sq/kontakt/', 'el', 'sq'],
    // No prefix: the host's root language (Greek on invetec.eu, unknown on lenovo).
    [CONTACT_EL, 'el', 'el'],
    ['https://invetec.eu/', 'el', 'el'],
    ['https://invetec.eu/english/', 'el', 'el'],
    ['https://invetec.eu/el/x/', 'el', 'el'],
    ['https://lenovo.invetec.eu/cart/', null, null],
    ['https://lenovo.invetec.eu/it/product/thinkpad-t14s-gen-6/', null, 'it'],
  ])('%s with root %s -> %s', (url, rootLang, expected) => {
    expect(inferPathLang(url, rootLang)).toBe(expected);
  });
});

describe('inferLang', () => {
  it.each([
    ['el', 'el', 'el'],
    // <html lang> wins over the path, reduced to its primary subtag.
    ['en-US', 'it', 'en'],
    ['EL', 'en', 'el'],
    ['it_IT', null, 'it'],
    // Without <html lang>, the path language.
    [null, 'it', 'it'],
    [null, null, null],
  ])('htmlLang %s, pathLang %s -> %s', (htmlLang, pathLang, expected) => {
    expect(inferLang(htmlLang, pathLang)).toBe(expected);
  });
});

describe('classifyPageType', () => {
  it.each<[string, string | null, PageType]>([
    // The root and a bare language root are home, whatever sitemap lists them.
    ['https://invetec.eu/', 'page-sitemap', 'home'],
    ['https://invetec.eu/en/', 'page-sitemap', 'home'],
    ['https://invetec.eu/sq/', null, 'home'],
    // WooCommerce system pages, also when a page sitemap lists them.
    ['https://lenovo.invetec.eu/cart/', 'wp-sitemap-posts-page-1', 'shop-system'],
    ['https://lenovo.invetec.eu/it/checkout/', 'wp-sitemap-posts-page-1', 'shop-system'],
    ['https://lenovo.invetec.eu/my-account/', null, 'shop-system'],
    // Yoast sitemap names.
    [CONTACT_EL, 'page-sitemap', 'page'],
    ['https://invetec.eu/en/news/camper-v3/', 'post-sitemap', 'post'],
    ['https://invetec.eu/en/news/older/', 'post-sitemap2', 'post'],
    ['https://invetec.eu/category/news/', 'category-sitemap', 'category'],
    ['https://invetec.eu/tag/camper/', 'post_tag-sitemap', 'tag'],
    ['https://invetec.eu/author/editor/', 'author-sitemap', 'author'],
    ['https://invetec.eu/product/x/', 'product-sitemap', 'product'],
    ['https://invetec.eu/product-category/y/', 'product_cat-sitemap', 'product-category'],
    // WordPress core sitemap names.
    ['https://lenovo.invetec.eu/it/product/x/', 'wp-sitemap-posts-product-1', 'product'],
    ['https://lenovo.invetec.eu/about/', 'wp-sitemap-posts-page-1', 'page'],
    ['https://lenovo.invetec.eu/p/y/', 'wp-sitemap-taxonomies-product_cat-1', 'product-category'],
    ['https://lenovo.invetec.eu/t/z/', 'wp-sitemap-taxonomies-product_tag-1', 'product-tag'],
    ['https://lenovo.invetec.eu/author/a/', 'wp-sitemap-users-1', 'author'],
    // The sitemap name wins over the URL pattern.
    ['https://invetec.eu/category/oddly-named-post/', 'post-sitemap', 'post'],
    // No sitemap, or one with an unknown type: the URL pattern.
    ['https://invetec.eu/en/category/news/', null, 'category'],
    ['https://invetec.eu/tag/x/', null, 'tag'],
    ['https://invetec.eu/author/x/', null, 'author'],
    ['https://lenovo.invetec.eu/it/product/x/', null, 'product'],
    ['https://lenovo.invetec.eu/product-category/x/', null, 'product-category'],
    ['https://lenovo.invetec.eu/product-tag/x/', null, 'product-tag'],
    ['https://invetec.eu/product/x/', 'elementor_library-sitemap', 'product'],
    ['https://invetec.eu/en/about/', null, 'other'],
    // Object.prototype names in a path or a sitemap name are not types.
    ['https://invetec.eu/constructor/', null, 'other'],
    ['https://invetec.eu/toString/', null, 'other'],
    ['https://invetec.eu/__proto__/', null, 'other'],
    ['https://invetec.eu/en/hasOwnProperty/x/', null, 'other'],
    ['https://invetec.eu/x/', '__proto__-sitemap', 'other'],
    ['https://invetec.eu/x/', 'constructor-sitemap', 'other'],
    ['https://lenovo.invetec.eu/x/', 'wp-sitemap-posts-toString-1', 'other'],
    ['https://invetec.eu/constructor/', '__proto__-sitemap', 'other'],
  ])('%s from %s -> %s', (url, sitemap, expected) => {
    expect(classifyPageType(url, sitemap)).toBe(expected);
  });
});
