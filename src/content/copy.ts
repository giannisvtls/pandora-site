// Reading Site copy in a page's language. A built language has every Site copy value (the
// readiness check), so a missing one is a bug and an error naming the field; a template is filled
// only through its declared `{name}` placeholders, never by joining fragments in code's own order.
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
