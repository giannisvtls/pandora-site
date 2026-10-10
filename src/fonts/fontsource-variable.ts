// A Fonts API provider (A12) for an installed `@fontsource-variable/*` package: the package's own
// woff2 files, weight range and unicode ranges, read from node_modules when the build starts, so
// the build never touches the network. Each face carries its subset, so `<Font preload>` can pick
// the latin one.
// The built-in providers fall short here: `npm` reads the package's CSS locally but rewrites every
// font file to its jsDelivr URL and downloads it, and `local` takes files but no subsets.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import type { FontProvider } from 'astro';

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

// `pkg` is the package name (`@fontsource-variable/sofia-sans`). The family's `subsets` and
// `styles` select the faces; the weight is the package's whole variable range. A subset, a style
// or a file the package does not have is an error naming it.
export function fontsourceVariable(pkg: string): FontProvider {
  let require = createRequire(import.meta.url);
  return {
    name: 'fontsource-variable',
    // Two families must not share one provider: the provider's identity includes its config.
    config: { package: pkg },
    init: ({ root }) => {
      require = createRequire(new URL('package.json', root));
    },
    resolveFont: ({ subsets, styles }) => {
      const dir = path.dirname(require.resolve(`${pkg}/package.json`));
      const metadata = readJson(dir, 'metadata.json') as PackageMetadata;
      const ranges = readJson(dir, 'unicode.json') as Readonly<Record<string, string>>;
      const { min, max } = metadata.variable.wght;
      const fonts = subsets.flatMap((subset) =>
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
      return { fonts };
    },
  };
}
