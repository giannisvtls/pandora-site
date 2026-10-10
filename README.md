# pandora-site

The INVETEC / Pandora website (invetec.eu): an Astro static site with Preact islands.

## Requirements

Node 24 (see `.nvmrc`) and npm. Node 24 must be first on PATH: the pre-commit hook refuses older
versions.

## Commands

| Command                | What it does                                                   |
| ---------------------- | -------------------------------------------------------------- |
| `npm ci`               | Install the locked dependencies                                |
| `npm run dev`          | Start the dev server on http://localhost:4321                  |
| `npm run build`        | Build the static site into `dist/`                             |
| `npm run preview`      | Serve the built `dist/` locally on port 4321                   |
| `npm run typecheck`    | Type-check `.astro` and TypeScript files (`astro check`)       |
| `npm run lint`         | Lint with ESLint (`lint:fix` to apply fixes)                   |
| `npm run format:check` | Check formatting with Prettier (`format` to rewrite)           |
| `npm run test`         | Run the unit tests once (Vitest)                               |
| `npm run test:e2e`     | Build, start `astro preview`, run Playwright + axe in Chromium |

Before the first e2e run on a machine: `npx playwright install chromium`. The dev server, the
preview and the e2e run all use port 4321, so stop `npm run dev` before `npm run test:e2e`.

## Routing

Every locale has a path prefix (`/el/`, `/en/`, `/it/`, `/sq/`); only `/en/` is built so far.
The root `/` redirects to `/en/` through `dist/_redirects`, which the build writes from the live
languages. `astro preview` does not apply that file, so locally `/` returns 404.

## More

- `docs/AI_BRIEF.md`: stack, content seam, routing, CI and current limits.
- `docs/gotchas.md`: traps already hit in this repo, with their fixes.
