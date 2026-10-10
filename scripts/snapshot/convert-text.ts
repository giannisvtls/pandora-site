// The snapshot converter's small rules: slugs (A17), partial dates (A14) and the language maps it
// builds from the prototype's English and Greek. Media ids come from the contract (`mediaIdOf`).
import type { LocalizedText } from '../../src/content/contract';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// An ASCII kebab-case slug of an English text (A17): accents and apostrophes dropped, every other
// run of characters that are not a-z or 0-9 a hyphen ("Smart Pro V4 FD" -> `smart-pro-v4-fd`).
export function slugOf(text: string): string {
  const apostrophes = new RegExp(`['${String.fromCodePoint(0x20_19)}]`, 'gu');
  const slug = text
    .normalize('NFKD')
    .replaceAll(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll(apostrophes, '')
    .split(/[^a-z\d]+/u)
    .filter((part) => part !== '')
    .join('-');
  if (slug === '') {
    throw new Error(`"${text}" gives an empty slug`);
  }
  return slug;
}

// `Feb` -> `02`; undefined for anything else.
function monthNumber(name: string): string | undefined {
  const index = MONTHS.indexOf(name);
  return index === -1 ? undefined : String(index + 1).padStart(2, '0');
}

// A prototype date ("Feb 11, 2026", "Jan 2026", "2025") as a partial ISO date, as precise as the
// source (A14); undefined for any other form.
export function partialDateOf(source: string): string | undefined {
  const day = /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/u.exec(source);
  if (day !== null) {
    const [, name = '', date = '', year = ''] = day;
    const month = monthNumber(name);
    return month === undefined ? undefined : `${year}-${month}-${date.padStart(2, '0')}`;
  }
  const monthOnly = /^([A-Z][a-z]{2}) (\d{4})$/u.exec(source);
  if (monthOnly !== null) {
    const [, name = '', year = ''] = monthOnly;
    const month = monthNumber(name);
    return month === undefined ? undefined : `${year}-${month}`;
  }
  return /^\d{4}$/u.test(source) ? source : undefined;
}

export const english = (value: string): LocalizedText => ({ en: value });

// English, plus Greek when the data has it.
export function englishAndGreek(value: string, greek?: string): LocalizedText {
  return greek === undefined ? { en: value } : { en: value, el: greek };
}

// An optional English text: absent when the data's value is missing or empty.
export function englishIfAny(value: string | undefined): LocalizedText | undefined {
  return value === undefined || value === '' ? undefined : english(value);
}

// `value`, or an error naming what the prototype data lacks.
export function required<T>(value: T | undefined, at: string): T {
  if (value === undefined) {
    throw new Error(`${at} is missing in the prototype data`);
  }
  return value;
}

// One line per zod issue: the field path and the message.
export function issueLines(issues: readonly { path: PropertyKey[]; message: string }[]): string {
  return issues
    .map((issue) => {
      const field = issue.path.map(String).join('.');
      return `${field === '' ? '(item)' : field}: ${issue.message}`;
    })
    .join('\n  ');
}

// The object without its keys whose value is undefined (an absent optional field has no key).
export function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}
