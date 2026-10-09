import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// `astro preview` does not serve public/_redirects, so the root redirect is checked here.
const REDIRECTS = new URL('../../public/_redirects', import.meta.url);

describe('public/_redirects', () => {
  it('sends the root to /en/ with a 302 on line 1', () => {
    const [firstLine] = readFileSync(REDIRECTS, 'utf8').split('\n', 1);

    expect(firstLine).toBe('/  /en/  302');
  });
});
