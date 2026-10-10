// A small reader for the repo's own stylesheets, for tests: every style rule with the at-rules it
// sits in, its selectors and its declarations, comments removed. Enough for tokens.css and
// base.css (plain rules, some inside @media); not a general CSS parser.
import { readFileSync } from 'node:fs';

export interface CssRule {
  // The at-rules around the rule (`@media (prefers-reduced-motion: reduce)`), or ''.
  readonly scope: string;
  readonly selectors: readonly string[];
  readonly declarations: ReadonlyMap<string, string>;
}

const collapse = (value: string) => value.trim().replaceAll(/\s+/gu, ' ');

// A selector in one canonical spelling: single spaces, single quotes, no spaces around `>`.
export const canonicalSelector = (selector: string) =>
  collapse(selector).replaceAll('"', "'").replaceAll(/ ?> ?/gu, ' > ');

// A value in one canonical spelling, so `rgba(14,26,36,.74)` (the design file) equals
// `rgba(14, 26, 36, 0.74)` (Prettier's): lower case, no space after a comma, a leading zero.
export const canonicalValue = (value: string) =>
  collapse(value)
    .toLowerCase()
    .replaceAll(/ ?, ?/gu, ',')
    .replaceAll(
      /(^|[^\d.])\.(\d)/gu,
      (_match, before: string, digit: string) => `${before}0.${digit}`,
    );

// `name: value; ...` -> a map, values canonical.
export function declarationsOf(body: string): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const part of body.split(';')) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    declarations.set(collapse(part.slice(0, colon)), canonicalValue(part.slice(colon + 1)));
  }
  return declarations;
}

export function cssRules(text: string): CssRule[] {
  const source = text.replaceAll(/\/\*[\s\S]*?\*\//gu, '');
  const rules: CssRule[] = [];
  const scopes: string[] = [];
  let prelude = '';
  let index = 0;
  while (index < source.length) {
    const char = source.charAt(index);
    if (char === '{' && prelude.trimStart().startsWith('@')) {
      scopes.push(collapse(prelude));
      prelude = '';
    } else if (char === '{') {
      const end = source.indexOf('}', index);
      rules.push({
        scope: scopes.join(' '),
        selectors: prelude.split(',').map((selector) => canonicalSelector(selector)),
        declarations: declarationsOf(source.slice(index + 1, end)),
      });
      prelude = '';
      index = end;
    } else if (char === '}') {
      scopes.pop();
      prelude = '';
    } else {
      prelude += char;
    }
    index += 1;
  }
  return rules;
}

export const readCss = (file: string) =>
  cssRules(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));
