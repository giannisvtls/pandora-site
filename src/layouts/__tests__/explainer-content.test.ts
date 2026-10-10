// The explainer island's props (spec §8): on the snapshot in English, every feature and level of
// the explainer data (spec §5) trimmed to what the dialog shows, the systems one table the views
// refer to by index, the labels from Site copy `common`; on fixtures, a preview language without
// the feature and level texts gets no feature or level to open.
import { describe, expect, it } from 'vitest';

import type { ExplainerProps } from '../../components/islands/Explainer';
import { fixtureContent, snapshot, withLanguage } from '../../content/__tests__/rules-fixtures';
import { createQuery } from '../../content/query';
import { explainerContent } from '../explainer-content';

const query = createQuery(snapshot, { preview: false });
const props = explainerContent(query, 'en');

// The systems a view lists, by name, each with what the view shows beside it.
function listed(
  { systems }: ExplainerProps,
  view: { readonly systems: readonly number[]; readonly optional?: readonly number[] },
): string[] {
  return view.systems.map((index) => {
    const system = systems[index];
    const beside = view.optional?.includes(index) ? 'Optional' : 'Included';
    const name = system?.name ?? `#${String(index)}`;
    return `${name} ${beside}`;
  });
}

describe('the explainer props', () => {
  it('take every label from Site copy common', () => {
    expect(props.labels).toEqual({
      close: 'Close',
      howItWorks: 'How it works',
      needs: 'Needs',
      onTheseSystems: 'On these systems',
      whatYouGet: 'What you get',
      whereItStops: 'Where it stops',
      systemsAtLevel: 'Systems that reach this level',
      included: 'Included',
      optional: 'Optional',
    });
  });

  it('list each visible system once, in order, with its page and vehicle word', () => {
    const products = query.products('en');

    expect(props.systems.map(({ name }) => name)).toEqual(products.map(({ name }) => name.en));
    expect(props.systems.map(({ url }) => url)).toEqual(products.map(({ url }) => url));
    expect(props.systems.find(({ name }) => name === 'Tracer')).toEqual({
      name: 'Tracer',
      url: '/en/systems/fleet/tracer/',
      vehicle: 'trucks & trackers',
    });
  });

  it('give GPS its texts and 11 systems, Light Pro V2 and Primo Optional', () => {
    const gps = props.features.gps;
    const feature = snapshot.features.find(({ id }) => id === 'gps');

    expect(gps).toMatchObject({
      title: 'GPS/GLONASS tracking',
      what: feature?.what.en,
      how: feature?.how?.en,
      needs: feature?.needs?.en,
    });
    const systems = gps === undefined ? [] : listed(props, gps);
    expect(systems).toHaveLength(11);
    expect(systems.filter((entry) => entry.endsWith(' Optional'))).toEqual([
      'Light Pro V2 Optional',
      'Primo Optional',
    ]);
  });

  it('give Wi-Fi positioning Elite V3 alone, and no key for a text it lacks', () => {
    const wifi = props.features.wifi;

    expect(wifi === undefined ? [] : listed(props, wifi)).toEqual(['Elite V3 Included']);
    expect(wifi).not.toHaveProperty('needs');
    expect(wifi).not.toHaveProperty('optional');
    expect(Object.keys(props.features)).toEqual(snapshot.features.map(({ id }) => id));
  });

  it('title Level 3 "Level 3 · Recovery" and list its 11 systems, Finder and Tracer among them', () => {
    const level = props.levels['3'];
    const source = snapshot.levels.find(({ id }) => id === '3');

    expect(level).toMatchObject({
      title: 'Level 3 · Recovery',
      what: source?.what.en,
      items: source?.items.map((item) => item.en),
      stops: source?.stops.en,
    });
    const names = (level?.systems ?? []).map((index) => props.systems[index]?.name);
    expect(names).toHaveLength(11);
    expect(names).toEqual(expect.arrayContaining(['Finder', 'Tracer']));
    expect(Object.keys(props.levels)).toEqual(['1', '2', '3']);
  });

  it('give a preview language without feature and level texts nothing to open', () => {
    const content = fixtureContent();
    const preview = createQuery(
      { ...content, siteCopyCommon: withLanguage(content.siteCopyCommon, 'el') },
      { preview: true },
    );
    const greek = explainerContent(preview, 'el');

    expect(greek.features).toEqual({});
    expect(greek.levels).toEqual({});
    expect(greek.systems.map(({ url }) => url)).toEqual(
      preview.products('el').map(({ url }) => url),
    );
  });
});
