# pandora-site -- AI Brief

**Stack:** Node 24 / Astro 7 (static output) with Preact islands / TypeScript 6 (strictest)
**Database:** none. Content reaches pages through an Astro Content Layer loader; today its source
is a JSON snapshot in the repo, a CMS source arrives in Phase 5.
**Last explored:** 2026-10-09

## Purpose

The INVETEC / Pandora website (`https://invetec.eu`), rebuilt as a static Astro site. Phase 0 is
groundwork: every quality gate (types, lint, format, unit tests, build, e2e + axe, CI), a
proven content seam that renders one product on `/en/`, and a read-only crawler that inventories
the live URLs for the future redirect map.

## Structure

```
.github/workflows/    ci.yml (quality + e2e jobs), pr-title.yml
.husky/pre-commit     Node 24 guard -> astro sync -> lint-staged
content-snapshot/     products.json: the snapshot content source (one product)
docs/                 this brief, gotchas.md
e2e/                  Playwright + axe specs, run against `astro preview`
public/_redirects     root redirect for the static host: /  /en/  302
redirects/            crawl.json (live URL inventory, written by `npm run crawl`); .crawl-cache/
scripts/crawl/        read-only redirect crawler (run with tsx), __fixtures__/, __tests__/
src/
  content/            contract.ts (Zod contract), loader.ts (Content Layer loader), __tests__/
  content.config.ts   the `products` collection
  components/         ProductSummary.astro, __tests__/
  layouts/            BaseLayout.astro (lang, title, skip link, main#main), __tests__/
  pages/[locale]/     index.astro, the only page (builds /en/ only)
  test/               setup.ts, redirects.test.ts, fixtures/ (a test-only Preact island)
```

## Key Files

- `astro.config.mjs` -- static output, `site`, Preact integration, i18n routing
- `src/content/contract.ts` -- the content contract: locales, language maps, `productSchema`
- `src/content/loader.ts` -- `contentLoader(collection)`, the `CONTENT_SOURCE` switch
- `src/content.config.ts` -- collections, each wired to `contentLoader`
- `src/pages/[locale]/index.astro` -- the home page per locale
- `eslint.config.js` -- typed and untyped lint layers, Astro, a11y, import, unicorn, sonarjs
- `vitest.config.ts` -- Vitest through Astro's `getViteConfig`
- `playwright.config.ts` -- e2e against `npm run build && npm run preview` on port 4321
- `.husky/pre-commit` -- refuses Node < 24, runs `astro sync`, then lint-staged
- `scripts/crawl/config.ts` -- the crawl's fixed hosts, politeness values and User-Agent
- `scripts/crawl/crawl.ts` -- `npm run crawl` entry; `cli.ts` reads the flags, `run.ts` runs the
  phases, `fetcher.ts` is the only code that sends requests, `output.ts` holds the `crawl.json`
  schema

## Entry Points

- Pages: `src/pages/` (file-based routing; one dynamic `[locale]` route)
- Content: `src/content.config.ts` -> `src/content/loader.ts` -> `content-snapshot/*.json`
- Build output: `dist/` (`dist/en/index.html`, `dist/_redirects`)
- CI: `.github/workflows/ci.yml`, `.github/workflows/pr-title.yml`
- Crawl: `npm run crawl` -> `scripts/crawl/crawl.ts` -> `redirects/crawl.json`

## Dependencies

Every version is exact in `package.json` (no `^` or `~`); `engines.node` is `>=24` and `.nvmrc`
is `24`.

- **Site:** astro 7.3.8, @astrojs/preact 6.0.6, preact 10.29.8, zod 4.6.5
- **Types:** typescript 6.0.3, @astrojs/check 0.9.10, @types/node 24.19.1
- **Lint:** eslint 10.12.0, @eslint/js 10.0.1, typescript-eslint 8.71.1, eslint-plugin-astro
  3.2.1, astro-eslint-parser 3.2.0, eslint-plugin-jsx-a11y 6.10.2, eslint-plugin-import-x 4.17.1,
  eslint-plugin-unicorn 77.0.0, eslint-plugin-sonarjs 4.2.2, eslint-config-prettier 10.1.8,
  globals 17.13.0
- **Format and hooks:** prettier 3.9.9, prettier-plugin-astro 1.1.0, husky 9.1.7, lint-staged
  17.6.0
- **Unit tests:** vitest 5.0.3, jsdom 30.1.2, @testing-library/preact 3.2.4,
  @testing-library/jest-dom 7.0.1
- **e2e:** @playwright/test 1.64.0, @axe-core/playwright 4.13.0
- **Crawl:** tsx 4.23.15 (runs `scripts/crawl/crawl.ts`; brings esbuild). The crawler parses
  sitemaps and HTML with its own small scanners, so it adds no parser dependency.

Why some pins are held back:

- `typescript` stays on 6.x: 7.x is the native compiler without a JS API, and `@astrojs/check`
  and typescript-eslint reject it.
- `preact` stays on 10.x: `@astrojs/preact` 6 peers `preact ^10`.
- `zod` 4.6.5 satisfies astro's own `zod ^4.6.5` dependency, so npm dedupes it and the contract
  and Astro share one copy.
- `eslint-plugin-jsx-a11y` is kept on ESLint 10 through an npm `overrides` entry (see
  `docs/gotchas.md`).

## Commands

Node 24 must be the first `node` and `npm` on PATH (`node -v` prints `v24.x`; 24.16 or newer
avoids EBADENGINE warnings). npm scripts and Playwright's `webServer` run whichever `node` and
`npm` PATH resolves; the pre-commit hook stops on Node < 24, where ESLint 10 crashes.

| Command                            | What it does                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `npm ci`                           | Install the locked dependencies (also installs the husky hook)                             |
| `npm run dev`                      | Dev server on http://localhost:4321 (restart it after editing `content-snapshot/`)         |
| `npm run build`                    | Static build into `dist/`                                                                  |
| `npm run preview`                  | Serve `dist/` on http://localhost:4321 (does not apply `_redirects`)                       |
| `npm run typecheck`                | `astro check` over `.astro`, `.ts` and `.tsx`                                              |
| `npm run lint` / `lint:fix`        | `astro sync && eslint .` (writes `.astro/`), with or without `--fix`                       |
| `npm run format` / `format:check`  | Prettier write / check over the whole repo                                                 |
| `npm run test`                     | Vitest, once: `src/**/*.test.{ts,tsx}` and `scripts/**/*.test.ts`                          |
| `npm run test -- <file>`           | One test file                                                                              |
| `npm run test:e2e`                 | Playwright: builds, starts `astro preview` on port 4321, runs `e2e/` in Chromium           |
| `npm run crawl -- --help`          | Crawler usage; makes no request                                                            |
| `npm run crawl -- --max-minutes 8` | Read-only crawl of the live sites, in a chunk; run it again to resume (see Redirect crawl) |

- First e2e run on a machine: `npx playwright install chromium`. Stop `npm run dev` (or any
  preview) first: the dev server, the preview and the e2e run all use port 4321.
- The CI order, reproducible locally: `npm ci`, `npm run lint`, `npm run format:check`,
  `npm run typecheck`, `npm run test`, `npm run build`; then `npm run test:e2e`.
- Astro telemetry is on by default. CI sets `ASTRO_TELEMETRY_DISABLED=1`; locally,
  `npx astro telemetry disable` opts out once per machine.

## Content seam

Pages never read content files. Content flows contract -> loader -> `getCollection()`:

1. **Contract** (`src/content/contract.ts`), plain `zod` (never the `z` re-exported by
   `astro:content`), so the CMS can share the same schemas later.
   - `LOCALES = ['en', 'el', 'it', 'sq']`. Localized text is one language map per field:
     `localizedText = z.partialRecord(localeSchema, z.string().min(1))`. A language without a
     translation has no key; there is never English filler in another language.
   - `productSchema`: `id` (`[a-z0-9-]+`), `category`, `priceEur` (positive integer), `showIn`
     (its first entry is the item's source language), `name`, `tag`, `blurb`. A `superRefine`
     requires `name` and `blurb` in the source language.
2. **Loader** (`src/content/loader.ts`): `contentLoader(collection)` returns an Astro `Loader`.
   It reads `CONTENT_SOURCE` on every load:
   - unset or `snapshot`: the snapshot. It reads `content-snapshot/<collection>.json` from the project root,
     validates every item before touching the store (each error names the item id and the field
     path; a repeated id and invalid JSON are errors too), then `store.clear()` and one
     `store.set()` per item, by id.
   - `payload`: throws `CONTENT_SOURCE=payload is implemented in Phase 5`.
   - anything else, an empty string included: throws, naming the value and the allowed ones.
   - It does not call `context.parseData`: Astro applies a collection `schema` only there, and it
     would re-run the same contract.
3. **Collection** (`src/content.config.ts`): `products` is `defineCollection()` with
   `loader: contentLoader('products')` and `schema: productSchema`.
4. **Pages** call `getCollection('products')`. `ProductSummary` shows name, tag and blurb in the
   page's locale only: a field missing in that locale renders nothing, and no price is shown
   (prices belong on product pages).

- **The snapshot** (`content-snapshot/products.json`) holds one product, `camperv3`, with English
  text and the Greek blurb.
- **The data store**: `astro build`, `sync` and `check` keep it in
  `node_modules/.astro/data-store.json`; `astro dev` keeps its own in `.astro/data-store.json`. It
  persists between runs; the loader clears it on every load, so a changed or removed item is never
  served stale.
- **`CONTENT_SOURCE` comes only from the process environment** (shell or CI). A `.env` entry is
  ignored, because Astro loads `.env` after the content sync. CI leaves it unset.
- **Adding a collection:** its schema in `contract.ts`, an entry in the loader's `CONTRACTS` map,
  `content-snapshot/<name>.json`, and a `defineCollection` in `content.config.ts`.

## i18n routing

- `astro.config.mjs`: `locales: ['el', 'en', 'it', 'sq']`, `defaultLocale: 'el'`,
  `prefixDefaultLocale: true`, `redirectToDefaultLocale: false`. Every locale has a path prefix,
  Greek included. `defaultLocale` exists only because Astro's routing requires one; English is
  the content source language.
- Path segments stay English in every locale.
- One page, `src/pages/[locale]/index.astro`. Its `getStaticPaths` returns only `en` in Phase 0,
  so the build has `dist/en/index.html` and no other locale.
- There is no `src/pages/index.astro`. The root `/` is line 1 of `public/_redirects`,
  `/  /en/  302`, applied by the static host. Astro's own `redirects` config would emit
  meta-refresh pages, not HTTP redirects.
- `astro preview` does not apply `_redirects` (`/` is a 404 there), so a unit test
  (`src/test/redirects.test.ts`) checks the line, and the e2e server waits on `/en/`.

## Redirect crawl

`npm run crawl` (`scripts/crawl/`, Node + tsx, no browser) inventories the live URLs of
`https://invetec.eu` and `https://lenovo.invetec.eu` into `redirects/crawl.json`, for the later
301 map. The hosts, the politeness values and the User-Agent are constants in `config.ts`; no flag
can point the crawler anywhere else.

- **What it fetches, per host:** `robots.txt`; every sitemap reachable from its `Sitemap:` lines,
  `/sitemap_index.xml` (Yoast) and `/wp-sitemap.xml` (WordPress core), indexes expanded
  recursively; every sitemap URL; then, once, every same-host page link found on a sitemap page
  that no sitemap lists (`source: "link"`; their own links are not followed).
- **Safety:** GET only, never a URL with a query string, never a host other than the two;
  `robots.txt` `User-agent: *` Allow/Disallow obeyed for every request (an unreachable
  `robots.txt` means "disallow all"); 2 requests in flight, 250 ms pause per slot, 20 s timeout,
  2 retries (1 s, then 2 s) on network errors and 5xx; redirects followed by hand, at most 5 per
  URL, never to another site or a query string. A `robots.txt` `Crawl-delay` longer than 250 ms
  stops the crawl before any page request. 20 URLs in a row ending in a network error, 403, 429
  or 5xx stop the run. The one-hop filter drops fragments, query strings, `/wp-content/`,
  `/wp-json/`, `/wp-admin/`, `/wp-includes/`, `wp-*.php`, `xmlrpc.php`, feeds and every file
  extension but `.html`/`.htm`/`.php`; skipped links are counted, not listed.
- **Output:** `{ crawledAt, tool, hosts, robots, counts, urls }`, schema `crawlOutputSchema` in
  `output.ts`. `urls` is sorted by `url` (code-unit order) with one record per URL: `url`,
  `host`, `source` (`sitemap:<file name>` or `link`), `lastmod`, `status`, `redirectChain`
  (`{ url, status, location }` per hop), `finalUrl`, `contentType`, `htmlLang`, `pathLang`,
  `lang`, `pageType`, `title`, `canonical`, `hreflang`, `robotsMeta`, and `error` (why no final
  non-redirect response: `network: <code>`, `timeout`, `robots-disallowed`, `redirect-loop`,
  `too-many-redirects`, `redirect-off-site`, `redirect-to-query`, `invalid-redirect`).
  `status`, `finalUrl` and `contentType` describe the last response received. URLs keep their
  percent-encoding exactly as the site wrote it.
- **Languages and types:** `pathLang` is the `/en/`, `/it/` or `/sq/` prefix, else the host's
  root language (`el` on invetec.eu, `null` on lenovo). `lang` is the primary subtag of
  `<html lang>` (`en-US` -> `en`), else `pathLang`. `pageType` is `home` for `/` and a bare
  language root, `shop-system` for WooCommerce shop/cart/checkout/my-account pages, then the
  sitemap file's object type, then the URL pattern, else `other`.
- **Resume and chunks:** `redirects/.crawl-cache/` (gitignored) holds `state.json` (robots and
  sitemaps, read once), `pages.jsonl` (one finished URL per line) and `requests.jsonl` (every
  request: `ts`, `method`, `url`, `status`, `attempt`, `robotsAllowed`, `error`). Running the same
  command again resumes; `--fresh` deletes the cache. `--max-minutes <n>` / `--max-requests <n>`
  stop starting new URLs, print the remaining count and exit 3. Results worth retrying (network
  error, 403, 429, 5xx) stay out of the cache, so the next run fetches them again.
  `crawl.json` is written (atomically) only by a run that finishes every URL; exit 0.
- **Tests** never touch the network: fixtures in `scripts/crawl/__fixtures__/` are synthetic
  Yoast/WordPress-core files, the unit and end-to-end tests use a fake `fetch`, the dry run serves
  the fixtures from two local servers on 127.0.0.1, and the global `fetch` is replaced by a guard
  that refuses any other host.

## CI

- `ci.yml` runs on pull requests to `main` and pushes to `main`; a newer push to a PR cancels its
  older run, while every commit on `main` keeps its own result. `permissions: contents: read`, `ASTRO_TELEMETRY_DISABLED: 1`, Node from
  `.nvmrc`, actions pinned to major tags.
  - **quality:** `npm ci`, `lint`, `format:check`, `typecheck`, `test`, `build`.
  - **e2e:** `npm ci`, `npx playwright install --with-deps chromium`, `test:e2e`; the
    `playwright-report/` folder is uploaded as an artifact when the job fails. Under `CI`,
    Playwright forbids `.only`, retries twice, keeps a trace of the first retry, uses the GitHub
    reporter and never reuses a running server.
- `pr-title.yml` checks that pull request titles follow Conventional Commits (types feat, fix,
  chore, docs, refactor, test, ci, build, perf, style, revert) with
  `amannn/action-semantic-pull-request@v6` and `pull-requests: read`. It uses the `pull_request`
  trigger, so it also runs on the pull request that adds it; pull requests from forks are not
  supported.

## Notes

Phase 0 limits:

- No styling: `/en/` is plain semantic HTML. The design port comes in Phase 1.
- No deploy: no hosting project, no `_headers`, no Functions. `public/_redirects` is the only
  host file.
- One product (`camperv3`) in the snapshot, and only `/en/` is built.
- No CMS yet: `CONTENT_SOURCE=payload` throws until Phase 5.
- No 404 page yet (Phase 1, with a per-locale strategy).
- No islands ship: the only Preact component is the test fixture
  `src/test/fixtures/FixtureToggle.tsx`, which no page imports.
- `/en/` lists every product in the snapshot. The per-locale item rule (`showIn`, required text)
  comes with Phase 1.
- The skip link text, "Skip to main content", is English on every locale until Phase 1's UI
  strings translate it.
- `redirects/crawl.json` exists only once a crawl has finished; the crawler does not build the
  redirect map itself.

Repo-specific traps and their fixes: `docs/gotchas.md`.
