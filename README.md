# pandora-site

The INVETEC / Pandora website (invetec.eu), rebuilt as a static Astro site with Preact islands.
Phase 1 is the site's foundation: the content contract, the content snapshot with self-hosted
images, the publish rules, and the styled `/en/` shell (header, footer, theme, language switcher,
mobile menu, explainer dialog, SEO files, 404 pages) around an interim system index. Only
English is live so far; the real home, catalogue, product and compare pages come next.

## Requirements

Node 24 (see `.nvmrc`) and npm. Node 24 must be first on PATH: npm scripts, the git hook and the
e2e server all use whichever `node` PATH finds, and the pre-commit hook refuses older versions.

## Install and run

```sh
npm ci                              # the locked dependencies, and the git hook
npm run dev                         # dev server on http://localhost:4321
npm run build && npm run preview    # the static build in dist/, served on port 4321
```

Before the first e2e run on a machine: `npx playwright install chromium`. The dev server, the
preview and the e2e run all use port 4321, so stop `npm run dev` before `npm run test:e2e`.

## Commands

| Command                    | What it does                                                        |
| -------------------------- | ------------------------------------------------------------------- |
| `npm run dev`              | Start the dev server (restart it after editing `content-snapshot/`) |
| `npm run build`            | Build the static site into `dist/`                                  |
| `npm run preview`          | Serve the built `dist/` locally on port 4321                        |
| `npm run typecheck`        | Type-check `.astro` and TypeScript files (`astro check`)            |
| `npm run lint`             | Lint with ESLint (`lint:fix` to apply fixes)                        |
| `npm run format:check`     | Check formatting with Prettier (`format` to rewrite)                |
| `npm run test`             | Run the unit tests once (Vitest)                                    |
| `npm run test:e2e`         | Build, start `astro preview`, run Playwright + axe in Chromium      |
| `npm run check:pricelist`  | Check the snapshot against PRICELIST 2026 (systems, prices, levels) |
| `npm run crawl`            | Read-only crawl of the live sites' URLs, for the redirect map       |
| `npm run crawl:summary`    | Write `redirects/CRAWL.md` from the crawl (no network)              |
| `npm run media:fetch`      | The one-time image download: done, see below                        |
| `npm run snapshot:convert` | The one-time prototype conversion: done, see below                  |

## Gates

Every change passes the same checks as CI, in this order: `npm run lint`,
`npm run format:check`, `npm run typecheck`, `npm run test`, `npm run build`, then
`npm run test:e2e` (CI runs the e2e as its own job). The pre-commit hook runs ESLint and Prettier
on the staged files. Pull request titles follow Conventional Commits.

## Content

- `content-snapshot/` is the content's source of truth until the CMS takes over: edit its JSON
  files directly, then run `npm run test` and `npm run check:pricelist`. Every item and global is
  checked against the content contract (`src/content/contract/`) when the site builds.
- Never re-run `npm run snapshot:convert`: it converted the design prototype once, and running it
  again would overwrite every edit made since.
- Never re-run `npm run media:fetch` unless the site owner asks: it downloaded the site's images
  from invetec.eu once, and they are now committed under `src/assets/` and `public/`. No page
  loads anything from another origin.

## Routing

Every locale has a path prefix (`/el/`, `/en/`, `/it/`, `/sq/`); only `/en/` is built so far.
The root `/` redirects to `/en/` through `dist/_redirects`, which the build writes from the live
languages. `astro preview` does not apply that file, so locally `/` returns 404.

## Docs

- `docs/AI_BRIEF.md`: the stack, the structure, the content seam and the snapshot, the media
  rules, routes and publish rules, the query module, the shell and islands, the SEO files, CI,
  and the Phase 1 limits.
- `docs/gotchas.md`: traps already hit in this repo, with their fixes.
