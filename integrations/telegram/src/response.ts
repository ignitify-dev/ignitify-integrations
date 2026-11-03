// Pure answers to "what came back" and "send again?". Every error is built here from known fields,
// with no `cause`, and redacted: the token is in every URL, and a URL can end up in any message.

import { err, ok, redact, type Result } from '@ignitify-integrations/runtime';
import type { RetryLimits } from './config.js';
import {
  HTTP_SERVER_ERROR_MIN,
  HTTP_TOO_MANY_REQUESTS,
  MESSAGES,
  MS_PER_SEC,
  RETRY_BACKOFF_BASE_MS,
  SAFE_METHOD_PREFIX,
  SAFE_METHODS,
} from './constants.js';
import type { TelegramError, TelegramErrorKind } from './types.js';

type ErrorFields = Omit<TelegramError, 'kind' | 'method' | 'message'>;

/** Build an error whose message and description hold no secret. */
export const failure = (
  kind: TelegramErrorKind,
  method: string,
  detail: string,
  secrets: readonly string[],
  fields: ErrorFields = {},
): TelegramError => ({
  ...fields,
  ...(fields.description === undefined ? {} : { description: redact(fields.description, secrets) }),
  kind,
  method,
  message: redact(MESSAGES.failed(method, detail), secrets),
});

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null;

const numberOrUndefined = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);

const parseJson = (body: string): unknown => {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
};

/** Turn one HTTP answer into the method's result or an `api` error. */
export const parseResponse = (
  method: string,
  status: number,
  body: string,
  secrets: readonly string[],
): Result<unknown, TelegramError> => {
  const json = parseJson(body);
  if (!isRecord(json) || typeof json['ok'] !== 'boolean')
    return err(failure('api', method, MESSAGES.http(status, MESSAGES.notBotApi), secrets, { status }));
  if (json['ok'] === true) return ok(json['result']);
  const description = typeof json['description'] === 'string' ? json['description'] : MESSAGES.notBotApi;
  const parameters = isRecord(json['parameters']) ? json['parameters'] : {};
  const retryAfterSec = numberOrUndefined(parameters['retry_after']);
  const migrateToChatId = numberOrUndefined(parameters['migrate_to_chat_id']);
  return err(
    failure('api', method, MESSAGES.http(status, description), secrets, {
      status,
      description,
      ...(typeof json['error_code'] === 'number' ? { errorCode: json['error_code'] } : {}),
      ...(retryAfterSec === undefined ? {} : { retryAfterSec }),
      ...(migrateToChatId === undefined ? {} : { migrateToChatId }),
    }),
  );
};

/** A method that changes nothing when sent twice. */
export const isSafeMethod = (method: string): boolean =>
  method.startsWith(SAFE_METHOD_PREFIX) || SAFE_METHODS.includes(method);

export type RetryDecision = { readonly retry: false } | { readonly retry: true; readonly waitMs: number };

const NO_RETRY: RetryDecision = { retry: false };

/**
 * After failure number `attempt` (0 for the first): a 429 waits `retry_after` when that is within
 * the cap; a 5xx, a network error or a timeout is retried with backoff for safe methods only.
 */
export const retryDecision = (
  attempt: number,
  error: TelegramError,
  method: string,
  limits: RetryLimits,
): RetryDecision => {
  if (attempt >= limits.retryMax) return NO_RETRY;
  if (error.kind === 'api' && error.status === HTTP_TOO_MANY_REQUESTS)
    return error.retryAfterSec !== undefined && error.retryAfterSec <= limits.retryWaitMaxSec
      ? { retry: true, waitMs: error.retryAfterSec * MS_PER_SEC }
      : NO_RETRY;
  const transient =
    error.kind === 'network' ||
    error.kind === 'timeout' ||
    (error.kind === 'api' && (error.status ?? 0) >= HTTP_SERVER_ERROR_MIN);
  return transient && isSafeMethod(method) ? { retry: true, waitMs: RETRY_BACKOFF_BASE_MS * 2 ** attempt } : NO_RETRY;
};
