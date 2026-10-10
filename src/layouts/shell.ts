// What the site header and footer show on a page (spec §7), read through the query module: the
// header's links, labels and language targets (and the mobile menu's props, spec §8), and the
// footer's company block, its columns with their links resolved by routes.ts (A9: a link with no
// URL yet, and a column left without links, are not rendered) and the legal line. SiteHeader and
// SiteFooter render these as given.
import type { MobileMenuProps } from '../components/islands/MobileMenu';
import { LANGUAGE_NAMES, type Locale, type RouteKey } from '../content/contract';
import { fill, textIn } from '../content/copy';
import type { Query } from '../content/query';
import { routePath, targetHref } from '../content/routes';
import type { Page, SwitcherTarget } from '../content/rules';

export interface NavLink {
  readonly label: string;
  readonly href: string;
  // The section the page belongs to (`aria-current="page"`).
  readonly isCurrent: boolean;
}

export interface HeaderContent {
  // The logo link to the language home: its accessible name and the logo's alt text.
  readonly home: { readonly href: string; readonly label: string; readonly logoAlt: string };
  readonly nav: { readonly label: string; readonly links: readonly NavLink[] };
  // The compare link: its visible text, its accessible name and where it goes.
  readonly compare: { readonly href: string; readonly text: string; readonly label: string };
  // The theme toggle's labels, each naming what a press does.
  readonly theme: { readonly toDark: string; readonly toLight: string };
  readonly language: { readonly label: string; readonly targets: readonly SwitcherTarget[] };
  // The mobile menu island's props: plain, serialisable data (the island imports no content
  // module), the same links and languages as the nav and the switcher.
  readonly menu: MobileMenuProps;
}

// The nav section a page belongs to: category and product pages are under `systems` (spec §7),
// a post under `blog`, an accessory page under `accessories`.
export function sectionOf(page: Page): RouteKey {
  switch (page.type) {
    case 'category':
    case 'product': {
      return 'systems';
    }
    case 'post': {
      return 'blog';
    }
    case 'accessoriesVehicle':
    case 'accessory': {
      return 'accessories';
    }
    default: {
      return page.type;
    }
  }
}

// The header of `page` in `locale`.
export function headerContent(query: Query, page: Page, locale: Locale): HeaderContent {
  const { header, common } = query.siteCopy(locale);
  const text = (value: Parameters<typeof textIn>[0], field: string) =>
    textIn(value, locale, `siteCopyHeader.${field}`);
  const section = sectionOf(page);
  const links = query.navSections(locale).map((item) => ({
    label: textIn(item.label, locale, `navSections.${item.id}.label`),
    href: item.url,
    isCurrent: item.route === section,
  }));
  const languageLabel = text(header.languageLabel, 'languageLabel');
  const targets = query.switcherTargets(page, locale);
  return {
    home: {
      href: routePath(locale, 'home', {}),
      label: text(header.homeLinkLabel, 'homeLinkLabel'),
      logoAlt: text(header.logoAlt, 'logoAlt'),
    },
    nav: { label: text(header.primaryNavLabel, 'primaryNavLabel'), links },
    compare: {
      href: routePath(locale, 'compare', {}),
      text: textIn(common.pages.compare, locale, 'siteCopyCommon.pages.compare'),
      label: text(header.compareLinkLabel, 'compareLinkLabel'),
    },
    theme: {
      toDark: text(header.themeToDark, 'themeToDark'),
      toLight: text(header.themeToLight, 'themeToLight'),
    },
    language: { label: languageLabel, targets },
    menu: {
      labels: {
        open: text(header.openMenu, 'openMenu'),
        close: text(header.closeMenu, 'closeMenu'),
        nav: text(header.mobileNavLabel, 'mobileNavLabel'),
        language: languageLabel,
      },
      links,
      languages: targets.map((target) => ({ ...target, name: LANGUAGE_NAMES[target.locale] })),
    },
  };
}

export interface FooterLink {
  readonly label: string;
  readonly href: string;
}

export interface FooterContent {
  readonly logoAlt: string;
  // The company block; phone and email with their tel: and mailto: links.
  readonly company: {
    readonly name: string;
    readonly address: string;
    readonly hours: string;
    readonly phone: FooterLink;
    readonly email: FooterLink;
  };
  readonly columns: readonly { readonly heading: string; readonly links: readonly FooterLink[] }[];
  readonly copyright: string;
  readonly tagline: string;
}

// The footer in `locale`; `year` fills the copyright line (the year of the build).
export function footerContent(query: Query, locale: Locale, year: number): FooterContent {
  const { footer, header } = query.siteCopy(locale);
  const text = (value: Parameters<typeof textIn>[0], field: string) =>
    textIn(value, locale, `siteCopyFooter.${field}`);
  const { company } = footer;
  const columns = footer.columns.map((column, index) => ({
    heading: text(column.heading, `columns.${String(index)}.heading`),
    // A link without a target has no URL yet (A9).
    links: column.links.flatMap(({ label, target }, link): FooterLink[] => {
      if (target === undefined) return [];
      const href = 'href' in target ? target.href : targetHref(locale, target);
      return [{ label: text(label, `columns.${String(index)}.links.${String(link)}.label`), href }];
    }),
  }));
  return {
    logoAlt: textIn(header.logoAlt, locale, 'siteCopyHeader.logoAlt'),
    company: {
      name: company.name,
      address: fill(text(company.addressLine, 'company.addressLine'), {
        street: text(company.street, 'company.street'),
        locality: text(company.locality, 'company.locality'),
        postalCode: company.postalCode,
      }),
      hours: text(company.hours, 'company.hours'),
      phone: { label: company.phone, href: `tel:${company.phone.replaceAll(' ', '')}` },
      email: { label: company.email, href: `mailto:${company.email}` },
    },
    // A column whose links all wait for a URL is not rendered (A9).
    columns: columns.filter(({ links }) => links.length > 0),
    copyright: fill(text(footer.copyright, 'copyright'), {
      year: String(year),
      company: company.name,
    }),
    tagline: text(footer.tagline, 'tagline'),
  };
}
