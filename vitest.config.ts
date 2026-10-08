/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig loads astro.config.mjs (integrations, Preact JSX), so tests resolve modules the
// way the build does. Tests run in node by default (Astro Container API); Preact island tests
// opt into jsdom per file with a `// @vitest-environment jsdom` docblock.
export default getViteConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
