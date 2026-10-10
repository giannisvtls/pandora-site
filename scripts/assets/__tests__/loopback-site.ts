// A loopback image site for the media-fetch tests: an HTTP server on 127.0.0.1 with an ephemeral
// port that answers from a route table (by path) and records every request it receives. The
// tests reach it through the global fetch, which the fetch guard (vitest setupFiles) limits to
// 127.0.0.1.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

import { afterEach } from 'vitest';

export type Handler = (
  request: IncomingMessage,
  response: ServerResponse,
  count: number,
) => void | Promise<void>;

export interface Hit {
  readonly method: string;
  readonly path: string;
  readonly userAgent: string;
}

export async function startSite() {
  const routes = new Map<string, Handler>();
  const hits: Hit[] = [];
  const counts = new Map<string, number>();
  let inFlight = 0;
  let maxInFlight = 0;
  const server = createServer((request, response) => {
    const requestPath = request.url ?? '/';
    hits.push({
      method: request.method ?? '?',
      path: requestPath,
      userAgent: request.headers['user-agent'] ?? '',
    });
    const count = (counts.get(requestPath) ?? 0) + 1;
    counts.set(requestPath, count);
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    response.on('close', () => {
      inFlight -= 1;
    });
    response.on('error', () => {
      // A client that cancels a body makes the next write fail; that is expected here.
    });
    const handler = routes.get(requestPath);
    if (handler === undefined) {
      response.writeHead(404).end();
      return;
    }
    const serve = async () => {
      try {
        await handler(request, response, count);
      } catch {
        response.destroy();
      }
    };
    void serve();
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const origin = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
  const close = () =>
    new Promise<void>((resolve) => {
      server.closeAllConnections();
      server.close(() => {
        resolve();
      });
    });
  return {
    origin,
    routes,
    hits,
    paths: () => hits.map((hit) => hit.path),
    maxInFlight: () => maxInFlight,
    close,
  };
}

export type Site = Awaited<ReturnType<typeof startSite>>;

// Starts sites for one test and closes them after it.
export function useSites(): () => Promise<Site> {
  const open: Site[] = [];
  afterEach(async () => {
    await Promise.all(open.splice(0).map((site) => site.close()));
  });
  return async () => {
    const site = await startSite();
    open.push(site);
    return site;
  };
}

export const image =
  (bytes: Uint8Array, type = 'image/webp', delayMs = 0): Handler =>
  async (_request, response) => {
    if (delayMs > 0) {
      await delay(delayMs);
    }
    response.writeHead(200, { 'content-type': type, 'content-length': String(bytes.byteLength) });
    response.end(bytes);
  };

export const reply =
  (status: number, headers: Record<string, string> = {}, body = ''): Handler =>
  (_request, response) => {
    response.writeHead(status, headers);
    response.end(body);
  };

export const robotsTxt = (text: string): Handler =>
  reply(200, { 'content-type': 'text/plain; charset=utf-8' }, text);

// A body of `size` bytes in 64 KB chunks without a Content-Length (chunked transfer), or with
// the given one.
export const largeBody =
  (size: number, contentLength?: number): Handler =>
  async (_request, response) => {
    const headers: Record<string, string> = { 'content-type': 'image/jpeg' };
    if (contentLength !== undefined) {
      headers['content-length'] = String(contentLength);
    }
    response.writeHead(200, headers);
    // One close listener for the whole body; a client that cancels ends the wait for drain.
    const closed = new Promise<void>((resolve) => {
      response.once('close', resolve);
    });
    const chunk = new Uint8Array(65_536).fill(7);
    for (let sent = 0; sent < size && !response.destroyed; sent += chunk.byteLength) {
      const isDrained = response.write(chunk.subarray(0, Math.min(chunk.byteLength, size - sent)));
      if (!isDrained) {
        await new Promise<void>((resolve) => {
          const done = () => {
            response.off('drain', done);
            resolve();
          };
          response.once('drain', done);
          void closed.then(done);
        });
      }
    }
    response.end();
  };

// Bytes that differ per name, so every test image has its own sha256.
export function bytesOf(name: string, size = 256): Uint8Array {
  const seed = new TextEncoder().encode(name).reduce((total, byte) => total + byte, 0);
  return Uint8Array.from({ length: size }, (_, index) => (seed + index * 31) % 256);
}
