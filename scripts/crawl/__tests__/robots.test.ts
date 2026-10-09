import { describe, expect, it } from 'vitest';

import { DISALLOW_ALL, NO_RULES, parseRobots, robotsMatcher } from '../robots';
import { fixture } from './helpers';

describe('parseRobots', () => {
  it('reads the `User-agent: *` rules and the Sitemap lines of a WordPress robots.txt', () => {
    expect(parseRobots(fixture('robots-wordpress.txt'))).toStrictEqual({
      sitemaps: ['https://invetec.eu/sitemap_index.xml'],
      allow: ['/wp-admin/admin-ajax.php'],
      disallow: ['/wp-admin/', '/wp-content/plugins/'],
      crawlDelay: null,
    });
  });

  it('merges every group naming *, ignores other agents, comments and empty Disallow', () => {
    expect(parseRobots(fixture('robots-groups.txt'))).toStrictEqual({
      sitemaps: ['https://invetec.eu/sitemap_index.xml', 'https://invetec.eu/extra-sitemap.xml'],
      allow: ['/private/public-note/'],
      disallow: [
        '/private/',
        '/*.pdf$',
        '/search*results',
        '/%CE%B1%CF%81%CF%87%CE%B5%CE%AF%CE%BF/',
        '/πρόχειρο/',
        '/tmp-preview/',
      ],
      crawlDelay: null,
    });
  });

  it('keeps the largest Crawl-delay of the `*` groups and ignores other agents and bad values', () => {
    const text = [
      'User-agent: Bingbot',
      'Crawl-delay: 30',
      'User-agent: *',
      'Crawl-delay: 1.5',
      'User-agent: *',
      'Crawl-delay: soon',
      'Crawl-delay: 4',
    ].join('\n');

    expect(parseRobots(text).crawlDelay).toBe(4);
    expect(parseRobots('User-agent: *\nDisallow:\n').crawlDelay).toBeNull();
  });

  it('reads CRLF line endings and a byte-order mark the same way', () => {
    const lf = fixture('robots-groups.txt');
    const crlf = `${String.fromCodePoint(0xfe_ff)}${lf.replaceAll('\n', '\r\n')}`;

    expect(parseRobots(crlf)).toStrictEqual(parseRobots(lf));
  });
});

describe('robotsMatcher', () => {
  const isAllowed = robotsMatcher(parseRobots(fixture('robots-groups.txt')));
  const isAllowedOnWordPress = robotsMatcher(parseRobots(fixture('robots-wordpress.txt')));

  it.each([
    ['/wp-admin/', false],
    ['/wp-admin/options.php', false],
    ['/wp-admin/admin-ajax.php', true],
    ['/wp-content/plugins/x/readme.txt', false],
    ['/wp-content/uploads/a.jpg', true],
    ['/en/contact/', true],
    ['/', true],
  ])('WordPress robots.txt: %s allowed = %s', (path, expected) => {
    expect(isAllowedOnWordPress(path)).toBe(expected);
  });

  it.each([
    // Disallow /private/, but the longer Allow wins inside it.
    ['/private/', false],
    ['/private/report/', false],
    ['/private/public-note/', true],
    ['/privately/', true],
    // `*` and a final `$`.
    ['/files/catalog.pdf', false],
    ['/files/catalog.pdf/view/', true],
    ['/search-all-results/', false],
    ['/search/', true],
    // Percent-escapes compare case-insensitively; a raw Greek rule matches its encoded path.
    ['/%ce%b1%cf%81%cf%87%ce%b5%ce%af%ce%bf/2024/', false],
    [`/${encodeURIComponent('πρόχειρο')}/note/`, false],
    [`/${encodeURIComponent('πρόχειρο').toLowerCase()}/note/`, false],
    // The second `*` group counts; rules for Googlebot and AdsBot do not.
    ['/tmp-preview/page/', false],
    ['/only-for-googlebot/', true],
    ['/en/', true],
  ])('grouped robots.txt: %s allowed = %s', (path, expected) => {
    expect(isAllowed(path)).toBe(expected);
  });

  it('allows everything without rules and nothing under DISALLOW_ALL', () => {
    expect(robotsMatcher(NO_RULES)('/anything/')).toBe(true);
    expect(robotsMatcher(DISALLOW_ALL)('/')).toBe(false);
    expect(robotsMatcher(DISALLOW_ALL)('/en/')).toBe(false);
  });

  it('lets Allow win a tie of equal length', () => {
    const isTieAllowed = robotsMatcher({ allow: ['/page'], disallow: ['/page'] });
    expect(isTieAllowed('/page/')).toBe(true);
  });
});
