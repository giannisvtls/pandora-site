// `faq` (spec §2): question and answer, both required in the source language.
import { z } from 'zod';

import { itemSchema } from './item';
import { idSchema, orderSchema, showIn, text, type Locale } from './primitives';

const faqShape = (source?: Locale) =>
  z.strictObject({
    id: idSchema,
    order: orderSchema,
    showIn,
    question: text(source),
    answer: text(source),
  });

export const faqSchema = itemSchema(faqShape);
export type Faq = z.infer<typeof faqSchema>;
