// XML sitemaps as WordPress writes them: Yoast SEO (sitemap_index.xml, one element per line,
// image:image extensions) and WordPress core (wp-sitemap.xml, everything on one line). Both are
// machine-generated with a fixed element set, so a scan for <sitemap>/<url> blocks and their
// <loc>/<lastmod> children is enough; no general XML parser is needed.
import { decodeEntities } from './entities';

export interface SitemapEntry {
  readonly loc: string;
  readonly lastmod: string | null;
}

export type ParsedSitemap =
  | { readonly kind: 'index'; readonly entries: SitemapEntry[] }
  | { readonly kind: 'urlset'; readonly entries: SitemapEntry[] }
  | { readonly kind: 'unknown'; readonly entries: [] };

// Comments and processing instructions (<?xml ...?>, <?xml-stylesheet ...?>) carry no entries.
function stripMarkup(xml: string): string {
  return xml.replaceAll(/<!--[\s\S]*?-->/g, '').replaceAll(/<\?[\s\S]*?\?>/g, '');
}

function childText(block: string, name: 'loc' | 'lastmod'): string | null {
  const open = `<${name}>`;
  const start = block.indexOf(open);
  if (start === -1) {
    return null;
  }
  const end = block.indexOf(`</${name}>`, start);
  if (end === -1) {
    return null;
  }
  const raw = block.slice(start + open.length, end).trim();
  const isCdata = raw.startsWith('<![CDATA[') && raw.endsWith(']]>');
  const text = isCdata ? raw.slice('<![CDATA['.length, -']]>'.length).trim() : decodeEntities(raw);
  return text === '' ? null : text;
}

// Each <element>...</element> block; `\b` keeps <url> from matching <urlset> and <sitemap> from
// matching <sitemapindex>. A <loc> nested in <image:image> is spelled <image:loc>, never <loc>.
function blocks(xml: string, element: 'sitemap' | 'url'): string[] {
  const pattern = new RegExp(String.raw`<${element}\b[^>]*>([\s\S]*?)</${element}>`, 'g');
  return xml
    .matchAll(pattern)
    .map((match) => match[1] ?? '')
    .toArray();
}

function entriesOf(xml: string, element: 'sitemap' | 'url'): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const block of blocks(xml, element)) {
    const loc = childText(block, 'loc');
    if (loc !== null) {
      entries.push({ loc, lastmod: childText(block, 'lastmod') });
    }
  }
  return entries;
}

export function parseSitemap(xml: string): ParsedSitemap {
  const body = stripMarkup(xml);
  const root = /<([a-z][\w:-]*)/i.exec(body)?.[1]?.toLowerCase();
  switch (root) {
    case 'sitemapindex': {
      return { kind: 'index', entries: entriesOf(body, 'sitemap') };
    }
    case 'urlset': {
      return { kind: 'urlset', entries: entriesOf(body, 'url') };
    }
    default: {
      return { kind: 'unknown', entries: [] };
    }
  }
}

// The file name without `.xml`: post-sitemap, post_tag-sitemap2, wp-sitemap-posts-product-1.
export function sitemapName(sitemapUrl: string): string {
  const { pathname } = new URL(sitemapUrl);
  const file = pathname.split('/').findLast((segment) => segment !== '') ?? 'sitemap';
  return file.replace(/\.xml(?:\.gz)?$/i, '');
}
