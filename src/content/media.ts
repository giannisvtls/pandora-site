// The media resolver (spec §5): a media id -> its image file as Astro processes it
// (`ImageMetadata`, what <Image> takes) and its alt text in a language. The files are every image
// under src/assets/media/, keyed by the contract's one media id rule (`mediaIdOf`), so an id and
// its file never disagree.
import type { ImageMetadata } from 'astro';

import { mediaIdOf, type Locale, type Media } from './contract';

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
// src/assets/media/ unless a test passes others). An id with no media item or no file is an
// error naming it, and so is a missing alt text: a built language has the alt of every image it
// shows (A3, the publish rules).
export function createMediaResolver(
  media: readonly Media[],
  files: MediaFiles = MEDIA_FILES,
): MediaResolver {
  const items = new Map(media.map((item) => [item.id, item]));
  const images = new Map(
    Object.entries(files).map(([path, image]) => [mediaIdOf(path.replace(/^\//u, '')), image]),
  );
  return (id, locale) => {
    const item = items.get(id);
    const src = images.get(id);
    if (item === undefined || src === undefined) {
      throw new Error(
        item === undefined
          ? `Unknown media id "${id}": no media item has it`
          : `Unknown media id "${id}": no image file under src/assets/media/ has it`,
      );
    }
    if (item.decorative === true) return { src, alt: '' };
    const alt = item.alt?.[locale];
    if (alt === undefined) throw new Error(`The media "${id}" has no alt text in "${locale}"`);
    return { src, alt };
  };
}
