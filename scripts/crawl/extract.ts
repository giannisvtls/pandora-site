// Reads the few things the crawl needs from an HTML page: <html lang>, <title>, the canonical and
// hreflang <link>s, <meta name="robots"> and the <a href> targets. A small tag scanner is enough
// for that: it skips comments and the contents of <script>/<style>/<textarea>, reads quoted,
// single-quoted and unquoted attributes (a `>` inside quotes included), and decodes character
// references. URLs are kept exactly as written (percent-escapes are never re-encoded or decoded);
// only a relative URL is resolved against the page.
import { decodeEntities } from './entities';

export interface HtmlTag {
  readonly name: string;
  readonly isClosing: boolean;
  readonly attributes: ReadonlyMap<string, string>;
  // Raw text up to the matching end tag, for <title> only.
  readonly text?: string;
}

const TOKEN = /<!--|<(\/?)([a-z][a-z\d:-]*)/gi;
const ATTRIBUTE_NAME = /[^\s"'<>/=]+/y;
const ATTRIBUTE_VALUE = /\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/y;
const SKIPPED_TEXT = new Set(['script', 'style', 'textarea']);
const END_TAGS = new Map(
  ['script', 'style', 'textarea', 'title'].map((name) => [
    name,
    new RegExp(String.raw`</${name}\s*>`, 'gi'),
  ]),
);

// Reads one attribute at `index` into `attributes` (the first of a repeated name wins) and returns
// the index after it.
function readAttribute(html: string, index: number, attributes: Map<string, string>): number {
  ATTRIBUTE_NAME.lastIndex = index;
  const name = ATTRIBUTE_NAME.exec(html)?.[0];
  if (name === undefined) {
    return index + 1;
  }
  const afterName = ATTRIBUTE_NAME.lastIndex;
  ATTRIBUTE_VALUE.lastIndex = afterName;
  const value = ATTRIBUTE_VALUE.exec(html);
  const key = name.toLowerCase();
  if (!attributes.has(key)) {
    attributes.set(key, decodeEntities(value?.[1] ?? value?.[2] ?? value?.[3] ?? ''));
  }
  return value === null ? afterName : ATTRIBUTE_VALUE.lastIndex;
}

function readAttributes(
  html: string,
  from: number,
): { attributes: Map<string, string>; end: number } {
  const attributes = new Map<string, string>();
  let index = from;
  while (index < html.length) {
    const char = html.charAt(index);
    if (char === '>') {
      return { attributes, end: index + 1 };
    }
    index = /[\s/]/.test(char) ? index + 1 : readAttribute(html, index, attributes);
  }
  return { attributes, end: html.length };
}

// The text of a raw-text element and the index just past its end tag.
function readRawText(html: string, name: string, from: number): { text: string; end: number } {
  const endTag = END_TAGS.get(name);
  if (endTag === undefined) {
    return { text: '', end: from };
  }
  endTag.lastIndex = from;
  const match = endTag.exec(html);
  return match === null
    ? { text: html.slice(from), end: html.length }
    : { text: html.slice(from, match.index), end: match.index + match[0].length };
}

export function* scanTags(html: string): Generator<HtmlTag> {
  const token = new RegExp(TOKEN.source, TOKEN.flags);
  for (let match = token.exec(html); match !== null; match = token.exec(html)) {
    if (match[0] === '<!--') {
      const close = html.indexOf('-->', token.lastIndex);
      token.lastIndex = close === -1 ? html.length : close + 3;
      continue;
    }
    const isClosing = match[1] === '/';
    const name = (match[2] ?? '').toLowerCase();
    const { attributes, end } = readAttributes(html, token.lastIndex);
    token.lastIndex = end;
    if (isClosing || !END_TAGS.has(name)) {
      yield { name, isClosing, attributes };
      continue;
    }
    const raw = readRawText(html, name, end);
    token.lastIndex = raw.end;
    yield SKIPPED_TEXT.has(name)
      ? { name, isClosing, attributes }
      : { name, isClosing, attributes, text: raw.text };
  }
}

export interface PageHead {
  readonly htmlLang: string | null;
  readonly title: string | null;
  readonly canonical: string | null;
  readonly hreflang: Record<string, string>;
  readonly robotsMeta: string | null;
}

function nonEmpty(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

// An absolute URL is returned exactly as written; a relative one is resolved against the page.
export function resolveUrl(href: string, base: string): string | null {
  const trimmed = href.trim();
  if (trimmed === '') {
    return null;
  }
  return URL.canParse(trimmed) ? trimmed : (URL.parse(trimmed, base)?.href ?? null);
}

interface HeadDraft {
  htmlLang: string | null;
  title: string | null;
  canonical: string | null;
  // A Map, so a hreflang value such as __proto__ cannot touch an object prototype.
  readonly hreflang: Map<string, string>;
  robotsMeta: string | null;
}

function readLinkTag(tag: HtmlTag, head: HeadDraft, pageUrl: string): void {
  const href = resolveUrl(tag.attributes.get('href') ?? '', pageUrl);
  if (href === null) {
    return;
  }
  const rel = new Set((tag.attributes.get('rel') ?? '').toLowerCase().split(/\s+/));
  if (rel.has('canonical')) {
    head.canonical ??= href;
  }
  const lang = nonEmpty(tag.attributes.get('hreflang'));
  if (lang !== null && rel.has('alternate') && !head.hreflang.has(lang)) {
    head.hreflang.set(lang, href);
  }
}

function readHeadTag(tag: HtmlTag, head: HeadDraft, pageUrl: string): void {
  const attribute = (name: string) => tag.attributes.get(name);
  if (tag.name === 'html') {
    head.htmlLang ??= nonEmpty(attribute('lang'));
  } else if (tag.name === 'title') {
    head.title ??= nonEmpty(decodeEntities(tag.text ?? '').replaceAll(/\s+/g, ' '));
  } else if (tag.name === 'meta' && attribute('name')?.trim().toLowerCase() === 'robots') {
    head.robotsMeta ??= nonEmpty(attribute('content'));
  } else if (tag.name === 'link') {
    readLinkTag(tag, head, pageUrl);
  }
}

// Head fields are read up to </head> or <body>, so a stray <title> in an inline SVG is ignored.
export function extractHead(html: string, pageUrl: string): PageHead {
  const head: HeadDraft = {
    htmlLang: null,
    title: null,
    canonical: null,
    hreflang: new Map(),
    robotsMeta: null,
  };
  for (const tag of scanTags(html)) {
    if ((tag.name === 'head' && tag.isClosing) || (tag.name === 'body' && !tag.isClosing)) {
      break;
    }
    if (!tag.isClosing) {
      readHeadTag(tag, head, pageUrl);
    }
  }
  return { ...head, hreflang: Object.fromEntries(head.hreflang) };
}

// Every <a href> / <area href> value as written, in document order (duplicates included).
export function extractHrefs(html: string): string[] {
  const hrefs: string[] = [];
  for (const tag of scanTags(html)) {
    const href = tag.attributes.get('href');
    if (href !== undefined && !tag.isClosing && (tag.name === 'a' || tag.name === 'area')) {
      hrefs.push(href);
    }
  }
  return hrefs;
}
