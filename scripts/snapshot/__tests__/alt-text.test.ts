// The media alt text rule (spec §3.1): which pattern applies, that a written alt wins and that
// the converter never guesses one; and that every written alt names a media file that exists.
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { mediaIdOf } from '../../../src/content/contract';
import { MANIFEST_FILE } from '../../assets/config';
import { readManifest } from '../../assets/manifest';
import { ALT_BY_MEDIA, mediaText, patternAlt, type MediaUse } from '../alt-text';
import { REPO_ROOT } from '../paths';

const photo: MediaUse = { role: 'photo', at: 'a', car: 'Car', system: 'One' };
const box: MediaUse = { role: 'package', at: 'b', brand: 'Pandora', name: 'Two' };
const part: MediaUse = { role: 'accessory', at: 'c', code: 'X-1' };

describe('the alt text rule', () => {
  it('prefers a photo pattern to a package pattern to an accessory pattern', () => {
    expect(patternAlt([part, box, photo])).toBe('Car with Pandora One installed');
    expect(patternAlt([part, box])).toBe('Pandora Two package');
    expect(patternAlt([part])).toBe('Pandora X-1');
    expect(patternAlt([{ role: 'other', at: 'd' }])).toBeUndefined();
  });

  it('takes the written alt over the pattern', () => {
    expect(mediaText('x', [box], { x: 'A box' })).toEqual({
      alt: 'A box',
      pattern: 'Pandora Two package',
    });
    expect(mediaText('x', [box], {})).toEqual({
      alt: 'Pandora Two package',
      pattern: 'Pandora Two package',
    });
  });

  it('never guesses an alt, and a decorative image has none', () => {
    expect(() => mediaText('x', [{ role: 'other', at: 'productGallery.alpha[0]' }], {})).toThrow(
      'media x (productGallery.alpha[0]) has no alt text: view the image and add it to ALT_BY_MEDIA',
    );
    expect(mediaText('x', [box, { role: 'decorative', at: 'catImg.car' }], {})).toEqual({
      decorative: true,
    });
    expect(() =>
      mediaText('x', [{ role: 'decorative', at: 'catImg.car' }], { x: 'A car' }),
    ).toThrow('media x is decorative and also has an alt in ALT_BY_MEDIA');
  });
});

describe('ALT_BY_MEDIA', () => {
  it('names only media files of the manifest', async () => {
    const manifest = await readManifest(path.join(REPO_ROOT, MANIFEST_FILE));
    const ids = new Set(
      manifest
        .keys()
        .filter((file) => file.startsWith('src/assets/media/'))
        .map((file) => mediaIdOf(file)),
    );

    expect(Object.keys(ALT_BY_MEDIA).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('holds trimmed, non-empty text', () => {
    for (const alt of Object.values(ALT_BY_MEDIA)) {
      expect(alt.trim()).toBe(alt);
      expect(alt).not.toBe('');
    }
  });
});
