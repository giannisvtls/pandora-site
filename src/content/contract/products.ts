// `products`: the systems (spec §2). Facts (slug, brand, price, matrix, notes) are shared by all
// languages; name, tag and blurb, and every other text present, need the source language.
import { z } from 'zod';

import { itemSchema } from './item';
import { categoryId, specRowKey } from './keys';
import {
  idSchema,
  mediaId,
  orderSchema,
  showIn,
  slugSchema,
  text,
  textValue,
  uniqueList,
  type Locale,
} from './primitives';

// 1 Included, 2 Optional, 0 Not available.
export const matrixValue = z.literal([0, 1, 2]);

// Every one of the 22 spec rows, none missing and none extra (a record over an enum is
// exhaustive in zod 4).
export const matrixSchema = z.record(specRowKey, matrixValue);
export type Matrix = z.infer<typeof matrixSchema>;

const specGroupShape = (source?: Locale) => {
  const bullets = z.array(text(source)).min(1);
  return z.strictObject({ title: text(source), items: bullets });
};

const productShape = (source?: Locale) =>
  z.strictObject({
    id: idSchema,
    // ASCII kebab from the English name (A17); one slug for every language.
    slug: slugSchema,
    category: categoryId,
    // Where the system stands in every list of systems (lowest first; the prototype lists the
    // flagship first). Astro's data store returns the collection sorted by id, so the query sorts
    // by this.
    order: orderSchema,
    brand: textValue,
    showIn,
    name: text(source),
    tag: text(source),
    blurb: text(source),
    priceEur: z.int().positive(),
    // Feature keys (that they exist is the snapshot integrity test's check).
    highlights: uniqueList(idSchema, 1),
    specGroups: z.array(specGroupShape(source)),
    box: z.array(text(source)).min(1).optional(),
    warranty: text(source).optional(),
    specSource: z.enum(['invetec', 'pricelist']),
    // Absent for systems the comparison does not cover (Finder, Tracer).
    matrix: matrixSchema.optional(),
    // Part codes per spec row, facts.
    matrixNotes: z.partialRecord(specRowKey, textValue).optional(),
    image: mediaId,
    gallery: uniqueList(mediaId),
    installImage: mediaId.optional(),
  });

export const productSchema = itemSchema(productShape);
export type Product = z.infer<typeof productSchema>;
