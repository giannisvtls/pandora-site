// BaseLayout (spec §6) through the Container API, on fixture content: the query module's adapter
// (`siteQuery`) is replaced by a query over the fixtures, since astro:content serves no entries in
// Vitest. English and Greek are live, so a page has two alternates and x-default (Greek).
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it, vi } from 'vitest';

import { fixtureContent, withLanguage } from '../../content/__tests__/rules-fixtures';
import type { Locale } from '../../content/contract';
import { createQuery, type Query } from '../../content/query';
import type { Page } from '../../content/rules';
import BaseLayout from '../BaseLayout.astro';

const state = vi.hoisted(() => ({ query: undefined as Query | undefined }));

vi.mock(import('../../content/query'), async (importOriginal) => ({
  ...(await importOriginal()),
  siteQuery: () => {
    if (state.query === undefined) throw new Error('No fixture query');
    return Promise.resolve(state.query);
  },
}));

// Site copy the fixtures change, so the test can tell it was read from Site copy.
const SKIP_LINK = { en: 'Skip to the content (fixture)', el: 'Skip (el fixture)' };
const TITLE_TEMPLATE = { en: '{page} | INVETEC (fixture)', el: '{page} | INVETEC (el)' };

function fixtureQuery(): Query {
  const content = withLanguage(fixtureContent(['en', 'el']), 'el');
  const siteCopyCommon = {
    ...content.siteCopyCommon,
    skipLink: SKIP_LINK,
    titleTemplate: TITLE_TEMPLATE,
  };
  return createQuery(
    { ...content, siteCopyCommon },
    { preview: false, pageTypes: ['home', 'compare'] },
  );
}

state.query = fixtureQuery();
const container = await AstroContainer.create({ astroConfig: { site: 'https://invetec.eu' } });

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
const homeCopy = state.query.siteCopy('el').home;

describe('BaseLayout', () => {
  it('sets the language and the title and description of home (A5)', async () => {
    const html = await render({ locale: 'el', page: HOME });

    expect(html).toMatch(/<html lang="el"[^>]*>/u);
    expect(html).toContain(`<title>${homeCopy.title.el!}</title>`);
    expect(html).toContain(`<meta name="description" content="${homeCopy.metaDescription.el!}">`);
  });

  it("titles another page with the common template around the page's name (A5)", async () => {
    const html = await render({
      locale: 'en',
      page: { type: 'compare' },
      name: 'Compare',
      description: 'Compare up to four systems.',
    });

    expect(html).toContain('<title>Compare | INVETEC (fixture)</title>');
    expect(html).toContain('<meta name="description" content="Compare up to four systems.">');
    expect(html).toContain('<link rel="canonical" href="https://invetec.eu/en/compare/">');
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

  it('gives the og: tags of the page', async () => {
    const html = await render({ locale: 'el', page: HOME });

    expect(html.match(/<meta property="og:[^>]*>/gu)).toEqual([
      `<meta property="og:title" content="${homeCopy.title.el!}">`,
      `<meta property="og:description" content="${homeCopy.metaDescription.el!}">`,
      '<meta property="og:url" content="https://invetec.eu/el/">',
      '<meta property="og:locale" content="el_GR">',
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

  it('refuses a page the language does not have', async () => {
    await expect(render({ locale: 'en', page: { type: 'blog' } })).rejects.toThrow(
      'The blog page does not exist in "en", so it has no head',
    );
  });
});
