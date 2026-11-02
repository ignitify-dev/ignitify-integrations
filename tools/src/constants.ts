// Repo layout and supply-chain rules the tools enforce. Store vocabulary lives in core.

import { MANIFEST_FILE } from '@ignitify-integrations/core';

export const PACKAGE_JSON = 'package.json';
export const README_FILE = 'README.md';
/** The root build list: `npm run build` (`tsc -b`) builds only the projects it references. */
export const ROOT_TSCONFIG = 'tsconfig.json';
export const LOCKFILE = 'package-lock.json';
/** The one folder rule: every integration lives in `integrations/<name>/`. */
export const INTEGRATIONS_DIR = 'integrations';

/** An integration with code has its source here; one without it is settings only. */
export const SRC_DIR = 'src/';
export const DIST_DIR = 'dist';
/** Build cache next to tsconfig.json, never inside dist, so it is not published. */
export const BUILD_INFO_FILE = '.tsbuildinfo';
/** Root files every published package must carry: Apache-2.0 requires the licence and NOTICE with each copy. */
export const LEGAL_FILES = ['LICENSE', 'NOTICE'] as const;
/** What every integration ships: its manifest, its README and the legal files (plus `dist` when it has code). */
export const PUBLISHED_FILES = [MANIFEST_FILE, README_FILE, ...LEGAL_FILES] as const;
/** Shared workspaces that publish but are not integrations. */
/** The run-time package every integration with code depends on. */
export const RUNTIME_DIR = 'runtime';
export const SHARED_PACKAGES = [RUNTIME_DIR, 'core'] as const;
/** What a shared package ships: its build, its README and the legal files. */
export const SHARED_PUBLISHED_FILES = [DIST_DIR, README_FILE, ...LEGAL_FILES] as const;
/** Names an integration may not take: every other workspace of this repo (their npm names are taken). */
export const RESERVED_NAMES = [...SHARED_PACKAGES, 'tools'] as const;

/** Folders the item walker never enters: installed or built files, not the item's source. */
export const SKIP_DIRS = ['node_modules', 'dist', 'coverage'] as const;

/** The README sections every integration has, in this order (GOVERNANCE rule 7). */
export const README_SECTIONS = ['## Add it', '## Use it', '## Grow your task', '## Limits'] as const;

/** Licences an integration's OWN code may carry. */
export const ITEM_LICENCES = ['Apache-2.0', 'MIT', 'MIT-0'] as const;

/**
 * Licences allowed for code LINKED into a published integration (its runtime dependency tree).
 * A tool an integration runs as a separate process (`system_packages`) is not linked.
 */
export const DEPENDENCY_LICENCES = [
  'Apache-2.0',
  'MIT',
  'MIT-0',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
] as const;

/** npm lifecycle scripts that run on install: a published package must have none (supply-chain rule). */
export const INSTALL_SCRIPTS = ['preinstall', 'install', 'postinstall', 'prepare'] as const;

/** Version every generated integration starts at: 0.x until the platform side proves it. */
export const NEW_ITEM_VERSION = '0.1.0';
export const NEW_ITEM_LICENCE = 'Apache-2.0';
export const NODE_ENGINE = '>=22';

/**
 * The public repo. npm provenance refuses a publish whose package.json `repository` does not name the
 * repo the CI run comes from, so every published package carries it (with its own folder).
 */
export const REPOSITORY_URL = 'git+https://github.com/ignitify-dev/ignitify-integrations.git';
/** `npm run new-item -- <name> --code` adds a src/ skeleton. */
export const CODE_FLAG = '--code';

/**
 * A draft is an integration kept in the repo but never published until it is upgraded: its
 * package.json has `"private": true` (changesets and npm skip private packages), its version
 * stays here, and it carries an upgrade checklist that is never in `files`.
 */
export const DRAFT_VERSION = '0.0.0';
export const DRAFT_FILE = 'TODO.md';
/** `npm run new-item -- <name> --draft` writes a draft. */
export const DRAFT_FLAG = '--draft';
