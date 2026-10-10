# Content snapshot provenance

`npm run snapshot:convert` (`scripts/snapshot/`) converted the prototype's data file into
this folder once (decision P1-10). This folder is now the source of truth: content edits go into
these files directly, never through the converter.

- Source: `nightwatch-data.js`
- SHA-256: `bb9b14d7c490d1e58c4b3ec254550d1bdda1ce36b97869709822cef67c760d85`
- Converted: 2026-10-09

The converter wrote every collection file, `finder.json` and `src/content/hues.ts`. Not
converted from the data file:

- the Site copy files (`site-copy-*.json`) and `languages.json`, transcribed from the
  prototype page, except the new English the prototype has no text for (decision A6): the 404
  copy (`site-copy-not-found.json`, its `name` for the page title included) and the skip link
  (`skipLink` in `site-copy-common.json`);
- the nav section labels, transcribed from the prototype page's header (`NAV_SECTIONS` in
  `scripts/snapshot/convert-data.ts`);
- the media alt text no pattern gives, written after viewing each image (`ALT_BY_MEDIA` in
  `scripts/snapshot/alt-text.ts`);
- the media files and their sources, from `src/assets/media/manifest.json`.
