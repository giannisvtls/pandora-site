// The building blocks of the Site copy globals (spec §2 "Globals"): every text needs an English
// value (the source language of globals), and facts (company name, phone, a product name in a
// demo) are plain strings shared by every language.
import { z } from 'zod';

import { categoryId, routeKey } from './keys';
import {
  byCount,
  FIXED_SOURCE,
  heading,
  idSchema,
  plural,
  slugSchema,
  template,
  text,
  type ByCountKey,
} from './primitives';

// Localized text, English required.
export const copy = () => text(FIXED_SOURCE);

// A sentence with `{name}` placeholders, English required.
export const copyTemplate = (placeholders: readonly string[]) =>
  template(placeholders, FIXED_SOURCE);

// A counted sentence (Intl.PluralRules), English `one` and `other` required.
export const copyPlural = (placeholders: readonly string[]) => plural(placeholders, FIXED_SOURCE);

// Variants spelled out per count ("Both", "All three"), English required.
export const copyByCount = <const K extends readonly ByCountKey[]>(
  placeholders: readonly string[],
  counts?: K,
) => byCount(placeholders, FIXED_SOURCE, counts);

// An h1/h2: `lead <span class="b">payload</span>`.
export const copyHeading = () => heading(FIXED_SOURCE);

// A sentence that opens in bold: `<strong>strong</strong> rest`.
export const strongLead = (placeholders: readonly string[] = []) =>
  z.strictObject({ strong: copy(), rest: copyTemplate(placeholders) });

// A heading and a short text under it (a numbered step, a benefit, a log line).
export const titledText = () => z.strictObject({ title: copy(), text: copy() });

// An https URL with a host (a page on another site, such as a social profile).
export function isHttpsUrl(value: string): boolean {
  const url = URL.parse(value);
  return value.startsWith('https://') && url !== null && url.hostname !== '';
}
export const httpsUrl = z.string().refine(isHttpsUrl, 'Expected an https:// URL');

// A page of the site by its route key (spec §4), with the parameters its path needs and an
// optional `#hash`; routes.ts builds the URL.
export const routeTarget = z.strictObject({
  route: routeKey,
  params: z
    .strictObject({
      vehicle: categoryId.optional(),
      slug: slugSchema.optional(),
      id: idSchema.optional(),
    })
    .optional(),
  hash: idSchema.optional(),
});

// A link: its label and where it goes. A link without a target has no URL yet and is not
// rendered (A9); its label waits here.
export const linkItem = z.strictObject({
  label: copy(),
  target: z.union([routeTarget, z.strictObject({ href: httpsUrl })]).optional(),
});
