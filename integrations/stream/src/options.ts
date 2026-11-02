// Options in, a checked config out. Pure. Every refusal is collected, so one run shows them all.
// Values are checked at run time too: they usually come straight from a JSON payload.

import { isAbsolute } from 'node:path';
import { err, INBOUND_PORT_MAX, INBOUND_PORT_MIN, ok, type Result } from '@ignitify-integrations/runtime';
import {
  AFTER_MODES,
  DEFAULT_HEIGHT,
  DEFAULT_PORT,
  DEFAULT_ROUTE,
  HEIGHT_MAX,
  HTTPS,
  MESSAGES,
  PROFILES,
  ROUTE_PATTERN,
} from './constants.js';
import type { FfmpegArgsFn } from './ffmpeg-args.js';
import type { ProgressReport } from './progress.js';

export type Profile = (typeof PROFILES)[number];
export type AfterMode = (typeof AFTER_MODES)[number];
export type ProgressHandler = (report: ProgressReport) => void;

export interface StreamOptions {
  /** An https:// URL, or an absolute path of a file on the VM (for example on the scratch disk). */
  readonly source: string;
  readonly profile?: Profile;
  /** Stop after this many seconds. Default: the whole source. */
  readonly seconds?: number;
  /** Output height in pixels (video profile only). */
  readonly height?: number;
  readonly startDelaySec?: number;
  readonly after?: AfterMode;
  /** With `after: 'replay'`: stop on its own this long after the stream ends. */
  readonly lingerSec?: number;
  readonly route?: string;
  readonly port?: number;
  readonly ffmpegArgs?: FfmpegArgsFn;
  /** Called for every ffmpeg progress report, next to the built-in chunk and metric. */
  readonly onProgress?: ProgressHandler;
  /** Stop source. Default: the first SIGTERM (run:cancel) or SIGINT. */
  readonly signal?: AbortSignal;
}

export interface StreamConfig {
  readonly source: string;
  readonly profile: Profile;
  readonly seconds: number | null;
  readonly height: number;
  readonly startDelaySec: number;
  readonly after: AfterMode;
  readonly lingerSec: number | null;
  readonly route: string;
  readonly port: number;
  readonly ffmpegArgs: FfmpegArgsFn | null;
  readonly onProgress: ProgressHandler | null;
}

/** JSON payloads carry `null` for "not set" as often as they leave the key out. */
const absent = (value: unknown): value is undefined | null => value === undefined || value === null;
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isIntIn = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

const parseSource = (value: unknown): Result<string> => {
  if (typeof value !== 'string' || value === '') return err(MESSAGES.badSource(value));
  // An absolute path cannot be read by ffmpeg as a protocol ("concat:", "pipe:", …).
  if (isAbsolute(value)) return ok(value);
  if (!URL.canParse(value)) return err(MESSAGES.badSource(value));
  const url = new URL(value);
  return url.protocol === HTTPS ? ok(url.toString()) : err(MESSAGES.badSource(value));
};

const oneOf = <T extends string>(
  all: readonly T[],
  value: unknown,
  fallback: T,
  message: (v: unknown) => string,
): Result<T> => {
  if (absent(value)) return ok(fallback);
  return all.includes(value as T) ? ok(value as T) : err(message(value));
};

const positiveOrNull = (name: string, value: unknown): Result<number | null> => {
  if (absent(value)) return ok(null);
  return isFiniteNumber(value) && value > 0 ? ok(value) : err(MESSAGES.badPositive(name, value));
};

const nonNegative = (name: string, value: unknown): Result<number> => {
  if (absent(value)) return ok(0);
  return isFiniteNumber(value) && value >= 0 ? ok(value) : err(MESSAGES.badNonNegative(name, value));
};

const intIn = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
  message: (v: unknown) => string,
): Result<number> => {
  if (absent(value)) return ok(fallback);
  return isIntIn(value, min, max) ? ok(value) : err(message(value));
};

const route = (value: unknown): Result<string> => {
  if (absent(value)) return ok(DEFAULT_ROUTE);
  return typeof value === 'string' && ROUTE_PATTERN.test(value) ? ok(value) : err(MESSAGES.badRoute(value));
};

const fnOrNull = <F>(name: string, value: unknown): Result<F | null> => {
  if (absent(value)) return ok(null);
  return typeof value === 'function' ? ok(value as F) : err(MESSAGES.badFunction(name));
};

type Values<R> = { [K in keyof R]: R[K] extends Result<infer T> ? T : never };

/** All fields ok → their values; else every error, in field order. */
const collect = <R extends Record<string, Result<unknown>>>(fields: R): Result<Values<R>, readonly string[]> => {
  const entries = Object.entries(fields);
  const errors = entries.flatMap(([, r]) => (r.ok ? [] : [r.error]));
  if (errors.length > 0) return err(errors);
  return ok(Object.fromEntries(entries.map(([key, r]) => [key, r.ok ? r.value : undefined])) as Values<R>);
};

export const parseOptions = (options: StreamOptions): Result<StreamConfig, readonly string[]> => {
  const fields = collect({
    source: parseSource(options.source),
    profile: oneOf(PROFILES, options.profile, 'video', MESSAGES.badProfile),
    seconds: positiveOrNull('seconds', options.seconds),
    height: intIn(options.height, DEFAULT_HEIGHT, 1, HEIGHT_MAX, MESSAGES.badHeight),
    startDelaySec: nonNegative('startDelaySec', options.startDelaySec),
    after: oneOf(AFTER_MODES, options.after, 'replay', MESSAGES.badAfter),
    lingerSec: positiveOrNull('lingerSec', options.lingerSec),
    route: route(options.route),
    port: intIn(options.port, DEFAULT_PORT, INBOUND_PORT_MIN, INBOUND_PORT_MAX, MESSAGES.badPort),
    ffmpegArgs: fnOrNull<FfmpegArgsFn>('ffmpegArgs', options.ffmpegArgs),
    onProgress: fnOrNull<ProgressHandler>('onProgress', options.onProgress),
  });
  if (!fields.ok) return fields;
  // A linger with `stop` would be silently ignored; refuse it so the intent is visible.
  if (fields.value.after === 'stop' && fields.value.lingerSec !== null) return err([MESSAGES.lingerNeedsReplay]);
  return fields;
};
