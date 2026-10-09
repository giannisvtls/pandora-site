import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import BaseLayout from '../BaseLayout.astro';

describe('BaseLayout', () => {
  it('renders the document shell: lang, title, skip link and main landmark', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(BaseLayout, {
      props: { lang: 'en', title: 'Layout test title' },
      slots: { default: '<p>Slot content</p>' },
    });

    expect(html).toMatch(/<html lang="en">/);
    expect(html).toContain('<title>Layout test title</title>');
    // The skip link is the first element in <body>, so it is the first focusable element.
    expect(html).toMatch(/<body>\s*<a href="#main">Skip to main content<\/a>/);
    expect(html).toMatch(/<main id="main" tabindex="-1">\s*<p>Slot content<\/p>\s*<\/main>/);
  });
});
