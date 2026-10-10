// What a 404 page shows (spec §9), on the snapshot and on fixtures: its name for the title
// template, the heading, the text and the link home, in the page's language.
import { describe, expect, it } from 'vitest';

import { fixtureContent, snapshot, withLanguage } from '../../content/__tests__/rules-fixtures';
import { fill } from '../../content/copy';
import { createQuery } from '../../content/query';
import { notFoundContent } from '../not-found';

describe('notFoundContent', () => {
  const site = createQuery(snapshot, { preview: false });

  it('gives the 404 copy and the link to the English home', () => {
    expect(notFoundContent(site, 'en')).toEqual({
      name: 'Page not found',
      heading: { lead: 'Page', payload: 'not found.' },
      text: 'The page you are looking for does not exist or has moved.',
      home: { href: '/en/', label: 'Go to the home page' },
    });
  });

  it('titles the page "Page not found — INVETEC" through the common template (A5)', () => {
    const template = snapshot.siteCopyCommon.titleTemplate.en ?? '';

    expect(fill(template, { page: notFoundContent(site, 'en').name })).toBe(
      'Page not found — INVETEC',
    );
  });

  it("reads the copy in the page's language and links that language's home", () => {
    const data = withLanguage(fixtureContent(['en', 'el']), 'el');
    const siteCopyNotFound = {
      name: { en: 'Not found', el: 'Not found (el)' },
      title: { lead: { en: 'Gone', el: 'Gone (el)' } },
      text: { en: 'Text', el: 'Text (el)' },
      homeLink: { en: 'Home', el: 'Home (el)' },
    };
    const query = createQuery({ ...data, siteCopyNotFound }, { preview: false });

    expect(notFoundContent(query, 'el')).toEqual({
      name: 'Not found (el)',
      heading: { lead: 'Gone (el)', payload: undefined },
      text: 'Text (el)',
      home: { href: '/el/', label: 'Home (el)' },
    });
  });
});
