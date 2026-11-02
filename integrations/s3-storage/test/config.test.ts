import { describe, expect, it } from 'vitest';
import {
  checkSize,
  clientConfig,
  deriveKey,
  parseOptions,
  redact,
  resolveExpiry,
  resolveKey,
  validateKey,
} from '../src/config.js';
import { EXPIRES_DEFAULT_SEC, EXPIRES_MAX_SEC, KEY_MAX_BYTES, PUT_MAX_BYTES, REDACTED } from '../src/constants.js';

const base = { bucket: 'acme-reports', region: 'eu-west-1' };
const credentials = { accessKeyId: 'AKID', secretAccessKey: 'SECRET' };

describe('parseOptions', () => {
  it('accepts AWS options with no endpoint', () => {
    expect(parseOptions(base)).toEqual({ ok: true, value: base });
  });

  it.each(['Acme', 'a', 'acme.reports', '-acme', 'acme_reports'])('rejects bucket %s', (bucket) => {
    expect(parseOptions({ ...base, bucket }).ok).toBe(false);
  });

  it('rejects a region that could break the host template', () => {
    expect(parseOptions({ ...base, region: 'eu-west-1.evil.com' }).ok).toBe(false);
  });

  it('normalises an https endpoint to its origin', () => {
    const result = parseOptions({ ...base, endpoint: 'https://ACC.r2.cloudflarestorage.com/' });
    expect(result).toEqual({ ok: true, value: { ...base, endpoint: 'https://acc.r2.cloudflarestorage.com' } });
  });

  it('refuses http unless insecureHttp is set', () => {
    expect(parseOptions({ ...base, endpoint: 'http://127.0.0.1:9000' }).ok).toBe(false);
    expect(parseOptions({ ...base, endpoint: 'http://127.0.0.1:9000', insecureHttp: true })).toEqual({
      ok: true,
      value: { ...base, endpoint: 'http://127.0.0.1:9000' },
    });
  });

  it.each(['not a url', 'ftp://host', 'https://host/path', 'https://host?x=1', 'https://user:pw@host'])(
    'rejects endpoint %s',
    (endpoint) => {
      expect(parseOptions({ ...base, endpoint, insecureHttp: true }).ok).toBe(false);
    },
  );
});

describe('resolveExpiry', () => {
  it('defaults to one hour', () => {
    expect(resolveExpiry()).toEqual({ ok: true, value: EXPIRES_DEFAULT_SEC });
  });

  it('accepts the 7-day presign maximum and nothing above it', () => {
    expect(resolveExpiry(EXPIRES_MAX_SEC).ok).toBe(true);
    expect(resolveExpiry(EXPIRES_MAX_SEC + 1).ok).toBe(false);
  });

  it.each([0, -1, 1.5, Number.NaN])('rejects %s', (value) => {
    expect(resolveExpiry(value).ok).toBe(false);
  });
});

describe('keys', () => {
  it('derives a unique-prefixed key from the file name only', () => {
    expect(deriveKey('/scratch/out/report 2026.pdf', 'id1')).toBe('id1/report_2026.pdf');
  });

  it('keeps no directory part of the path in the key', () => {
    expect(deriveKey('../../etc/passwd', 'id1')).toBe('id1/passwd');
  });

  it('falls back to a fixed name when the file name is empty', () => {
    expect(deriveKey('', 'id1')).toBe('id1/file');
  });

  it('uses a caller key as given when it is valid', () => {
    expect(resolveKey('/scratch/a.txt', 'reports/a.txt', 'id1')).toEqual({ ok: true, value: 'reports/a.txt' });
    expect(resolveKey('/scratch/a.txt', undefined, 'id1')).toEqual({ ok: true, value: 'id1/a.txt' });
  });

  it.each(['', '/abs', 'x'.repeat(KEY_MAX_BYTES + 1), 'é'.repeat(KEY_MAX_BYTES / 2 + 1)])(
    'rejects key of length %#',
    (key) => {
      expect(validateKey(key).ok).toBe(false);
    },
  );

  it('accepts a key of exactly the byte limit', () => {
    expect(validateKey('x'.repeat(KEY_MAX_BYTES)).ok).toBe(true);
  });
});

describe('checkSize', () => {
  it('accepts up to the single-PUT limit and nothing above', () => {
    expect(checkSize('f', PUT_MAX_BYTES).ok).toBe(true);
    expect(checkSize('f', PUT_MAX_BYTES + 1).ok).toBe(false);
  });
});

describe('clientConfig', () => {
  it('uses virtual-hosted style on AWS (host = <bucket>.s3.<region>.amazonaws.com)', () => {
    const config = clientConfig(base, credentials);
    expect(config).toEqual({ region: 'eu-west-1', credentials });
  });

  it('uses path-style and required-only checksums on a custom endpoint', () => {
    const config = clientConfig({ ...base, endpoint: 'https://h.example' }, credentials);
    expect(config).toMatchObject({
      endpoint: 'https://h.example',
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  });
});

describe('redact', () => {
  it('removes every secret value', () => {
    expect(redact('key AKID and SECRET and AKID', ['AKID', 'SECRET'])).toBe(
      `key ${REDACTED} and ${REDACTED} and ${REDACTED}`,
    );
  });

  it('ignores an empty secret instead of inserting markers everywhere', () => {
    expect(redact('text', [''])).toBe('text');
  });
});
