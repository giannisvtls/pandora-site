// A dry run of the whole CLI over real HTTP: two local servers on 127.0.0.1 (ephemeral ports)
// serve the fixture site, and the crawler's fetch only lets 127.0.0.1 through.
import { readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

import { afterAll, describe, expect, it } from 'vitest';

import { cachePaths, type CacheLine } from '../cache';
import { EXIT_CODES, runCli } from '../cli';
import { POLITENESS, USER_AGENT } from '../config';
import type { RequestLogEntry } from '../fetcher';
import { byCodeUnit, crawlOutputSchema } from '../output';
import { loopbackOnlyFetch, temporaryDirectory, type FakeCall, type Route } from './helpers';
import {
  CONTACT_PATH,
  DISALLOWED_PREFIX,
  expectedUrls,
  testSite,
  WORDPRESS_SYSTEM,
  type SiteOrigins,
} from './site';

interface Hit {
  readonly method: string;
  readonly url: string;
  readonly host: string;
  readonly userAgent: string;
}

type LoggedLine = RequestLogEntry;
type LoggedRequest = Extract<RequestLogEntry, { event: 'sent' }>;

function jsonLines<T>(text: string): T[] {
  return text
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as T);
}

// Listens on 127.0.0.1 with an ephemeral port and returns the origin.
async function listenOnLoopback(server: Server): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
}

// Two servers that answer from the test site's routes and record every request they get.
async function startServers() {
  const hits: Hit[] = [];
  const counts = new Map<string, number>();
  const routes = new Map<string, Route>();

  async function reply(origin: string, request: IncomingMessage, response: ServerResponse) {
    const url = `${origin}${request.url ?? '/'}`;
    hits.push({
      method: request.method ?? '?',
      url,
      host: request.headers.host ?? '',
      userAgent: request.headers['user-agent'] ?? '',
    });
    const count = (counts.get(url) ?? 0) + 1;
    counts.set(url, count);
    const call: FakeCall = {
      url,
      method: request.method,
      redirect: undefined,
      headers: new Headers(),
      hasBody: false,
      signal: undefined,
    };
    const route = routes.get(url);
    const answer =
      typeof route === 'function' ? await route(call, count) : (route ?? { status: 404 });
    response.writeHead(answer.status ?? 200, answer.headers ?? {});
    response.end(answer.body ?? '');
  }

  const origin = { a: '', b: '' };
  const serverA = createServer((request, response) => void reply(origin.a, request, response));
  const serverB = createServer((request, response) => void reply(origin.b, request, response));
  origin.a = await listenOnLoopback(serverA);
  origin.b = await listenOnLoopback(serverB);
  const origins: SiteOrigins = { ...origin };
  const site = testSite(origins);
  for (const [url, route] of Object.entries(site)) {
    routes.set(url, route);
  }
  return {
    origins,
    hits,
    stop: () => {
      for (const server of [serverA, serverB]) {
        server.closeAllConnections();
        server.close();
      }
    },
  };
}

async function dryRun() {
  const servers = await startServers();
  const { dir, remove } = await temporaryDirectory();
  const printed: string[] = [];
  const append = (text: string) => {
    printed.push(text);
  };
  const exitCode = await runCli(
    [],
    {
      hosts: [
        { origin: servers.origins.a, rootLang: 'el' },
        { origin: servers.origins.b, rootLang: null },
      ],
      outDir: dir,
      fetch: (url, init) => loopbackOnlyFetch(url, init),
      sleep: async (ms) => {
        await delay(ms);
      },
      politeness: { ...POLITENESS, gapMs: 5, backoffMs: 5, timeoutMs: 5000 },
    },
    { stdout: append, stderr: append },
  );
  const paths = cachePaths(dir);
  const raw = await readFile(paths.output, 'utf8');
  const requests = await readFile(paths.requests, 'utf8');
  const pages = await readFile(paths.pages, 'utf8');
  return {
    ...servers,
    exitCode,
    printed: printed.join(''),
    raw,
    output: crawlOutputSchema.parse(JSON.parse(raw)),
    log: jsonLines<LoggedLine>(requests).filter(
      (line): line is LoggedRequest => line.event === 'sent',
    ),
    cachedUrls: jsonLines<CacheLine>(pages).map((line) => line.record.url),
    remove,
  };
}

const run = await dryRun();

afterAll(async () => {
  run.stop();
  await run.remove();
});

describe('dry run against local servers', () => {
  it('completes and writes a crawl.json that matches the output schema', () => {
    expect(run.exitCode).toBe(EXIT_CODES.complete);
    expect(run.printed).toMatch(/COMPLETE: wrote .*crawl\.json \(25 URLs\)/);
    expect(Object.keys(run.output)).toStrictEqual([
      'crawledAt',
      'tool',
      'hosts',
      'robots',
      'counts',
      'urls',
    ]);
    expect(run.output.urls.map((record) => record.url)).toStrictEqual(
      expectedUrls(run.origins, false).toSorted(byCodeUnit),
    );
  });

  it('keeps Greek text as UTF-8 and percent-encoded Greek URLs byte for byte', () => {
    const contactUrl = `${run.origins.a}${CONTACT_PATH}`;
    const contact = run.output.urls.find((record) => record.url === contactUrl);

    expect(contact?.title).toMatch(/^Επικοινωνία . INVETEC$/u);
    expect(contact?.canonical).toBe(contactUrl);
    expect(run.raw).toContain('"title": "Επικοινωνία');
    expect(run.raw).toContain(CONTACT_PATH);
  });

  it('sent only GETs with the crawl User-Agent, to the two local hosts only', () => {
    const hosts = new Set([new URL(run.origins.a).host, new URL(run.origins.b).host]);

    expect(run.hits.length).toBeGreaterThan(30);
    for (const hit of run.hits) {
      expect(hit.method).toBe('GET');
      expect(hit.userAgent).toBe(USER_AGENT);
      expect(hosts.has(hit.host)).toBe(true);
    }
  });

  it('never requested a query string, a robots-disallowed path or a WordPress system path', () => {
    for (const hit of run.hits) {
      const url = new URL(hit.url);
      expect(url.search).toBe('');
      expect(url.pathname.startsWith(DISALLOWED_PREFIX)).toBe(false);
      expect(url.pathname).not.toMatch(WORDPRESS_SYSTEM);
    }
  });

  it('logged every request it made, and every logged URL was robots-allowed', () => {
    expect(run.log.map((entry) => entry.url).toSorted(byCodeUnit)).toStrictEqual(
      run.hits.map((hit) => hit.url).toSorted(byCodeUnit),
    );
    expect(new Set(run.log.map((entry) => entry.method))).toStrictEqual(new Set(['GET']));
    expect(run.log.every((entry) => entry.robotsAllowed)).toBe(true);
  });

  it('kept a resume cache with one line per finished URL', () => {
    expect(new Set(run.cachedUrls).size).toBe(run.cachedUrls.length);
    expect(run.cachedUrls.toSorted(byCodeUnit)).toStrictEqual(
      run.output.urls.map((record) => record.url),
    );
  });
});
