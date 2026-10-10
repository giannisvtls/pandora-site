// The explainer island in jsdom (with the showModal() stand-in of src/test/setup.ts), for
// Explainer.test.tsx and explainer-dialog.test.tsx: small props, and a page with explainer buttons
// in <main> beside the island, as BaseLayout puts it.
import { render, screen } from '@testing-library/preact';

import Explainer, { type ExplainerProps } from '../Explainer';

export const PROPS: ExplainerProps = {
  labels: {
    close: 'Close',
    howItWorks: 'How it works',
    needs: 'Needs',
    onTheseSystems: 'On these systems',
    whatYouGet: 'What you get',
    whereItStops: 'Where it stops',
    systemsAtLevel: 'Systems that reach this level',
    included: 'Included',
    optional: 'Optional',
  },
  systems: [
    { name: 'Elite V3', url: '/en/systems/car/elite-v3/', vehicle: 'car' },
    { name: 'Light Pro V2', url: '/en/systems/car/light-pro-v2/', vehicle: 'car' },
    { name: 'Tracer', url: '/en/systems/fleet/tracer/', vehicle: 'trucks & trackers' },
  ],
  features: {
    gps: {
      title: 'GPS/GLONASS tracking',
      what: 'Shows where the vehicle is.',
      how: 'A satellite receiver logs each position.',
      needs: 'An antenna with a view of the sky.',
      systems: [0, 1],
      optional: [1],
    },
    wifi: { title: 'Wi-Fi positioning', what: 'Finds the car indoors.', systems: [0] },
  },
  levels: {
    '3': {
      title: 'Level 3 · Recovery',
      what: 'You know where the vehicle is.',
      items: ['Everything in level 2', 'GPS tracking'],
      stops: 'Cost.',
      systems: [0, 2],
    },
  },
};

// The page: explainer buttons in <main> (two for GPS, as two cards would have; Wi-Fi in a card of
// its own), one with a key the props lack and one with an inherited key, then the island.
export function renderPage(props: ExplainerProps = PROPS): void {
  render(
    <>
      <main id="main" tabIndex={-1}>
        <button type="button" data-fx="gps">
          GPS/GLONASS tracking
        </button>
        <button type="button" data-fx="gps">
          GPS on another card
        </button>
        <div class="card">
          <button type="button" data-fx="wifi">
            Wi-Fi positioning
          </button>
        </div>
        <button type="button" data-lvl="3">
          Level 3 · Recovery
        </button>
        <button type="button" data-fx="nope">
          Unknown
        </button>
        <button type="button" data-fx="constructor">
          Inherited
        </button>
      </main>
      <Explainer {...props} />
    </>,
  );
}

// An explainer button on the page, by its text.
export const opener = (name: string) => screen.getByRole('button', { name });

// The open dialog, by its name.
export const dialogNamed = (name: string) => screen.getByRole('dialog', { name });
