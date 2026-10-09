// Vitest setup file for every test file (vitest.config.ts `setupFiles`): the global fetch only
// reaches 127.0.0.1.
import { installFetchGuard } from './fetch-guard';

installFetchGuard();
