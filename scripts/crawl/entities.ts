// Character references in HTML text and attributes and in XML text. Covers numeric references,
// the five XML entities and the typographic ones WordPress emits; an unknown name is left as is.

const NAMED: Readonly<Record<string, number>> = {
  amp: 0x26,
  lt: 0x3c,
  gt: 0x3e,
  quot: 0x22,
  apos: 0x27,
  nbsp: 0xa0,
  laquo: 0xab,
  raquo: 0xbb,
  ndash: 0x20_13,
  mdash: 0x20_14,
  lsquo: 0x20_18,
  rsquo: 0x20_19,
  sbquo: 0x20_1a,
  ldquo: 0x20_1c,
  rdquo: 0x20_1d,
  bdquo: 0x20_1e,
  hellip: 0x20_26,
  middot: 0xb7,
  bull: 0x20_22,
  copy: 0xa9,
  reg: 0xae,
  trade: 0x21_22,
  euro: 0x20_ac,
};

const REFERENCE = /&(#\d{1,7}|#x[\da-f]{1,6}|[a-z][a-z\d]{1,31});/gi;

function decodeReference(match: string, body: string): string {
  if (body.startsWith('#')) {
    const isHex = body[1] === 'x' || body[1] === 'X';
    const codePoint = Number.parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
    return codePoint > 0 && codePoint <= 0x10_ff_ff ? String.fromCodePoint(codePoint) : match;
  }
  const codePoint = NAMED[body.toLowerCase()];
  return codePoint === undefined ? match : String.fromCodePoint(codePoint);
}

export function decodeEntities(text: string): string {
  return text.includes('&')
    ? text.replaceAll(REFERENCE, (match, body: string) => decodeReference(match, body))
    : text;
}
