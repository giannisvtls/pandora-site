// The root 404 page (src/pages/404.astro, spec §9) through the Container API, on fixture content:
// it is in the root's language (rules.ts `rootLanguage`, where the root redirect leads), English
// while only English is live and Greek once Greek is live, not merely the first built language.
// The query module's adapter is replaced by a query over the fixtures, as in BaseLayout.test.ts.
import { describe, expect, it, vi } from 'vitest';

import { fixtureContent, withLanguage } from '../../content/__tests__/rules-fixtures';
import { createQuery, type Query } from '../../content/query';
import type { ContentData } from '../../content/rules';
import RootNotFound from '../../pages/404.astro';
import { createContainer } from '../../test/container';

const state = vi.hoisted(() => ({ query: undefined as Query | undefined }));

vi.mock(import('../../content/query'), async (importOriginal) => ({
  ...(await importOriginal()),
  siteQuery: () => {
    if (state.query === undefined) throw new Error('No fixture query');
    return Promise.resolve(state.query);
  },
}));

const container = await createContainer({ astroConfig: { site: 'https://invetec.eu' } });

// The root 404 page as the build renders it over `content`.
async function rootNotFound(content: ContentData): Promise<string> {
  state.query = createQuery(content, { preview: false });
  return container.renderToString(RootNotFound);
}

describe('the root 404 page', () => {
  it('is in English, linking /en/, while only English is live', async () => {
    const html = await rootNotFound(fixtureContent(['en']));

    expect(html).toMatch(/<html lang="en"[^>]*>/u);
    expect(html).toContain('<a class="cta" href="/en/"');
  });

  it('is in Greek, linking /el/, once Greek is live beside English', async () => {
    // English is built first (LOCALES order), so the first built language would be wrong.
    const html = await rootNotFound(withLanguage(fixtureContent(['en', 'el']), 'el'));

    expect(html).toMatch(/<html lang="el"[^>]*>/u);
    expect(html).toContain('<a class="cta" href="/el/"');
    expect(html).toContain('<meta name="robots" content="noindex">');
  });
});
