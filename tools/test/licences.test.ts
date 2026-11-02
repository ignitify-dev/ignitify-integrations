import { describe, expect, it } from 'vitest';
import { checkLicences, licenceAllowed } from '../src/licences.js';

const ALLOWED = ['MIT', 'Apache-2.0', 'ISC'];
const verdict = (expression: string) => licenceAllowed(expression, ALLOWED);

describe('licenceAllowed', () => {
  it('accepts a single allowed id and refuses another', () => {
    expect(verdict('MIT')).toEqual({ ok: true, value: true });
    expect(verdict('GPL-3.0-only')).toEqual({ ok: true, value: false });
  });

  it('OR needs any allowed side; AND needs all', () => {
    expect(verdict('GPL-3.0-only OR MIT').ok && verdict('GPL-3.0-only OR MIT')).toEqual({ ok: true, value: true });
    expect(verdict('MIT AND ISC')).toEqual({ ok: true, value: true });
    expect(verdict('MIT AND GPL-3.0-only')).toEqual({ ok: true, value: false });
    expect(verdict('(MIT OR Apache-2.0)')).toEqual({ ok: true, value: true });
    expect(verdict('mit or GPL-2.0')).toEqual({ ok: true, value: false });
    expect(verdict('GPL-2.0 or MIT')).toEqual({ ok: true, value: true });
  });

  it('keeps SPDX precedence: parentheses group, AND binds tighter than OR', () => {
    // Stripping the parentheses would read this as (GPL AND MIT) OR ISC = allowed.
    expect(verdict('GPL-3.0-only AND (MIT OR ISC)')).toEqual({ ok: true, value: false });
    expect(verdict('GPL-3.0-only AND MIT OR ISC')).toEqual({ ok: true, value: true });
  });

  it('refuses an exception for human review, and fails on a malformed expression', () => {
    expect(verdict('Apache-2.0 WITH LLVM-exception')).toEqual({ ok: true, value: false });
    expect(verdict('MIT OR').ok).toBe(false);
    expect(verdict('(MIT').ok).toBe(false);
    expect(verdict('MIT ISC').ok).toBe(false);
    expect(verdict('').ok).toBe(false);
  });
});

describe('checkLicences', () => {
  it('skips the root, workspace links and dev entries; reports missing, unparsable and disallowed', () => {
    const lockfile = {
      lockfileVersion: 3,
      packages: {
        '': { name: 'root' },
        'node_modules/@x/core': { resolved: 'core', link: true },
        'node_modules/eslint': { license: 'GPL-3.0-only', dev: true },
        'node_modules/ok': { license: 'MIT' },
        'node_modules/either': { license: '(MIT OR GPL-3.0-only)' },
        'node_modules/bad': { license: 'GPL-3.0-only' },
        'node_modules/none': {},
        'node_modules/weird': { license: 'MIT AND' },
      },
    };
    expect(checkLicences(lockfile, ALLOWED)).toEqual([
      'node_modules/bad: licence "GPL-3.0-only" is not on the allow-list',
      'node_modules/none: no licence in package-lock.json',
      'node_modules/weird: cannot read the licence expression "MIT AND"',
    ]);
  });

  it('refuses a lockfile with no packages map', () => {
    expect(checkLicences({ lockfileVersion: 1 })).toHaveLength(1);
    expect(checkLicences(null)).toHaveLength(1);
  });
});
