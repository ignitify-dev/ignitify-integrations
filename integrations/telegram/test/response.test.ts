import { describe, expect, it } from 'vitest';
import { RETRY_BACKOFF_BASE_MS } from '../src/constants.js';
import { failure, isSafeMethod, parseResponse, retryDecision } from '../src/response.js';
import type { TelegramError } from '../src/types.js';

const TOKEN = '123456:SECRET-token_value';
const limits = { retryMax: 3, retryWaitMaxSec: 30 };

const errorOf = (status: number, body: unknown): TelegramError => {
  const result = parseResponse('sendMessage', status, JSON.stringify(body), [TOKEN]);
  if (result.ok) throw new Error('expected an error');
  return result.error;
};

describe('parseResponse', () => {
  it('returns the result of a success', () => {
    expect(parseResponse('getMe', 200, '{"ok":true,"result":{"id":1}}', [TOKEN])).toEqual({
      ok: true,
      value: { id: 1 },
    });
  });

  it('maps a Bot API error with its parameters', () => {
    const error = errorOf(429, {
      ok: false,
      error_code: 429,
      description: 'Too Many Requests: retry after 5',
      parameters: { retry_after: 5 },
    });
    expect(error).toMatchObject({ kind: 'api', method: 'sendMessage', status: 429, errorCode: 429, retryAfterSec: 5 });
    expect(error.message).toBe('telegram sendMessage: HTTP 429: Too Many Requests: retry after 5');
    expect(
      errorOf(400, { ok: false, error_code: 400, description: 'x', parameters: { migrate_to_chat_id: -100 } })
        .migrateToChatId,
    ).toBe(-100);
  });

  it('maps a body that is not Bot API JSON', () => {
    const result = parseResponse('getMe', 502, '<html>Bad Gateway</html>', [TOKEN]);
    expect(result).toMatchObject({ ok: false, error: { kind: 'api', status: 502 } });
  });

  it('redacts the token from the message and the description', () => {
    const error = errorOf(400, { ok: false, error_code: 400, description: `bad url /bot${TOKEN}/x` });
    expect(JSON.stringify(error)).not.toContain(TOKEN);
    expect(error.description).toContain('[redacted]');
  });
});

describe('retryDecision', () => {
  const api = (status: number, retryAfterSec?: number): TelegramError => ({
    ...failure('api', 'm', 'x', [], { status }),
    ...(retryAfterSec === undefined ? {} : { retryAfterSec }),
  });
  const network = failure('network', 'm', 'x', []);

  it('waits retry_after on a 429 under the cap, for any method', () => {
    expect(retryDecision(0, api(429, 5), 'sendMessage', limits)).toEqual({ retry: true, waitMs: 5000 });
  });

  it('does not wait on a 429 over the cap or without retry_after', () => {
    expect(retryDecision(0, api(429, 31), 'sendMessage', limits)).toEqual({ retry: false });
    expect(retryDecision(0, api(429), 'sendMessage', limits)).toEqual({ retry: false });
  });

  it('never repeats a send after a 5xx, a network error or a timeout', () => {
    expect(retryDecision(0, api(502), 'sendMessage', limits).retry).toBe(false);
    expect(retryDecision(0, network, 'sendMessage', limits).retry).toBe(false);
    expect(retryDecision(0, failure('timeout', 'm', 'x', []), 'sendDocument', limits).retry).toBe(false);
  });

  it('retries a safe method with backoff', () => {
    expect(retryDecision(0, api(502), 'getUpdates', limits)).toEqual({ retry: true, waitMs: RETRY_BACKOFF_BASE_MS });
    expect(retryDecision(2, network, 'getFile', limits)).toEqual({ retry: true, waitMs: RETRY_BACKOFF_BASE_MS * 4 });
    expect(retryDecision(0, network, 'deleteWebhook', limits).retry).toBe(true);
  });

  it('stops at retryMax, and never retries a 4xx, an abort or an invalid call', () => {
    expect(retryDecision(3, api(429, 1), 'getMe', limits).retry).toBe(false);
    expect(retryDecision(0, api(400), 'getMe', limits).retry).toBe(false);
    expect(retryDecision(0, failure('aborted', 'm', 'x', []), 'getMe', limits).retry).toBe(false);
    expect(retryDecision(0, failure('invalid', 'm', 'x', []), 'getMe', limits).retry).toBe(false);
  });

  it('knows the safe methods', () => {
    expect(['getMe', 'getUpdates', 'setWebhook', 'deleteWebhook'].every(isSafeMethod)).toBe(true);
    expect(['sendMessage', 'forwardMessage', 'deleteMessage'].some(isSafeMethod)).toBe(false);
  });
});
