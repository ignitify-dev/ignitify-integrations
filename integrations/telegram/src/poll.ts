// Pure decisions of the poll loop: what to ask for, where to go on, how long to wait, when to report.

import type { Update } from '@grammyjs/types';
import {
  HTTP_CONFLICT,
  HTTP_SERVER_ERROR_MIN,
  HTTP_TOO_MANY_REQUESTS,
  HTTP_NOT_FOUND,
  HTTP_UNAUTHORIZED,
  MS_PER_SEC,
  POLL_BACKOFF_BASE_MS,
  POLL_BACKOFF_MAX_MS,
  POLL_LIMIT,
  POLL_MESSAGES,
  POLL_TIMEOUT_SEC,
  RECEIVING_EVERY_MS,
} from './constants.js';
import type { TelegramError } from './types.js';

export type UpdateType = Exclude<keyof Update, 'update_id'>;

// A type, not an interface, so it passes as a plain record to `call`.
export type PollParams = {
  readonly offset?: number;
  readonly limit: number;
  readonly timeout: number;
  readonly allowed_updates?: readonly UpdateType[];
};

/** The next `getUpdates`. `allowed_updates` is sent only when given: else Telegram keeps the last one. */
export const pollParams = (offset: number | undefined, allowedUpdates?: readonly UpdateType[]): PollParams => ({
  ...(offset === undefined ? {} : { offset }),
  limit: POLL_LIMIT,
  timeout: POLL_TIMEOUT_SEC,
  ...(allowedUpdates === undefined ? {} : { allowed_updates: allowedUpdates }),
});

/** The offset that confirms every update up to and including `update`. */
export const nextOffset = (update: Pick<Update, 'update_id'>): number => update.update_id + 1;

/** The wait after failure number `failures` (1 for the first) in a row. */
export const pollBackoffMs = (failures: number): number =>
  Math.min(POLL_BACKOFF_BASE_MS * 2 ** Math.max(failures - 1, 0), POLL_BACKOFF_MAX_MS);

/** The wait before the next pull: the backoff, or Telegram's `retry_after` when that is longer. */
export const pollWaitMs = (failures: number, error: TelegramError): number =>
  Math.max(pollBackoffMs(failures), (error.retryAfterSec ?? 0) * MS_PER_SEC);

/** The message of a failure that ends the loop, or undefined when a wait may fix it. */
export const fatalMessage = (error: TelegramError): string | undefined => {
  if (error.kind !== 'api') return undefined;
  if (error.status === HTTP_CONFLICT) return POLL_MESSAGES.conflict(error.message);
  if (error.status === HTTP_UNAUTHORIZED || error.status === HTTP_NOT_FOUND)
    return POLL_MESSAGES.unauthorized(error.message);
  if (error.status === undefined || error.status === HTTP_TOO_MANY_REQUESTS) return undefined;
  // Any other 4xx is a bad request: waiting will not change it.
  return error.status < HTTP_SERVER_ERROR_MIN ? error.message : undefined;
};

/** At most one `receiving` chunk per interval. */
export const shouldReport = (lastMs: number | null, nowMs: number): boolean =>
  lastMs === null || nowMs - lastMs >= RECEIVING_EVERY_MS;
