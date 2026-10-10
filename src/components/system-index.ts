// What the interim `/{L}/` (P1-8, spec §7) shows until Phase 2 builds the real home: the home
// hero heading as the h1, then each category in order with its visible systems: package shot
// (A19), name, level, tag, the highlight features and the link to the product page (404 until
// Phase 2). Accessory cards are not shown. Everything comes through the query module.
import type { CategoryId, LevelId, Locale, LocalizedText } from '../content/contract';
import { fill, textIn } from '../content/copy';
import type { ResolvedImage } from '../content/media';
import type { ProductIn, Query } from '../content/query';

// A heading as Site copy gives it: `lead <span class="b">payload</span>`.
export interface HeadingText {
  readonly lead: string;
  readonly payload: string | undefined;
}

export interface IndexFeature {
  readonly key: string;
  readonly title: string;
}

export interface IndexLevel {
  readonly id: LevelId;
  // "Level 3 · Recovery" (Site copy `common.level`).
  readonly label: string;
}

export interface IndexSystem {
  readonly id: string;
  readonly name: string;
  readonly tag: string;
  readonly url: string;
  readonly image: ResolvedImage;
  // None for a system without a level.
  readonly level: IndexLevel | undefined;
  readonly features: readonly IndexFeature[];
}

export interface IndexCategory {
  readonly id: CategoryId;
  readonly title: string;
  readonly systems: readonly IndexSystem[];
}

export interface SystemIndex {
  readonly heading: HeadingText;
  // The text of each system's link to its page ("See the system").
  readonly seeSystem: string;
  readonly categories: readonly IndexCategory[];
}

const LEVEL_IDS: Readonly<Record<1 | 2 | 3, LevelId>> = { 1: '1', 2: '2', 3: '3' };

// The interim index in `locale`. A category with no system visible there is left out.
export function systemIndex(query: Query, locale: Locale): SystemIndex {
  const { home, common } = query.siteCopy(locale);
  const explainer = query.explainer(locale);
  const text = (value: LocalizedText | undefined, field: string) => textIn(value, locale, field);
  // A text the explainer data has in `locale` (undefined only in a preview build).
  const known = (value: string | undefined, field: string): string => {
    if (value === undefined) throw new Error(`${field} has no "${locale}" text`);
    return value;
  };
  const levelTemplate = text(common.level, 'siteCopyCommon.level');

  const levelOf = ({ level }: ProductIn): IndexLevel | undefined => {
    if (level === 0) return undefined;
    const id = LEVEL_IDS[level];
    const title = known(explainer.levels[id].title, `levels.${id}.title`);
    return { id, label: fill(levelTemplate, { n: id, title }) };
  };

  const systemOf = (product: ProductIn): IndexSystem => ({
    id: product.id,
    name: text(product.name, `products.${product.id}.name`),
    tag: text(product.tag, `products.${product.id}.tag`),
    url: product.url,
    image: query.image(product.image, locale),
    level: levelOf(product),
    features: product.highlights.map((key) => ({
      key,
      title: known(explainer.features[key]?.title, `features.${key}.title`),
    })),
  });

  const products = query.products(locale);
  const categories = query.categories(locale).map((category) => ({
    id: category.id,
    title: text(category.title, `categories.${category.id}.title`),
    systems: products
      .filter((product) => product.category === category.id)
      .map((product) => systemOf(product)),
  }));
  const { lead, payload } = home.hero.heading;
  return {
    heading: {
      lead: text(lead, 'siteCopyHome.hero.heading.lead'),
      payload:
        payload === undefined ? undefined : text(payload, 'siteCopyHome.hero.heading.payload'),
    },
    seeSystem: text(common.seeSystem, 'siteCopyCommon.seeSystem'),
    categories: categories.filter(({ systems }) => systems.length > 0),
  };
}
