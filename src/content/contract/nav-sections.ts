// `navSections` (spec §2): the primary navigation, one item per section.
import { z } from 'zod';

import { itemSchema } from './item';
import { ROUTE_KEYS, ROUTE_PARAMS, routeKey } from './keys';
import { idSchema, orderSchema, showIn, text, type Locale } from './primitives';

// The routes a nav section can lead to: every page whose path takes no parameter (ROUTE_PARAMS),
// the 404 page excepted. A section has no vehicle, slug or id to fill a parameter with, so a
// route that needs one would make every link of the language fail to build.
export const NAV_ROUTE_KEYS = ROUTE_KEYS.filter(
  (route) => ROUTE_PARAMS[route].length === 0 && route !== 'notFound',
);

const navRoute = routeKey.refine((route) => NAV_ROUTE_KEYS.includes(route), {
  error: (issue) =>
    `A nav section leads to a page whose path takes no parameter (${NAV_ROUTE_KEYS.join(', ')}), not "${String(issue.input)}"`,
});

const navSectionShape = (source?: Locale) =>
  z.strictObject({
    id: idSchema,
    route: navRoute,
    order: orderSchema,
    showIn,
    label: text(source),
  });

export const navSectionSchema = itemSchema(navSectionShape);
export type NavSection = z.infer<typeof navSectionSchema>;
