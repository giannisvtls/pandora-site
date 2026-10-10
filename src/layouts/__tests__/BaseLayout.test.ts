// BaseLayout (spec §6) through the Container API, on fixture content: the query module's adapter
// (`siteQuery`) is replaced by a query over the fixtures, since astro:content serves no entries in
// Vitest. English and Greek are live, so a page has two alternates and x-default (Greek).
import { describe, expect, it, vi } from 'vitest';

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
  return createQuery(
    { ...content, siteCopyCommon, siteCopyHome },
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
}

const render = (props: RenderProps) =>
  container.renderToString(BaseLayout, {
    props: { ...props },
    slots: { default: '<p>Slot content</p>' },
  });

const HOME = { type: 'home' } as const;

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

  it('refuses a page the language does not have', async () => {
    await expect(render({ locale: 'en', page: { type: 'blog' } })).rejects.toThrow(
      'The blog page does not exist in "en", so it has no head',
    );
  });
});
