// The snapshot integrity checks (A13), as one function over the parsed snapshot: a loader
// validates one collection and cannot see the others, so these look across them. Each problem
// names the item and the value that does not resolve.
import type { SnapshotData } from '../../../scripts/snapshot/read-snapshot';
import {
  ACCESSORY_CARD_IDS,
  CATEGORY_IDS,
  LEVEL_IDS,
  LOCALES,
  mediaIdOf,
  ROUTE_KEYS,
  SPEC_ROW_KEYS,
  type Block,
  type RichText,
} from '../contract';

// What the checks read besides the parsed snapshot: the matrix keys in the order the file holds
// them (parsing puts them in the contract's order), the product ids of the hues module, and
// whether a file exists.
export interface IntegrityContext {
  readonly matrixKeys: ReadonlyMap<string, readonly string[]>;
  readonly hueIds: readonly string[];
  readonly hasFile: (file: string) => boolean;
}

const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;

function duplicates(values: readonly string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

function sameKeys(label: string, actual: readonly string[], expected: readonly string[]): string[] {
  return JSON.stringify(actual) === JSON.stringify(expected)
    ? []
    : [`${label}: ${actual.join(', ')}; expected ${expected.join(', ')}`];
}

const isImage = (block: Block): block is Extract<Block, { type: 'image' }> =>
  block.type === 'image';

function imagesIn(body: Partial<Record<string, RichText>>): string[] {
  return Object.values(body).flatMap((blocks) =>
    (blocks ?? []).filter(isImage).map(({ media }) => media),
  );
}

type Reference = readonly [who: string, id: string];

// Every media reference, collections and Site copy, with who makes it.
function mediaReferences(s: SnapshotData): Reference[] {
  return [
    ...s.products.flatMap((product): Reference[] => [
      [`product ${product.id} image`, product.image],
      ...product.gallery.map((id): Reference => [`product ${product.id} gallery`, id]),
      ...(product.installImage === undefined
        ? []
        : [[`product ${product.id} installImage`, product.installImage] as const]),
    ]),
    ...s.accessories.flatMap(({ id, image }): Reference[] =>
      image === undefined ? [] : [[`accessory ${id} image`, image]],
    ),
    ...s.posts.flatMap((post): Reference[] => [
      [`post ${post.id} image`, post.image],
      ...imagesIn(post.body).map((id): Reference => [`post ${post.id} body`, id]),
    ]),
    ...s.categories.map(({ id, image }): Reference => [`category ${id} image`, image]),
    ...s.accessoryCards.map(({ id, image }): Reference => [`accessory card ${id} image`, image]),
    ...s.siteCopyHome.proof.shots.map(({ photo }, index): Reference => [
      `siteCopyHome.proof.shots.${String(index)}.photo`,
      photo,
    ]),
  ];
}

const idsOf = (items: readonly { id: string }[]) => items.map(({ id }) => id);

function fixedSetProblems(s: SnapshotData): string[] {
  return [
    ...sameKeys('categories', idsOf(s.categories.toSorted(byOrder)), CATEGORY_IDS),
    ...sameKeys('accessory cards', idsOf(s.accessoryCards), ACCESSORY_CARD_IDS),
    ...sameKeys('levels', idsOf(s.levels), LEVEL_IDS),
    ...sameKeys('spec rows', idsOf(s.specRows.toSorted(byOrder)), SPEC_ROW_KEYS),
  ];
}

function productProblems(s: SnapshotData, context: IntegrityContext): string[] {
  const categories = new Set(s.categories.map(({ id }) => id));
  const features = new Set(s.features.map(({ id }) => id));
  const rows = JSON.stringify(s.specRows.toSorted(byOrder).map(({ id }) => id));
  const productIds = new Set(s.products.map(({ id }) => id));
  return [
    ...s.products.flatMap((product) => [
      ...(categories.has(product.category)
        ? []
        : [`product ${product.id}: category "${product.category}" is not a category`]),
      ...product.highlights
        .filter((key) => !features.has(key))
        .map((key) => `product ${product.id}: highlight "${key}" is not a feature`),
      ...(product.matrix === undefined ||
      JSON.stringify(context.matrixKeys.get(product.id)) === rows
        ? []
        : [`product ${product.id}: the matrix keys are not the 22 spec rows in order`]),
    ]),
    ...duplicates(s.products.map(({ slug }) => slug)).map((slug) => `product slug "${slug}" twice`),
    ...context.hueIds
      .filter((id) => !productIds.has(id))
      .map((id) => `hues: "${id}" is not a product`),
  ];
}

function relationProblems(s: SnapshotData): string[] {
  const products = new Set(s.products.map(({ id }) => id));
  const categories = new Set(s.categories.map(({ id }) => id));
  const groups = new Set(s.accessoryGroups.map(({ id }) => id));
  const routes = new Set<string>(ROUTE_KEYS);
  const pickProblems = Object.entries(s.finder.picks).flatMap(([vehicle, picks]) =>
    Object.entries(picks)
      .filter(([, pick]) => !products.has(pick.product))
      .map(([level, pick]) => `finder ${vehicle} ${level}: "${pick.product}" is not a product`),
  );
  const slugProblems = LOCALES.flatMap((locale) =>
    duplicates(s.posts.flatMap(({ slug }) => slug[locale] ?? [])).map(
      (slug) => `post slug "${slug}" twice in ${locale}`,
    ),
  );
  return [
    ...s.accessories.flatMap((accessory) => [
      ...(groups.has(accessory.group)
        ? []
        : [`accessory ${accessory.id}: group "${accessory.group}" is not an accessory group`]),
      ...accessory.fits
        .filter((id) => !products.has(id))
        .map((id) => `accessory ${accessory.id}: fits "${id}", not a product`),
      ...accessory.vehicles
        .filter((id) => !categories.has(id))
        .map((id) => `accessory ${accessory.id}: vehicle "${id}" is not a category`),
    ]),
    ...s.levels.flatMap((level) =>
      level.systems
        .filter((id) => !products.has(id))
        .map((id) => `level ${level.id}: "${id}" is not a product`),
    ),
    ...pickProblems,
    ...s.accessoryCards
      .filter(({ id }) => !categories.has(id))
      .map(({ id }) => `accessory card "${id}" is not a category`),
    ...s.navSections
      .filter(({ route }) => !routes.has(route))
      .map(({ id, route }) => `nav section ${id}: route "${route}" is not a route key`),
    ...slugProblems,
  ];
}

function mediaProblems(s: SnapshotData, context: IntegrityContext): string[] {
  const ids = new Set(s.media.map(({ id }) => id));
  const references = mediaReferences(s);
  const used = new Set(references.map(([, id]) => id));
  return [
    ...references
      .filter(([, id]) => !ids.has(id))
      .map(([who, id]) => `${who}: media "${id}" does not exist`),
    ...duplicates(s.media.map(({ id }) => id)).map((id) => `media id "${id}" twice`),
    ...s.media.flatMap((media) => [
      ...(media.id === mediaIdOf(media.file)
        ? []
        : [`media ${media.id}: the id of ${media.file} is ${mediaIdOf(media.file)}`]),
      ...(context.hasFile(media.file) ? [] : [`media ${media.id}: ${media.file} is not on disk`]),
      ...(used.has(media.id) ? [] : [`media ${media.id}: nothing uses it`]),
    ]),
  ];
}

// Every integrity problem of the snapshot; none means every reference resolves.
export function integrityProblems(s: SnapshotData, context: IntegrityContext): string[] {
  return [
    ...fixedSetProblems(s),
    ...productProblems(s, context),
    ...relationProblems(s),
    ...mediaProblems(s, context),
  ];
}
