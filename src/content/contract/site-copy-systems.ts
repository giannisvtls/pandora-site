// Site copy of the system pages (spec §2 "Globals"): the catalogue (a vehicle's systems), the
// product page and the accessories page. English is the source language; product, accessory
// and feature texts are collection data, not Site copy.
import { z } from 'zod';

import { copy, copyHeading, copyPlural, copyTemplate } from './site-copy-parts';

export const siteCopyCatalogueSchema = z.strictObject({
  // "8 systems for car": `{vehicle}` is the vehicle's `word`.
  systemCount: copyPlural(['count', 'vehicle']),
  // The level filter's accessible name; its chips are `common.all` and the level titles.
  levelFilterLabel: copy(),
  // Shown when the level filter leaves no system.
  noSystemAtLevel: copy(),
});
export type SiteCopyCatalogue = z.infer<typeof siteCopyCatalogueSchema>;

// Where a product's specification comes from, by its `specSource`; the compatibility note
// follows it.
const specSource = z.strictObject({ pricelist: copy(), invetec: copy() });

export const siteCopyProductSchema = z.strictObject({
  // The accessible name of a gallery thumbnail.
  viewLabel: copyTemplate(['name', 'index', 'total']),
  priceNote: copy(),
  availability: copy(),
  // The compare toggle, off and on.
  compareAdd: copy(),
  compareIn: copy(),
  // The trust row; `warrantyLink` follows `warrantyQuestion` and opens the warranty page.
  trust: z.strictObject({
    installation: copy(),
    warrantyQuestion: copy(),
    warrantyLink: copy(),
    compatibility: copy(),
    // `{hours}` is the footer company block's hours.
    support: copyTemplate(['hours']),
  }),
  keySpecs: copy(),
  // The full specification: the summary line reads `{items} · {inTheBoxNote}` when the
  // product lists its box contents.
  fullSpec: z.strictObject({
    summary: copy(),
    items: copyPlural(['count']),
    inTheBoxNote: copy(),
    inTheBox: copy(),
    warranty: copy(),
    source: specSource,
    compatibilityNote: copy(),
  }),
  // The accessories that fit: the heading, then `common.accessoryCount`.
  fitsHeading: copy(),
  // More systems for the same vehicle: the heading's payload is the vehicle's `word`.
  related: z.strictObject({
    heading: copyHeading(),
    // "All car protection": `{category}` is the category title in lower case.
    all: copyTemplate(['category']),
  }),
});
export type SiteCopyProduct = z.infer<typeof siteCopyProductSchema>;

export const siteCopyAccessoriesSchema = z.strictObject({
  heading: copyHeading(),
  lead: copy(),
  // The accessible name of the vehicle chips.
  vehicleNavLabel: copy(),
  // "14 accessories for camper systems" (all vehicles: `common.accessoryCount`).
  countForVehicle: copyPlural(['count', 'vehicle']),
  // The link back to the systems, with a vehicle chosen and without.
  backToSystems: copy(),
  browseSystems: copy(),
  // The "Fits" line and its fold after four systems.
  fits: copy(),
  moreFits: copyPlural(['count']),
  ask: copy(),
});
export type SiteCopyAccessories = z.infer<typeof siteCopyAccessoriesSchema>;
