// The loopback-only fetch guard. fetch-guard-setup.ts installs it for every Vitest file (see
// vitest.config.ts `setupFiles`): a fetch to any host but 127.0.0.1 throws before a socket is
// opened, so a test that forgets to inject a fake fetch (runCli defaults to the live hosts and
// the global fetch) is refused instead of reaching a live site.

// Kept on the global object, so a module evaluated again in a reused worker still finds Node's
// own fetch and never mistakes the guard for it.
const holder = globalThis as typeof globalThis & {
  pandoraRealFetch?: typeof fetch;
  pandoraFetchGuard?: typeof fetch;
};
holder.pandoraRealFetch ??= fetch;
const realFetch: typeof fetch = holder.pandoraRealFetch;

// Only the first URL can be checked here, so a redirect is never followed by fetch itself: it
// fails, unless the caller follows redirects by hand (`redirect: 'manual'`, as the crawler does)
// and so sends each hop through this guard again.
export const loopbackOnlyFetch: typeof fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.hostname !== '127.0.0.1') {
    throw new Error(`test tried to reach ${url.href}; only 127.0.0.1 is allowed`);
  }
  const mode = init?.redirect ?? (input instanceof Request ? input.redirect : 'follow');
  return realFetch(input, { ...init, redirect: mode === 'manual' ? 'manual' : 'error' });
};

// Defined directly, not with vi.stubGlobal, so vi.unstubAllGlobals() in a test cannot remove it.
export function installFetchGuard(): void {
  holder.pandoraFetchGuard = loopbackOnlyFetch;
  Object.defineProperty(globalThis, 'fetch', {
    value: loopbackOnlyFetch,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

// Whether the global fetch is the installed guard (checked before any test that relies on it).
export function isFetchGuarded(): boolean {
  return holder.pandoraFetchGuard !== undefined && fetch === holder.pandoraFetchGuard;
}
