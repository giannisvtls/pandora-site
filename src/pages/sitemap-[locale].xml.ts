// A language's sitemap (spec §9): every page of a built page type that exists there, with its
// hreflang alternates (the query's `sitemapEntries`: never a 404 page, A18). Written at build
// time, one file per built language: dist/sitemap-en.xml.
import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';

import { siteQuery } from '../content/query';
import { sitemapXml } from '../content/seo';

export const getStaticPaths = (async () => {
  const query = await siteQuery();
  return query.built.map((locale) => ({ params: { locale }, props: { locale } }));
}) satisfies GetStaticPaths;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export const GET: APIRoute<Props> = async ({ props, site }) => {
  if (site === undefined) throw new Error('astro.config.mjs sets no site');
  const query = await siteQuery();
  return new Response(sitemapXml(site, query.sitemapEntries(props.locale)), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
