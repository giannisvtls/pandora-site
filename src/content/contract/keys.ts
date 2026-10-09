// The keys code refers to (spec §2 fixed-key sets, §4 routes). Staff edit the texts behind them,
// never the keys themselves.
import { z } from 'zod';

// The five vehicle categories, in the prototype's order.
export const CATEGORY_IDS = ['car', 'moto', 'camper', 'marine', 'fleet'] as const;
export const categoryId = z.enum(CATEGORY_IDS);
export type CategoryId = z.infer<typeof categoryId>;

// The vehicles that have an accessory card (fleet has none).
export const ACCESSORY_CARD_IDS = ['car', 'moto', 'camper', 'marine'] as const;
export const accessoryCardId = z.enum(ACCESSORY_CARD_IDS);

// The three protection levels: Detection, Prevention, Recovery.
export const LEVEL_IDS = ['1', '2', '3'] as const;
export const levelId = z.enum(LEVEL_IDS);
export type LevelId = z.infer<typeof levelId>;

// The 22 rows of the comparison matrix, in the prototype's order (`specRows` in its data file).
// A product's matrix has every one of them (spec §2); their groups stay in code (A7).
export const SPEC_ROW_KEYS = [
  'accel',
  'siren',
  'immo',
  'bt',
  'pin',
  'smarttag',
  'nodisarm',
  'hijack',
  'jammer',
  'gps',
  'wifi',
  'lbs',
  'lte',
  'blackbox',
  'app',
  'push',
  'selfcall',
  'oem',
  'remote',
  'start',
  'keyless',
  'preheater',
] as const;
export const specRowKey = z.enum(SPEC_ROW_KEYS);
export type SpecRowKey = z.infer<typeof specRowKey>;

// The page types a link can target (spec §4). `systems` is the nav section key of the Systems
// section, which leads to the car category page.
export const ROUTE_KEYS = [
  'home',
  'systems',
  'category',
  'product',
  'compare',
  'accessories',
  'accessoriesVehicle',
  'accessory',
  'blog',
  'post',
  'installers',
  'contact',
  'partners',
  'warranty',
  'notFound',
] as const;
export const routeKey = z.enum(ROUTE_KEYS);
export type RouteKey = z.infer<typeof routeKey>;
