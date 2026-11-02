// The one walker every bin uses: list the folders under integrations/ and read what the pure
// checks need. The only module of tools/src (besides the bins) that touches the disk.

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MANIFEST_FILE } from '@ignitify-integrations/core';
import { itemDir, type RawItem } from './check-item.js';
import { INTEGRATIONS_DIR, PACKAGE_JSON, README_FILE, ROOT_TSCONFIG, SHARED_PACKAGES, SKIP_DIRS } from './constants.js';

/** Repo root, from this file's place (tools/src), so a bin works from any cwd. */
export const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException).code === 'ENOENT';

/** File text, or undefined when the file does not exist. Any other error is a real failure. */
const readOptional = async (path: string): Promise<string | undefined> => {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw error;
  }
};

const subdirs = async (path: string): Promise<string[]> => {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    if (isMissing(error)) return [];
    throw error;
  }
};

const listFiles = async (root: string, prefix = ''): Promise<string[]> => {
  const entries = await readdir(join(root, prefix), { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      if (!entry.isDirectory()) return [path];
      return (SKIP_DIRS as readonly string[]).includes(entry.name) ? [] : listFiles(root, path);
    }),
  );
  return nested.flat().sort();
};

export const readItems = async (repoRoot: string = REPO_ROOT): Promise<RawItem[]> => {
  const names = (await subdirs(join(repoRoot, INTEGRATIONS_DIR))).sort();
  return Promise.all(
    names.map(async (name): Promise<RawItem> => {
      const dir = itemDir(name);
      const abs = join(repoRoot, dir);
      const [files, manifestText, packageJsonText, readmeText] = await Promise.all([
        listFiles(abs),
        readOptional(join(abs, MANIFEST_FILE)),
        readOptional(join(abs, PACKAGE_JSON)),
        readOptional(join(abs, README_FILE)),
      ]);
      return { name, dir, files, manifestText, packageJsonText, readmeText };
    }),
  );
};

/** The root tsconfig.json text (the build list), or undefined when it is missing. */
export const readRootTsconfig = (repoRoot: string = REPO_ROOT): Promise<string | undefined> =>
  readOptional(join(repoRoot, ROOT_TSCONFIG));

/** The package.json text of each shared package (`runtime`, `core`), by folder. */
export const readSharedPackages = (
  repoRoot: string = REPO_ROOT,
): Promise<{ dir: string; text: string | undefined }[]> =>
  Promise.all(
    SHARED_PACKAGES.map(async (dir) => ({ dir, text: await readOptional(join(repoRoot, dir, PACKAGE_JSON)) })),
  );
