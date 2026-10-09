import { defineCollection } from 'astro:content';

import { productSchema } from './content/contract';
import { contentLoader } from './content/loader';

const products = defineCollection({ loader: contentLoader('products'), schema: productSchema });

export const collections = { products };
