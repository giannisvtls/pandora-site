import { describe, expect, it } from 'vitest';

import { HOSTS, POLITENESS, SITEMAP_SEED_PATHS, TOOL, USER_AGENT } from '../config';

describe('crawl config', () => {
  it('keeps the spec politeness defaults', () => {
    expect(POLITENESS.concurrency).toBe(2);
    expect(POLITENESS.gapMs).toBe(250);
    expect(POLITENESS.timeoutMs).toBe(20_000);
    expect(POLITENESS.retries).toBe(2);
    expect(POLITENESS.maxRedirects).toBe(5);
  });

  it('crawls exactly the two spec hosts, invetec.eu rooted in Greek', () => {
    expect(HOSTS).toStrictEqual([
      { origin: 'https://invetec.eu', rootLang: 'el' },
      { origin: 'https://lenovo.invetec.eu', rootLang: null },
    ]);
  });

  it('seeds the Yoast and WordPress-core sitemap indexes', () => {
    expect(SITEMAP_SEED_PATHS).toStrictEqual(['/sitemap_index.xml', '/wp-sitemap.xml']);
  });

  it('sends a User-Agent that names the purpose and carries no contact data', () => {
    expect(USER_AGENT).toContain(`${TOOL.name}/${TOOL.version}`);
    expect(USER_AGENT).toMatch(/read-only/);
    expect(USER_AGENT).not.toMatch(/@|mailto:|tel:|\+?\d[\d ]{7,}/);
  });
});
