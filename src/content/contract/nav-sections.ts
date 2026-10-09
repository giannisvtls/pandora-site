// `navSections` (spec §2): the primary navigation, one item per section.
import { z } from 'zod';

import { itemSchema } from './item';
import { routeKey } from './keys';
import { idSchema, orderSchema, showIn, text, type Locale } from './primitives';

const navSectionShape = (source?: Locale) =>
  z.strictObject({
    id: idSchema,
    route: routeKey,
    order: orderSchema,
    showIn,
    label: text(source),
  });

export const navSectionSchema = itemSchema(navSectionShape);
export type NavSection = z.infer<typeof navSectionSchema>;
