// Site copy of the blog, the installer finder and the form pages (contact, partners, warranty;
// spec §2 "Globals"). English is the source language; posts and FAQ entries are collection
// data, not Site copy.
import { z } from 'zod';

import { textValue } from './primitives';
import { copy, copyHeading, copyTemplate, titledText } from './site-copy-parts';

export const siteCopyBlogSchema = z.strictObject({
  heading: copyHeading(),
  lead: copy(),
  // Under a post's title: its date and its category label.
  articleMeta: copyTemplate(['date', 'category']),
  backToAll: copy(),
});
export type SiteCopyBlog = z.infer<typeof siteCopyBlogSchema>;

// A list of steps or benefits.
const titledTexts = z.array(titledText()).min(1);

// A network figure: the number is a fact, its label text ("100+" partners).
const networkFigure = z.strictObject({ value: textValue, label: copy() });

export const siteCopyInstallersSchema = z.strictObject({
  heading: copyHeading(),
  lead: copy(),
  form: z.strictObject({
    // The search form's accessible name.
    label: copy(),
    postalCode: copy(),
    postalCodePlaceholder: copy(),
    country: copy(),
    submit: copy(),
    useLocation: copy(),
  }),
  // The countries the finder knows, by ISO 3166 code.
  countries: z.strictObject({ GR: copy(), IT: copy(), AL: copy() }),
  // The three steps under `common.howItWorks`.
  steps: titledTexts,
  network: z.array(networkFigure).min(1),
  mapLabel: copy(),
  // A hub's map popup, under its city.
  mapPopup: copyTemplate(['country']),
  results: z.strictObject({
    // What the search was for: a postal code and its country, or the visitor's location.
    postalCodeIn: copyTemplate(['code', 'country']),
    yourLocation: copy(),
    intro: copy(),
    // The distance unit after each hub's distance.
    km: copy(),
    // The tag after the head office's city.
    headOffice: copy(),
    area: copyTemplate(['country']),
    request: copy(),
  }),
  errors: z.strictObject({
    label: copy(),
    shortCode: copyTemplate(['country']),
    // `{link}` is `contactLink`, a link to the contact page.
    unknownCode: copyTemplate(['code', 'country', 'link']),
    contactLink: copy(),
    noGeolocation: copy(),
    locationFailed: copy(),
  }),
});
export type SiteCopyInstallers = z.infer<typeof siteCopyInstallersSchema>;

// A page head: the h1 and the lead under it.
const pageHead = z.strictObject({ heading: copyHeading(), lead: copy() });

const contactPage = pageHead.extend({
  // The map's title: the footer company block's street and locality.
  mapTitle: copyTemplate(['street', 'locality']),
  submit: copy(),
  done: copy(),
});

const partnersPage = pageHead.extend({
  benefits: titledTexts,
  // The options of "What do you install today?".
  trades: z.array(copy()).min(1),
  submit: copy(),
  done: copy(),
});

const warrantyPage = pageHead.extend({
  steps: titledTexts,
  submit: copy(),
  done: copy(),
  doneNote: copy(),
});

export const siteCopyFormsSchema = z.strictObject({
  // Every field label of the three forms and the contact facts, each once.
  labels: z.strictObject({
    company: copy(),
    address: copy(),
    hours: copy(),
    phone: copy(),
    email: copy(),
    fullName: copy(),
    vehicle: copy(),
    message: copy(),
    city: copy(),
    trade: copy(),
    workshop: copy(),
    system: copy(),
    serialNumber: copy(),
    plate: copy(),
    installDate: copy(),
    installer: copy(),
    yourEmail: copy(),
  }),
  placeholders: z.strictObject({ vehicle: copy(), serialNumber: copy(), installer: copy() }),
  contact: contactPage,
  faqHeading: copyHeading(),
  partners: partnersPage,
  warranty: warrantyPage,
  // The note under the contact and partner confirmations: `{hours}` is the footer's hours.
  replyNote: copyTemplate(['hours']),
  // Messages the contact form starts with, after the installer finder or an accessory.
  prefill: z.strictObject({
    installer: copyTemplate(['code', 'country']),
    accessory: copyTemplate(['code', 'name']),
  }),
});
export type SiteCopyForms = z.infer<typeof siteCopyFormsSchema>;
