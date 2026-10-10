// The sitemap index (spec §9): one sitemap per built language; robots.txt names it. Written at
// build time as dist/sitemap-index.xml (the static output prerenders every route).
import type { APIRoute } from 'astro';

import { siteQuery } from '../content/query';
import { sitemapIndexXml } from '../content/seo';

export const GET: APIRoute = async ({ site }) => {
  if (site === undefined) throw new Error('astro.config.mjs sets no site');
  const query = await siteQuery();
  return new Response(sitemapIndexXml(site, query.built), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
