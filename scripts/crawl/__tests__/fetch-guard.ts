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

export const loopbackOnlyFetch: typeof fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.hostname !== '127.0.0.1') {
    throw new Error(`test tried to reach ${url.href}; only 127.0.0.1 is allowed`);
  }
  return realFetch(input, init);
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
