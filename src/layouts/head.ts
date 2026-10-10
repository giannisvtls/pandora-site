// What BaseLayout puts in <head> and the skip link for a page (spec §6), all read through the
// query module: the title (A5: the `common` template around the page's name; home has its own),
// the description, the absolute canonical URL, the hreflang alternates with x-default, and the
// og: tags.
import type { Locale } from '../content/contract';
import { fill, textIn } from '../content/copy';
import type { Query } from '../content/query';
import type { Page } from '../content/rules';

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
  readonly canonical: string;
  readonly alternates: readonly HeadLink[];
  readonly ogLocale: string;
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
  const path = query.pageUrl(page, locale);
  if (path === undefined) {
    throw new Error(`The ${page.type} page does not exist in "${locale}", so it has no head`);
  }
  const [title, description] = titleAndDescription(query, input);
  return {
    title,
    description,
    canonical: new URL(path, site).href,
    alternates: query
      .alternates(page)
      .map(({ hreflang, path: href }) => ({ hreflang, href: new URL(href, site).href })),
    ogLocale: OG_LOCALES[locale],
    skipLink: textIn(query.siteCopy(locale).common.skipLink, locale, 'siteCopyCommon.skipLink'),
  };
}
