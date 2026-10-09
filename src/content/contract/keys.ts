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

// Where the vehicle is usually parked, for the Finder's place notes.
export const PLACE_KEYS = ['garage', 'shared', 'street', 'varies'] as const;
export const placeKey = z.enum(PLACE_KEYS);
export type PlaceKey = z.infer<typeof placeKey>;

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

// The routes of item pages: their slug or id differs per item (and a post's slug per language).
export const ITEM_ROUTE_KEYS = ['product', 'accessory', 'post'] as const;
export type ItemRouteKey = (typeof ITEM_ROUTE_KEYS)[number];

// The parameters a route's path can take: a vehicle (a category id), a slug, an item id.
export const ROUTE_PARAM_NAMES = ['vehicle', 'slug', 'id'] as const;
export type RouteParamName = (typeof ROUTE_PARAM_NAMES)[number];

// Each parameter as messages name it: "needs a vehicle", "needs an id".
export const ROUTE_PARAM_NOUNS: Readonly<Record<RouteParamName, string>> = {
  vehicle: 'a vehicle',
  slug: 'a slug',
  id: 'an id',
};

// The parameters each route's path needs, in path order: the one table behind the path builders
// (src/content/routes.ts) and the Site copy link targets (`routeTarget`). `systems` needs none:
// it leads to the car category.
export const ROUTE_PARAMS = {
  home: [],
  systems: [],
  category: ['vehicle'],
  product: ['vehicle', 'slug'],
  compare: [],
  accessories: [],
  accessoriesVehicle: ['vehicle'],
  accessory: ['vehicle', 'id'],
  blog: [],
  post: ['slug'],
  installers: [],
  contact: [],
  partners: [],
  warranty: [],
  notFound: [],
} as const satisfies Readonly<Record<RouteKey, readonly RouteParamName[]>>;
