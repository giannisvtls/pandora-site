// Site copy of the home page (spec §2 "Globals", A5): its own title and meta description, the
// hero, the 02:14 log, the picker, the street proof rail, the installers band and the news
// section. English is the source language.
import { z } from 'zod';

import { levelId } from './keys';
import { mediaId, textValue } from './primitives';
import { copy, copyHeading } from './site-copy-parts';

// One second of the 02:14 night: the time (a fact), the event tag, a bold title and the rest
// of the sentence, then either a level tag or a free tag ("Tracking"). The title and the text
// are joined by a space, or by nothing when the text starts with punctuation (", and so is …").
const logRow = z
  .strictObject({
    time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/u, 'Expected a time like 02:14:07'),
    event: copy(),
    title: copy(),
    text: copy(),
    level: levelId.optional(),
    tag: copy().optional(),
  })
  .refine((row) => (row.level === undefined) !== (row.tag === undefined), {
    message: 'A log row has either a level or a tag',
    path: ['level'],
  });

// A car on the street: its name and the caption are facts, the photo a media item.
const proofShot = z.strictObject({ car: textValue, caption: textValue, photo: mediaId });

// The hero's demo readout: the system (a fact), its state, a place and the "demo" tag; the time
// is the visitor's clock.
const readout = z.strictObject({
  system: textValue,
  status: copy(),
  place: copy(),
  demo: copy(),
});

export const siteCopyHomeSchema = z.strictObject({
  // The home page's <title> and meta description (A5).
  title: copy(),
  metaDescription: copy(),
  hero: z.strictObject({
    // The hero section's accessible name.
    label: copy(),
    heading: copyHeading(),
    readout,
    cta: copy(),
  }),
  log: z.strictObject({
    heading: copyHeading(),
    intro: copy(),
    rows: z.array(logRow).min(1),
  }),
  // The picker: three Finder picks per vehicle.
  picker: z.strictObject({ heading: copyHeading(), note: copy() }),
  proof: z.strictObject({ heading: copyHeading(), shots: z.array(proofShot).min(1) }),
  // The installers band; `headingEnd` is the heading's second line, after the highlight.
  band: z.strictObject({
    heading: copyHeading(),
    headingEnd: copy(),
    text: copy(),
    findInstaller: copy(),
  }),
  news: z.strictObject({ heading: copyHeading(), all: copy() }),
});
export type SiteCopyHome = z.infer<typeof siteCopyHomeSchema>;
