import { defineCollection } from 'astro:content';

import { COLLECTIONS as C, GLOBALS as G, type ContentName } from './content/contract';
import { contentLoader } from './content/loader';

// Every registered collection and global, each with the loader and the schema of its own name.
// `satisfies`: a name missing here fails the typecheck. (A generic helper would be shorter, but
// Astro then infers `unknown` entry data.)
export const collections = {
  media: defineCollection({ loader: contentLoader('media'), schema: C.media }),
  products: defineCollection({ loader: contentLoader('products'), schema: C.products }),
  accessories: defineCollection({ loader: contentLoader('accessories'), schema: C.accessories }),
  posts: defineCollection({ loader: contentLoader('posts'), schema: C.posts }),
  faq: defineCollection({ loader: contentLoader('faq'), schema: C.faq }),
  installers: defineCollection({ loader: contentLoader('installers'), schema: C.installers }),
  navSections: defineCollection({ loader: contentLoader('navSections'), schema: C.navSections }),
  categories: defineCollection({ loader: contentLoader('categories'), schema: C.categories }),
  accessoryCards: defineCollection({
    loader: contentLoader('accessoryCards'),
    schema: C.accessoryCards,
  }),
  accessoryGroups: defineCollection({
    loader: contentLoader('accessoryGroups'),
    schema: C.accessoryGroups,
  }),
  features: defineCollection({ loader: contentLoader('features'), schema: C.features }),
  specRows: defineCollection({ loader: contentLoader('specRows'), schema: C.specRows }),
  levels: defineCollection({ loader: contentLoader('levels'), schema: C.levels }),
  // Globals: one entry each, `global`.
  siteCopyHeader: defineCollection({
    loader: contentLoader('siteCopyHeader'),
    schema: G.siteCopyHeader,
  }),
  siteCopyCommon: defineCollection({
    loader: contentLoader('siteCopyCommon'),
    schema: G.siteCopyCommon,
  }),
  siteCopyHome: defineCollection({ loader: contentLoader('siteCopyHome'), schema: G.siteCopyHome }),
  siteCopyCatalogue: defineCollection({
    loader: contentLoader('siteCopyCatalogue'),
    schema: G.siteCopyCatalogue,
  }),
  siteCopyProduct: defineCollection({
    loader: contentLoader('siteCopyProduct'),
    schema: G.siteCopyProduct,
  }),
  siteCopyCompare: defineCollection({
    loader: contentLoader('siteCopyCompare'),
    schema: G.siteCopyCompare,
  }),
  siteCopyAccessories: defineCollection({
    loader: contentLoader('siteCopyAccessories'),
    schema: G.siteCopyAccessories,
  }),
  siteCopyBlog: defineCollection({ loader: contentLoader('siteCopyBlog'), schema: G.siteCopyBlog }),
  siteCopyInstallers: defineCollection({
    loader: contentLoader('siteCopyInstallers'),
    schema: G.siteCopyInstallers,
  }),
  siteCopyForms: defineCollection({
    loader: contentLoader('siteCopyForms'),
    schema: G.siteCopyForms,
  }),
  siteCopyFooter: defineCollection({
    loader: contentLoader('siteCopyFooter'),
    schema: G.siteCopyFooter,
  }),
  siteCopyNotFound: defineCollection({
    loader: contentLoader('siteCopyNotFound'),
    schema: G.siteCopyNotFound,
  }),
  languages: defineCollection({ loader: contentLoader('languages'), schema: G.languages }),
  finder: defineCollection({ loader: contentLoader('finder'), schema: G.finder }),
} satisfies Record<ContentName, unknown>;
