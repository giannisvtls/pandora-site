// Snapshot integrity (A13): across the committed snapshot, every reference resolves and every
// key set is complete (the checks: ./integrity-checks.ts). The fixed-key sets hold exactly their
// keys; products point at a category, features (highlights), the 22 spec rows in order (matrix)
// and media; accessories at a group, products (fits), vehicles and media; levels and Finder picks
// at products; posts, categories, accessory cards and Site copy (the home proof rail) at media;
// every media file exists and every media item is used; product slugs, post slugs per language
// and media ids are unique.
import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from '../../../scripts/snapshot/paths';
import {
  readSnapshot,
  readSnapshotJson,
  type SnapshotData,
} from '../../../scripts/snapshot/read-snapshot';
import { PRODUCT_HUES } from '../hues';
import { integrityProblems, type IntegrityContext } from './integrity-checks';

type Loose = Record<string, unknown>;

// The snapshot as plain data a test can change: lists of items, and global objects.
type Copy = {
  -readonly [K in keyof SnapshotData]: SnapshotData[K] extends readonly unknown[] ? Loose[] : Loose;
};

const snapshot = await readSnapshot();
const rawProducts = (await readSnapshotJson(REPO_ROOT, 'products')) as Loose[];
const committed: IntegrityContext = {
  matrixKeys: new Map(
    rawProducts.map((product) => [
      String(product.id),
      Object.keys((product.matrix ?? {}) as Loose),
    ]),
  ),
  hueIds: Object.keys(PRODUCT_HUES),
  hasFile: (file) => existsSync(path.join(REPO_ROOT, file)),
};

// A copy of the snapshot with `change` applied to its plain data.
function changed(change: (copy: Copy) => void): SnapshotData {
  const copy = structuredClone(snapshot) as unknown as Copy;
  change(copy);
  return copy as unknown as SnapshotData;
}

function itemOf(list: Loose[], id: string): Loose {
  const item = list.find((candidate) => candidate.id === id);
  if (item === undefined) throw new Error(`no ${id}`);
  return item;
}

type Change = (copy: Copy) => void;

describe('the committed snapshot', () => {
  it('has every reference resolved and every key set complete', () => {
    expect(integrityProblems(snapshot, committed)).toEqual([]);
  });
});

describe('a broken reference', () => {
  it.each<[string, Change, string]>([
    [
      'a highlight that is not a feature',
      (copy) => {
        (itemOf(copy.products, 'elite').highlights as string[]).push('nope');
      },
      'product elite: highlight "nope" is not a feature',
    ],
    [
      'a category that does not exist',
      (copy) => {
        copy.categories = copy.categories.filter(({ id }) => id !== 'marine');
      },
      'product marine: category "marine" is not a category',
    ],
    [
      'an accessory fit',
      (copy) => {
        (itemOf(copy.accessories, 'd-061').fits as string[]).push('elite-v4');
      },
      'accessory d-061: fits "elite-v4", not a product',
    ],
    [
      'an accessory group',
      (copy) => {
        itemOf(copy.accessories, 'band').group = 'watches';
      },
      'accessory band: group "watches" is not an accessory group',
    ],
    [
      'a level system',
      (copy) => {
        (itemOf(copy.levels, '3').systems as string[]).push('fleetmgmt');
      },
      'level 3: "fleetmgmt" is not a product',
    ],
    [
      'a Finder pick',
      (copy) => {
        const picks = (copy.finder.picks as Record<string, Record<string, Loose>>).moto;
        if (picks?.['1'] !== undefined) picks['1'].product = 'scooter';
      },
      'finder moto 1: "scooter" is not a product',
    ],
    [
      'a product image',
      (copy) => {
        itemOf(copy.products, 'immo').image = 'pandora-immo-2';
      },
      'product immo image: media "pandora-immo-2" does not exist',
    ],
    [
      'a home proof-rail photo (Site copy)',
      (copy) => {
        const shots = (copy.siteCopyHome.proof as { shots: Loose[] }).shots;
        if (shots[0] !== undefined) shots[0].photo = 'nope';
      },
      'siteCopyHome.proof.shots.0.photo: media "nope" does not exist',
    ],
    [
      'a nav route',
      (copy) => {
        itemOf(copy.navSections, 'blog').route = 'news';
      },
      'nav section blog: route "news" is not a route key',
    ],
    [
      'a product slug used twice',
      (copy) => {
        itemOf(copy.products, 'smart').slug = 'smart-pro-v4-fd';
      },
      'product slug "smart-pro-v4-fd" twice',
    ],
    [
      'a post slug used twice in one language',
      (copy) => {
        itemOf(copy.posts, 'keycard').slug = { en: 'pandora-at-motodays-2026' };
      },
      'post slug "pandora-at-motodays-2026" twice in en',
    ],
    [
      'a media id that is not its file path',
      (copy) => {
        itemOf(copy.media, 'pricelist-acc-band').id = 'acc-band';
      },
      'media acc-band: the id of src/assets/media/pricelist/acc-band.png is pricelist-acc-band',
    ],
    [
      'a media item nothing uses',
      (copy) => {
        itemOf(copy.accessories, 'band').image = undefined;
      },
      'media pricelist-acc-band: nothing uses it',
    ],
    [
      'an incomplete fixed-key set',
      (copy) => {
        copy.specRows = copy.specRows.filter(({ id }) => id !== 'wifi');
      },
      'spec rows: accel, siren, immo, bt, pin, smarttag, nodisarm, hijack, jammer, gps, lbs, lte, blackbox, app, push, selfcall, oem, remote, start, keyless, preheater; expected accel, siren, immo, bt, pin, smarttag, nodisarm, hijack, jammer, gps, wifi, lbs, lte, blackbox, app, push, selfcall, oem, remote, start, keyless, preheater',
    ],
  ])('names %s', (_what, change, problem) => {
    expect(integrityProblems(changed(change), committed)).toContain(problem);
  });

  it('names a media file that is not on disk, a matrix out of order and a hue of no product', () => {
    const elite = committed.matrixKeys.get('elite') ?? [];
    const context: IntegrityContext = {
      matrixKeys: new Map([...committed.matrixKeys, ['elite', elite.toReversed()]]),
      hueIds: [...committed.hueIds, 'cruise'],
      hasFile: (file) => !file.endsWith('/pandora-immo.webp'),
    };

    expect(integrityProblems(snapshot, context)).toEqual([
      'product elite: the matrix keys are not the 22 spec rows in order',
      'hues: "cruise" is not a product',
      'media pandora-immo: src/assets/media/pandora-immo.webp is not on disk',
    ]);
  });
});
