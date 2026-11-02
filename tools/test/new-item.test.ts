import { describe, expect, it } from 'vitest';
import { MANIFEST_FILE, parseManifest } from '@ignitify-integrations/core';
import { checkItem, isDraftItem, itemDir } from '../src/check-item.js';
import { DRAFT_FILE } from '../src/constants.js';
import { parseNewItemArgs, renderItem } from '../src/new-item.js';

describe('renderItem', () => {
  it.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])('renders an integration (code: %s, draft: %s) that passes parseManifest and checkItem', (code, draft) => {
    const files = renderItem({ name: 'acme-thing', code, draft }, '0.1.0');
    const text = (path: string) => files.find((file) => file.path === path)?.content;
    const manifest = parseManifest(text(MANIFEST_FILE) ?? '');
    expect(manifest.ok ? [] : manifest.error).toEqual([]);
    const raw = {
      name: 'acme-thing',
      dir: itemDir('acme-thing'),
      files: files.map((file) => file.path),
      manifestText: text(MANIFEST_FILE),
      packageJsonText: text('package.json'),
      readmeText: text('README.md'),
    };
    expect(checkItem(raw)).toEqual([]);
    expect(files.some((file) => file.path.startsWith('src/'))).toBe(code);
    expect(isDraftItem(raw)).toBe(draft);
    expect(files.some((file) => file.path === DRAFT_FILE)).toBe(draft);
    if (code) {
      expect(JSON.parse(text('package.json') ?? '{}').dependencies).toEqual({
        '@ignitify-integrations/runtime': '^0.1.0',
      });
      expect(JSON.parse(text('tsconfig.json') ?? '{}').references).toEqual([{ path: '../../runtime' }]);
    }
  });
});

describe('parseNewItemArgs', () => {
  it('accepts a name, with --code and --draft in any order', () => {
    expect(parseNewItemArgs(['ocr'])).toEqual({ ok: true, value: { name: 'ocr', code: false, draft: false } });
    expect(parseNewItemArgs(['ocr', '--code'])).toEqual({ ok: true, value: { name: 'ocr', code: true, draft: false } });
    expect(parseNewItemArgs(['ocr', '--draft'])).toEqual({
      ok: true,
      value: { name: 'ocr', code: false, draft: true },
    });
    expect(parseNewItemArgs(['ocr', '--draft', '--code'])).toEqual({
      ok: true,
      value: { name: 'ocr', code: true, draft: true },
    });
  });

  it('refuses a missing name, an unknown flag and a bad name', () => {
    expect(parseNewItemArgs([]).ok).toBe(false);
    expect(parseNewItemArgs(['ocr', '--other']).ok).toBe(false);
    expect(parseNewItemArgs(['ocr', '--draft', '--draft']).ok).toBe(false);
    expect(parseNewItemArgs(['../evil']).ok).toBe(false);
    expect(parseNewItemArgs(['Bad']).ok).toBe(false);
  });
});
