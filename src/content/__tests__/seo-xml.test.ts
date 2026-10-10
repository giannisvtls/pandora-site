// @vitest-environment jsdom
// The sitemaps of seo.ts as an XML parser reads them (jsdom's DOMParser): well-formed, the entries
// in the sitemap namespace and the alternates in the XHTML one, every escaped URL read back as it
// was. ./seo.test.ts checks what they list.
import { describe, expect, it } from 'vitest';

import { SITEMAP_NAMESPACE, sitemapIndexXml, sitemapXml, XHTML_NAMESPACE } from '../seo';

const SITE = new URL('https://invetec.eu');

// The parsed document; `isWellFormed` is false when the parser reports an error.
function parse(xml: string): { isWellFormed: boolean; root: Element } {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  return {
    isWellFormed: document.querySelector('parsererror') === null,
    root: document.documentElement,
  };
}

// The child elements of `parent` named `name` in `namespace`.
const childrenOf = (parent: Element, namespace: string, name: string) =>
  [...parent.children].filter(
    (child) => child.namespaceURI === namespace && child.localName === name,
  );

// The text of an entry's `<loc>`.
const locOf = (entry: Element) => childrenOf(entry, SITEMAP_NAMESPACE, 'loc')[0]?.textContent;

describe('the namespaces', () => {
  it('are the sitemap protocol and XHTML names, http:// as their specifications fix them', () => {
    expect(SITEMAP_NAMESPACE).toMatch(/^http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9$/u);
    expect(XHTML_NAMESPACE).toMatch(/^http:\/\/www\.w3\.org\/1999\/xhtml$/u);
  });
});

describe('the sitemap XML', () => {
  it('is a well-formed sitemap index in the sitemap namespace', () => {
    const { isWellFormed, root } = parse(sitemapIndexXml(SITE, ['en', 'el']));

    expect(isWellFormed).toBe(true);
    expect([root.namespaceURI, root.localName]).toEqual([SITEMAP_NAMESPACE, 'sitemapindex']);
    expect(childrenOf(root, SITEMAP_NAMESPACE, 'sitemap').map((entry) => locOf(entry))).toEqual([
      'https://invetec.eu/sitemap-en.xml',
      'https://invetec.eu/sitemap-el.xml',
    ]);
  });

  it('is a well-formed sitemap whose alternates are XHTML link elements', () => {
    const { isWellFormed, root } = parse(
      sitemapXml(SITE, [
        {
          path: '/en/',
          alternates: [
            { hreflang: 'en', path: '/en/' },
            { hreflang: 'x-default', path: '/en/' },
          ],
        },
      ]),
    );
    const [url] = childrenOf(root, SITEMAP_NAMESPACE, 'url');
    const links = url === undefined ? [] : childrenOf(url, XHTML_NAMESPACE, 'link');

    expect(isWellFormed).toBe(true);
    expect([root.namespaceURI, root.localName]).toEqual([SITEMAP_NAMESPACE, 'urlset']);
    expect(url === undefined ? undefined : locOf(url)).toBe('https://invetec.eu/en/');
    expect(
      links.map((link) => ['rel', 'hreflang', 'href'].map((name) => link.getAttribute(name))),
    ).toEqual([
      ['alternate', 'en', 'https://invetec.eu/en/'],
      ['alternate', 'x-default', 'https://invetec.eu/en/'],
    ]);
  });

  it('reads every escaped URL back as it was', () => {
    const { isWellFormed, root } = parse(
      sitemapXml(SITE, [
        { path: '/en/?a=1&b=2', alternates: [{ hreflang: 'en', path: "/en/it's/?x=1&y=2" }] },
      ]),
    );
    const [url] = childrenOf(root, SITEMAP_NAMESPACE, 'url');
    const [link] = url === undefined ? [] : childrenOf(url, XHTML_NAMESPACE, 'link');

    expect(isWellFormed).toBe(true);
    expect(url === undefined ? undefined : locOf(url)).toBe('https://invetec.eu/en/?a=1&b=2');
    expect(link?.getAttribute('href')).toBe("https://invetec.eu/en/it's/?x=1&y=2");
  });

  it('is checked by a parser that refuses an unescaped ampersand', () => {
    expect(parse('<urlset><loc>https://invetec.eu/?a=1&b=2</loc></urlset>').isWellFormed).toBe(
      false,
    );
  });
});
