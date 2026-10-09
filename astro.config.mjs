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
  // `astro preview` must fail when 4321 is taken instead of moving to 4322, where Playwright's
  // webServer never looks (it would time out after 120 s).
  vite: { preview: { strictPort: true } },
});
