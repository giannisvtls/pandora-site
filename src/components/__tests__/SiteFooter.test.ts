// The site footer (spec §7) through the Container API, with its content read from fixture content
// by layouts/shell.ts: the company block, the columns whose links have a URL (A9: a link without
// one and a column left without links are not rendered), the legal line.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import type { Locale } from '../../content/contract';
import { footerContent } from '../../layouts/shell';
import SiteFooter from '../SiteFooter.astro';
import { between, shellQuery, textOf, UNLINKED_LABEL } from './shell-fixtures';

const container = await AstroContainer.create();
const query = shellQuery(['en', 'el']);

const render = (locale: Locale = 'en', year = 2026) =>
  container.renderToString(SiteFooter, {
    props: { content: footerContent(query, locale, year) },
  });

// The links of an HTML fragment as [label, href].
const linksOf = (html: string) =>
  html.split('</a>').flatMap((part) => {
    const tag = /<a href="([^"]+)"[^>]*>/u.exec(part);
    return tag === null ? [] : [[textOf(part.slice(tag.index)), tag[1]]];
  });

// The footer's link columns as [heading, [label, href][]] (the company block has no heading).
const columnsOf = (html: string) =>
  html
    .split('<h2')
    .slice(1)
    .map((part) => [
      textOf(`<h2${part.slice(0, part.indexOf('</h2>'))}`),
      linksOf(between(part, '<ul', '</ul>')),
    ]);

describe('SiteFooter', () => {
  it('renders the company block: name, address, hours, phone and email links', async () => {
    const html = await render();
    const block = between(html, '<address', '</address>');
    const items = block
      .split('</li>')
      .slice(0, -1)
      .map((item) => textOf(item.slice(item.indexOf('<li'))));

    expect(items).toEqual([
      'INVETEC E.E.',
      'Iera Odos 330, Haidari 124 61',
      'Mon–Fri 9:00–17:00',
      '+30 210 581 4441',
      'info@invetec.eu',
    ]);
    expect(linksOf(block)).toEqual([
      ['+30 210 581 4441', 'tel:+302105814441'],
      ['info@invetec.eu', 'mailto:info@invetec.eu'],
    ]);
    expect(html.match(/<img [^>]*alt="INVETEC"[^>]*>/gu)).toHaveLength(2);
  });

  it('renders the linked columns with their route targets, and skips links with no URL', async () => {
    expect(columnsOf(await render())).toEqual([
      [
        'Products',
        [
          ['Car protection', '/en/systems/car/'],
          ['Motorcycle protection', '/en/systems/moto/'],
          ['Camper protection', '/en/systems/camper/'],
          ['Boat protection', '/en/systems/marine/'],
          ['Trucks &amp; GPS trackers', '/en/systems/fleet/'],
          ['Accessories', '/en/accessories/'],
        ],
      ],
      [
        'Useful links',
        [
          ['B2B support', '/en/partners/'],
          ['Blog', '/en/blog/'],
          ['Contact', '/en/contact/'],
          ['FAQ', '/en/contact/#faq'],
          ['About us', '/en/contact/'],
          ['Warranty activation', '/en/warranty/'],
        ],
      ],
    ]);
  });

  it('leaves out a column whose links all wait for a URL, and never links to "#"', async () => {
    const html = await render();

    for (const text of ['Legal', 'Privacy policy', 'Follow', 'Facebook', UNLINKED_LABEL]) {
      expect(html).not.toContain(text);
    }
    expect(html).not.toContain('href="#"');
  });

  it('builds its links in the language of the page', async () => {
    const links = columnsOf(await render('el')).flatMap(([, list]) => list as string[][]);

    expect(links).toHaveLength(12);
    expect(links.every(([, href]) => href?.startsWith('/el/'))).toBe(true);
  });

  it('closes with the legal line: the copyright of the build year and the tagline', async () => {
    const legal = between(await render('en', 2031), '<div class="legal"', '</div>');

    expect(
      legal
        .split('</span>')
        .map((part) => textOf(part))
        .slice(0, 2),
    ).toEqual([
      '© 2031 INVETEC E.E. All rights reserved.',
      'Exclusive Pandora distributor for Greece and Italy',
    ]);
  });
});
