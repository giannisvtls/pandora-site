// `installers` (spec §2, P1-12): the full contract; the snapshot stays empty until real partner
// data exists. Name, postcode and phone are facts; the city is text.
import { z } from 'zod';

import { itemSchema } from './item';
import { idSchema, showIn, text, textValue, type Locale } from './primitives';

const installerShape = (source?: Locale) =>
  z.strictObject({
    id: idSchema,
    showIn,
    name: textValue,
    city: text(source),
    postcode: textValue,
    // ISO 3166-1 alpha-2, upper case: `GR`, `IT`, `AL`.
    country: z.string().regex(/^[A-Z]{2}$/u, 'Expected an ISO 3166-1 alpha-2 country code'),
    point: z.strictObject({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    // E.164: `+` and up to 15 digits.
    phone: z.string().regex(/^\+[1-9]\d{1,14}$/u, 'Expected an E.164 phone number'),
  });

export const installerSchema = itemSchema(installerShape);
export type Installer = z.infer<typeof installerSchema>;
