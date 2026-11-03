// Thin shell: the HTTP calls. Every decision (encoding, lengths, errors, retries) is pure and lives
// in encode.ts, text.ts and response.ts. fetch, sleep and the stop signal are injected.

import { setMaxListeners } from 'node:events';
import { err, ok, type ProcessStop, type Result } from '@ignitify-integrations/runtime';
import { callTimeoutMs, type Endpoints, type RetryLimits } from './config.js';
import { CALL_TIMEOUT_MS, DOWNLOAD_LABEL, JSON_HEADERS, MESSAGES, METHOD_PATTERN } from './constants.js';
import { encodeParams, type Encoded } from './encode.js';
import { openUpload } from './files.js';
import { failure, parseResponse, retryDecision } from './response.js';
import { checkLength } from './text.js';
import type { CallOptions, TelegramError } from './types.js';

export interface TelegramDeps {
  readonly fetch: typeof fetch;
  /** Wait `ms`; reject when `signal` aborts. */
  readonly sleep: (ms: number, signal: AbortSignal) => Promise<void>;
  /** The process stop signal (SIGTERM, SIGINT). */
  readonly stop: () => ProcessStop;
}

type Body = Pick<RequestInit, 'body' | 'headers'>;

export interface Client {
  call(
    method: string,
    params: Readonly<Record<string, unknown>>,
    opts?: CallOptions,
  ): Promise<Result<unknown, TelegramError>>;
  /** GET a file link and hand the answer to `consume`, inside the same stop and timeout. */
  getFile<T>(
    filePath: string,
    opts: CallOptions,
    consume: (response: Response) => Promise<Result<T, TelegramError>>,
  ): Promise<Result<T, TelegramError>>;
  /** The secrets every error is redacted of. */
  readonly secrets: readonly string[];
}

/**
 * One process stop shared by all calls in flight, released when the last one ends. One listener per
 * call would pass Node's listener limit when a bot sends many messages at once.
 */
const sharedStop = (create: () => ProcessStop): (() => ProcessStop) => {
  let current: ProcessStop | undefined;
  let users = 0;
  return () => {
    const stop = current ?? create();
    current = stop;
    users += 1;
    let released = false;
    return {
      signal: stop.signal,
      release: () => {
        if (released) return;
        released = true;
        users -= 1;
        if (users > 0) return;
        stop.release();
        current = undefined;
      },
    };
  };
};

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null;

/** A short name for a network failure, e.g. `ECONNRESET`. Never the message: it may hold the URL. */
const networkCode = (error: unknown): string => {
  const cause = error instanceof Error ? error.cause : undefined;
  if (isRecord(cause) && typeof cause['code'] === 'string') return cause['code'];
  return error instanceof Error ? error.name : typeof error;
};

export const createClient = (endpoints: Endpoints, token: string, limits: RetryLimits, deps: TelegramDeps): Client => {
  const secrets = [token];
  const acquireStop = sharedStop(deps.stop);

  /** Run `work` with one signal for the caller's signal and the process stop. */
  const stoppable = async <T>(
    opts: CallOptions,
    work: (signal: AbortSignal) => Promise<Result<T, TelegramError>>,
  ): Promise<Result<T, TelegramError>> => {
    const stop = acquireStop();
    const signal = opts.signal === undefined ? stop.signal : AbortSignal.any([opts.signal, stop.signal]);
    // Many calls in flight share one signal; each request and each wait listens to it.
    setMaxListeners(0, signal);
    try {
      return await work(signal);
    } finally {
      stop.release();
    }
  };

  /** One HTTP exchange, bounded by a timeout. A throw becomes `aborted`, `timeout` or `network`. */
  const exchange = async <T>(
    method: string,
    url: string,
    init: RequestInit,
    timeoutMs: number,
    signal: AbortSignal,
    consume: (response: Response) => Promise<Result<T, TelegramError>>,
  ): Promise<Result<T, TelegramError>> => {
    const timeout = AbortSignal.timeout(timeoutMs);
    try {
      return await consume(await deps.fetch(url, { ...init, signal: AbortSignal.any([signal, timeout]) }));
    } catch (error) {
      if (signal.aborted) return err(failure('aborted', method, MESSAGES.aborted, secrets));
      if (timeout.aborted) return err(failure('timeout', method, MESSAGES.timeout(timeoutMs), secrets));
      return err(failure('network', method, MESSAGES.network(networkCode(error)), secrets));
    }
  };

  const requestBody = async (method: string, encoded: Encoded): Promise<Result<Body, TelegramError>> => {
    if (encoded.kind === 'json') return ok({ headers: JSON_HEADERS, body: encoded.body });
    const form = new FormData();
    encoded.fields.forEach(([name, value]) => form.append(name, value));
    for (const [name, file] of encoded.files) {
      const blob = await openUpload(file);
      if (!blob.ok) return err(failure('invalid', method, blob.error, secrets));
      form.append(name, blob.value, file.filename);
    }
    return ok({ body: form });
  };

  const call: Client['call'] = async (method, params, opts = {}) => {
    if (typeof method !== 'string' || !METHOD_PATTERN.test(method))
      return err(failure('invalid', String(method), MESSAGES.badMethod, secrets));
    const length = checkLength(method, params);
    if (!length.ok) return err(failure('invalid', method, length.error, secrets));
    const body = await requestBody(method, encodeParams(params));
    if (!body.ok) return body;
    const timeoutMs = callTimeoutMs(method, params);
    const consume = async (response: Response) =>
      parseResponse(method, response.status, await response.text(), secrets);
    return stoppable(opts, async (signal) => {
      for (let attempt = 0; ; attempt += 1) {
        const init: RequestInit = { method: 'POST', ...body.value };
        const result = await exchange(method, `${endpoints.api}/${method}`, init, timeoutMs, signal, consume);
        if (result.ok) return result;
        const decision = retryDecision(attempt, result.error, method, limits);
        if (!decision.retry) return result;
        try {
          await deps.sleep(decision.waitMs, signal);
        } catch {
          return err(failure('aborted', method, MESSAGES.aborted, secrets));
        }
      }
    });
  };

  const getFile: Client['getFile'] = (filePath, opts, consume) =>
    stoppable(opts, (signal) =>
      exchange(DOWNLOAD_LABEL, `${endpoints.files}/${filePath}`, { method: 'GET' }, CALL_TIMEOUT_MS, signal, consume),
    );

  return { call, getFile, secrets };
};
