// The mobile menu in the site header (spec §8), through the Container API: the island hydrates
// only below the header's breakpoint (its `client:media` is the media query of the header's,
// the theme toggle's, the menu's and the feature buttons' touch-target styles), its labels come
// from Site copy, its links and languages are the nav's and the switcher's, and its server markup
// is the burger and a closed dialog.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { LANGUAGE_NAMES } from '../../content/contract';
import type { Page } from '../../content/rules';
import { headerContent } from '../../layouts/shell';
import { cssRules, type CssRule } from '../../styles/__tests__/css-rules';
import { createContainer } from '../../test/container';
import SiteHeader from '../SiteHeader.astro';
import { ACCESSORIES_LABEL, between, shellQuery } from './shell-fixtures';

// The header's breakpoint: the mobile header below 1120px.
const COMPACT = '(max-width: 1119px)';

const container = await createContainer();
const query = shellQuery(['en', 'el']);
const COMPARE: Page = { type: 'compare' };

// The header of the compare page in English, and its island.
async function renderHeader(): Promise<{ header: string; island: string }> {
  const header = await container.renderToString(SiteHeader, {
    props: { content: headerContent(query, COMPARE, 'en'), variant: 'solid' },
  });
  return { header, island: between(header, '<astro-island', '</astro-island>') };
}

// The style rules of a source file: a stylesheet, or the <style> of a component.
function rulesOf(file: string): CssRule[] {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const style = source.includes('<style>')
    ? between(source, '<style>', '</style>').slice('<style>'.length)
    : source;
  return cssRules(style);
}

// Each value `property` takes for `selector`, with the media query it sits in ('' for none).
const declaration = (rules: readonly CssRule[], selector: string, property: string) =>
  rules
    .filter(
      ({ selectors, declarations }) => selectors.includes(selector) && declarations.has(property),
    )
    .map(({ scope, declarations }) => [scope, declarations.get(property)]);

// The value of the first attribute `name` in `html`; '' when there is none.
function attribute(html: string, name: string): string {
  const start = html.indexOf(`${name}="`);
  if (start === -1) return '';
  const from = start + name.length + 2;
  return html.slice(from, html.indexOf('"', from));
}

// The links of a nav or list: text (tags removed), href and aria-current.
function linksIn(html: string) {
  return html
    .split('<a ')
    .slice(1)
    .map((part) => ({
      text: part
        .slice(part.indexOf('>') + 1, part.indexOf('</a>'))
        .split('<')
        .map((piece) => piece.slice(piece.indexOf('>') + 1))
        .join('')
        .trim(),
      href: attribute(part, 'href'),
      current: attribute(part.slice(0, part.indexOf('>')), 'aria-current'),
    }));
}

describe('the mobile menu in the header (spec §8)', () => {
  it('hydrates the island only below the breakpoint where the header shows the burger', async () => {
    const { island } = await renderHeader();
    const options = attribute(island, 'opts').replaceAll('&quot;', '"');

    expect(island).toContain(' client="media"');
    expect(JSON.parse(options)).toEqual({ name: 'MobileMenu', value: COMPACT });
    // The same media query in every style that switches to the mobile header.
    const header = rulesOf('../SiteHeader.astro');
    expect(declaration(header, ':global(html.js) .hdr-right > :global(.lang)', 'display')).toEqual([
      [`@media ${COMPACT}`, 'none'],
    ]);
    expect(declaration(header, ':global(html.js) nav', 'display')).toEqual([
      [`@media ${COMPACT}`, 'none'],
    ]);
    expect(declaration(header, '.hdr', 'position')).toEqual([
      ['', 'fixed'],
      [`@media ${COMPACT}`, 'relative'],
    ]);
    expect(
      declaration(rulesOf('../islands/MobileMenu.css'), 'html.js .menu-open', 'display'),
    ).toEqual([[`@media ${COMPACT}`, 'flex']]);
    expect(declaration(rulesOf('../ThemeToggle.astro'), '.theme-btn', 'width')).toEqual([
      ['', '36px'],
      [`@media ${COMPACT}`, '44px'],
    ]);
    // The feature buttons' 44px touch targets, and the index's row spacing that keeps them apart.
    expect(declaration(rulesOf('../FeatureButton.astro'), '.fx::before', 'inset')).toEqual([
      [`@media ${COMPACT}`, '-10px 0 -11px'],
    ]);
    expect(
      declaration(rulesOf('../../pages/[locale]/index.astro'), '.features', 'row-gap'),
    ).toEqual([[`@media ${COMPACT}`, '20px']]);
  });

  it('renders the burger, named from Site copy, and the dialog closed, named by its nav', async () => {
    const { island } = await renderHeader();

    expect(island).toContain(
      '<button class="menu-btn menu-open" type="button" aria-label="Open menu" ' +
        'aria-haspopup="dialog" aria-controls="m-nav">',
    );
    expect(island).toContain('<dialog id="m-nav" class="m-nav" aria-labelledby="m-nav-links">');
    expect(island).toContain('<nav id="m-nav-links" aria-label="Mobile">');
    expect(island).toContain(
      '<button class="menu-btn menu-close" type="button" aria-label="Close menu">',
    );
  });

  it("lists the nav's links and the switcher's languages, the page's own marked", async () => {
    const { header, island } = await renderHeader();
    const menuLinks = linksIn(between(island, '<nav id="m-nav-links"', '</nav>'));

    expect(menuLinks).toEqual(linksIn(between(header, '<nav aria-label="Primary"', '</nav>')));
    expect(menuLinks.filter(({ current }) => current !== '')).toEqual([
      { text: 'Compare', href: '/en/compare/', current: 'page' },
    ]);
    expect(menuLinks.at(-1)).toEqual({
      text: ACCESSORIES_LABEL,
      href: '/en/accessories/',
      current: '',
    });
    const switcher = between(island, '<ul class="lang" aria-label="Language">', '</ul>');
    expect(switcher).toContain(
      '<span aria-current="true">EN <span class="sr">English</span></span>',
    );
    expect(switcher).toContain(
      `<a href="/el/compare/" hreflang="el" lang="el">EL <span class="sr">${LANGUAGE_NAMES.el}</span></a>`,
    );
  });

  it('keeps the reveal classes out of the island (the reveal script never sees it)', async () => {
    const { island } = await renderHeader();
    const classes = island
      .split(' class="')
      .slice(1)
      .flatMap((part) => part.slice(0, part.indexOf('"')).split(' '));

    expect(classes).not.toEqual([]);
    expect(
      classes.filter((name) => ['rv', 'rv-g', 'zoom', 'wipe', 'line-rv', 'in'].includes(name)),
    ).toEqual([]);
  });
});
