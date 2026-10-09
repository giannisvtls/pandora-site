// The one-hop link filter: which <a href> targets on a sitemap page are internal pages worth one
// GET. Everything else is counted by reason and never listed.

export type SkipReason = 'asset' | 'query' | 'external' | 'other';

export type LinkVerdict =
  | { readonly kind: 'page'; readonly url: string }
  | { readonly kind: 'skip'; readonly reason: SkipReason };

const PAGE_EXTENSIONS = new Set(['html', 'htm', 'php']);
// WordPress system directories: uploads, the REST API, the admin and core files.
const SYSTEM_SEGMENTS = new Set(['wp-content', 'wp-json', 'wp-admin', 'wp-includes']);
// wp-login.php, wp-cron.php (a GET runs scheduled jobs), wp-comments-post.php, xmlrpc.php, ...
const SYSTEM_FILE = /^(?:wp-[\w-]*|xmlrpc)\.php$/i;

function isAssetPath(pathname: string): boolean {
  const segments = pathname.split('/').filter((segment) => segment !== '');
  if (segments.some((segment) => SYSTEM_SEGMENTS.has(segment.toLowerCase()))) {
    return true;
  }
  // WordPress feeds: /feed/, /feed/atom/, /comments/feed/, /category/x/feed/
  if (segments.some((segment) => segment.toLowerCase() === 'feed')) {
    return true;
  }
  const last = segments.at(-1) ?? '';
  if (SYSTEM_FILE.test(last)) {
    return true;
  }
  const extension = /\.([a-z\d]{1,10})$/i.exec(last)?.[1]?.toLowerCase();
  return extension !== undefined && !PAGE_EXTENSIONS.has(extension);
}

// Resolves `href` against the page and keeps it only when it is a page on the same host: http(s),
// no query string, not under /wp-content/ or /wp-json/, not a feed, and no file extension other
// than .html/.htm/.php. The fragment is dropped and the scheme set to the page's, so
// http://host/x and https://host/x#top are the same link. Percent-escapes are kept as written.
export function classifyLink(href: string, pageUrl: string): LinkVerdict {
  let url: URL;
  try {
    url = new URL(href.trim(), pageUrl);
  } catch {
    return { kind: 'skip', reason: 'other' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { kind: 'skip', reason: 'other' };
  }
  const page = new URL(pageUrl);
  if (url.host !== page.host) {
    return { kind: 'skip', reason: 'external' };
  }
  if (url.search !== '') {
    return { kind: 'skip', reason: 'query' };
  }
  if (isAssetPath(url.pathname)) {
    return { kind: 'skip', reason: 'asset' };
  }
  // origin + pathname: drops the fragment and an empty `?`.
  return { kind: 'page', url: `${page.protocol}//${url.host}${url.pathname}` };
}
