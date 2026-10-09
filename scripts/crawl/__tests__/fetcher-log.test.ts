// The request log (a `sent` line before each request, a `done` line after), the run's abort
// signal, and the Location header repair.
import { Buffer } from 'node:buffer';

import { describe, expect, it } from 'vitest';

import { fetchFollowing, repairLocation, type RequestLogEntry } from '../fetcher';
import { html, redirect } from './helpers';
import { follow, logRows, ORIGIN, setup } from './http-setup';

describe('createHttp: request log', () => {
  it('logs each request as sent before fetch is called, and its outcome after', async () => {
    const url = `${ORIGIN}/a/`;
    let logAtSend: readonly RequestLogEntry[] = [];
    const { http, log } = setup(
      { [url]: html('ok') },
      {
        onFetch: (current) => {
          logAtSend = current;
        },
      },
    );

    await http.get(new URL(url), () => true);

    // A process killed inside fetch has already logged the request.
    expect(logAtSend).toStrictEqual([
      {
        event: 'sent',
        seq: 1,
        ts: new Date(0).toISOString(),
        method: 'GET',
        url,
        attempt: 1,
        robotsAllowed: true,
      },
    ]);
    expect(log.at(-1)).toStrictEqual({
      event: 'done',
      seq: 1,
      ts: new Date(0).toISOString(),
      url,
      status: 200,
      error: null,
    });
  });

  it('logs nothing for a robots-disallowed URL, since nothing is sent', async () => {
    const { log, http } = setup({}, { isRobotsAllowed: () => false });

    await http.get(new URL(`${ORIGIN}/private/`), () => true);

    expect(log).toStrictEqual([]);
  });
});

describe('createHttp: run abort signal', () => {
  it('aborts a request in flight, logs it as aborted and does not retry it', async () => {
    const controller = new AbortController();
    const url = `${ORIGIN}/slow/`;
    const { site, log, http } = setup(
      {
        [url]: (call) =>
          new Promise((_resolve, reject) => {
            call.signal?.addEventListener('abort', () => {
              reject(new DOMException('aborted', 'AbortError'));
            });
            controller.abort();
          }),
      },
      { signal: controller.signal },
    );

    const outcome = await http.get(new URL(url), () => true);

    expect(outcome).toStrictEqual({ ok: false, error: 'aborted' });
    expect(site.calls).toHaveLength(1);
    expect(logRows(log)).toStrictEqual([
      ['sent', 1, 1],
      ['done', 1, null],
    ]);
    expect(log.at(-1)).toMatchObject({ error: 'aborted' });
  });

  it('sends nothing once the signal is aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const { site, log, http } = setup({}, { signal: controller.signal });

    const outcome = await http.get(new URL(`${ORIGIN}/a/`), () => true);

    expect(outcome).toStrictEqual({ ok: false, error: 'aborted' });
    expect(site.calls).toHaveLength(0);
    expect(log).toStrictEqual([]);
  });
});

// A header value as fetch exposes it: one Latin-1 character per byte.
const asHeader = (bytes: Buffer) => bytes.toString('latin1');
const REPLACEMENT = String.fromCodePoint(0xff_fd);
// "/caf", byte 0xE9 (Latin-1 e-acute), "/": 0xE9 alone is not valid UTF-8.
const LATIN1_CAFE = Buffer.from([0x2f, 0x63, 0x61, 0x66, 0xe9, 0x2f]);

describe('repairLocation', () => {
  it('turns a UTF-8 header back into text and leaves ASCII and decoded text alone', () => {
    const utf8 = Buffer.from('/αρχική/', 'utf8');

    expect(repairLocation(asHeader(utf8))).toBe('/αρχική/');
    expect(repairLocation('/en/contact/')).toBe('/en/contact/');
    expect(repairLocation('/αρχική/')).toBe('/αρχική/');
  });

  it('keeps a genuine Latin-1 byte as that byte, percent-encoded, never U+FFFD', () => {
    expect(repairLocation(asHeader(LATIN1_CAFE))).toBe('/caf%E9/');
  });

  it('keeps every byte of a header that mixes UTF-8 with a stray byte', () => {
    const alpha = Buffer.from('/α', 'utf8');
    const mixed = asHeader(Buffer.concat([alpha, Buffer.from([0xe9, 0x2f])]));

    const repaired = repairLocation(mixed);

    expect(repaired).toBe('/%CE%B1%E9/');
    expect(repaired).not.toContain(REPLACEMENT);
  });

  it('follows a Latin-1 Location to the bytes the server sent', async () => {
    const { site, http } = setup({
      [`${ORIGIN}/old/`]: redirect(asHeader(LATIN1_CAFE)),
      [`${ORIGIN}/caf%E9/`]: html('ok'),
    });

    const trace = await fetchFollowing(`${ORIGIN}/old/`, http, follow);

    expect(trace).toMatchObject({ status: 200, finalUrl: `${ORIGIN}/caf%E9/`, error: null });
    expect(site.calls.map((call) => call.url)).toStrictEqual([
      `${ORIGIN}/old/`,
      `${ORIGIN}/caf%E9/`,
    ]);
  });
});
