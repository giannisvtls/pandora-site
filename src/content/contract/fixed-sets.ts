// Fixed-key sets (spec §2): code refers to their ids, staff edit only their texts. They have no
// `showIn`; their source language is English, so every text they carry needs an `en` value.
import { z } from 'zod';

import { accessoryCardId, categoryId, levelId, specRowKey } from './keys';
import {
  FIXED_SOURCE,
  idSchema,
  mediaId,
  orderSchema,
  productId,
  text,
  uniqueList,
} from './primitives';

const en = () => text(FIXED_SOURCE);

// The five vehicle categories.
export const categorySchema = z.strictObject({
  id: categoryId,
  order: orderSchema,
  label: en(),
  title: en(),
  desc: en(),
  image: mediaId,
});
export type Category = z.infer<typeof categorySchema>;

// One accessory card per vehicle (A15): the catalogue entry that leads to its accessories.
export const accessoryCardSchema = z.strictObject({
  id: accessoryCardId,
  name: en(),
  tag: en(),
  blurb: en(),
  image: mediaId,
});
export type AccessoryCard = z.infer<typeof accessoryCardSchema>;

export const accessoryGroupSchema = z.strictObject({
  id: idSchema,
  order: orderSchema,
  label: en(),
});
export type AccessoryGroup = z.infer<typeof accessoryGroupSchema>;

// The feature explainers; `how` and `needs` are absent where the source has none.
export const featureSchema = z.strictObject({
  id: idSchema,
  title: en(),
  what: en(),
  how: en().optional(),
  needs: en().optional(),
});
export type Feature = z.infer<typeof featureSchema>;

// The 22 rows of the comparison matrix.
export const specRowSchema = z.strictObject({
  id: specRowKey,
  order: orderSchema,
  label: en(),
});
export type SpecRow = z.infer<typeof specRowSchema>;

// The three protection levels. `systems` lists the products at that level; only systems
// without a matrix take their level from it (P1-7).
export const levelSchema = z.strictObject({
  id: levelId,
  title: en(),
  what: en(),
  items: z.array(en()).min(1),
  stops: en(),
  systems: uniqueList(productId),
});
export type Level = z.infer<typeof levelSchema>;
