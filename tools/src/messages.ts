import { MANIFEST_FILE } from '@ignitify-integrations/core';
import { DRAFT_FILE, PACKAGE_JSON, README_FILE, README_SECTIONS, ROOT_TSCONFIG } from './constants.js';

// Every message the tools print, grouped by concern.

export const ITEM_MESSAGES = {
  noManifest: (dir: string) => `${dir}: ${MANIFEST_FILE} is missing`,
  manifest: (dir: string, issue: string) => `${dir}/${MANIFEST_FILE}: ${issue}`,
  nameMismatch: (dir: string, name: string) => `${dir}: folder name must equal the manifest name "${name}"`,
  reservedName: (dir: string, name: string) => `${dir}: "${name}" is the name of a shared package`,
  noReadme: (dir: string) => `${dir}: ${README_FILE} is missing`,
  readmeTitle: (dir: string, name: string) =>
    `${dir}/${README_FILE}: must start with the title "# ${name}", then one line on what it does for a task`,
  readmeSections: (dir: string) =>
    `${dir}/${README_FILE}: needs the sections ${README_SECTIONS.join(', ')}, each once, in this order`,
  noPackageJson: (dir: string) => `${dir}: ${PACKAGE_JSON} is missing (an integration is an npm package)`,
  badPackageJson: (dir: string, reason: string) => `${dir}/${PACKAGE_JSON}: not valid JSON (${reason})`,
  packageField: (dir: string, field: string, want: string) => `${dir}/${PACKAGE_JSON}: ${field} must be ${want}`,
  noDraftChecklist: (dir: string) => `${dir}: ${DRAFT_FILE} is missing (a draft carries its upgrade checklist)`,
  shipsDraftChecklist: (dir: string) =>
    `${dir}/${PACKAGE_JSON}: files must not include ${DRAFT_FILE} (the upgrade checklist is never published)`,
  installScript: (dir: string, script: string) =>
    `${dir}/${PACKAGE_JSON}: scripts.${script} runs on install; a published package must have no install scripts`,
  notBuilt: (dir: string) =>
    `${dir}: has src/ but is not in the root ${ROOT_TSCONFIG} references, so \`npm run build\` would publish it without dist`,
  badRootTsconfig: (reason: string) => `${ROOT_TSCONFIG}: cannot read its references (${reason})`,
  noRootReferences: `${ROOT_TSCONFIG}: has no references list`,
} as const;

export const LICENCE_MESSAGES = {
  noPackages: 'package-lock.json has no "packages" map: regenerate it with npm >= 7 (lockfile v2 or v3)',
  missing: (key: string) => `${key}: no licence in package-lock.json`,
  unparsable: (key: string, licence: string) => `${key}: cannot read the licence expression "${licence}"`,
  notAllowed: (key: string, licence: string) => `${key}: licence "${licence}" is not on the allow-list`,
} as const;

export const CLI_MESSAGES = {
  issues: (count: number) => `${count} issue(s):`,
  itemsOk: (count: number, drafts: number) => `${count} integration(s) OK, ${drafts} of them draft(s)`,
  legalCopied: (dirs: readonly string[]) => `LICENSE and NOTICE copied into: ${dirs.join(', ')}`,
  licencesOk: 'every linked dependency licence is on the allow-list',
  newItemUsage: 'usage: npm run new-item -- <name> [--code] [--draft]',
  badName: (name: string, pattern: string) => `name "${name}" must match ${pattern}`,
  exists: (dir: string) => `${dir} already exists: refusing to overwrite it`,
  created: (dir: string, code: boolean, draft: boolean) =>
    `created ${dir}. Next: fill in integration.yaml and README.md${
      code ? ', add the folder to the root tsconfig.json references' : ''
    }${draft ? ', write the upgrade checklist in TODO.md' : ''}, run npm install, then npm run check`,
} as const;
