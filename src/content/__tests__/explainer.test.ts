// The explainer data (spec §5) through the query module: on the snapshot, the feature and level
// views (GPS on 13 systems, Finder and Tracer among them, Wi-Fi positioning on Elite V3 only,
// Level 3 with Finder and Tracer), and every product on the explainer of each feature it
// highlights; on fixtures, only the systems a language shows.
import { describe, expect, it } from 'vitest';

import { createQuery } from '../query';
import type { ContentData } from '../rules';
import { fixtureContent, snapshot } from './rules-fixtures';

const site = createQuery(snapshot, { preview: false });
const english = site.explainer('en');
const preview = createQuery(fixtureContent(), { preview: true });

const namesOf = (systems: readonly { name: string }[]) => systems.map(({ name }) => name);

// A Level 3 entry of the snapshot in English: `path` is its page under /en/systems/.
const system = (id: string, name: string, path: string, vehicle: string) => ({
  id,
  name,
  url: `/en/systems/${path}/`,
  vehicle,
});
const fleet = 'trucks & trackers';

// Each visible product and highlighted feature whose explainer does not list that product.
function unlistedHighlights(data: ContentData): string[] {
  const query = createQuery(data, { preview: false });
  const { features } = query.explainer('en');
  return query
    .products('en')
    .flatMap(({ id, highlights }) =>
      highlights
        .filter((key) => (features[key]?.systems ?? []).every((system) => system.id !== id))
        .map((key) => `${id} highlights ${key}`),
    );
}

describe('a feature', () => {
  it('lists Wi-Fi positioning on Elite V3 alone, Included, with its page', () => {
    expect(english.features.wifi?.systems).toEqual([
      { id: 'elite', name: 'Elite V3', url: '/en/systems/car/elite-v3/', availability: 'included' },
    ]);
  });

  it('lists GPS on 13 systems: Light Pro V2 and Primo Optional, 11 Included', () => {
    const systems = english.features.gps?.systems ?? [];
    const optional = systems.filter(({ availability }) => availability === 'optional');

    expect(systems).toHaveLength(13);
    expect(namesOf(optional)).toEqual(['Light Pro V2', 'Primo']);
    expect(systems.filter(({ availability }) => availability === 'included')).toHaveLength(11);
    // Finder and Tracer have no matrix: they are on the features they highlight, Included.
    expect(systems.slice(-2)).toEqual([
      expect.objectContaining({ id: 'finder', availability: 'included' }),
      expect.objectContaining({ id: 'tracer', availability: 'included' }),
    ]);
  });

  it('lists, for a key without a matrix row, the systems that highlight it, as Included', () => {
    const systems = english.features.twoway?.systems ?? [];

    expect(systems.map(({ id, availability }) => [id, availability])).toEqual([
      ['elite', 'included'],
      ['lightpro', 'included'],
      ['light', 'included'],
      ['camperpro', 'included'],
    ]);
  });

  it('carries its texts in the language, and no Needs where the feature has none', () => {
    const gps = snapshot.features.find(({ id }) => id === 'gps');

    expect(english.features.gps).toMatchObject({
      title: 'GPS/GLONASS tracking',
      what: gps?.what.en,
      how: gps?.how?.en,
      needs: gps?.needs?.en,
    });
    expect(english.features.wifi?.needs).toBeUndefined();
    expect(Object.keys(english.features)).toHaveLength(snapshot.features.length);
  });

  it("says the vehicle's position in the GPS text, as the feature covers every vehicle type", () => {
    const what = english.features.gps?.what ?? '';

    expect(what).toContain("reports the vehicle's position and movement on the map");
    expect(what).not.toContain("car's position");
  });

  it('lists every product on the explainer of each feature it highlights', () => {
    expect(unlistedHighlights(snapshot)).toEqual([]);
    // A product whose matrix says No for a feature it highlights is reported, not dropped quietly.
    const elite = snapshot.products.find(({ id }) => id === 'elite');
    const changed = {
      ...snapshot,
      products: snapshot.products.map((product) =>
        product === elite && product.matrix !== undefined
          ? { ...product, matrix: { ...product.matrix, gps: 0 as const } }
          : product,
      ),
    };
    expect(unlistedHighlights(changed)).toEqual(['elite highlights gps']);
  });

  it('lists only the systems the language shows', () => {
    expect(namesOf(preview.explainer('en').features.siren?.systems ?? [])).toHaveLength(3);
    expect(preview.explainer('el').features.siren?.systems).toEqual([
      expect.objectContaining({ id: 'elite', url: '/el/systems/car/elite/' }),
    ]);
    expect(preview.explainer('el').features.immo?.systems).toEqual([
      expect.objectContaining({ id: 'elite', availability: 'optional' }),
    ]);
    expect(preview.explainer('sq').features.siren?.systems).toEqual([]);
  });
});

describe('a level', () => {
  it('lists Level 3 on 11 systems, Finder and Tracer among them, with vehicle word and page', () => {
    const level = english.levels['3'];

    expect(level).toMatchObject({ id: '3', title: 'Recovery' });
    expect(level.systems).toEqual([
      system('elite', 'Elite V3', 'car/elite-v3', 'car'),
      system('professional', 'Professional V3', 'car/professional-v3', 'car'),
      system('smartpro', 'Smart Pro V4 FD', 'car/smart-pro-v4-fd', 'car'),
      system('smart', 'Smart V4', 'car/smart-v4', 'car'),
      system('motoevo', 'Moto Evo V2', 'moto/moto-evo-v2', 'motorcycle'),
      system('camperpro', 'Camper Pro V2', 'camper/camper-pro-v2', 'camper'),
      system('camperv3', 'Camper V3', 'camper/camper-v3', 'camper'),
      system('marine', 'Marine', 'marine/marine', 'boat'),
      system('truck', 'Truck', 'fleet/truck', fleet),
      system('finder', 'Finder', 'fleet/finder', fleet),
      system('tracer', 'Tracer', 'fleet/tracer', fleet),
    ]);
  });

  it("links every Level 3 system to its product's page", () => {
    const urls = new Map(site.products('en').map(({ id, url }) => [id, url]));
    const { systems } = english.levels['3'];

    expect(systems).toHaveLength(11);
    for (const { id, url } of systems) {
      expect(url, id).toBe(urls.get(id));
    }
  });

  it('carries its texts and lists every system once, at the level levelOf gives it', () => {
    const level3 = snapshot.levels.find(({ id }) => id === '3');

    expect(english.levels['3'].items).toEqual(level3?.items.map((item) => item.en));
    expect(english.levels['3'].stops).toBe(level3?.stops.en);
    expect(namesOf(english.levels['1'].systems)).toEqual(['Moto V2']);
    expect(english.levels['2'].systems).toHaveLength(4);
  });

  it('has no text a preview language lacks, never the English one', () => {
    const greek = preview.explainer('el');

    expect(greek.levels['3']).toMatchObject({
      title: undefined,
      what: undefined,
      items: [],
      stops: undefined,
    });
    expect(greek.features.gps).toMatchObject({
      title: undefined,
      what: undefined,
      how: undefined,
      needs: undefined,
    });
  });

  it('lists only the systems the language shows', () => {
    expect(preview.explainer('el').levels['1'].systems).toEqual([
      { id: 'elite', name: 'Elite V3', url: '/el/systems/car/elite/', vehicle: undefined },
    ]);
  });
});
