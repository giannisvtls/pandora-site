// The font provider (A12) on the installed packages: the faces of the subsets the family asks for,
// each a woff2 file of the pinned package with its unicode range and subset, no network; the
// Greek faces cover the Greek and Coptic block (U+0370-03FF).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { FontProvider } from 'astro';
import { describe, expect, it } from 'vitest';

import config from '../../../astro.config.mjs';
import { fontsourceVariable } from '../fontsource-variable';

type ResolveOptions = Parameters<FontProvider['resolveFont']>[0];
type InitContext = Parameters<NonNullable<FontProvider['init']>>[0];

const ROOT = new URL('../../../', import.meta.url);
const PACKAGES = [
  '@fontsource-variable/sofia-sans-extra-condensed',
  '@fontsource-variable/sofia-sans',
] as const;

const SUBSETS = ['latin', 'latin-ext', 'greek'];

// The faces the provider gives for `pkg`, as the Fonts API asks for them when the build starts.
async function facesOf(pkg: string, subsets = SUBSETS, styles: readonly string[] = ['normal']) {
  const provider = fontsourceVariable(pkg);
  await provider.init?.({ root: ROOT } as InitContext);
  const result = await provider.resolveFont({
    familyName: pkg,
    weights: ['400'],
    styles: styles as ResolveOptions['styles'],
    subsets,
    formats: ['woff2'],
    options: undefined,
  });
  return result?.fonts ?? [];
}

// The package's own subset -> unicode range table.
function unicodeOf(pkg: string): Record<string, string> {
  const file = new URL(`node_modules/${pkg}/unicode.json`, ROOT);
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>;
}

// The code points a `U+XXXX` / `U+XXXX-YYYY` range list covers.
function covered(ranges: readonly string[]): Set<number> {
  const points = new Set<number>();
  for (const range of ranges) {
    const [from = '', to = from] = range.trim().replace(/^U\+/iu, '').split('-', 2);
    for (let point = Number.parseInt(from, 16); point <= Number.parseInt(to, 16); point += 1) {
      points.add(point);
    }
  }
  return points;
}

// Every assigned code point of the Greek and Coptic block.
const GREEK_BLOCK = Array.from(
  { length: 0x3_ff - 0x3_70 + 1 },
  (_, index) => 0x3_70 + index,
).filter((point) => !/\p{Cn}/u.test(String.fromCodePoint(point)));

describe.each(PACKAGES)('%s', (pkg) => {
  it('gives one face per subset: its woff2 file in the package, its range and its subset', async () => {
    const faces = await facesOf(pkg);
    const id = pkg.replace('@fontsource-variable/', '');

    expect(faces.map(({ meta }) => meta?.subset)).toEqual(SUBSETS);
    for (const face of faces) {
      const [source] = face.src;
      const url = source !== undefined && 'url' in source ? source.url : '';
      const subset = face.meta?.subset ?? '';
      const file = String.raw`/node_modules/${pkg}/files/${id}-${subset}-wght-normal\.woff2$`;

      expect(path.isAbsolute(url), url).toBe(true);
      expect(url.replaceAll('\\', '/')).toMatch(new RegExp(file, 'u'));
      expect(existsSync(url)).toBe(true);
      expect(face).toMatchObject({ weight: '1 1000', style: 'normal' });
    }
  });

  it("takes each range from the package's unicode.json", async () => {
    const unicode = unicodeOf(pkg);
    const faces = await facesOf(pkg);

    for (const face of faces) {
      expect(face.unicodeRange?.join(',')).toBe(unicode[face.meta?.subset ?? '']);
    }
  });

  it('covers every Greek letter and sign of U+0370-03FF', async () => {
    const faces = await facesOf(pkg);
    const greek = faces.find(({ meta }) => meta?.subset === 'greek');
    const points = covered(greek?.unicodeRange ?? []);

    expect(GREEK_BLOCK.length).toBeGreaterThan(130);
    expect(GREEK_BLOCK.filter((point) => !points.has(point))).toEqual([]);
  });

  it('refuses a subset or a style the package does not have', async () => {
    await expect(facesOf(pkg, ['klingon'])).rejects.toThrow(`${pkg} has no subset "klingon"`);
    await expect(facesOf(pkg, ['latin'], ['oblique'])).rejects.toThrow(
      `${pkg} has no style "oblique"`,
    );
  });
});

describe('the font families of astro.config.mjs', () => {
  const families = config.fonts ?? [];

  it('give each package its own provider identity', () => {
    const configs = PACKAGES.map((pkg) => fontsourceVariable(pkg).config);

    expect(configs).toEqual([{ package: PACKAGES[0] }, { package: PACKAGES[1] }]);
  });

  it('serve latin, latin-ext and Greek in the normal style from the two packages (A12)', () => {
    for (const family of families) {
      expect(family.subsets, family.name).toEqual(SUBSETS);
      expect(family.styles, family.name).toEqual(['normal']);
      expect(family.provider.name, family.name).toBe('fontsource-variable');
    }
    expect(families.map(({ provider }) => provider.config)).toEqual(
      PACKAGES.map((pkg) => ({ package: pkg })),
    );
  });
});
