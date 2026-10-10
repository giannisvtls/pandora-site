// Entry point of `npm run check:pricelist` (tsx scripts/check-pricelist.ts): checks the committed
// snapshot against PRICELIST 2026 (scripts/pricelist/check.ts) and prints the clean line (exit
// 0) or every problem (exit 1). Reads files only. The Node version is checked first.
import { nodeVersionProblem, UNSUPPORTED_NODE_EXIT_CODE } from './crawl/node-version';

const problem = nodeVersionProblem(
  process.versions.node,
  'npm run check:pricelist',
  'nothing was checked',
);
if (problem === null) {
  const { runCheckPricelist } = await import('./pricelist/check');
  process.exitCode = await runCheckPricelist();
} else {
  process.stderr.write(problem);
  process.exitCode = UNSUPPORTED_NODE_EXIT_CODE;
}
