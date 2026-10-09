// Entry point of `npm run crawl:summary` (tsx scripts/crawl/summary.ts): writes redirects/CRAWL.md
// from redirects/crawl.json, or with --check verifies it. See summary-cli.ts.
import { runSummaryCli } from './summary-cli';

process.exitCode = await runSummaryCli(process.argv.slice(2));
