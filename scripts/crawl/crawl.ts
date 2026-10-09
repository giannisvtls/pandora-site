// Entry point of `npm run crawl` (tsx scripts/crawl/crawl.ts). See cli.ts for the options.
// The Node version is checked first; the crawler itself is loaded only on a supported Node.
import { nodeVersionProblem, UNSUPPORTED_NODE_EXIT_CODE } from './node-version';

const problem = nodeVersionProblem(process.versions.node);
if (problem === null) {
  const { runCli } = await import('./cli');
  process.exitCode = await runCli(process.argv.slice(2));
} else {
  process.stderr.write(problem);
  process.exitCode = UNSUPPORTED_NODE_EXIT_CODE;
}
