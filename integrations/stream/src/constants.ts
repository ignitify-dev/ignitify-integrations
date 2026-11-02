// Defaults, limits and messages of the stream integration. A change here is a code change, not config.

import { INBOUND_PORT_MAX, INBOUND_PORT_MIN, ROUTE_PREFIX_PATTERN } from '@ignitify-integrations/runtime';

/** Must equal the manifest's `inbound_routes` prefix and `inbound_port`; the CLI writes these. */
export const DEFAULT_ROUTE = '/live/';
export const DEFAULT_PORT = 8080;
export const DEFAULT_HEIGHT = 480;

export const PROFILES = ['video', 'audio'] as const;
export const AFTER_MODES = ['replay', 'stop'] as const;

/** 4K. Above it a live x264 encode does not fit any sold preset. */
export const HEIGHT_MAX = 2160;

/**
 * Same rule as the manifest schema's route prefix: starts and ends with "/", is not "/" itself.
 * It also keeps the route safe to inline in the player page (no quotes or angle brackets).
 */
export const ROUTE_PATTERN = new RegExp(ROUTE_PREFIX_PATTERN);

export const HTTPS = 'https:';
export const FFMPEG_BIN = 'ffmpeg';

/** The VM has no /tmp: the only writable disk is the scratch disk, which is the task's HOME. */
export const SCRATCH_HOME_FALLBACK = '/mnt/scratch';
export const HLS_SUBDIR = 'hls';
export const PLAYLIST_FILE = 'index.m3u8';

/** hls.js is served from the installed package, so a viewer's browser needs no third-party CDN. */
export const PLAYER_SCRIPT_FILE = 'hls.min.js';
export const HLS_JS_DIST = 'hls.js/dist/hls.min.js';

/** ffmpeg writes MPEG-TS segments for both profiles (an audio-only HLS output is `.ts` too). */
export const MEDIA_TYPES: Readonly<Record<string, string>> = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
};
export const HTML_TYPE = 'text/html; charset=utf-8';
export const SCRIPT_TYPE = 'text/javascript; charset=utf-8';
export const NO_CACHE = 'no-cache';
/** ffmpeg names its files from the playlist stem: `index.m3u8`, `index0.ts`, … */
export const MEDIA_STEM_PATTERN = /^[A-Za-z0-9_-]+$/;
export const READ_METHODS: readonly string[] = ['GET', 'HEAD'];

/** One progress chunk + metric per interval; the last report is always sent. */
export const PROGRESS_EVERY_MS = 2000;
/** How often the player page asks whether the playlist exists yet. */
export const PLAYER_POLL_MS = 2000;
export const STDERR_TAIL_CHARS = 2000;
export const METRIC_STREAMED_SECONDS = 'streamed_seconds';

export const MS_PER_SEC = 1000;
export const US_PER_SEC = 1_000_000;
/** Chunk times are rounded to tenths of a second: enough for a progress bar, short on the wire. */
export const TIME_DECIMALS = 1;

export const STATUS = {
  live: 'live',
  waiting: 'waiting',
  streaming: 'streaming',
  ended: 'ended',
} as const;

export const MESSAGES = {
  progressHandlerFailed: (error: unknown) =>
    `onProgress threw, the stream goes on: ${error instanceof Error ? error.message : String(error)}`,
  badSource: (source: unknown) =>
    `source ${JSON.stringify(source)} must be an https:// URL or an absolute file path (use path.resolve for a relative one)`,
  badProfile: (profile: unknown) => `profile ${JSON.stringify(profile)} must be one of ${PROFILES.join(', ')}`,
  badAfter: (after: unknown) => `after ${JSON.stringify(after)} must be one of ${AFTER_MODES.join(', ')}`,
  badPositive: (name: string, value: unknown) => `${name} ${JSON.stringify(value)} must be a number above 0`,
  badNonNegative: (name: string, value: unknown) => `${name} ${JSON.stringify(value)} must be a number of 0 or more`,
  badHeight: (value: unknown) => `height ${JSON.stringify(value)} must be an integer from 1 to ${HEIGHT_MAX}`,
  badPort: (value: unknown) =>
    `port ${JSON.stringify(value)} must be an integer from ${INBOUND_PORT_MIN} to ${INBOUND_PORT_MAX}`,
  badRoute: (value: unknown) =>
    `route ${JSON.stringify(value)} must start and end with "/", must not be "/", and must match ${ROUTE_PATTERN}`,
  badFunction: (name: string) => `${name} must be a function`,
  lingerNeedsReplay: `lingerSec applies only with after: 'replay'`,
  ffmpegMissing: `ffmpeg is not installed: add it to build.system_packages in task.yaml`,
  ffmpegFailed: (code: number | null, tail: string) => `ffmpeg exited with ${code ?? 'a signal'}: ${tail}`,
  serving: (route: string, port: number, watch: string | null) =>
    `serving ${route} on :${port}${watch === null ? '' : `, public at ${watch}`}`,
  waiting: (sec: number) => `streaming starts in ${sec} s`,
  ended: (replayUntil: string) => `stream ended; serving the replay until ${replayUntil}`,
  replayUntilCancel: 'run:cancel',
  replayUntilLinger: (sec: number) => `${sec} s`,
} as const;
