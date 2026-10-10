// The build integration (spec §9) on a scratch dist/: `_redirects` from the live languages, each
// language's 404 page moved to {L}/404.html, and the images in _astro/ that no built file names
// deleted while every named one stays; then the hook itself, over the committed snapshot.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { byCodeUnit } from '../../../scripts/crawl/output';
import { REPO_ROOT } from '../../../scripts/snapshot/paths';
import { fixtureContent } from '../../content/__tests__/rules-fixtures';
import type { Locale } from '../../content/contract';
import {
  buildFiles,
  finishBuild,
  moveNotFoundPages,
  pruneUnreferencedImages,
  unreferenced,
} from '../build-files';

const scratch: string[] = [];

afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// A scratch dist/ holding `files` (path -> content).
function distWith(files: Readonly<Record<string, string>>): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'build-files-'));
  scratch.push(dir);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    writeFileSync(path.join(dir, file), content);
  }
  return dir;
}

// Every file under `dir`, relative to it, with `/`, sorted.
const filesOf = (dir: string) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)))
    .map((file) => file.replaceAll('\\', '/'))
    .toSorted(byCodeUnit);

const languagesWith = (...live: readonly Locale[]) => fixtureContent(live).languages;

// A built site: two language 404 folders, images named from HTML (src, srcset, JSON-LD), CSS and
// JavaScript, two images nothing names, a font and a public file.
const DIST = {
  '404.html': '<html lang="en"><img src="/_astro/logo.A1_b2.webp"></html>',
  'en/index.html': [
    '<img src="/_astro/shot.B1_c2.webp" srcset="/_astro/shot.B1_c2.webp 320w, /_astro/shot.B1_d3.webp 640w">',
    '<script type="application/ld+json">{"logo":"https://invetec.eu/_astro/logo.A1.webp"}</script>',
  ].join('\n'),
  'en/404/index.html': '<html lang="en">en 404</html>',
  'el/404/index.html': '<html lang="el">el 404</html>',
  '_astro/index.C1.css': '.x{background:url(/_astro/bg.D1.png)}',
  '_astro/island.E1.js': 'const icon = "/_astro/icon.F1.jpg";',
  '_astro/logo.A1_b2.webp': 'image',
  '_astro/logo.A1.webp': 'image',
  '_astro/shot.B1_c2.webp': 'image',
  '_astro/shot.B1_d3.webp': 'image',
  '_astro/bg.D1.png': 'image',
  '_astro/icon.F1.jpg': 'image',
  '_astro/orphan.G1.webp': 'a'.repeat(12),
  '_astro/orphan.H1.png': 'b'.repeat(18),
  '_astro/fonts/face.I1.woff2': 'font',
  'favicon.webp': 'icon',
};

describe('finishBuild', () => {
  it('writes _redirects, moves the 404 pages and deletes only the images nothing names', async () => {
    const dir = distWith(DIST);
    const finished = await finishBuild(dir, languagesWith('en'));

    expect(readFileSync(path.join(dir, '_redirects'), 'utf8')).toBe('/  /en/  302\n');
    expect(finished.redirects).toBe('/  /en/  302\n');
    expect(finished.moved).toEqual(['en', 'el']);
    expect(finished.pruned).toEqual({
      files: ['orphan.G1.webp', 'orphan.H1.png'],
      bytes: 12 + 18,
    });
    const kept = Object.keys(DIST).filter((file) => !/orphan|\/404\//u.test(file));
    expect(filesOf(dir)).toEqual(
      [...kept, '_redirects', 'el/404.html', 'en/404.html'].toSorted(byCodeUnit),
    );
    expect(readFileSync(path.join(dir, 'en/404.html'), 'utf8')).toBe(DIST['en/404/index.html']);
    expect(existsSync(path.join(dir, 'en/404'))).toBe(false);
  });

  it('sends the root to the live languages only: /el/ with a 301 once Greek is live', async () => {
    const dir = distWith(DIST);
    await finishBuild(dir, languagesWith('en', 'el'));

    expect(readFileSync(path.join(dir, '_redirects'), 'utf8')).toBe('/  /el/  301\n');
  });

  it('fails when a live language has no 404 page', async () => {
    const dir = distWith({ 'en/404/index.html': 'en 404' });

    await expect(finishBuild(dir, languagesWith('en', 'el'))).rejects.toThrow(
      'The build has no 404 page for "el": el/404.html is missing',
    );
  });
});

describe('moveNotFoundPages', () => {
  it('moves nothing when no language has a 404 folder', async () => {
    const dir = distWith({ '404.html': 'root', 'en/index.html': 'home' });

    expect(await moveNotFoundPages(dir)).toEqual([]);
    expect(filesOf(dir)).toEqual(['404.html', 'en/index.html']);
  });

  it('fails on a 404 folder that holds another file, rather than delete it', async () => {
    const dir = distWith({ 'en/404/index.html': 'en 404', 'en/404/extra.txt': 'extra' });

    await expect(moveNotFoundPages(dir)).rejects.toThrow();
    expect(existsSync(path.join(dir, 'en/404/extra.txt'))).toBe(true);
  });
});

describe('pruneUnreferencedImages', () => {
  it('keeps an image named only by an SVG, a sitemap or a JSON file', async () => {
    const dir = distWith({
      '_astro/sprite.J1.svg': '<svg><image href="/_astro/inner.K1.png"/></svg>',
      'page.html': '<img src="/_astro/sprite.J1.svg">',
      'sitemap-en.xml': '<image:loc>https://invetec.eu/_astro/map.L1.webp</image:loc>',
      'data.json': String.raw`{"src":"\/_astro\/json.M1.webp"}`,
      '_astro/inner.K1.png': 'image',
      '_astro/map.L1.webp': 'image',
      '_astro/json.M1.webp': 'image',
    });

    expect(await pruneUnreferencedImages(dir)).toEqual({ files: [], bytes: 0 });
  });
});

describe('unreferenced', () => {
  it('finds a name as written or URL-encoded, nowhere else', () => {
    const texts = ['<img src="/_astro/a%20b.N1.webp">', 'url(/_astro/c.O1.png)'];

    expect(unreferenced(['a b.N1.webp', 'c.O1.png', 'c.O1.webp', 'd.P1.jpg'], texts)).toEqual([
      'c.O1.webp',
      'd.P1.jpg',
    ]);
  });
});

describe('the integration', () => {
  it('finishes dist/ once the build is done, from the committed snapshot', async () => {
    const dir = distWith(DIST);
    const info = vi.fn<(message: string) => void>();
    const { hooks } = buildFiles();

    await hooks['astro:config:done']?.({ config: { root: pathToFileURL(REPO_ROOT) } } as never);
    await hooks['astro:build:done']?.({
      dir: pathToFileURL(`${dir}${path.sep}`),
      logger: { info },
    } as never);

    // The snapshot has English live, Greek not.
    expect(readFileSync(path.join(dir, '_redirects'), 'utf8')).toBe('/  /en/  302\n');
    expect(existsSync(path.join(dir, 'en/404.html'))).toBe(true);
    expect(info.mock.calls).toEqual([
      ['_redirects: /  /en/  302'],
      ['404 pages moved: en/404.html, el/404.html'],
      ['2 unreferenced images deleted (0 KB)'],
    ]);
  });
});
