// Entry point of `npm run crawl:summary` (tsx scripts/crawl/summary.ts): writes redirects/CRAWL.md
// from redirects/crawl.json, or with --check verifies it. See summary-cli.ts. The Node version is
// checked first, as in crawl.ts.
import { nodeVersionProblem, UNSUPPORTED_NODE_EXIT_CODE } from './node-version';

const problem = nodeVersionProblem(
  process.versions.node,
  'npm run crawl:summary',
  'nothing was read or written',
);
if (problem === null) {
  const { runSummaryCli } = await import('./summary-cli');
  process.exitCode = await runSummaryCli(process.argv.slice(2));
} else {
  process.stderr.write(problem);
  process.exitCode = UNSUPPORTED_NODE_EXIT_CODE;
}
