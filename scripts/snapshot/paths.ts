// Where the snapshot tools read and write, relative to the repository root.
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

export const PROVENANCE_FILE = 'content-snapshot/PROVENANCE.md';
export const HUES_FILE = 'src/content/hues.ts';
