// Small Markdown and counting helpers for the crawl summary (summary-render.ts). Everything is
// deterministic: keys sort by code unit, so CRAWL.md never depends on a locale or a run order.
import { PAGE_TYPES, type PageType } from './classify';
import { byCodeUnit } from './output';

// Shown for a missing value (no `<html lang>`, no language, no status).
export const NONE = '(none)';

export type Align = 'left' | 'right';

// A GFM table cell: a `|` would end the cell, so it is escaped (also inside a code span).
function cell(text: string): string {
  return text.replaceAll('|', String.raw`\|`);
}

function tableLine(cells: readonly string[]): string {
  return `| ${cells.map((text) => cell(text)).join(' | ')} |`;
}

// A GFM table; `align` marks the numeric columns right-aligned.
export function table(
  header: readonly string[],
  rows: readonly (readonly string[])[],
  align: readonly Align[] = [],
): string {
  const rule = header.map((_, index) => (align[index] === 'right' ? '---:' : '---'));
  const lines = [
    tableLine(header),
    `| ${rule.join(' | ')} |`,
    ...rows.map((row) => tableLine(row)),
  ];
  return lines.join('\n');
}

// A code span that survives backticks in the text (a longer fence, padded when needed).
export function code(text: string): string {
  const runs = text.match(/`+/g) ?? [];
  const fence = '`'.repeat(Math.max(0, ...runs.map((run) => run.length)) + 1);
  const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : '';
  return `${fence}${pad}${text}${pad}${fence}`;
}

// A bullet list, or the fallback line when there is nothing to list.
export function bullets(items: readonly string[], fallback = 'None.'): string {
  return items.length === 0 ? fallback : items.map((item) => `- ${item}`).join('\n');
}

// Counts per key; null keys count as NONE.
export function tally<T>(
  items: readonly T[],
  keyOf: (item: T) => string | null,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item) ?? NONE;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

// Languages in the site's order (el, en, it, sq), then any other by code unit, NONE last.
const LANG_ORDER = ['el', 'en', 'it', 'sq'];

function langRank(lang: string): number {
  const index = LANG_ORDER.indexOf(lang);
  if (index !== -1) {
    return index;
  }
  return lang === NONE ? LANG_ORDER.length + 1 : LANG_ORDER.length;
}

export function byLang(a: string, b: string): number {
  return langRank(a) - langRank(b) || byCodeUnit(a, b);
}

// The keys of a tally by code unit.
export function sortedKeys(counts: ReadonlyMap<string, number>): string[] {
  return counts.keys().toArray().toSorted(byCodeUnit);
}

export function sortedLangs(langs: Iterable<string>): string[] {
  return [...new Set(langs)].toSorted(byLang);
}

// Page types in classify.ts order, keeping only those present.
export function presentPageTypes(types: Iterable<PageType>): PageType[] {
  const present = new Set(types);
  return PAGE_TYPES.filter((type) => present.has(type));
}

// `el 3, en 2` from a tally, in language order; NONE when empty.
export function langBreakdown(counts: ReadonlyMap<string, number>): string {
  const parts = sortedLangs(counts.keys()).map(
    (lang) => `${lang} ${String(counts.get(lang) ?? 0)}`,
  );
  return parts.length === 0 ? NONE : parts.join(', ');
}

// `a 3, b 2` from a tally, keys by code unit.
export function breakdown(counts: ReadonlyMap<string, number>): string {
  const keys = sortedKeys(counts);
  return keys.length === 0
    ? NONE
    : keys.map((key) => `${key} ${String(counts.get(key))}`).join(', ');
}

export function plural(count: number, one: string, many: string): string {
  return `${String(count)} ${count === 1 ? one : many}`;
}
