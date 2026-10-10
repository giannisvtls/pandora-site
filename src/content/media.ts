// The media resolver (spec §5): a media id -> its image file as Astro processes it
// (`ImageMetadata`, what <Image> takes) and its alt text in a language. The files are every image
// under src/assets/media/, keyed by their path; a media item names its own file (`file`), so two
// files that would share an id (`car.png` beside `car.webp`) never stand in for each other.
import type { ImageMetadata } from 'astro';

import type { Locale, Media } from './contract';

// Image files by their path from the project root (`/src/assets/media/pricelist/acc-band.png`).
export type MediaFiles = Readonly<Record<string, ImageMetadata>>;

// Every file under src/assets/media/ but the fetch manifest, imported when the module loads.
export const MEDIA_FILES: MediaFiles = import.meta.glob<ImageMetadata>(
  ['/src/assets/media/**/*', '!/src/assets/media/manifest.json'],
  { eager: true, import: 'default' },
);

export interface ResolvedImage {
  readonly src: ImageMetadata;
  // Empty for a decorative image (A3).
  readonly alt: string;
}

export type MediaResolver = (id: string, locale: Locale) => ResolvedImage;

// Resolves the media items of `media` to their files (`files`: every image under
// src/assets/media/ unless a test passes others), each through the item's own `file`. An id with
// no media item is an error naming it, an item whose file is missing one naming the item and the
// file, and so is a missing alt text: a built language has the alt of every image it shows (A3,
// the publish rules).
export function createMediaResolver(
  media: readonly Media[],
  files: MediaFiles = MEDIA_FILES,
): MediaResolver {
  const items = new Map(media.map((item) => [item.id, item]));
  return (id, locale) => {
    const item = items.get(id);
    if (item === undefined) throw new Error(`Unknown media id "${id}": no media item has it`);
    const src = files[`/${item.file}`];
    if (src === undefined) {
      throw new Error(`The media "${id}" names the file ${item.file}, which is not on disk`);
    }
    if (item.decorative === true) return { src, alt: '' };
    const alt = item.alt?.[locale];
    if (alt === undefined) throw new Error(`The media "${id}" has no alt text in "${locale}"`);
    return { src, alt };
  };
}
