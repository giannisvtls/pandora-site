import { Buffer } from 'node:buffer';

import { describe, expect, it } from 'vitest';

import { POLITENESS, USER_AGENT } from '../config';
import { createHttp, fetchFollowing } from '../fetcher';
import { html, redirect, type Route } from './helpers';
import { follow, hang, HOSTS, logRows, ORIGIN, setup } from './http-setup';

// /r0/ -> /r1/ -> ... -> /r<length>/, alternating 301 and 302.
function redirectChain(length: number): Record<string, Route> {
  return Object.fromEntries(
    Array.from({ length }, (_, index) => [
      `${ORIGIN}/r${String(index)}/`,
      redirect(`/r${String(index + 1)}/`, index % 2 === 0 ? 301 : 302),
    ]),
  );
}

describe('createHttp: politeness', () => {
  it('sends only GETs, with redirect manual, the crawl User-Agent and no body', async () => {
    const { site, http } = setup({ [`${ORIGIN}/a/`]: html('<p>a</p>') });

    await http.get(new URL(`${ORIGIN}/a/`), () => true);
    await http.get(new URL(`${ORIGIN}/missing/`), () => true);

    expect(site.calls).toHaveLength(2);
    for (const call of site.calls) {
      expect(call.method).toBe('GET');
      expect(call.redirect).toBe('manual');
      expect(call.headers.get('user-agent')).toBe(USER_AGENT);
      expect(call.hasBody).toBe(false);
      expect(call.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it('keeps at most 2 requests in flight however many are started at once', async () => {
    const urls = Array.from({ length: 12 }, (_, index) => `${ORIGIN}/p${String(index)}/`);
    const { site, http } = setup(Object.fromEntries(urls.map((url) => [url, html('ok')])));

    await Promise.all(urls.map((url) => http.get(new URL(url), () => true)));

    expect(site.calls).toHaveLength(12);
    expect(site.maxInFlight()).toBe(2);
  });

  it('pauses 250 ms on a slot before reusing it', async () => {
    const urls = Array.from({ length: 6 }, (_, index) => `${ORIGIN}/p${String(index)}/`);
    const { clock, http } = setup(Object.fromEntries(urls.map((url) => [url, html('ok')])), {
      isClockFrozen: true,
    });

    await Promise.all(urls.map((url) => http.get(new URL(url), () => true)));

    // Two slots start at once; each of the other four requests waits out the gap first.
    expect(clock.sleeps).toStrictEqual([250, 250, 250, 250]);
  });

  it('spaces the requests of one slot by the gap', async () => {
    const urls = Array.from({ length: 4 }, (_, index) => `${ORIGIN}/p${String(index)}/`);
    const starts: number[] = [];
    const { clock, http } = setup(
      Object.fromEntries(
        urls.map((url) => [
          url,
          () => {
            starts.push(clock.now());
            return html('ok');
          },
        ]),
      ),
      { politeness: { concurrency: 1 } },
    );

    for (const url of urls) {
      await http.get(new URL(url), () => true);
    }

    expect(starts).toStrictEqual([0, 250, 500, 750]);
  });
});

describe('createHttp: retries', () => {
  it('retries a 5xx with backoff, then returns the success', async () => {
    const url = `${ORIGIN}/flaky/`;
    const { site, clock, http, log } = setup({
      [url]: (_call, count) => (count < 3 ? { status: count === 1 ? 503 : 502 } : html('ok')),
    });

    const outcome = await http.get(new URL(url), () => true);

    expect(outcome).toMatchObject({ ok: true, status: 200, body: 'ok' });
    expect(site.calls).toHaveLength(3);
    expect(clock.sleeps.filter((ms) => ms !== 250)).toStrictEqual([1000, 2000]);
    expect(logRows(log)).toStrictEqual([
      ['sent', 1, 1],
      ['done', 1, 503],
      ['sent', 2, 2],
      ['done', 2, 502],
      ['sent', 3, 3],
      ['done', 3, 200],
    ]);
  });

  it('gives up after 2 retries and returns the last 5xx', async () => {
    const url = `${ORIGIN}/down/`;
    const { site, http } = setup({ [url]: { status: 500 } });

    const outcome = await http.get(new URL(url), () => true);

    expect(outcome).toMatchObject({ ok: true, status: 500 });
    expect(site.calls).toHaveLength(3);
  });

  it('retries a network error', async () => {
    const url = `${ORIGIN}/reset/`;
    const { site, http } = setup({
      [url]: (_call, count) => {
        if (count === 1) {
          throw new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } });
        }
        return html('ok');
      },
    });

    const outcome = await http.get(new URL(url), () => true);

    expect(outcome).toMatchObject({ ok: true, status: 200 });
    expect(site.calls).toHaveLength(2);
  });

  it('does not retry a 404', async () => {
    const { site, http } = setup({});

    const outcome = await http.get(new URL(`${ORIGIN}/gone/`), () => true);

    expect(outcome).toMatchObject({ ok: true, status: 404 });
    expect(site.calls).toHaveLength(1);
  });

  it('times out a request that never answers, and reports it after the retries', async () => {
    let calls = 0;
    const http = createHttp({
      fetch: (url, init) => {
        calls += 1;
        return hang(url, init);
      },
      userAgent: USER_AGENT,
      politeness: { ...POLITENESS, timeoutMs: 5, gapMs: 0, backoffMs: 0 },
      sleep: async () => {
        // no wait
      },
      now: () => 0,
      allowedHosts: HOSTS,
      isRobotsAllowed: () => true,
      signal: new AbortController().signal,
      firstSeq: 1,
      log: () => {
        // not asserted
      },
    });

    const outcome = await http.get(new URL(`${ORIGIN}/slow/`), () => true);

    expect(outcome).toStrictEqual({ ok: false, error: 'timeout' });
    expect(calls).toBe(3);
  });
});

describe('createHttp: safety', () => {
  it('never requests a robots-disallowed URL, but always /robots.txt', async () => {
    const { site, http } = setup(
      { [`${ORIGIN}/robots.txt`]: { status: 200, body: '' } },
      { isRobotsAllowed: () => false },
    );

    const blocked = await http.get(new URL(`${ORIGIN}/private/`), () => true);
    await http.get(new URL(`${ORIGIN}/robots.txt`), () => true);

    expect(blocked).toStrictEqual({ ok: false, error: 'robots-disallowed' });
    expect(site.calls.map((call) => call.url)).toStrictEqual([`${ORIGIN}/robots.txt`]);
  });

  it.each([`${ORIGIN}/search/?s=x`, 'https://www.example.com/', 'data:text/plain,x'])(
    'refuses %s without a request',
    async (url) => {
      const { site, http } = setup({});

      await expect(http.get(new URL(url), () => true)).rejects.toThrow(/refusing to request/);
      expect(site.calls).toHaveLength(0);
    },
  );
});

describe('fetchFollowing: redirects', () => {
  it('follows up to 5 redirects by hand and records the chain', async () => {
    const { site, http } = setup({
      ...redirectChain(5),
      [`${ORIGIN}/r5/`]: html('<title>end</title>'),
    });

    const trace = await fetchFollowing(`${ORIGIN}/r0/`, http, follow);

    expect(trace.status).toBe(200);
    expect(trace.error).toBeNull();
    expect(trace.finalUrl).toBe(`${ORIGIN}/r5/`);
    expect(trace.body).toBe('<title>end</title>');
    expect(trace.redirectChain).toStrictEqual([
      { url: `${ORIGIN}/r0/`, status: 301, location: `${ORIGIN}/r1/` },
      { url: `${ORIGIN}/r1/`, status: 302, location: `${ORIGIN}/r2/` },
      { url: `${ORIGIN}/r2/`, status: 301, location: `${ORIGIN}/r3/` },
      { url: `${ORIGIN}/r3/`, status: 302, location: `${ORIGIN}/r4/` },
      { url: `${ORIGIN}/r4/`, status: 301, location: `${ORIGIN}/r5/` },
    ]);
    expect(site.calls).toHaveLength(6);
  });

  it('stops at the 6th redirect without following it', async () => {
    const { site, http } = setup({ ...redirectChain(6), [`${ORIGIN}/r6/`]: html('never fetched') });

    const trace = await fetchFollowing(`${ORIGIN}/r0/`, http, follow);

    expect(trace.error).toBe('too-many-redirects');
    expect(trace.status).toBe(302);
    expect(trace.finalUrl).toBe(`${ORIGIN}/r5/`);
    expect(trace.redirectChain).toHaveLength(6);
    expect(trace.redirectChain.at(-1)?.location).toBe(`${ORIGIN}/r6/`);
    expect(site.calls.map((call) => call.url)).not.toContain(`${ORIGIN}/r6/`);
    expect(site.calls).toHaveLength(6);
  });

  it('detects a redirect loop', async () => {
    const { site, http } = setup({
      [`${ORIGIN}/a/`]: redirect(`${ORIGIN}/b/`),
      [`${ORIGIN}/b/`]: redirect('/a/'),
    });

    const trace = await fetchFollowing(`${ORIGIN}/a/`, http, follow);

    expect(trace.error).toBe('redirect-loop');
    expect(trace.redirectChain.map((hop) => hop.location)).toStrictEqual([
      `${ORIGIN}/b/`,
      `${ORIGIN}/a/`,
    ]);
    expect(site.calls).toHaveLength(2);
  });

  it('records but does not follow a redirect to another site', async () => {
    const { site, http } = setup({ [`${ORIGIN}/out/`]: redirect('https://www.example.com/x') });

    const trace = await fetchFollowing(`${ORIGIN}/out/`, http, follow);

    expect(trace).toMatchObject({
      status: 301,
      error: 'redirect-off-site',
      finalUrl: `${ORIGIN}/out/`,
    });
    expect(trace.redirectChain).toStrictEqual([
      { url: `${ORIGIN}/out/`, status: 301, location: 'https://www.example.com/x' },
    ]);
    expect(site.calls).toHaveLength(1);
  });

  it('follows a redirect whose Location carries raw UTF-8 bytes to the encoded URL', async () => {
    const latin1 = Buffer.from('/αρχική/', 'utf8').toString('latin1');
    const encoded = `${ORIGIN}/${encodeURIComponent('αρχική')}/`;
    const { http } = setup({ [`${ORIGIN}/home/`]: redirect(latin1), [encoded]: html('ok') });

    const trace = await fetchFollowing(`${ORIGIN}/home/`, http, follow);

    expect(trace.redirectChain[0]?.location).toBe(encoded);
    expect(trace).toMatchObject({ status: 200, finalUrl: encoded, error: null });
  });

  it('reports a network failure with no status', async () => {
    const { http } = setup({
      [`${ORIGIN}/x/`]: () => {
        throw new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } });
      },
    });

    const trace = await fetchFollowing(`${ORIGIN}/x/`, http, follow);

    expect(trace).toMatchObject({ status: null, error: 'network: ENOTFOUND', redirectChain: [] });
  });
});
