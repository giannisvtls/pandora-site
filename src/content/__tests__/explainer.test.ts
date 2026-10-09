// The explainer data (spec §5) through the query module: on the snapshot, the feature and level
// views of the prototype (GPS on 11 systems, Wi-Fi positioning on Elite V3 only, Level 3 with
// Finder and Tracer); on fixtures, only the systems a language shows.
import { describe, expect, it } from 'vitest';

import { createQuery } from '../query';
import { fixtureContent, snapshot } from './rules-fixtures';

const english = createQuery(snapshot, { preview: false }).explainer('en');
const preview = createQuery(fixtureContent(), { preview: true });

const namesOf = (systems: readonly { name: string }[]) => systems.map(({ name }) => name);

describe('a feature', () => {
  it('lists Wi-Fi positioning on Elite V3 alone, Included, with its page', () => {
    expect(english.features.wifi?.systems).toEqual([
      { id: 'elite', name: 'Elite V3', url: '/en/systems/car/elite-v3/', availability: 'included' },
    ]);
  });

  it('lists GPS on 11 systems: Light Pro V2 and Primo Optional, 9 Included', () => {
    const systems = english.features.gps?.systems ?? [];
    const optional = systems.filter(({ availability }) => availability === 'optional');

    expect(systems).toHaveLength(11);
    expect(namesOf(optional)).toEqual(['Light Pro V2', 'Primo']);
    expect(systems.filter(({ availability }) => availability === 'included')).toHaveLength(9);
    // Finder and Tracer highlight GPS but have no matrix: the row decides (spec §5).
    expect(namesOf(systems)).not.toContain('Finder');
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
  it('lists Level 3 on 11 systems, Finder and Tracer among them, with vehicle and page', () => {
    const level = english.levels['3'];
    const systems = level.systems;

    expect(level).toMatchObject({ id: '3', title: 'Recovery' });
    expect(systems).toHaveLength(11);
    expect(systems).toContainEqual({
      id: 'finder',
      name: 'Finder',
      url: '/en/systems/fleet/finder/',
      vehicle: 'trucks & trackers',
    });
    expect(systems).toContainEqual({
      id: 'tracer',
      name: 'Tracer',
      url: '/en/systems/fleet/tracer/',
      vehicle: 'trucks & trackers',
    });
    expect(systems).toContainEqual({
      id: 'motoevo',
      name: 'Moto Evo V2',
      url: '/en/systems/moto/moto-evo-v2/',
      vehicle: 'motorcycle',
    });
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
