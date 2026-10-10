// What BaseLayout puts in <head> and the skip link for a page (spec §6, §9), all read through the
// query module: the title (A5: the `common` template around the page's name; home has its own),
// the description, the absolute canonical URL, the hreflang alternates with x-default, the og:
// tags, and on a language home the Organization JSON-LD. A 404 page is never indexed (A18): it
// has `noindex` and no canonical URL, alternates or og:url.
import logo from '../assets/brand/invetec-logo.webp';
import type { Locale } from '../content/contract';
import { fill, textIn } from '../content/copy';
import type { Query } from '../content/query';
import type { Page } from '../content/rules';
import { organizationJsonLd } from '../content/seo';

// og:locale in the Open Graph form, language_TERRITORY: each language with the market the site
// serves it to (code, never translated). English goes to European visitors, so en_GB.
export const OG_LOCALES: Readonly<Record<Locale, string>> = {
  en: 'en_GB',
  el: 'el_GR',
  it: 'it_IT',
  sq: 'sq_AL',
};

export interface HeadInput {
  readonly locale: Locale;
  // The page, for its canonical URL and its alternates.
  readonly page: Page;
  // The page's own name for the title template, and its description (its lead or blurb, A5).
  // Home passes neither: its title and description are its own Site copy.
  readonly name?: string | undefined;
  readonly description?: string | undefined;
}

export interface HeadLink {
  readonly hreflang: string;
  readonly href: string;
}

export interface PageHead {
  readonly title: string;
  readonly description: string;
  // False on a 404 page (`<meta name="robots" content="noindex">`).
  readonly isIndexed: boolean;
  // The absolute canonical URL, also og:url; none on a 404 page.
  readonly canonical: string | undefined;
  readonly alternates: readonly HeadLink[];
  readonly ogLocale: string;
  // The Organization JSON-LD (escaped for an inline script), on a language home only.
  readonly organization: string | undefined;
  readonly skipLink: string;
}

// The title and description of a page in its language (A5).
function titleAndDescription(query: Query, input: HeadInput): [string, string] {
  const { locale, page, name, description } = input;
  const copy = query.siteCopy(locale);
  if (page.type === 'home') {
    return [
      textIn(copy.home.title, locale, 'siteCopyHome.title'),
      textIn(copy.home.metaDescription, locale, 'siteCopyHome.metaDescription'),
    ];
  }
  if (name === undefined || description === undefined) {
    throw new Error(`The ${page.type} page needs its name and its description for the head`);
  }
  const template = textIn(copy.common.titleTemplate, locale, 'siteCopyCommon.titleTemplate');
  return [fill(template, { page: name }), description];
}

// The head of `input.page` in `input.locale`; `site` is the site's origin (astro.config.mjs
// `site`), which makes every URL absolute.
export function pageHead(query: Query, site: URL, input: HeadInput): PageHead {
  const { locale, page } = input;
  const isIndexed = page.type !== 'notFound';
  const path = isIndexed ? query.pageUrl(page, locale) : undefined;
  if (isIndexed && path === undefined) {
    throw new Error(`The ${page.type} page does not exist in "${locale}", so it has no head`);
  }
  const [title, description] = titleAndDescription(query, input);
  const copy = query.siteCopy(locale);
  return {
    title,
    description,
    isIndexed,
    canonical: path === undefined ? undefined : new URL(path, site).href,
    alternates: query
      .alternates(page)
      .map(({ hreflang, path: href }) => ({ hreflang, href: new URL(href, site).href })),
    ogLocale: OG_LOCALES[locale],
    organization:
      page.type === 'home'
        ? organizationJsonLd(copy.footer, locale, { site, logo: logo.src })
        : undefined,
    skipLink: textIn(copy.common.skipLink, locale, 'siteCopyCommon.skipLink'),
  };
}
