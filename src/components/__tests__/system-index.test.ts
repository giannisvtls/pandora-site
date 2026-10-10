// The interim index's content (P1-8, spec §7) on the snapshot and on fixtures: the home heading,
// the categories in order with their visible systems, each with its image, level, tag, features
// and page.
import { describe, expect, it } from 'vitest';

import { fixtureContent, snapshot } from '../../content/__tests__/rules-fixtures';
import { createQuery } from '../../content/query';
import { systemIndex } from '../system-index';

const site = createQuery(snapshot, { preview: false });
const index = systemIndex(site, 'en');
const systems = index.categories.flatMap((category) => category.systems);

describe('systemIndex', () => {
  it("opens with the home hero's heading, lead and payload", () => {
    expect(index.heading).toEqual({
      lead: 'Your car is not going anywhere',
      payload: 'without you.',
    });
    expect(index.seeSystem).toBe('See the system');
  });

  it('lists the 5 categories in order, with their titles', () => {
    expect(index.categories.map(({ id, title }) => [id, title])).toEqual([
      ['car', 'Car protection'],
      ['moto', 'Motorcycle protection'],
      ['camper', 'Camper protection'],
      ['marine', 'Marine protection'],
      ['fleet', 'Truck protection & GPS trackers'],
    ]);
  });

  it('puts each of the 16 systems under its category, with its page', () => {
    const products = site.products('en');

    expect(systems).toHaveLength(16);
    for (const system of systems) {
      const product = products.find(({ id }) => id === system.id);
      const category = index.categories.find((item) => item.systems.includes(system));
      expect(category?.id, system.id).toBe(product?.category);
      expect(system.url).toBe(`/en/systems/${product?.category ?? ''}/${product?.slug ?? ''}/`);
      expect(system.name).toBe(product?.name.en);
      expect(system.tag).toBe(product?.tag.en);
    }
  });

  it('gives each system its level label, from Site copy and the levels set', () => {
    const level = (id: string) => systems.find((system) => system.id === id)?.level;

    expect(level('elite')).toEqual({ id: '3', label: 'Level 3 · Recovery' });
    expect(level('primo')).toEqual({ id: '2', label: 'Level 2 · Prevention' });
    expect(level('motov2')).toEqual({ id: '1', label: 'Level 1 · Detection' });
    // No matrix: the level that lists it (P1-7).
    expect(level('finder')).toEqual({ id: '3', label: 'Level 3 · Recovery' });
    expect(systems.every((system) => system.level !== undefined)).toBe(true);
  });

  it("gives each system its highlights as features with their titles, in the product's order", () => {
    const elite = systems.find(({ id }) => id === 'elite');
    const product = snapshot.products.find(({ id }) => id === 'elite');

    expect(elite?.features.map(({ key }) => key)).toEqual(product?.highlights);
    expect(elite?.features.find(({ key }) => key === 'gps')?.title).toBe('GPS/GLONASS tracking');
    expect(systems.every((system) => system.features.length > 0)).toBe(true);
  });

  it("gives each system its package shot, with the media item's alt text (A19)", () => {
    const elite = systems.find(({ id }) => id === 'elite');

    expect(elite?.image.alt).toBe('Pandora Elite V3 package');
    expect(elite?.image.src).toMatchObject({ width: 600, height: 600, format: 'webp' });
    expect(elite?.image.src.src).toContain('pandora-elite-v3-package');
  });

  it('leaves out a category with no visible system, and the level of a system without one', () => {
    const content = fixtureContent();
    // `light` has neither a matrix nor a level that lists it.
    const light = structuredClone(content.products.find(({ id }) => id === 'light'));
    if (light !== undefined) Reflect.deleteProperty(light, 'matrix');
    // The fixture's images have no file on disk: a snapshot package shot stands in.
    const products = content.products
      .map((product) => (light !== undefined && product.id === 'light' ? light : product))
      .map((product) => ({ ...product, image: 'pandora-elite-v3-package' }));
    const levels = content.levels.map((level) => ({
      ...level,
      systems: level.systems.filter((id) => id !== 'light'),
    }));
    const fixture = systemIndex(
      createQuery({ ...content, products, levels }, { preview: false }),
      'en',
    );
    const shown = fixture.categories[0]?.systems.find(({ id }) => id === 'light');

    // The fixture's products are all car systems.
    expect(fixture.categories.map(({ id }) => id)).toEqual(['car']);
    expect(shown).toBeDefined();
    expect(shown?.level).toBeUndefined();
  });
});
