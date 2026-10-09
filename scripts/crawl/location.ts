// The Location header of a redirect response, turned back into the URL the server sent.
import { Buffer } from 'node:buffer';

const UTF8 = new TextDecoder('utf-8', { fatal: true });

function percentEncodeHighBytes(location: string): string {
  return location.replaceAll(
    /[^\p{ASCII}]/gu,
    (char) => `%${(char.codePointAt(0) ?? 0).toString(16).toUpperCase()}`,
  );
}

// fetch exposes header bytes as Latin-1, one character per byte. A Location that is valid UTF-8
// (raw UTF-8 bytes, as some servers send) is decoded back to text. Any other high byte (a genuine
// Latin-1 header, or UTF-8 mixed with a stray byte) stays that byte, percent-encoded, so the URL
// followed is the one the server sent; passing it on raw would re-encode 0xE9 as UTF-8 %C3%A9.
export function repairLocation(location: string): string {
  const hasHighBytes = /[^\p{ASCII}]/u.test(location);
  const isByteString = Buffer.from(location, 'latin1').toString('latin1') === location;
  if (!hasHighBytes || !isByteString) {
    return location;
  }
  try {
    return UTF8.decode(Buffer.from(location, 'latin1'));
  } catch {
    return percentEncodeHighBytes(location);
  }
}
