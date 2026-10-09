import { describe, expect, it } from 'vitest';

import { isAllowedHref, localizedRichText, richText } from '../contract';

// A plain-HTTP URL built without writing the scheme into the source (lint autofixes such
// literals to https).
function plainHttp(href: string): string {
  const url = new URL(href);
  url.protocol = 'http:';
  return url.href;
}

const paragraph = (...children: unknown[]) => ({ type: 'paragraph', children });
const textRun = (value: string) => ({ type: 'text', text: value });

describe('rich text', () => {
  it('accepts every node of the editorial set', () => {
    const document = [
      { type: 'heading', level: 2, children: [textRun('MotoDays 2026')] },
      { type: 'heading', level: 3, children: [textRun('Featured systems')] },
      paragraph(
        textRun('Read the '),
        { type: 'text', text: 'news', bold: true, italic: true },
        textRun(' on the '),
        { type: 'link', href: '/en/blog/', children: [textRun('blog')] },
        { type: 'link', href: 'https://www.fieraroma.it/', children: [textRun('Fiera di Roma')] },
      ),
      { type: 'list', ordered: false, items: [[textRun('Moto V2')], [textRun('Moto EVO')]] },
      { type: 'list', ordered: true, items: [[textRun('First')]] },
      { type: 'image', media: 'motodays-poster' },
      { type: 'image', media: 'motodays-poster', caption: [textRun('Hall 3, Booth B9')] },
    ];

    expect(richText.parse(document)).toStrictEqual(document);
  });

  it('rejects an unknown block type and an unknown inline type', () => {
    const block = richText.safeParse([{ type: 'video', src: '/x.mp4' }]);
    const inline = richText.safeParse([paragraph({ type: 'emoji', text: 'x' })]);

    expect(block.error?.issues).toMatchObject([{ path: [0, 'type'] }]);
    expect(inline.error?.issues).toMatchObject([{ path: [0, 'children', 0, 'type'] }]);
  });

  it('rejects an http:// link', () => {
    const href = plainHttp('https://invetec.eu/en/');
    const result = richText.safeParse([
      paragraph({ type: 'link', href, children: [textRun('INVETEC')] }),
    ]);

    expect(href.startsWith('http:')).toBe(true);
    expect(result.error?.issues).toMatchObject([
      {
        path: [0, 'children', 0, 'href'],
        message: 'Expected a site path "/..." or an https:// URL',
      },
    ]);
  });

  it.each([
    ['a site path', '/en/systems/car/elite-v3/', true],
    ['an https URL', 'https://invetec.eu/en/', true],
    ['a protocol-relative URL', '//evil.example/', false],
    ['a path that browsers read as protocol-relative', String.raw`/\evil.example/`, false],
    ['a relative path', 'en/blog/', false],
    ['a mailto link', 'mailto:info@invetec.eu', false],
    ['a script URL', 'javascript:alert(1)', false],
    ['a path with a space', '/en/my page/', false],
  ])('treats %s as %s', (_label, href, isAllowed) => {
    expect(isAllowedHref(href)).toBe(isAllowed);
  });

  it('rejects empty containers and heading levels other than 2 and 3', () => {
    expect(richText.safeParse([]).success).toBe(false);
    expect(richText.safeParse([paragraph()]).success).toBe(false);
    expect(richText.safeParse([{ type: 'list', ordered: false, items: [] }]).success).toBe(false);
    expect(
      richText.safeParse([{ type: 'heading', level: 1, children: [textRun('Title')] }]).success,
    ).toBe(false);
    expect(
      richText.safeParse([paragraph({ type: 'link', href: '/en/', children: [] })]).success,
    ).toBe(false);
  });

  it('rejects a key outside the node set and a non-true bold', () => {
    const aligned = { ...paragraph(textRun('x')), align: 'center' };
    const notBold = paragraph({ type: 'text', text: 'x', bold: false });

    expect(richText.safeParse([aligned]).success).toBe(false);
    expect(richText.safeParse([notBold]).success).toBe(false);
  });

  it('per language, requires the source language when given one', () => {
    const body = [paragraph(textRun('Test.'))];

    expect(localizedRichText('en').safeParse({ en: body, el: body }).success).toBe(true);
    expect(localizedRichText('en').safeParse({ el: body }).error?.issues).toMatchObject([
      { path: ['en'] },
    ]);
  });
});
