// robots.txt (spec §9): every crawler may fetch everything; the sitemap index is named. Written
// at build time as dist/robots.txt (the static output prerenders every route).
import type { APIRoute } from 'astro';

import { robotsTxt } from '../content/seo';

export const GET: APIRoute = ({ site }) => {
  if (site === undefined) throw new Error('astro.config.mjs sets no site');
  return new Response(robotsTxt(site), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
