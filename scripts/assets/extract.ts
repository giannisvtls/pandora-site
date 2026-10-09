// The rule behind `npm run media:sources` (the command line is extract-cli.ts): which images of
// the prototype's data file and page the launch site uses, each with the file it becomes and
// every use. Pure: no file access, no request.
//
// The rule (spec "Media: fetch once"): per launch product (`products`, which holds the 16 systems
// and the 4 accessory cards) its package shot, gallery and installation photo; the category
// images of the launch categories (`cats`); the home hero poster; the cars of the home proof
// rail; every post's image; every accessory image; the header and footer logos and the favicon.
// Parked items live outside `products` and `cats`, and the `handed` image is never read, so an
// image only they use is left out (and listed as such).
import { z } from 'zod';

import {
  BRAND_DIR,
  DESIGN_DATA_FILE,
  DESIGN_HTML_FILE,
  DESIGN_IMAGE_PREFIX,
  FAVICON_FILE,
  FAVICON_URL,
  MEDIA_DIR,
} from './config';
import { designTargetFile, mediaFileName, type MediaSources } from './sources';
import { byCodeUnit } from '../crawl/output';

const text = z.string();
const idList = z.array(z.looseObject({ id: text }));
const urlMap = z.record(text, text);
const product = z.looseObject({ id: text, cat: text });
const accessory = z.looseObject({ id: text, img: text.optional() });

// The part of the prototype data the rule reads; other keys are ignored.
export const prototypeSchema = z.looseObject({
  products: z.array(product),
  cats: idList,
  posts: idList,
  accessories: z.array(accessory),
  productImg: urlMap,
  productGallery: z.record(text, z.array(text)),
  installImg: urlMap,
  proofImg: urlMap,
  postImg: urlMap,
  catImg: urlMap,
  handed: z.string(),
  parked: z.looseObject({ products: idList, cats: idList }),
});
export type PrototypeData = z.infer<typeof prototypeSchema>;

const DATA_PREFIX = 'window.INVETEC_DATA=';

// nightwatch-data.js is `window.INVETEC_DATA=<JSON>;` after a comment line; it is parsed as JSON,
// never run.
export function parsePrototypeData(text: string): PrototypeData {
  const start = text.indexOf(DATA_PREFIX);
  if (start === -1) {
    throw new Error(`${DESIGN_DATA_FILE}: no ${DATA_PREFIX} assignment`);
  }
  const json = text
    .slice(start + DATA_PREFIX.length)
    .trim()
    .replace(/;$/u, '');
  return prototypeSchema.parse(JSON.parse(json));
}

const REMOTE_URL = /^https?:\/\//u;
const IMAGE_PATH = /\.(?:avif|gif|jpe?g|png|svg|webp)$/iu;

const isRemote = (ref: string) => REMOTE_URL.test(ref);

// Every image reference in the data with its path (`productImg.elite`, `accessories[3].img`).
function* imageReferences(value: unknown, at: string): Generator<{ at: string; ref: string }> {
  if (typeof value === 'string') {
    if (IMAGE_PATH.test(value) && (isRemote(value) || value.startsWith(DESIGN_IMAGE_PREFIX))) {
      yield { at, ref: value };
    }
  } else if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      yield* imageReferences(item, `${at}[${String(index)}]`);
    }
  } else if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      yield* imageReferences(item, at === '' ? key : `${at}.${key}`);
    }
  }
}

// The data key of the hero poster: `<img class="poster" src="${D.<key>}"` in the home template.
function heroPosterKey(html: string): string {
  const match = /<img class="poster" src="\$\{D\.(\w+)\}"/u.exec(html);
  if (match?.[1] === undefined) {
    throw new Error(`${DESIGN_HTML_FILE}: no hero poster image (class "poster")`);
  }
  return match[1];
}

// The cars of the home proof rail, in order: the `['s1','<car>','<system · year>']` rows of the
// `id="street"` section.
export function proofRailCars(html: string): string[] {
  const start = html.indexOf('id="street"');
  const end = html.indexOf('</section>', start);
  if (start === -1 || end === -1) {
    throw new Error(`${DESIGN_HTML_FILE}: no proof rail section (id="street")`);
  }
  const rows = html.slice(start, end).matchAll(/\['s\d+','([^']+)','[^']+'\]/gu);
  const cars = rows.map((match) => match[1] ?? '').toArray();
  if (cars.length === 0) {
    throw new Error(`${DESIGN_HTML_FILE}: the proof rail lists no car`);
  }
  return cars;
}

// The header and footer logos: `<img class="lw|ld" src="...">`, in page order.
function logos(html: string): { url: string; use: string }[] {
  const footer = html.indexOf('<footer');
  const matches = html.matchAll(/<img class="(l[dw])" src="([^"]+)"/gu);
  return matches
    .map((match) => {
      const region = footer !== -1 && match.index > footer ? 'footer' : 'header';
      return { url: match[2] ?? '', use: `${region} logo (img.${match[1] ?? ''})` };
    })
    .toArray();
}

// URL or design path -> its uses, in the order the rule meets them.
class Uses {
  readonly byRef = new Map<string, string[]>();

  add(ref: string | undefined, use: string): void {
    if (ref === undefined || ref === '') {
      return;
    }
    const uses = this.byRef.get(ref);
    if (uses === undefined) {
      this.byRef.set(ref, [use]);
    } else if (!uses.includes(use)) {
      uses.push(use);
    }
  }
}

function contentUses(data: PrototypeData, html: string): Uses {
  const uses = new Uses();
  for (const { id } of data.products) {
    uses.add(data.productImg[id], `productImg.${id}`);
    const gallery = data.productGallery[id] ?? [];
    for (const [index, url] of gallery.entries()) {
      uses.add(url, `productGallery.${id}[${String(index)}]`);
    }
    uses.add(data.installImg[id], `installImg.${id}`);
  }
  for (const { id } of data.cats) {
    uses.add(data.catImg[id], `catImg.${id}`);
  }
  const poster = heroPosterKey(html);
  const posterUrl = (data as Record<string, unknown>)[poster];
  if (typeof posterUrl !== 'string') {
    throw new TypeError(`${DESIGN_DATA_FILE}: the hero poster key ${poster} is not a string`);
  }
  uses.add(posterUrl, `${poster} (home hero poster)`);
  for (const car of proofRailCars(html)) {
    const url = data.proofImg[car];
    if (url === undefined) {
      throw new Error(`${DESIGN_DATA_FILE}: proofImg has no photo for the proof-rail car ${car}`);
    }
    uses.add(url, `proofImg.${car} (home proof rail)`);
  }
  for (const { id } of data.posts) {
    uses.add(data.postImg[id], `postImg.${id}`);
  }
  for (const { id, img } of data.accessories) {
    uses.add(img, `accessories.${id}`);
  }
  return uses;
}

function assertNotParked(data: PrototypeData): void {
  const live = new Set([...data.products, ...data.cats].map(({ id }) => id));
  const both = [...data.parked.products, ...data.parked.cats].filter(({ id }) => live.has(id));
  if (both.length > 0) {
    throw new Error(`parked and live at once: ${both.map(({ id }) => id).join(', ')}`);
  }
}

export interface Extraction {
  readonly sources: MediaSources;
  // Image references of the data file the rule did not select, with the data paths that use them.
  readonly leftOut: { ref: string; at: string[] }[];
}

export function extractSources(data: PrototypeData, html: string): Extraction {
  assertNotParked(data);
  const content = contentUses(data, html);
  if (content.byRef.has(data.handed)) {
    throw new Error(`the handed image was selected: ${data.handed}`);
  }
  const remote = [...content.byRef].filter(([ref]) => isRemote(ref));
  const local = [...content.byRef].filter(([ref]) => !isRemote(ref));
  const chrome = new Uses();
  for (const { url, use } of logos(html)) {
    chrome.add(url, use);
  }
  chrome.add(FAVICON_URL, 'favicon (site chrome; the prototype page has none)');
  const sources: MediaSources = {
    media: remote.map(([url, uses]) => ({ url, file: `${MEDIA_DIR}/${mediaFileName(url)}`, uses })),
    chrome: [...chrome.byRef].map(([url, uses]) => ({
      url,
      file: url === FAVICON_URL ? FAVICON_FILE : `${BRAND_DIR}/${mediaFileName(url)}`,
      uses,
    })),
    designFiles: local.map(([designFile, uses]) => {
      if (!designFile.startsWith(DESIGN_IMAGE_PREFIX)) {
        throw new Error(`${designFile}: a local image outside ${DESIGN_IMAGE_PREFIX}`);
      }
      return { designFile, file: designTargetFile(designFile), uses };
    }),
  };
  const leftOut = new Map<string, string[]>();
  for (const { at, ref } of imageReferences(data, '')) {
    if (!content.byRef.has(ref)) {
      leftOut.set(ref, [...(leftOut.get(ref) ?? []), at]);
    }
  }
  return {
    sources,
    leftOut: [...leftOut]
      .map(([ref, at]) => ({ ref, at }))
      .toSorted((a, b) => byCodeUnit(a.ref, b.ref)),
  };
}
