import { describe, expect, it } from 'vitest';
import {
  POLL_BACKOFF_BASE_MS,
  POLL_BACKOFF_MAX_MS,
  POLL_LIMIT,
  POLL_TIMEOUT_SEC,
  RECEIVING_EVERY_MS,
} from '../src/constants.js';
import { fatalMessage, nextOffset, pollBackoffMs, pollParams, pollWaitMs, shouldReport } from '../src/poll.js';
import { failure } from '../src/response.js';

const api = (status: number, retryAfterSec?: number) => ({
  ...failure('api', 'getUpdates', `HTTP ${status}`, [], { status }),
  ...(retryAfterSec === undefined ? {} : { retryAfterSec }),
});

describe('pollParams', () => {
  it('long-polls at the limit, with an offset and allowed_updates only when given', () => {
    expect(pollParams(undefined)).toEqual({ limit: POLL_LIMIT, timeout: POLL_TIMEOUT_SEC });
    expect(pollParams(5, ['message'])).toEqual({
      offset: 5,
      limit: POLL_LIMIT,
      timeout: POLL_TIMEOUT_SEC,
      allowed_updates: ['message'],
    });
  });

  it('confirms an update with its id plus one', () => {
    expect(nextOffset({ update_id: 41 })).toBe(42);
  });
});

describe('backoff', () => {
  it('doubles up to the max', () => {
    expect(pollBackoffMs(1)).toBe(POLL_BACKOFF_BASE_MS);
    expect(pollBackoffMs(3)).toBe(POLL_BACKOFF_BASE_MS * 4);
    expect(pollBackoffMs(50)).toBe(POLL_BACKOFF_MAX_MS);
  });

  it('waits retry_after when that is longer', () => {
    expect(pollWaitMs(1, api(429, 40))).toBe(40_000);
    expect(pollWaitMs(1, api(502))).toBe(POLL_BACKOFF_BASE_MS);
  });
});

describe('fatalMessage', () => {
  it('ends the loop on a conflict, a bad token or a bad request', () => {
    expect(fatalMessage(api(409))).toMatch(/only one poller per bot/);
    expect(fatalMessage(api(401))).toMatch(/TELEGRAM_BOT_TOKEN/);
    expect(fatalMessage(api(404))).toMatch(/TELEGRAM_BOT_TOKEN/);
    expect(fatalMessage(api(400))).toBe('HTTP 400'.replace(/^/, 'telegram getUpdates: '));
  });

  it('waits on a 429, a 5xx, a network error or a timeout', () => {
    expect(fatalMessage(api(429, 5))).toBeUndefined();
    expect(fatalMessage(api(502))).toBeUndefined();
    expect(fatalMessage(failure('network', 'getUpdates', 'x', []))).toBeUndefined();
    expect(fatalMessage(failure('timeout', 'getUpdates', 'x', []))).toBeUndefined();
  });
});

describe('shouldReport', () => {
  it('reports the first time, then at most once per interval', () => {
    expect(shouldReport(null, 0)).toBe(true);
    expect(shouldReport(0, RECEIVING_EVERY_MS - 1)).toBe(false);
    expect(shouldReport(0, RECEIVING_EVERY_MS)).toBe(true);
  });
});
