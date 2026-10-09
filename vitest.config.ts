/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig loads astro.config.mjs (integrations, Preact JSX), so tests resolve modules the
// way the build does. Tests run in node by default (Astro Container API); Preact island tests
// opt into jsdom per file with a `// @vitest-environment jsdom` docblock. Every test file also runs
// the fetch guard: a fetch to any host but 127.0.0.1 throws, so no test can reach a live site.
export default getViteConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts', './scripts/crawl/__tests__/fetch-guard-setup.ts'],
  },
});
