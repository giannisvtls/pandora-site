// The page rules (spec §4, A18), on fixtures (./rules-fixtures.ts): which pages exist in which
// built language, their alternates and x-default, the language switcher's targets, the sitemap
// entries and the root redirect, with English only, English + Greek, and Italian only built.
import { describe, expect, it } from 'vitest';

import type { Locale } from '../contract';
import {
  alternates,
  createSite,
  hasPage,
  pageUrl,
  rootLanguage,
  rootRedirect,
  sitemapEntries,
  switcherTargets,
  type Page,
  type Site,
} from '../rules';
import { fixtureContent } from './rules-fixtures';

const HOME: Page = { type: 'home' };
const ITEM_TYPES = [
  'home',
  'category',
  'accessoriesVehicle',
  'product',
  'accessory',
  'post',
  'notFound',
] as const;

// The site built with `live` languages; `pageTypes` stands in for BUILT_PAGE_TYPES when given.
function siteWith(live: readonly Locale[], pageTypes?: Site['pageTypes']): Site {
  const options = pageTypes === undefined ? { preview: false } : { preview: false, pageTypes };
  return createSite(fixtureContent(live), options);
}

describe('English only', () => {
  const site = siteWith(['en']);

  it('builds English, and the home page there only', () => {
    expect(site.built).toEqual(['en']);
    expect(hasPage(site, HOME, 'en')).toBe(true);
    expect(hasPage(site, HOME, 'el')).toBe(false);
  });

  it('gives home its English alternate and x-default -> /en/', () => {
    expect(alternates(site, HOME)).toEqual([
      { hreflang: 'en', path: '/en/' },
      { hreflang: 'x-default', path: '/en/' },
    ]);
  });

  it('offers English alone in the switcher, as the current language', () => {
    expect(switcherTargets(site, HOME, 'en')).toEqual([
      { locale: 'en', path: '/en/', isCurrent: true },
    ]);
  });

  it('redirects the root to /en/ with a 302', () => {
    expect(rootRedirect(site.built)).toEqual({ from: '/', to: '/en/', status: 302 });
    expect(rootLanguage(site.built)).toBe('en');
  });

  it('lists only home in the sitemap, with its alternates (BUILT_PAGE_TYPES)', () => {
    expect(site.pageTypes).toEqual(['home']);
    expect(sitemapEntries(site, 'en')).toEqual([
      { path: '/en/', alternates: alternates(site, HOME) },
    ]);
    expect(hasPage(site, { type: 'product', id: 'elite' }, 'en')).toBe(false);
    expect(sitemapEntries(site, 'el')).toEqual([]);
  });
});

describe('English and Greek', () => {
  const site = siteWith(['en', 'el'], ITEM_TYPES);

  it('gives a page its alternates and x-default -> el', () => {
    expect(alternates(site, HOME)).toEqual([
      { hreflang: 'en', path: '/en/' },
      { hreflang: 'el', path: '/el/' },
      { hreflang: 'x-default', path: '/el/' },
    ]);
    expect(alternates(site, { type: 'post', id: 'motodays' })).toEqual([
      { hreflang: 'en', path: '/en/blog/news-en/' },
      { hreflang: 'el', path: '/el/blog/news-el/' },
      { hreflang: 'x-default', path: '/el/blog/news-el/' },
    ]);
  });

  it('falls back to the English page for x-default when the item is not visible in Greek', () => {
    const smart: Page = { type: 'product', id: 'smart' };

    expect(hasPage(site, smart, 'el')).toBe(false);
    expect(alternates(site, smart)).toEqual([
      { hreflang: 'en', path: '/en/systems/car/smart/' },
      { hreflang: 'x-default', path: '/en/systems/car/smart/' },
    ]);
  });

  it("switches to the page in the other language, else to that language's home", () => {
    expect(switcherTargets(site, { type: 'product', id: 'elite' }, 'el')).toEqual([
      { locale: 'en', path: '/en/systems/car/elite/', isCurrent: false },
      { locale: 'el', path: '/el/systems/car/elite/', isCurrent: true },
    ]);
    expect(switcherTargets(site, { type: 'product', id: 'smart' }, 'en')).toEqual([
      { locale: 'en', path: '/en/systems/car/smart/', isCurrent: true },
      { locale: 'el', path: '/el/', isCurrent: false },
    ]);
  });

  it('redirects the root to /el/ with a 301', () => {
    expect(rootRedirect(site.built)).toEqual({ from: '/', to: '/el/', status: 301 });
  });

  it('lists in each sitemap the pages that exist there, never a 404 page', () => {
    const paths = (locale: Locale) => sitemapEntries(site, locale).map(({ path }) => path);

    expect(paths('el')).toEqual([
      '/el/',
      '/el/systems/car/',
      '/el/systems/moto/',
      '/el/systems/camper/',
      '/el/systems/marine/',
      '/el/systems/fleet/',
      '/el/accessories/car/',
      '/el/accessories/moto/',
      '/el/accessories/camper/',
      '/el/accessories/marine/',
      '/el/systems/car/elite/',
      '/el/accessories/car/d-061/',
      '/el/blog/news-el/',
    ]);
    expect(paths('en')).toContain('/en/systems/car/light/');
    expect(paths('en').some((path) => path.includes('404'))).toBe(false);
    expect(alternates(site, { type: 'notFound' })).toEqual([]);
  });

  it('gives a vehicle accessories page only to the vehicles with an accessory card', () => {
    expect(pageUrl(site, { type: 'accessoriesVehicle', vehicle: 'fleet' }, 'el')).toBeUndefined();
    expect(pageUrl(site, { type: 'accessoriesVehicle', vehicle: 'moto' }, 'el')).toBe(
      '/el/accessories/moto/',
    );
  });

  it('gives an accessory with no vehicle no page yet (Phase 3)', () => {
    expect(pageUrl(site, { type: 'accessory', id: 'band' }, 'en')).toBeUndefined();
    expect(pageUrl(site, { type: 'accessory', id: 'd-061' }, 'en')).toBe(
      '/en/accessories/car/d-061/',
    );
  });
});

describe('Italian only', () => {
  const site = siteWith(['it'], ITEM_TYPES);

  it('has no x-default, since neither Greek nor English is built', () => {
    expect(alternates(site, HOME)).toEqual([{ hreflang: 'it', path: '/it/' }]);
    expect(alternates(site, { type: 'product', id: 'tracer' })).toEqual([
      { hreflang: 'it', path: '/it/systems/car/tracer/' },
    ]);
  });

  it('shows the it-only product in Italian and nowhere else', () => {
    expect(hasPage(site, { type: 'product', id: 'tracer' }, 'it')).toBe(true);
    expect(hasPage(site, { type: 'product', id: 'elite' }, 'it')).toBe(false);
    expect(switcherTargets(site, HOME, 'it')).toEqual([
      { locale: 'it', path: '/it/', isCurrent: true },
    ]);
  });

  it('redirects the root to /it/ with a 302', () => {
    expect(rootRedirect(site.built)).toEqual({ from: '/', to: '/it/', status: 302 });
  });
});

describe('the root without a built language', () => {
  it('is an error', () => {
    expect(() => rootRedirect([])).toThrow('No language is built');
    expect(() => createSite(fixtureContent([]), { preview: false })).toThrow('No language is live');
  });

  it('prefers Greek, then English, Italian and Albanian', () => {
    expect(rootLanguage(['sq', 'it'])).toBe('it');
    expect(rootLanguage(['sq', 'en', 'el'])).toBe('el');
  });
});
