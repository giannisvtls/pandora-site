# pandora-site -- Gotchas

Traps this repo has already hit, each with its symptom and fix. Read the section for the area you
are about to touch. When you hit a new one, add it here in the same shape.

## Runtime and install

- **Node older than 24 on PATH.** The repo needs Node 24 (`engines`, `.nvmrc`), and every npm
  script, git hook and Playwright's `webServer` uses whichever `node` and `npm` PATH resolves
  first.
  - Symptom: ESLint 10 crashes (eslint-plugin-unicorn) on Node 20; the pre-commit hook stops with
    `pre-commit: Node 24+ is required`; when Node 24 is not first on PATH, Playwright's
    `webServer` (`npm run build && npm run preview`) can quietly build on the older Node.
  - Fix: put Node 24's `node` and `npm` first on PATH before any npm command or `git commit`.
    The hook's guard exists because lint-staged reverts the staged files when ESLint crashes.
- **EBADENGINE warnings on an early Node 24.** eslint-plugin-astro 3.2.1 and astro-eslint-parser
  3.2.0 declare Node `^24.16.0`; jsdom 30.1.2 and some of its dependencies (w3c-xmlserializer,
  @asamuzakjp/\*) declare `^24.15.0`.
  - Symptom: `npm ci` prints EBADENGINE warnings; lint and tests still work.
  - Fix: use a current Node 24 (24.16 or newer). `engines` stays `>=24`.
- **eslint-plugin-jsx-a11y peer-caps ESLint 9.** 6.10.2 declares a peer of `eslint ^9` but works
  on ESLint 10, and eslint-plugin-astro's a11y configs need it.
  - Symptom: without the override, `npm ci` / `npm install` fails with ERESOLVE.
  - Fix: the `package.json` `overrides` entry
    `{ "eslint-plugin-jsx-a11y": { "eslint": "$eslint" } }`. Never add `legacy-peer-deps=true` to
    an `.npmrc`: it turns off peer checks for every package and hides real conflicts. Resolve any
    future peer conflict the same way: one exact `overrides` entry, recorded here.
- **eslint-plugin-react on ESLint 10.**
  - Symptom: the plugin crashes on ESLint 10 (it calls the removed `context.getFilename`).
  - Fix: do not add it. It only targets React anyway; Preact files get jsx-a11y.
- **TypeScript 7.** 7.x is the native compiler with no JS API.
  - Symptom: `@astrojs/check` and typescript-eslint reject it.
  - Fix: keep `typescript` pinned to 6.0.3; decline TS 7 bumps until both tools support it.
- **Lockfile noise.**
  - Symptom: `npm ls` prints `@img/sharp-wasm32 extraneous`.
  - Fix: nothing; it is an npm optional-platform quirk, not drift. Never run
    `npm install --package-lock-only` to "sync" the lockfile (an `engines` change needs no
    lockfile change). The lockfile was written by npm 10; CI's Node 24 ships npm 11, which reads
    the same lockfile v3. If CI's `npm ci` ever reports the lockfile out of sync, regenerate it
    with `npm install` on Node 24's npm and commit it on its own.
- **Line endings.** Prettier enforces `endOfLine: lf`.
  - Symptom: without `.gitattributes`, a Windows clone (git `autocrlf`) checks files out with
    CRLF and `npm run format:check` fails on every file.
  - Fix: keep `.gitattributes` (`* text=auto eol=lf`).

## Lint and format

- **Type-aware lint covers only `src/**/*.{ts,tsx}` and `scripts/**/*.ts`.** `.astro`
  frontmatter gets the untyped strict rules, and `.astro` client `<script>`s get no type-aware
  rules.
  - Symptom: an unsafe `any` or a floating promise in `.astro` frontmatter passes lint.
  - Fix: keep frontmatter thin; put logic in `.ts` modules under `src/`.
- **`import-x/no-cycle` cannot see `.astro` files.** import-x loads parsers with `require()`, and
  astro-eslint-parser is ESM-only, so `.astro` is left out of its dependency graph.
  - Symptom: an import cycle that passes through an `.astro` file is not reported.
  - Fix: keep shared logic in `.ts` modules, where cycles are caught.
- **`./x.js` specifiers that point at `./x.ts`.**
  - Symptom: without the resolver's `extensionAlias`, `no-cycle` misses cycles written with
    Node-ESM `.js` specifiers.
  - Fix: keep `extensionAlias` in the import-x resolver settings of `eslint.config.js`.
- **Typed lint needs `.astro/types.d.ts`.** It is generated and gitignored; files that import
  `astro:content` resolve their types through it.
  - Symptom: on a fresh clone, a bare `eslint` reports `no-unsafe-*` errors on `astro:content`
    importers.
  - Fix: lint through `npm run lint`, which runs `astro sync` first (so lint also writes
    `.astro/`). The pre-commit hook runs `astro sync` before lint-staged for the same reason.
- **The first lint after `npm ci` is slow.**
  - Symptom: 60-230 s for the first typed lint on a cold install (about 10 s warm). It is not
    hung.
  - Fix: wait.
- **Preact labels.** jsx-a11y's label rule only recognises `htmlFor`.
  - Symptom: a Preact `<label for="...">` is reported as an unassociated label.
  - Fix: write `htmlFor`.
- **No global `declare module '*.astro'`.**
  - Symptom: with such a wildcard, `astro check` stops reporting a missing or misspelt `.astro`
    import (ts2307).
  - Fix: there is none on purpose. Tests that pass `.astro` components to the Container API turn
    off `@typescript-eslint/no-unsafe-argument` instead (typed ESLint sees `.astro` imports as
    error types).
- **unicorn style rules.**
  - Symptom: `unicorn/single-line-block-comment-style` rejects a one-line `/** ... */`;
    `unicorn/filename-case` rejects names that are neither kebab-case nor PascalCase.
  - Fix: use `//` for one-line comments. `[param].astro` routes are exempt from `filename-case`,
    and `__tests__`/`__fixtures__` directory names are too, but file names inside them are still
    checked.
- **Prettier and lint-staged.**
  - Symptom: a path listed in `.prettierignore` is skipped even when lint-staged passes it to
    Prettier.
  - Fix: a generated file only needs a `.prettierignore` line, not a lint-staged exclusion.
- **The pre-commit hook checks the working tree, not the staged blob.** `astro sync` runs the
  content loader over the snapshot on disk (adding about 6 s per commit).
  - Symptom: a broken but unstaged snapshot blocks a commit; a broken staged snapshot with a
    fixed working copy does not.
  - Fix: CI's build is the check for what was committed.
- **unicorn 77 boolean names cover functions too.** `unicorn/consistent-boolean-name` checks
  boolean variables and parameters, and also functions and callback parameters that return a
  boolean.
  - Symptom: lint errors on names such as `fresh`, `retryable`, `wantBody` or `sameHosts()`.
  - Fix: start them with `is`, `are`, `has`, `have`, `can`, `should`, `was`, `were`, `did`,
    `will` or `requires` (`shouldReset`, `shouldRetry`, `shouldReadBody`, `hasSameHosts()`).
- **More unicorn 77 and sonarjs rules that bite in `scripts/`.**
  - Symptom: `unicorn/prefer-https` and `sonarjs/no-clear-text-protocols` reject `http://` (and
    `ftp://`) literals, `prefer-https` even in comments; `unicorn/consistent-class-member-order`
    wants private methods before public ones; `unicorn/no-top-level-assignment-in-function`
    rejects `beforeAll(async () => { value = ... })` on a module-level `let`;
    `unicorn/require-array-sort-compare` and `sonarjs/no-alphabetical-sort` reject a bare
    `toSorted()`.
  - Fix: build a plain-HTTP test URL with `url.protocol = 'http:'`; order class members as
    fields, constructor, private methods, public methods; in a test, top-level `await` a setup
    function that returns everything (see `scripts/crawl/__tests__/dry-run.test.ts`); sort
    strings with `byCodeUnit` from `scripts/crawl/output.ts` (code-unit order, the same on every
    machine, unlike `localeCompare`).
- **`eslint --fix` rewrites `http://` inside strings.** `unicorn/prefer-https` has an autofix,
  and lint-staged runs `eslint --fix` on every commit.
  - Symptom: a test's expected text such as `origin http://invetec.eu is not allowed` silently
    becomes `https://...`, so the test asserts something else (and can still pass).
  - Fix: build a plain-HTTP URL with `url.protocol = 'http:'` and derive the expected text from
    that object (`${url.origin}`), as `scripts/assets/__tests__/sources.test.ts` does; read the
    diff of every `--fix` run that touches a test.
- **unicorn 77 call nesting and scoping.**
  - Symptom: `unicorn/max-nested-calls` rejects more than 3 nested calls, such as
    `expect(sha256(await readFile(path.join(...))))` or
    `z.union([z.strictObject({ url: z.string().min(1) })])`;
    `unicorn/consistent-function-scoping` rejects a helper defined inside `describe` or a function
    that captures nothing from it; `unicorn/prefer-await` rejects `.then()` and `.catch()` chains;
    `unicorn/prefer-iterator-to-array` rejects `[...iterator].map(...)`.
  - Fix: name the intermediate value (a schema constant, a test helper such as `fileSha()`), move
    capture-free helpers to module scope, use `try`/`await`, and write
    `iterator.map(...).toArray()`.
- **More unicorn 77 rules met in `src/content/`.**
  - Symptom: `unicorn/no-unsafe-string-replacement` rejects `path.replace('{L}', locale)` (a `$&`
    or `$1` in the value would be expanded); `unicorn/no-useless-recursion` rejects a function
    that calls itself once to rewrite its own arguments; `unicorn/consistent-boolean-name` rejects
    a spec name such as `pageExists`.
  - Fix: pass a replacer function (`.replace('{L}', () => locale)`); rewrite the arguments before
    the work instead of recursing; give the name a boolean prefix (`hasPage` for spec §4's
    `pageExists`).
- **`../` and `./` imports form one import-x group.**
  - Symptom: `There should be no empty line within import group` when a blank line separates
    `from '../x'` and `from './y'`.
  - Fix: no blank line between parent and sibling imports. Their order inside the group is not
    always `../` first: in `BaseLayout.astro` and next to `../../../astro.config.mjs` the rule
    wants `./` first. Let `eslint --fix` order them.
- **`eslint --fix` in an `is:inline` script.** `unicorn/prefer-block-statement-over-iife` and
  `unicorn/prefer-continue` fix the code but not its indentation.
  - Symptom: after the hook's `eslint --fix`, a `<script is:inline>` body sits at column 0.
  - Fix: write the script as a plain block (`{ const root = ...; }`) with early `continue`s, and
    let Prettier indent it.
- **`all: unset` clears the scroll margin too.** The design resets its buttons (`.fx`,
  `.chipfx`, `.theme-btn`) with `all: unset`, and a component's scoped rule outranks base.css's
  `main *`.
  - Symptom: every explainer button computes `scroll-margin-top: 0`; reached by Shift+Tab, a
    button stays partly or wholly under the fixed header (WCAG 2.2 SC 2.4.11), while links around
    it are clear.
  - Fix: reset the browser's button styles one by one (`appearance`, `margin`, `padding`,
    `border`, `background`, `color`, `font`, ...), never with `all`. `all: unset` also resets
    `box-sizing` to `content-box`, so a design size that counts on it (the theme button's 36px
    plus its border, drawn 38px) needs `box-sizing: content-box` written out. `base.test.ts`
    fails on an `all` declaration in a stylesheet or `.astro` file under `src/` (an inline
    `style="all: unset"` included) and in the `style` attributes of a `.tsx` island (it reads only
    those, so an ordinary object with an `all` key passes); `e2e/header.spec.ts` checks the scroll
    margin of every focus target below the header and a Shift+Tab onto a button under it.
- **Lint rules met by the shell (slice 8).**
  - Symptom: `sonarjs/super-linear-regex` rejects HTML-matching regexes such as
    `/<nav[^>]*>([\s\S]*?)<\/nav>/u` and `/<[^>]+>/gu` in tests; `unicorn/prefer-scoped-selector`
    rejects a descendant selector in `querySelector` (`'main h2'`, `'header *'`);
    `unicorn/prefer-observer-apis` rejects a scroll listener that reads layout (`scrollY`,
    `innerHeight`), in an inline script too.
  - Fix: cut HTML with `indexOf` (`between()` and `textOf()` in
    `src/components/__tests__/shell-fixtures.ts`); start such selectors with `:scope`
    (`':scope > main *'`); watch the element with an IntersectionObserver (the overlay header).
- **Byte-exact fixtures.** Prettier formats `.html` files.
  - Symptom: `prettier --write .` would reformat `scripts/crawl/__fixtures__/*.html` and break
    the tests that compare bytes.
  - Fix: `.prettierignore` lists `scripts/crawl/__fixtures__/`, and the generated
    `redirects/crawl.json`, `scripts/assets/media-sources.json` (checked byte for byte by
    `npm run media:sources -- --check`) and `src/assets/media/manifest.json`.

## Redirect crawler

- **Non-ASCII in source files.** A Unicode escape typed through an agent's file-writing tool
  (for example one for U+FEFF, the byte-order mark) can land in the file as the literal character.
  - Symptom: an invisible byte-order mark (or other raw character) inside a regex or string.
  - Fix: write code points as `String.fromCodePoint(0xfe_ff)` and classes as `\p{ASCII}` or
    `\p{Script=Greek}`; keep Greek in fixtures as real UTF-8 and check them with a byte dump
    (lead bytes `ce`/`cf`).
- **A test that forgets to inject `fetch` would crawl the live sites.** `runCli` defaults to the
  real hosts, the global `fetch` and the repo's `redirects/` folder (`runCrawl` has no defaults;
  its caller passes everything).
  - Symptom: live requests and files written into `redirects/` from a test run.
  - Fix: `vitest.config.ts` lists `scripts/crawl/__tests__/fetch-guard-setup.ts` in
    `setupFiles`, so every test file, site tests included, runs with the global `fetch` replaced
    by `loopbackOnlyFetch` (127.0.0.1 only; anything else throws before a socket opens). It can
    check only the first URL, so it makes fetch fail on any redirect unless the caller asked for
    `redirect: 'manual'` and sends each hop through the guard again, as the crawler does.
    `fetch-guard.test.ts` proves it: `runCli` without a fetch override is refused and no socket
    opens. Crawler tests still pass their own `fetch` and `outDir`.
- **A raw `Location` header.** fetch exposes header bytes as Latin-1, one character per byte.
  - Symptom: a redirect to an unencoded Greek path reads as mojibake, or a genuine Latin-1 byte
    turns into U+FFFD, and the next hop requests a URL the server never sent.
  - Fix: `repairLocation()` in `fetcher.ts` decodes the bytes as UTF-8 only when they are valid
    UTF-8 (`TextDecoder` with `fatal: true`); otherwise each high byte stays that byte,
    percent-encoded (0xE9 becomes `%E9`). Keep crawled URLs in Node; never pass them through a
    shell.
- **A run exits 3 without `crawl.json`.**
  - Symptom: the run ends with exit code 3 and one of `STOPPED (max-minutes)`,
    `STOPPED (max-requests)`, `STOPPED (failures)`, `STOPPED (retry): N URLs to retry` or
    `STOPPED (seed-incomplete)`; wrappers such as `gates.sh run crawl` report a failure.
  - Fix: expected. Run the same command again until it prints `COMPLETE` and exits 0; only that
    run writes `redirects/crawl.json`. `retry` means every URL was tried but some failed
    (network error, timeout, 403, 429, 5xx) and still have runs left; `seed-incomplete` means a
    robots.txt or sitemap request failed and the next run seeds again.
- **`SEED INCOMPLETE:` lines.**
  - Symptom: `SEED INCOMPLETE: <url> HTTP 503 (failed 1 of 3 seed attempts in a row)`, no page
    request, no `state.json`.
  - Fix: run again. A seed request that fails in 3 seed attempts in a row is accepted as failed
    (a robots.txt as disallow-all for its host, a sitemap file as skipped) and named in a
    `WARNING:` line on that run and every later one. A robots.txt that redirects to another site
    or another path is disallow-all at once and gets the same line. A `WARNING:` line means
    `crawl.json` is missing that host or that file's URLs; decide whether to rerun with `--fresh`
    later.
- **A URL keeps failing.**
  - Symptom: the same URLs appear in every run's requests and the run ends `STOPPED (retry)`.
  - Fix: expected, and bounded. Each run tries the URLs it never tried first, then those that
    failed in an earlier run. Only URLs that had not failed before count toward the brake of 20
    failures in a row, so known-bad URLs cannot stop a run. After a URL has failed in 3 runs,
    its last result is kept as final and goes into `crawl.json` with its status or error.
- **An older `crawl.json` survives `--fresh`.**
  - Symptom: after `--fresh` and a stopped run, `redirects/crawl.json` is still the previous
    finished crawl.
  - Fix: expected; check its `crawledAt`. Only a run that finishes every URL replaces it.
- **The crawl refuses a slow `Crawl-delay`.**
  - Symptom: `crawl failed: robots.txt of <host> asks for Crawl-delay N s, ...`, exit 1. Every
    host's robots.txt is read before any sitemap, so no sitemap or page has been requested on
    any host.
  - Fix: the pause is fixed at 250 ms; changing `POLITENESS.gapMs` is a decision for the site
    owner, not a workaround.
- **A full crawl is many chunks.** The live pages are slow (about 1-2 s each at 2 in flight).
  - Symptom: a `--max-minutes 7` chunk finishes about 320-530 URLs; the full crawl of 4,639 URLs
    took 12 chunks (about 87 minutes), the last ones in the link-hop phase.
  - Fix: run the same command in the foreground until `COMPLETE`; never in the background with
    polling, never through `| head`.
- **`aborted`, `502` and `UND_ERR_SOCKET` lines in `requests.jsonl`.**
  - Symptom: each chunk that stops at its deadline logs one or two `done` lines with
    `error: "aborted"`; a few lines show a
    502 or a socket reset.
  - Fix: expected. `aborted` is the `--max-minutes` deadline cutting the requests in flight (their
    URLs are fetched again by the next chunk). A 5xx or network error is retried within the same
    URL (attempts 2 and 3 in the log) before its result is recorded, so a failed request is not a
    failed URL; `pages.jsonl` holds the URL results.
- **Sitemap files that 404 or redirect on invetec.eu.** Its robots.txt lists
  `/sitemap-index.xml` and `/sitemap-index-1.xml` (both 404), `/sitemap.xml` redirects to Yoast's
  `/sitemap_index.xml`, and `/wp-sitemap.xml` 301s there too.
  - Symptom: `skipped` entries with HTTP 404 or 301 in `crawl.json` `hosts[].sitemaps`.
  - Fix: expected and not a `WARNING:` (a 404 means "not present"); the Yoast index lists every
    sitemap URL. The CRAWL.md sitemap table shows each file.
- **`<html lang>` that disagrees with the path.** lenovo.invetec.eu serves `<html lang="en-US">`
  on every page, its Italian `/it/product/` pages included; invetec.eu's `/b2b/` pages sit under
  the root (`pathLang` `el`) but declare `it-IT` (`/b2b/it/`) or `en-GB` (`/b2b/`).
  - Symptom: lenovo.invetec.eu counts under `lang` `en` in CRAWL.md; `/b2b/` pages appear as
    language-tree mismatches.
  - Fix: expected; `lang` prefers `<html lang>`. Read `pathLang` for the path's language.
- **Broken links on the live site reach the link hop.** Some invetec.eu pages link to two URLs
  glued together (`/it/products-moto-protection-it/https://invetec.eu/...`), and the site
  redirects them to a path with `https:/` before answering 404.
  - Symptom: odd 404s, some after a 301, in CRAWL.md's "Not 200" list.
  - Fix: expected; they are the site's own links, kept for Phase 7.
- **`CRAWL.md` is generated.**
  - Symptom: `npm run crawl:summary -- --check`, and the unit test `the committed inventory`,
    fail after a new crawl or a hand edit, naming the first differing line.
  - Fix: run `npm run crawl:summary` after every crawl and commit `crawl.json` and `CRAWL.md`
    together; never edit `CRAWL.md` by hand. The generator refuses a `crawl.json` whose sitemap
    counts do not equal its records, so a partial or edited `crawl.json` never gets a summary.
- **Prettier pads Markdown table columns to the widest cell.**
  - Symptom: a table of long percent-encoded Greek URLs becomes hundreds of characters wide.
  - Fix: the summary lists URLs as bullets and keeps tables for counts; its Markdown goes through
    Prettier's API (`formatSummary`), checked to be stable on a second pass, so `format:check`
    and `--check` agree.

## Media fetch

- **The crawler's `createHttp` reads every response body as text.**
  - Symptom: an image fetched through it comes back as a decoded string, its bytes corrupted.
  - Fix: `scripts/assets/download.ts` gives createHttp a fetch that reads a `200 image/*` body
    itself, as bytes with the 15 MB cap, and passes on an empty response; the limiter, retries,
    robots check, request log and hand-followed redirects stay the crawler's. Reuse that, not
    `response.text()`, for any binary download.
- **An empty query string is invisible to `URL.search`.**
  - Symptom: `new URL('https://invetec.eu/a.webp?').search` is `''`, so a `search !== ''` check
    lets `a.webp?` through and the request goes out with the `?` (the crawler's
    `assertRequestable` checks `search` only).
  - Fix: `urlProblem()` in `scripts/assets/sources.ts` refuses any URL whose text contains `?`;
    use it for media URLs and their redirect targets.

## Astro and content

- **`satisfies GetStaticPaths` widens params to `string`.**
  - Symptom: `Astro.params.locale` typed as `string` fails `Locale`-typed props in `astro check`.
  - Fix: return typed paths: the query module's `staticPaths()` declares `locale: Locale` (a
    hand-written literal needs `'en' as const`), and the page reads them through
    `InferGetStaticPropsType`, as `src/pages/[locale]/index.astro` does.
- **A custom loader bypasses the collection `schema`.** Astro applies a collection's `schema`
  only inside `context.parseData`.
  - Symptom: items written with `store.set()` are never checked against `schema`.
  - Fix: the loader validates every item against the contract itself, before touching the
    store.
- **The Content Layer data store persists between runs.** `astro build`, `astro sync` and
  `astro check` keep it in `node_modules/.astro/data-store.json`; `astro dev` keeps its own in
  `.astro/data-store.json`.
  - Symptom: a loader that only adds entries keeps serving removed or changed items. Deleting
    `.astro/` does not reset the build's store.
  - Fix: the loader calls `store.clear()` and re-sets every entry on each load. To reset by hand,
    delete `node_modules/.astro/` (builds) or `.astro/` (dev).
- **`astro dev` does not watch the snapshot.** The loader has no `context.watcher`, and the
  query adapter (`siteQuery()`) keeps the content it loaded first, a failed readiness check
  included.
  - Symptom: after editing `content-snapshot/`, the dev server keeps showing the old content (or
    the old readiness error).
  - Fix: restart `npm run dev`. Builds always read the current snapshot.
- **`astro:content` in Vitest serves no entries.** The virtual module resolves through Astro's
  Vite config, but the tests never run the loaders.
  - Symptom: `getCollection('products')` returns `[]` in a unit test, so a test through the
    adapter would pass on empty content.
  - Fix: tests call `createQuery()` on fixtures or on `readSnapshot()`; `siteQuery()` imports
    `astro:content` dynamically, so no test that imports `query.ts` loads it. The build and the
    e2e cover the adapter.
- **An empty collection warns on every build.** `installers` is empty until Phase 3 (P1-12).
  - Symptom: `[WARN] [content] The collection "installers" does not exist or is empty` while
    the build generates its routes (the query adapter loads every collection).
  - Fix: expected; it goes away when the snapshot has an installer.
- **Astro drops a line break between an expression and an element.**
  - Symptom: `{heading.lead}` on one line and `<span class="b">` on the next render as
    `anywhere<span class="b">without you.</span>`: the accessible name loses its space
    ("anywherewithout you.").
  - Fix: write the space explicitly, `{' '}` (inside a fragment it survives Prettier), or keep the
    expression and the element on one line with a space (Prettier itself joins them so in
    `LanguageSwitcher.astro`). Check the built HTML.
- **Every media file lands in `dist/_astro/`.** `MEDIA_FILES` (`src/content/media.ts`) imports
  every image under `src/assets/media/` eagerly, and Astro emits each imported image as a file;
  it deletes an original only after `<Image>` optimized it and nothing used its raw `src`.
  - Symptom: `dist/_astro/` holds the media originals no page shows (70 files, about 3.2 MB, with
    the interim index showing 16 package shots).
  - Fix: expected; visitors download only what a page references. A page that shows an image
    goes through `<Image>` (A19), so its original is replaced by the optimized output.
- **Reading a property of an imported image keeps its original in `dist/`.** An image import is a
  proxy: any property read in the page (`src.width`, `src.src`) marks the original as used, and
  the build then ships it beside the `<Image>` output.
  - Symptom: after `width={Math.min(640, image.src.width)}`, the 16 originals of the index's
    package shots (1.6 MB, a 2700 px PNG among them) are back in `dist/_astro/`.
  - Fix: pass the `ImageMetadata` to `<Image>` untouched; size it with props that need no read
    (`widths`, `sizes`).
- **`<Image widths>` without `width` writes the full-size image as `src`.** Astro keeps the
  original dimensions for `src` (converted to WebP) and caps `widths` at the original width.
  - Symptom: a 2700 px package shot ships a 2700 px `src` (149 KB) beside its 320w and 640w files,
    and `width="2700"`.
  - Fix: harmless (browsers that read `srcset` never fetch `src`; the attributes keep the aspect
    ratio). A fixed `width` larger than a small original adds yet another file, so the index
    passes `widths` only.
- **The Content Layer returns a collection sorted by id.** Astro's data store
  (`astro/dist/content/data-store-writer.js`) writes entries in id order, whatever order the
  loader set them in.
  - Symptom: without a sort, the build lists products elite, immo, light, lightpro, ..., while
    `readSnapshot()` (the unit tests) keeps the file's order, so no unit test over the snapshot
    sees the difference.
  - Fix: any list whose order matters needs an `order` field or an explicit sort in the query.
    Three readers sort today: `products(L)` (products have `order`, the prototype's, flagship
    first), `categories(L)` and `navSections(L)`. Not yet: FAQ, spec rows and accessory groups
    have `order` but no reader sorts them; posts need a date sort, accessories an order and
    accessory cards a fixed order. Add each sort with the page that first shows the list
    (Phases 2-3).
    A test that matters for order feeds the query the items reversed or sorted by id, and the e2e
    checks the built page.
- **Image imports in Vitest are `ImageMetadata`.** Vitest runs through Astro's Vite config.
  - Symptom: `src` is a dev-server URL (`/@fs/.../x.webp?origWidth=...`), not the build's
    `/_astro/x.<hash>.webp`.
  - Fix: assert `width`, `height` and `format`, and that `src` names the file; never the exact
    `src`.
- **`CONTENT_SOURCE` from `.env` is ignored.** Astro loads `.env` after the content sync.
  - Symptom: `CONTENT_SOURCE=payload` in `.env` has no effect.
  - Fix: only the process environment (shell or CI) selects the source.
- **A `CONTENT_SOURCE` exported in your shell leaks into everything.** It reaches the pre-commit
  hook (`astro sync`), `astro check` and `astro build`, but not Vitest (the tests stub it).
  - Symptom: commits, typecheck and build fail with the `payload` or "Unknown CONTENT_SOURCE"
    error while the tests pass.
  - Fix: `unset CONTENT_SOURCE`.
- **An empty `CONTENT_SOURCE` fails the build.** Unset or `snapshot` selects the snapshot; the
  match is exact and case-sensitive.
  - Symptom: `Unknown CONTENT_SOURCE "": allowed values are snapshot, payload`. A CI line such as
    `CONTENT_SOURCE: ${{ vars.CONTENT_SOURCE }}` produces exactly that when the variable is not
    defined.
  - Fix: leave `CONTENT_SOURCE` out of CI until a run really needs another source.
- **A loader error on Windows can end in a libuv assertion.** It is intermittent.
  - Symptom: the loader's message is sometimes followed by
    `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76` and
    exit code 127 instead of 1. The build fails either way; on Linux it exits 1.
  - Fix: read the error printed above the assertion; the assertion itself is noise.
- **A second build on Windows can fail with EPERM on `dist/_astro`.** Astro empties `dist/`
  with Node's `fs.rmSync`, which a just-written `dist/_astro` folder sometimes refuses.
  - Symptom: `EPERM, Permission denied: \\?\...\dist\_astro` right after
    `Collecting build info...`, often on every second build in a row, sometimes followed by the
    libuv assertion above.
  - Fix: delete `dist/` from the shell (`rm -rf dist`) and build again; it is not a code
    problem.
- **An unknown language key is reported at the field.** Every contract object is strict (an
  unknown key is an error), `showIn` refuses a repeated language and text refuses empty,
  whitespace-only or untrimmed values, but a language map's unknown key is zod's
  `unrecognized_keys` issue on the map itself.
  - Symptom: `{ "name": { "fr": "..." } }` fails as `field name: Unrecognized key: "fr"`, not
    `name.fr`.
  - Fix: read the key named in the message.
- **zod 4 runs an object's refinement after issues that do not abort.** A failed `regex` or
  `refine` on a property does not stop the object's own `superRefine` (a wrong type does).
  - Symptom: a refinement that re-parses the object (the item schemas' source-language check)
    reports the same property issue twice.
  - Fix: pass `{ when: (payload) => payload.issues.length === 0 }` as the refinement's second
    argument, as `itemSchema` in `src/content/contract/item.ts` does.
- **A template's placeholders live on the template schema only.** `template()` records its
  declared names with zod's `.meta()`, which registers that one schema instance; a wrapper made
  afterwards (`.optional()`, a plural's `few`) is another instance without them.
  - Symptom: `declaredPlaceholders(schema)` returns `undefined` for an optional template, so a
    walk over a schema skips it.
  - Fix: unwrap `ZodOptional` before reading, as the walker in
    `src/content/__tests__/site-copy.test.ts` does.
- **A link target that fails inside the matching union option is reported at that option's
  field.** The footer's link target is a union of a route target and an `{ href }` target.
  - Symptom: `{ href: 'http://...' }` fails at `target.href`, while `{ route: 'shop' }`, a
    vehicle outside the enum or both `route` and `href` fail at `target`.
  - Fix: expected. zod 4 passes on the issues of an option that failed only a check (a
    `refine`, a `regex`); a wrong type, enum value or key in every option becomes one
    `invalid_union` issue at the union. Read the message for the reason.
- **A parameter a route does not expect is reported at `params.<name>`.** The Site copy
  `routeTarget` checks its parameters against `ROUTE_PARAMS` (`contract/keys.ts`) in a
  refinement.
  - Symptom: `{ route: 'category' }` fails at `target.params.vehicle` ("needs a vehicle"), and
    `{ route: 'contact', params: { vehicle: 'car' } }` at `target.params.vehicle` ("takes no
    vehicle"); `routePath` / `targetHref` throw the same messages.
  - Fix: give the route exactly the parameters its path has (spec §4 table).
- **A Site copy link to a product, accessory, post or the 404 page fails at `route`.** A link
  target would carry one slug or id for every language, and nothing resolves it against the item
  (a post's slug differs per language, an item can be hidden in a language), so `routeTarget`
  refuses the item routes (lead decision, cycle 5); no link leads to the 404 page either. A
  target's `params` therefore take a `vehicle` only.
  - Symptom: `{ route: 'post' }` fails at `target.route` ("A Site copy link names a static or
    category page, not the item route "post""), `{ route: 'notFound' }` likewise ("... not the
    404 page"); a `slug` or `id` in `params` is an unknown key at `target.params`.
  - Fix: link to a static or category page; a later phase that needs an item link adds an
    id-based target resolved through the page rules.
- **A nav section to a page with parameters fails at `route`.** A nav section has only a route
  key, so it can lead only to a page whose path takes no parameter (`NAV_ROUTE_KEYS`,
  `contract/nav-sections.ts`, derived from `ROUTE_PARAMS`), never the 404 page.
  - Symptom: `content-snapshot/nav-sections.json` with `"route": "category"` fails to load at
    `route` ("A nav section leads to a page whose path takes no parameter (home, systems, ...),
    not "category"").
  - Fix: use `systems` for the car category, or a parameter-free page.
- **An id that is fine for the contract but not for a URL.** Ids follow `idSchema` (a-z, 0-9 and
  `-`), which accepts `a--b`, `-x` and `x-`; a value that fills a path follows the stricter
  `URL_SEGMENT` (`contract/primitives.ts`): lowercase words of a-z and 0-9 joined by single
  hyphens.
  - Symptom: for the id `a--b`, `routePath` throws "The route "accessory" needs an id: …", with
    the rule and the value.
  - Fix: every value that becomes a path segment uses the segment rule in the contract (slugs,
    an accessory's `id` through `segmentIdSchema`), so the snapshot fails to load before the
    build gets there. Use it for any new id that appears in a URL.
- **Optional zod fields are `T | undefined` under `exactOptionalPropertyTypes`.** The contract's
  inferred types keep `undefined` in every optional field.
  - Symptom: `astro check` reports ts2379 when a parsed value (a link target's `params`) goes
    where `Partial<Record<K, string>>` is expected.
  - Fix: accept `string | undefined` values (`RawParams` in `src/content/routes.ts`).
- **The item rule finds localized text and media by shape.** `gapsIn`
  (`src/content/completeness.ts`) walks any value: an object keyed only by languages is a
  language map, and the fields `image`, `installImage`, `photo`, `gallery` and a rich-text image
  block's `media` hold media ids.
  - Symptom: a media field under another name (`poster`, `thumbnail`) is never checked for alt
    text in the page's language, so an item shows with an image that has no alt there; an object
    keyed by languages that is not text (per-language settings) is checked as if it were.
  - Fix: name a media field like the existing ones or add it to `MEDIA_FIELDS`, and list it in
    `mediaReferences` (`src/content/__tests__/integrity-checks.ts`): `rules-items.test.ts`
    compares the two on the snapshot.
- **A generic helper around `defineCollection` erases the entry type.**
  - Symptom: when a generic `collection(name)` wraps `defineCollection` with the schema
    `COLLECTIONS[name]`, `getCollection()` returns `data: unknown` and `astro check` fails where
    a page uses the data.
  - Fix: write one `defineCollection` per name in `src/content.config.ts`; its
    `satisfies Record<ContentName, unknown>` fails the typecheck when a registered name is
    missing.
- **Astro's own `redirects` config.**
  - Symptom: it emits meta-refresh HTML pages, not HTTP redirects.
  - Fix: the root redirect lives in `public/_redirects` (`/  /en/  302`).
- **`_redirects` is not served by `astro preview`.**
  - Symptom: locally `/` returns 404 and `/_redirects` is served as a plain file.
  - Fix: expected. The root redirect is covered by `src/test/redirects.test.ts`, and the e2e
    server waits on `/en/`, not `/`.
- **`dist/_astro` holds more Preact chunks than a page loads.**
  - Symptom: `signals.module.*.js` (and the other Preact chunks) in `dist/_astro`.
  - Fix: expected. A page loads an island's chunk only where its directive asks: the mobile menu's
    below 1120px (`client:media`), the explainer's on every page once the browser is idle
    (`client:idle`), with the renderer (`client.*.js`), Preact, its hooks and the chunk the two
    islands share (about 9 KB gzip in all); the renderer imports `signals` only for an island
    given a signal prop.
- **`@types/node` is global** (no `types` list in `tsconfig.json`).
  - Symptom: Node globals type-check inside browser code too.
  - Fix: scope the types when islands grow.

## Snapshot converter and checks

- **Running `npm run snapshot:convert` again overwrites the snapshot.** It ran once (P1-10);
  `content-snapshot/` is the source of truth since.
  - Symptom: every hand edit of a converted file (and `src/content/hues.ts`) since the conversion
    is gone; `git diff` shows them reverted to the prototype's data.
  - Fix: do not run it on the real files. To exercise it, run its tests (they use a fixture in
    a scratch folder) or pass a scratch copy of the repository as the root from code.
- **zod output follows the schema, not the input.** A `z.strictObject` returns its keys in
  shape order, and a `z.record` over an enum (the matrix) in the enum's order.
  - Symptom: a check on parsed data cannot see how a file orders its keys (a matrix out of row
    order still parses), and a test that compares key order against the file fails.
  - Fix: read the raw JSON for order checks, as the integrity test does for the matrix.
- **zod keeps a key whose value is `undefined`.** An optional field written as
  `{ image: undefined }` parses, and the output still has the key.
  - Symptom: the converted items compare unequal to the written file in tests
    (`not.toHaveProperty('image')` fails), although `JSON.stringify` drops the key.
  - Fix: build items without those keys (`withoutUndefined` in `scripts/snapshot/convert-text.ts`).
- **Prettier's config is found from the path you pass.** `resolveConfig()` searches upward from
  the file path; for a file outside the repository it finds no `.prettierrc.json`.
  - Symptom: output written to a scratch folder (the converter's tests) comes out in Prettier's
    defaults (double quotes, 80 columns), so it differs from what `format:check` expects.
  - Fix: resolve the config from the file's repository path, whatever folder the text goes to
    (`formatForRepo` in `scripts/snapshot/render.ts`).
- **A white-on-transparent image.** `antijammer-primo.webp` (Primo's gallery) is a white line
  icon on a transparent background.
  - Symptom: on a white plate the image looks empty, in the browser and in an image viewer.
  - Fix: show it on a dark surface, or view it composited on a dark background to check it.

## Styles and fonts

- **The Fonts API's `npm` provider downloads the font files.** It reads the package's CSS from
  `node_modules`, but rewrites every `url(./files/...)` to
  `https://cdn.jsdelivr.net/npm/<package>@<version>/files/...` and fetches it (cached in
  `node_modules/.astro/fonts/` afterwards, so only a clean build shows it). It also ignores the
  family's `subsets`.
  - Symptom: an offline build fails with `CannotFetchFontFile` naming a jsDelivr URL; online, a
    fresh clone or CI downloads fonts at build time.
  - Fix: use the repo's provider, `fontsourceVariable(pkg)` (`src/fonts/fontsource-variable.ts`),
    which gives Astro the package's own files as absolute paths. The built-in `local` provider
    reads files too, but its faces carry no subset, so `<Font preload>` cannot pick the latin one.
- **The Fonts API swallows a provider's error.** Astro runs providers through unifont with
  `throwOnError: false`.
  - Symptom: a subset, style or file the package lacks is logged ("Could not resolve font face
    ... No data found for font family"), and `astro build` exits 0 with no faces for that family:
    the site falls back to system fonts.
  - Fix: declare every family through `fontsourceFamily()` in `astro.config.mjs`; it runs the
    provider's check while the config loads, so a missing subset, style or file stops the build
    with "Unable to load your Astro config" and the reason. A unit test requires every
    `config.fonts` entry to be in `CHECKED_FAMILIES` (what `fontsourceFamily()` returned), so a
    family declared with a bare `provider: fontsourceVariable(pkg)` fails the tests.
- **A custom font provider is one instance per name and config.** The Fonts API keys providers by
  a hash of `name` and `config`.
  - Symptom: two families with `fontsourceVariable()` and no distinct `config` both resolve from
    the first package.
  - Fix: keep `config: { package: pkg }` in the provider.
- **Font faces are named `<family>-<hash>`.** The Fonts API never declares the plain family name.
  - Symptom: `font-family: 'Sofia Sans Extra Condensed'` falls back to a system font, and
    `document.fonts.check('800 40px "Sofia Sans Extra Condensed"')` is true without any font
    loaded (no face matches the name, so nothing is left to load).
  - Fix: use `var(--display)` and `var(--body)` (the Fonts API's variables); in a test, read the
    first family of `--display` and check that face.
- **The built CSS is not the source CSS.** Astro minifies with Lightning CSS.
  - Symptom: `rgba(14, 26, 36, 0.74)` ships as `#0e1a24bd`, `#ffffff` as `#fff`,
    `translate3d(0, 60px, 0)` as `translateY(60px)`; a test that searches the built page for a
    source value fails.
  - Fix: check values in `src/styles/` (`tokens.test.ts`, `base.test.ts`), and in the browser
    through computed styles.
- **A reveal element at the end of a page.** The design's reveal script observes with
  `rootMargin: '0px 0px -10% 0px'`.
  - Symptom: a small `.rv` element in the bottom tenth of a page that cannot scroll further never
    gets `.in` and stays invisible.
  - Fix: BaseLayout observes with thresholds `0` and `0.1` and no negative margin; keep it so.
- **A reveal element taller than ten viewports.** Its in-view share never reaches a tenth.
  - Symptom: with a `0.1` threshold alone, a very tall `.rv` element stays invisible while it
    covers the screen.
  - Fix: BaseLayout's reveal script gives `.in` at once to an element taller than nine
    viewports; without IntersectionObserver it gives `.in` to every reveal element.

## Islands (Preact)

- **An island's markup has no Astro scope.** A scoped `<style>` in the `.astro` parent never
  reaches the elements an island renders (Astro hands the island its scope id only as a
  `data-astro-cid-*` prop, which the island ignores).
  - Symptom: the burger and the menu are unstyled although SiteHeader's `<style>` names them.
  - Fix: a global stylesheet imported by the island (`MobileMenu.css`; Astro bundles it into the
    page's CSS, so it applies before hydration) with class names only the island uses. A parent
    rule that must not reach into the island uses a child combinator: `.hdr-right >
:global(.lang)` hides the header's switcher, not the menu's.
- **A `display` on a dialog's class shows it while closed.** The browser hides a closed dialog
  with `dialog:not([open]) { display: none }`, and any author `display` beats it.
  - Symptom: the menu sits open on the page, but `showModal()` was never called (nothing is
    inert, Escape does nothing).
  - Fix: set `display` on `.m-nav[open]` only.
- **The header's breakpoint is written four times.** `client:media` cannot read CSS, so
  SiteHeader's media queries, ThemeToggle's, MobileMenu.css and the island's
  `client:media="(max-width: 1119px)"` must agree.
  - Symptom: a burger that shows but was never hydrated (a dead button), or the island's script
    loaded where the burger is hidden.
  - Fix: change them together; `header-menu.test.ts` fails when one differs, and
    `e2e/menu.spec.ts` checks 1119px (script requested, burger shown) against 1120px (neither).
    The complement is `@media not all and (max-width: 1119px)` (the overlay's transparent look),
    never `min-width: 1120px`, which would leave fractional widths such as 1119.5px in neither.
- **The one-row header and text spacing.** Under WCAG 1.4.12 text spacing the fixed header row
  needs 957px in English, 997px with two language codes and 1076px with all four.
  - Symptom: below that the switcher slides past the edge of the screen, and a fixed row cannot
    scroll to it.
  - Fix: the breakpoint (1120px) sits above it, with room for a classic scrollbar (up to 17px).
    Longer nav labels change the numbers: re-measure with `e2e/header-spacing.spec.ts` when a
    language goes live.
- **A native modal dialog lets Tab leave the page.** After a modal dialog's last control,
  Chromium moves focus to the browser's own UI (`document.activeElement` is `<body>`,
  `document.hasFocus()` is false), then back to the first control; Shift+Tab from the first
  control does the same.
  - Symptom: "Tab stays inside" fails on the press after the last control.
  - Fix: the island wraps Tab and Shift+Tab at the ends itself (`wrapFocus` in
    menu-dialog.ts); `e2e/menu.spec.ts` checks `hasFocus()` after each press.
- **A click on a modal dialog's content focuses the dialog.** Chromium gives a modal dialog focus
  when a click lands on anything inside it that cannot take focus itself (its padding, text,
  headings, an empty area), whatever its overflow.
  - Symptom: the next Shift+Tab (or Tab) is not at a control, so a wrap that only looks at the
    first and last controls lets focus leave the page. And when the dialog is not the element that
    scrolls, PageDown, the arrow keys and Space then scroll nothing.
  - Fix: `wrapFocus` treats focus on anything that is not one of the controls as an end: Shift+Tab
    goes to the last control, Tab to the first (`e2e/menu-resize.spec.ts` clicks the background).
    The explainer's scrolling panel has `tabindex="-1"`, so a click on its text focuses the panel
    (no ring on a mouse focus) and the keyboard scrolls it (`e2e/explainer-layout.spec.ts`).
- **A top-layer dialog does not follow a resize.** Whatever was measured when the dialog opened
  (the close button's place over the burger) goes stale when the phone turns or the page zooms,
  and the browser does nothing about it.
  - Symptom: after a rotation the close button sits outside the screen (left 766px at 390px wide)
    and the menu scrolls sideways (WCAG 1.4.10); after widening past the breakpoint the menu
    stays open over the desktop header with the page still locked, and closing it focuses the
    hidden burger, so focus falls to `<body>`.
  - Fix: while the dialog is open, a `resize` listener (added on opening, removed in the `close`
    event, which every way out ends in) measures again, or closes the menu once the burger is
    hidden and puts focus on the header's own link. Measure after `showModal()`, not before: the
    scroll lock takes the page's 10px scrollbar away and moves the burger
    (`e2e/menu-scrollbar.spec.ts` shows the scrollbar; see "Headless Chromium hides scrollbars").
    The `close` event comes a task after `close()`: when the menu was opened again in between, the
    handler returns at once (`menu.open`), or it would end the new session's resize watch.
- **An absolutely positioned control scrolls with its dialog.** Inside a scrolling modal dialog, a
  `position: absolute` close button leaves the screen as soon as the menu scrolls (a phone held
  sideways).
  - Fix: `position: fixed` (in the top layer it is fixed to the screen, and it adds nothing to the
    dialog's scroll area), an opaque background over the links passing under it, and a
    `scroll-margin-top` on the links so a focused one stops below it.
- **Focus after a dialog opened from code.** On close the browser returns focus to the element
  focused before `showModal()`, which is `<body>` when the opener never took focus (a tap on
  iOS, a click in some browsers).
  - Fix: the dialog's `close` event gives focus back to the burger (the menu) or to the button
    that opened it (the explainer, else `<main>` when that button is gone or hidden), so every way
    out (Escape, the close button, the backdrop, a link) restores it.
- **`useEffect` runs after Astro has marked the island hydrated.** Astro removes the island's
  `ssr` attribute as soon as Preact's `hydrate()` returns; Preact runs `useEffect` callbacks a
  frame later, `useLayoutEffect` callbacks inside `hydrate()`.
  - Symptom: listeners wired in `useEffect` miss clicks for about 11-41 ms after `ssr` is gone, so
    a test that waits for `ssr` to go (the readiness rule in the e2e section) still clicks a dead
    burger now and then.
  - Fix: wire native listeners in `useLayoutEffect` (MobileMenu.tsx); `e2e/menu.spec.ts` clicks
    the burger in the microtask after `ssr` is removed.
- **A mark drawn as a background disappears in forced colors.** In forced-colors mode (Windows
  High Contrast) the browser paints backgrounds with the Canvas colour.
  - Symptom: the burger's bars and the close button's X (span backgrounds) vanish, leaving two
    empty 44px boxes.
  - Fix: draw marks in the text colour, which forced colors keep visible: the bars are 2px
    `currentColor` top borders; an icon is an inline SVG with `stroke="currentColor"`.
    `e2e/forced-colors.spec.ts` checks the pixels inside each control with
    `page.emulateMedia({ forcedColors: 'active' })`.
- **A click's target does not tell a backdrop click.** The browser gives a click on a modal
  dialog's `::backdrop` the dialog itself as its target, and a click on the dialog's own padding
  or border too. A press and a release on two elements send the click to their nearest common
  ancestor, which is the dialog for a drag between the panel and the backdrop. A double-click's
  second click on an explainer button lands on the backdrop of the dialog the first one opened.
  - Symptom: a backdrop check on `event.target === dialog` closes the explainer when its panel's
    padding is clicked, when a text selection is dragged from the panel onto the backdrop (the
    selection is lost), when a press on the backdrop is released over the panel, and on a
    double-click on the button that opens it.
  - Fix: the dialog has no padding or border (its panel, `.fx-body`, fills the dialog's box and
    carries them), and a click closes it only when the latest `pointerdown` and `pointerup` both
    had the dialog itself as their target and `event.detail` is at most 1
    (`explainer-dialog.ts`). `e2e/explainer.spec.ts` clicks the panel's padding and border, drags
    both ways across the panel's edge and double-clicks the button (stays open), and clicks the
    backdrop (closes).
- **Sticky offsets inside a scroll container count its padding.** Chromium constrains a sticky
  element to the scroll container's padding box minus its padding.
  - Symptom: the explainer's sticky close button, `top: 14px` in a panel with 56px of top padding,
    sits at 70px, not 14px.
  - Fix: subtract the padding (`top: calc(14px - var(--pad-top))`, Explainer.css);
    `e2e/explainer-layout.spec.ts` checks the button 14px from the panel's corner.
- **Astro's serialized props are about twice their JSON.** Every prop value is wrapped
  (`[0,"text"]`, `[1,[...]]` for an array) and the attribute escapes each quote as `&quot;`.
  - Symptom: the query's `explainer('en')`, 35 KB as JSON, makes a 65 KB `props` attribute.
  - Fix: pass a trimmed shape with few values (`layouts/explainer-content.ts`: the texts the
    dialog shows, systems as one table referred to by index, absent keys instead of `undefined`),
    and check the built attribute (`e2e/explainer.spec.ts`, under 40 KB; 17.4 KB on `/en/`).
- **Props are plain objects.** An island's revived props inherit `Object.prototype`.
  - Symptom: `features[button.dataset.fx]` for `data-fx="constructor"` is a function, not
    `undefined`, and the view crashes.
  - Fix: look up keys that come from the page with `Object.hasOwn` (`viewFor` in Explainer.tsx).
- **`client:idle` loses a click before hydration.** The explainer's buttons are on the page from
  the first paint; its script runs once the browser is idle after load.
  - Symptom: a click in that window opens nothing. From the local preview on `/en/`: none on a
    desktop, about 65-100 ms and up to 200 ms at 4x CPU throttling. Over a network the scripts
    come in two round trips after the idle callback (the component and the renderer, then the
    Preact, hooks and shared chunks they import; Astro writes no modulepreload): about 0.9 s after
    first paint at a 300 ms round trip.
  - Fix: none in Phase 1 (a queue would need an inline script with its own CSP hash, or
    `client:load`); the next click works. Later options: modulepreload links for the island's
    chunks, or hydrating on the first interaction.

## Unit tests (Vitest)

- **No Vitest globals, so no automatic Preact Testing Library cleanup.**
  - Symptom: a second `render()` in the same file also finds the first component (two buttons).
  - Fix: `src/test/setup.ts` registers `afterEach(cleanup)`. Keep it.
- **The environment is per file.** The default is `node` (right for the Astro Container API).
  - Symptom: DOM APIs are missing in a Preact test.
  - Fix: start the test file with a `// @vitest-environment jsdom` docblock.
- **Vitest picks up `*.spec.ts`.**
  - Symptom: with a wider `include`, Vitest tries to run the Playwright specs in `e2e/`.
  - Fix: keep `include` scoped to `src/**/*.test.{ts,tsx}` and `scripts/**/*.test.ts`.
- **`astro check` and `vitest.config.ts`.**
  - Symptom: without `/// <reference types="vitest/config" />`, `astro check` rejects the `test`
    key passed to `getViteConfig`.
  - Fix: keep the reference line.
- **The Container API is loosely typed.**
  - Symptom: `props` is `Record<string, unknown>`, so wrong props in a test are not type errors;
    the rendered output has no doctype.
  - Fix: assert on the rendered output, and leave the doctype to the build and e2e.
- **A component that calls `siteQuery()` renders nothing useful in Vitest.** `astro:content`
  serves no entries there, so the adapter fails (`The global ... has no "global" entry`).
  - Symptom: a Container test of `BaseLayout` throws before rendering.
  - Fix: replace the adapter with a query over fixtures:
    `vi.mock(import('../../content/query'), async (importOriginal) => ({ ...(await importOriginal()), siteQuery: ... }))`,
    as `src/layouts/__tests__/BaseLayout.test.ts` does. Pass the site to the container
    (`AstroContainer.create({ astroConfig: { site } })`) for `Astro.site`.
- **Two copies of `@testing-library/dom`** (jest-dom's and Preact Testing Library's).
  - Symptom: `configure()` from Preact Testing Library does not reach jest-dom's copy.
  - Fix: harmless today; configure each copy where it is used if that ever matters.
- **`withLanguage()` also copies `languages`.** The `languages` global is keyed by language, so
  the fixture helper (`src/content/__tests__/rules-fixtures.ts`) takes it for text and copies
  English's `{ live: true }` to the other language.
  - Symptom: a query over `withLanguage(fixtureContent(['en']), 'el')` builds Greek too (the
    switcher shows a Greek link).
  - Fix: put the fixture's own `languages` back after `withLanguage`, as `shellQuery()` in
    `src/components/__tests__/shell-fixtures.ts` does.
- **Testing an unset environment variable.**
  - Symptom: setting it to `''` is not the same as unset.
  - Fix: `vi.stubEnv('CONTENT_SOURCE', undefined)` deletes the variable; restore with
    `vi.unstubAllEnvs()`.
- **Symlinked or junction paths.**
  - Symptom: run through a symlink or Windows junction, Vitest can fail to resolve its `/@fs/`
    setup-file path.
  - Fix: run it from the repository's real path.
- **jsdom has no `showModal()` or `close()`.** jsdom 30.1.2 implements `<dialog>` and its
  `open` attribute only.
  - Symptom: `dialog.showModal is not a function` in an island test.
  - Fix: `src/test/setup.ts` adds a stand-in where jsdom lacks them: `showModal()` sets `open`
    and makes Escape (a keydown anywhere in the document) fire a cancelable `cancel`, then
    `close()`; `close()` clears `open` and fires `close` a task later, as browsers do, so a
    test waits (`waitFor`) for what the `close` event does. Nothing else a browser does (the
    inert page, focus on opening, the top layer): `e2e/menu.spec.ts` covers that.
- **A component that holds an island fails in a bare Container.**
  - Symptom: `NoMatchingRenderer: Unable to render MobileMenu` from the SiteHeader or BaseLayout
    tests.
  - Fix: create the container with `createContainer()` (`src/test/container.ts`, the Preact
    renderer through `loadRenderers` from `astro:container`). The island renders as
    `<astro-island ... client="media" opts="...">` around its server markup.
- **jsdom workers under load.**
  - Symptom: jsdom test workers time out on a machine busy with other test runs.
  - Fix: `npm run test -- --maxWorkers=1`.

## e2e (Playwright + axe)

- **Port 4321 is shared.** `npm run dev`, `npm run preview` and the e2e `webServer` all use it,
  and locally (`reuseExistingServer: !process.env.CI`) Playwright reuses whatever answers `/en/`
  there.
  - Symptom: a stale or orphaned preview, or another checkout's server, is tested instead of
    this build, and passes on outdated output. A reused `astro dev` is caught: the 200 test fails
    because the page loads the Vite client.
  - Fix: stop `npm run dev` and any preview before `npm run test:e2e`, and check that nothing
    listens on 4321.
- **Something on 4321 that does not answer `/en/`.**
  - Symptom: Playwright starts its own `astro preview`, which stops at once with
    `Port 4321 is already in use` (`vite.preview.strictPort` is set in `astro.config.mjs`; without
    it, preview silently moves to 4322 and Playwright times out after 120 s waiting on 4321).
  - Fix: free port 4321. Keep `strictPort`.
- **Orphaned servers.**
  - Symptom: stopping `astro dev` or `astro preview` from a wrapper script, or piping a test run
    through `head`, can leave the Node child alive and holding 4321.
  - Fix: kill by port. Windows: `netstat -ano | findstr :4321`, then `taskkill /PID <pid> /F`.
    macOS/Linux: `lsof -ti :4321 | xargs kill`. Never pipe a long test run through `head`.
- **The html reporter's default.**
  - Symptom: on a failure it serves the report and the run never exits.
  - Fix: keep `open: 'never'` in `playwright.config.ts`.
- **A default value in a test's fixture argument.** Playwright reads the fixture names from the
  function's source.
  - Symptom: `async ({ page, baseURL = '' })` fails the whole run with
    `Test has unknown parameter "baseURL = ''"` (and `unicorn/prefer-default-parameters` asks for
    that default when the body writes `baseURL ?? ''`).
  - Fix: take fixtures without defaults; for the preview's origin use `new URL(page.url()).origin`
    after `goto`.
- **`page.evaluate` callbacks and `unicorn/isolated-functions`.** The rule treats them as isolated
  and the e2e files have Node globals only.
  - Symptom: `Variable document not defined in scope of isolated function`.
  - Fix: evaluate on a locator and reach the page through the element:
    `page.locator('html').evaluate((html) => html.ownerDocument.fonts.ready)`.
- **Without JavaScript, `locator.evaluate` still works.** `test.use({ javaScriptEnabled: false })`
  turns off the page's scripts, not Playwright's.
  - Symptom: none; it is how `e2e/shell.spec.ts` inserts reveal probes into a no-JS page.
  - Fix: use it to probe styles; never to stand in for a page script.
- **The skip link needs `tabindex="-1"` on `<main>`.**
  - Symptom: without it, Chromium does not move focus to `main` after the skip link, and the
    skip-link test fails.
  - Fix: keep `<main id="main" tabindex="-1">` in `BaseLayout.astro`.
- **Loose locators and redirects.**
  - Symptom: `getByRole(..., { name })` matches case-insensitive substrings ("Camper V3 Pro"
    passes for "Camper V3"); `page.goto()` returns the last response of a redirect chain.
  - Fix: pass `exact: true`, and assert `response.request().redirectedFrom()` is null when the
    status matters.
- **An island is dead until it hydrates.** `client:media` and `client:idle` load the island's
  script after the page; `page.goto` can return before it ran.
  - Symptom: a click on the burger or an explainer button does nothing, now and then.
  - Fix: wait until the island's `astro-island` has lost its `ssr` attribute (Astro removes it
    once hydrated) before using it, as `menuPage()` and `explainerPage()` do. This holds because
    the islands wire their listeners in `useLayoutEffect` (see the Islands section).
- **Two islands on a page.** `/en/` has the mobile menu's island (in the header) and the
  explainer's (after the footer).
  - Symptom: `page.locator('astro-island')` or `page.locator('dialog')` in an assertion fails
    with a strict mode violation (two elements).
  - Fix: name the island or the dialog: `menuIsland(page)` (the island holding `.menu-open`),
    `explainerIsland(page)` (`client="idle"`), `dialog.m-nav`, or the dialog by its role and name.
- **Headless Chromium hides scrollbars.** Playwright launches it with `--hide-scrollbars`, so the
  page's classic scrollbar (10px, base.css) takes no room.
  - Symptom: no e2e sees layout that a scrollbar changes, such as the scroll lock taking the
    scrollbar away and moving the burger.
  - Fix: `test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } })` at the top
    of a spec file (a worker option: not inside a describe), as `e2e/menu-scrollbar.spec.ts` does.
- **What axe checks.** The tag set is WCAG 2.0-2.2 A/AA (`wcag2a`, `wcag2aa`, `wcag21a`,
  `wcag21aa`, `wcag22aa`; axe-core 4.13 has no `wcag22a` tag).
  - Symptom: best-practice rules (`region`, `landmark-one-main`, `heading-order`,
    `page-has-heading-one`, `skip-link`) never run, so page structure is not checked by axe.
  - Fix: review structure in code review, or add those rules deliberately.
- **Browsers live outside the repo.** `npm ci` does not install them; on Windows they go to
  `%LOCALAPPDATA%\ms-playwright`.
  - Symptom: on a new machine, or after a `@playwright/test` bump, e2e fails because the matching
    Chromium build is missing.
  - Fix: `npx playwright install chromium`. CI adds `--with-deps`, which also installs the Linux
    system libraries through the package manager; a workstation does not need it.
- **The e2e specs count the snapshot.** `e2e/home.spec.ts` reads the products and categories
  from `content-snapshot/` and pins the h1 and 16 systems; `e2e/header.spec.ts` reads the nav
  sections.
  - Symptom: adding, hiding or removing a system fails the count; editing the hero heading fails
    the h1; a nav section's route outside the spec's table fails the nav check.
  - Fix: update the specs together with the snapshot.
- **No page uses the overlay header yet.** `/en/` has the solid header; the overlay waits for
  Phase 2's hero.
  - Symptom: an e2e of the overlay needs a page that the build does not make, and a test-only
    route would ship in `dist/` (and fail the `BUILT_PAGE_TYPES` test).
  - Fix: `e2e/overlay.spec.ts` makes a fixture page in the test: `page.route` rewrites the built
    `/en/` into the overlay variant (class, no spacer, the overlay script cut from
    `SiteHeader.astro`'s source). When Phase 2 builds the hero page, test the overlay there and
    drop the fixture.
- **The no-JS scan sees scripts and hidden-on-purpose elements.** The A11 check in
  `e2e/shell.spec.ts` lists every element of the header, `<main>` and the footer that is not
  shown.
  - Symptom: it reports `script#` (the toggle's inline script), the compare count (`hidden`
    until Phase 2), the logo for the other theme, the theme toggle (hidden without JavaScript),
    or the mobile menu: its burger (hidden without JavaScript), its closed dialog, the
    `astro-island` wrapper (`display: contents`, no box) and the runtime `style` and `script`
    Astro writes beside it; or the explainer buttons (`[data-fx]`, `[data-lvl]`, hidden without
    JavaScript, their labels shown as text beside them).
  - Fix: those are skipped by name in the test; a new element hidden on purpose needs the same.
