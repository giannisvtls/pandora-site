// The item rule of spec §4: what a value lacks in a language, and so whether it is complete and
// visible there. It walks any value the contract shapes (an item, a fixed-key entry, a global)
// generically: a language map is an object keyed by languages only, and a media reference is a
// field the contract names for media. rules.ts re-exports it; pure, no Astro, no files.
import { FIXED_SOURCE, LOCALES, type Locale, type Media } from './contract';

export type MediaById = ReadonlyMap<string, Media>;

export function mediaById(media: readonly Media[]): MediaById {
  return new Map(media.map((item) => [item.id, item]));
}

// The source language of a value: `showIn[0]` for an item, English for a fixed-key entry or a
// global (spec §2).
export function sourceOf(value: object): Locale {
  const { showIn } = value as { readonly showIn?: readonly Locale[] };
  return showIn?.[0] ?? FIXED_SOURCE;
}

type Loose = Readonly<Record<string, unknown>>;

const isObject = (value: unknown): value is Loose =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const LANGUAGES: ReadonlySet<string> = new Set(LOCALES);

// A language map: an object keyed by languages only (a text, a rich-text body, a post's slugs).
const isLanguageMap = (value: Loose): boolean =>
  Object.keys(value).length > 0 && Object.keys(value).every((key) => LANGUAGES.has(key));

// The fields that hold media ids, wherever the contract has them: `image`, `installImage`,
// `photo` (the home proof rail), `gallery` (a list), and a rich-text image block's `media`. A
// unit test checks that this finds every reference the snapshot integrity test lists.
const MEDIA_FIELDS: ReadonlySet<string> = new Set(['image', 'installImage', 'photo', 'gallery']);

function mediaIdsAt(parent: Loose, key: string): string[] {
  const value = parent[key];
  const isMediaField = MEDIA_FIELDS.has(key) || (key === 'media' && parent.type === 'image');
  if (!isMediaField) return [];
  if (typeof value === 'string') return [value];
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
}

export interface Gaps {
  // Paths, relative to the value, of the language maps with a source value and none in the
  // language.
  readonly texts: string[];
  // `media.<id>.alt` for referenced media without alt text in the language, `media.<id>` for an id
  // with no media item; in the order found, possibly repeated.
  readonly media: string[];
}

interface Walk {
  readonly locale: Locale;
  readonly source: Locale;
  readonly media: MediaById;
  readonly gaps: Gaps;
}

function checkMedia(id: string, walk: Walk): void {
  const media = walk.media.get(id);
  if (media === undefined) {
    walk.gaps.media.push(`media.${id}`);
  } else if (media.decorative !== true && media.alt?.[walk.locale] === undefined) {
    walk.gaps.media.push(`media.${id}.alt`);
  }
}

function walkValue(value: unknown, path: readonly string[], walk: Walk): void {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) walkValue(item, [...path, String(index)], walk);
    return;
  }
  if (!isObject(value)) return;
  if (isLanguageMap(value)) {
    const local = value[walk.locale];
    if (local === undefined && value[walk.source] !== undefined) {
      walk.gaps.texts.push(path.join('.'));
    }
    // The rich text of the language can hold image blocks, whose media need alt text.
    walkValue(local, [...path, walk.locale], walk);
    return;
  }
  // A plural's `few` and `many` exist only in the languages that select them (spec §2).
  const isPlural = 'one' in value && 'other' in value;
  for (const [key, child] of Object.entries(value)) {
    if (isPlural && (key === 'few' || key === 'many')) continue;
    for (const id of mediaIdsAt(value, key)) checkMedia(id, walk);
    walkValue(child, [...path, key], walk);
  }
}

// What `value` lacks in `locale`, text and media apart.
export function gapsOf(value: object, locale: Locale, media: MediaById): Gaps {
  const gaps: Gaps = { texts: [], media: [] };
  walkValue(value, [], { locale, source: sourceOf(value), media, gaps });
  return gaps;
}

// What `value` (an item, a fixed-key entry or a global) lacks in `locale`: the path of every
// localized value (a text, a heading part, a template, a plural or byCount variant, rich text, a
// slug; in nested objects and lists too) that has a value in the source language but none in
// `locale`; then, once each, `media.<id>.alt` for every media item it refers to that is not
// decorative and has no alt text in `locale` (A3), or `media.<id>` when no such item exists. A
// plural's `few` and `many` never count.
export function gapsIn(value: object, locale: Locale, media: MediaById): string[] {
  const { texts, media: mediaGaps } = gapsOf(value, locale, media);
  return [...texts, ...new Set(mediaGaps)];
}

export function isComplete(value: object, locale: Locale, media: MediaById): boolean {
  return gapsIn(value, locale, media).length === 0;
}

// An item is visible in `locale` when `locale` is in its `showIn` and it is complete there. A
// fixed-key entry or a global has no `showIn`: it is visible wherever it is complete.
export function isVisible(value: object, locale: Locale, media: MediaById): boolean {
  const { showIn } = value as { readonly showIn?: readonly Locale[] };
  return (showIn?.includes(locale) ?? true) && isComplete(value, locale, media);
}
