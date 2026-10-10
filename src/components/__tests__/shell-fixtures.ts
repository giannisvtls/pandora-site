// A query over fixture content for the shell's Container tests (the publish-rule fixtures, with
// the snapshot's Site copy): Greek complete wherever English is; the blog section shown in English
// only and the contact section ordered first, so the header's order and visibility come from the
// nav sections; a footer link with no URL yet beside linked ones.
import { fixtureContent, withLanguage } from '../../content/__tests__/rules-fixtures';
import type { Locale } from '../../content/contract';
import { createQuery, type Query } from '../../content/query';

// The page types these tests build: home and the Phase 2 pages a header links to.
const PAGE_TYPES = ['home', 'category', 'product', 'compare', 'blog', 'post'] as const;

// The footer link of the second column that has no URL yet.
export const UNLINKED_LABEL = 'Careers (fixture)';

export function shellQuery(live: readonly Locale[]): Query {
  const fixture = fixtureContent(live);
  // `languages` is keyed by language too: withLanguage would copy English's `live` to Greek.
  const content = { ...withLanguage(fixture, 'el'), languages: fixture.languages };
  const navSections = content.navSections.map((section) => {
    if (section.id === 'blog') return { ...section, showIn: ['en' as const] };
    return section.id === 'contact' ? { ...section, order: 0 } : section;
  });
  const [products, links, ...rest] = content.siteCopyFooter.columns;
  if (products === undefined || links === undefined) throw new Error('The footer has no columns');
  const unlinked = { label: { en: UNLINKED_LABEL, el: UNLINKED_LABEL } };
  const siteCopyFooter = {
    ...content.siteCopyFooter,
    columns: [products, { ...links, links: [...links.links, unlinked] }, ...rest],
  };
  return createQuery(
    { ...content, navSections, siteCopyFooter },
    { preview: false, pageTypes: PAGE_TYPES },
  );
}

// The part of `html` from the first `start` up to the next `end` (excluded); '' when either is
// missing.
export function between(html: string, start: string, end: string): string {
  const from = html.indexOf(start);
  const to = from === -1 ? -1 : html.indexOf(end, from);
  return to === -1 ? '' : html.slice(from, to);
}

// The text of an HTML fragment: its tags removed, trimmed.
export function textOf(html: string): string {
  const [first = '', ...rest] = html.split('<');
  return [first, ...rest.map((part) => part.slice(part.indexOf('>') + 1))].join('').trim();
}
