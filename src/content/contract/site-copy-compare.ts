// Site copy of the compare page (spec §2 "Globals"): the picker, the table, the folding grammar
// for rows every system shares, the standout sentence under each name and the empty state.
// English is the source language. `{vehicle}` is a vehicle's `noun` (common.vehicles) unless
// a comment says otherwise; feature names are the spec rows' labels.
import { z } from 'zod';

import {
  copy,
  copyByCount,
  copyHeading,
  copyPlural,
  copyTemplate,
  strongLead,
} from './site-copy-parts';

// One sentence under each name about the columns on screen. `noImmobilizer` and `noTracking*`
// are followed by a level's "Where it stops" text; `{features}` is a list (see `list`).
const standout = z.strictObject({
  // A system alone on screen: `{vehicle}` is its vehicle's noun.
  alone: copyTemplate(['vehicle']),
  addSecond: copy(),
  noImmobilizer: copy(),
  noTracking: copy(),
  noTrackingOptional: copy(),
  onlyOneWith: strongLead(['features']),
  // `<strong>Finds it</strong>` with GPS, or with GPS and 4G.
  findsIt: z.strictObject({ strong: copy(), gps: copy(), gpsAndLte: copy() }),
  stopsEngine: strongLead(),
  missing: copyTemplate(['features']),
  // `<strong>Same features</strong>` and one whole rest: as the one other system on screen
  // (`{name}`, its name) or as the others here, with or without the note that the parts differ
  // (`{toggle}` is `tools.installerDetails`). Whole sentences, because a name and "the others"
  // take different articles and prepositions in Greek and Italian.
  sameFeatures: z.strictObject({
    strong: copy(),
    asOne: copyTemplate(['name']),
    asOthers: copy(),
    partsDifferOne: copyTemplate(['name', 'toggle']),
    partsDifferOthers: copyTemplate(['toggle']),
  }),
});

// Nothing selected: the Finder's picks for the vehicle (two or three), or its only system.
const empty = z.strictObject({
  heading: copyHeading(),
  picks: copyByCount(['vehicle'], ['2', '3']),
  seed: copyByCount([], ['2', '3']),
  onlyOne: copyTemplate(['name', 'vehicle']),
  see: copyTemplate(['name']),
});

export const siteCopyCompareSchema = z.strictObject({
  heading: copyHeading(),
  // The vehicle row: a prompt before the vehicle tabs.
  vehiclePrompt: copy(),
  picker: z.strictObject({
    // `{max}` is the most systems the table takes.
    comparing: copyTemplate(['count', 'max']),
    choose: copyTemplate(['max', 'vehicle']),
    // The button that opens and closes the folded picker.
    change: copy(),
    done: copy(),
    // The accessible name of the system chips.
    poolLabel: copyTemplate(['vehicle']),
  }),
  suggestions: z.strictObject({ heading: copyHeading(), note: copy(), add: copy() }),
  table: z.strictObject({
    // The table's accessible name: `{names}` lists the systems.
    label: copyTemplate(['names']),
    // The visually hidden header of the feature column.
    feature: copy(),
    // The column actions; the system's name follows, visually hidden.
    open: copy(),
    remove: copy(),
    // The name bar's label once the names scroll away.
    barLabel: copy(),
    // "3 of 7 differ", per group and for the whole table.
    differ: copyPlural(['count', 'total']),
    identical: copy(),
    // Rows every system shares fold into one line per value, by the number of systems.
    allInclude: copyByCount([]),
    allOptional: copyByCount([]),
    noneHas: copyByCount([]),
    // The Control and Comfort fold.
    extraRows: copyPlural(['count']),
    extraDiffer: copyPlural(['count']),
    show: copy(),
    hide: copy(),
  }),
  tools: z.strictObject({ showAll: copyPlural(['count']), installerDetails: copy() }),
  // How a list of names reads: two, or the first two and how many more.
  list: z.strictObject({
    two: copyTemplate(['first', 'second']),
    more: copyPlural(['first', 'second', 'count']),
  }),
  standout,
  empty,
});
export type SiteCopyCompare = z.infer<typeof siteCopyCompareSchema>;
