// The converter tests' inputs: the fixture data file (__fixtures__/prototype-data.json), a media
// manifest for its images and a proof rail of one car.
import { readFile } from 'node:fs/promises';

import type { ConvertInputs, ManifestEntry } from '../convert-data';
import { readPrototype, type PrototypeData } from '../prototype';

export type Loose = Record<string, unknown>;

export const fixtureJson = await readFile(
  new URL('../__fixtures__/prototype-data.json', import.meta.url),
  'utf8',
);

// The fixture as the prototype writes its data file: a comment line, then the assignment.
export function dataFile(json: string = fixtureJson): string {
  return `// Test data file\nwindow.INVETEC_DATA=${json.trim()};\n`;
}

// The fixture's data, read like the real file, after `change`.
export function fixtureData(change?: (data: Loose) => void): PrototypeData {
  const data = JSON.parse(fixtureJson) as Loose;
  change?.(data);
  return readPrototype(dataFile(JSON.stringify(data)));
}

const TEST_URL = 'https://invetec.eu/test/';

const fetched = (name: string, file = name): ManifestEntry => ({
  file: `src/assets/media/${file}`,
  source: { url: `${TEST_URL}${name}` },
});

const copied = (name: string): ManifestEntry => ({
  file: `src/assets/media/pricelist/${name}`,
  source: { designFile: `img/pricelist/${name}` },
});

export const MANIFEST: readonly ManifestEntry[] = [
  { file: 'public/favicon.webp', source: { url: `${TEST_URL}favi.webp` } },
  fetched('accessories.webp'),
  fetched('alpha-package.webp'),
  fetched('camper.webp'),
  fetched('car.webp'),
  // The hero poster, also a product's install image: ALT_BY_MEDIA has its alt.
  fetched('frame.webp', 'pandora-smart-v4-homepage-frame.webp'),
  fetched('install-alpha.jpg'),
  // An id ALT_BY_MEDIA has an alt for, so the gallery shot gets one.
  fetched('ps-330.webp', 'pandora-ps-330.webp'),
  copied('acc-d-061.png'),
  copied('beta.png'),
  fetched('rail.jpg'),
  // A post image whose ALT_BY_MEDIA entry is the prototype's own alt.
  fetched('motodays.webp', '20260218-motodays-2026-gr.webp'),
  fetched('unused.webp'),
];

export const INPUTS: ConvertInputs = {
  manifest: MANIFEST,
  proofShots: [{ car: 'Rail Car', caption: 'Alpha · 2026', photo: 'rail' }],
};
