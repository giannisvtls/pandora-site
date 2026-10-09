// The crawler needs Node 24 (Iterator helpers such as `.toArray()`). On an older Node it would
// send its first requests and then crash, so crawl.ts checks the version before loading anything.

export const MIN_NODE_MAJOR = 24;

// The exit code of an unsupported Node, the same as for bad arguments (EXIT_CODES.usage).
export const UNSUPPORTED_NODE_EXIT_CODE = 2;

// Why this Node cannot run the crawl (`version` as in process.versions.node), or null.
export function nodeVersionProblem(version: string): string | null {
  const major = Number(version.split('.', 1)[0]);
  const isSupported = Number.isSafeInteger(major) && major >= MIN_NODE_MAJOR;
  return isSupported
    ? null
    : `npm run crawl needs Node ${String(MIN_NODE_MAJOR)} or newer, this is Node ${version}; nothing was requested.\n`;
}
