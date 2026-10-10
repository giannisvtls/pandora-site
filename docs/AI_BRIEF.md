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
                      explainer.ts), media.ts, copy.ts, __tests__/
  content.config.ts   every registered collection
  components/         SiteHeader.astro, ThemeToggle.astro, LanguageSwitcher.astro,
                      SiteFooter.astro, FeatureButton.astro, LevelButton.astro, system-index.ts
                      (the interim index's content), islands/ (MobileMenu.tsx + MobileMenu.css
                      and menu-dialog.ts, its behaviour; __tests__/), __tests__/
  fonts/              fontsource-variable.ts (the Fonts API provider), __tests__/
  layouts/            BaseLayout.astro (head, theme script, skip link, header, main#main, footer,
                      reveal script), head.ts (what the head says), shell.ts (what the header and
                      footer say), __tests__/
  pages/[locale]/     index.astro, the only page (one per built language: /en/), the interim
                      system index
  styles/             tokens.css (design tokens), base.css (element defaults, utilities, reveal
                      grammar), __tests__/
  test/               setup.ts (+ the jsdom <dialog> stand-in), container.ts (a Container API
                      container that renders Preact islands), redirects.test.ts, fixtures/ (a
                      test-only Preact island)
```

## Key Files

- `astro.config.mjs` -- static output, `site`, Preact integration, the two font families (Fonts
  API), i18n routing
- `src/layouts/BaseLayout.astro` -- the document shell of every page (see Styles, fonts and the
  page shell)
- `src/content/contract.ts` -- the content contract (re-exports `src/content/contract/`)
- `src/content/loader.ts` -- `contentLoader(name)`, the `CONTENT_SOURCE` switch
- `src/content/routes.ts`, `rules.ts`, `levels.ts` -- the URL map, the publish rules and the level
  rule (spec §4), pure functions over content the caller passes in
- `src/content/query.ts` -- the query module every page reads through (spec §5): `createQuery`
  and the `siteQuery()` adapter, the only code besides `content.config.ts` that imports
  `astro:content`
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

- **Site:** astro 7.3.8, @astrojs/preact 6.0.6, preact 10.29.8, zod 4.6.5,
  @fontsource-variable/sofia-sans 5.3.0, @fontsource-variable/sofia-sans-extra-condensed 5.3.0
  (OFL-1.1; read at build time only)
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
   never `astro:content` (a unit test fails when a page imports it). Components get what they
   show as props (see The site shell below); none reads content itself.

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
  - Products carry `order`, their place in the prototype (the flagship first in each category):
    added to `products.json` by hand after the conversion (cycle 8), and written by the converter
    too, so a re-run gives the same file.
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
  joined by single hyphens), in the contract (slugs, an accessory's id) and in the builders.
  `systems` is the nav key of the car category page.
- **Nav sections** lead to a page whose path takes no parameter, the 404 page excepted
  (`NAV_ROUTE_KEYS` in `contract/nav-sections.ts`, derived from `ROUTE_PARAMS`): a section has no
  vehicle, slug or id to fill one with, so `{ route: 'category' }` fails at `route` when the
  snapshot loads, instead of failing every page of the language later.
- **Site copy link targets** (`routeTarget`, the footer's links) name static and category pages
  only. A target would carry one slug or id for every language and nothing resolves it against
  the item, so the item routes `product`, `accessory` and `post` fail at `route` (lead decision,
  cycle 5), and so does the 404 page (`notFound`), which no link leads to. The only parameter a
  target can carry is therefore a `vehicle`; a `slug` or `id` key is unknown. A later phase that
  needs an item link adds an id-based target resolved through the page rules.
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
  preview build shows all four languages without the check. It then answers with the contract's
  types and the publish rules applied. The content answers and `image()` refuse a language that
  is not built (an error); the page rules answer for the built languages only, so there `pageUrl`
  is `undefined`, `sitemapEntries` is `[]`, and `alternates` and `switcherTargets` list the built
  languages (none of the targets current):
  - `products(L)` (visible, in their `order`, each with `url` = its product page and `level` =
    `levelOf`),
    `categories(L)` (in order), `accessories(L)` (`url` under `vehicles[0]`, none without a
    vehicle), `posts(L)` (`url` with the slug in `L`), `navSections(L)` (in order, with `url`),
    `siteCopy(L)` (the 12 groups by short name: `home`, `common`, ...), `finder(L)`;
  - `explainer(L)` (`explainer.ts`): per feature key its texts in `L` and "on these systems" (a
    matrix row: the products with 1 Included or 2 Optional; a key without a row: the products
    that highlight it, Included); per level its texts and its products with the vehicle word of
    their category (`common.vehicles.*.word`, the prototype's label there). Only products
    visible in `L`, each with its URL. A text `L` lacks (preview only) is `undefined`;
  - `image(id, L)` (`media.ts`): `{ src: ImageMetadata, alt }` for `<Image>`; an unknown id, an
    item whose file is missing and a missing alt are errors; a decorative image gets `alt=""`;
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
  `manifest.json`), keyed by the path from the project root; `createMediaResolver(media, files?)`
  finds each media item's image through the item's own `file`, so two files whose names give one
  id (`car.png` beside `car.webp`) never stand in for each other; an item whose file is missing
  is an error naming both.

## Styles, fonts and the page shell

Spec §6.

- **`src/styles/tokens.css`:** the design's tokens with the design file's values (nightwatch.css):
  the light ones on `:root`, and the dark scope on `:root[data-theme="dark"]` plus the surfaces
  that are always night (`.hero`, `#log`, `.pg-head.img`, `.band`, `.shot`, `.hdr:not(.solid)`,
  `.m-nav`). `tokens.test.ts` lists every token of the design file and checks value and scope.
  The two type tokens are not in this file: `--display` and `--body` are the Fonts API's CSS
  variables.
- **`src/styles/base.css`:** element defaults, the utilities `.wrap`, `.b`, `.g`, `.muted`, `.sr`,
  `.num`, the focus ring (`:focus-visible`), `::selection`, and the reveal grammar (`.rv`, `.rv-g`,
  `.zoom`, `.wipe`, `.line-rv`). The reveal start states hide or move content only under `html.js`
  (A11), so without JavaScript everything shows; reduced motion and print show everything at
  once. Focus targets in `<main>` and the footer get `scroll-margin-top: calc(var(--hdr) + 16px)`
  so the fixed header (88px, `--hdr`, measured by the e2e) never covers them (WCAG 2.2 SC 2.4.11),
  as long as no component rule overrides it: controls reset the browser's button styles one by
  one, never with `all: unset` (a unit test refuses an `all` declaration in the stylesheets and
  `.astro` files under `src/`, inline `style` attributes included, and in the `style` attributes
  of `.tsx` islands).
  Component styles go in each component's scoped `<style>`.
- **Fonts (A12):** `astro.config.mjs` declares Sofia Sans Extra Condensed (`--display`) and Sofia
  Sans (`--body`) through the Fonts API, subsets latin, latin-ext and greek, normal style, with
  the design's fallback lists. The provider is `fontsourceVariable(pkg)`
  (`src/fonts/fontsource-variable.ts`): it reads the pinned `@fontsource-variable/*` package in
  `node_modules` (its woff2 files, `unicode.json`, `metadata.json`), so the build makes no
  request; Astro copies the files to `dist/_astro/fonts/` and the browser loads them from the
  site. The built-in `npm` provider downloads the files from a CDN, and `local` knows no subsets
  (see gotchas). Each family is declared through `fontsourceFamily({ package, ... })`, which
  checks its subsets, styles and files while `astro.config.mjs` loads: a missing one stops the
  build ("Unable to load your Astro config"), where the Fonts API would only log the provider's
  error and build without the family (a unit test requires every `config.fonts` entry to come
  from it, `CHECKED_FAMILIES`). The face names are `<family>-<hash>`: CSS reaches them only
  through `var(--display)` / `var(--body)`. BaseLayout preloads the latin face of each family.
- **`src/layouts/BaseLayout.astro`** (props `locale`, `page`, `header` (`solid`, the default, or
  `overlay`), and for every page but home its `name` and `description`, A5) builds its head
  with `pageHead()` (`head.ts`) from the query module: the title (home's own; else Site copy
  `common.titleTemplate` around `name`), the
  description, the absolute canonical URL (`pageUrl` against astro.config.mjs `site`), one
  `hreflang` link per alternate plus `x-default`, `og:title` / `og:description` / `og:url` /
  `og:locale` (`OG_LOCALES`: `en_GB`, `el_GR`, `it_IT`, `sq_AL`), the favicon, the fonts. An
  inline script before any stylesheet sets `html.js` and `data-theme` (the saved `theme` in
  localStorage when it is `dark`, else light; storage that throws means light, P1-6). The skip
  link (Site copy `common.skipLink`) shows only while focused and leads to
  `<main id="main" tabindex="-1">`, between the site header and the site footer. An inline script at the end of `<body>` adds `.in` to each
  reveal element once a tenth of it is in view (IntersectionObserver), to an element taller than
  nine viewports as soon as it is in view, and to every reveal element at once where the browser
  has no IntersectionObserver.
- **`src/content/copy.ts`:** `textIn(text, L, field)` (a Site copy value, or an error naming the
  field), `fill(template, values)` (a template's `{name}` placeholders, nothing else) and
  `pluralIn(plural, L, field, { count, ... })` (the form `Intl.PluralRules` picks, else `other`;
  `{count}` written the language's way).

## The site shell

Spec §7. Everything visible comes through the query module: BaseLayout builds the header's and
footer's content with `src/layouts/shell.ts` and passes it down as props, and the page builds the
index's with `src/components/system-index.ts`. No component holds visible copy (A6).

- **`SiteHeader.astro`** (`content` from `headerContent(query, page, L)`, `variant`): the logo
  link to the language home (Site copy `header.homeLinkLabel`, alt `header.logoAlt`; the white
  logo shows on the dark surfaces, the dark one on light), the primary nav (the nav sections shown
  in `L`, in order; `aria-current="page"` on the page's section, `sectionOf(page)`: category and
  product pages are `systems`, a post `blog`), the compare link (`common.pages.compare`, named
  `header.compareLinkLabel`, its count badge `hidden` until Phase 2), the theme toggle
  (`ThemeToggle.astro`), the language switcher and the mobile menu (see Islands). `solid` sits on
  the page background, fixed, with an 88px spacer after it; `overlay` (Phase 2's hero) is
  transparent until the page's first section has scrolled up under it, and only where its script
  can tell: with JavaScript (`html.js`) and an IntersectionObserver (otherwise the script adds
  `solid` at once), while the header is fixed over that section. Without JavaScript, and in the
  page flow below 1120px, the overlay has the solid background in its night tokens
  (`e2e/overlay.spec.ts`, on a fixture page made from the built `/en/`). From 1120px the header is
  one fixed 88px row. Below 1120px (`max-width: 1119px`) it sits in the page flow and wraps when
  it must, so it never covers the content: with JavaScript the mobile menu's burger stands in for
  the nav and the switcher (`html.js` hides them); without JavaScript they stay inline and the
  burger is hidden (A11). The breakpoint is not the design's 900px: under WCAG 1.4.12 text spacing
  the one-row header needs 957px in English, 997px with two language codes and 1076px with all
  four, and a fixed row cannot scroll to what overflows (`e2e/header-spacing.spec.ts` checks every
  width from 320 to 1440px, with one and with four codes). The island's `client:media`, the theme
  toggle's touch size and MobileMenu.css use the same query (`header-menu.test.ts`).
- **`ThemeToggle.astro`:** a plain `<button>` whose `aria-label` names what a press does
  (`header.themeToDark` / `themeToLight`), no `aria-pressed` (an action label with a pressed state
  contradicts itself). The script after it sets the label from the theme the head script applied,
  then on a press flips `data-theme`, saves it (storage that throws only loses the save), updates
  the label and dispatches `themechange` on `document` (`detail`: the theme). Without JavaScript
  the toggle is hidden. It is drawn 38px square (46px below 1120px), content-box like the design's
  `all: unset` button.
- **`LanguageSwitcher.astro`** (P1-5): the query's `switcherTargets(page, L)`, one entry per
  built language: the current one as text with `aria-current="true"`, every other one as
  `<a href hreflang lang>` to the page there (else that language's home). Each shows the code
  ("EN", as the design does) and carries the endonym (`LANGUAGE_NAMES`) in a `.sr` span, so its
  name reads "EL Ελληνικά" and keeps the visible code (WCAG 2.5.3, Label in Name).
- **`SiteFooter.astro`** (`content` from `footerContent(query, L, year)`): the company block in
  `<address>` (name, the `addressLine` template, hours, `tel:` and `mailto:` links), the footer
  copy's columns (h2) with their targets resolved by `routes.ts` (A9: a link with no target and a
  column left without links are not rendered), the legal line (the build year's copyright and the
  tagline).
- **`FeatureButton.astro` / `LevelButton.astro`** (spec §8): a
  `<button type="button" aria-haspopup="dialog">` with `data-fx` (the feature key; shows the
  feature's title) or `data-lvl` (the level; shows `common.level`, "Level 3 · Recovery"). They
  open nothing until the explainer island (slice 10).
- **The interim index** (P1-8, `src/pages/[locale]/index.astro`): the home hero heading as the h1
  (`lead <span class="b">payload</span>`), then, in order, each category that has a visible
  system, as an h2 over its systems: the package shot through `<Image>` (A19; `widths` 320 and
  640, lazy), the name (h3), the level button, the tag, the highlight feature buttons and the "See the system" link to
  the product URL (404 until Phase 2). Systems come in their `order` (the prototype's, flagship
  first; the Content Layer hands the collection over sorted by id). No reveal classes, so the h1
  (LCP) never starts hidden.
- **Inline scripts** (Phase 5's `_headers` needs a CSP hash for each): the theme script in the
  head, the theme toggle's script (ThemeToggle), the overlay header's script (SiteHeader, overlay
  pages only), Astro's island runtime with its `client:media` loader (and its `<style>`), which
  Astro writes beside the first island, and the reveal script at the end of `<body>`.

## Islands

Spec §8: Preact, a native `<dialog>` opened with `showModal()` (A10), every label from Site copy.
An island takes plain, serialisable props and imports only types from `src/content/` (a value
import of `query.ts` or `media.ts` would put the eager media glob and zod into the browser). Its
markup carries no Astro scope, so its styles are a global stylesheet next to it. Without
JavaScript nothing an island renders is needed (A11).

- **`islands/MobileMenu.tsx`** (+ `MobileMenu.css`), in SiteHeader with
  `client:media="(max-width: 1119px)"`: its script and Preact load only below 1120px (about 8 KB
  gzip with the renderer; `MobileMenu.*.js` is 3.3 KB, 1.5 KB gzip, and imports Preact and its
  hooks only). Props (`MobileMenuProps`, built by `headerContent(...).menu` in `shell.ts`): the
  labels (`header.openMenu`, `closeMenu`, `mobileNavLabel`, `languageLabel`), the nav's links
  with `isCurrent`, and the switcher's languages with their endonym. The burger
  (`aria-haspopup="dialog"`, `aria-controls`) opens a full-screen modal dialog named by its nav
  (`aria-labelledby` on the nav, whose `aria-label` is the mobile nav label: no new string). The
  behaviour is `menu-dialog.ts` (`wireMenu`, native listeners on the server's markup). The close
  button sits over the burger, fixed to the screen: measured once the dialog is open (the scroll
  lock can move the burger) and again on every resize while it is open (rotation, zoom), kept on
  the screen, so it stays in reach while the menu scrolls; links that take focus stop below it
  (`scroll-margin-top`). The links and the switcher are centred on the screen as the design's. Focus
  goes to the first link; Tab and Shift+Tab wrap at the ends, and from the dialog itself (a click
  on its background) or anywhere else that is not a control (a native modal dialog lets focus
  leave the page for the browser's own UI); Escape (the browser's close request), the close
  button, following a link and a resize that hides the burger (the screen grew past the
  breakpoint) close it. The dialog's `close` event, which every way out ends in, ends the resize
  watch and gives focus back to the burger, or, once the burger is gone, to the header's own link
  to where focus was in the menu (else its first nav link). The page under it does not scroll
  (`html:has(.m-nav[open]) { overflow: hidden }`, lifted on every close). The design's
  burger-to-X morph is not ported: the close button is a control of its own inside the modal,
  drawn as the X, so nothing animates. No reveal classes: the reveal script never sees island
  markup. Tests: `islands/__tests__/MobileMenu.test.tsx` (jsdom, with the `showModal()` stand-in
  of `src/test/setup.ts`), `components/__tests__/header-menu.test.ts` (Container API),
  `e2e/menu.spec.ts` (390 × 844, 1280, 1120, 1119, without JavaScript, axe with the menu open in
  both themes), `e2e/menu-resize.spec.ts` (rotation, zoom, scrolling, growing past the breakpoint,
  a click on the background; helpers in `e2e/menu-fixtures.ts`) and `e2e/header-spacing.spec.ts`.

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

- Styling so far is the shell (tokens, base styles, fonts, skip link, header, footer, mobile
  menu) and the interim index; the explainer island comes later in Phase 1.
- No deploy: no hosting project, no `_headers`, no Functions. `public/_redirects` is the only
  host file.
- `/en/` is the interim system index (the 16 systems visible in English), and only `/en/` is
  built; its system links 404 until Phase 2.
- No CMS yet: `CONTENT_SOURCE=payload` throws until Phase 5.
- No 404 page yet (Phase 1, with a per-locale strategy).
- One island ships, the mobile menu (below 1120px only); the explainer comes in slice 10. The
  test fixture `src/test/fixtures/FixtureToggle.tsx` is imported by no page.
- `redirects/crawl.json` is the inventory, not the redirect map: the crawler and the summary map
  no old URL to a new page (Phase 7 builds the map).

Repo-specific traps and their fixes: `docs/gotchas.md`.
