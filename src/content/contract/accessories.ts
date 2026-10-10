// `accessories` (spec §2): code and price are facts; the price is stored, never rendered.
import { z } from 'zod';

import { itemSchema } from './item';
import { categoryId } from './keys';
import {
  idSchema,
  mediaId,
  productId,
  segmentIdSchema,
  showIn,
  text,
  textValue,
  uniqueList,
  type Locale,
} from './primitives';

const accessoryShape = (source?: Locale) =>
  z.strictObject({
    // A URL segment: the accessory's page is `/{L}/accessories/{vehicle}/{id}/`.
    id: segmentIdSchema,
    code: textValue,
    showIn,
    name: text(source),
    desc: text(source),
    // An accessoryGroups id.
    group: idSchema,
    priceEur: z.int().positive(),
    // The products it fits; empty when it fits none of them.
    fits: uniqueList(productId),
    // The vehicles it is listed under; empty when it suits none in particular (it is then listed
    // only under "All", user decision 2026-10-09).
    vehicles: uniqueList(categoryId),
    image: mediaId.optional(),
  });

export const accessorySchema = itemSchema(accessoryShape);
export type Accessory = z.infer<typeof accessorySchema>;
