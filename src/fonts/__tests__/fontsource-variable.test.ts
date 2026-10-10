// The font provider (A12) on the installed packages: the faces of the subsets the family asks for,
// each a woff2 file of the pinned package with its unicode range and subset, no network; the
// Greek faces cover the Greek and Coptic block (U+0370-03FF). A family whose package lacks a
// subset, style or file fails when astro.config.mjs loads (`fontsourceFamily`), since the Fonts
// API only logs the provider's own error and builds without the family.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { FontProvider } from 'astro';
import { afterAll, describe, expect, it } from 'vitest';

import config from '../../../astro.config.mjs';
import {
  fontsourceFamily,
  fontsourceVariable,
  type FontsourceFamily,
} from '../fontsource-variable';

type ResolveOptions = Parameters<FontProvider['resolveFont']>[0];
type InitContext = Parameters<NonNullable<FontProvider['init']>>[0];

const ROOT = new URL('../../../', import.meta.url);
const PACKAGES = [
  '@fontsource-variable/sofia-sans-extra-condensed',
  '@fontsource-variable/sofia-sans',
] as const;

const SUBSETS: [string, ...string[]] = ['latin', 'latin-ext', 'greek'];

// The faces the provider gives for `pkg`, as the Fonts API asks for them when the build starts;
// `root` is the project root it resolves the package from.
async function facesOf(
  pkg: string,
  subsets = SUBSETS,
  styles: readonly string[] = ['normal'],
  root = ROOT,
) {
  const provider = fontsourceVariable(pkg);
  await provider.init?.({ root } as InitContext);
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

// The body family as astro.config.mjs declares it, with a package to read.
const FAMILY: FontsourceFamily = {
  package: '@fontsource-variable/sofia-sans',
  name: 'Sofia Sans',
  cssVariable: '--body',
  subsets: SUBSETS,
  styles: ['normal'],
  fallbacks: ['sans-serif'],
};

// A scratch project root whose node_modules holds a copy of `pkg` without its file `missing`.
function packageCopyWithout(pkg: string, missing: string): URL {
  const root = mkdtempSync(path.join(tmpdir(), 'fontsource-copy-'));
  const from = fileURLToPath(new URL(`node_modules/${pkg}/`, ROOT));
  const to = path.join(root, 'node_modules', pkg);
  mkdirSync(path.join(to, 'files'), { recursive: true });
  for (const file of ['package.json', 'metadata.json', 'unicode.json']) {
    copyFileSync(path.join(from, file), path.join(to, file));
  }
  const files = readdirSync(path.join(from, 'files'));
  for (const file of files) {
    if (file === missing) continue;
    copyFileSync(path.join(from, 'files', file), path.join(to, 'files', file));
  }
  return pathToFileURL(`${root}${path.sep}`);
}

describe('a package without one of the woff2 files a family asks for', () => {
  const missing = 'sofia-sans-greek-wght-normal.woff2';
  const root = packageCopyWithout(FAMILY.package, missing);
  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('makes the provider refuse the family, naming the file', async () => {
    await expect(facesOf(FAMILY.package, SUBSETS, ['normal'], root)).rejects.toThrow(
      `${FAMILY.package} has no file ${missing}`,
    );
    // The copy itself is sound: a subset whose file is there resolves.
    expect(await facesOf(FAMILY.package, ['latin'], ['normal'], root)).toHaveLength(1);
  });

  it('stops astro.config.mjs while it loads (fontsourceFamily)', () => {
    expect(() => fontsourceFamily(FAMILY, root)).toThrow(
      `${FAMILY.package} has no file ${missing}`,
    );
    expect(fontsourceFamily({ ...FAMILY, subsets: ['latin'] }, root).name).toBe('Sofia Sans');
  });
});

describe('fontsourceFamily (astro.config.mjs)', () => {
  it('gives the Fonts API family, served by the provider of its package', () => {
    const family = fontsourceFamily(FAMILY);

    expect(family).toEqual({
      name: 'Sofia Sans',
      cssVariable: '--body',
      subsets: SUBSETS,
      styles: ['normal'],
      fallbacks: ['sans-serif'],
      provider: expect.objectContaining({
        name: 'fontsource-variable',
        config: { package: FAMILY.package },
      }) as unknown,
    });
  });

  it('refuses a subset or a style the package does not have, before any build step', () => {
    expect(() => fontsourceFamily({ ...FAMILY, subsets: ['latin', 'klingon'] })).toThrow(
      `${FAMILY.package} has no subset "klingon"`,
    );
    expect(() => fontsourceFamily({ ...FAMILY, styles: ['oblique'] })).toThrow(
      `${FAMILY.package} has no style "oblique"`,
    );
  });
});
