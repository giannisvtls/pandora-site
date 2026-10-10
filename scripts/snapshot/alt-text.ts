// Media alt text (spec §3.1): an alt says what the image shows and uses only names from the data
// (or, for a photo's car, the file name). One media item per file, so one alt per picture,
// whichever page shows it.
//
// The patterns, from the prototype's own alt attributes:
// - a package shot: "{brand} {name} package";
// - an installation or proof photo: "{car} with Pandora {system} installed";
// - an accessory: "Pandora {code}".
// Category heads are decorative (no alt in any language). The home hero poster is not: its file
// is also Smart V4's install image, so its media item has an alt, and the hero renders it with
// alt="" because of where it sits (spec §3.1): dropping its alt would lose what the install image
// shows.
//
// ALT_BY_MEDIA holds the alt written after viewing each image where no pattern applies (gallery
// shots, post images) or the pattern does not match the picture; it wins over a pattern. A media
// file with neither stops the conversion: an alt is never guessed.

// How the content uses one media file; `at` names the data that uses it.
export type MediaUse =
  | { readonly role: 'decorative'; readonly at: string }
  | { readonly role: 'package'; readonly at: string; readonly brand: string; readonly name: string }
  | { readonly role: 'photo'; readonly at: string; readonly car: string; readonly system: string }
  | { readonly role: 'accessory'; readonly at: string; readonly code: string }
  | { readonly role: 'other'; readonly at: string };

export type MediaText =
  { readonly decorative: true } | { readonly alt: string; readonly pattern: string | undefined };

// Alt text by media id, written after viewing each image. The comment says why the pattern was
// not used.
export const ALT_BY_MEDIA: Readonly<Record<string, string>> = {
  // Accessory card images: the package pattern ("Pandora Accessories package") would name a box,
  // but the pictures show one product each.
  'pandora-accessories-sirens-pandora-ps-330-pandora-ps-331-bt-pandora-ps-332-bt': 'Pandora siren',
  'pandora-accessories-remote-controllers-pandora-r-468bt-pandora-r-500-bt':
    'Pandora remote control',
  'pandora-dms-100-bt-black': 'Pandora DMS-100 BT sensor',
  // Gallery shots: no pattern (the prototype gives them an empty alt inside a labelled button).
  'pandora-commander-remote-control': 'Pandora Commander remote control',
  'pandora-d-061-lora-868mhzbluetooth5-gr':
    'Pandora D-061 remote control connecting to a car over Bluetooth 5.0',
  // The device reads "Ultimate"; its model is in the file name only, not in the data.
  'pandora-ultimate-d-060': 'Pandora remote control with a display',
  'pandora-professional-v3-connectivity':
    'Pandora Professional V3 connectivity: GSM, GNSS and Bluetooth modules linked to the Pandora Connect app',
  'pandora-ps-330': 'Pandora PS-330 siren',
  'pandora-nav-035-bt': 'Pandora NAV-035 BT GPS/GLONASS receiver',
  'pro-v2': 'Pandora Light Pro V2 central unit',
  'light-pro-v2': 'Pandora Light Pro V2 remote control',
  'pandora-light-remote': 'Pandora Light V3 remote control',
  'light-v3-part': 'Pandora Light V3 central unit',
  'pandora-primo-bt': 'Pandora Primo Bluetooth siren',
  'antijammer-primo': 'Anti-jammer: a signal jammer next to a car',
  'honda-adv350': 'Honda ADV350',
  'pandora-camper-pro-v2-features': 'Two motorhomes, seen from the back and from the front',
  'marine-connect':
    'The Pandora Connect app on a phone and the web service on a laptop, tracking a boat',
  'pandora-finder-2': 'Pandora Finder opened, with its AAA batteries',
  'pandora-finder-3': 'Pandora Finder tracker',
  // The home hero poster, which is also Smart V4's install image: the Smart V4 box, and the
  // Pandora Connect app on a phone in a hand.
  'pandora-smart-v4-homepage-frame':
    'Pandora Smart V4 package and the Pandora Connect app on a phone',
  // Installation photos whose car the data does not name: the car is from the file name.
  'works-2024-pandora-light-pro-v2-toyota-c-hr': 'Toyota C-HR with Pandora Light Pro V2 installed',
  'works-2024-pandora-marine-sea-ray-sdx-250': 'Sea Ray SDX 250 with Pandora Marine installed',
  // The file name's "Mercedes Hymen" is not a model name the data knows; the photo shows the
  // cabin of a Mercedes motorhome.
  'works-2025-pandora-camper-pro-mercedes-hymen':
    'Mercedes motorhome with Pandora Camper Pro V2 installed',
  // Post images: the prototype's alt for the MotoDays poster; the other two show what the post
  // is about (the prototype's `imgLabel` values are placeholders, "photo — …").
  '20260218-motodays-2026-gr': 'MotoDays 2026 poster, Fiera di Roma',
  'pandora-keycard-context': 'Pandora KeyCard',
  '20260122-invetec-pandora-featured-on-affari-e-finanza-by-la-repubblica':
    'La Repubblica and its Affari & Finanza page featuring INVETEC and Pandora',
  // The battery is not a Pandora part: the accessory pattern would say "Pandora ZDR GM 50".
  'pricelist-acc-zdr-gm-50': 'ZDR GM 50 backup battery',
};

// The ALT_BY_MEDIA entries that are the prototype's own alt attribute, not written after
// viewing (the converter's report says so).
export const PROTOTYPE_ALT_IDS: ReadonlySet<string> = new Set(['20260218-motodays-2026-gr']);

// The pattern alt of the first use that has one: a proof photo before a package shot before an
// accessory, each in the order the uses were found.
const PATTERN_ORDER = ['photo', 'package', 'accessory'] as const;

// The pattern alt of one use, or undefined.
function patternOf(use: MediaUse): string | undefined {
  switch (use.role) {
    case 'photo': {
      return `${use.car} with Pandora ${use.system} installed`;
    }
    case 'package': {
      return `${use.brand} ${use.name} package`;
    }
    case 'accessory': {
      return `Pandora ${use.code}`;
    }
    default: {
      return undefined;
    }
  }
}

export function patternAlt(uses: readonly MediaUse[]): string | undefined {
  const use = PATTERN_ORDER.values()
    .map((role) => uses.find((candidate) => candidate.role === role))
    .find((candidate) => candidate !== undefined);
  return use === undefined ? undefined : patternOf(use);
}

// The alt text of the media item `id`, or that it is decorative; throws when neither the table
// nor a pattern gives one, or when a decorative image also has a table entry.
export function mediaText(
  id: string,
  uses: readonly MediaUse[],
  table: Readonly<Record<string, string>> = ALT_BY_MEDIA,
): MediaText {
  const written = Object.hasOwn(table, id) ? table[id] : undefined;
  if (uses.some((use) => use.role === 'decorative')) {
    if (written !== undefined) {
      throw new Error(`media ${id} is decorative and also has an alt in ALT_BY_MEDIA`);
    }
    return { decorative: true };
  }
  const pattern = patternAlt(uses);
  const alt = written ?? pattern;
  if (alt === undefined) {
    const used = uses.map((use) => use.at).join(', ');
    throw new Error(
      `media ${id} (${used}) has no alt text: view the image and add it to ALT_BY_MEDIA`,
    );
  }
  return { alt, pattern };
}
