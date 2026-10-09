// Entry point of `npm run media:fetch` (tsx scripts/assets/fetch-media.ts). See fetch-cli.ts for
// the options. The Node version is checked first; the tool is loaded only on Node 24+, so an
// older Node sends no request.
import { nodeVersionProblem, UNSUPPORTED_NODE_EXIT_CODE } from '../crawl/node-version';

const problem = nodeVersionProblem(process.versions.node, 'npm run media:fetch');
if (problem === null) {
  const { runCli } = await import('./fetch-cli');
  process.exitCode = await runCli(process.argv.slice(2));
} else {
  process.stderr.write(problem);
  process.exitCode = UNSUPPORTED_NODE_EXIT_CODE;
}
