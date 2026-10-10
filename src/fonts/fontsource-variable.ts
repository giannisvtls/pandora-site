// A Fonts API provider (A12) for an installed `@fontsource-variable/*` package: the package's own
// woff2 files, weight range and unicode ranges, read from node_modules when the build starts, so
// the build never touches the network. Each face carries its subset, so `<Font preload>` can pick
// the latin one.
// The built-in providers fall short here: `npm` reads the package's CSS locally but rewrites every
// font file to its jsDelivr URL and downloads it, and `local` takes files but no subsets.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import type { AstroUserConfig, FontProvider } from 'astro';

// A family of astro.config.mjs `fonts`.
export type FontFamily = NonNullable<AstroUserConfig['fonts']>[number];
type FontStyle = NonNullable<FontFamily['styles']>[number];
type FontFace = NonNullable<Awaited<ReturnType<FontProvider['resolveFont']>>>['fonts'][number];

// What the package's metadata.json says about the font (the fields used here).
interface PackageMetadata {
  readonly id: string;
  readonly subsets: readonly string[];
  readonly styles: readonly string[];
  readonly variable: { readonly wght: { readonly min: string; readonly max: string } };
}

function readJson(dir: string, file: string): unknown {
  return JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
}

// `require` resolves packages from `root` (the project root), else from this file.
const requireFrom = (root?: URL) =>
  createRequire(root === undefined ? import.meta.url : new URL('package.json', root));

// The faces of `pkg` for `subsets` x `styles`: one woff2 file each, with the package's whole
// variable weight range and the subset's unicode range. A subset, a style or a file the package
// does not have is an error naming it.
function facesOf(
  require: ReturnType<typeof createRequire>,
  pkg: string,
  subsets: readonly string[],
  styles: readonly string[],
): FontFace[] {
  const dir = path.dirname(require.resolve(`${pkg}/package.json`));
  const metadata = readJson(dir, 'metadata.json') as PackageMetadata;
  const ranges = readJson(dir, 'unicode.json') as Readonly<Record<string, string>>;
  const { min, max } = metadata.variable.wght;
  return subsets.flatMap((subset) =>
    styles.map((style) => {
      const range = ranges[subset];
      if (range === undefined || !metadata.subsets.includes(subset)) {
        throw new Error(`${pkg} has no subset "${subset}"`);
      }
      if (!metadata.styles.includes(style)) throw new Error(`${pkg} has no style "${style}"`);
      const file = path.join(dir, 'files', `${metadata.id}-${subset}-wght-${style}.woff2`);
      if (!existsSync(file)) throw new Error(`${pkg} has no file ${path.basename(file)}`);
      return {
        src: [{ url: file, format: 'woff2' }],
        weight: `${min} ${max}`,
        style,
        unicodeRange: range.split(','),
        meta: { subset },
      };
    }),
  );
}

// `pkg` is the package name (`@fontsource-variable/sofia-sans`). The family's `subsets` and
// `styles` select the faces; the weight is the package's whole variable range.
// In a build, Astro catches an error this provider throws (a subset, a style or a file the package
// lacks), logs it, warns "No data found for font family" and goes on: the build exits 0 and the
// site ships without that family's fonts. So astro.config.mjs declares each family through
// `fontsourceFamily()`, which makes the same check when the config loads and stops the build.
export function fontsourceVariable(pkg: string): FontProvider {
  let require = requireFrom();
  return {
    name: 'fontsource-variable',
    // Two families must not share one provider: the provider's identity includes its config.
    config: { package: pkg },
    init: ({ root }) => {
      require = requireFrom(root);
    },
    resolveFont: ({ subsets, styles }) => ({ fonts: facesOf(require, pkg, subsets, styles) }),
  };
}

// A family of astro.config.mjs `fonts` served by `fontsourceVariable(package)`.
export interface FontsourceFamily {
  // The package name (`@fontsource-variable/sofia-sans`).
  readonly package: string;
  readonly name: string;
  readonly cssVariable: string;
  readonly subsets: [string, ...string[]];
  readonly styles: [FontStyle, ...FontStyle[]];
  readonly fallbacks: string[];
}

// Every family `fontsourceFamily()` has checked and returned. A unit test loads astro.config.mjs
// and requires each of its `fonts` to be one of them: a family declared with a bare provider
// would skip the check, and a missing file would again build without fonts.
export const CHECKED_FAMILIES = new WeakSet<FontFamily>();

// The Fonts API family for `family`, checked now: every subset and style it asks for has its file
// in the installed package (`root`: the project root, where node_modules is), else this throws
// naming what is missing. Called while astro.config.mjs loads, a throw stops `astro build` before
// it starts, where the provider's own error would only be logged.
export function fontsourceFamily(family: FontsourceFamily, root?: URL): FontFamily {
  const { package: pkg, ...rest } = family;
  facesOf(requireFrom(root), pkg, family.subsets, family.styles);
  const checked = { ...rest, provider: fontsourceVariable(pkg) };
  CHECKED_FAMILIES.add(checked);
  return checked;
}
