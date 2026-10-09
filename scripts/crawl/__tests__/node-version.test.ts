import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { EXIT_CODES } from '../cli';
import { MIN_NODE_MAJOR, nodeVersionProblem, UNSUPPORTED_NODE_EXIT_CODE } from '../node-version';

describe('nodeVersionProblem', () => {
  it.each(['24.0.0', '24.13.1', '25.2.0', '30.0.0'])('accepts Node %s', (version) => {
    expect(nodeVersionProblem(version)).toBeNull();
  });

  it.each(['20.19.5', '22.12.0', '23.11.1', '18.0.0', 'unknown', ''])(
    'refuses Node %s with a clear message',
    (version) => {
      expect(nodeVersionProblem(version)).toBe(
        `npm run crawl needs Node 24 or newer, this is Node ${version}; nothing was requested.\n`,
      );
    },
  );

  it('names the command and what it did not do', () => {
    expect(
      nodeVersionProblem('20.19.5', 'npm run crawl:summary', 'nothing was read or written'),
    ).toBe(
      'npm run crawl:summary needs Node 24 or newer, this is Node 20.19.5; nothing was read or written.\n',
    );
  });

  it('asks for Node 24 and exits with the bad-arguments code', () => {
    expect(MIN_NODE_MAJOR).toBe(24);
    expect(UNSUPPORTED_NODE_EXIT_CODE).toBe(EXIT_CODES.usage);
  });
});

describe.each([
  ['crawl.ts', "await import('./cli')"],
  ['summary.ts', "await import('./summary-cli')"],
])('%s', (file, load) => {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

  it('checks the Node version before it loads anything else', () => {
    const staticImports = source.match(/^import .*$/gm) ?? [];

    expect(staticImports).toStrictEqual([
      "import { nodeVersionProblem, UNSUPPORTED_NODE_EXIT_CODE } from './node-version';",
    ]);
    expect(source.indexOf('nodeVersionProblem(')).toBeGreaterThan(-1);
    expect(source.indexOf('nodeVersionProblem(')).toBeLessThan(source.indexOf(load));
  });
});
