// An Astro Container (Container API) that renders the site's Preact islands as the build does: a
// component that holds one (SiteHeader, and BaseLayout through it) fails with NoMatchingRenderer
// in a bare container. The island comes out as <astro-island> around its server markup.
import { getContainerRenderer } from '@astrojs/preact/container-renderer';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { loadRenderers } from 'astro:container';

type ContainerOptions = NonNullable<Parameters<typeof AstroContainer.create>[0]>;

export async function createContainer(options: ContainerOptions = {}): Promise<AstroContainer> {
  const renderers = await loadRenderers([getContainerRenderer()]);
  return AstroContainer.create({ ...options, renderers });
}
