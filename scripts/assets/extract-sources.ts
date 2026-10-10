// Entry point of `npm run media:sources` (tsx scripts/assets/extract-sources.ts). See
// extract-cli.ts for the options. The Node version is checked first; the extraction is loaded
// only on Node 24+.
import { nodeVersionProblem, UNSUPPORTED_NODE_EXIT_CODE } from '../crawl/node-version';

const problem = nodeVersionProblem(
  process.versions.node,
  'npm run media:sources',
  'nothing was written',
);
if (problem === null) {
  const { runExtractCli } = await import('./extract-cli');
  process.exitCode = await runExtractCli(process.argv.slice(2));
} else {
  process.stderr.write(problem);
  process.exitCode = UNSUPPORTED_NODE_EXIT_CODE;
}
