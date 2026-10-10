// The part of the prototype's data file (`nightwatch-data.js`) the snapshot converter reads, as
// a schema: a key that is missing or has another shape stops the conversion and names it. The
// file is parsed as JSON, never run (`prototypeJson`, shared with `npm run media:sources`).
// Keys the converter does not convert are left out on purpose (P1-12): product `features`
// bullets, `productColor`, `vehicles` (the proof list), `handed`, `U`, `dealers`, `parked` and
// the `_source` / `_note` remarks; the run's report lists them (left-out.ts).
import { z } from 'zod';

import { prototypeJson } from '../assets/extract';

const text = z.string();
const texts = z.array(text);

// A remark such as `_source` or `_note` inside a map of entries.
const isRemark = (key: string) => key.startsWith('_');

// A map of `entry` values whose `_remark` keys are left out.
function entries<T extends z.ZodType>(entry: T) {
  return z.preprocess(
    (value) =>
      value !== null && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).filter(([key]) => !isRemark(key)))
        : value,
    z.record(text, entry),
  );
}

const feature = z.looseObject({ title: text, what: text, how: text, needs: text });

// A spec group: `[title, bullets]`.
const specGroup = z.tuple([text, texts]);

const productDetail = z.looseObject({
  price_eur: z.number(),
  warranty: text.optional(),
  highlights: texts,
  specs: z.array(specGroup),
  box: texts.optional(),
  src: z.enum(['invetec', 'pricelist']),
});

// `[primary, secondary]` per theme.
const huePair = z.tuple([text, text]);
const hue = z.looseObject({ light: huePair, dark: huePair });

const category = z.looseObject({
  id: text,
  label: text,
  title: text,
  desc: text,
  desc_el: text.optional(),
});

const product = z.looseObject({
  id: text,
  brand: text,
  name: text,
  cat: text,
  tag: text,
  blurb: text,
  blurb_el: text.optional(),
});

const post = z.looseObject({
  id: text,
  cat: text,
  date: text,
  title: text,
  excerpt: text,
  body: texts,
});

const accessory = z.looseObject({
  id: text,
  code: text,
  name: text,
  group: text,
  desc: text,
  desc_el: text.optional(),
  price_eur: z.number(),
  fits: texts,
  vehicles: texts,
  img: text,
});

const tier = z.looseObject({
  n: text,
  title: text,
  what: text,
  items: texts,
  stops: text,
  ids: texts,
});

// A matrix: a number per spec row.
const matrixValues = z.record(text, z.number());

// A Finder pick: `[product id, reason]`.
const finderPick = z.tuple([text, text]);

export const prototypeDataSchema = z.looseObject({
  features: entries(feature),
  productDetail: entries(productDetail),
  hues: entries(hue),
  cats: z.array(category),
  products: z.array(product),
  productImg: z.record(text, text),
  productGallery: z.record(text, texts),
  installImg: z.record(text, text),
  proofImg: z.record(text, text),
  postImg: entries(text),
  catImg: z.record(text, text),
  vehicles: z.array(z.looseObject({ car: text, system: text })),
  posts: z.array(post),
  specRows: z.array(z.looseObject({ key: text, label: text })),
  specs: z.record(text, matrixValues),
  specNotes: z.record(text, z.record(text, text)),
  finderMap: z.record(text, z.record(text, finderPick)),
  placeNote: z.record(text, text),
  tierData: z.array(tier),
  faqData: z.array(z.looseObject({ q: text, a: text })),
  // The home hero poster (`<img class="poster" src="${D.smartFrame}">`).
  smartFrame: text,
  accessories: z.array(accessory),
  accessoryGroups: texts,
});
export type PrototypeData = z.infer<typeof prototypeDataSchema>;
export type PrototypeProduct = z.infer<typeof product>;
export type PrototypeDetail = z.infer<typeof productDetail>;
export type PrototypeHue = z.infer<typeof hue>;

// The data of `nightwatch-data.js` (its text), or an error naming the first key that does not
// have the expected shape.
export function readPrototype(fileText: string): PrototypeData {
  const result = prototypeDataSchema.safeParse(prototypeJson(fileText));
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `${issue.path.map(String).join('.') || '(top)'}: ${issue.message}`,
    );
    throw new Error(
      `the prototype data does not have the expected shape:\n  ${problems.join('\n  ')}`,
    );
  }
  return result.data;
}
