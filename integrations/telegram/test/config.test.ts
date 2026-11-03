import { describe, expect, it } from 'vitest';
import { callTimeoutMs, checkToken, endpoints, parseOptions } from '../src/config.js';
import { API_ROOT, CALL_TIMEOUT_MS, RETRY_MAX_DEFAULT, RETRY_WAIT_MAX_SEC_DEFAULT } from '../src/constants.js';

const TOKEN = '123456:SECRET-token_value';

describe('parseOptions', () => {
  it('has safe defaults', () => {
    expect(parseOptions({})).toEqual({
      ok: true,
      value: {
        root: API_ROOT,
        environment: 'prod',
        retryMax: RETRY_MAX_DEFAULT,
        retryWaitMaxSec: RETRY_WAIT_MAX_SEC_DEFAULT,
      },
    });
  });

  it('accepts https anywhere and http on loopback only', () => {
    expect(parseOptions({ apiRoot: 'https://bot.example.com' }).ok).toBe(true);
    expect(parseOptions({ apiRoot: 'http://127.0.0.1:8081' }).ok).toBe(true);
    expect(parseOptions({ apiRoot: 'http://localhost:8081' }).ok).toBe(true);
    expect(parseOptions({ apiRoot: 'http://[::1]:8081' }).ok).toBe(true);
    expect(parseOptions({ apiRoot: 'http://bot.example.com' }).ok).toBe(false);
  });

  it('refuses a root with a path, a user or no URL at all', () => {
    expect(parseOptions({ apiRoot: 'https://bot.example.com/x' }).ok).toBe(false);
    expect(parseOptions({ apiRoot: 'https://user@bot.example.com' }).ok).toBe(false);
    expect(parseOptions({ apiRoot: 'not a url' }).ok).toBe(false);
  });

  it('refuses a bad environment and bad retry counts', () => {
    expect(parseOptions({ environment: 'staging' as 'prod' }).ok).toBe(false);
    expect(parseOptions({ retryMax: -1 }).ok).toBe(false);
    expect(parseOptions({ retryMax: 1.5 }).ok).toBe(false);
    expect(parseOptions({ retryWaitMaxSec: Number.NaN }).ok).toBe(false);
    expect(parseOptions({ retryMax: 0, retryWaitMaxSec: 0 }).ok).toBe(true);
  });
});

describe('checkToken', () => {
  it('accepts a normal token', () => {
    expect(checkToken(TOKEN)).toEqual({ ok: true, value: TOKEN });
  });

  it('refuses a token that is empty or would change the URL, without naming it', () => {
    for (const bad of ['', 'a/b', 'a b', 'a?b', 'a#b', 'a\nb']) {
      const result = checkToken(bad);
      expect(result.ok).toBe(false);
      if (!result.ok && bad !== '') expect(result.error).not.toContain(bad);
    }
  });
});

describe('endpoints', () => {
  it('builds the method and file bases, with /test for the test environment', () => {
    expect(endpoints({ root: API_ROOT, environment: 'prod' }, TOKEN)).toEqual({
      api: `${API_ROOT}/bot${TOKEN}`,
      files: `${API_ROOT}/file/bot${TOKEN}`,
    });
    expect(endpoints({ root: API_ROOT, environment: 'test' }, TOKEN).api).toBe(`${API_ROOT}/bot${TOKEN}/test`);
  });
});

describe('callTimeoutMs', () => {
  it('adds the long-poll wait of getUpdates only', () => {
    expect(callTimeoutMs('sendMessage', { timeout: 50 })).toBe(CALL_TIMEOUT_MS);
    expect(callTimeoutMs('getUpdates', { timeout: 50 })).toBe(CALL_TIMEOUT_MS + 50_000);
    expect(callTimeoutMs('getUpdates', {})).toBe(CALL_TIMEOUT_MS);
  });
});
