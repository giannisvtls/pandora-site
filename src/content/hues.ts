// Product hues (A7: they stay in code): the primary and secondary colour of each system in the
// light and the dark theme (the prototype's `--hue-l`, `--hue-l2`, `--hue-d` and `--hue-d2`), by
// product id. A system without an entry has none. Converted once from the prototype data by
// `npm run snapshot:convert` (content-snapshot/PROVENANCE.md); edit this file directly now.
export interface ProductHue {
  readonly light: readonly [string, string];
  readonly dark: readonly [string, string];
}

export const PRODUCT_HUES: Readonly<Record<string, ProductHue>> = {
  elite: { light: ['#018BC9', '#012C55'], dark: ['#34BFFE', '#0382FC'] },
  professional: { light: ['#0078A8', '#485667'], dark: ['#33C5FF', '#697D96'] },
  smartpro: { light: ['#018BC9', '#065D87'], dark: ['#34BFFE', '#0BA8F4'] },
  smart: { light: ['#14A0A3', '#066066'], dark: ['#49E5E9', '#0EE3F1'] },
  lightpro: { light: ['#94BED7', '#007CAF'], dark: ['#94BED7', '#00B5FF'] },
  light: { light: ['#A1CFE6', '#007F98'], dark: ['#A1CFE6', '#00D5FF'] },
  primo: { light: ['#BDCAD2', '#217285'], dark: ['#BDCAD2', '#33AFCC'] },
  immo: { light: ['#ADA7CE', '#7E75AC'], dark: ['#ADA7CE', '#7E75AC'] },
  motoevo: { light: ['#0890CE', '#00365A'], dark: ['#3BBCF7', '#0099FF'] },
  motov2: { light: ['#F8A075', '#F37043'], dark: ['#F8A075', '#F37043'] },
  camperpro: { light: ['#0078A8', '#485667'], dark: ['#33C5FF', '#697D96'] },
  finder: { light: ['#98CDCE', '#6DB8BA'], dark: ['#98CDCE', '#6DB8BA'] },
};
