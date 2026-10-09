// The building blocks of the Site copy globals (spec §2 "Globals"): every text needs an English
// value (the source language of globals), and facts (company name, phone, a product name in a
// demo) are plain strings shared by every language.
import { z } from 'zod';

import {
  categoryId,
  ITEM_ROUTE_KEYS,
  ROUTE_PARAM_NAMES,
  ROUTE_PARAM_NOUNS,
  ROUTE_PARAMS,
  routeKey,
  type RouteKey,
  type RouteParamName,
} from './keys';
import {
  byCount,
  FIXED_SOURCE,
  heading,
  idSchema,
  plainText,
  plural,
  segmentIdSchema,
  slugSchema,
  template,
  type ByCountKey,
} from './primitives';

// Localized plain text, English required; a `{` or `}` in it fails (a sentence with a
// placeholder is a `copyTemplate`).
export const copy = () => plainText(FIXED_SOURCE);

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

const isItemRoute = (route: RouteKey): boolean =>
  (ITEM_ROUTE_KEYS as readonly RouteKey[]).includes(route);

// A static or category page of the site by its route key (spec §4), with exactly the parameters
// its path needs (ROUTE_PARAMS: `{ route: 'category' }` needs a vehicle) and an optional `#hash`;
// routes.ts builds the URL. Item routes (product, accessory, post) are refused (lead decision,
// cycle 5): a target carries one slug or id for every language and nothing resolves it against
// the item, so a later phase that needs such a link adds an id-based target resolved through the
// page rules.
export const routeTarget = z
  .strictObject({
    route: routeKey.refine((route) => !isItemRoute(route), {
      error: (issue) =>
        `A Site copy link names a static or category page, not the item route "${String(issue.input)}"`,
    }),
    params: z
      .strictObject({
        vehicle: categoryId.optional(),
        slug: slugSchema.optional(),
        id: segmentIdSchema.optional(),
      })
      .optional(),
    hash: idSchema.optional(),
  })
  .superRefine(
    ({ route, params = {} }, context) => {
      const needed: readonly RouteParamName[] = ROUTE_PARAMS[route];
      for (const name of ROUTE_PARAM_NAMES) {
        const isGiven = params[name] !== undefined;
        if (isGiven !== needed.includes(name)) {
          context.addIssue({
            code: 'custom',
            path: ['params', name],
            message: isGiven
              ? `The route "${route}" takes no ${name}`
              : `The route "${route}" needs ${ROUTE_PARAM_NOUNS[name]}`,
          });
        }
      }
    },
    // A route outside the enum has no parameter list to check against.
    { when: (payload) => payload.issues.length === 0 },
  );
export type RouteTarget = z.infer<typeof routeTarget>;

// A link: its label and where it goes. A link without a target has no URL yet and is not
// rendered (A9); its label waits here.
export const linkItem = z.strictObject({
  label: copy(),
  target: z.union([routeTarget, z.strictObject({ href: httpsUrl })]).optional(),
});
