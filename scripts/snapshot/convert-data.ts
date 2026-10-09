// The snapshot converter's rule (spec §3): the prototype's data mapped onto the content contract.
// Pure: the command line (convert-cli.ts) reads the files and writes the output.
//
// English everywhere, plus the Greek the data already has (`blurb_el`, `desc_el`, the camper
// category's `desc_el`, A16). A value the data lacks stays absent (an optional field) or stops
// the conversion with an error naming the item and field: nothing is invented. Every item is
// checked against the contract before anything is written.
import { mediaText, type MediaText, type MediaUse } from './alt-text';
import {
  accessoriesOf,
  accessoryCardOf,
  finderOf,
  fixedSetsOf,
  postsOf,
  productOf,
} from './convert-items';
import { english, issueLines } from './convert-text';
import { LEFT_OUT_KEYS, parkedEntries } from './left-out';
import { MediaRefs, photoUses, type ManifestEntry, type ProofShot } from './media-refs';
import type { PrototypeData, PrototypeHue, PrototypeProduct } from './prototype';
import {
  COLLECTIONS,
  LOCALES,
  mediaIdOf,
  type CollectionName,
  type Finder,
} from '../../src/content/contract';

export type { ManifestEntry, ProofShot } from './media-refs';

export interface ConvertInputs {
  readonly manifest: readonly ManifestEntry[];
  readonly proofShots: readonly ProofShot[];
}

export type CollectionItems = Readonly<Record<CollectionName, readonly unknown[]>>;

export interface ConvertedMedia {
  readonly id: string;
  readonly text: MediaText;
  readonly uses: readonly MediaUse[];
}

export interface Converted {
  // Every collection's items, checked against the contract, in snapshot order.
  readonly collections: CollectionItems;
  readonly finder: Finder;
  // Product id and hue, in product order (src/content/hues.ts, A7).
  readonly hues: readonly (readonly [string, PrototypeHue])[];
  // How each media item got its alt text, for the run's report.
  readonly media: readonly ConvertedMedia[];
  // What the data holds that the snapshot leaves out on purpose.
  readonly dropped: readonly string[];
}

// The nav sections, in the prototype header's desktop order (`<nav aria-label="Primary">` in the
// prototype page, labels verbatim). The site's mobile menu uses this order too, while the
// prototype's mobile nav swaps Partners and Contact (one `order` field, lead decision in cycle
// 3). The page is not the converter's source, so the labels are held here.
export const NAV_SECTIONS = [
  ['systems', 'Systems'],
  ['compare', 'Compare'],
  ['installers', 'Find an installer'],
  ['blog', 'Blog'],
  ['partners', 'Partners'],
  ['contact', 'Contact'],
] as const;

// The prototype tells its accessory cards from its systems by this id ending (`isAcc`).
const isAccessoryCard = ({ id }: PrototypeProduct) => id.endsWith('-acc');

function itemLabel(name: string, item: unknown, index: number): string {
  const id = (item as { id?: unknown }).id;
  return typeof id === 'string' ? `${name} ${id}` : `${name} #${String(index)}`;
}

// Every item checked against its collection's schema; the parsed values (canonical key order).
function validated(items: Record<CollectionName, readonly unknown[]>): CollectionItems {
  const problems: string[] = [];
  const output: Partial<Record<CollectionName, unknown[]>> = {};
  for (const [name, list] of Object.entries(items) as [CollectionName, readonly unknown[]][]) {
    const schema = COLLECTIONS[name];
    const seen = new Set<string>();
    output[name] = list.map((item, index) => {
      const result = schema.safeParse(item);
      const label = itemLabel(name, item, index);
      if (!result.success) {
        const lines = issueLines(result.error.issues).replaceAll('\n  ', '\n    ');
        problems.push(`${label}:\n    ${lines}`);
        return item;
      }
      if (seen.has(result.data.id)) problems.push(`${label}: the id appears more than once`);
      seen.add(result.data.id);
      return result.data;
    });
  }
  if (problems.length > 0) {
    throw new Error(`the converted items do not match the contract:\n  ${problems.join('\n  ')}`);
  }
  return output as CollectionItems;
}

const HEX_COLOUR = /^#[\dA-F]{6}$/iu;

// The hues of the launch systems, in product order; the others are left out.
function huesOf(data: PrototypeData, products: readonly PrototypeProduct[]) {
  const ids = new Set(products.map(({ id }) => id));
  const hues = products.flatMap(({ id }) => {
    const hue = data.hues[id];
    return hue === undefined ? [] : [[id, hue] as const];
  });
  for (const [id, hue] of hues) {
    const colours = [...hue.light, ...hue.dark];
    if (colours.some((colour) => !HEX_COLOUR.test(colour))) {
      throw new Error(`hues.${id}: every colour must be #RRGGBB (${colours.join(', ')})`);
    }
  }
  const dropped = Object.keys(data.hues)
    .filter((id) => !ids.has(id))
    .map((id) => `hues.${id}: not a launch product`);
  return { hues, dropped };
}

// The media the content uses: the proof rail first, so its photos keep the prototype's own alt
// text. The hero poster is a use that gives no alt: the hero renders it with alt="" because of
// where it sits, and its file is also Smart V4's install image, whose alt is in ALT_BY_MEDIA
// (spec §3.1).
function mediaRefsOf(data: PrototypeData, inputs: ConvertInputs): MediaRefs {
  const media = new MediaRefs(inputs.manifest);
  for (const [index, shot] of inputs.proofShots.entries()) {
    media.refId(shot.photo, {
      role: 'photo',
      at: `siteCopyHome.proof.shots.${String(index)}.photo`,
      car: shot.car,
      system: shot.caption.split(' · ', 1)[0] ?? shot.caption,
    });
  }
  media.mark(data.smartFrame, { role: 'other', at: 'smartFrame (home hero poster)' });
  return media;
}

export function convertPrototype(data: PrototypeData, inputs: ConvertInputs): Converted {
  const media = mediaRefsOf(data, inputs);
  const photos = photoUses(data);
  const systems = data.products.filter((product) => !isAccessoryCard(product));
  const products = systems.map((product) => productOf(data, media, photos, product));
  const accessoryCards = data.products
    .filter((product) => isAccessoryCard(product))
    .map((product) => accessoryCardOf(data, media, product));
  const accessories = accessoriesOf(data, media);
  const posts = postsOf(data, media, photos);
  const fixed = fixedSetsOf(data, media);
  const mediaItems = media.items(inputs.manifest).map(({ entry, uses }) => {
    const id = mediaIdOf(entry.file);
    return {
      item: { id, file: entry.file, source: entry.source },
      uses,
      text: mediaText(id, uses),
    };
  });

  const collections = validated({
    media: mediaItems.map(({ item, text }) =>
      'decorative' in text ? { ...item, decorative: true } : { ...item, alt: english(text.alt) },
    ),
    products,
    accessories,
    posts,
    faq: data.faqData.map(({ q, a }, index) => ({
      id: `faq-${String(index + 1)}`,
      order: index + 1,
      showIn: [...LOCALES],
      question: english(q),
      answer: english(a),
    })),
    installers: [],
    navSections: NAV_SECTIONS.map(([route, label], index) => ({
      id: route,
      route,
      order: index + 1,
      showIn: [...LOCALES],
      label: english(label),
    })),
    categories: fixed.categories,
    accessoryCards,
    accessoryGroups: fixed.accessoryGroups,
    features: fixed.features,
    specRows: fixed.specRows,
    levels: fixed.levels,
  });
  const { hues, dropped } = huesOf(data, systems);
  return {
    collections,
    finder: finderOf(data),
    hues,
    media: mediaItems.map(({ item, uses, text }) => ({ id: item.id, uses, text })),
    dropped: [...LEFT_OUT_KEYS, ...parkedEntries(data), ...dropped],
  };
}
