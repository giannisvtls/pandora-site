// The media-sources file: the file-name rule, the checks every tool runs before using it, and its
// committed form.
import { describe, expect, it } from 'vitest';

import { ALLOWED_ORIGINS, BRAND_DIR, FAVICON_FILE, MEDIA_DIR } from '../config';
import {
  checkSources,
  designTargetFile,
  mediaFileName,
  parseSources,
  renderSources,
  type MediaSources,
} from '../sources';

const U = 'https://invetec.eu/wp-content/uploads/';

describe('mediaFileName', () => {
  it.each([
    ['2023/03/INVETEC-Logo-Lettering-white-300x90.webp', 'invetec-logo-lettering-white.webp'],
    [
      '2024/11/Pandora-Smart-V4-homepage-frame-1536x864.webp',
      'pandora-smart-v4-homepage-frame.webp',
    ],
    [
      '2025/06/Works-2025-Pandora-Marine-Sea-Doo-RXT-XRS-scaled.jpg',
      'works-2025-pandora-marine-sea-doo-rxt-xrs.jpg',
    ],
    ['2026/02/Pandora-KeyCard-context-scaled-e1770714262162.webp', 'pandora-keycard-context.webp'],
    ['2023/10/FineVu_GX33_en_main.webp', 'finevu-gx33-en-main.webp'],
    ['2024/02/New-Driver-Speed-Control-.webp', 'new-driver-speed-control.webp'],
    ['2024/09/Pandora-Smart-v4-package-web.PNG', 'pandora-smart-v4-package-web.png'],
    ['2024/01/300x200.webp', '300x200.webp'],
    ['2024/01/Caf%C3%A9-Bar.webp', 'caf-bar.webp'],
  ])('names %s as %s', (upload, name) => {
    expect(mediaFileName(`${U}${upload}`)).toBe(name);
  });

  it('refuses a name without an image extension or without letters and digits', () => {
    expect(() => mediaFileName(`${U}2024/01/video.mp4`)).toThrow('no image extension');
    expect(() => mediaFileName(`${U}2024/01/---.webp`)).toThrow('no letters or digits');
  });
});

describe('designTargetFile', () => {
  it('drops the img/ prefix under the media folder', () => {
    expect(designTargetFile('img/pricelist/acc-band.png')).toBe(
      `${MEDIA_DIR}/pricelist/acc-band.png`,
    );
  });
});

const VALID: MediaSources = {
  media: [
    { url: `${U}2025/03/Elite.webp`, file: `${MEDIA_DIR}/elite.webp`, uses: ['productImg.elite'] },
  ],
  chrome: [
    { url: `${U}2023/02/Logo.webp`, file: `${BRAND_DIR}/logo.webp`, uses: ['header logo'] },
    { url: `${U}2023/05/favi.webp`, file: FAVICON_FILE, uses: ['favicon'] },
  ],
  designFiles: [
    {
      designFile: 'img/pricelist/truck.png',
      file: `${MEDIA_DIR}/pricelist/truck.png`,
      uses: ['productImg.truck'],
    },
  ],
};

function withMedia(url: string, file = `${MEDIA_DIR}/x.webp`): MediaSources {
  return { ...VALID, media: [{ url, file, uses: ['test'] }] };
}

function withDesign(designFile: string, file: string): MediaSources {
  return { ...VALID, designFiles: [{ designFile, file, uses: ['test'] }] };
}

// The same upload over plain HTTP (built, so no `http://` literal is needed).
const PLAIN_HTTP = new URL(`${U}x.webp`);
PLAIN_HTTP.protocol = 'http:';

describe('checkSources', () => {
  it('accepts a valid file', () => {
    expect(checkSources(VALID, ALLOWED_ORIGINS)).toEqual([]);
  });

  it.each([
    [
      'another host',
      'https://lenovo.invetec.eu/x.webp',
      'origin https://lenovo.invetec.eu is not allowed',
    ],
    ['plain HTTP', PLAIN_HTTP.href, `origin ${PLAIN_HTTP.origin} is not allowed`],
    ['credentials', 'https://user@invetec.eu/x.webp', 'has credentials'],
    ['a query string', `${U}x.webp?ver=2`, 'has a query string'],
    ['an empty query string', `${U}x.webp?`, 'has a query string'],
    ['a fragment', `${U}x.webp#top`, 'has a fragment'],
    ['no URL at all', 'x.webp', 'not a URL'],
  ])('refuses %s', (_label, url, problem) => {
    expect(checkSources(withMedia(url), ALLOWED_ORIGINS)).toEqual([`media ${url}: ${problem}`]);
  });

  it('refuses a file that is not the name rule applied to the URL, or outside the media folder', () => {
    expect(checkSources(withMedia(`${U}x.webp`, `${MEDIA_DIR}/y.webp`), ALLOWED_ORIGINS)).toEqual([
      `media ${U}x.webp: file must be ${MEDIA_DIR}/x.webp, not ${MEDIA_DIR}/y.webp`,
    ]);
    expect(checkSources(withMedia(`${U}x.webp`, '../x.webp'), ALLOWED_ORIGINS)).toEqual([
      `media ${U}x.webp: file must be ${MEDIA_DIR}/x.webp, not ../x.webp`,
    ]);
  });

  it('refuses a design file outside img/, with a parent segment, or with a different target', () => {
    const outside = withDesign('../secret.png', `${MEDIA_DIR}/x.png`);
    expect(checkSources(outside, ALLOWED_ORIGINS)).toContain(
      'design file ../secret.png: not a kebab-case image path under img/',
    );
    const parent = withDesign('img/../x.png', `${MEDIA_DIR}/x.png`);
    expect(checkSources(parent, ALLOWED_ORIGINS)).toContain(
      'design file img/../x.png: not a kebab-case image path under img/',
    );
    const elsewhere = withDesign('img/a.png', `${MEDIA_DIR}/b.png`);
    expect(checkSources(elsewhere, ALLOWED_ORIGINS)).toEqual([
      `design file img/a.png: file must be ${MEDIA_DIR}/a.png, not ${MEDIA_DIR}/b.png`,
    ]);
  });

  it('refuses a URL listed twice and two sources that write one file', () => {
    const twice: MediaSources = {
      ...VALID,
      media: [
        { url: `${U}2024/A.webp`, file: `${MEDIA_DIR}/a.webp`, uses: ['one'] },
        { url: `${U}2024/A.webp`, file: `${MEDIA_DIR}/a.webp`, uses: ['two'] },
        { url: `${U}2025/a-300x200.webp`, file: `${MEDIA_DIR}/a.webp`, uses: ['three'] },
      ],
    };
    expect(checkSources(twice, ALLOWED_ORIGINS)).toEqual([
      `URL listed twice: ${U}2024/A.webp`,
      `two sources write ${MEDIA_DIR}/a.webp`,
    ]);
  });
});

describe('parseSources and renderSources', () => {
  it('round-trip the committed form, sorted by file, with one final newline', () => {
    const shuffled: MediaSources = { ...VALID, chrome: VALID.chrome.toReversed() };
    const text = renderSources(shuffled);
    expect(text.endsWith('}\n')).toBe(true);
    expect(renderSources(parseSources(text, ALLOWED_ORIGINS))).toBe(text);
    expect(parseSources(text, ALLOWED_ORIGINS).chrome.map((entry) => entry.file)).toEqual([
      FAVICON_FILE,
      `${BRAND_DIR}/logo.webp`,
    ]);
  });

  it('throw on unknown keys, a missing use, or any check problem', () => {
    const extra = JSON.stringify({ ...VALID, leftOut: [] });
    expect(() => parseSources(extra, ALLOWED_ORIGINS)).toThrow();
    const noUse = JSON.stringify({ ...VALID, media: [{ ...VALID.media[0], uses: [] }] });
    expect(() => parseSources(noUse, ALLOWED_ORIGINS)).toThrow();
    const offHost = JSON.stringify(withMedia('https://lenovo.invetec.eu/x.webp'));
    expect(() => parseSources(offHost, ALLOWED_ORIGINS)).toThrow('invalid media sources');
  });
});
