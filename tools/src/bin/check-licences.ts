// npm run check:licences — every linked dependency in the root lockfile against the allow-list.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { LOCKFILE } from '../constants.js';
import { REPO_ROOT } from '../items.js';
import { checkLicences } from '../licences.js';
import { CLI_MESSAGES } from '../messages.js';
import { finish } from './finish.js';

const lockfile: unknown = JSON.parse(await readFile(join(REPO_ROOT, LOCKFILE), 'utf8'));
finish(checkLicences(lockfile), CLI_MESSAGES.licencesOk);
