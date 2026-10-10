// What a 404 page shows (spec §9) in its language, read through the query module: its name for
// the title template (A5), the notFound heading as the h1, its text (also the meta description)
// and a link to the language home. The texts are the 404 copy (new English, A6).
import type { HeadingText } from './system-index';
import type { Locale, LocalizedText } from '../content/contract';
import { textIn } from '../content/copy';
import type { Query } from '../content/query';
import { routePath } from '../content/routes';

export interface NotFoundContent {
  // "Page not found", for "Page not found — INVETEC".
  readonly name: string;
  readonly heading: HeadingText;
  readonly text: string;
  readonly home: { readonly href: string; readonly label: string };
}

// The 404 page of `locale`.
export function notFoundContent(query: Query, locale: Locale): NotFoundContent {
  const { notFound } = query.siteCopy(locale);
  const text = (value: LocalizedText, field: string) =>
    textIn(value, locale, `siteCopyNotFound.${field}`);
  const { lead, payload } = notFound.title;
  return {
    name: text(notFound.name, 'name'),
    heading: {
      lead: text(lead, 'title.lead'),
      payload: payload === undefined ? undefined : text(payload, 'title.payload'),
    },
    text: text(notFound.text, 'text'),
    home: { href: routePath(locale, 'home', {}), label: text(notFound.homeLink, 'homeLink') },
  };
}
