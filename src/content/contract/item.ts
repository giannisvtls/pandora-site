// Items (products, accessories, posts, FAQ, installers, nav sections) carry `showIn`, and its
// first entry is their source language (spec §2). A collection describes its item once, as a
// shape built for a given source language (see ./primitives); the item schema parses with no
// source first, then, only when that found nothing, checks the same item against the shape for
// its own `showIn[0]`, so a missing source value is reported once, at `field.<locale>`.
import type { z } from 'zod';

import { LOCALES, type Locale } from './primitives';

type ItemShape = (source?: Locale) => z.ZodType<{ readonly showIn: readonly Locale[] }>;

export function itemSchema<S extends ItemShape>(shape: S): ReturnType<S> {
  const bySource = new Map(LOCALES.map((locale) => [locale, shape(locale)]));
  return shape().superRefine(
    (item, context) => {
      const [source] = item.showIn;
      const result = source === undefined ? undefined : bySource.get(source)?.safeParse(item);
      const issues = result?.error?.issues ?? [];
      for (const issue of issues) {
        context.addIssue({ code: 'custom', path: issue.path, message: issue.message });
      }
    },
    // zod runs a refinement after issues that do not abort (a failed regex, say); the shape for
    // the source language would report those a second time.
    { when: (payload) => payload.issues.length === 0 },
  ) as ReturnType<S>;
}
