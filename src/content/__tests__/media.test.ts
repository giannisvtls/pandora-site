// The media resolver (spec §5) on the committed media: a media id gives the image as Astro
// processes it and its alt text in a language, always through the item's own file; an unknown id
// is an error naming it. Vitest runs through Astro's Vite config, so the image imports give real
// `ImageMetadata` (`src`, `width`, `height`, `format`; `src` is a dev-server URL here, a hashed
// `/_astro/` file in the build).
import { readdirSync } from 'node:fs';
import path from 'node:path';

import type { ImageMetadata } from 'astro';
import { describe, expect, it } from 'vitest';

import { byCodeUnit } from '../../../scripts/crawl/output';
import { REPO_ROOT } from '../../../scripts/snapshot/paths';
import { createMediaResolver, MEDIA_FILES, type MediaFiles } from '../media';
import { createQuery } from '../query';
import { snapshot } from './rules-fixtures';

const resolve = createMediaResolver(snapshot.media);

function mediaOf(id: string) {
  const item = snapshot.media.find((candidate) => candidate.id === id);
  if (item === undefined) throw new Error(`no media ${id}`);
  return item;
}

// A stand-in for an imported image, told apart by its file.
const fakeImage = (file: string) =>
  ({ src: `/${file}`, width: 1, height: 1, format: 'webp' }) satisfies ImageMetadata;

// Every image file under src/assets/media/ on disk, as the glob keys them.
function imageFilesOnDisk(): string[] {
  const root = path.join(REPO_ROOT, 'src', 'assets', 'media');
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name !== 'manifest.json')
    .map((entry) => path.relative(REPO_ROOT, path.join(entry.parentPath, entry.name)))
    .map((file) => `/${file.replaceAll('\\', '/')}`);
}

describe('the media resolver', () => {
  it('gives ImageMetadata and the alt text of a known id', () => {
    const image = resolve('pandora-elite-v3-package', 'en');

    expect(image.src).toEqual({
      src: expect.stringContaining('pandora-elite-v3-package.webp'),
      width: expect.any(Number),
      height: expect.any(Number),
      format: 'webp',
    });
    expect(image.src.width).toBeGreaterThan(0);
    expect(image.alt).toBe(mediaOf('pandora-elite-v3-package').alt?.en);
  });

  it('resolves a file in a sub-folder (pricelist/acc-band.png)', () => {
    expect(resolve('pricelist-acc-band', 'en').src).toMatchObject({ format: 'png' });
  });

  it('resolves every media item of the snapshot', () => {
    for (const { id } of snapshot.media) {
      expect(resolve(id, 'en').src.height, id).toBeGreaterThan(0);
    }
  });

  it('gives a decorative image an empty alt', () => {
    expect(mediaOf('car').decorative).toBe(true);
    expect(resolve('car', 'en').alt).toBe('');
    expect(resolve('car', 'el').alt).toBe('');
  });

  it('throws for an unknown id, naming it', () => {
    expect(() => resolve('nope', 'en')).toThrow('Unknown media id "nope": no media item has it');
  });

  it('throws for an item whose file is missing, naming the item and the file', () => {
    const withoutFiles = createMediaResolver(snapshot.media, {} satisfies MediaFiles);

    expect(() => withoutFiles('car', 'en')).toThrow(
      `The media "car" names the file ${mediaOf('car').file}, which is not on disk`,
    );
  });

  // Two files whose names give one media id: the item's own `file` decides, whatever order the
  // glob lists them in.
  it.each([
    ['car', 'src/assets/media/car.webp', 'src/assets/media/car.png'],
    [
      'pricelist-acc-band',
      'src/assets/media/pricelist/acc-band.png',
      'src/assets/media/pricelist-acc-band.webp',
    ],
  ])('resolves %s through its own file, never a namesake', (id, own, namesake) => {
    const item = { ...mediaOf(id), file: own };
    const ownImage = fakeImage(own);
    const namesakeImage = fakeImage(namesake);
    const orders: MediaFiles[] = [
      { [`/${own}`]: ownImage, [`/${namesake}`]: namesakeImage },
      { [`/${namesake}`]: namesakeImage, [`/${own}`]: ownImage },
    ];

    for (const files of orders) {
      expect(createMediaResolver([item], files)(id, 'en').src).toBe(ownImage);
    }
  });

  it('throws when the image has no alt text in the language', () => {
    expect(() => resolve('pandora-elite-v3-package', 'el')).toThrow(
      'The media "pandora-elite-v3-package" has no alt text in "el"',
    );
  });

  it('takes every image file under src/assets/media/, never the fetch manifest', () => {
    expect(Object.keys(MEDIA_FILES).toSorted(byCodeUnit)).toEqual(
      imageFilesOnDisk().toSorted(byCodeUnit),
    );
  });

  it("is the query module's image()", () => {
    const query = createQuery(snapshot, { preview: false });

    expect(query.image('pandora-elite-v3-package', 'en')).toEqual(
      resolve('pandora-elite-v3-package', 'en'),
    );
  });
});
