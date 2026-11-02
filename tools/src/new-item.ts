// The generator: every integration starts from the same skeleton, and that skeleton passes
// checkItem and parseManifest unchanged (tested), so a new integration is green before its first
// real line. Settings only by default; `--code` adds a src/ skeleton; `--draft` writes a draft
// (private, never published, with its upgrade checklist).

import { MANIFEST_FILE, NAME_PATTERN, packageName, SCHEMA_VERSION } from '@ignitify-integrations/core';
import { err, ok, type Result } from '@ignitify-integrations/runtime';
import {
  BUILD_INFO_FILE,
  CODE_FLAG,
  DIST_DIR,
  DRAFT_FILE,
  DRAFT_FLAG,
  DRAFT_VERSION,
  NEW_ITEM_LICENCE,
  NEW_ITEM_VERSION,
  NODE_ENGINE,
  PACKAGE_JSON,
  PUBLISHED_FILES,
  README_FILE,
  README_SECTIONS,
  RUNTIME_DIR,
} from './constants.js';
import { itemDir, repositoryField } from './check-item.js';
import { CLI_MESSAGES } from './messages.js';

export interface RenderedFile {
  /** Path relative to the integration folder. */
  readonly path: string;
  readonly content: string;
}

export interface NewItemArgs {
  readonly name: string;
  readonly code: boolean;
  readonly draft: boolean;
}

const FLAGS: readonly string[] = [CODE_FLAG, DRAFT_FLAG];

export const parseNewItemArgs = (args: readonly string[]): Result<NewItemArgs> => {
  const [name, ...flags] = args;
  const known = flags.every((flag) => FLAGS.includes(flag)) && new Set(flags).size === flags.length;
  if (name === undefined || !known) return err(CLI_MESSAGES.newItemUsage);
  if (!new RegExp(NAME_PATTERN).test(name)) return err(CLI_MESSAGES.badName(name, NAME_PATTERN));
  return ok({ name, code: flags.includes(CODE_FLAG), draft: flags.includes(DRAFT_FLAG) });
};

const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const manifest = (name: string): string =>
  [`schema_version: ${SCHEMA_VERSION}`, `name: ${name}`, 'runtimes: [node]', ''].join('\n');

const readme = (name: string): string =>
  [
    `# ${name}`,
    '',
    'TODO: one line on what this integration does for a task.',
    '',
    README_SECTIONS[0],
    '',
    `TODO: \`ignitify integration:add ${name} --task <slug>\`, the secrets to set, what "you add" means here.`,
    '',
    README_SECTIONS[1],
    '',
    'TODO: the smallest working task code.',
    '',
    README_SECTIONS[2],
    '',
    'TODO: options, patterns, integrations it combines with, guide chapters.',
    '',
    README_SECTIONS[3],
    '',
    'TODO: what it cannot do today, and why.',
    '',
  ].join('\n');

const packageJson = (name: string, code: boolean, draft: boolean, runtimeVersion: string): string =>
  json({
    name: packageName(name),
    version: draft ? DRAFT_VERSION : NEW_ITEM_VERSION,
    ...(draft ? { private: true } : {}),
    description: `TODO one line on what ${name} does for a task`,
    license: NEW_ITEM_LICENCE,
    type: 'module',
    engines: { node: NODE_ENGINE },
    ...(code ? { exports: { '.': { types: `./${DIST_DIR}/index.d.ts`, default: `./${DIST_DIR}/index.js` } } } : {}),
    files: code ? [DIST_DIR, ...PUBLISHED_FILES] : [...PUBLISHED_FILES],
    ...(code ? { scripts: { build: 'tsc -b' } } : {}),
    ...(code ? { dependencies: { [packageName(RUNTIME_DIR)]: `^${runtimeVersion}` } } : {}),
    ...(draft
      ? {}
      : { publishConfig: { access: 'public', provenance: true }, repository: repositoryField(itemDir(name)) }),
  });

/** The upgrade checklist of a draft. Never in `files`, so never published. */
export const renderTodo = (name: string): string =>
  [
    `# ${name}: upgrade checklist`,
    '',
    `This integration is a **draft**: it is in the repo but never published, and \`check:items\` skips its publish rules. Upgrade it when every box is ticked, then delete this file.`,
    '',
    '- [ ] **Value test.** What does the tenant no longer build or run? Settings only, or code? Candidate value: TODO.',
    '- [ ] **Hosts.** Check every host in `integration.yaml` against the vendor API docs. A host that varies per tenant goes in `network.egress_hint`.',
    '- [ ] **Secrets.** Check the secret names against the vendor auth docs.',
    '- [ ] **README.** Run the `Use it` example in a real task, and check the `Limits`.',
    '- [ ] **Tests.** Contract test plan: TODO.',
    `- [ ] **Owner.** A named owner for \`/integrations/${name}/\` in \`.github/CODEOWNERS\`.`,
    `- [ ] **Release.** Remove \`"private": true\`, add \`publishConfig\` and \`repository\` (run \`new-item\` without \`--draft\` to see them), set \`version\` to \`${NEW_ITEM_VERSION}\` (the first publish is by hand), and delete this file.`,
    '',
  ].join('\n');

const codeFiles = (name: string): RenderedFile[] => [
  {
    path: 'tsconfig.json',
    content: json({
      extends: '../../tsconfig.base.json',
      compilerOptions: { rootDir: 'src', outDir: DIST_DIR, tsBuildInfoFile: BUILD_INFO_FILE },
      include: ['src'],
      references: [{ path: `../../${RUNTIME_DIR}` }],
    }),
  },
  {
    path: 'src/index.ts',
    content: ['// TODO: replace with the integration API.', `export const name = (): string => '${name}';`, ''].join(
      '\n',
    ),
  },
  {
    path: 'test/index.test.ts',
    content: [
      "import { expect, it } from 'vitest';",
      "import { name } from '../src/index.js';",
      '',
      "it('TODO: test the integration decisions', () => {",
      `  expect(name()).toBe('${name}');`,
      '});',
      '',
    ].join('\n'),
  },
];

/**
 * Every file of a new integration, paths relative to its folder. `runtimeVersion` is the version of
 * the runtime package in this repo; an integration with code depends on `^runtimeVersion`.
 */
export const renderItem = ({ name, code, draft }: NewItemArgs, runtimeVersion: string): RenderedFile[] => [
  { path: MANIFEST_FILE, content: manifest(name) },
  { path: README_FILE, content: readme(name) },
  { path: PACKAGE_JSON, content: packageJson(name, code, draft, runtimeVersion) },
  ...(draft ? [{ path: DRAFT_FILE, content: renderTodo(name) }] : []),
  ...(code ? codeFiles(name) : []),
];
