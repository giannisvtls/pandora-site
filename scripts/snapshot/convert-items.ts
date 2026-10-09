// How each prototype entry becomes a snapshot item, before the contract checks it
// (convert-data.ts). Every item is shown in all four languages (`showIn`, the converter default);
// a value the data lacks is left out (an optional field) or stops the conversion.
import {
  english,
  englishAndGreek,
  englishIfAny,
  issueLines,
  partialDateOf,
  required,
  slugOf,
  withoutUndefined,
} from './convert-text';
import type { MediaRefs, PhotoUses } from './media-refs';
import type { PrototypeData, PrototypeDetail, PrototypeProduct } from './prototype';
import { ACCESSORY_CARD_IDS, finderSchema, LOCALES, type Finder } from '../../src/content/contract';

// The matrix of a system in spec-row order; undefined when the data has none (Finder, Tracer).
function matrixOf(data: PrototypeData, id: string) {
  const specs = data.specs[id];
  return specs === undefined
    ? undefined
    : Object.fromEntries(
        data.specRows.map(({ key }) => [key, required(specs[key], `specs.${id}.${key}`)]),
      );
}

// The part codes of a system in spec-row order; undefined when the data has none.
function matrixNotesOf(data: PrototypeData, id: string) {
  const notes = data.specNotes[id] ?? {};
  const order = data.specRows.map(({ key }) => key);
  const entries = Object.entries(notes).toSorted(([a], [b]) => order.indexOf(a) - order.indexOf(b));
  return entries.length === 0 ? undefined : Object.fromEntries(entries);
}

export function productOf(
  data: PrototypeData,
  media: MediaRefs,
  photos: PhotoUses,
  product: PrototypeProduct,
) {
  const { id } = product;
  const detail: PrototypeDetail = required(data.productDetail[id], `productDetail.${id}`);
  const image = required(data.productImg[id], `productImg.${id}`);
  const install = data.installImg[id];
  return withoutUndefined({
    id,
    slug: slugOf(product.name),
    category: product.cat,
    brand: product.brand,
    showIn: [...LOCALES],
    name: english(product.name),
    tag: english(product.tag),
    blurb: englishAndGreek(product.blurb, product.blurb_el),
    priceEur: detail.price_eur,
    highlights: detail.highlights,
    specGroups: detail.specs.map(([title, items]) => ({
      title: english(title),
      items: items.map((item) => english(item)),
    })),
    box: detail.box?.map((item) => english(item)),
    warranty: englishIfAny(detail.warranty),
    specSource: detail.src,
    matrix: matrixOf(data, id),
    matrixNotes: matrixNotesOf(data, id),
    image: media.ref(image, {
      role: 'package',
      at: `productImg.${id}`,
      brand: product.brand,
      name: product.name,
    }),
    gallery: (data.productGallery[id] ?? []).map((url, index) =>
      media.ref(url, { role: 'other', at: `productGallery.${id}[${String(index)}]` }),
    ),
    installImage:
      install === undefined
        ? undefined
        : media.ref(install, photos.install(install, product.name, `installImg.${id}`)),
  });
}

export function accessoryCardOf(data: PrototypeData, media: MediaRefs, product: PrototypeProduct) {
  if (!(ACCESSORY_CARD_IDS as readonly string[]).includes(product.cat)) {
    throw new Error(`products.${product.id}: no accessory card for the vehicle ${product.cat}`);
  }
  return {
    id: product.cat,
    name: english(product.name),
    tag: english(product.tag),
    blurb: english(product.blurb),
    image: media.ref(required(data.productImg[product.id], `productImg.${product.id}`), {
      role: 'package',
      at: `productImg.${product.id}`,
      brand: product.brand,
      name: product.name,
    }),
  };
}

export function accessoriesOf(data: PrototypeData, media: MediaRefs) {
  return data.accessories.map((accessory) =>
    withoutUndefined({
      id: accessory.id,
      code: accessory.code,
      showIn: [...LOCALES],
      name: english(accessory.name),
      desc: englishAndGreek(accessory.desc, accessory.desc_el),
      group: slugOf(accessory.group),
      priceEur: accessory.price_eur,
      fits: accessory.fits,
      vehicles: accessory.vehicles,
      image:
        accessory.img === ''
          ? undefined
          : media.ref(accessory.img, {
              role: 'accessory',
              at: `accessories.${accessory.id}.img`,
              code: accessory.code,
            }),
    }),
  );
}

export function postsOf(data: PrototypeData, media: MediaRefs, photos: PhotoUses) {
  return data.posts.map((post) => {
    const date = partialDateOf(post.date);
    if (date === undefined) {
      throw new Error(`posts.${post.id}.date: "${post.date}" is not a date the converter reads`);
    }
    const image = required(data.postImg[post.id], `postImg.${post.id}`);
    return withoutUndefined({
      id: post.id,
      showIn: [...LOCALES],
      slug: { en: slugOf(post.title) },
      category: post.cat.toLowerCase(),
      date,
      title: english(post.title),
      excerpt: englishIfAny(post.excerpt),
      body: {
        en: post.body.map((paragraph) => ({
          type: 'paragraph',
          children: [{ type: 'text', text: paragraph }],
        })),
      },
      image: media.ref(image, photos.post(image, `postImg.${post.id}`)),
    });
  });
}

export function fixedSetsOf(data: PrototypeData, media: MediaRefs) {
  return {
    categories: data.cats.map((category, index) => ({
      id: category.id,
      order: index + 1,
      label: english(category.label),
      title: english(category.title),
      desc: englishAndGreek(category.desc, category.desc_el),
      image: media.ref(required(data.catImg[category.id], `catImg.${category.id}`), {
        role: 'decorative',
        at: `catImg.${category.id} (category head)`,
      }),
    })),
    accessoryGroups: data.accessoryGroups.map((label, index) => ({
      id: slugOf(label),
      order: index + 1,
      label: english(label),
    })),
    features: Object.entries(data.features).map(([id, feature]) =>
      withoutUndefined({
        id,
        title: english(feature.title),
        what: english(feature.what),
        how: englishIfAny(feature.how),
        needs: englishIfAny(feature.needs),
      }),
    ),
    specRows: data.specRows.map(({ key, label }, index) => ({
      id: key,
      order: index + 1,
      label: english(label),
    })),
    levels: data.tierData.map((tier) => ({
      id: tier.n,
      title: english(tier.title),
      what: english(tier.what),
      items: tier.items.map((item) => english(item)),
      stops: english(tier.stops),
      systems: tier.ids,
    })),
  };
}

const pickOf = ([product, reason]: readonly [string, string]) => ({
  product,
  reason: english(reason),
});

export function finderOf(data: PrototypeData): Finder {
  const picks = Object.fromEntries(
    Object.entries(data.finderMap).map(([vehicle, levels]) => {
      const byLevel = Object.entries(levels).map(([level, pick]) => [level, pickOf(pick)]);
      return [vehicle, Object.fromEntries(byLevel)];
    }),
  );
  const placeNotes = Object.fromEntries(
    Object.entries(data.placeNote).map(([place, note]) => [place, english(note)]),
  );
  const result = finderSchema.safeParse({ picks, placeNotes });
  if (!result.success) {
    throw new Error(
      `the Finder does not match the contract:\n  ${issueLines(result.error.issues)}`,
    );
  }
  return result.data;
}
