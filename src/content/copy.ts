// Reading Site copy in a page's language. A built language has every Site copy value (the
// readiness check), so a missing one is a bug and an error naming the field; a template is filled
// only through its declared `{name}` placeholders, never by joining fragments in code's own order;
// a counted text takes the form the language's plural rules pick, else `other`.
import type { Locale, LocalizedText } from './contract';

// The value of `text` in `locale`; `field` names it in the error (`siteCopyCommon.skipLink`).
export function textIn(text: LocalizedText | undefined, locale: Locale, field: string): string {
  const value = text?.[locale];
  if (value === undefined) throw new Error(`${field} has no "${locale}" text`);
  return value;
}

// `template` with each `{name}` replaced by `values[name]`; a placeholder without a value is an
// error naming it.
export function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replaceAll(/\{([A-Za-z]\w*)\}/gu, (_match, name: string) => {
    const value = Object.hasOwn(values, name) ? values[name] : undefined;
    if (value === undefined) throw new Error(`No value for {${name}} in "${template}"`);
    return value;
  });
}

// A counted Site copy text (the contract's `plural`): `one` and `other`, plus `few` and `many` in
// the languages whose plural rules select them.
export interface PluralText {
  readonly one: LocalizedText;
  readonly other: LocalizedText;
  readonly few?: LocalizedText | undefined;
  readonly many?: LocalizedText | undefined;
}

// The plural categories the contract has a field for, besides `other`.
const FORMS: ReadonlySet<string> = new Set(['one', 'few', 'many']);

const isForm = (category: string): category is 'one' | 'few' | 'many' => FORMS.has(category);

// The form of `text` that `values.count` selects in `locale` (Intl.PluralRules), with `{count}`
// filled with the number as the language writes it and every other placeholder from `values`. A
// form the language lacks (a `few` or `many` nobody wrote, or a category the contract has no field
// for) falls back to `other`.
export function pluralIn(
  text: PluralText,
  locale: Locale,
  field: string,
  values: { readonly count: number; readonly [name: string]: string | number },
): string {
  const { count, ...rest } = values;
  const category = new Intl.PluralRules(locale).select(count);
  const form = isForm(category) ? text[category]?.[locale] : undefined;
  const template = form ?? textIn(text.other, locale, `${field}.other`);
  const filled = Object.fromEntries(
    Object.entries(rest).map(([name, value]) => [name, String(value)]),
  );
  return fill(template, { ...filled, count: new Intl.NumberFormat(locale).format(count) });
}
