// The typed surface of the Bot API, from @grammyjs/types (types only, no run-time code).
// A file to upload is a `DiskFile` (see `fromDisk`), so every `InputFile` field accepts one.

import type { ApiMethods, Opts } from '@grammyjs/types';
import type { DISK_FILE_KIND } from './constants.js';

/** A file on the scratch disk, to upload. Made by `fromDisk`; read only when the call is sent. */
export interface DiskFile {
  readonly kind: typeof DISK_FILE_KIND;
  readonly path: string;
  readonly filename: string;
}

type Api = ApiMethods<DiskFile>;

/** Any Bot API method name, e.g. `sendMessage`. */
export type Method = keyof Api;
/** The parameters of a method; `{}` for a method that takes none. */
export type Params<M extends Method> = Opts<DiskFile>[M];
/** What a method returns on success. */
export type Returns<M extends Method> = ReturnType<Api[M]>;

export type TelegramErrorKind = 'api' | 'network' | 'timeout' | 'aborted' | 'invalid';

/** Every failure of a call. The message is one line, and the token is never in it. */
export interface TelegramError {
  readonly kind: TelegramErrorKind;
  readonly method: string;
  readonly message: string;
  /** The HTTP status, for `api`. */
  readonly status?: number;
  /** Telegram's `error_code`, for `api`. */
  readonly errorCode?: number;
  /** Telegram's `description`, for `api`. */
  readonly description?: string;
  /** A 429 that was not waited for: wait this long before sending again. */
  readonly retryAfterSec?: number;
  /** The group became a supergroup with this chat id: send there instead. */
  readonly migrateToChatId?: number;
  /** `sendText` only: the parts sent before the failure. */
  readonly partsSent?: number;
}

export interface CallOptions {
  /** Stop the call. Without it, the call still stops on SIGTERM and SIGINT. */
  readonly signal?: AbortSignal;
}
