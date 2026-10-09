// Contract primitives (spec §2 "Primitives"): languages, language maps, ids, dates and the
// templated text values Site copy uses. Plain `zod`, never astro:content's re-export.
//
// The source language: every language map an item carries must have a value in the item's source
// language (`showIn[0]` for items, `en` for media, fixed-key sets and globals). The builders take
// that language as `source`; without it they accept any languages, which is how an item is parsed
// before its `showIn` is known (see `itemSchema` in ./item).
import { z } from 'zod';

export const LOCALES = ['en', 'el', 'it', 'sq'] as const;
export const localeSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof localeSchema>;

// Each language's own name (endonym), shown as is in every language, never translated.
export const LANGUAGE_NAMES: Readonly<Record<Locale, string>> = {
  en: 'English',
  el: 'Ελληνικά',
  it: 'Italiano',
  sq: 'Shqip',
};

// The language of media items, fixed-key sets and globals.
export const FIXED_SOURCE: Locale = 'en';

// One text in one language: not empty, no leading or trailing whitespace (so a whitespace-only
// value is rejected). The check never rewrites the value.
export const textValue = z.string().refine((value) => value !== '' && value.trim() === value, {
  message: 'Expected text that is not empty and has no leading or trailing whitespace',
});

// One value per language; a language with no translation has no key (never English filler).
export const localizedText = z.partialRecord(localeSchema, textValue);
export type LocalizedText = z.infer<typeof localizedText>;

// The issue a language map without a value in its source language gets; its path ends in the
// locale, so a loader error reads `name.en`.
function requireSource(
  value: Partial<Record<Locale, unknown>>,
  source: Locale,
  context: z.RefinementCtx,
): void {
  if (value[source] === undefined) {
    context.addIssue({
      code: 'custom',
      path: [source],
      message: `Required in the source language "${source}"`,
    });
  }
}

// A language map of `value`s, with a value in `source` when one is given.
export function languageMap<T extends z.ZodType>(value: T, source?: Locale) {
  const map = z.partialRecord(localeSchema, value);
  return source === undefined
    ? map
    : map.superRefine((languages, context) => {
        requireSource(languages, source, context);
      });
}

// Localized text, with a value in `source` when one is given.
export function text(source?: Locale) {
  return languageMap(textValue, source);
}

// `{name}` placeholders, in order of appearance.
const PLACEHOLDER = /\{([A-Za-z]\w*)\}/gu;

export function placeholdersOf(value: string): string[] {
  return value
    .matchAll(PLACEHOLDER)
    .map((match) => match[1] ?? '')
    .toArray();
}

// A `{` or `}` that is not part of a `{name}` placeholder (`{ count }`, `{{count}}`, a lone
// brace): nothing would fill it, so it would show as is.
export function hasStrayBrace(value: string): boolean {
  return /[{}]/u.test(value.replaceAll(PLACEHOLDER, ''));
}

// What is wrong with the placeholders of one value, or null.
function placeholderProblem(declared: ReadonlySet<string>, value: string): string | null {
  const used = new Set(placeholdersOf(value));
  const parts = [
    ...[...declared.difference(used)].map((name) => `missing {${name}}`),
    ...[...used.difference(declared)].map((name) => `unknown {${name}}`),
    ...(hasStrayBrace(value) ? ['a { or } outside a {name} placeholder'] : []),
  ];
  return parts.length === 0
    ? null
    : `Placeholders must be exactly ${describePlaceholders(declared)}: ${parts.join(', ')}`;
}

// Localized text whose every value uses exactly the declared `{name}` placeholders: none missing,
// none extra, no other brace (checked per language; one may repeat).
export function template(placeholders: readonly string[], source?: Locale) {
  const declared = new Set(placeholders);
  return text(source).superRefine((languages, context) => {
    for (const [locale, value] of Object.entries(languages)) {
      const problem = placeholderProblem(declared, value);
      if (problem !== null) {
        context.addIssue({ code: 'custom', path: [locale], message: problem });
      }
    }
  });
}

function describePlaceholders(placeholders: ReadonlySet<string>): string {
  return placeholders.size === 0
    ? 'none'
    : placeholders
        .values()
        .map((name) => `{${name}}`)
        .toArray()
        .join(' ');
}

// Count-dependent text, chosen per language with Intl.PluralRules: `one` and `other` always,
// `few` and `many` for languages that use them. Every variant is a template. Only `one` and
// `other` need the source language: `few` and `many` exist only in the languages whose plural
// rules select them (an Italian `many`, say, has no English counterpart).
export function plural(placeholders: readonly string[], source?: Locale) {
  const always = template(placeholders, source);
  const perLanguage = template(placeholders);
  return z.strictObject({
    one: always,
    other: always,
    few: perLanguage.optional(),
    many: perLanguage.optional(),
  });
}

// Explicit variants for a count of 2, 3 or 4 ("Both", "All three", "All four"); every variant
// is a template.
export function byCount(placeholders: readonly string[], source?: Locale) {
  const variant = template(placeholders, source);
  return z.strictObject({ '2': variant, '3': variant, '4': variant });
}

// An h1/h2: `lead <span class="b">payload</span>`; the payload is optional.
export function heading(source?: Locale) {
  return z.strictObject({ lead: text(source), payload: text(source).optional() });
}

// `YYYY`, `YYYY-MM` or `YYYY-MM-DD`, as precise as the source knows; a real calendar date.
const PARTIAL_DATE = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/u;

export function isPartialDate(value: string): boolean {
  const match = PARTIAL_DATE.exec(value);
  if (match === null) {
    return false;
  }
  const [, year = '', month, day] = match;
  const monthNumber = month === undefined ? 1 : Number(month);
  if (monthNumber < 1 || monthNumber > 12) {
    return false;
  }
  if (day === undefined) {
    return true;
  }
  const date = new Date(0);
  date.setUTCFullYear(Number(year), monthNumber - 1, Number(day));
  return date.getUTCMonth() === monthNumber - 1 && date.getUTCDate() === Number(day);
}

export const partialDate = z.string().refine(isPartialDate, {
  message: 'Expected YYYY, YYYY-MM or YYYY-MM-DD, a real calendar date',
});

// Lower-case ASCII letters, digits and hyphens.
export const idSchema = z.string().regex(/^[a-z\d-]+$/u, 'Expected an id: a-z, 0-9 and -');

// The id of a `media` item (that it exists is the snapshot integrity test's check).
export const mediaId = idSchema;

// The id of a `products` item (that it exists is the snapshot integrity test's check).
export const productId = idSchema;

// An ASCII kebab-case URL segment: `elite-v3`.
export const slugSchema = z
  .string()
  .regex(/^[a-z\d]+(?:-[a-z\d]+)*$/u, 'Expected a slug: a-z and 0-9 words joined by -');

// A position in a list.
export const orderSchema = z.int().nonnegative();

// A list whose entries are all different; a repeated entry is reported at its index.
export function uniqueList<T extends z.ZodType<string>>(entry: T, min = 0) {
  return z
    .array(entry)
    .min(min)
    .superRefine((list, context) => {
      const seen = new Set<string>();
      for (const [index, value] of list.entries()) {
        if (seen.has(value)) {
          context.addIssue({
            code: 'custom',
            path: [index],
            message: `"${value}" appears more than once`,
          });
        }
        seen.add(value);
      }
    });
}

// The languages an item is shown in, at least one, each once; the first is its source language.
export const showIn = uniqueList(localeSchema, 1);
