// The crawl summary (CRAWL.md) on data the small fixture does not hold: a URL that redirects to a
// noindex page, a refused robots.txt, and values that would break a Markdown table. No network.
import { describe, expect, it } from 'vitest';

import { DEFAULT_SUMMARY_PATHS, formatSummary, renderSummary } from '../summary-cli';
import { smallCrawl } from './summary-fixture';

describe('renderSummary on unusual data', () => {
  it('lists a URL that redirects to a noindex page apart from the noindex pages', () => {
    const crawl = smallCrawl();
    crawl.urls.find((record) => record.url.endsWith('/old-post/'))!.robotsMeta = 'none';
    const summary = renderSummary(crawl);
    expect(summary).toContain('## noindex pages (2)');
    expect(summary).toContain('### URLs that redirect to a noindex page (1)');
    expect(summary).toContain(
      '- `https://invetec.eu/it/old-post/` → `https://invetec.eu/it/new-post/`: `none`',
    );
    expect(summary).not.toContain('- `https://invetec.eu/it/old-post/`: ');
  });

  it('names the error of a robots.txt that answered but was refused', () => {
    const crawl = smallCrawl();
    crawl.robots['lenovo.invetec.eu'] = {
      ...crawl.robots['lenovo.invetec.eu']!,
      status: 301,
      error: 'redirect-off-site',
    };
    expect(renderSummary(crawl)).toContain(
      'robots.txt (`https://lenovo.invetec.eu/robots.txt`): HTTP 301, redirect-off-site.',
    );
  });

  it('keeps a value with a line break on one table row and one list item', async () => {
    const crawl = smallCrawl();
    crawl.urls.find((record) => record.url.endsWith('/privacy/'))!.robotsMeta =
      'noindex,\n nofollow';
    const formatted = await formatSummary(renderSummary(crawl), DEFAULT_SUMMARY_PATHS.summary);
    expect(formatted).toMatch(/^\| invetec\.eu +\| `noindex, nofollow` +\| +1 \|$/m);
    expect(formatted).toContain('- `https://invetec.eu/privacy/`: `noindex, nofollow` (el, page)');
  });

  it('escapes a | from the data inside a table cell', () => {
    const crawl = smallCrawl();
    crawl.urls[0]!.robotsMeta = 'index|follow';
    expect(renderSummary(crawl)).toContain(
      String.raw`| invetec.eu | ${'`'}index\|follow${'`'} | 1 |`,
    );
  });
});
