// A two-host test site built from the fixtures: a Yoast host (like invetec.eu) and a
// WordPress-core host (like lenovo.invetec.eu). The same routes back the fake fetch and the local
// HTTP server of the dry run; fixture URLs are rewritten to the given origins.
import { fixture, html, redirect, text, xml, type Route } from './helpers';

export const CONTACT_PATH = '/%ce%b5%cf%80%ce%b9%ce%ba%ce%bf%ce%b9%ce%bd%cf%89%ce%bd%ce%af%ce%b1/';
export const PRIVACY_PATH = '/%ce%b1%cf%80%cf%8c%cf%81%cf%81%ce%b7%cf%84%ce%bf/';

// Disallowed for `*` in the test robots.txt (appended to the WordPress fixture).
export const DISALLOWED_PREFIX = '/private-area/';

// WordPress system paths the crawl must never request (sitemaps such as /wp-sitemap.xml are fine).
export const WORDPRESS_SYSTEM =
  /^\/(?:wp-admin|wp-content|wp-json|wp-includes)\/|^\/(?:wp-[\w-]*|xmlrpc)\.php$/;

const page = (lang: string, title: string) =>
  html(
    `<!doctype html><html lang="${lang}"><head><title>${title}</title></head><body></body></html>`,
  );

function postSitemap(a: string, b: string): string {
  const locs = [
    `${a}/en/news/camper-v3-launch/`,
    `${a}/en/news/camper-v3/`,
    `${a}/old-post/`,
    `${a}/flaky/`,
    `${a}/gone/`,
    `${a}/loop-a/`,
    `${a}/to-shop/`,
    `${a}/external/`,
    `${a}/?p=123`,
    'https://www.invetec.eu/old/',
    `${a}/en/news/camper-v3/`,
    `${a}${DISALLOWED_PREFIX}secret-post/`,
    `${b}/it/product/thinkpad-t14s-gen-6/`,
  ];
  const urls = locs.map((loc) => `<url><loc>${loc.replaceAll('&', '&amp;')}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>\n`;
}

export interface SiteOrigins {
  // Stands for https://invetec.eu (root language el, Yoast).
  readonly a: string;
  // Stands for https://lenovo.invetec.eu (no root language, WordPress core).
  readonly b: string;
}

function rewrite(content: string, { a, b }: SiteOrigins): string {
  return content
    .replaceAll('https://lenovo.invetec.eu', () => b)
    .replaceAll('https://invetec.eu', () => a);
}

function yoastHost(origins: SiteOrigins): Record<string, Route> {
  const { a, b } = origins;
  const robots = `${fixture('robots-wordpress.txt')}\nUser-agent: *\nDisallow: ${DISALLOWED_PREFIX}\n`;
  return {
    [`${a}/robots.txt`]: text(rewrite(robots, origins)),
    [`${a}/sitemap_index.xml`]: xml(rewrite(fixture('sitemap-index-yoast.xml'), origins)),
    [`${a}/wp-sitemap.xml`]: redirect('/sitemap_index.xml'),
    [`${a}/post-sitemap.xml`]: xml(postSitemap(a, b)),
    [`${a}/page-sitemap.xml`]: xml(rewrite(fixture('sitemap-page-yoast.xml'), origins)),
    [`${a}/`]: page('el', 'INVETEC'),
    [`${a}${CONTACT_PATH}`]: html(rewrite(fixture('page-el-contact.html'), origins)),
    [`${a}/en/`]: page('en-US', 'INVETEC'),
    [`${a}/en/contact/`]: page('en-US', 'Contact'),
    [`${a}/it/contatti/`]: page('it-IT', 'Contatti'),
    [`${a}/sq/kontakt/`]: page('sq', 'Kontakt'),
    [`${a}/en/legal-notice/`]: html(rewrite(fixture('page-en-noindex.html'), origins)),
    [`${a}/en/news/camper-v3-launch/`]: redirect('/en/news/camper-v3/'),
    [`${a}/en/news/camper-v3/`]: page('en-US', 'Camper V3'),
    [`${a}/old-post/`]: redirect(`${a}/old-post-2/`),
    [`${a}/old-post-2/`]: redirect('/en/news/camper-v3/', 302),
    [`${a}/flaky/`]: (_call, count) => (count === 1 ? { status: 503 } : page('el', 'Flaky')),
    [`${a}/loop-a/`]: redirect('/loop-b/'),
    [`${a}/loop-b/`]: redirect('/loop-a/'),
    [`${a}/to-shop/`]: redirect(`${b}/it/product/thinkpad-x1-carbon-gen-12/`),
    [`${a}/external/`]: redirect('https://www.example.com/'),
    [`${a}${PRIVACY_PATH}`]: page('el', 'Απόρρητο'),
    [`${a}/en/about/`]: page('en-US', 'About'),
  };
}

function coreHost(origins: SiteOrigins): Record<string, Route> {
  const { b } = origins;
  return {
    [`${b}/robots.txt`]: text(
      `User-agent: *\nDisallow: /wp-admin/\n\nSitemap: ${b}/wp-sitemap.xml\n`,
    ),
    [`${b}/wp-sitemap.xml`]: xml(rewrite(fixture('sitemap-index-wp-core.xml'), origins)),
    [`${b}/wp-sitemap-posts-product-1.xml`]: xml(
      rewrite(fixture('sitemap-products-wp-core.xml'), origins),
    ),
    [`${b}/it/product/thinkpad-x1-carbon-gen-12/`]: page('it-IT', 'ThinkPad X1 Carbon Gen 12'),
    [`${b}/it/product/thinkpad-t14s-gen-6/`]: page('it-IT', 'ThinkPad T14s Gen 6'),
    [`${b}/it/product/thinkcentre-neo-50q/`]: { status: 410 },
  };
}

export function testSite(origins: SiteOrigins): Record<string, Route> {
  return { ...yoastHost(origins), ...coreHost(origins) };
}

// URLs the crawl must end with, per the site above (sitemap URLs + one-hop URLs).
export function expectedUrls({ a, b }: SiteOrigins, isAboutLinkInternal: boolean): string[] {
  const sitemap = [
    `${a}/en/news/camper-v3-launch/`,
    `${a}/en/news/camper-v3/`,
    `${a}/old-post/`,
    `${a}/flaky/`,
    `${a}/gone/`,
    `${a}/loop-a/`,
    `${a}/to-shop/`,
    `${a}/external/`,
    `${a}${DISALLOWED_PREFIX}secret-post/`,
    `${a}/`,
    `${a}${CONTACT_PATH}`,
    `${a}/en/`,
    `${a}/en/contact/`,
    `${a}/it/contatti/`,
    `${a}/sq/kontakt/`,
    `${a}/en/legal-notice/`,
    `${b}/it/product/thinkpad-x1-carbon-gen-12/`,
    `${b}/it/product/thinkpad-t14s-gen-6/`,
    `${b}/it/product/thinkcentre-neo-50q/`,
  ];
  const hop = [
    `${a}${PRIVACY_PATH}`,
    `${a}/legacy/index.php`,
    `${a}/old/page.html`,
    `${a}/en/unquoted/`,
    `${a}/en/upper-case-tag/`,
    `${a}/en/gt-in-attribute/`,
    // The fixture links /en/about/ over plain HTTP on invetec.eu: internal only when `a` is that host.
    ...(isAboutLinkInternal ? [`${a}/en/about/`] : []),
  ];
  return [...sitemap, ...hop];
}
