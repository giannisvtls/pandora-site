// The media the converted content refers to: each image the data names (a URL or a design file)
// is looked up in the media manifest, becomes a media id, and keeps every use, from which its alt
// text follows (alt-text.ts).
import type { MediaUse } from './alt-text';
import { MEDIA_DIR, mediaIdOf } from './convert-text';
import type { PrototypeData } from './prototype';
import { byCodeUnit } from '../crawl/output';

// A media file as the manifest records it (src/assets/media/manifest.json).
export interface ManifestEntry {
  readonly file: string;
  readonly source: { readonly url: string } | { readonly designFile: string };
}

// A car of the home proof rail (Site copy `siteCopyHome.proof.shots`); `photo` is a media id.
export interface ProofShot {
  readonly car: string;
  readonly caption: string;
  readonly photo: string;
}

// Every media file the content refers to, with each use.
export class MediaRefs {
  readonly #fileBySource = new Map<string, string>();
  readonly #fileById = new Map<string, string>();
  readonly #uses = new Map<string, MediaUse[]>();
  readonly #referenced = new Set<string>();

  constructor(manifest: readonly ManifestEntry[]) {
    for (const { file, source } of manifest) {
      if (!file.startsWith(MEDIA_DIR)) continue;
      this.#fileBySource.set('url' in source ? source.url : source.designFile, file);
      this.#fileById.set(mediaIdOf(file), file);
    }
  }

  #fileOf(source: string, at: string): string {
    const file = this.#fileBySource.get(source);
    if (file === undefined) {
      throw new Error(`${at}: ${source} is not in the media manifest`);
    }
    return file;
  }

  #add(file: string, use: MediaUse): void {
    this.#uses.set(file, [...(this.#uses.get(file) ?? []), use]);
  }

  // The media id of the image at `source` (a URL or a design file), recorded with its use.
  ref(source: string, use: MediaUse): string {
    const file = this.#fileOf(source, use.at);
    this.#add(file, use);
    this.#referenced.add(file);
    return mediaIdOf(file);
  }

  // Records a use of a media item the content names by id (Site copy).
  refId(id: string, use: MediaUse): void {
    const file = this.#fileById.get(id);
    if (file === undefined) {
      throw new Error(`${use.at}: media ${id} is not in the media manifest`);
    }
    this.#add(file, use);
    this.#referenced.add(file);
  }

  // Records a use that makes no reference of its own (the hero poster: it only makes its file
  // decorative wherever the content uses that file).
  mark(source: string, use: MediaUse): void {
    this.#add(this.#fileOf(source, use.at), use);
  }

  // The referenced files with their uses, by file path (code-unit order).
  items(manifest: readonly ManifestEntry[]) {
    return manifest
      .filter(({ file }) => this.#referenced.has(file))
      .toSorted((a, b) => byCodeUnit(a.file, b.file))
      .map((entry) => ({ entry, uses: this.#uses.get(entry.file) ?? [] }));
  }
}

export interface PhotoUses {
  // An installation photo: the car from `proofImg`, the system its product.
  readonly install: (url: string, product: string, at: string) => MediaUse;
  // A post's stand-in photo: the car from `proofImg`, the system from the `vehicles` list.
  readonly post: (url: string, at: string) => MediaUse;
}

// The uses of photos whose car the data names: `proofImg` maps a car to its photo, and the
// `vehicles` list names each car's system. Any other photo has no pattern.
export function photoUses(data: PrototypeData): PhotoUses {
  const carByUrl = new Map(Object.entries(data.proofImg).map(([car, url]) => [url, car]));
  const systemByCar = new Map(data.vehicles.map(({ car, system }) => [car, system]));
  return {
    install: (url, product, at) => {
      const car = carByUrl.get(url);
      return car === undefined
        ? { role: 'other', at }
        : { role: 'photo', at, car, system: product };
    },
    post: (url, at) => {
      const car = carByUrl.get(url);
      const system = car === undefined ? undefined : systemByCar.get(car);
      return car === undefined || system === undefined
        ? { role: 'other', at }
        : { role: 'photo', at, car, system: system.replace(/^Pandora /u, '') };
    },
  };
}
