// `accessories` (spec §2): code and price are facts; the price is stored, never rendered.
import { z } from 'zod';

import { itemSchema } from './item';
import { categoryId } from './keys';
import {
  idSchema,
  mediaId,
  productId,
  showIn,
  text,
  textValue,
  uniqueList,
  type Locale,
} from './primitives';

const accessoryShape = (source?: Locale) =>
  z.strictObject({
    id: idSchema,
    code: textValue,
    showIn,
    name: text(source),
    desc: text(source),
    // An accessoryGroups id.
    group: idSchema,
    priceEur: z.int().positive(),
    // The products it fits; empty when it fits none of them.
    fits: uniqueList(productId),
    vehicles: uniqueList(categoryId, 1),
    image: mediaId.optional(),
  });

export const accessorySchema = itemSchema(accessoryShape);
export type Accessory = z.infer<typeof accessorySchema>;
