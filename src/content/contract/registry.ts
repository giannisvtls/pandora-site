// Every collection and global the site reads, by name, with its schema. `src/content.config.ts`
// registers each one and `contentLoader(name)` serves it from `content-snapshot/<file>.json`,
// where the file name is the name in kebab-case (`navSections` -> `nav-sections.json`).
import type { z } from 'zod';

import { accessorySchema } from './accessories';
import { faqSchema } from './faq';
import {
  accessoryCardSchema,
  accessoryGroupSchema,
  categorySchema,
  featureSchema,
  levelSchema,
  specRowSchema,
} from './fixed-sets';
import { installerSchema } from './installers';
import { mediaSchema } from './media';
import { navSectionSchema } from './nav-sections';
import { postSchema } from './posts';
import { productSchema } from './products';

// Collections: a JSON array of items, each stored under its `id`.
export const COLLECTIONS = {
  media: mediaSchema,
  products: productSchema,
  accessories: accessorySchema,
  posts: postSchema,
  faq: faqSchema,
  installers: installerSchema,
  navSections: navSectionSchema,
  categories: categorySchema,
  accessoryCards: accessoryCardSchema,
  accessoryGroups: accessoryGroupSchema,
  features: featureSchema,
  specRows: specRowSchema,
  levels: levelSchema,
} as const satisfies Record<string, z.ZodType<{ readonly id: string }>>;
export type CollectionName = keyof typeof COLLECTIONS;

// Globals: one JSON object, stored as the single entry `global` (Site copy, Finder and Languages
// join in later slices).
export const GLOBALS = {} as const satisfies Record<string, z.ZodType<Record<string, unknown>>>;
export type GlobalName = keyof typeof GLOBALS;

// Every registered name (a union of the two key sets).
export type ContentName = keyof (typeof COLLECTIONS & typeof GLOBALS);

// The entry id of a global.
export const GLOBAL_ENTRY_ID = 'global';

// `navSections` -> `nav-sections`.
export function snapshotFileName(name: string): string {
  const kebab = name.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
  return `${kebab}.json`;
}
