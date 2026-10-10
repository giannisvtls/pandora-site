// The nav sections' routes (spec §2, §4): a section has only a route key, so it leads to a page
// whose path takes no parameter, never the 404 page; every section of the snapshot does.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { NAV_ROUTE_KEYS, navSectionSchema, ROUTE_KEYS } from '../contract';
import { fixtures } from './contract-fixtures';

const NAV_SNAPSHOT = new URL('../../../content-snapshot/nav-sections.json', import.meta.url);

// Spec §4: the pages whose path takes no parameter, and those that take one or are the 404 page.
const NAV_ROUTES = [
  'home',
  'systems',
  'compare',
  'accessories',
  'blog',
  'installers',
  'contact',
  'partners',
  'warranty',
];
const NOT_NAV_ROUTES = [
  'category',
  'product',
  'accessoriesVehicle',
  'accessory',
  'post',
  'notFound',
];

const issuesWith = (route: string) =>
  navSectionSchema.safeParse({ ...fixtures.navSections(), route }).error?.issues ?? [];

describe('a nav section', () => {
  it('leads to a page whose path takes no parameter', () => {
    expect(new Set([...NAV_ROUTES, ...NOT_NAV_ROUTES])).toEqual(new Set(ROUTE_KEYS));
    expect(NAV_ROUTE_KEYS).toEqual(NAV_ROUTES);
    for (const route of NAV_ROUTES) {
      expect(issuesWith(route), route).toEqual([]);
    }
  });

  it('never leads to a page with parameters or to the 404 page, failing at route', () => {
    for (const route of NOT_NAV_ROUTES) {
      expect(issuesWith(route), route).toMatchObject([
        {
          path: ['route'],
          message: `A nav section leads to a page whose path takes no parameter (${NAV_ROUTES.join(', ')}), not "${route}"`,
        },
      ]);
    }
  });

  it('of the snapshot loads, every one', () => {
    const sections: unknown[] = JSON.parse(readFileSync(NAV_SNAPSHOT, 'utf8'));

    expect(sections).toHaveLength(6);
    for (const section of sections) {
      expect(navSectionSchema.safeParse(section).error?.issues ?? []).toEqual([]);
    }
  });
});
