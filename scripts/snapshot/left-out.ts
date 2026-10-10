// What the prototype's data holds that the snapshot leaves out on purpose, for the converter's
// "left out" report: the keys spec §3 drops (P1-12), the data's own notes, and the entries of
// the items parked for launch.
import type { PrototypeData } from './prototype';

// The keys the converter does not convert, and why.
export const LEFT_OUT_KEYS = [
  'products[].features: the feature bullets (P1-12)',
  'productColor: the product colours (P1-12; the hues are src/content/hues.ts)',
  'vehicles: the proof list (P1-12; it only names the system in a post photo alt)',
  'handed: an image no launch page shows (P1-12)',
  'U: the image URL prefix (P1-12)',
  'dealers: the dealer list (P1-12; installers stay empty)',
  'parked: the products and categories hidden for launch',
  'posts[].imgLabel: placeholder image labels (the post images have their own alt)',
  '_source and _note remarks, specSource, accessoriesSource: notes on where the data came from',
] as const;

// The entries keyed by a product or category id that is not in the launch catalogue: what the
// parked items left behind (their images, gallery, details). The hues are reported by the hues
// rule (convert-data.ts).
export function parkedEntries(data: PrototypeData): string[] {
  const products = new Set(data.products.map(({ id }) => id));
  const categories = new Set(data.cats.map(({ id }) => id));
  const byProduct: Readonly<Record<string, object>> = {
    productDetail: data.productDetail,
    productImg: data.productImg,
    productGallery: data.productGallery,
    installImg: data.installImg,
    specs: data.specs,
    specNotes: data.specNotes,
  };
  return [
    ...Object.entries(byProduct).flatMap(([name, entries]) =>
      Object.keys(entries)
        .filter((id) => !products.has(id))
        .map((id) => `${name}.${id}: not a launch product`),
    ),
    ...Object.keys(data.catImg)
      .filter((id) => !categories.has(id))
      .map((id) => `catImg.${id}: not a launch category`),
  ];
}
