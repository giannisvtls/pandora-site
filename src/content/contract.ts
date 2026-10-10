// The content contract (spec §2): the shape every content source must produce (roadmap §3).
// Plain `zod`, never astro:content's re-export, so the CMS can share these schemas later. The
// modules live in ./contract/; this file re-exports them so `./contract` imports keep working.
export * from './contract/primitives';
export * from './contract/keys';
export * from './contract/rich-text';
export * from './contract/media';
export * from './contract/products';
export * from './contract/accessories';
export * from './contract/posts';
export * from './contract/faq';
export * from './contract/installers';
export * from './contract/nav-sections';
export * from './contract/fixed-sets';
export * from './contract/site-copy-parts';
export * from './contract/site-copy-shell';
export * from './contract/site-copy-home';
export * from './contract/site-copy-systems';
export * from './contract/site-copy-compare';
export * from './contract/site-copy-pages';
export * from './contract/finder';
export * from './contract/languages';
export * from './contract/registry';
