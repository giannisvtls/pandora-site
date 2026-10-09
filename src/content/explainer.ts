// The explainer data (spec §5, §8): what the feature and level dialogs show in one language. Built
// by the query module from the content as that language shows it, so only visible systems are
// listed, each with its product URL. Texts are the language's own; a text it lacks (possible in a
// preview build only) is undefined and its section is left out. Pure: no Astro, no files.
import {
  SPEC_ROW_KEYS,
  type Feature,
  type Level,
  type LevelId,
  type Locale,
  type LocalizedText,
  type Product,
  type SpecRowKey,
} from './contract';
import type { ProductLevel } from './levels';
import type { ContentIn } from './rules';

// A system an explainer lists: its name (a link) and its page.
export interface ExplainerSystem {
  readonly id: string;
  readonly name: string;
  readonly url: string;
}

// "On these systems": Included (matrix 1, or a highlight) or Optional (matrix 2).
export interface FeatureSystem extends ExplainerSystem {
  readonly availability: 'included' | 'optional';
}

// "Systems that reach this level": with the vehicle word of its category (`common.vehicles.*.word`,
// the prototype's label there: "car", "motorcycle", "trucks & trackers").
export interface LevelSystem extends ExplainerSystem {
  readonly vehicle: string | undefined;
}

export interface FeatureExplainer {
  readonly id: string;
  readonly title: string | undefined;
  readonly what: string | undefined;
  readonly how: string | undefined;
  readonly needs: string | undefined;
  readonly systems: readonly FeatureSystem[];
}

export interface LevelExplainer {
  readonly id: LevelId;
  readonly title: string | undefined;
  readonly what: string | undefined;
  readonly items: readonly string[];
  readonly stops: string | undefined;
  readonly systems: readonly LevelSystem[];
}

export interface Explainer {
  readonly features: Readonly<Record<string, FeatureExplainer>>;
  readonly levels: Readonly<Record<LevelId, LevelExplainer>>;
}

// A system visible in the language, with its URL and level (the query module's products).
export type ExplainerProduct = Pick<
  Product,
  'id' | 'name' | 'category' | 'matrix' | 'highlights'
> & {
  readonly url: string;
  readonly level: ProductLevel;
};

const ROW_KEYS: ReadonlySet<string> = new Set(SPEC_ROW_KEYS);

const isRowKey = (key: string): key is SpecRowKey => ROW_KEYS.has(key);

// A visible product has its name in the language (the item rule); a missing one is a bug.
function nameIn(product: ExplainerProduct, locale: Locale): string {
  const name = product.name[locale];
  if (name === undefined) throw new Error(`The product ${product.id} has no name in ${locale}`);
  return name;
}

// The systems a feature is on: for a matrix row, the products whose matrix has it Included (1)
// or Optional (2); for a key without a row, the products that highlight it, as Included.
function featureSystems(
  key: string,
  products: readonly ExplainerProduct[],
  locale: Locale,
): FeatureSystem[] {
  return products.flatMap((product): FeatureSystem[] => {
    const value = isRowKey(key) ? product.matrix?.[key] : undefined;
    const isOn = isRowKey(key) ? value === 1 || value === 2 : product.highlights.includes(key);
    if (!isOn) return [];
    const { id, url } = product;
    const availability = value === 2 ? 'optional' : 'included';
    return [{ id, name: nameIn(product, locale), url, availability }];
  });
}

function featureIn(
  feature: Feature,
  products: readonly ExplainerProduct[],
  locale: Locale,
): FeatureExplainer {
  return {
    id: feature.id,
    title: feature.title[locale],
    what: feature.what[locale],
    how: feature.how?.[locale],
    needs: feature.needs?.[locale],
    systems: featureSystems(feature.id, products, locale),
  };
}

function levelIn(
  level: Level,
  content: ContentIn,
  products: readonly ExplainerProduct[],
  locale: Locale,
): LevelExplainer {
  const words = content.siteCopyCommon.vehicles;
  return {
    id: level.id,
    title: level.title[locale],
    what: level.what[locale],
    items: level.items.flatMap((item: LocalizedText) => item[locale] ?? []),
    stops: level.stops[locale],
    systems: products
      .filter((product) => String(product.level) === level.id)
      .map((product) => ({
        id: product.id,
        name: nameIn(product, locale),
        url: product.url,
        vehicle: words[product.category].word[locale],
      })),
  };
}

// The explainer data of `locale`: every feature by its key, every level by its id. `content` is
// the content as `locale` shows it (rules.ts `contentIn`), `products` its visible products.
export function explainerIn(
  content: ContentIn,
  products: readonly ExplainerProduct[],
  locale: Locale,
): Explainer {
  return {
    features: Object.fromEntries(
      content.features.map((feature) => [feature.id, featureIn(feature, products, locale)]),
    ),
    levels: Object.fromEntries(
      content.levels.map((level) => [level.id, levelIn(level, content, products, locale)]),
    ) as Record<LevelId, LevelExplainer>,
  };
}
