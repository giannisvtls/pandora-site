// Plain TypeScript (typed ESLint) cannot read .astro files, so an `import X from './X.astro'` in a
// .ts file would be an error type there. This fallback types it as the component factory every
// .astro module exports. `astro check` resolves .astro imports itself and never falls back to it.
declare module '*.astro' {
  import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

  const component: AstroComponentFactory;
  export default component;
}
