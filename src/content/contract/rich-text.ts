// Rich text (spec §2, decision P1-9): a compact editorial node set that maps onto the CMS editor
// later. Blocks are paragraphs, h2/h3 headings, lists and images; inline nodes are text runs
// (bold, italic) and links to a site path or an https URL.
import { z } from 'zod';

import { languageMap, mediaId, type Locale } from './primitives';

// A site path (`/en/blog/`) or an https URL. A path starting `//` or `/\` would leave the site.
const SITE_PATH = /^\/(?![/\\])\S*$/u;

export function isAllowedHref(href: string): boolean {
  if (SITE_PATH.test(href)) {
    return true;
  }
  const url = URL.parse(href);
  return href.startsWith('https://') && url?.protocol === 'https:' && url.hostname !== '';
}

export const textNode = z.strictObject({
  type: z.literal('text'),
  text: z.string().min(1),
  bold: z.literal(true).optional(),
  italic: z.literal(true).optional(),
});

export const linkNode = z.strictObject({
  type: z.literal('link'),
  href: z.string().refine(isAllowedHref, {
    message: 'Expected a site path "/..." or an https:// URL',
  }),
  children: z.array(textNode).min(1),
});

export const inlineNode = z.discriminatedUnion('type', [textNode, linkNode]);
const inlines = z.array(inlineNode).min(1);

export const blockNode = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('paragraph'), children: inlines }),
  z.strictObject({
    type: z.literal('heading'),
    level: z.literal([2, 3]),
    children: inlines,
  }),
  z.strictObject({
    type: z.literal('list'),
    ordered: z.boolean(),
    items: z.array(inlines).min(1),
  }),
  z.strictObject({ type: z.literal('image'), media: mediaId, caption: inlines.optional() }),
]);

export const richText = z.array(blockNode).min(1);
export type RichText = z.infer<typeof richText>;
export type Block = z.infer<typeof blockNode>;
export type Inline = z.infer<typeof inlineNode>;

// Rich text per language, with a value in `source` when one is given.
export function localizedRichText(source?: Locale) {
  return languageMap(richText, source);
}
export type LocalizedRichText = Partial<Record<Locale, RichText>>;
