// The extraction rule on a small prototype fixture: what it selects (launch products, launch
// categories, the hero poster, the proof-rail cars, posts, accessories, logos, favicon), what it
// leaves out (parked items, `handed`, proof photos off the rail), and that a second run writes the
// same bytes.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ALLOWED_ORIGINS,
  BRAND_DIR,
  DESIGN_DATA_FILE,
  DESIGN_HTML_FILE,
  FAVICON_FILE,
  FAVICON_URL,
  MEDIA_DIR,
  SOURCES_FILE,
} from '../config';
import { extractSources, parsePrototypeData, type PrototypeData } from '../extract';
import { EXTRACT_EXIT_CODES, runExtractCli } from '../extract-cli';
import { checkSources, renderSources } from '../sources';
import { captureIo, useSandboxes } from './fetch-setup';

const sandbox = useSandboxes();

const U = 'https://invetec.eu/wp-content/uploads/';

function fixtureData(): PrototypeData {
  return {
    products: [
      { id: 'elite', cat: 'car' },
      { id: 'car-acc', cat: 'car' },
      { id: 'truck', cat: 'fleet' },
    ],
    cats: [{ id: 'car' }, { id: 'fleet' }],
    posts: [{ id: 'news' }, { id: 'older' }],
    accessories: [
      { id: 'd-061', img: 'img/pricelist/acc-d-061.png' },
      { id: 'harness', img: '' },
    ],
    productImg: {
      elite: `${U}2025/03/Elite-V3-package.webp`,
      'car-acc': `${U}2024/11/Accessories.webp`,
      truck: 'img/pricelist/truck.png',
      fortin: `${U}2024/04/FORTIN.webp`,
    },
    productGallery: { elite: [`${U}2025/03/Commander.webp`], fortin: [`${U}2024/03/fortin.jpg`] },
    installImg: {
      elite: `${U}2025/05/Works-Elite-Audi-RS6.jpg`,
      fortin: `${U}2025/05/Works-Fortin.jpg`,
    },
    proofImg: {
      'Audi RS6': `${U}2025/05/Works-Elite-Audi-RS6.jpg`,
      'BMW 7 Series': `${U}2026/03/Works-BMW.jpg`,
    },
    postImg: { _note: 'stand-ins', news: `${U}2026/02/Post.webp`, older: `${U}2023/03/fleet.webp` },
    catImg: {
      car: `${U}2023/03/CAR.webp`,
      fleet: `${U}2023/03/fleet.webp`,
      multimedia: 'https://lenovo.invetec.eu/wp-content/uploads/2026/07/Unit.webp',
    },
    smartFrame: `${U}2024/11/Frame-1536x864.webp`,
    handed: `${U}elementor/thumbs/handed-x.webp`,
    U,
    parked: { products: [{ id: 'fortin' }], cats: [{ id: 'multimedia' }] },
  };
}

const LOGOS = `<a href="#/"><img class="lw" src="${U}2023/03/Logo-white-300x90.webp" alt="INVETEC"><img class="ld" src="${U}2023/02/Logo.webp" alt="INVETEC"></a>`;

const HTML = [
  `<header class="hdr">${LOGOS}</header>`,
  // The template literals of the prototype page, kept as text.
  `<section class="hero"><img class="poster" src="\${D.smartFrame}" alt=""></section>`,
  `<section class="sec wrap" id="street"><div class="grid">\${[['s1','Audi RS6','Elite V3 · 2025']].map(([c,car])=>car)}</div></section>`,
  `<footer class="ftr">${LOGOS}</footer>`,
].join('\n');

describe('extractSources', () => {
  const { sources, leftOut } = extractSources(fixtureData(), HTML);

  it('selects the launch images with every use, and nothing parked', () => {
    expect(sources.media.map(({ url, file, uses }) => [url.slice(U.length), file, uses])).toEqual([
      ['2025/03/Elite-V3-package.webp', `${MEDIA_DIR}/elite-v3-package.webp`, ['productImg.elite']],
      ['2025/03/Commander.webp', `${MEDIA_DIR}/commander.webp`, ['productGallery.elite[0]']],
      [
        '2025/05/Works-Elite-Audi-RS6.jpg',
        `${MEDIA_DIR}/works-elite-audi-rs6.jpg`,
        ['installImg.elite', 'proofImg.Audi RS6 (home proof rail)'],
      ],
      ['2024/11/Accessories.webp', `${MEDIA_DIR}/accessories.webp`, ['productImg.car-acc']],
      ['2023/03/CAR.webp', `${MEDIA_DIR}/car.webp`, ['catImg.car']],
      ['2023/03/fleet.webp', `${MEDIA_DIR}/fleet.webp`, ['catImg.fleet', 'postImg.older']],
      ['2024/11/Frame-1536x864.webp', `${MEDIA_DIR}/frame.webp`, ['smartFrame (home hero poster)']],
      ['2026/02/Post.webp', `${MEDIA_DIR}/post.webp`, ['postImg.news']],
    ]);
  });

  it('copies the prototype images the launch site uses', () => {
    expect(sources.designFiles).toEqual([
      {
        designFile: 'img/pricelist/truck.png',
        file: `${MEDIA_DIR}/pricelist/truck.png`,
        uses: ['productImg.truck'],
      },
      {
        designFile: 'img/pricelist/acc-d-061.png',
        file: `${MEDIA_DIR}/pricelist/acc-d-061.png`,
        uses: ['accessories.d-061'],
      },
    ]);
  });

  it('takes the header and footer logos and the favicon as chrome', () => {
    expect(sources.chrome).toEqual([
      {
        url: `${U}2023/03/Logo-white-300x90.webp`,
        file: `${BRAND_DIR}/logo-white.webp`,
        uses: ['header logo (img.lw)', 'footer logo (img.lw)'],
      },
      {
        url: `${U}2023/02/Logo.webp`,
        file: `${BRAND_DIR}/logo.webp`,
        uses: ['header logo (img.ld)', 'footer logo (img.ld)'],
      },
      { url: FAVICON_URL, file: FAVICON_FILE, uses: [expect.stringContaining('favicon')] },
    ]);
  });

  it('lists what it leaves out with the data paths that use it', () => {
    expect(leftOut).toEqual([
      { ref: `${U}2024/03/fortin.jpg`, at: ['productGallery.fortin[0]'] },
      { ref: `${U}2024/04/FORTIN.webp`, at: ['productImg.fortin'] },
      { ref: `${U}2025/05/Works-Fortin.jpg`, at: ['installImg.fortin'] },
      { ref: `${U}2026/03/Works-BMW.jpg`, at: ['proofImg.BMW 7 Series'] },
      { ref: `${U}elementor/thumbs/handed-x.webp`, at: ['handed'] },
      {
        ref: 'https://lenovo.invetec.eu/wp-content/uploads/2026/07/Unit.webp',
        at: ['catImg.multimedia'],
      },
    ]);
  });

  it('passes the source checks and renders the same bytes on every run', () => {
    expect(checkSources(sources, ALLOWED_ORIGINS)).toEqual([]);
    const again = extractSources(fixtureData(), HTML);
    expect(renderSources(again.sources)).toBe(renderSources(sources));
  });
});

describe('extractSources refuses', () => {
  it('an item both parked and live', () => {
    const data = fixtureData();
    data.parked.products.push({ id: 'elite' });
    expect(() => extractSources(data, HTML)).toThrow('parked and live at once: elite');
  });

  it('a proof-rail car without a photo, and a page without a hero poster', () => {
    const data = fixtureData();
    delete data.proofImg['Audi RS6'];
    expect(() => extractSources(data, HTML)).toThrow('no photo for the proof-rail car Audi RS6');
    expect(() => extractSources(fixtureData(), HTML.replace('class="poster"', ''))).toThrow(
      'no hero poster',
    );
  });

  it('nothing off the allowed origin silently: the checks name a selected off-site image', () => {
    const data = fixtureData();
    data.productImg.elite = 'https://lenovo.invetec.eu/wp-content/uploads/x.webp';
    expect(checkSources(extractSources(data, HTML).sources, ALLOWED_ORIGINS)).toEqual([
      'media https://lenovo.invetec.eu/wp-content/uploads/x.webp: origin https://lenovo.invetec.eu is not allowed',
    ]);
  });
});

describe('parsePrototypeData', () => {
  it('reads the data file as JSON, never as code', () => {
    const text = `// generated\nwindow.INVETEC_DATA=${JSON.stringify(fixtureData(), null, 1)};\n`;
    expect(parsePrototypeData(text).products).toHaveLength(3);
    expect(() => parsePrototypeData('window.OTHER={};')).toThrow('no window.INVETEC_DATA=');
    expect(() => parsePrototypeData('window.INVETEC_DATA=(() => ({}))();')).toThrow();
  });
});

// A design folder with the fixture data file, page and pricelist images (one of them unused).
async function designFolder(): Promise<string> {
  const dir = await sandbox();
  const text = `// generated\nwindow.INVETEC_DATA=${JSON.stringify(fixtureData())};\n`;
  await writeFile(path.join(dir, DESIGN_DATA_FILE), text);
  await writeFile(path.join(dir, DESIGN_HTML_FILE), HTML);
  await mkdir(path.join(dir, 'img', 'pricelist'), { recursive: true });
  for (const name of ['truck.png', 'acc-d-061.png', 'unused.png']) {
    await writeFile(path.join(dir, 'img', 'pricelist', name), name);
  }
  return dir;
}

async function repoRoot(): Promise<string> {
  const root = await sandbox();
  await mkdir(path.join(root, 'scripts', 'assets'), { recursive: true });
  return root;
}

describe('the media:sources command line', () => {
  it('writes the sources file, then --check finds it in sync and reports a hand edit', async () => {
    const designDir = await designFolder();
    const root = await repoRoot();
    const { out, io } = captureIo();

    expect(await runExtractCli(['--design-dir', designDir], root, io)).toBe(EXTRACT_EXIT_CODES.ok);
    const written = await readFile(path.join(root, SOURCES_FILE), 'utf8');
    const expected = extractSources(fixtureData(), HTML);
    expect(written).toBe(renderSources(expected.sources));
    expect(out.join('')).toContain(
      'not referenced by the launch site, not copied: img/pricelist/unused.png',
    );

    expect(await runExtractCli(['--design-dir', designDir, '--check'], root, io)).toBe(
      EXTRACT_EXIT_CODES.ok,
    );
    await writeFile(path.join(root, SOURCES_FILE), written.replace('productImg.elite', 'edited'));
    expect(await runExtractCli(['--design-dir', designDir, '--check'], root, io)).toBe(
      EXTRACT_EXIT_CODES.failed,
    );
  });

  it('refuses a missing or relative --design-dir, and fails on a missing design file', async () => {
    const root = await repoRoot();
    const { err, io } = captureIo();
    expect(await runExtractCli([], root, io)).toBe(EXTRACT_EXIT_CODES.usage);
    expect(await runExtractCli(['--design-dir', 'design_files'], root, io)).toBe(
      EXTRACT_EXIT_CODES.usage,
    );
    const designDir = await designFolder();
    await rm(path.join(designDir, 'img', 'pricelist', 'truck.png'));
    expect(await runExtractCli(['--design-dir', designDir], root, io)).toBe(
      EXTRACT_EXIT_CODES.failed,
    );
    expect(err.join('')).toContain('missing design file img/pricelist/truck.png');
  });
});
