// The site header (spec §7) through the Container API, with its content read from fixture content
// by layouts/shell.ts: the nav sections the language shows, in their order, the page's section
// marked; the compare link with its hidden count; the theme toggle's action labels; the language
// switcher (P1-5); the solid and overlay variants.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { LANGUAGE_NAMES, type Locale } from '../../content/contract';
import type { Query } from '../../content/query';
import type { Page } from '../../content/rules';
import { headerContent } from '../../layouts/shell';
import { cssRules } from '../../styles/__tests__/css-rules';
import { createContainer } from '../../test/container';
import LanguageSwitcher from '../LanguageSwitcher.astro';
import SiteHeader from '../SiteHeader.astro';
import { ACCESSORIES_LABEL, between, shellQuery } from './shell-fixtures';

// The component's source, for its scoped styles.
const SOURCE = readFileSync(new URL('../SiteHeader.astro', import.meta.url), 'utf8');

const container = await createContainer();
const englishOnly = shellQuery(['en']);
const withGreek = shellQuery(['en', 'el']);

const HOME: Page = { type: 'home' };

function renderHeader(page: Page, locale: Locale, variant: 'solid' | 'overlay' = 'solid') {
  return container.renderToString(SiteHeader, {
    props: { content: headerContent(withGreek, page, locale), variant },
  });
}

function renderSwitcher(query: Query, page: Page, locale: Locale) {
  return container.renderToString(LanguageSwitcher, {
    props: { label: 'Language', targets: query.switcherTargets(page, locale) },
  });
}

interface RenderedLink {
  readonly text: string | undefined;
  readonly href: string | undefined;
  readonly current: string | undefined;
}

// The primary nav's links.
function navLinks(html: string): RenderedLink[] {
  return between(html, '<nav aria-label="Primary"', '</nav>')
    .split('</a>')
    .flatMap((part): RenderedLink[] => {
      const tag = /<a href="([^"]+)"([^>]*)>/u.exec(part);
      if (tag === null) return [];
      return [
        {
          text: part.slice(tag.index + tag[0].length).trim(),
          href: tag[1],
          current: /aria-current="([^"]+)"/u.exec(tag[2] ?? '')?.[1],
        },
      ];
    });
}

// The language switcher's list.
const switcherOf = (html: string) => between(html, '<ul class="lang"', '</ul>');

describe('SiteHeader', () => {
  it('lists the nav sections the language shows, in their order, with their URLs', async () => {
    const english = navLinks(await renderHeader(HOME, 'en'));
    const greek = navLinks(await renderHeader(HOME, 'el'));

    expect(english.map(({ text, href }) => [text, href])).toEqual([
      ['Contact', '/en/contact/'],
      ['Systems', '/en/systems/car/'],
      ['Compare', '/en/compare/'],
      ['Find an installer', '/en/installers/'],
      ['Blog', '/en/blog/'],
      ['Partners', '/en/partners/'],
      [ACCESSORIES_LABEL, '/en/accessories/'],
    ]);
    // The blog section is shown in English only.
    expect(greek.map(({ text, href }) => [text, href])).toEqual([
      ['Contact', '/el/contact/'],
      ['Systems', '/el/systems/car/'],
      ['Compare', '/el/compare/'],
      ['Find an installer', '/el/installers/'],
      ['Partners', '/el/partners/'],
      [ACCESSORIES_LABEL, '/el/accessories/'],
    ]);
  });

  it.each<[string, Page, string]>([
    ['a category page', { type: 'category', vehicle: 'moto' }, 'Systems'],
    ['a product page', { type: 'product', id: 'elite' }, 'Systems'],
    ['the compare page', { type: 'compare' }, 'Compare'],
    ['a post', { type: 'post', id: 'motodays' }, 'Blog'],
    ['the accessories page', { type: 'accessories' }, ACCESSORIES_LABEL],
    [
      'an accessories page of a vehicle',
      { type: 'accessoriesVehicle', vehicle: 'car' },
      ACCESSORIES_LABEL,
    ],
    ['an accessory page', { type: 'accessory', id: 'd-061' }, ACCESSORIES_LABEL],
  ])('marks the section of %s with aria-current="page"', async (_name, page, section) => {
    const links = navLinks(await renderHeader(page, 'en'));

    expect(links.filter(({ current }) => current !== undefined)).toEqual([
      { text: section, href: expect.any(String) as unknown, current: 'page' },
    ]);
  });

  it('marks no section on home', async () => {
    const links = navLinks(await renderHeader(HOME, 'en'));

    expect(links).toHaveLength(7);
    expect(links.every(({ current }) => current === undefined)).toBe(true);
  });

  it('links the logo to the language home, named from Site copy', async () => {
    const html = await renderHeader(HOME, 'el');

    expect(html).toMatch(/<a class="home" href="\/el\/" aria-label="INVETEC home"/u);
    expect(html.match(/<img [^>]*alt="INVETEC"[^>]*>/gu)).toHaveLength(2);
  });

  it('shows the compare link with its count badge hidden', async () => {
    const link = between(await renderHeader(HOME, 'en'), '<a class="cmp-link"', '</a>');

    expect(link).toMatch(/^<a class="cmp-link" href="\/en\/compare\/" aria-label="Compare list"/u);
    expect(link).toMatch(/>\s*Compare\s*<b hidden[^>]*>0<\/b>\s*$/u);
  });

  it('labels the theme toggle with the action of the light theme, never with aria-pressed', async () => {
    const html = await renderHeader(HOME, 'en');
    const button = /<button class="theme-btn"[^>]*>/u.exec(html)?.[0] ?? '';

    expect(button).toContain('type="button"');
    expect(button).toContain('aria-label="Switch to dark mode"');
    expect(button).toContain('data-to-dark="Switch to dark mode"');
    expect(button).toContain('data-to-light="Switch to light mode"');
    expect(button).not.toContain('aria-pressed');
    // The toggle's script: the label from the applied theme, the flip, the saved choice, the event.
    expect(html).toContain("button.setAttribute('aria-label', labelFor(root.dataset.theme))");
    expect(html).toContain("localStorage.setItem('theme', theme)");
    expect(html).toContain("new CustomEvent('themechange'");
  });

  it.each([['solid'], ['overlay']] as const)('gives the %s variant its class', async (variant) => {
    const html = await renderHeader(HOME, 'en', variant);

    expect(html).toMatch(new RegExp(`<header class="hdr ${variant}"`, 'u'));
  });

  it('turns the overlay header solid past the first section; the solid one takes its place', async () => {
    const solid = await renderHeader(HOME, 'en', 'solid');
    const overlay = await renderHeader(HOME, 'en', 'overlay');

    expect(solid).toContain('<div class="hdr-space"');
    expect(solid).not.toContain('IntersectionObserver');
    expect(overlay).not.toContain('<div class="hdr-space"');
    expect(overlay).toContain("header.classList.toggle('solid', !entry.isIntersecting)");
    expect(overlay).toContain('rootMargin: `-${String(header.offsetHeight)}px 0px 0px 0px`');
    // Solid at once without IntersectionObserver, and on a page without a first section.
    const script = between(overlay, 'const header = document.currentScript', '</script>');
    expect(between(script, 'else {', '}')).toContain("header.classList.add('solid');");
    expect(between(script, 'if (first === null) {', 'return;')).toContain(
      "header.classList.add('solid');",
    );
  });

  it('is transparent only with JavaScript, and only where it is fixed over the first section', () => {
    const rules = cssRules(between(SOURCE, '<style>', '</style>').slice('<style>'.length));
    const transparent = rules.filter(({ declarations }) =>
      declarations.get('background')?.startsWith('linear-gradient('),
    );

    // Everywhere else, without JavaScript and in the page flow below 1120px included, the overlay
    // has the solid header's background.
    expect(transparent.map(({ scope, selectors }) => [scope, selectors])).toEqual([
      ['@media not all and (max-width: 1119px)', [':global(html.js) .hdr.overlay:not(.solid)']],
    ]);
    const header = rules.find(({ scope, selectors }) => scope === '' && selectors.includes('.hdr'));
    expect(header?.declarations.get('background')).toBe('rgba(var(--night-rgb),0.92)');
    expect(header?.declarations.get('border-bottom')).toBe('1px solid var(--rule-2)');
  });

  it('holds the language switcher', async () => {
    expect(switcherOf(await renderHeader(HOME, 'en'))).toContain('aria-current="true"');
  });
});

describe('LanguageSwitcher (P1-5)', () => {
  it('shows English as the current text and no link when only English is built', async () => {
    const html = switcherOf(await renderSwitcher(englishOnly, HOME, 'en'));

    expect(html).toMatch(
      /<span aria-current="true"[^>]*>EN <span class="sr"[^>]*>English<\/span><\/span>/u,
    );
    expect(html).not.toContain('<a ');
  });

  it('links every other built language with hreflang and lang, named by code and endonym', async () => {
    const html = switcherOf(await renderSwitcher(withGreek, HOME, 'en'));

    expect(html).toContain('<a href="/el/" hreflang="el" lang="el"');
    expect(between(html, '<a href="/el/"', '</a>')).toMatch(
      new RegExp(`>EL <span class="sr"[^>]*>${LANGUAGE_NAMES.el}</span>$`, 'u'),
    );
    expect(html.match(/<a /gu)).toHaveLength(1);
    expect(html).toMatch(/<span aria-current="true"[^>]*>EN /u);
  });

  it('links the same page in the other language, and marks Greek current on a Greek page', async () => {
    const page: Page = { type: 'category', vehicle: 'moto' };
    const fromGreek = switcherOf(await renderSwitcher(withGreek, page, 'el'));

    expect(fromGreek).toContain('<a href="/en/systems/moto/" hreflang="en" lang="en"');
    expect(fromGreek).toMatch(/<span aria-current="true"[^>]*>EL /u);
  });
});
