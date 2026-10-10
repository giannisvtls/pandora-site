// astro.config.mjs
import preact from '@astrojs/preact';
import { defineConfig } from 'astro/config';

import { fontsourceFamily } from './src/fonts/fontsource-variable';
import { buildFiles } from './src/integrations/build-files';

// The subsets the site's languages need (A12): English and Italian, Albanian, Greek.
const FONT_SUBSETS = ['latin', 'latin-ext', 'greek'];

export default defineConfig({
  site: 'https://invetec.eu',
  output: 'static',
  // buildFiles: once the build is done, writes dist/_redirects (the root redirect), moves each
  // language's 404 page to {L}/404.html and deletes the images no built file names (spec §9).
  integrations: [preact(), buildFiles()],
  // Self-hosted through the Fonts API from the pinned @fontsource-variable packages (A12); no
  // request leaves the site for a font, at build time or in the browser. The CSS variables are the
  // design's own `--display` and `--body` tokens (nightwatch.css), with its fallback lists.
  // `fontsourceFamily` checks each family's files while this file loads: a subset, style or file
  // the package lacks stops the build here (the Fonts API would only log it and build without it).
  fonts: [
    fontsourceFamily({
      package: '@fontsource-variable/sofia-sans-extra-condensed',
      name: 'Sofia Sans Extra Condensed',
      cssVariable: '--display',
      subsets: FONT_SUBSETS,
      styles: ['normal'],
      fallbacks: ['Roboto Condensed', 'Arial Narrow', 'sans-serif'],
    }),
    fontsourceFamily({
      package: '@fontsource-variable/sofia-sans',
      name: 'Sofia Sans',
      cssVariable: '--body',
      subsets: FONT_SUBSETS,
      styles: ['normal'],
      fallbacks: ['Segoe UI', 'system-ui', 'sans-serif'],
    }),
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
