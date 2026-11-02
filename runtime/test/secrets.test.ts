import { describe, expect, it } from 'vitest';
import { readSecret, SECRET_NAME_PATTERN } from '@ignitify-integrations/runtime';

describe('readSecret', () => {
  const ctx = { secrets: { BOT_TOKEN: 't1', EMPTY: '' } };

  it('reads a set secret', () => {
    expect(readSecret(ctx, 'BOT_TOKEN')).toEqual({ ok: true, value: 't1' });
  });

  it('fails with the name and the command to set it, for a missing or empty secret', () => {
    const missing = readSecret(ctx, 'SALES_BOT_TOKEN');
    expect(!missing.ok && missing.error).toContain('secret:set SALES_BOT_TOKEN');
    expect(readSecret(ctx, 'EMPTY').ok).toBe(false);
  });

  it('never puts a secret value in an error', () => {
    const r = readSecret(ctx, 'NOPE');
    expect(!r.ok && r.error).not.toMatch(/t1/);
  });
});

describe('SECRET_NAME_PATTERN', () => {
  it.each([
    ['S3_ACCESS_KEY_ID', true],
    ['lower', false],
    ['1ABC', false],
  ])('%s -> %s', (name, valid) => {
    expect(SECRET_NAME_PATTERN.test(name)).toBe(valid);
  });
});
