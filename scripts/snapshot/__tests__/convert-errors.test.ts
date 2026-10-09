// What stops the snapshot converter, on the fixture data file (__fixtures__/prototype-data.json):
// each error names the data that caused it.
import { describe, expect, it } from 'vitest';

import { convertPrototype } from '../convert-data';
import { fixtureData, INPUTS, type Loose } from './fixture';

describe('what stops the conversion', () => {
  it.each<[string, (data: Loose) => void, string]>([
    [
      'a date in another form',
      (data) => {
        (data.posts as Loose[])[1] = { ...(data.posts as Loose[])[1], date: 'Spring 2025' };
      },
      'posts.second.date: "Spring 2025" is not a date the converter reads',
    ],
    [
      'an image the manifest does not hold',
      (data) => {
        (data.productImg as Loose).beta = 'img/pricelist/gamma.png';
      },
      'productImg.beta: img/pricelist/gamma.png is not in the media manifest',
    ],
    [
      'a system without its detail',
      (data) => {
        delete (data.productDetail as Loose).beta;
      },
      'productDetail.beta is missing in the prototype data',
    ],
    [
      'a value the contract refuses (named with the item and the field)',
      (data) => {
        (data.accessories as Loose[])[0] = { ...(data.accessories as Loose[])[0], price_eur: 0 };
      },
      'accessories d-061:\n    priceEur:',
    ],
    [
      'an item id used twice',
      (data) => {
        const accessories = data.accessories as Loose[];
        accessories.push({ ...accessories[0], code: 'D-061-B' });
      },
      'accessories d-061: the id appears more than once',
    ],
    [
      'a matrix value for a key that is not a spec row',
      (data) => {
        const specs = data.specs as Record<string, Loose>;
        specs.alpha = { ...specs.alpha, speed: 1 };
      },
      'specs.alpha.speed is not a spec row',
    ],
    [
      'a hue that is not #RRGGBB',
      (data) => {
        (data.hues as Loose).alpha = { light: ['blue', '#012C55'], dark: ['#34BFFE', '#0382FC'] };
      },
      'hues.alpha: every colour must be #RRGGBB (blue, #012C55, #34BFFE, #0382FC)',
    ],
  ])('%s', (_what, change, message) => {
    expect(() => convertPrototype(fixtureData(change), INPUTS)).toThrow(message);
  });

  it('names a key of the data file that has another shape', () => {
    expect(() =>
      fixtureData((data) => {
        data.specRows = 'none';
      }),
    ).toThrow(/the prototype data does not have the expected shape:\n {2}specRows: /u);
  });
});
