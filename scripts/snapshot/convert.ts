// Entry point of `npm run snapshot:convert` (tsx scripts/snapshot/convert.ts). See
// convert-cli.ts for the options. The Node version is checked first; the converter is loaded only
// on Node 24+.
import { nodeVersionProblem, UNSUPPORTED_NODE_EXIT_CODE } from '../crawl/node-version';

const problem = nodeVersionProblem(
  process.versions.node,
  'npm run snapshot:convert',
  'nothing was written',
);
if (problem === null) {
  const { runConvertCli } = await import('./convert-cli');
  process.exitCode = await runConvertCli(process.argv.slice(2));
} else {
  process.stderr.write(problem);
  process.exitCode = UNSUPPORTED_NODE_EXIT_CODE;
}
