// The fetch guard every test file runs under (vitest.config.ts setupFiles), and the proof that a
// crawl started without an injected fetch is refused before any socket opens.
import { subscribe, unsubscribe } from 'node:diagnostics_channel';
import { createServer } from 'node:http';
import net, { type AddressInfo } from 'node:net';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { EXIT_CODES, runCli } from '../cli';
import { HOSTS } from '../config';
import { isFetchGuarded, loopbackOnlyFetch } from './fetch-guard';
import { fakeClock, FAST_POLITENESS } from './helpers';
import { captureIo, readRequestLog, useCrawlSandbox } from './run-helpers';

const { outDir } = useCrawlSandbox();

afterEach(() => {
  vi.restoreAllMocks();
});

const CHANNELS = ['net.client.socket', 'undici:request:create', 'undici:client:beforeConnect'];

// Records every client socket Node opens and every request undici (Node's fetch) creates.
function socketProbe() {
  const events: string[] = [];
  const connect = vi.spyOn(net.Socket.prototype, 'connect');
  const listeners = CHANNELS.map((name) => {
    const listener = () => {
      events.push(name);
    };
    subscribe(name, listener);
    return { name, listener };
  });
  return {
    events,
    connect,
    stop: () => {
      for (const { name, listener } of listeners) {
        unsubscribe(name, listener);
      }
    },
  };
}

describe('the fetch guard', () => {
  it('is installed for this test file', () => {
    expect(isFetchGuarded()).toBe(true);
  });

  it('lets a 127.0.0.1 request through, and the socket probe sees it', async () => {
    const server = createServer((_request, response) => {
      response.end('ok');
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const { port } = server.address() as AddressInfo;
    const probe = socketProbe();
    try {
      const response = await loopbackOnlyFetch(`http://127.0.0.1:${String(port)}/`);
      expect(await response.text()).toBe('ok');
    } finally {
      probe.stop();
      server.closeAllConnections();
      server.close();
    }

    expect(probe.events).toContain('undici:request:create');
    expect(probe.connect).toHaveBeenCalled();
  });

  it('refuses a redirect that fetch would follow by itself, but hands a manual one back', async () => {
    const paths: string[] = [];
    // The redirect stays on this server, so even a guard that let fetch follow it reaches
    // nothing but 127.0.0.1; any other target would be invisible to the guard.
    const server = createServer((request, response) => {
      paths.push(request.url ?? '');
      if (request.url === '/') {
        response.writeHead(302, { location: '/landed' }).end();
      } else {
        response.end('followed');
      }
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const { port } = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${String(port)}/`;
    try {
      await expect(loopbackOnlyFetch(url)).rejects.toThrow(TypeError);
      await expect(loopbackOnlyFetch(new Request(url))).rejects.toThrow(TypeError);
      const manual = await loopbackOnlyFetch(url, { redirect: 'manual' });
      expect(manual.status).toBe(302);
      expect(manual.headers.get('location')).toBe('/landed');
    } finally {
      server.closeAllConnections();
      server.close();
    }

    expect(paths).toStrictEqual(['/', '/', '/']);
  });

  it('refuses a crawl started without a fetch override, before any socket opens', async () => {
    // Without the guard this test would reach the live hosts: refuse to run it at all.
    if (!isFetchGuarded()) {
      throw new Error('the fetch guard is not installed; not starting a crawl without a fetch');
    }
    const dir = await outDir();
    const clock = fakeClock();
    const io = captureIo();
    const probe = socketProbe();

    // Hosts and fetch keep their defaults: the live sites through the global fetch.
    let code: number;
    try {
      code = await runCli(
        [],
        { outDir: dir, sleep: clock.sleep, now: clock.now, politeness: FAST_POLITENESS },
        io,
      );
    } finally {
      probe.stop();
    }

    expect(code).toBe(EXIT_CODES.stopped);
    const out = io.out.join('');
    for (const { origin } of HOSTS) {
      expect(out).toContain(
        `SEED INCOMPLETE: ${origin}/robots.txt network: test tried to reach ${origin}/robots.txt; only 127.0.0.1 is allowed`,
      );
    }
    expect(probe.events).toStrictEqual([]);
    expect(probe.connect).not.toHaveBeenCalled();
    const { sent } = await readRequestLog(dir);
    expect(new Set(sent.map((entry) => entry.url))).toStrictEqual(
      new Set(HOSTS.map(({ origin }) => `${origin}/robots.txt`)),
    );
  });
});
