// BaseLayout (spec §6, §9) through the Container API, on fixture content: the query module's
// adapter (`siteQuery`) is replaced by a query over the fixtures, since astro:content serves no
// entries in Vitest. English and Greek are live, so a page has two alternates and x-default
// (Greek); a 404 page has none, and only a language home has the Organization JSON-LD.
import { describe, expect, it, vi } from 'vitest';

import { between } from '../../components/__tests__/shell-fixtures';
import { fixtureContent, withLanguage } from '../../content/__tests__/rules-fixtures';
import type { Locale } from '../../content/contract';
import { createQuery, type Query } from '../../content/query';
import type { Page } from '../../content/rules';
import { createContainer } from '../../test/container';
import BaseLayout from '../BaseLayout.astro';

const state = vi.hoisted(() => ({ query: undefined as Query | undefined }));

vi.mock(import('../../content/query'), async (importOriginal) => ({
  ...(await importOriginal()),
  siteQuery: () => {
    if (state.query === undefined) throw new Error('No fixture query');
    return Promise.resolve(state.query);
  },
}));

// Site copy the fixtures change, so the test can tell it was read from Site copy, and in which
// language: every value differs between English and Greek.
const SKIP_LINK = { en: 'Skip to the content (fixture)', el: 'Skip (el fixture)' };
const TITLE_TEMPLATE = { en: '{page} | INVETEC (fixture)', el: '{page} | INVETEC (el)' };
const HOME_TITLE = { en: 'Home title (en fixture)', el: 'Home title (el fixture)' };
const HOME_DESCRIPTION = { en: 'Home description (en)', el: 'Home description (el)' };
// The company's street in Greek ("Iera Odos 330" in Greek letters), so the JSON-LD shows which
// language's footer it read.
const GREEK_STREET = `${String.fromCodePoint(0x3_99, 0x3_b5, 0x3_c1, 0x3_ac, 0x20, 0x3_9f, 0x3_b4, 0x3_cc, 0x3_c2)} 330`;

function fixtureQuery(): Query {
  const content = withLanguage(fixtureContent(['en', 'el']), 'el');
  const siteCopyCommon = {
    ...content.siteCopyCommon,
    skipLink: SKIP_LINK,
    titleTemplate: TITLE_TEMPLATE,
  };
  const siteCopyHome = {
    ...content.siteCopyHome,
    title: HOME_TITLE,
    metaDescription: HOME_DESCRIPTION,
  };
  const { company } = content.siteCopyFooter;
  const siteCopyFooter = {
    ...content.siteCopyFooter,
    company: { ...company, street: { ...company.street, el: GREEK_STREET } },
  };
  return createQuery(
    { ...content, siteCopyCommon, siteCopyHome, siteCopyFooter },
    { preview: false, pageTypes: ['home', 'compare'] },
  );
}

state.query = fixtureQuery();
const container = await createContainer({ astroConfig: { site: 'https://invetec.eu' } });

interface RenderProps {
  readonly locale: Locale;
  readonly page: Page;
  readonly name?: string;
  readonly description?: string;
  readonly hasExplainer?: boolean;
}

const render = (props: RenderProps) =>
  container.renderToString(BaseLayout, {
    props: { ...props },
    slots: { default: '<p>Slot content</p>' },
  });

const HOME = { type: 'home' } as const;
const NOT_FOUND = { type: 'notFound' } as const;

// A 404 page in `locale`, as NotFoundPage.astro renders it: no explainer island.
const notFound = (locale: Locale) =>
  render({
    locale,
    page: NOT_FOUND,
    name: `Not found (${locale})`,
    description: `Gone (${locale}).`,
    hasExplainer: false,
  });

// The Organization JSON-LD of `locale`'s home, parsed; it must be in the head.
async function homeJsonLd(locale: Locale): Promise<{ logo: string }> {
  const html = await render({ locale, page: HOME });
  const start = '<script type="application/ld+json">';
  expect(html).toContain(start);
  expect(html.indexOf(start)).toBeLessThan(html.indexOf('</head>'));
  return JSON.parse(between(html, start, '</script>').slice(start.length)) as { logo: string };
}

describe('BaseLayout', () => {
  it('sets the language and the title and description of home in that language (A5)', async () => {
    const greek = await render({ locale: 'el', page: HOME });
    const english = await render({ locale: 'en', page: HOME });

    expect(greek).toMatch(/<html lang="el"[^>]*>/u);
    expect(greek).toContain('<title>Home title (el fixture)</title>');
    expect(greek).toContain('<meta name="description" content="Home description (el)">');
    expect(english).toMatch(/<html lang="en"[^>]*>/u);
    expect(english).toContain('<title>Home title (en fixture)</title>');
    expect(english).toContain('<meta name="description" content="Home description (en)">');
  });

  it("titles another page with the common template around the page's name (A5)", async () => {
    const html = await render({
      locale: 'en',
      page: { type: 'compare' },
      name: 'Compare',
      description: 'Compare up to four systems.',
    });
    const greek = await render({
      locale: 'el',
      page: { type: 'compare' },
      name: 'Compare (el name)',
      description: 'Compare (el).',
    });

    expect(html).toContain('<title>Compare | INVETEC (fixture)</title>');
    expect(html).toContain('<meta name="description" content="Compare up to four systems.">');
    expect(html).toContain('<link rel="canonical" href="https://invetec.eu/en/compare/">');
    expect(greek).toContain('<title>Compare (el name) | INVETEC (el)</title>');
    expect(greek).toContain('<link rel="canonical" href="https://invetec.eu/el/compare/">');
  });

  it('refuses a page other than home without its name and description', async () => {
    await expect(render({ locale: 'en', page: { type: 'compare' } })).rejects.toThrow(
      'The compare page needs its name and its description for the head',
    );
  });

  it('links the absolute canonical URL, the hreflang alternates and x-default', async () => {
    const html = await render({ locale: 'en', page: HOME });

    expect(html).toContain('<link rel="canonical" href="https://invetec.eu/en/">');
    expect(html.match(/<link rel="alternate"[^>]*>/gu)).toEqual([
      '<link rel="alternate" hreflang="en" href="https://invetec.eu/en/">',
      '<link rel="alternate" hreflang="el" href="https://invetec.eu/el/">',
      '<link rel="alternate" hreflang="x-default" href="https://invetec.eu/el/">',
    ]);
  });

  it('gives the og: tags of the page, the locale in its language_TERRITORY form', async () => {
    const greek = await render({ locale: 'el', page: HOME });
    const english = await render({ locale: 'en', page: HOME });

    expect(greek.match(/<meta property="og:[^>]*>/gu)).toEqual([
      '<meta property="og:title" content="Home title (el fixture)">',
      '<meta property="og:description" content="Home description (el)">',
      '<meta property="og:url" content="https://invetec.eu/el/">',
      '<meta property="og:locale" content="el_GR">',
    ]);
    expect(english.match(/<meta property="og:[^>]*>/gu)).toEqual([
      '<meta property="og:title" content="Home title (en fixture)">',
      '<meta property="og:description" content="Home description (en)">',
      '<meta property="og:url" content="https://invetec.eu/en/">',
      '<meta property="og:locale" content="en_GB">',
    ]);
  });

  it('links the favicon', async () => {
    expect(await render({ locale: 'en', page: HOME })).toContain(
      '<link rel="icon" href="/favicon.webp" type="image/webp">',
    );
  });

  it('runs the theme script before the first stylesheet and the fonts', async () => {
    const html = await render({ locale: 'en', page: HOME });
    const script = html.indexOf("root.classList.add('js')");
    const styles = [html.indexOf('<style'), html.indexOf('<link rel="stylesheet"')].filter(
      (index) => index !== -1,
    );

    expect(script).toBeGreaterThan(html.indexOf('<head>'));
    expect(styles).not.toEqual([]);
    expect(script).toBeLessThan(Math.min(...styles));
    expect(html).toContain("localStorage.getItem('theme') === 'dark'");
  });

  it('opens the body with the skip link from Site copy, to <main>', async () => {
    const english = await render({ locale: 'en', page: HOME });
    const greek = await render({ locale: 'el', page: HOME });

    expect(english).toMatch(
      /<body[^>]*>\s*<a class="skip" href="#main"[^>]*>Skip to the content \(fixture\)<\/a>/u,
    );
    expect(greek).toContain('>Skip (el fixture)</a>');
    expect(english).toMatch(
      /<main id="main" tabindex="-1"[^>]*>\s*<p>Slot content<\/p>\s*<\/main>/u,
    );
  });

  it('puts <main> between the site header (solid unless the page asks) and the site footer', async () => {
    const html = await render({ locale: 'en', page: HOME });
    const overlay = await container.renderToString(BaseLayout, {
      props: { locale: 'en', page: HOME, header: 'overlay' },
    });
    const header = html.indexOf('<header class="hdr solid"');
    const main = html.indexOf('<main id="main"');
    const footer = html.indexOf('<footer class="ftr wrap"');

    expect(header).toBeGreaterThan(html.indexOf('<a class="skip"'));
    expect(main).toBeGreaterThan(header);
    expect(footer).toBeGreaterThan(html.indexOf('</main>'));
    expect(overlay).toContain('<header class="hdr overlay"');
  });

  it('puts the explainer island after the footer, hydrated when idle, with its props', async () => {
    const html = await render({ locale: 'en', page: HOME });
    const start = html.indexOf('<astro-island', html.indexOf('</footer>'));
    const island = html.slice(start, html.indexOf('</astro-island>', start));
    const props = /props="([^"]*)"/u.exec(island)?.[1]?.replaceAll('&quot;', '"') ?? '{}';

    expect(start).toBeGreaterThan(html.indexOf('</footer>'));
    expect(island).toContain(' client="idle"');
    expect(island).toMatch(/component-url="[^"]*Explainer[^"]*"/u);
    // A closed dialog (no `open`), unnamed until a button puts a title in it.
    expect(island).toContain('<dialog class="fx-panel"><div class="fx-body" tabindex="-1">');
    expect(props).toContain('"close":[0,"Close"]');
    expect(props).toContain('"title":[0,"Level 3 · Recovery"]');
    // The reveal script comes after it.
    expect(html.indexOf("querySelectorAll('.rv, .zoom")).toBeGreaterThan(start);
  });

  it('gives a 404 page noindex and no canonical URL, alternate or og:url (A18)', async () => {
    const html = await notFound('el');
    const head = between(html, '<head>', '</head>');

    expect(head).toContain('<title>Not found (el) | INVETEC (el)</title>');
    expect(head).toContain('<meta name="description" content="Gone (el).">');
    expect(head).toContain('<meta name="robots" content="noindex">');
    expect(head).not.toContain('rel="canonical"');
    expect(head).not.toContain('rel="alternate"');
    expect(head).not.toContain('og:url');
    expect(head).toContain('<meta property="og:locale" content="el_GR">');
    expect(await render({ locale: 'en', page: HOME })).not.toContain('name="robots"');
  });

  it('puts the Organization JSON-LD in the head of a language home, as JSON in its language', async () => {
    const greek = await homeJsonLd('el');

    expect(greek).toMatchObject({
      '@type': 'Organization',
      name: 'INVETEC E.E.',
      url: 'https://invetec.eu/',
      address: { '@type': 'PostalAddress', streetAddress: GREEK_STREET },
    });
    expect(greek.logo).toMatch(/^https:\/\/invetec\.eu\/.*invetec-logo/u);
    expect(await homeJsonLd('en')).toMatchObject({ address: { streetAddress: 'Iera Odos 330' } });
  });

  it('puts no JSON-LD on any other page: neither a 404 page nor another page type', async () => {
    const compare = await render({
      locale: 'en',
      page: { type: 'compare' },
      name: 'Compare',
      description: 'Compare.',
    });

    expect(await notFound('en')).not.toContain('application/ld+json');
    expect(compare).not.toContain('application/ld+json');
  });

  it('mounts no explainer island on a page that asks for none', async () => {
    const html = await notFound('en');

    expect(html).toContain('<footer class="ftr wrap"');
    expect(html).not.toContain('client="idle"');
    expect(html).not.toContain('fx-panel');
    expect(await render({ locale: 'en', page: HOME })).toContain('client="idle"');
  });

  it('refuses a page the language does not have', async () => {
    await expect(render({ locale: 'en', page: { type: 'blog' } })).rejects.toThrow(
      'The blog page does not exist in "en", so it has no head',
    );
  });
});
