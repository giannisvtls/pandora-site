// The explainer island's props on a page (spec §8): the explainer data of the page's language
// (query module, spec §5) trimmed to what the dialog shows, as plain data. Every feature and level
// is included, so any explainer button a page renders (or adds later) opens; the systems they list
// are one table the views refer to by index (each name, URL and vehicle word once), and a text the
// language lacks (a preview build only) is left out, its section with it. A feature or level
// without a title opens nothing. The labels are Site copy `common` (A4): no new string (A6).
import type { ExplainerProps, FeatureView, LevelView } from '../components/islands/Explainer';
import type { Locale, LocalizedText } from '../content/contract';
import { fill, textIn } from '../content/copy';
import type { FeatureExplainer, LevelExplainer } from '../content/explainer';
import type { Query } from '../content/query';

// `{ [key]: value }` when there is a value, else nothing: absent keys keep the props small.
const optional = <K extends string>(key: K, value: string | undefined) =>
  (value === undefined ? {} : { [key]: value }) as Partial<Record<K, string>>;

// The explainer's props in `locale`.
export function explainerContent(query: Query, locale: Locale): ExplainerProps {
  const { common } = query.siteCopy(locale);
  const explainer = query.explainer(locale);
  const text = (value: LocalizedText | undefined, field: string) =>
    textIn(value, locale, `siteCopyCommon.${field}`);
  const products = query.products(locale);
  const indexOf = new Map(products.map(({ id }, index) => [id, index]));
  const indexes = (systems: readonly { readonly id: string }[]) =>
    systems.flatMap(({ id }) => indexOf.get(id) ?? []);
  const levelTemplate = text(common.level, 'level');

  const featureView = (feature: FeatureExplainer): FeatureView[] => {
    if (feature.title === undefined) return [];
    const optionals = indexes(
      feature.systems.filter(({ availability }) => availability === 'optional'),
    );
    return [
      {
        title: feature.title,
        ...optional('what', feature.what),
        ...optional('how', feature.how),
        ...optional('needs', feature.needs),
        systems: indexes(feature.systems),
        ...(optionals.length > 0 && { optional: optionals }),
      },
    ];
  };
  const levelView = (level: LevelExplainer): LevelView[] => {
    if (level.title === undefined) return [];
    return [
      {
        title: fill(levelTemplate, { n: level.id, title: level.title }),
        ...optional('what', level.what),
        items: level.items,
        ...optional('stops', level.stops),
        systems: indexes(level.systems),
      },
    ];
  };

  return {
    labels: {
      close: text(common.explainer.close, 'explainer.close'),
      howItWorks: text(common.howItWorks, 'howItWorks'),
      needs: text(common.explainer.needs, 'explainer.needs'),
      onTheseSystems: text(common.explainer.onTheseSystems, 'explainer.onTheseSystems'),
      whatYouGet: text(common.explainer.whatYouGet, 'explainer.whatYouGet'),
      whereItStops: text(common.explainer.whereItStops, 'explainer.whereItStops'),
      systemsAtLevel: text(common.explainer.systemsAtLevel, 'explainer.systemsAtLevel'),
      included: text(common.matrix.included, 'matrix.included'),
      optional: text(common.matrix.optional, 'matrix.optional'),
    },
    systems: products.map((product) => ({
      name: textIn(product.name, locale, `products.${product.id}.name`),
      url: product.url,
      vehicle: text(common.vehicles[product.category].word, `vehicles.${product.category}.word`),
    })),
    features: Object.fromEntries(
      Object.entries(explainer.features).flatMap(([key, feature]) =>
        featureView(feature).map((view) => [key, view]),
      ),
    ),
    levels: Object.fromEntries(
      Object.entries(explainer.levels).flatMap(([id, level]) =>
        levelView(level).map((view) => [id, view]),
      ),
    ),
  };
}
