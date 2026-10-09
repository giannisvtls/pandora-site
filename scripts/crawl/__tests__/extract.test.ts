import { describe, expect, it } from 'vitest';

import { decodeEntities } from '../entities';
import { extractHead, extractHrefs, resolveUrl } from '../extract';
import { fixture } from './helpers';

const CONTACT_EL =
  'https://invetec.eu/%ce%b5%cf%80%ce%b9%ce%ba%ce%bf%ce%b9%ce%bd%cf%89%ce%bd%ce%af%ce%b1/';
const EN_DASH = String.fromCodePoint(0x20_13);
const EM_DASH = String.fromCodePoint(0x20_14);

describe('extractHead', () => {
  it('reads lang, title, canonical, hreflang and robots meta of a Yoast page', () => {
    const head = extractHead(fixture('page-el-contact.html'), CONTACT_EL);

    expect(head).toStrictEqual({
      htmlLang: 'el',
      title: `Επικοινωνία ${EN_DASH} INVETEC`,
      canonical: CONTACT_EL,
      hreflang: {
        el: CONTACT_EL,
        en: 'https://invetec.eu/en/contact/',
        it: 'https://invetec.eu/it/contatti/',
        sq: 'https://invetec.eu/sq/kontakt/',
        'x-default': CONTACT_EL,
      },
      robotsMeta: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    });
  });

  it('keeps percent-encoded Greek URLs byte for byte (lower-case escapes stay lower-case)', () => {
    const head = extractHead(fixture('page-el-contact.html'), CONTACT_EL);

    expect(Buffer.from(head.canonical ?? '')).toStrictEqual(Buffer.from(CONTACT_EL));
    expect(head.hreflang.el).toBe(CONTACT_EL);
    expect(head.canonical).not.toBe(CONTACT_EL.toUpperCase());
  });

  it('ignores <title> and <link> inside scripts and comments, and anything after <body>', () => {
    const head = extractHead(fixture('page-el-contact.html'), CONTACT_EL);

    expect(head.title).not.toContain('Not the title');
    expect(head.canonical).not.toContain('from-script');
    expect(head.canonical).not.toContain('commented-out');
  });

  it('reads a noindex page: upper-case META, whitespace in <title>, relative hreflang', () => {
    const head = extractHead(
      fixture('page-en-noindex.html'),
      'https://invetec.eu/en/legal-notice/',
    );

    expect(head).toStrictEqual({
      htmlLang: 'en-US',
      title: `Legal notice & imprint ${EM_DASH} INVETEC`,
      // The canonical <link> in <body> is not a head field.
      canonical: null,
      // The first hreflang per language wins; a relative href is resolved against the page.
      hreflang: { it: 'https://invetec.eu/it/note-legali/' },
      robotsMeta: 'noindex, follow',
    });
  });

  it('returns nulls for a page without a head', () => {
    expect(extractHead('<p>plain</p>', 'https://invetec.eu/x/')).toStrictEqual({
      htmlLang: null,
      title: null,
      canonical: null,
      hreflang: {},
      robotsMeta: null,
    });
  });
});

describe('extractHrefs', () => {
  const hrefs = extractHrefs(fixture('page-el-contact.html'));

  it('lists every <a href> of the body in order, as written', () => {
    expect(hrefs).toHaveLength(31);
    expect(hrefs[0]).toBe('#content');
    expect(hrefs).toContain('/%ce%b1%cf%80%cf%8c%cf%81%cf%81%ce%b7%cf%84%ce%bf/');
    expect(hrefs).toContain('  /en/contact/  ');
    expect(hrefs.at(-1)).toBe('javascript:void(0)');
  });

  it('reads unquoted and single-quoted values, upper-case tags and `>` inside quotes', () => {
    expect(hrefs).toContain('/en/unquoted/');
    expect(hrefs).toContain('/en/upper-case-tag/');
    expect(hrefs).toContain('/en/gt-in-attribute/');
    expect(hrefs).toContain('https://lenovo.invetec.eu/it/product/thinkpad-t14s-gen-6/');
  });

  it('decodes character references in attribute values', () => {
    expect(hrefs).toContain('/en/terms/?a=1&b=2');
  });

  it('skips links inside comments, scripts and styles', () => {
    const joined = hrefs.join(' ');
    expect(joined).not.toContain('commented-out');
    expect(joined).not.toContain('from-script');
    expect(joined).not.toContain('from-style');
  });
});

describe('resolveUrl', () => {
  it('returns an absolute URL exactly as written and resolves a relative one', () => {
    expect(resolveUrl(` ${CONTACT_EL} `, 'https://invetec.eu/')).toBe(CONTACT_EL);
    expect(resolveUrl('/%CE%B1/', 'https://invetec.eu/en/')).toBe('https://invetec.eu/%CE%B1/');
    expect(resolveUrl('../it/', 'https://invetec.eu/en/x/')).toBe('https://invetec.eu/en/it/');
    expect(resolveUrl(' '.repeat(3), 'https://invetec.eu/')).toBeNull();
  });
});

describe('decodeEntities', () => {
  it.each([
    ['Q&amp;A', 'Q&A'],
    ['a &#8211; b', `a ${EN_DASH} b`],
    ['a &#x2014; b', `a ${EM_DASH} b`],
    ['INVETEC &raquo; Feed', `INVETEC ${String.fromCodePoint(0xbb)} Feed`],
    ['&unknown; stays', '&unknown; stays'],
    ['&#0; stays', '&#0; stays'],
    ['no references', 'no references'],
    // Object.prototype names are not entities.
    ['&constructor; stays', '&constructor; stays'],
    ['&__proto__; stays', '&__proto__; stays'],
    ['&toString; &valueOf; &hasOwnProperty; stay', '&toString; &valueOf; &hasOwnProperty; stay'],
  ])('%s', (input, expected) => {
    expect(decodeEntities(input)).toBe(expected);
  });

  it('reads a title made of prototype names without throwing', () => {
    const head = extractHead(
      '<html><head><title>&constructor; &amp; &CONSTRUCTOR;</title></head></html>',
      'https://invetec.eu/x/',
    );

    expect(head.title).toBe('&constructor; & &CONSTRUCTOR;');
  });
});
