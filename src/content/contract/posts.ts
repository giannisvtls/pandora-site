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
    // Absent when the post has none: the list row then shows the title alone (user decision
    // 2026-10-09). When present it needs the source language like every text.
    excerpt: text(source).optional(),
    body: localizedRichText(source),
    image: mediaId,
  });

export const postSchema = itemSchema(postShape);
export type Post = z.infer<typeof postSchema>;
