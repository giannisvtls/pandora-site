// Site copy of the shell (spec §2 "Globals"): the header, the strings several pages share
// (`common`, A4), the footer and the 404 pages. English is the source language.
import { z } from 'zod';

import { categoryId } from './keys';
import { textValue } from './primitives';
import { copy, copyHeading, copyPlural, copyTemplate, linkItem } from './site-copy-parts';

export const siteCopyHeaderSchema = z.strictObject({
  // The logo's alt text, in the header and the footer.
  logoAlt: copy(),
  // The accessible name of the logo link to the language home.
  homeLinkLabel: copy(),
  // The accessible names of the two navigation landmarks; the links are the nav sections.
  primaryNavLabel: copy(),
  mobileNavLabel: copy(),
  // The compare link's accessible name; it shows `common.pages.compare` and the count.
  compareLinkLabel: copy(),
  // The theme toggle's label, naming what a press does.
  themeToDark: copy(),
  themeToLight: copy(),
  // The language switcher's accessible name.
  languageLabel: copy(),
  // The menu button's label, closed and open.
  openMenu: copy(),
  closeMenu: copy(),
});
export type SiteCopyHeader = z.infer<typeof siteCopyHeaderSchema>;

// How each vehicle is named: on its tab ("Car"), inside a sentence ("All car systems",
// "trucks & trackers") and as a noun for one system ("Choose up to 4 truck systems").
const vehicleNames = z.strictObject({ tab: copy(), word: copy(), noun: copy() });

export const siteCopyCommonSchema = z.strictObject({
  skipLink: copy(),
  // Every page title but home's (A5): `{page} — INVETEC`.
  titleTemplate: copyTemplate(['page']),
  // The name of each page as its breadcrumb shows it. `accessories` is also the kind label of
  // accessory cards (they have no level) and the vehicle tabs' link to the accessories page.
  pages: z.strictObject({
    home: copy(),
    systems: copy(),
    compare: copy(),
    accessories: copy(),
    installers: copy(),
    blog: copy(),
    contact: copy(),
    partners: copy(),
    warranty: copy(),
  }),
  // A level tag and a level button: `{title}` is the level's title from the levels set.
  level: copyTemplate(['n', 'title']),
  // A level without its title (the 02:14 log's level lines, the compare name bar).
  levelShort: copyTemplate(['n']),
  // The matrix values (explainer, product specification, compare).
  matrix: z.strictObject({ included: copy(), optional: copy(), notIncluded: copy() }),
  // The two spec-row groups that are not levels (their rows are fixed in code, A7).
  specGroups: z.strictObject({ control: copy(), comfort: copy() }),
  vehicles: z.record(categoryId, vehicleNames),
  // The accessible name of the vehicle tabs.
  vehicleTabsLabel: copy(),
  // The first filter chip (levels, vehicles, post categories).
  all: copy(),
  // The labels of the post categories.
  postCategories: z.strictObject({ news: copy(), tech: copy() }),
  seeSystem: copy(),
  seeAccessories: copy(),
  findCertifiedInstaller: copy(),
  becomePartner: copy(),
  // "All car systems": `{vehicle}` is the vehicle's `word`.
  allVehicleSystems: copyTemplate(['vehicle']),
  accessoryCount: copyPlural(['count']),
  // The explainer's "How it works" section, and the installer finder's steps.
  howItWorks: copy(),
  // The explainer dialog (feature and level views).
  explainer: z.strictObject({
    close: copy(),
    needs: copy(),
    onTheseSystems: copy(),
    whatYouGet: copy(),
    whereItStops: copy(),
    systemsAtLevel: copy(),
  }),
});
export type SiteCopyCommon = z.infer<typeof siteCopyCommonSchema>;

// A phone number as shown: `+`, then digit groups separated by single spaces.
const displayPhone = z
  .string()
  .regex(/^\+\d+(?: \d+)*$/u, 'Expected a phone number like +30 210 581 4441');

// A footer column: its heading and its links (a link without a target is not rendered, A9).
const footerColumn = z.strictObject({ heading: copy(), links: z.array(linkItem).min(1) });

export const siteCopyFooterSchema = z.strictObject({
  // The company block; name, postal code, phone and email are facts.
  company: z.strictObject({
    name: textValue,
    street: copy(),
    locality: copy(),
    postalCode: textValue,
    // How the address reads in one line: `{street}, {locality} {postalCode}`.
    addressLine: copyTemplate(['street', 'locality', 'postalCode']),
    hours: copy(),
    phone: displayPhone,
    email: z.email(),
  }),
  columns: z.array(footerColumn).min(1),
  // `{year}` is the year of the build, `{company}` the company name.
  copyright: copyTemplate(['year', 'company']),
  tagline: copy(),
});
export type SiteCopyFooter = z.infer<typeof siteCopyFooterSchema>;

// The 404 pages (new English, A6).
export const siteCopyNotFoundSchema = z.strictObject({
  // The page's name in the title template (`common.titleTemplate`, A5): "Page not found —
  // INVETEC". The h1 is `title`, whose payload ends in a full stop.
  name: copy(),
  title: copyHeading(),
  text: copy(),
  homeLink: copy(),
});
export type SiteCopyNotFound = z.infer<typeof siteCopyNotFoundSchema>;
