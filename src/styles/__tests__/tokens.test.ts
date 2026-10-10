// The design tokens (spec §6): every token of the design file's nightwatch.css, lines 2-32,
// copied below as the design writes them, is declared in src/styles/tokens.css with the same value
// in the same scope, and nowhere else. The type tokens --display and --body are the Fonts API's
// CSS variables (astro.config.mjs): the self-hosted face, then the design's fallback list.
import { describe, expect, it } from 'vitest';

import { canonicalSelector, declarationsOf, readCss } from './css-rules';
import config from '../../../astro.config.mjs';
import { byCodeUnit } from '../../../scripts/crawl/output';

// nightwatch.css:2-20: the light tokens of :root.
const LIGHT_SCOPE = [':root'];
const LIGHT = `
  --night:#f4f7fa; --night-rgb:244,247,250; --field:#ffffff; --field-2:#e9eef3; --petrol:#003a55;
  --blue:#3077ac; --blue-soft:#2b6d9e;
  --armed:#177a43; --alert:#9a5400;
  --ink:#0e1a24; --ink-2:rgba(14,26,36,.74); --ink-3:rgba(14,26,36,.64);
  --rule:rgba(14,26,36,.16); --rule-2:rgba(14,26,36,.09);
  --plate:#eef2f5;
  --gap-fill:rgba(154,84,0,.07);
  --lw:none; --ld:block;
  --map-filter:none;
  --display:'Sofia Sans Extra Condensed','Roboto Condensed','Arial Narrow',sans-serif;
  --body:'Sofia Sans','Segoe UI',system-ui,sans-serif;
  --ease:cubic-bezier(.165,.84,.44,1);
  --gutter:clamp(20px,4vw,64px);
  --hdr:88px;
  color-scheme:light;
`;

// nightwatch.css:21-32: the dark scope, the whole page under data-theme="dark" plus the surfaces
// that are always night.
const DARK_SCOPE = [
  ':root[data-theme="dark"]',
  '.hero',
  '#log',
  '.pg-head.img',
  '.band',
  '.shot',
  '.hdr:not(.solid)',
  '.m-nav',
];
const DARK = `
  --night:#111a22; --night-rgb:17,26,34; --field:#1a2530; --field-2:#223040; --petrol:#003a55;
  --blue:#60a1d2; --blue-soft:#60a1d2;
  --armed:#38e07b; --alert:#ffb02e;
  --ink:#f2f6f8; --ink-2:rgba(242,246,248,.78); --ink-3:rgba(242,246,248,.6);
  --rule:rgba(242,246,248,.16); --rule-2:rgba(242,246,248,.09);
  --lw:block; --ld:none;
  --gap-fill:rgba(255,176,46,.08);
  --map-filter:invert(1) hue-rotate(185deg) brightness(.8) saturate(.35) contrast(.95);
  color-scheme:dark;
`;

// The tokens the Fonts API declares instead of tokens.css.
const FONT_TOKENS = new Set(['--display', '--body']);

const scopeKey = (selectors: readonly string[]) =>
  selectors
    .map((selector) => canonicalSelector(selector))
    .toSorted(byCodeUnit)
    .join(', ');

// Every declaration of a token (a custom property or color-scheme) in `rules`, as
// `scope | name: value` lines, sorted.
function tokenLines(
  rules: readonly { selectors: readonly string[]; declarations: ReadonlyMap<string, string> }[],
) {
  return rules
    .flatMap(({ selectors, declarations }) =>
      [...declarations]
        .filter(([name]) => name.startsWith('--') || name === 'color-scheme')
        .map(([name, value]) => `${scopeKey(selectors)} | ${name}: ${value}`),
    )
    .toSorted(byCodeUnit);
}

const tokens = readCss('tokens.css');
const design = [
  { selectors: LIGHT_SCOPE, declarations: declarationsOf(LIGHT) },
  { selectors: DARK_SCOPE, declarations: declarationsOf(DARK) },
];

describe('tokens.css', () => {
  it('declares every token of the design, same value, same scope, outside any at-rule', () => {
    const fromDesign = design.map(({ selectors, declarations }) => ({
      selectors,
      declarations: new Map([...declarations].filter(([name]) => !FONT_TOKENS.has(name))),
    }));

    expect(declarationsOf(LIGHT).size).toBe(25);
    expect(declarationsOf(DARK).size).toBe(19);
    expect(tokens.every(({ scope }) => scope === '')).toBe(true);
    expect(tokenLines(tokens)).toEqual(tokenLines(fromDesign));
  });

  it('gives the always-night surfaces the dark text colour, and the 02:14 log its night', () => {
    const surfaces = tokens.find(
      ({ selectors, declarations }) =>
        scopeKey(selectors) === scopeKey(DARK_SCOPE.slice(1)) && declarations.has('color'),
    );
    const log = tokens.find(({ selectors }) => scopeKey(selectors) === '#log');

    expect(surfaces?.declarations.get('color')).toBe('var(--ink)');
    expect(log?.declarations.get('background')).toBe('var(--night)');
  });
});

describe('the type tokens', () => {
  it.each([...FONT_TOKENS])('%s is the Fonts API variable with the design family list', (token) => {
    const family = config.fonts?.find(({ cssVariable }) => cssVariable === token);
    const designList = design[0]?.declarations
      .get(token)
      ?.split(',')
      .map((name) => name.replaceAll("'", ''));

    expect(family).toBeDefined();
    expect([family?.name, ...(family?.fallbacks ?? [])].map((name) => name?.toLowerCase())).toEqual(
      designList,
    );
  });
});
