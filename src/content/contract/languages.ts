// The Languages global (spec §2 "Globals"): whether each language is live. The build renders
// the live languages (preview renders all four); the switcher lists only live ones (P1-5).
import { z } from 'zod';

import { localeSchema } from './primitives';

// Every one of the four languages, none missing and none extra.
export const languagesSchema = z.record(localeSchema, z.strictObject({ live: z.boolean() }));
export type Languages = z.infer<typeof languagesSchema>;
