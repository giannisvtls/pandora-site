// The explainer buttons (spec §8) through the Container API: plain buttons that name the feature
// (`data-fx`) or the level (`data-lvl`) the explainer island (slice 10) opens, announced as opening
// a dialog.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import FeatureButton from '../FeatureButton.astro';
import LevelButton from '../LevelButton.astro';
import { between, textOf } from './shell-fixtures';

const container = await AstroContainer.create();

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
    },
  );
});
