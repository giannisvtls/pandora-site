import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/preact';
import { afterEach } from 'vitest';

// Vitest runs without globals, so Preact Testing Library cannot register its own cleanup.
afterEach(() => {
  cleanup();
});
