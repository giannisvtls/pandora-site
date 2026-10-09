// What media:fetch refuses, against loopback sites under the global fetch guard: a source outside
// the allow-list or with a query string (before any request), a redirect that leaves the
// allow-list or adds a query string, a response that is not an image, a body over 15 MB, a path
// robots.txt disallows; and the 503 it retries.
import { describe, expect, it } from 'vitest';

import { byCodeUnit } from '../../crawl/output';
import { MAX_IMAGE_BYTES, MEDIA_DIR } from '../config';
import { sha256 } from '../manifest';
import { runMediaFetch, type MediaFetchResult } from '../run';
import { fileSha, hasFile, OPEN_ROBOTS, optionsFor, sourcesOf, useSandboxes } from './fetch-setup';
import {
  bytesOf,
  image,
  largeBody,
  reply,
  robotsTxt,
  useSites,
  type Handler,
} from './loopback-site';

const startSite = useSites();
const sandbox = useSandboxes();

const failures = (result: MediaFetchResult) =>
  result.failed.toSorted((a, b) => byCodeUnit(a.url, b.url));

describe('sources that are never requested', () => {
  it('refuses a source on a host outside the allow-list before any request', async () => {
    const site = await startSite();
    site.routes.set('/robots.txt', robotsTxt(OPEN_ROBOTS));
    site.routes.set('/a.webp', image(bytesOf('a')));
    const outside = 'https://lenovo.invetec.eu/wp-content/uploads/x.webp';
    const sources = sourcesOf([`${site.origin}/a.webp`, outside]);
    const { options } = optionsFor(await sandbox(), site.origin, sources);

    await expect(runMediaFetch(options)).rejects.toThrow(
      `media ${outside}: origin https://lenovo.invetec.eu is not allowed`,
    );
    expect(site.hits).toEqual([]);
  });

  it('refuses a source URL with a query string, even an empty one, before any request', async () => {
    const site = await startSite();
    site.routes.set('/robots.txt', robotsTxt(OPEN_ROBOTS));
    const sources = sourcesOf([`${site.origin}/a.webp?ver=2`, `${site.origin}/b.webp?`]);

    const run = runMediaFetch(optionsFor(await sandbox(), site.origin, sources).options);

    await expect(run).rejects.toThrow(`media ${site.origin}/a.webp?ver=2: has a query string`);
    await expect(run).rejects.toThrow(`media ${site.origin}/b.webp?: has a query string`);
    expect(site.hits).toEqual([]);
  });
});

describe('responses that are refused', () => {
  it('refuses a redirect that leaves the allow-list or adds a query string', async () => {
    const site = await startSite();
    const other = await startSite();
    other.routes.set('/x.webp', image(bytesOf('x')));
    site.routes.set('/robots.txt', robotsTxt(OPEN_ROBOTS));
    site.routes.set('/moved.webp', reply(301, { location: `${other.origin}/x.webp` }));
    site.routes.set('/query.webp', reply(301, { location: '/query.webp?size=2' }));
    site.routes.set('/old.webp', reply(302, { location: '/new.webp' }));
    site.routes.set('/new.webp', image(bytesOf('new')));
    const moved = `${site.origin}/moved.webp`;
    const query = `${site.origin}/query.webp`;
    const old = `${site.origin}/old.webp`;
    const root = await sandbox();

    const result = await runMediaFetch(
      optionsFor(root, site.origin, sourcesOf([moved, query, old])).options,
    );

    expect(failures(result)).toEqual([
      { url: moved, reason: 'redirect-off-site' },
      { url: query, reason: 'redirect-to-query' },
    ]);
    expect(other.hits).toEqual([]);
    expect(result.stats.redirectHops).toBe(1);
    expect(await fileSha(root, `${MEDIA_DIR}/old.webp`)).toBe(sha256(bytesOf('new')));
    expect(await hasFile(root, `${MEDIA_DIR}/moved.webp`)).toBe(false);
  });

  it('refuses a response that is not an image', async () => {
    const site = await startSite();
    site.routes.set('/robots.txt', robotsTxt(OPEN_ROBOTS));
    site.routes.set('/page.webp', reply(200, { 'content-type': 'text/html; charset=utf-8' }, 'hi'));
    site.routes.set('/untyped.webp', reply(200, {}, 'bytes'));
    const urls = [`${site.origin}/page.webp`, `${site.origin}/untyped.webp`];
    const root = await sandbox();

    const result = await runMediaFetch(optionsFor(root, site.origin, sourcesOf(urls)).options);

    expect(failures(result)).toEqual([
      { url: urls[0], reason: 'not-image: text/html; charset=utf-8' },
      { url: urls[1], reason: 'not-image: no Content-Type' },
    ]);
    expect(await hasFile(root, `${MEDIA_DIR}/page.webp`)).toBe(false);
  });

  it('refuses a body over 15 MB, by its Content-Length or while reading it', async () => {
    const site = await startSite();
    site.routes.set('/robots.txt', robotsTxt(OPEN_ROBOTS));
    site.routes.set('/declared.jpg', largeBody(1024, MAX_IMAGE_BYTES + 1));
    site.routes.set('/streamed.jpg', largeBody(MAX_IMAGE_BYTES + 1));
    const urls = [`${site.origin}/declared.jpg`, `${site.origin}/streamed.jpg`];
    const root = await sandbox();

    const result = await runMediaFetch(optionsFor(root, site.origin, sourcesOf(urls)).options);

    expect(MAX_IMAGE_BYTES).toBe(15_000_000);
    expect(failures(result)).toEqual([
      { url: urls[0], reason: 'too-large: Content-Length 15000001 > 15000000 bytes' },
      { url: urls[1], reason: 'too-large: more than 15000000 bytes' },
    ]);
    expect(await hasFile(root, `${MEDIA_DIR}/streamed.jpg`)).toBe(false);
  });

  it('accepts a body of exactly the size limit and refuses one byte more', async () => {
    const site = await startSite();
    site.routes.set('/robots.txt', robotsTxt(OPEN_ROBOTS));
    site.routes.set('/exact.jpg', image(bytesOf('exact', 1000), 'image/jpeg'));
    site.routes.set('/over.jpg', largeBody(1001));
    const urls = [`${site.origin}/exact.jpg`, `${site.origin}/over.jpg`];
    const root = await sandbox();

    const result = await runMediaFetch(
      optionsFor(root, site.origin, sourcesOf(urls), { maxBytes: 1000 }).options,
    );

    expect(result.fetched).toBe(1);
    expect(result.failed).toEqual([{ url: urls[1], reason: 'too-large: more than 1000 bytes' }]);
  });
});

describe('robots.txt', () => {
  it('is obeyed: a disallowed path is never requested', async () => {
    const site = await startSite();
    site.routes.set('/robots.txt', robotsTxt('User-agent: *\nDisallow: /private/\n'));
    site.routes.set('/private/a.webp', image(bytesOf('a')));
    site.routes.set('/public/b.webp', image(bytesOf('b')));
    const urls = [`${site.origin}/private/a.webp`, `${site.origin}/public/b.webp`];

    const result = await runMediaFetch(
      optionsFor(await sandbox(), site.origin, sourcesOf(urls)).options,
    );

    expect(result.failed).toEqual([{ url: urls[0], reason: 'robots-disallowed' }]);
    expect(result.fetched).toBe(1);
    expect(site.paths()).not.toContain('/private/a.webp');
  });

  it('stops the run before any image when it is unreachable or asks for a longer pause', async () => {
    const down = await startSite();
    down.routes.set('/robots.txt', reply(503));
    down.routes.set('/a.webp', image(bytesOf('a')));
    const slow = await startSite();
    slow.routes.set('/robots.txt', robotsTxt('User-agent: *\nCrawl-delay: 5\n'));
    slow.routes.set('/a.webp', image(bytesOf('a')));

    const downRun = runMediaFetch(
      optionsFor(await sandbox(), down.origin, sourcesOf([`${down.origin}/a.webp`])).options,
    );
    await expect(downRun).rejects.toThrow(/robots\.txt of .* is unreachable \(HTTP 503\)/u);
    const slowRun = runMediaFetch(
      optionsFor(await sandbox(), slow.origin, sourcesOf([`${slow.origin}/a.webp`])).options,
    );
    await expect(slowRun).rejects.toThrow('asks for Crawl-delay 5 s');

    expect(down.paths()).toEqual(['/robots.txt', '/robots.txt', '/robots.txt']);
    expect(slow.paths()).toEqual(['/robots.txt']);
  });

  it('means no rules when it answers 404', async () => {
    const site = await startSite();
    site.routes.set('/a.webp', image(bytesOf('a')));

    const result = await runMediaFetch(
      optionsFor(await sandbox(), site.origin, sourcesOf([`${site.origin}/a.webp`])).options,
    );

    expect(result).toMatchObject({ fetched: 1, failed: [] });
  });
});

describe('retries', () => {
  it('retries a 503 twice, then keeps the result', async () => {
    const site = await startSite();
    site.routes.set('/robots.txt', robotsTxt(OPEN_ROBOTS));
    const flaky: Handler = (request, response, count) =>
      count < 3
        ? reply(503)(request, response, count)
        : image(bytesOf('flaky'))(request, response, count);
    site.routes.set('/flaky.webp', flaky);
    site.routes.set('/down.webp', reply(503));
    const urls = [`${site.origin}/flaky.webp`, `${site.origin}/down.webp`];

    const result = await runMediaFetch(
      optionsFor(await sandbox(), site.origin, sourcesOf(urls)).options,
    );

    expect(result.fetched).toBe(1);
    expect(result.failed).toEqual([{ url: urls[1], reason: 'HTTP 503' }]);
    expect(site.paths().filter((hit) => hit === '/flaky.webp')).toHaveLength(3);
    expect(site.paths().filter((hit) => hit === '/down.webp')).toHaveLength(3);
    expect(result.stats).toMatchObject({ requests: 7, robots: 1, retries: 4 });
  });
});
