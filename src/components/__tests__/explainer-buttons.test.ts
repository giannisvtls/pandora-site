// The explainer buttons (spec §8) through the Container API: plain buttons that name the feature
// (`data-fx`) or the level (`data-lvl`) the explainer island opens, announced as opening a dialog,
// each followed by its label as plain text, which shows instead of the button without JavaScript
// (A11: no control that does nothing).
import { readFileSync } from 'node:fs';

import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import { cssRules } from '../../styles/__tests__/css-rules';
import FeatureButton from '../FeatureButton.astro';
import LevelButton from '../LevelButton.astro';
import { between, textOf } from './shell-fixtures';

const container = await AstroContainer.create();

// The text that follows the button: its tag and text.
function textAfter(html: string): { tag: string; text: string } {
  const rest = html.slice(html.indexOf('</button>') + '</button>'.length);
  const span = between(rest, '<span', '</span>');
  return { tag: span.slice(0, span.indexOf('>') + 1), text: textOf(span) };
}

// The `display` each selector of a component's <style> takes, with its scope.
function displays(file: string): string[] {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const style = between(source, '<style>', '</style>').slice('<style>'.length);
  return cssRules(style).flatMap(({ selectors, declarations }) => {
    const display = declarations.get('display');
    return display === undefined ? [] : selectors.map((selector) => `${selector}: ${display}`);
  });
}

// The button's opening tag, and its text with the tags removed and the spaces collapsed.
function buttonOf(html: string): { tag: string; text: string } {
  const button = between(html, '<button', '</button>');
  return {
    tag: button.slice(0, button.indexOf('>') + 1),
    text: textOf(button).replaceAll(/\s+/gu, ' '),
  };
}

describe('FeatureButton', () => {
  it('is a button for the feature, showing its title, that opens a dialog', async () => {
    const html = await container.renderToString(FeatureButton, {
      props: { feature: 'gps', title: 'GPS/GLONASS tracking' },
    });
    const { tag, text } = buttonOf(html);

    expect(tag).toMatch(/^<button type="button" class="fx" data-fx="gps" aria-haspopup="dialog"/u);
    expect(text).toBe('GPS/GLONASS tracking');
    expect(html).toMatch(/<svg [^>]*aria-hidden="true"/u);
  });

  it('is followed by its title as text, which shows instead of the button without JavaScript', async () => {
    const html = await container.renderToString(FeatureButton, {
      props: { feature: 'gps', title: 'GPS/GLONASS tracking' },
    });
    const { tag, text } = textAfter(html);

    expect(tag).toMatch(/^<span class="fx-text"/u);
    expect(text).toBe('GPS/GLONASS tracking');
    expect(displays('../FeatureButton.astro')).toEqual([
      '.fx: inline-flex',
      '.fx-text: none',
      ':global(html:not(.js)) .fx: none',
      ':global(html:not(.js)) .fx-text: inline',
    ]);
  });
});

describe('LevelButton', () => {
  it.each([
    ['1', 'Level 1 · Detection', 'lvl'],
    ['2', 'Level 2 · Prevention', 'lvl l2'],
    ['3', 'Level 3 · Recovery', 'lvl l3'],
  ])(
    'is a button for level %s, showing its tag, that opens a dialog',
    async (level, label, tag) => {
      const html = await container.renderToString(LevelButton, { props: { level, label } });
      const button = buttonOf(html);

      expect(button.tag).toMatch(
        new RegExp(
          `^<button type="button" class="fx chipfx" data-lvl="${level}" aria-haspopup="dialog"`,
          'u',
        ),
      );
      expect(button.text).toBe(label);
      expect(html).toMatch(new RegExp(`<span class="${tag}"`, 'u'));
      // The feature buttons' info mark after the tag, decorative (the name stays the tag).
      expect(between(html, '<button', '</button>')).toMatch(
        new RegExp(`${label}<svg [^>]*aria-hidden="true"`, 'u'),
      );
      // The same tag as text, shown instead of the button without JavaScript.
      const text = textAfter(html);
      expect(text.tag).toMatch(
        new RegExp(`^<span class="${tag.replace('lvl', 'lvl lvl-text')}"`, 'u'),
      );
      expect(text.text).toBe(label);
      expect(html.slice(html.indexOf('</button>'))).not.toContain('<svg');
    },
  );

  it('shows the tag as text instead of the button without JavaScript', () => {
    expect(displays('../LevelButton.astro')).toEqual([
      '.chipfx: inline-block',
      '.lvl: inline-block',
      '.chipfx .lvl: inline-flex',
      '.lvl-text: none',
      ':global(html:not(.js)) .chipfx: none',
      ':global(html:not(.js)) .lvl-text: inline-block',
    ]);
  });
});
