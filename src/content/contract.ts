// The content contract: the shape every content source must produce (roadmap §3). Plain `zod`,
// never astro:content's re-export, so the CMS can share these schemas later.
import { z } from 'zod';

export const LOCALES = ['en', 'el', 'it', 'sq'] as const;
export const localeSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof localeSchema>;

// One value per language; a language with no translation has no key (never English filler).
export const localizedText = z.partialRecord(localeSchema, z.string().min(1));

export const productSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    category: z.enum(['car', 'moto', 'camper', 'marine', 'fleet']),
    priceEur: z.number().int().positive(),
    // The first entry is the item's source language.
    showIn: z.array(localeSchema).min(1),
    name: localizedText,
    tag: localizedText,
    blurb: localizedText,
  })
  .superRefine((product, context) => {
    // Required text (roadmap §5): name and blurb must have a value in the source language.
    const [source] = product.showIn;
    if (source === undefined) return;
    for (const field of ['name', 'blurb'] as const) {
      if (product[field][source] === undefined) {
        context.addIssue({
          code: 'custom',
          path: [field, source],
          message: `Required in the source language "${source}" (showIn[0])`,
        });
      }
    }
  });
export type Product = z.infer<typeof productSchema>;
