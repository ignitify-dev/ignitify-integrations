// npm run copy-legal — before publishing, copy LICENSE and NOTICE from the repo root into every
// published workspace: npm packs only a workspace's own folder, and Apache-2.0 needs both in each copy.
// A draft is never published, so it gets no copy.

import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isDraftItem } from '../check-item.js';
import { LEGAL_FILES, SHARED_PACKAGES } from '../constants.js';
import { readItems, REPO_ROOT } from '../items.js';
import { CLI_MESSAGES } from '../messages.js';

const dirs = [...SHARED_PACKAGES, ...(await readItems()).filter((item) => !isDraftItem(item)).map((item) => item.dir)];
await Promise.all(
  dirs.flatMap((dir) => LEGAL_FILES.map((file) => copyFile(join(REPO_ROOT, file), join(REPO_ROOT, dir, file)))),
);
console.log(CLI_MESSAGES.legalCopied(dirs));
