// base.css (spec §6): the element defaults and utilities of the design, the focus ring, and the
// reveal grammar, whose start states hide or move content only under html.js (A11) and which
// reduced motion turns off.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { readCss, type CssRule } from './css-rules';

const base = readCss('base.css');

const REDUCED_MOTION = '@media print, (prefers-reduced-motion: reduce)';

const SRC_DIR = fileURLToPath(new URL('../../', import.meta.url));

// The stylesheets and components under src/ that declare `all`, comments left out.
function filesDeclaringAll(): string[] {
  return readdirSync(SRC_DIR, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:astro|css)$/u.test(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name))
    .filter((file) => {
      const text = readFileSync(file, 'utf8')
        .split('*/')
        .map((part) => part.split('/*', 1)[0])
        .join('');
      return /(?:^|[;{\s])all\s*:/mu.test(text);
    })
    .map((file) => path.relative(SRC_DIR, file).replaceAll('\\', '/'));
}

// The rule for `selector` in `scope` ('' for none), with its declarations.
function ruleFor(selector: string, scope = ''): CssRule | undefined {
  return base.find(({ selectors, scope: at }) => at === scope && selectors.includes(selector));
}

// A declaration that hides or moves content until the reveal script adds `.in`.
function isStartState(rule: CssRule): boolean {
  const transform = rule.declarations.get('transform');
  return (
    rule.declarations.get('opacity') === '0' ||
    (transform !== undefined && transform !== 'none') ||
    rule.declarations.has('content')
  );
}

describe('base.css', () => {
  it.each([
    ['.wrap', 'padding-inline', 'var(--gutter)'],
    ['.b', 'color', 'var(--blue-soft)'],
    ['.g', 'color', 'var(--armed)'],
    ['.muted', 'color', 'var(--ink-2)'],
    ['.num', 'font-variant-numeric', 'tabular-nums'],
    ['.sr', 'clip', 'rect(0 0 0 0)'],
    ['::selection', 'background', 'var(--armed)'],
    [':focus-visible', 'outline', '2px solid var(--armed)'],
    ['body', 'font-family', 'var(--body)'],
    ['h1', 'font-family', 'var(--display)'],
  ])('styles %s with %s: %s, as the design does', (selector, property, value) => {
    expect(ruleFor(selector)?.declarations.get(property)).toBe(value);
  });

  it('starts every reveal state that hides or moves content under html.js only (A11)', () => {
    // The revealed states (`.in`) move content back into place; they are checked below.
    const startStates = base.filter(
      (rule) =>
        rule.scope === '' &&
        isStartState(rule) &&
        rule.selectors.every((selector) => !/\.in\b/u.test(selector)),
    );

    expect(startStates.flatMap(({ selectors }) => selectors)).toEqual([
      'html.js .rv',
      'html.js .rv-g',
      'html.js .zoom img',
      'html.js .wipe::after',
      'html.js .line-rv > span',
    ]);
  });

  it('reveals each state once the element has `.in`', () => {
    expect(ruleFor('html.js .rv.in')?.declarations.get('opacity')).toBe('1');
    expect(ruleFor('html.js .zoom.in img')?.declarations.get('transform')).toBe('scale(1)');
    expect(ruleFor('html.js .wipe.in::after')?.declarations.get('transform')).toBe(
      'translatex(101%)',
    );
    expect(ruleFor('html.js .line-rv.in > span')?.declarations.get('transform')).toBe('none');
  });

  it('shows everything at once under reduced motion and in print', () => {
    for (const selector of [
      'html.js .rv',
      'html.js .zoom img',
      'html.js .wipe::after',
      'html.js .line-rv > span',
    ]) {
      expect(ruleFor(selector, REDUCED_MOTION)?.declarations, selector).toEqual(
        new Map([
          ['transition', 'none !important'],
          ['transform', 'none !important'],
          ['opacity', '1 !important'],
        ]),
      );
    }
    expect(ruleFor('html', '@media (prefers-reduced-motion: no-preference)')).toBeDefined();
    expect(ruleFor('html')).toBeUndefined();
  });

  it('keeps focus targets clear of the fixed header with scroll-margin-top (SC 2.4.11)', () => {
    expect(ruleFor('main *')?.declarations.get('scroll-margin-top')).toBe(
      'calc(var(--hdr) + 16px)',
    );
    expect(ruleFor('main')?.declarations.get('scroll-margin-top')).toBe('calc(var(--hdr) + 16px)');
    expect(ruleFor('footer *')?.declarations.get('scroll-margin-top')).toBe(
      'calc(var(--hdr) + 16px)',
    );
    expect(base.some(({ declarations }) => declarations.has('scroll-padding-top'))).toBe(false);
  });

  it('is never undone by an `all` reset: it would clear the scroll margin (and the focus ring)', () => {
    expect(filesDeclaringAll()).toEqual([]);
  });
});
