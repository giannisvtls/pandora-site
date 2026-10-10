// Fixed settings of the one-time media fetch (spec: "Media: fetch once"). No flag changes the
// allowed origin, the politeness values or the size limit; tests pass their own through code.
import { POLITENESS, type Politeness } from '../crawl/config';

export const TOOL = { name: 'pandora-site-media', version: '1.0.0' } as const;

// Names the purpose and nothing personal: no e-mail address, no person's name, no phone number.
export const USER_AGENT = `${TOOL.name}/${TOOL.version} (one-time copy of the site's own images for the invetec.eu rebuild; GET only, obeys robots.txt)`;

// The only origin a source URL, or any redirect it leads to, may point at.
export const ALLOWED_ORIGINS: readonly string[] = ['https://invetec.eu'];

// The crawl's politeness values: 2 requests in flight, 250 ms pause per slot, 20 s timeout,
// 2 retries (1 s, then 2 s) on network errors and 5xx, at most 5 redirects per URL.
export const MEDIA_POLITENESS: Politeness = POLITENESS;

// A response body larger than this (15 MB) is refused: by its Content-Length before the body is
// read, or as soon as the bytes read pass it.
export const MAX_IMAGE_BYTES = 15_000_000;

// The site icon is site chrome that the prototype page does not reference.
export const FAVICON_URL = 'https://invetec.eu/wp-content/uploads/2023/05/favi.webp';

// Output paths, relative to the repository root, with `/` separators.
export const MEDIA_DIR = 'src/assets/media';
export const BRAND_DIR = 'src/assets/brand';
export const FAVICON_FILE = 'public/favicon.webp';
export const SOURCES_FILE = 'scripts/assets/media-sources.json';
export const MANIFEST_FILE = `${MEDIA_DIR}/manifest.json`;

// The prototype files the extraction reads, relative to the design folder; local images
// (`img/...`) are copied to MEDIA_DIR with the `img/` prefix dropped.
export const DESIGN_DATA_FILE = 'nightwatch-data.js';
export const DESIGN_HTML_FILE = 'invetec--nightwatch--v2.html';
export const DESIGN_IMAGE_PREFIX = 'img/';
