import { describe, expect, it } from 'vitest';

import { isFetchGuarded } from '../../scripts/crawl/__tests__/fetch-guard';

// vitest.config.ts installs the loopback-only fetch guard for every test file, site tests too.
describe('the fetch guard in site tests', () => {
  it('is installed', () => {
    expect(isFetchGuarded()).toBe(true);
  });
});
