// `posts` (spec §2): blog posts with a slug per language and a date as precise as the source
// (A14).
import { z } from 'zod';

import { itemSchema } from './item';
import {
  idSchema,
  languageMap,
  mediaId,
  partialDate,
  showIn,
  slugSchema,
  text,
  type Locale,
} from './primitives';
import { localizedRichText } from './rich-text';

const postShape = (source?: Locale) =>
  z.strictObject({
    id: idSchema,
    showIn,
    slug: languageMap(slugSchema, source),
    category: z.enum(['news', 'tech']),
    date: partialDate,
    title: text(source),
    excerpt: text(source),
    body: localizedRichText(source),
    image: mediaId,
  });

export const postSchema = itemSchema(postShape);
export type Post = z.infer<typeof postSchema>;
