// Pure checks of one integration folder. The walker (items.ts) reads the files; nothing here
// touches the disk.

import { hasCode, packageName, parseManifest, type Manifest } from '@ignitify-integrations/core';
import { err, ok, type Result } from '@ignitify-integrations/runtime';
import {
  DIST_DIR,
  DRAFT_FILE,
  DRAFT_VERSION,
  INSTALL_SCRIPTS,
  INTEGRATIONS_DIR,
  ITEM_LICENCES,
  PUBLISHED_FILES,
  README_SECTIONS,
  REPOSITORY_URL,
  RESERVED_NAMES,
  SHARED_PUBLISHED_FILES,
  SRC_DIR,
} from './constants.js';
import { ITEM_MESSAGES } from './messages.js';

/** Repo-relative folder of an integration. The one place this path is built. */
export const itemDir = (name: string): string => `${INTEGRATIONS_DIR}/${name}`;

/** The `repository` field of a published package in folder `dir` (npm provenance checks it). */
export const repositoryField = (dir: string): { type: 'git'; url: string; directory: string } => ({
  type: 'git',
  url: REPOSITORY_URL,
  directory: dir,
});

/** One integration folder as read from disk. */
export interface RawItem {
  /** Folder name. */
  readonly name: string;
  /** Repo-relative folder, POSIX separators: `integrations/telegram`. */
  readonly dir: string;
  /** Item-relative file paths, POSIX separators. */
  readonly files: readonly string[];
  readonly manifestText?: string;
  readonly packageJsonText?: string;
  readonly readmeText?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseJson = (text: string): Result<unknown> => {
  try {
    return ok(JSON.parse(text) as unknown);
  } catch (error) {
    return err(error instanceof Error ? error.message : String(error));
  }
};

/**
 * The one draft rule: a package marked `"private": true` is a draft. A draft passes the manifest
 * and README checks like any integration, skips the publish-only ones, and is never published.
 */
export const isDraft = (pkg: unknown): boolean => isRecord(pkg) && pkg['private'] === true;

/** Is this folder a draft? An unreadable package.json is not a draft (checkItem reports it). */
export const isDraftItem = (item: RawItem): boolean => {
  if (item.packageJsonText === undefined) return false;
  const parsed = parseJson(item.packageJsonText);
  return parsed.ok && isDraft(parsed.value);
};

/** The folder holds source code. Whether the integration HAS code is `core`'s `hasCode` (its `exports`). */
export const hasSource = (files: readonly string[]): boolean => files.some((file) => file.startsWith(SRC_DIR));

const parsedPackage = (item: RawItem): unknown => {
  const parsed = parseJson(item.packageJsonText ?? '');
  return parsed.ok ? parsed.value : undefined;
};

/**
 * The publish rules every published package follows (integrations, `core`, `runtime`): its npm
 * name, licence, metadata, provenance settings, shipped files, and no install scripts.
 */
const publishIssues = (
  dir: string,
  name: string,
  pkg: Record<string, unknown>,
  shipped: readonly string[],
  published: boolean,
): string[] => {
  const field = (key: string, want: string, good: boolean): string[] =>
    good ? [] : [ITEM_MESSAGES.packageField(dir, key, want)];
  const engines = pkg['engines'];
  const publish = pkg['publishConfig'];
  const files = pkg['files'];
  const scripts = isRecord(pkg['scripts']) ? pkg['scripts'] : {};
  const licence = pkg['license'];
  const description = pkg['description'];
  return [
    ...field('name', `"${name}"`, pkg['name'] === name),
    ...field(
      'license',
      `one of ${ITEM_LICENCES.join(', ')}`,
      typeof licence === 'string' && (ITEM_LICENCES as readonly string[]).includes(licence),
    ),
    ...field('description', 'a non-empty string', typeof description === 'string' && description !== ''),
    ...field('type', '"module"', pkg['type'] === 'module'),
    ...field('engines.node', 'set', isRecord(engines) && typeof engines['node'] === 'string' && engines['node'] !== ''),
    ...(published
      ? [
          ...field(
            'publishConfig',
            '{ access: "public", provenance: true }',
            isRecord(publish) && publish['access'] === 'public' && publish['provenance'] === true,
          ),
          ...field(
            'repository',
            JSON.stringify(repositoryField(dir)),
            isRecord(pkg['repository']) &&
              pkg['repository']['url'] === REPOSITORY_URL &&
              pkg['repository']['directory'] === dir,
          ),
        ]
      : []),
    ...field(
      'files',
      `a list that includes ${shipped.join(', ')}`,
      Array.isArray(files) && shipped.every((file) => files.includes(file)),
    ),
    ...INSTALL_SCRIPTS.filter((script) => Object.hasOwn(scripts, script)).map((script) =>
      ITEM_MESSAGES.installScript(dir, script),
    ),
  ];
};

/** An integration: the publish rules (a draft skips the publish-only ones) plus the draft rules. */
const packageIssues = (item: RawItem, manifest: Manifest, pkg: Record<string, unknown>): string[] => {
  const dir = item.dir;
  const draft = isDraft(pkg);
  const files = pkg['files'];
  const code = hasCode(pkg);
  const shipped = code ? [DIST_DIR, ...PUBLISHED_FILES] : [...PUBLISHED_FILES];
  return [
    ...publishIssues(dir, packageName(manifest.name), pkg, shipped, !draft),
    // Source with no exports would ship as settings only and escape the build-reference check.
    ...(hasSource(item.files) && !code ? [ITEM_MESSAGES.sourceWithoutExports(dir)] : []),
    ...(pkg['private'] === undefined || draft
      ? []
      : [ITEM_MESSAGES.packageField(dir, 'private', 'absent (a published integration) or true (a draft)')]),
    ...(draft && pkg['version'] !== DRAFT_VERSION
      ? [ITEM_MESSAGES.packageField(dir, 'version', `"${DRAFT_VERSION}" (a draft is never versioned)`)]
      : []),
    ...(draft && !item.files.includes(DRAFT_FILE) ? [ITEM_MESSAGES.noDraftChecklist(dir)] : []),
    ...(Array.isArray(files) && files.includes(DRAFT_FILE) ? [ITEM_MESSAGES.shipsDraftChecklist(dir)] : []),
  ];
};

const packageJsonIssues = (item: RawItem, manifest: Manifest): string[] => {
  if (item.packageJsonText === undefined) return [ITEM_MESSAGES.noPackageJson(item.dir)];
  const parsed = parseJson(item.packageJsonText);
  if (!parsed.ok) return [ITEM_MESSAGES.badPackageJson(item.dir, parsed.error)];
  return packageIssues(item, manifest, isRecord(parsed.value) ? parsed.value : {});
};

/** `# <name>` on the first line, then one line of text before any other heading (ADR-0001 §3.1). */
const titleIssues = (dir: string, name: string, lines: readonly string[]): string[] => {
  const [title, ...rest] = lines;
  const next = rest.find((line) => line !== '');
  return title === `# ${name}` && next !== undefined && !next.startsWith('#')
    ? []
    : [ITEM_MESSAGES.readmeTitle(dir, name)];
};

/** The title, then the required README sections, present and in order; extra sections may sit between them. */
const readmeIssues = (dir: string, name: string, text: string | undefined): string[] => {
  if (text === undefined) return [ITEM_MESSAGES.noReadme(dir)];
  const lines = text.split('\n').map((line) => line.trimEnd());
  const found = lines.filter((line) => line.startsWith('## '));
  const inOrder = found.filter((line) => (README_SECTIONS as readonly string[]).includes(line));
  return [
    ...titleIssues(dir, name, lines),
    ...(inOrder.join('\n') === README_SECTIONS.join('\n') ? [] : [ITEM_MESSAGES.readmeSections(dir)]),
  ];
};

export const checkItem = (item: RawItem): string[] => {
  const layout = [
    ...readmeIssues(item.dir, item.name, item.readmeText),
    ...((RESERVED_NAMES as readonly string[]).includes(item.name)
      ? [ITEM_MESSAGES.reservedName(item.dir, item.name)]
      : []),
  ];
  if (item.manifestText === undefined) return [ITEM_MESSAGES.noManifest(item.dir), ...layout];
  const parsed = parseManifest(item.manifestText);
  if (!parsed.ok) return [...parsed.error.map((issue) => ITEM_MESSAGES.manifest(item.dir, issue)), ...layout];
  const manifest = parsed.value;
  return [
    ...(manifest.name === item.name ? [] : [ITEM_MESSAGES.nameMismatch(item.dir, manifest.name)]),
    ...layout,
    ...packageJsonIssues(item, manifest),
  ];
};

/** Every integration's issues. Folder names are unique, and the name must equal the folder, so names are unique. */
export const checkItems = (items: readonly RawItem[]): string[] => items.flatMap(checkItem);

/** A shared package (`core`, `runtime`) follows the same publish rules as an integration. */
export const checkSharedPackage = (dir: string, packageJsonText: string | undefined): string[] => {
  if (packageJsonText === undefined) return [ITEM_MESSAGES.noPackageJson(dir)];
  const parsed = parseJson(packageJsonText);
  if (!parsed.ok) return [ITEM_MESSAGES.badPackageJson(dir, parsed.error)];
  const pkg = isRecord(parsed.value) ? parsed.value : {};
  return publishIssues(dir, packageName(dir), pkg, SHARED_PUBLISHED_FILES, true);
};

/**
 * Every integration with code must be in the root build list: `npm run build` (`tsc -b`) builds
 * only the referenced projects, and `files: ["dist"]` of an unbuilt one would publish no code.
 * An unreadable root tsconfig is an issue, never a skipped check.
 */
export const buildReferenceIssues = (items: readonly RawItem[], rootTsconfigText: string | undefined): string[] => {
  const parsed = parseJson(rootTsconfigText ?? '');
  if (!parsed.ok) return [ITEM_MESSAGES.badRootTsconfig(parsed.error)];
  const references = isRecord(parsed.value) ? parsed.value['references'] : undefined;
  if (!Array.isArray(references)) return [ITEM_MESSAGES.noRootReferences];
  const built = new Set(
    references.map((ref: unknown) =>
      isRecord(ref) && typeof ref['path'] === 'string' ? ref['path'].replace(/^\.\//, '') : '',
    ),
  );
  return items
    .filter((item) => hasCode(parsedPackage(item)) && !built.has(item.dir))
    .map((item) => ITEM_MESSAGES.notBuilt(item.dir));
};
