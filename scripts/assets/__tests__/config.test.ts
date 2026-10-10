// The media fetch's fixed settings (spec: "Media: fetch once"): one allowed origin, the crawl's
// politeness values and the 15 MB cap. A change here is a decision, not a refactor.
import { describe, expect, it } from 'vitest';

import { ALLOWED_ORIGINS, MAX_IMAGE_BYTES, MEDIA_POLITENESS } from '../config';

describe('the media fetch settings', () => {
  it('allow only https://invetec.eu', () => {
    expect(ALLOWED_ORIGINS).toEqual(['https://invetec.eu']);
  });

  it('keep 2 requests in flight, a 250 ms pause, a 20 s timeout and 2 retries', () => {
    expect(MEDIA_POLITENESS).toMatchObject({
      concurrency: 2,
      gapMs: 250,
      timeoutMs: 20_000,
      retries: 2,
    });
  });

  it('refuse a body over 15,000,000 bytes', () => {
    expect(MAX_IMAGE_BYTES).toBe(15_000_000);
  });
});
