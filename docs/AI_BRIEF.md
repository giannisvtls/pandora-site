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
content-snapshot/     one JSON file per collection or global: the content source; PROVENANCE.md
docs/                 this brief, gotchas.md
e2e/                  Playwright + axe specs, run against `astro preview`
public/_redirects     root redirect for the static host: /  /en/  302
redirects/            crawl.json (live URL inventory, written by `npm run crawl`), CRAWL.md (its
                      summary, written by `npm run crawl:summary`); .crawl-cache/ (gitignored)
scripts/crawl/        read-only redirect crawler (run with tsx), __fixtures__/, __tests__/
scripts/snapshot/     the one-time snapshot converter, the snapshot reader, __fixtures__/, __tests__/
scripts/pricelist/    the pricelist check behind `npm run check:pricelist` (+ __tests__/)
src/
  content/            contract/ (Zod contract; contract.ts re-exports it), loader.ts, hues.ts,
                      routes.ts, rules.ts (+ completeness.ts), levels.ts, query.ts (+
                      explainer.ts), media.ts, __tests__/
  content.config.ts   every registered collection
  components/         ProductSummary.astro, __tests__/
  layouts/            BaseLayout.astro (lang, title, skip link, main#main), __tests__/
  pages/[locale]/     index.astro, the only page (one per built language: /en/)
  test/               setup.ts, redirects.test.ts, fixtures/ (a test-only Preact island)
```

## Key Files

- `astro.config.mjs` -- static output, `site`, Preact integration, i18n routing
- `src/content/contract.ts` -- the content contract (re-exports `src/content/contract/`)
- `src/content/loader.ts` -- `contentLoader(name)`, the `CONTENT_SOURCE` switch
- `src/content/routes.ts`, `rules.ts`, `levels.ts` -- the URL map, the publish rules and the level
  rule (spec §4), pure functions over content the caller passes in
- `src/content/query.ts` -- the query module every page reads through (spec §5): `createQuery`
  and the `siteQuery()` adapter, the only code that imports `astro:content`
- `src/content/media.ts` -- the media resolver: a media id -> `ImageMetadata` + alt text
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
- `scripts/crawl/summary.ts` -- `npm run crawl:summary` entry; `summary-cli.ts` checks
  `crawl.json` and writes or `--check`s `CRAWL.md`, `summary-render.ts`, `summary-coverage.ts`
  and `summary-open-items.ts` hold its sections
- `scripts/snapshot/convert.ts` -- `npm run snapshot:convert` entry; `convert-cli.ts` reads and
  writes the files, `convert-data.ts` (with `convert-items.ts`, `media-refs.ts`, `alt-text.ts`)
  holds the rule; `read-snapshot.ts` reads the committed snapshot through the contract
- `scripts/check-pricelist.ts` -- `npm run check:pricelist` entry; `scripts/pricelist/check.ts`
  holds the transcription and the checks

## Entry Points

- Pages: `src/pages/` (file-based routing; one dynamic `[locale]` route)
- Content: `src/content.config.ts` -> `src/content/loader.ts` -> `content-snapshot/*.json`
- Build output: `dist/` (`dist/en/index.html`, `dist/_redirects`)
- CI: `.github/workflows/ci.yml`, `.github/workflows/pr-title.yml`
- Crawl: `npm run crawl` -> `scripts/crawl/crawl.ts` -> `redirects/crawl.json`; then
  `npm run crawl:summary` -> `scripts/crawl/summary.ts` -> `redirects/CRAWL.md`

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
| `npm run crawl:summary`            | Write `redirects/CRAWL.md` from `redirects/crawl.json` (no network)                        |
| `npm run crawl:summary -- --check` | Fail when `CRAWL.md` does not match `crawl.json`; writes nothing                           |
| `npm run check:pricelist`          | Check the snapshot against PRICELIST 2026; prints `clean: ...` or every problem (exit 1)   |
| `npm run snapshot:convert`         | The one-time prototype conversion (`-- --source <absolute path>`); see Content seam        |

- First e2e run on a machine: `npx playwright install chromium`. Stop `npm run dev` (or any
  preview) first: the dev server, the preview and the e2e run all use port 4321.
- The CI order, reproducible locally: `npm ci`, `npm run lint`, `npm run format:check`,
  `npm run typecheck`, `npm run test`, `npm run build`; then `npm run test:e2e`.
- Astro telemetry is on by default. CI sets `ASTRO_TELEMETRY_DISABLED=1`; locally,
  `npx astro telemetry disable` opts out once per machine.

## Content seam

Pages never read content files. Content flows contract -> loader -> `getCollection()`:

1. **Contract** (`src/content/contract/*.ts`, re-exported by `src/content/contract.ts`), plain
   `zod` (never the `z` re-exported by `astro:content`), so the CMS can share the same schemas
   later. Every schema of spec §2's collections (media, products, accessories, posts, faq,
   installers, navSections) and fixed-key sets (categories, accessoryCards, accessoryGroups,
   features, specRows, levels) is registered by name in `contract/registry.ts`, and so are the
   globals: the twelve Site copy groups (`SITE_COPY`, `contract/site-copy-*.ts`), `languages`
   and `finder` (`contract/finder.ts`).
   - **Site copy** holds every visible UI string of the prototype that the site can show,
     English as the source language: one global per page group (`siteCopyHeader`,
     `siteCopyCommon` for strings several pages share, `siteCopyHome` … `siteCopyFooter`,
     `siteCopyNotFound`). Prototype-only notes and strings no launch item can reach are left
     out. Product, accessory, post, FAQ and feature texts are collection data, not Site copy.
     What the prototype builds by concatenation is a `template` with named placeholders, counts
     are `plural` (Intl.PluralRules) or `byCount` ("Both / All three / All four"), and every
     h1/h2 is a `heading` (`lead <span class="b">payload</span>`). Code never builds a sentence
     from fragments in its own word order, because word order differs per language. It joins
     copy fields only where the contract defines the join, and the field's schema comment says
     how:
     - a `heading`'s lead and payload (and the home band's `headingEnd` line after it);
     - a bold opening plus its rest, `<strong>strong</strong> rest` (`strongLead`, the compare
       standouts, `findsIt`);
     - a home log row's title and text, joined by a space, or by nothing when the text starts
       with punctuation;
     - two parts side by side with `·` (the product's full-spec summary, the compare extras
       line);
     - a sentence followed by a link or a value (`warrantyQuestion` + `warrantyLink`, a fold
       label + its row labels, `noImmobilizer` / `noTracking*` + a level's "Where it stops"
       text, the related heading's payload = the vehicle word).

     Facts (the company name, phone, email, postal code, a car in the proof rail) are plain
     strings shared by every language.

   - `LOCALES = ['en', 'el', 'it', 'sq']`. Localized text is one language map per field
     (`localizedText`): a language without a translation has no key; there is never English
     filler in another language. A value is never empty, whitespace-only or untrimmed.
   - Every language map an item carries needs its source language: `showIn[0]` for items
     (`itemSchema` in `contract/item.ts`), English for media, fixed-key sets and globals. Errors
     name the path down to the locale (`name.en`, `specGroups.0.items.1.en`). The one exception
     is a `plural`'s optional `few` / `many`: they never need English; add them only in the
     languages whose plural rules select them (the schema does not enforce this), and a renderer
     falls back to `other` when the selected form is absent.
   - Primitives (`contract/primitives.ts`): `template(placeholders)` (every value uses exactly
     the declared `{name}` placeholders and no other `{` or `}`), `plainText` (no `{` or `}` at
     all: every Site copy text that is not a template, headings included), `plural`, `byCount`,
     `heading`, `partialDate`, ids and slugs; rich text (`contract/rich-text.ts`); the fixed keys
     (`contract/keys.ts`: categories, levels, the 22 spec rows, route keys).
2. **Loader** (`src/content/loader.ts`): `contentLoader(name)` returns an Astro `Loader` for any
   registered collection or global. It reads `CONTENT_SOURCE` on every load:
   - unset or `snapshot`: the snapshot. It reads `content-snapshot/<name in kebab-case>.json`
     (`navSections` -> `nav-sections.json`) from the project root and validates everything
     before touching the store (each error names the item id, or `global`, and the field path; a
     repeated id and invalid JSON are errors too), then `store.clear()` and one `store.set()` per
     item, by id. A global's file holds one object, stored as the entry `global`.
   - `payload`: throws `CONTENT_SOURCE=payload is implemented in Phase 5`.
   - anything else, an empty string included: throws, naming the value and the allowed ones.
   - It does not call `context.parseData`: Astro applies a collection `schema` only there, and it
     would re-run the same contract.
3. **Collection** (`src/content.config.ts`): one `defineCollection()` per registered name, with
   `loader: contentLoader(name)` and that name's schema.
4. **Pages** read through the query module (`src/content/query.ts`, see Query module below),
   never `astro:content` (a unit test fails when a page imports it). `ProductSummary` shows name,
   tag and blurb in the page's locale only: a field missing in that locale renders nothing, and
   no price is shown (prices belong on product pages).

- **The snapshot** (`content-snapshot/`) has one file per collection or global, and it is the
  source of truth: content edits go into these files directly (decision P1-10).
  - `npm run snapshot:convert -- --source <absolute path to nightwatch-data.js>`
    (`scripts/snapshot/`) converted the prototype's data file into it once: every collection file,
    `finder.json` and `src/content/hues.ts` (product hues are code, A7). It reads the file as
    data, never runs it, and is deterministic: a second run on the same file writes the same
    bytes. `PROVENANCE.md` records the source file name, its SHA-256 and the date. Running it
    again would overwrite every edit made since; it is kept for the record and its tests.
  - English everywhere; Greek only where the prototype had it (6 product blurbs, the 38 accessory
    descriptions, the camper category description). Every item has `showIn` all four languages.
  - Media: one item per file of `src/assets/media/` the content uses (92), its id the file path
    without the extension, `/` as `-` (`pricelist-acc-band`). Alt text follows the patterns of
    spec §3.1 or, where none fits the picture, `ALT_BY_MEDIA` in `scripts/snapshot/alt-text.ts`,
    written after viewing each image; category heads are decorative. The home hero poster's file
    is also Smart V4's install image, so it has an alt; the hero renders it with `alt=""`
    because of where it sits (spec §3.1).
  - The `site-copy-*.json` files hold the prototype's English, transcribed once;
    `languages.json` has `en` live and `el`, `it`, `sq` not live.
  - Guards: the unit test `src/content/__tests__/integrity.test.ts` checks that every reference
    across the snapshot resolves (A13); `npm run check:pricelist` checks the matrix, the prices,
    the accessories, the Finder picks and the level lists against PRICELIST 2026 (constants in
    `scripts/pricelist/check.ts`, shared with the framework tool until it retires).
- **The data store**: `astro build`, `sync` and `check` keep it in
  `node_modules/.astro/data-store.json`; `astro dev` keeps its own in `.astro/data-store.json`. It
  persists between runs; the loader clears it on every load, so a changed or removed item is never
  served stale.
- **`CONTENT_SOURCE` comes only from the process environment** (shell or CI). A `.env` entry is
  ignored, because Astro loads `.env` after the content sync. CI leaves it unset.
- **Adding a collection or global:** its schema in `src/content/contract/`, an entry in
  `COLLECTIONS` or `GLOBALS` (`contract/registry.ts`), `content-snapshot/<kebab-name>.json`, and
  a `defineCollection` in `content.config.ts` (the typecheck fails until it is there).

## Routes and publish rules

Spec §4, pure TypeScript with no Astro import and no file read: the caller (the query module)
passes the content in as `ContentData` (`rules.ts`: every collection and global as the contract
types it; the snapshot readers in `scripts/` use the same type).

- **`routes.ts`:** `ROUTE_PATHS` (one pattern per page type, every path ending in `/` but
  `/{L}/404.html`), `routePath(L, route, params)`, `targetHref(L, target)` for Site copy link
  targets (adds `#hash`), `productPath`, `accessoryPath` (the first vehicle; an accessory with
  no vehicle has no URL until Phase 3, so it throws), `postPath` (the slug in `L`), and
  `BUILT_PAGE_TYPES` (A18; `['home']` in Phase 1; `routes.test.ts` fails when it and the page
  files under `src/pages/` disagree). The parameters each route needs are one table,
  `ROUTE_PARAMS` in `contract/keys.ts`, which the Site copy `routeTarget` schema checks too
  (`{ route: 'category' }` without a vehicle fails at `params.vehicle`). Every value that fills a
  path follows one rule, `URL_SEGMENT` (`contract/primitives.ts`: lowercase words of a-z and 0-9
  joined by single hyphens), in the contract (slugs, an accessory's id, link target params) and
  in the builders. `systems` is the nav key of the car category page.
- **Site copy link targets** (`routeTarget`, the footer's links) name static and category pages
  only. A target carries one slug or id for every language and nothing resolves it against the
  item, so the item routes `product`, `accessory` and `post` fail at `route` (lead decision,
  cycle 5); a later phase that needs such a link adds an id-based target resolved through the
  page rules.
- **The item rule (`completeness.ts`, re-exported by `rules.ts`):** `gapsIn(value, L, media)`
  lists what a value lacks in `L`: every language map with a value in the source language
  (`showIn[0]` for items, English otherwise) and none in `L`, found by walking the value (a
  language map is an object keyed by languages only), plus `media.<id>.alt` for each referenced
  media item that is not decorative and has no alt in `L` (A3). A plural's `few` / `many`
  never count. `isComplete` and `isVisible` (`L` in `showIn` and complete) build on it. A media
  reference is a field named `image`, `installImage`, `photo`, `gallery` or a rich-text image
  block's `media`.
- **`rules.ts`:** `contentIn(data, L)` (the visible items, with fits, level systems and Finder
  picks to products that are not visible dropped), `builtLanguages(languages, { preview })`
  (preview: all four; otherwise the live ones; none live is an error),
  `languageGaps` / `assertLanguageReady(data, L)` (Site copy, the nav labels shown in `L`, the
  Finder and the fixed-key sets; one error listing every missing path), `rootLanguage` /
  `rootRedirect(built)` (`/el/` 301 once Greek is built, else a 302 to the first built of en,
  it, sq), and the pages of a `Site` (`createSite(data, { preview })`): `pageUrl`, `hasPage`
  (spec `pageExists`), `pagesIn` (the pages of a type a language has), `alternates` (with
  `x-default` -> el, else en), `sitemapEntries` and `switcherTargets` (the page in each built
  language, else that language's home).
- **`levels.ts`:** `levelOf(product, levels)` (P1-7): GPS included 3, immobilizer included 2,
  else 1; a system without a matrix takes the level that lists it, else 0. The pricelist check
  (`npm run check:pricelist`) uses the same function.

## Query module

Spec §5 (P1-1): the one way pages read content.

- **`createQuery(data, { preview })`** (`query.ts`) is pure: tests call it on fixtures or on the
  snapshot (`readSnapshot()`). Unless `preview`, it first runs `assertLanguageReady` for every
  live language, so a live language with gaps throws one error listing every missing path; a
  preview build shows all four languages without the check. It then answers for a built language
  only (another one is an error), with the contract's types and the publish rules applied:
  - `products(L)` (visible, each with `url` = its product page and `level` = `levelOf`),
    `categories(L)` (in order), `accessories(L)` (`url` under `vehicles[0]`, none without a
    vehicle), `posts(L)` (`url` with the slug in `L`), `navSections(L)` (in order, with `url`),
    `siteCopy(L)` (the 12 groups by short name: `home`, `common`, ...), `finder(L)`;
  - `explainer(L)` (`explainer.ts`): per feature key its texts in `L` and "on these systems" (a
    matrix row: the products with 1 Included or 2 Optional; a key without a row: the products
    that highlight it, Included); per level its texts and its products with the vehicle word of
    their category (`common.vehicles.*.word`, the prototype's label there). Only products
    visible in `L`, each with its URL. A text `L` lacks (preview only) is `undefined`;
  - `image(id, L)` (`media.ts`): `{ src: ImageMetadata, alt }` for `<Image>`; an unknown id, an id
    with no file and a missing alt are errors; a decorative image gets `alt=""`;
  - `staticPaths(type)`: `{ params, props: { locale, page } }` per built language (and, for item
    page types, per item visible there), the params read back from the page's URL
    (`pathParams` in `routes.ts`), so they always match the links; a type not in
    `BUILT_PAGE_TYPES` is an error;
  - `pageUrl`, `alternates`, `switcherTargets`, `sitemapEntries`: the page rules over the build's
    `Site`.
  - Item links come from the query, never from a page: a product URL exists only for a product
    visible in `L`. Product pages are built in Phase 2; until then the links 404.
- **`siteQuery()`** is the adapter: on first use it loads every collection (`getCollection`) and
  global (`getEntry(name, 'global')`) through a dynamic `import('astro:content')` and creates the
  query (`preview: false`); every page shares that one promise, so the content is loaded and
  checked once per build. Pages call it in `getStaticPaths` and in their body.
- **`media.ts`:** `MEDIA_FILES` is an eager `import.meta.glob` over `src/assets/media/**` (minus
  `manifest.json`), keyed by `mediaIdOf`; `createMediaResolver(media, files?)` binds it to the
  media items.

## i18n routing

- `astro.config.mjs`: `locales: ['el', 'en', 'it', 'sq']`, `defaultLocale: 'el'`,
  `prefixDefaultLocale: true`, `redirectToDefaultLocale: false`. Every locale has a path prefix,
  Greek included. `defaultLocale` exists only because Astro's routing requires one; English is
  the content source language.
- Path segments stay English in every locale.
- One page, `src/pages/[locale]/index.astro`. Its `getStaticPaths` is the query's
  `staticPaths('home')`: one page per built (live) language, so the build has
  `dist/en/index.html` and no other locale. Setting `languages.el.live` makes the build fail
  until Greek is complete (the readiness check).
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

- **What it fetches:** first the `robots.txt` of both hosts; then, per host, every sitemap
  reachable from its `Sitemap:` lines, `/sitemap_index.xml` (Yoast) and `/wp-sitemap.xml`
  (WordPress core), indexes expanded recursively; every sitemap URL; then, once, every same-host
  page link found on a sitemap page that no sitemap lists (`source: "link"`; their own links are
  not followed).
- **Safety:** GET only, never a URL with a query string, never a host other than the two;
  `robots.txt` `User-agent: *` Allow/Disallow obeyed for every request (a 4xx other than 429
  means no rules; 429, 5xx or a network error means "disallow all", RFC 9309); 2 requests in
  flight, 250 ms pause per slot, 20 s timeout, 2 retries (1 s, then 2 s) on network errors and
  5xx; redirects followed by hand, at most 5 per URL, never to another site or a query string. A
  `robots.txt` `Crawl-delay` longer than 250 ms on either host stops the crawl (exit 1) before
  any sitemap request. 20 URLs in a row ending in a network error, timeout, 403, 429 or 5xx stop
  the run, counting only URLs that had not failed in an earlier run. The one-hop filter drops
  fragments, query strings, `/wp-content/`, `/wp-json/`, `/wp-admin/`, `/wp-includes/`,
  `wp-*.php`, `xmlrpc.php`, feeds and every file extension but `.html`/`.htm`/`.php`; skipped
  links are counted, not listed.
- **URL identity:** two URLs that differ only in the case of a percent-escape (`%ce%b5` and
  `%CE%B5`, RFC 3986 6.2.2.1) are the same URL (`urlKey()` in `output.ts`): one sitemap entry
  (the other counts as a duplicate), never a link-only URL when a sitemap lists it, one record.
  Records keep the spelling the site used; a sitemap's spelling wins over a link's. Path case and
  the trailing slash stay significant.
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
- **Resume and chunks:** `redirects/.crawl-cache/` (gitignored; only `--fresh` deletes it) holds
  `state.json` (the finished seed: robots, sitemaps, sitemap URLs, accepted seed failures),
  `seed-failures.json` (until the seed finishes), `pages.jsonl` (one line per URL per run that
  tried it: `record`, `links`, `failedRuns`, `isFinal`; the last line per URL wins) and
  `requests.jsonl`. Running the same command again resumes. `--max-minutes <n>` bounds the run,
  seed included: at the deadline the requests in flight are aborted and their URLs left for the
  next run (not failures, not cached), and queued requests end without waiting. A retry backoff
  already sleeping (up to 2 s) or a slot pause (250 ms) still runs out, so a run can end about
  2-3 s after the deadline. `--max-requests <n>` stops starting new URLs; it does not stop the
  seed.
- **Retries across runs:**
  - Seed: a robots.txt or sitemap request that fails (network error, timeout, 429, 5xx; 403 too
    for a sitemap file) leaves the seed incomplete: no `state.json`, a
    `SEED INCOMPLETE: <url> <status or error> (failed N of 3 seed attempts in a row)` line per
    failure, exit 3, and the next run seeds again. A robots.txt failure ends the attempt before
    any sitemap request. After 3 failed seed attempts in a row the request is accepted as failed:
    robots.txt as disallow-all for its host, a sitemap file as `skipped` with its status and a
    note. Each accepted failure is printed as a `WARNING:` line by that run and every later one,
    and again after `COMPLETE`. A sitemap 404/410 is "not present"; a robots.txt 4xx other than
    429 means no rules. A robots.txt that redirects to another site, or to another path on its
    host, is final: its host is disallow-all at once (no redirect is followed for robots.txt
    except to `/robots.txt` on the same host) and gets the same `WARNING:` line.
  - Pages: a URL that ends in a network error, timeout, 403, 429 or 5xx stays open. Each run
    tries the URLs it never tried before those that failed in an earlier run. After a URL has
    failed in 3 runs its last result is final and goes into `crawl.json` with its status or
    error.
- **Exit codes and the last lines:** `COMPLETE: wrote <path> (N URLs)`, exit 0, only when every
  URL has a final result (the last progress line says `0 remaining`); `crawl.json` is written
  atomically through `.crawl-cache/`. Otherwise exit 3 with `STOPPED (<reason>)`: `max-minutes`,
  `max-requests`, `failures` (the brake), `retry` (`N URLs to retry`: every URL was tried, some
  have runs left) or `seed-incomplete`. Exit 2 for bad arguments or a Node older than 24 (checked
  before anything is loaded), exit 1 for an error (such as a long Crawl-delay).
- **Request log:** `requests.jsonl` has a `sent` line just before each request goes out
  (`event`, `seq`, `ts`, `method`, `url`, `attempt`, `robotsAllowed`) and a `done` line when it
  ends (`event`, `seq`, `ts`, `url`, `status`, `error`, which can be `aborted`). Join them on
  `seq`, which continues across runs; a `sent` line without a `done` line is a request cut by a
  killed process. A robots-disallowed URL is never sent, so it is never logged.
- **Summary:** `npm run crawl:summary` reads `crawl.json` (no network), validates it against
  `crawlOutputSchema`, cross-checks its own counts (each sitemap file's URL count equals the
  records with that `source`; every `<url>` entry a host's sitemap files list is taken, a
  duplicate or skipped; per-host and link-only totals) and writes `CRAWL.md`: totals,
  sitemaps and robots.txt, URLs by host x `lang` x `pageType`, final results with the non-200,
  redirect-loop and redirect lists, robots meta and noindex pages (a "page" answered 200 without
  a redirect; URLs that redirect to a noindex page are listed apart), hreflang siblings of the Greek
  pages, link-hop orphans, the roadmap's Open item 5 (language trees by path and `<html lang>`)
  and Open item 6 (URL groups with no planned new home) and the `_redirects` rule-limit line for
  Phase 7. It maps no URL to a new page. The Markdown goes through Prettier's API with the repo
  config, so `format:check` agrees with it. `--check` writes nothing and exits 1, naming the
  first differing line, when `CRAWL.md` is not exactly what `crawl.json` gives; the unit test
  `the committed inventory` runs the same check, so CI fails on a hand edit or a stale summary.
  Like `crawl.ts`, `summary.ts` refuses a Node older than 24 (exit 2) before loading anything,
  and it resolves the repo's Prettier plugins from the repo, so it runs from any directory.
- **The committed inventory:** `crawl.json` and `CRAWL.md` hold the crawl of 2026-10-09: 4,639
  URLs (invetec.eu 2,115, lenovo.invetec.eu 2,524; 4,146 from sitemaps, 493 from the link hop).
  After a new crawl, run `npm run crawl:summary` and commit both files together.
- **Tests** never touch the network: fixtures in `scripts/crawl/__fixtures__/` are synthetic
  Yoast/WordPress-core files, the unit and end-to-end tests use a fake `fetch`, the dry run serves
  the fixtures from two local servers on 127.0.0.1. A Vitest setup file
  (`scripts/crawl/__tests__/fetch-guard-setup.ts`, in `setupFiles`) replaces the global `fetch`
  for every test file with a guard that refuses any host but 127.0.0.1.

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
- `/en/` lists the products visible in English (all 16 systems), and only `/en/` is built.
- No CMS yet: `CONTENT_SOURCE=payload` throws until Phase 5.
- No 404 page yet (Phase 1, with a per-locale strategy).
- No islands ship: the only Preact component is the test fixture
  `src/test/fixtures/FixtureToggle.tsx`, which no page imports.
- The skip link text, "Skip to main content", is English on every locale until Phase 1's UI
  strings translate it.
- `redirects/crawl.json` is the inventory, not the redirect map: the crawler and the summary map
  no old URL to a new page (Phase 7 builds the map).

Repo-specific traps and their fixes: `docs/gotchas.md`.
