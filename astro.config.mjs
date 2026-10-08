// astro.config.mjs
import preact from '@astrojs/preact';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://invetec.eu',
  output: 'static',
  integrations: [preact()],
  i18n: {
    locales: ['el', 'en', 'it', 'sq'],
    defaultLocale: 'el',
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
});
