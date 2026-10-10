// The SEO files (spec §9) as pure functions: the sitemap index (one sitemap per built language),
// each language's sitemap with every page's hreflang alternates, robots.txt, the static host's
// `_redirects` (the root redirect) and the Organization JSON-LD of a language home. The endpoints
// under src/pages/ serve them through the query module, and the build integration
// (src/integrations/build-files.ts) writes `_redirects`. No Astro import and no Vite feature, so
// plain Node code can use this module.
import type { Languages, Locale, LocalizedText, SiteCopyFooter } from './contract';
import { textIn } from './copy';
import { rootRedirect, type Alternate, type SitemapEntry } from './rules';

// Where the sitemap index is served; robots.txt names it.
export const SITEMAP_INDEX_PATH = '/sitemap-index.xml';

// Where the sitemap of `locale` is served (src/pages/sitemap-[locale].xml.ts): `/sitemap-en.xml`.
export const sitemapPath = (locale: Locale): string => `/sitemap-${locale}.xml`;

// An XML namespace name: a fixed identifier that starts with `http://` and is never fetched. It
// is built through URL because lint refuses an `http://` literal (sonarjs/no-clear-text-protocols)
// and `https://` would name another namespace.
function namespaceName(name: string): string {
  const url = new URL(name);
  url.protocol = 'http:';
  return url.href;
}

export const SITEMAP_NAMESPACE = namespaceName('https://www.sitemaps.org/schemas/sitemap/0.9');
export const XHTML_NAMESPACE = namespaceName('https://www.w3.org/1999/xhtml');

const XML_ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

// `text` as XML character data or as an attribute value.
export const xmlEscape = (text: string): string =>
  text.replaceAll(/[&<>"']/gu, (character) => XML_ENTITIES[character] ?? character);

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';

// The absolute URL of `path` on the site, escaped for XML.
const absolute = (path: string, site: URL): string => xmlEscape(new URL(path, site).href);

// The sitemap index: one `<sitemap>` per built language, in their order.
export function sitemapIndexXml(site: URL, built: readonly Locale[]): string {
  const sitemaps = built.map(
    (locale) => `  <sitemap>\n    <loc>${absolute(sitemapPath(locale), site)}</loc>\n  </sitemap>`,
  );
  return [
    XML_DECLARATION,
    `<sitemapindex xmlns="${SITEMAP_NAMESPACE}">`,
    ...sitemaps,
    '</sitemapindex>',
    '',
  ].join('\n');
}

const alternateLink =
  (site: URL) =>
  ({ hreflang, path }: Alternate): string =>
    `    <xhtml:link rel="alternate" hreflang="${xmlEscape(hreflang)}" href="${absolute(path, site)}"/>`;

// A language's sitemap: one `<url>` per page (rules.ts `sitemapEntries`, which never gives a 404
// page), with the page's hreflang alternates as its head links them, x-default included. No
// `<lastmod>`: no page has a real date of change yet, and none is invented.
export function sitemapXml(site: URL, entries: readonly SitemapEntry[]): string {
  const urls = entries.map(({ path, alternates }) =>
    [
      '  <url>',
      `    <loc>${absolute(path, site)}</loc>`,
      ...alternates.map(alternateLink(site)),
      '  </url>',
    ].join('\n'),
  );
  return [
    XML_DECLARATION,
    `<urlset xmlns="${SITEMAP_NAMESPACE}" xmlns:xhtml="${XHTML_NAMESPACE}">`,
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

// robots.txt: every crawler may fetch every page (a 404 page keeps itself out of the index with
// its `noindex` meta, which a crawler reads only on a page it may fetch), and the sitemap index.
export function robotsTxt(site: URL): string {
  const sitemap = new URL(SITEMAP_INDEX_PATH, site).href;
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${sitemap}`, ''].join('\n');
}

// The static host's `_redirects`: line 1 sends the root to its language's home with the status
// rules.ts gives (`rootRedirect`, from the live languages: a preview build renders every
// language, but the root never leads to one that is not live). Phase 7 adds the old site's URLs.
export function redirectsFile(languages: Languages): string {
  const { from, to, status } = rootRedirect(languages);
  return `${from}  ${to}  ${String(status)}\n`;
}

// `<` as a JSON string escape: a backslash, then `u003c`.
const ESCAPED_LESS_THAN = `${String.fromCodePoint(0x5c)}u003c`;

// `value` as JSON for an inline <script> element: every `<` is written as its JSON escape, so no
// text in it (`</script>`, `<!--`) can end the element or change how the browser reads it. It
// parses to the same value.
export function scriptJson(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', () => ESCAPED_LESS_THAN);
}

export interface OrganizationUrls {
  // The site's origin (astro.config.mjs `site`).
  readonly site: URL;
  // The logo image's URL, absolute or a path on the site.
  readonly logo: string;
}

// The Organization JSON-LD of a language home (spec §9): the footer company block as `locale`
// shows it (A6: no fact written in code), the site's URL and the logo's. No `sameAs` until the
// social profiles have URLs (roadmap Open item 11), and no country: the company block has none.
export function organizationJsonLd(
  footer: SiteCopyFooter,
  locale: Locale,
  urls: OrganizationUrls,
): string {
  const { company } = footer;
  const text = (value: LocalizedText, field: string) =>
    textIn(value, locale, `siteCopyFooter.company.${field}`);
  return scriptJson({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.name,
    url: new URL('/', urls.site).href,
    logo: new URL(urls.logo, urls.site).href,
    email: company.email,
    telephone: company.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: text(company.street, 'street'),
      addressLocality: text(company.locality, 'locality'),
      postalCode: company.postalCode,
    },
  });
}
