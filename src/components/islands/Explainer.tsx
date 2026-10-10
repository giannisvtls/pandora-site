// The explainer (spec §8), a Preact island hydrated on every page once the browser is idle
// (`client:idle`, BaseLayout.astro). Every feature and level button on the page (`data-fx`,
// `data-lvl`, FeatureButton.astro and LevelButton.astro) opens a native modal <dialog> (A10): a
// panel on the right with the feature's title, what it does, "How it works", "Needs" and "On these
// systems" (each system a link to its page, Included or Optional), or the level's title, what it
// is, "What you get", "Where it stops" and "Systems that reach this level" (each with its vehicle
// word). A section without text is left out. Focus goes to the close button; Escape, the close
// button, a click on the backdrop and following a link close it, and focus goes back to the
// button that opened it. The page under it does not scroll (Explainer.css). The behaviour is in
// explainer-dialog.ts; without JavaScript the buttons are hidden and their names stay as text
// (A11).
//
// Everything it shows comes in as props (layouts/explainer-content.ts), plain data in the page's
// language: it imports nothing from the content modules, so no zod or media glob reaches the
// browser. Systems are one table the views refer to by index, which keeps the props small.
import { useLayoutEffect, useRef, useState } from 'preact/hooks';

import { openDialog, wireExplainer } from './explainer-dialog';
import './Explainer.css';

// A system the explainers list: its name, its page and the vehicle word of its category.
export interface ExplainerSystem {
  readonly name: string;
  readonly url: string;
  readonly vehicle: string;
}

export interface FeatureView {
  readonly title: string;
  readonly what?: string;
  readonly how?: string;
  readonly needs?: string;
  // "On these systems": indexes into `ExplainerProps.systems`, in order; those in `optional` are
  // Optional, the others Included.
  readonly systems: readonly number[];
  readonly optional?: readonly number[];
}

export interface LevelView {
  // "Level 3 · Recovery" (Site copy `common.level`).
  readonly title: string;
  readonly what?: string;
  readonly items: readonly string[];
  readonly stops?: string;
  // "Systems that reach this level": indexes into `ExplainerProps.systems`.
  readonly systems: readonly number[];
}

export interface ExplainerProps {
  // Site copy `common`: the close button's name, the section headings (`howItWorks`,
  // `explainer.*`) and the matrix values.
  readonly labels: {
    readonly close: string;
    readonly howItWorks: string;
    readonly needs: string;
    readonly onTheseSystems: string;
    readonly whatYouGet: string;
    readonly whereItStops: string;
    readonly systemsAtLevel: string;
    readonly included: string;
    readonly optional: string;
  };
  readonly systems: readonly ExplainerSystem[];
  // By feature key and by level id ('1', '2', '3').
  readonly features: Readonly<Record<string, FeatureView>>;
  readonly levels: Readonly<Record<string, LevelView>>;
}

type Labels = ExplainerProps['labels'];

type View =
  | { readonly kind: 'feature'; readonly feature: FeatureView }
  | { readonly kind: 'level'; readonly level: LevelView };

// The dialog's name is its title; the lists are named by their headings.
const TITLE_ID = 'fx-title';
const SYSTEMS_ID = 'fx-systems';
const ITEMS_ID = 'fx-items';

// What a button opens: its feature or level, when the props have it (own keys only, so a key such
// as `constructor` opens nothing).
function viewFor(button: HTMLElement, { features, levels }: ExplainerProps): View | undefined {
  const { fx, lvl } = button.dataset;
  const feature = fx !== undefined && Object.hasOwn(features, fx) ? features[fx] : undefined;
  const level = lvl !== undefined && Object.hasOwn(levels, lvl) ? levels[lvl] : undefined;
  if (feature !== undefined) return { kind: 'feature', feature };
  return level === undefined ? undefined : { kind: 'level', level };
}

// A section: its heading and its text; nothing when it has no text.
function Section({
  heading,
  text,
}: {
  readonly heading: string;
  readonly text: string | undefined;
}) {
  if (text === undefined) return null;
  return (
    <>
      <h3>{heading}</h3>
      <p>{text}</p>
    </>
  );
}

function FeatureBody({
  feature,
  props,
}: {
  readonly feature: FeatureView;
  readonly props: ExplainerProps;
}) {
  const { labels, systems } = props;
  const optional = new Set(feature.optional);
  const listed = feature.systems.flatMap((index) => {
    const system = systems[index];
    return system === undefined ? [] : { ...system, isOptional: optional.has(index) };
  });
  return (
    <>
      <h2 id={TITLE_ID}>{feature.title}</h2>
      {feature.what !== undefined && <p class="fx-what">{feature.what}</p>}
      <Section heading={labels.howItWorks} text={feature.how} />
      <Section heading={labels.needs} text={feature.needs} />
      {listed.length > 0 && (
        <>
          <h3 id={SYSTEMS_ID}>{labels.onTheseSystems}</h3>
          <ul class="fx-on" aria-labelledby={SYSTEMS_ID}>
            {listed.map(({ name, url, isOptional }) => (
              <li key={url}>
                <a href={url}>{name}</a>
                <span class={isOptional ? 'v opt' : 'v yes'}>
                  {isOptional ? labels.optional : labels.included}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function LevelBody({
  level,
  props,
}: {
  readonly level: LevelView;
  readonly props: ExplainerProps;
}) {
  const { labels, systems } = props;
  const listed = level.systems.flatMap((index) => systems[index] ?? []);
  return (
    <>
      <h2 id={TITLE_ID}>{level.title}</h2>
      {level.what !== undefined && <p class="fx-what">{level.what}</p>}
      {level.items.length > 0 && (
        <>
          <h3 id={ITEMS_ID}>{labels.whatYouGet}</h3>
          <ul class="fx-list" aria-labelledby={ITEMS_ID}>
            {level.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
      <Section heading={labels.whereItStops} text={level.stops} />
      {listed.length > 0 && (
        <>
          <h3 id={SYSTEMS_ID}>{labels.systemsAtLevel}</h3>
          <ul class="fx-on" aria-labelledby={SYSTEMS_ID}>
            {listed.map(({ name, url, vehicle }) => (
              <li key={url}>
                <a href={url}>{name}</a>
                <span class="muted sm">{vehicle}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

// The close button: the design's X, drawn with `currentColor` (visible in forced colors).
function CloseButton({ labels }: { readonly labels: Labels }) {
  return (
    <button class="fx-close" type="button" aria-label={labels.close}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
}

export default function Explainer(props: ExplainerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<View | undefined>(undefined);

  // The behaviour (explainer-dialog.ts). A layout effect: Preact runs it inside hydrate(), before
  // Astro removes the island's `ssr` attribute, so the buttons work from that moment.
  useLayoutEffect(() => {
    const element = dialog.current;
    if (element === null) return;
    return wireExplainer(element, {
      viewFor: (button) => viewFor(button, props),
      show: setView,
    });
  }, [props]);

  // Once a view has rendered, the dialog opens on it.
  useLayoutEffect(() => {
    if (view !== undefined && dialog.current !== null) openDialog(dialog.current);
  }, [view]);

  return (
    <dialog ref={dialog} class="fx-panel" aria-labelledby={TITLE_ID}>
      <div class="fx-body">
        <CloseButton labels={props.labels} />
        {view?.kind === 'feature' && <FeatureBody feature={view.feature} props={props} />}
        {view?.kind === 'level' && <LevelBody level={view.level} props={props} />}
      </div>
    </dialog>
  );
}
