// The shell: HTTP server, ffmpeg child process, stop signal. Every decision it acts on comes from
// the pure modules (options, ffmpeg-args, progress, routes).

import { spawn } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { unwrap, type TaskCtx } from '@ignitify-integrations/runtime';
import {
  FFMPEG_BIN,
  HLS_SUBDIR,
  HTML_TYPE,
  MESSAGES,
  METRIC_STREAMED_SECONDS,
  MS_PER_SEC,
  NO_CACHE,
  PLAYLIST_FILE,
  READ_METHODS,
  SCRATCH_HOME_FALLBACK,
  SCRIPT_TYPE,
  STATUS,
  STDERR_TAIL_CHARS,
} from './constants.js';
import { ffmpegArgs, type StreamPaths } from './ffmpeg-args.js';
import { PLAYER_SCRIPT } from './player-script.generated.js';
import { parseOptions, type StreamConfig, type StreamOptions } from './options.js';
import { PROGRESS_START, parseProgress, roundTime, shouldEmit, type ProgressReport } from './progress.js';
import { playerPage, resolveRoute, viewerUrl } from './routes.js';

export type StreamResult =
  | { readonly success: true; readonly cancelled: true; readonly stage: 'before-stream' }
  | {
      readonly success: true;
      readonly cancelled: boolean;
      readonly stage: 'streamed';
      readonly watch: string | null;
      /** Seconds of output ffmpeg wrote (its last progress report). */
      readonly streamed_s: number;
      /** `null` for the audio profile. */
      readonly height: number | null;
      /** From the start of ffmpeg to the end of the run, replay included. */
      readonly wall_ms: number;
    };

const STOP_SIGNALS = ['SIGTERM', 'SIGINT'] as const;
const NOT_FOUND = 404;
const NOT_ALLOWED = 405;
const OK = 200;

// A run:cancel arrives as SIGTERM. Node's default would exit at once and leave ffmpeg running,
// so stream() takes the signal over for the length of the stream, then gives it back.
const processStop = (): { readonly signal: AbortSignal; readonly release: () => void } => {
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  STOP_SIGNALS.forEach((s) => process.once(s, abort));
  return { signal: controller.signal, release: () => STOP_SIGNALS.forEach((s) => process.off(s, abort)) };
};

const whenAborted = (signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal.aborted) resolve();
    else signal.addEventListener('abort', () => resolve(), { once: true });
  });

/** Wait `sec`, or less if the stop comes first. The only rejection of an aborted sleep is the abort. */
const sleepUnlessStopped = (sec: number, signal: AbortSignal): Promise<void> =>
  sleep(sec * MS_PER_SEC, undefined, { signal }).catch(() => undefined);

const hlsPaths = (): StreamPaths => {
  const hlsDir = join(process.env.HOME || SCRATCH_HOME_FALLBACK, HLS_SUBDIR);
  return { hlsDir, playlist: join(hlsDir, PLAYLIST_FILE) };
};

// Embedded at build time from the installed hls.js (scripts/embed-player-script.mjs), so it travels
// inside a bundled task: the VM has no node_modules for pure-JS packages. Never a CDN.
const playerScript = Buffer.from(PLAYER_SCRIPT);

const handler =
  (route: string, player: string, script: Buffer, hlsDir: string) =>
  (req: IncomingMessage, res: ServerResponse): void => {
    if (!READ_METHODS.includes(req.method ?? '')) {
      res.writeHead(NOT_ALLOWED, { allow: READ_METHODS.join(', ') }).end();
      return;
    }
    // Split, not `new URL`: a malformed request line must not throw inside the server.
    const path = (req.url ?? '').split(/[?#]/, 1)[0] ?? '';
    const r = resolveRoute(path, route);
    if (r.kind === 'player') res.writeHead(OK, { 'content-type': HTML_TYPE }).end(player);
    else if (r.kind === 'script') res.writeHead(OK, { 'content-type': SCRIPT_TYPE }).end(script);
    else if (r.kind === 'none') res.writeHead(NOT_FOUND).end();
    else
      readFile(join(hlsDir, r.name)).then(
        (body) => res.writeHead(OK, { 'content-type': r.type, 'cache-control': NO_CACHE }).end(body),
        () => res.writeHead(NOT_FOUND).end(),
      );
  };

const listen = (server: Server, port: number): Promise<void> =>
  new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => {
      server.off('error', reject);
      resolve();
    });
  });

const close = (server: Server): Promise<void> =>
  new Promise((resolve) => {
    server.close(() => resolve());
    server.closeAllConnections();
  });

interface EngineExit {
  readonly code: number | null;
  readonly stderrTail: string;
  readonly streamedSec: number;
}

// Runs ffmpeg to its end. Progress → onProgress (every report) and chunk + metric (throttled).
const runEngine = (
  ctx: TaskCtx,
  config: StreamConfig,
  args: readonly string[],
  signal: AbortSignal,
): Promise<EngineExit> =>
  new Promise((resolve, reject) => {
    const ff = spawn(FFMPEG_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const kill = (): void => void ff.kill('SIGTERM');
    signal.addEventListener('abort', kill, { once: true });

    let progress = PROGRESS_START;
    let lastEmitMs: number | null = null;
    let streamedSec = 0;
    let tail = '';
    const report = (r: ProgressReport): void => {
      streamedSec = r.doneSec;
      // Best-effort: the tenant's progress handler is observability and must never stop the stream.
      try {
        config.onProgress?.(r);
      } catch (error) {
        console.error(MESSAGES.progressHandlerFailed(error));
      }
      const now = Date.now();
      if (!shouldEmit(r, lastEmitMs, now)) return;
      lastEmitMs = now;
      ctx.chunk({ status: STATUS.streaming, time_s: roundTime(r.doneSec), of_s: config.seconds, speed: r.speed });
      ctx.metric(METRIC_STREAMED_SECONDS, r.doneSec, 'gauge');
    };
    ff.stdout.setEncoding('utf8').on('data', (text: string) => {
      const parsed = parseProgress(progress, text);
      progress = parsed.state;
      parsed.reports.forEach(report);
    });
    ff.stderr.setEncoding('utf8').on('data', (text: string) => {
      console.error(text.trimEnd());
      tail = (tail + text).slice(-STDERR_TAIL_CHARS);
    });
    ff.once('error', (e: NodeJS.ErrnoException) => {
      signal.removeEventListener('abort', kill);
      reject(e.code === 'ENOENT' ? new Error(MESSAGES.ffmpegMissing) : e);
    });
    ff.once('close', (code) => {
      signal.removeEventListener('abort', kill);
      resolve({ code, stderrTail: tail.trim(), streamedSec });
    });
  });

/**
 * Serve a live HLS stream of `options.source` from this task: player page, playlist, viewer URL,
 * progress, stop on cancel. Throws on bad options and when ffmpeg fails.
 */
export async function stream(ctx: TaskCtx, options: StreamOptions): Promise<StreamResult> {
  const config = unwrap(parseOptions(options));
  const stop = options.signal === undefined ? processStop() : { signal: options.signal, release: () => undefined };
  const { signal } = stop;
  const paths = hlsPaths();

  await rm(paths.hlsDir, { recursive: true, force: true });
  await mkdir(paths.hlsDir, { recursive: true });

  const server = createServer(handler(config.route, playerPage(config.route), playerScript, paths.hlsDir));
  try {
    await listen(server, config.port);
    ctx.ready();

    const watch = viewerUrl(ctx.callback?.url ?? null, config.route);
    ctx.chunk({ status: STATUS.live, watch, playlist: watch === null ? null : `${watch}${PLAYLIST_FILE}` });
    console.log(MESSAGES.serving(config.route, config.port, watch));

    // Serve the player first, so a viewer can open the link before the stream starts.
    if (config.startDelaySec > 0) {
      ctx.chunk({ status: STATUS.waiting, start_in_s: config.startDelaySec, watch });
      console.log(MESSAGES.waiting(config.startDelaySec));
      await sleepUnlessStopped(config.startDelaySec, signal);
    }
    if (signal.aborted) return { success: true, cancelled: true, stage: 'before-stream' };

    const started = Date.now();
    const exit = await runEngine(ctx, config, ffmpegArgs(config, paths), signal);
    // ffmpeg exits non-zero when it is stopped; that is a cancel, not a failure.
    if (exit.code !== 0 && !signal.aborted) throw new Error(MESSAGES.ffmpegFailed(exit.code, exit.stderrTail));

    if (!signal.aborted && config.after === 'replay') {
      const until =
        config.lingerSec === null ? MESSAGES.replayUntilCancel : MESSAGES.replayUntilLinger(config.lingerSec);
      ctx.chunk({ status: STATUS.ended, replay_until: until, watch });
      console.log(MESSAGES.ended(until));
      await (config.lingerSec === null ? whenAborted(signal) : sleepUnlessStopped(config.lingerSec, signal));
    }
    return {
      success: true,
      cancelled: signal.aborted,
      stage: 'streamed',
      watch,
      streamed_s: roundTime(exit.streamedSec),
      height: config.profile === 'video' ? config.height : null,
      wall_ms: Date.now() - started,
    };
  } finally {
    await close(server);
    stop.release();
  }
}
