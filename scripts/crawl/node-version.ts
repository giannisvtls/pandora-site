// The crawler and the summary need Node 24 (Iterator helpers such as `.toArray()`). On an older
// Node the crawler would send its first requests and then crash, and the summary would fail as if
// CRAWL.md were out of sync, so crawl.ts and summary.ts check the version before loading anything.

export const MIN_NODE_MAJOR = 24;

// The exit code of an unsupported Node, the same as for bad arguments (EXIT_CODES.usage).
export const UNSUPPORTED_NODE_EXIT_CODE = 2;

// Why this Node cannot run `command` (`version` as in process.versions.node), or null.
export function nodeVersionProblem(
  version: string,
  command = 'npm run crawl',
  outcome = 'nothing was requested',
): string | null {
  const major = Number(version.split('.', 1)[0]);
  const isSupported = Number.isSafeInteger(major) && major >= MIN_NODE_MAJOR;
  return isSupported
    ? null
    : `${command} needs Node ${String(MIN_NODE_MAJOR)} or newer, this is Node ${version}; ${outcome}.\n`;
}
