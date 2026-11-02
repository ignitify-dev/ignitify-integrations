import { describe, expect, it } from 'vitest';
import {
  buildReferenceIssues,
  checkItem,
  checkSharedPackage,
  hasCode,
  isDraft,
  isDraftItem,
  repositoryField,
  type RawItem,
} from '../src/check-item.js';
import { DRAFT_FILE, PUBLISHED_FILES, README_SECTIONS, SHARED_PUBLISHED_FILES } from '../src/constants.js';

const readme = (name: string): string =>
  [`# ${name}`, '', 'One line.', ...README_SECTIONS.flatMap((s) => ['', s, '', 'text'])].join('\n');
const README = readme('s3-storage');

const MANIFEST = (name: string): string => `schema_version: 1\nname: ${name}\nruntimes: [node]\n`;

const PACKAGE = {
  name: '@ignitify-integrations/s3-storage',
  version: '0.1.0',
  description: 'test',
  license: 'Apache-2.0',
  type: 'module',
  engines: { node: '>=22' },
  files: ['dist', ...PUBLISHED_FILES],
  publishConfig: { access: 'public', provenance: true },
  repository: repositoryField('integrations/s3-storage'),
};

const item = (pkg: object, extra: Partial<RawItem> = {}): RawItem => ({
  name: 's3-storage',
  dir: 'integrations/s3-storage',
  files: ['README.md', 'integration.yaml', 'package.json', 'src/index.ts'],
  manifestText: MANIFEST('s3-storage'),
  packageJsonText: JSON.stringify(pkg),
  readmeText: README,
  ...extra,
});

const settingsOnly = (): RawItem =>
  item(
    {
      ...PACKAGE,
      name: '@ignitify-integrations/telegram',
      files: [...PUBLISHED_FILES],
      repository: repositoryField('integrations/telegram'),
    },
    {
      name: 'telegram',
      dir: 'integrations/telegram',
      files: ['README.md', 'integration.yaml', 'package.json'],
      manifestText: MANIFEST('telegram'),
      readmeText: readme('telegram'),
    },
  );

describe('checkItem', () => {
  it('a published package names this repo and its own folder; a draft does not need it', () => {
    const want = `integrations/s3-storage/package.json: repository must be ${JSON.stringify(repositoryField('integrations/s3-storage'))}`;
    expect(checkItem(item({ ...PACKAGE, repository: undefined }))).toEqual([want]);
    expect(checkItem(item({ ...PACKAGE, repository: repositoryField('integrations/other') }))).toEqual([want]);
  });

  it('needs the README sections, each once, in order; other sections may sit between them', () => {
    const want = `integrations/s3-storage/README.md: needs the sections ${README_SECTIONS.join(', ')}, each once, in this order`;
    expect(checkItem(item(PACKAGE, { readmeText: undefined }))).toEqual([
      'integrations/s3-storage: README.md is missing',
    ]);
    expect(checkItem(item(PACKAGE, { readmeText: README.replace('## Grow your task', '## Examples') }))).toEqual([
      want,
    ]);
    expect(
      checkItem(
        item(PACKAGE, {
          readmeText: README.replace('## Add it', '## Tmp').replace('## Limits', '## Add it') + '\n## Limits',
        }),
      ),
    ).toEqual([want]);
    expect(checkItem(item(PACKAGE, { readmeText: README.replace('## Use it', '## Providers\n\n## Use it') }))).toEqual(
      [],
    );
  });

  it('needs the title "# <name>", then one line of text, before the sections', () => {
    const want =
      'integrations/s3-storage/README.md: must start with the title "# s3-storage", then one line on what it does for a task';
    expect(checkItem(item(PACKAGE, { readmeText: README.replace('# s3-storage', '# S3 storage') }))).toEqual([want]);
    expect(checkItem(item(PACKAGE, { readmeText: `\n${README}` }))).toEqual([want]);
    expect(checkItem(item(PACKAGE, { readmeText: README.replace('One line.', '') }))).toEqual([want]);
    expect(checkItem(item(PACKAGE, { readmeText: README.replace('One line.', '### Intro') }))).toEqual([want]);
  });

  it('passes an integration with code and a settings-only one', () => {
    expect(checkItem(item(PACKAGE))).toEqual([]);
    expect(checkItem(settingsOnly())).toEqual([]);
  });

  it('needs dist in files only when the integration has code', () => {
    expect(hasCode(['src/index.ts'])).toBe(true);
    expect(hasCode(['README.md'])).toBe(false);
    expect(checkItem(item({ ...PACKAGE, files: [...PUBLISHED_FILES] }))).toEqual([
      `integrations/s3-storage/package.json: files must be a list that includes dist, ${PUBLISHED_FILES.join(', ')}`,
    ]);
  });

  it('needs the folder name to equal the manifest name, and refuses a shared package name', () => {
    expect(
      checkItem(
        item(
          { ...PACKAGE, repository: repositoryField('integrations/s3') },
          { name: 's3', dir: 'integrations/s3', readmeText: readme('s3') },
        ),
      ),
    ).toEqual(['integrations/s3: folder name must equal the manifest name "s3-storage"']);
    expect(
      checkItem(item(PACKAGE, { name: 'core', dir: 'integrations/core', manifestText: MANIFEST('core') })),
    ).toContain('integrations/core: "core" is the name of a shared package');
  });

  it('needs a README and a manifest that parses (path-prefixed)', () => {
    expect(checkItem(item(PACKAGE, { files: ['src/index.ts'], readmeText: undefined }))).toContain(
      'integrations/s3-storage: README.md is missing',
    );
    expect(checkItem(item(PACKAGE, { manifestText: undefined }))[0]).toBe(
      'integrations/s3-storage: integration.yaml is missing',
    );
    expect(checkItem(item(PACKAGE, { manifestText: 'name: [' }))[0]).toMatch(
      /^integrations\/s3-storage\/integration\.yaml: not valid YAML/,
    );
  });

  it('checks every publish rule of a package.json', () => {
    const issues = checkItem(
      item({
        name: 'wrong',
        private: 'yes',
        license: 'GPL-3.0',
        files: ['src'],
        scripts: { build: 'tsc', postinstall: 'curl evil', prepare: 'x' },
      }),
    );
    expect(issues).toEqual([
      'integrations/s3-storage/package.json: name must be "@ignitify-integrations/s3-storage"',
      'integrations/s3-storage/package.json: license must be one of Apache-2.0, MIT, MIT-0',
      'integrations/s3-storage/package.json: description must be a non-empty string',
      'integrations/s3-storage/package.json: type must be "module"',
      'integrations/s3-storage/package.json: engines.node must be set',
      'integrations/s3-storage/package.json: publishConfig must be { access: "public", provenance: true }',
      `integrations/s3-storage/package.json: repository must be ${JSON.stringify(repositoryField('integrations/s3-storage'))}`,
      `integrations/s3-storage/package.json: files must be a list that includes dist, ${PUBLISHED_FILES.join(', ')}`,
      'integrations/s3-storage/package.json: scripts.postinstall runs on install; a published package must have no install scripts',
      'integrations/s3-storage/package.json: scripts.prepare runs on install; a published package must have no install scripts',
      'integrations/s3-storage/package.json: private must be absent (a published integration) or true (a draft)',
    ]);
  });

  it('reports a missing or broken package.json', () => {
    expect(checkItem(item(PACKAGE, { packageJsonText: undefined }))[0]).toContain('package.json is missing');
    expect(checkItem(item(PACKAGE, { packageJsonText: '{' }))[0]).toContain('not valid JSON');
  });
});

describe('drafts', () => {
  const { publishConfig: _publishConfig, ...unpublished } = PACKAGE;
  const DRAFT = {
    ...unpublished,
    name: '@ignitify-integrations/telegram',
    version: '0.0.0',
    private: true,
    files: [...PUBLISHED_FILES],
  };
  const draft = (
    pkg: object = DRAFT,
    files: string[] = ['README.md', DRAFT_FILE, 'integration.yaml', 'package.json'],
  ): RawItem => ({
    ...settingsOnly(),
    files,
    packageJsonText: JSON.stringify(pkg),
  });

  it('a package is a draft only when private is exactly true', () => {
    expect(isDraft({ private: true })).toBe(true);
    expect([{ private: 'true' }, { private: false }, {}, null, []].some(isDraft)).toBe(false);
    expect(isDraftItem(draft())).toBe(true);
    expect(isDraftItem(settingsOnly())).toBe(false);
    expect(isDraftItem({ ...draft(), packageJsonText: '{' })).toBe(false);
    expect(isDraftItem({ ...draft(), packageJsonText: undefined })).toBe(false);
  });

  it('passes a draft with no publishConfig, version 0.0.0 and its checklist', () => {
    expect(checkItem(draft())).toEqual([]);
  });

  it('a draft needs its checklist and version 0.0.0, and still passes the manifest and README checks', () => {
    expect(checkItem(draft({ ...DRAFT, version: '0.1.0' }, ['README.md', 'integration.yaml', 'package.json']))).toEqual(
      [
        'integrations/telegram/package.json: version must be "0.0.0" (a draft is never versioned)',
        'integrations/telegram: TODO.md is missing (a draft carries its upgrade checklist)',
      ],
    );
    const readmeOnlyTitle = checkItem({ ...draft(), readmeText: '# telegram' });
    expect(readmeOnlyTitle).toHaveLength(2); // no one-line description, no sections
    expect(readmeOnlyTitle.every((issue) => issue.includes('README.md'))).toBe(true);
    expect(checkItem({ ...draft(), manifestText: 'name: telegram' })[0]).toMatch(/integration\.yaml/);
  });

  it('no package ships the checklist', () => {
    const want =
      'integrations/telegram/package.json: files must not include TODO.md (the upgrade checklist is never published)';
    expect(checkItem(draft({ ...DRAFT, files: [...PUBLISHED_FILES, DRAFT_FILE] }))).toEqual([want]);
    const published = {
      ...PACKAGE,
      name: '@ignitify-integrations/telegram',
      files: [...PUBLISHED_FILES, DRAFT_FILE],
      repository: repositoryField('integrations/telegram'),
    };
    expect(checkItem({ ...settingsOnly(), packageJsonText: JSON.stringify(published) })).toEqual([want]);
  });
});

describe('buildReferenceIssues', () => {
  const tsconfig = (paths: readonly string[]): string =>
    JSON.stringify({ files: [], references: paths.map((path) => ({ path })) });

  it('refuses an integration with code that the root build list does not reference', () => {
    expect(buildReferenceIssues([item(PACKAGE)], tsconfig(['runtime', 'integrations/s3-storage']))).toEqual([]);
    expect(buildReferenceIssues([item(PACKAGE)], tsconfig(['./integrations/s3-storage']))).toEqual([]);
    expect(buildReferenceIssues([item(PACKAGE)], tsconfig(['runtime']))).toEqual([
      'integrations/s3-storage: has src/ but is not in the root tsconfig.json references, so `npm run build` would publish it without dist',
    ]);
  });

  it('needs no reference for a settings-only integration', () => {
    expect(buildReferenceIssues([settingsOnly()], tsconfig([]))).toEqual([]);
  });

  it('reports an unreadable root tsconfig instead of skipping the check', () => {
    expect(buildReferenceIssues([item(PACKAGE)], undefined)[0]).toMatch(/^tsconfig\.json: cannot read its references/);
    expect(buildReferenceIssues([item(PACKAGE)], '{ "files": [] }')).toEqual(['tsconfig.json: has no references list']);
  });
});

describe('checkSharedPackage', () => {
  const CORE = {
    name: '@ignitify-integrations/core',
    version: '0.1.0',
    description: 'test',
    license: 'Apache-2.0',
    type: 'module',
    engines: { node: '>=22' },
    files: [...SHARED_PUBLISHED_FILES],
    publishConfig: { access: 'public', provenance: true },
    repository: repositoryField('core'),
  };

  it('accepts a shared package that follows the publish rules', () => {
    expect(checkSharedPackage('core', JSON.stringify(CORE))).toEqual([]);
  });

  it('applies the same publish rules as an integration', () => {
    const issues = checkSharedPackage(
      'core',
      JSON.stringify({ ...CORE, files: ['dist'], repository: undefined, scripts: { postinstall: 'x' } }),
    );
    expect(issues).toHaveLength(3);
    expect(issues.some((issue) => issue.startsWith('core/package.json: files must be'))).toBe(true);
    expect(issues.some((issue) => issue.startsWith('core/package.json: repository must be'))).toBe(true);
    expect(issues.some((issue) => issue.includes('scripts.postinstall runs on install'))).toBe(true);
  });

  it('reports a missing or broken package.json', () => {
    expect(checkSharedPackage('core', undefined)).toEqual([
      'core: package.json is missing (an integration is an npm package)',
    ]);
    expect(checkSharedPackage('core', '{')[0]).toMatch(/^core\/package\.json: not valid JSON/);
  });
});
