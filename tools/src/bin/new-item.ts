// npm run new-item -- <name> [--code] [--draft] — write a new integration skeleton; never overwrites a folder.

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { itemDir } from '../check-item.js';
import { PACKAGE_JSON, RUNTIME_DIR } from '../constants.js';
import { REPO_ROOT } from '../items.js';
import { CLI_MESSAGES } from '../messages.js';
import { parseNewItemArgs, renderItem } from '../new-item.js';
import { finish } from './finish.js';

const exists = async (path: string): Promise<boolean> =>
  stat(path).then(
    () => true,
    () => false,
  );

const args = parseNewItemArgs(process.argv.slice(2));
if (!args.ok) {
  finish([args.error], '');
} else {
  const dir = itemDir(args.value.name);
  const abs = join(REPO_ROOT, dir);
  if (await exists(abs)) {
    finish([CLI_MESSAGES.exists(dir)], '');
  } else {
    const runtime = JSON.parse(await readFile(join(REPO_ROOT, RUNTIME_DIR, PACKAGE_JSON), 'utf8')) as {
      version: string;
    };
    for (const file of renderItem(args.value, runtime.version)) {
      await mkdir(dirname(join(abs, file.path)), { recursive: true });
      await writeFile(join(abs, file.path), file.content, { flag: 'wx' });
    }
    finish([], CLI_MESSAGES.created(dir, args.value.code, args.value.draft));
  }
}
