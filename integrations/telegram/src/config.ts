// Pure decisions of telegram's setup: options, the token, the API base URLs. No I/O here.

import { err, ok, type Result } from '@ignitify-integrations/runtime';
import {
  API_ROOT,
  CALL_TIMEOUT_MS,
  HTTP,
  HTTPS,
  LONG_POLL_METHOD,
  LOOPBACK_HOSTS,
  MESSAGES,
  MS_PER_SEC,
  RETRY_MAX_DEFAULT,
  RETRY_WAIT_MAX_SEC_DEFAULT,
  TEST_ENVIRONMENT_SEGMENT,
  TOKEN_UNSAFE,
} from './constants.js';

export type Environment = 'prod' | 'test';

export interface TelegramOptions {
  /** The token of a second bot. Default: the secret `TELEGRAM_BOT_TOKEN` from ctx.secrets. */
  readonly token?: string;
  /** `test` sends to Telegram's test environment. Default `prod`. */
  readonly environment?: Environment;
  /** For tests only: another Bot API origin. `http:` is accepted on loopback only. */
  readonly apiRoot?: string;
  /** How many times one call is retried. Default 3. */
  readonly retryMax?: number;
  /** The longest 429 wait, in seconds. A longer one comes back as an error. Default 30. */
  readonly retryWaitMaxSec?: number;
}

export interface RetryLimits {
  readonly retryMax: number;
  readonly retryWaitMaxSec: number;
}

export interface TelegramConfig extends RetryLimits {
  readonly root: string;
  readonly environment: Environment;
}

/** The URLs a call and a download use. Both hold the token, so neither is ever logged. */
export interface Endpoints {
  readonly api: string;
  readonly files: string;
}

const isCount = (value: number): boolean => Number.isInteger(value) && value >= 0;

const parseRoot = (root: string): Result<string> => {
  if (!URL.canParse(root)) return err(MESSAGES.badApiRoot(root));
  const url = new URL(root);
  const secure = url.protocol === HTTPS || (url.protocol === HTTP && LOOPBACK_HOSTS.includes(url.hostname));
  const originOnly = url.pathname === '/' && url.search === '' && url.username === '' && url.password === '';
  return secure && originOnly ? ok(url.origin) : err(MESSAGES.badApiRoot(root));
};

export const parseOptions = (options: TelegramOptions): Result<TelegramConfig> => {
  const environment = options.environment ?? 'prod';
  if (environment !== 'prod' && environment !== 'test') return err(MESSAGES.badEnvironment(String(environment)));
  const retryMax = options.retryMax ?? RETRY_MAX_DEFAULT;
  if (!isCount(retryMax)) return err(MESSAGES.badCount('retryMax', retryMax));
  const retryWaitMaxSec = options.retryWaitMaxSec ?? RETRY_WAIT_MAX_SEC_DEFAULT;
  if (!isCount(retryWaitMaxSec)) return err(MESSAGES.badCount('retryWaitMaxSec', retryWaitMaxSec));
  const root = options.apiRoot === undefined ? ok(API_ROOT) : parseRoot(options.apiRoot);
  return root.ok ? ok({ root: root.value, environment, retryMax, retryWaitMaxSec }) : root;
};

/** The message never holds the token: a bad token must not leak through its own error. */
export const checkToken = (token: string): Result<string> =>
  typeof token === 'string' && token !== '' && !TOKEN_UNSAFE.test(token) ? ok(token) : err(MESSAGES.badToken);

/** `<root>/bot<token>` for methods and `<root>/file/bot<token>` for file links (plus `/test`). */
export const endpoints = (config: Pick<TelegramConfig, 'root' | 'environment'>, token: string): Endpoints => {
  const suffix = config.environment === 'test' ? TEST_ENVIRONMENT_SEGMENT : '';
  return { api: `${config.root}/bot${token}${suffix}`, files: `${config.root}/file/bot${token}${suffix}` };
};

/** The call timeout: the base, plus the long-poll wait of `getUpdates`. */
export const callTimeoutMs = (method: string, params: Readonly<Record<string, unknown>>): number => {
  const poll = params['timeout'];
  return (
    CALL_TIMEOUT_MS + (method === LONG_POLL_METHOD && typeof poll === 'number' && poll > 0 ? poll * MS_PER_SEC : 0)
  );
};
