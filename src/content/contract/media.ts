// `media`: one item per image the content uses (spec §2). The file lives under src/assets/media/
// (written by `npm run media:fetch`, recorded in its manifest); `source` repeats the manifest's.
// Alt text is required in English unless the image is decorative, and a decorative image has
// none in any language (A3).
import { z } from 'zod';

import { FIXED_SOURCE, idSchema, text, textValue } from './primitives';

export const MEDIA_DIR = 'src/assets/media/';
const KEBAB = /^[a-z\d]+(?:-[a-z\d]+)*$/u;
const IMAGE_EXTENSIONS = new Set(['avif', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp']);

// The id of the media item for a file: its path under src/assets/media/ without the extension,
// `/` replaced by `-` (`pricelist/acc-band.png` -> `pricelist-acc-band`), since an id has no `/`.
// A name without an extension stays whole. The snapshot converter gives ids this way, and the
// snapshot integrity test checks every id against it.
export function mediaIdOf(file: string): string {
  if (!file.startsWith(MEDIA_DIR)) {
    throw new Error(`${file} is not under ${MEDIA_DIR}`);
  }
  return file
    .slice(MEDIA_DIR.length)
    .replace(/\.[^./]+$/u, '')
    .replaceAll('/', '-');
}

// `src/assets/media/<kebab-name>.<image extension>`, in kebab-case sub-folders or not (so never
// `..`).
export function isMediaFile(file: string): boolean {
  if (!file.startsWith(MEDIA_DIR)) {
    return false;
  }
  const segments = file.slice(MEDIA_DIR.length).split('/');
  const [stem = '', extension = '', ...rest] = (segments.pop() ?? '').split('.');
  return (
    rest.length === 0 &&
    IMAGE_EXTENSIONS.has(extension) &&
    [...segments, stem].every((segment) => KEBAB.test(segment))
  );
}

const httpsUrl = z.string().refine((value) => URL.parse(value)?.protocol === 'https:', {
  message: 'Expected an https:// URL',
});

export const mediaSourceSchema = z.union([
  z.strictObject({ url: httpsUrl }),
  z.strictObject({ designFile: textValue }),
]);

export const mediaSchema = z
  .strictObject({
    id: idSchema,
    file: z.string().refine(isMediaFile, {
      message: 'Expected a kebab-case image file under src/assets/media/',
    }),
    alt: text(FIXED_SOURCE).optional(),
    decorative: z.literal(true).optional(),
    source: mediaSourceSchema,
  })
  .superRefine((media, context) => {
    if (media.decorative === true && media.alt !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['alt'],
        message: 'A decorative image has no alt text',
      });
    }
    if (media.decorative === undefined && media.alt === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['alt', FIXED_SOURCE],
        message: `Required in the source language "${FIXED_SOURCE}" unless the image is decorative`,
      });
    }
  });
export type Media = z.infer<typeof mediaSchema>;
