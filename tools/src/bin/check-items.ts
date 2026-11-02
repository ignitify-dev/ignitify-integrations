// npm run check:items — every integration folder, the root build list and the shared packages against the store rules.

import { buildReferenceIssues, checkItems, checkSharedPackage, isDraftItem } from '../check-item.js';
import { readItems, readRootTsconfig, readSharedPackages } from '../items.js';
import { CLI_MESSAGES } from '../messages.js';
import { finish } from './finish.js';

const [items, rootTsconfig, shared] = await Promise.all([readItems(), readRootTsconfig(), readSharedPackages()]);
finish(
  [
    ...checkItems(items),
    ...buildReferenceIssues(items, rootTsconfig),
    ...shared.flatMap((pkg) => checkSharedPackage(pkg.dir, pkg.text)),
  ],
  CLI_MESSAGES.itemsOk(items.length, items.filter(isDraftItem).length),
);
