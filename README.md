# pandora-site

The INVETEC / Pandora website (invetec.eu): an Astro static site with Preact islands.

## Requirements

Node 24 (see `.nvmrc`) and npm.

## Commands

| Command             | What it does                                             |
| ------------------- | -------------------------------------------------------- |
| `npm ci`            | Install the locked dependencies                          |
| `npm run dev`       | Start the dev server on http://localhost:4321            |
| `npm run build`     | Build the static site into `dist/`                       |
| `npm run preview`   | Serve the built `dist/` locally                          |
| `npm run typecheck` | Type-check `.astro` and TypeScript files (`astro check`) |

## Routing

Every locale has a path prefix (`/el/`, `/en/`, `/it/`, `/sq/`); only `/en/` is built so far.
The root `/` redirects to `/en/` through `public/_redirects`. `astro preview` does not apply
that file, so locally `/` returns 404.
