// The Finder global (spec §2 "Globals"): per vehicle and level, the system the Finder suggests
// and why, plus a note per parking place. English is the source language. Converted from the
// prototype's `finderMap` and `placeNote` (content-snapshot/finder.json).
import { z } from 'zod';

import { categoryId, levelId, placeKey } from './keys';
import { FIXED_SOURCE, productId, text } from './primitives';

// A suggestion: a `products` id (that it exists is the snapshot integrity test's check) and the
// reason shown with it.
const finderPick = z.strictObject({ product: productId, reason: text(FIXED_SOURCE) });

export const finderSchema = z.strictObject({
  // Every vehicle has a pick for every level (a record over an enum is exhaustive in zod 4).
  picks: z.record(categoryId, z.record(levelId, finderPick)),
  placeNotes: z.record(placeKey, text(FIXED_SOURCE)),
});
export type Finder = z.infer<typeof finderSchema>;
