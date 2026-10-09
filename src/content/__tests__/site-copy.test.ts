// The Site copy globals (spec §2): the twelve groups and their files; every committed file
// parses; every template's English value uses exactly the placeholders its schema declares; and
// the shapes' own rules (headings, log rows, link targets, facts, the compare grammar).
import { readdirSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  declaredPlaceholders,
  GLOBALS,
  hasStrayBrace,
  LOCALES,
  placeholdersOf,
  SITE_COPY,
  siteCopyCompareSchema,
  siteCopyFooterSchema,
  siteCopyHomeSchema,
  snapshotFileName,
  type SiteCopyName,
} from '../contract';
import type { Loose } from './contract-fixtures';

const REPO_ROOT = new URL('../../../', import.meta.url);
const NAMES = Object.keys(SITE_COPY) as SiteCopyName[];

function snapshotOf(name: SiteCopyName): Loose {
  const file = new URL(`content-snapshot/${snapshotFileName(name)}`, REPO_ROOT);
  return JSON.parse(readFileSync(file, 'utf8')) as Loose;
}

function pathsOf(schema: z.ZodType, value: unknown): string[] {
  const issues = schema.safeParse(value).error?.issues ?? [];
  return issues.map((issue) => issue.path.map(String).join('.'));
}

interface LanguageMap {
  readonly path: string;
  readonly map: Readonly<Record<string, string>>;
  // The placeholders of a template; undefined for plain text.
  readonly declared: readonly string[] | undefined;
}

const isLocaleKeyed = (schema: z.ZodRecord): boolean => {
  const { keyType } = schema;
  return (
    keyType instanceof z.ZodEnum &&
    keyType.options.length === LOCALES.length &&
    LOCALES.every((locale) => keyType.options.includes(locale))
  );
};

// One level down from a container schema: each child schema with its value and path.
type Step = readonly [z.ZodType, unknown, string[]];

function stepsInto(schema: z.ZodType, value: unknown, at: string[]): Step[] {
  if (schema instanceof z.ZodOptional) {
    return [[schema.unwrap() as z.ZodType, value, at]];
  }
  if (schema instanceof z.ZodObject) {
    return Object.entries(schema.shape).map(([key, child]): Step => [
      child as z.ZodType,
      (value as Loose)[key],
      [...at, key],
    ]);
  }
  if (schema instanceof z.ZodArray) {
    const element = schema.element as z.ZodType;
    return (value as unknown[]).map((item, index): Step => [element, item, [...at, String(index)]]);
  }
  if (schema instanceof z.ZodRecord) {
    const valueType = schema.valueType as z.ZodType;
    return Object.entries(value as Loose).map(([key, item]): Step => [
      valueType,
      item,
      [...at, key],
    ]);
  }
  // A union (a link target): every option, each finding its own keys in the value.
  return schema instanceof z.ZodUnion
    ? schema.options.map((option): Step => [option as z.ZodType, value, at])
    : [];
}

// Every language map in `value`, found by walking `schema` alongside it.
function* languageMapsIn(
  schema: z.ZodType,
  value: unknown,
  at: string[] = [],
): Generator<LanguageMap> {
  if (value === undefined) return;
  if (schema instanceof z.ZodRecord && isLocaleKeyed(schema)) {
    const map = value as Record<string, string>;
    yield { path: at.join('.'), map, declared: declaredPlaceholders(schema) };
    return;
  }
  for (const [child, item, path] of stepsInto(schema, value, at)) {
    yield* languageMapsIn(child, item, path);
  }
}

// A copy of the committed home Site copy whose first log row has `patch` applied.
function homeWithFirstRow(patch: Loose): Loose {
  const home = snapshotOf('siteCopyHome');
  const log = home.log as { rows: Loose[] };
  log.rows[0] = { ...log.rows[0], ...patch };
  return home;
}

// A copy of the committed footer whose first link is `link`.
function footerWithFirstLink(link: unknown): Loose {
  const footer = snapshotOf('siteCopyFooter');
  const [column] = footer.columns as { links: unknown[] }[];
  if (column !== undefined) column.links[0] = link;
  return footer;
}

// A plain-HTTP URL, built so that `eslint --fix` cannot rewrite it (docs/gotchas.md).
function plainHttp(href: string): string {
  const url = new URL(href);
  url.protocol = 'http:';
  return url.href;
}

describe.each(NAMES)('%s', (name) => {
  const schema: z.ZodType = SITE_COPY[name];
  const snapshot = snapshotOf(name);
  const maps = [...languageMapsIn(schema, snapshot)];

  it('parses unchanged from content-snapshot/', () => {
    expect(schema.parse(snapshot)).toStrictEqual(snapshot);
  });

  it("uses exactly each template's declared placeholders in English", () => {
    expect(maps.length).toBeGreaterThan(0);
    for (const { path, map, declared } of maps) {
      if (declared === undefined) continue;
      const english = map.en ?? '';
      expect(new Set(placeholdersOf(english)), path).toEqual(new Set(declared));
      expect(hasStrayBrace(english), path).toBe(false);
    }
  });

  it('needs English for every text, reported at the locale', () => {
    const [first] = maps;
    const broken = structuredClone(snapshot);
    const target = first?.path.split('.') ?? [];
    let parent: Loose = broken;
    for (const key of target) parent = parent[key] as Loose;
    delete parent.en;

    expect(pathsOf(schema, broken)).toEqual([`${first?.path ?? ''}.en`]);
  });

  it('rejects an unknown key', () => {
    expect(schema.safeParse({ ...snapshot, color: 'red' }).error?.issues).toMatchObject([
      { code: 'unrecognized_keys', keys: ['color'] },
    ]);
  });
});

describe('the Site copy groups', () => {
  it('are the twelve page groups of spec §2, each with its snapshot file and no other file', () => {
    const files = readdirSync(new URL('content-snapshot/', REPO_ROOT)).filter((file) =>
      file.startsWith('site-copy-'),
    );

    expect(NAMES).toEqual([
      'siteCopyHeader',
      'siteCopyCommon',
      'siteCopyHome',
      'siteCopyCatalogue',
      'siteCopyProduct',
      'siteCopyCompare',
      'siteCopyAccessories',
      'siteCopyBlog',
      'siteCopyInstallers',
      'siteCopyForms',
      'siteCopyFooter',
      'siteCopyNotFound',
    ]);
    expect(new Set(files)).toEqual(new Set(NAMES.map((name) => snapshotFileName(name))));
    expect(Object.keys(GLOBALS)).toEqual([...NAMES, 'languages']);
  });
});

describe('the Site copy templates', () => {
  const templates = NAMES.flatMap((name) =>
    [...languageMapsIn(SITE_COPY[name], snapshotOf(name))]
      .filter((entry) => entry.declared !== undefined)
      .map((entry) => `${name}.${entry.path}`),
  );

  it('are found by the walk, plural and byCount variants included', () => {
    expect(templates).toContain('siteCopyCommon.titleTemplate');
    expect(templates).toContain('siteCopyCatalogue.systemCount.one');
    expect(templates).toContain('siteCopyCompare.empty.picks.3');
    expect(templates.length).toBeGreaterThan(40);
  });

  it('fail at the language when a value uses another placeholder', () => {
    const common = snapshotOf('siteCopyCommon');
    common.allVehicleSystems = { en: 'All {car} systems' };

    expect(pathsOf(SITE_COPY.siteCopyCommon, common)).toEqual(['allVehicleSystems.en']);
  });
});

describe('headings', () => {
  it('are valid without a payload (the picker heading has none)', () => {
    const home = snapshotOf('siteCopyHome');

    expect((home.picker as Loose).heading).toEqual({ lead: { en: 'Protect my' } });
    expect(pathsOf(siteCopyHomeSchema, home)).toEqual([]);
  });

  it('take a payload away and stay valid', () => {
    const compare = snapshotOf('siteCopyCompare');
    compare.heading = { lead: { en: 'Compare' } };

    expect(pathsOf(siteCopyCompareSchema, compare)).toEqual([]);
  });
});

describe('the 02:14 log', () => {
  it('gives each row a level or a tag, never both and never neither', () => {
    expect(pathsOf(siteCopyHomeSchema, homeWithFirstRow({ tag: { en: 'Tracking' } }))).toEqual([
      'log.rows.0.level',
    ]);
    expect(pathsOf(siteCopyHomeSchema, homeWithFirstRow({ level: undefined }))).toEqual([
      'log.rows.0.level',
    ]);
  });

  it('takes a time as a fact, HH:MM:SS', () => {
    expect(pathsOf(siteCopyHomeSchema, homeWithFirstRow({ time: '2:14' }))).toEqual([
      'log.rows.0.time',
    ]);
  });
});

describe('the footer', () => {
  const label = { en: 'Test link' };

  it('takes a link to a route, to an https URL, or with no URL yet (A9)', () => {
    for (const target of [
      { route: 'category', params: { vehicle: 'marine' } },
      { route: 'contact', hash: 'faq' },
      { href: 'https://www.example.com/invetec' },
      undefined,
    ]) {
      expect(pathsOf(siteCopyFooterSchema, footerWithFirstLink({ label, target }))).toEqual([]);
    }
  });

  it.each([
    [{ route: 'shop' }, ''],
    [{ route: 'category', params: { vehicle: 'truck' } }, ''],
    [{ route: 'blog', href: 'https://www.example.com/' }, ''],
    [{ href: plainHttp('https://www.example.com/') }, '.href'],
    [{ href: '/en/contact/' }, '.href'],
  ])('rejects the link target %j', (target, field) => {
    expect(pathsOf(siteCopyFooterSchema, footerWithFirstLink({ label, target }))).toEqual([
      `columns.0.links.0.target${field}`,
    ]);
  });

  it('keeps the company facts as facts', () => {
    const footer = snapshotOf('siteCopyFooter');
    const company = footer.company as Loose;

    expect(company.name).toBe('INVETEC E.E.');
    for (const [field, value] of [
      ['phone', '2105814441'],
      ['phone', '+30  210'],
      ['email', 'info(at)invetec.eu'],
      ['name', { en: 'INVETEC E.E.' }],
    ] as const) {
      const broken = { ...footer, company: { ...company, [field]: value } };
      expect(pathsOf(siteCopyFooterSchema, broken)).toEqual([`company.${field}`]);
    }
  });
});

describe('the compare grammar', () => {
  it('spells out two and three picks, and nothing else', () => {
    const compare = snapshotOf('siteCopyCompare');
    const empty = compare.empty as Loose;
    const four = {
      ...compare,
      empty: { ...empty, seed: { ...(empty.seed as Loose), 4: { en: 'Compare these four' } } },
    };
    const two = { ...compare, empty: { ...empty, seed: { 2: { en: 'Compare these two' } } } };

    expect(siteCopyCompareSchema.safeParse(four).error?.issues).toMatchObject([
      { code: 'unrecognized_keys', keys: ['4'], path: ['empty', 'seed'] },
    ]);
    expect(pathsOf(siteCopyCompareSchema, two)).toEqual(['empty.seed.3']);
  });
});
