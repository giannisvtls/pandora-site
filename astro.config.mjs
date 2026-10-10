// astro.config.mjs
import preact from '@astrojs/preact';
import { defineConfig } from 'astro/config';

import { fontsourceVariable } from './src/fonts/fontsource-variable';

// The subsets the site's languages need (A12): English and Italian, Albanian, Greek.
const FONT_SUBSETS = ['latin', 'latin-ext', 'greek'];

export default defineConfig({
  site: 'https://invetec.eu',
  output: 'static',
  integrations: [preact()],
  // Self-hosted through the Fonts API from the pinned @fontsource-variable packages (A12); no
  // request leaves the site for a font, at build time or in the browser. The CSS variables are the
  // design's own `--display` and `--body` tokens (nightwatch.css), with its fallback lists.
  fonts: [
    {
      provider: fontsourceVariable('@fontsource-variable/sofia-sans-extra-condensed'),
      name: 'Sofia Sans Extra Condensed',
      cssVariable: '--display',
      subsets: FONT_SUBSETS,
      styles: ['normal'],
      fallbacks: ['Roboto Condensed', 'Arial Narrow', 'sans-serif'],
    },
    {
      provider: fontsourceVariable('@fontsource-variable/sofia-sans'),
      name: 'Sofia Sans',
      cssVariable: '--body',
      subsets: FONT_SUBSETS,
      styles: ['normal'],
      fallbacks: ['Segoe UI', 'system-ui', 'sans-serif'],
    },
  ],
  i18n: {
    locales: ['el', 'en', 'it', 'sq'],
    defaultLocale: 'el',
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  // `astro preview` must fail when 4321 is taken instead of moving to 4322, where Playwright's
  // webServer never looks (it would time out after 120 s).
  vite: { preview: { strictPort: true } },
});
