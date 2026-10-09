// Entry point of `npm run crawl` (tsx scripts/crawl/crawl.ts). See cli.ts for the options.
import { runCli } from './cli';

process.exitCode = await runCli(process.argv.slice(2));
