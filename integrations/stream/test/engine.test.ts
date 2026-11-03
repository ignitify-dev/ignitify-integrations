// Engine tests: the real ffmpeg, a real HTTP server, a fake ctx. Every wait is on an event the code
// emits (ready, a chunk) or on the run's own end, never on a timer, so the tests do not race.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TaskCtx } from '@ignitify-integrations/runtime';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { HLS_SUBDIR, METRIC_STREAMED_SECONDS, PLAYLIST_FILE, STATUS } from '../src/constants.js';
import { stream } from '../src/index.js';

const HAS_FFMPEG = spawnSync('ffmpeg', ['-version']).status === 0;
const SOURCE_SEC = 2;
const CALLBACK = 'https://r1--t1.example.dev/__callback/run_1';
const WATCH = 'https://r1--t1.example.dev/live/';

type Event =
  | { readonly type: 'ready' }
  | { readonly type: 'chunk'; readonly data: Record<string, unknown> }
  | { readonly type: 'metric'; readonly name: string; readonly value: number; readonly kind: string | undefined };

interface Hooks {
  readonly onReady?: () => void;
  readonly onChunk?: (data: Record<string, unknown>) => void;
}

const fakeCtx = (callbackUrl: string | null, hooks: Hooks = {}): { ctx: TaskCtx; events: Event[] } => {
  const events: Event[] = [];
  const ctx: TaskCtx = {
    secrets: {},
    ready: () => {
      events.push({ type: 'ready' });
      hooks.onReady?.();
    },
    chunk: (data) => {
      events.push({ type: 'chunk', data: data as Record<string, unknown> });
      hooks.onChunk?.(data as Record<string, unknown>);
    },
    metric: (name, value, kind) => void events.push({ type: 'metric', name, value, kind }),
    callback: callbackUrl === null ? null : { url: callbackUrl, verify: () => false },
  };
  return { ctx, events };
};

const chunks = (events: readonly Event[], status: string) =>
  events.flatMap((e) => (e.type === 'chunk' && e.data.status === status ? [e.data] : []));

const freePort = (): Promise<number> =>
  new Promise((resolve) => {
    const probe = createServer().listen(0, () => {
      const address = probe.address();
      probe.close(() => resolve(typeof address === 'object' && address !== null ? address.port : 0));
    });
  });

/** The distinct stream types in a media file, as ffprobe sees them. */
const streamTypes = (file: string): readonly string[] => [
  ...new Set(
    execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', file])
      .toString()
      .split(/\s+/)
      .filter((t) => t !== ''),
  ),
];

describe.skipIf(!HAS_FFMPEG)('stream with the real ffmpeg (skipped when ffmpeg is not on PATH)', () => {
  let work = '';
  let source = '';
  let hlsDir = '';
  const home = process.env.HOME;

  beforeAll(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    work = await mkdtemp(join(tmpdir(), 'stream-'));
    source = join(work, 'source.mp4');
    hlsDir = join(work, HLS_SUBDIR);
    process.env.HOME = work;
    execFileSync('ffmpeg', [
      ...['-hide_banner', '-loglevel', 'error'],
      ...['-f', 'lavfi', '-i', `testsrc=size=320x240:rate=24:duration=${SOURCE_SEC}`],
      ...['-f', 'lavfi', '-i', `sine=frequency=440:duration=${SOURCE_SEC}`],
      ...['-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-shortest', source],
    ]);
  });

  afterAll(async () => {
    process.env.HOME = home;
    vi.restoreAllMocks();
    await rm(work, { recursive: true, force: true });
  });

  it('video + replay: ready before any media, serves page, hls.js and the stream, stops on the signal', async () => {
    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    const controller = new AbortController();
    let playlistAtReady: boolean | undefined;
    let early: Promise<[Response, Response]> | undefined;
    let replay: Promise<{ playlist: Response; text: string; segment: Response }> | undefined;

    const { ctx, events } = fakeCtx(CALLBACK, {
      onReady: () => {
        playlistAtReady = existsSync(join(hlsDir, PLAYLIST_FILE));
        early = Promise.all([fetch(`${base}/live/`), fetch(`${base}/live/hls.min.js`)]);
      },
      // The replay window is open from the `ended` chunk until the test aborts.
      onChunk: (data) => {
        if (data.status !== STATUS.ended) return;
        replay = (async () => {
          try {
            const playlist = await fetch(`${base}/live/${PLAYLIST_FILE}`);
            const text = await playlist.text();
            const name = text.split('\n').find((line) => line.endsWith('.ts')) ?? 'missing.ts';
            return { playlist, text, segment: await fetch(`${base}/live/${name}`) };
          } finally {
            controller.abort();
          }
        })();
      },
    });

    const result = await stream(ctx, { source, height: 240, port, signal: controller.signal });

    expect(result).toMatchObject({ success: true, cancelled: true, stage: 'streamed', watch: WATCH, height: 240 });
    expect(result.stage === 'streamed' && result.streamed_s).toBeCloseTo(SOURCE_SEC, 0);
    expect(result.stage === 'streamed' && result.wall_ms).toBeGreaterThan(0);

    // ready() comes first, once, while no media exists yet; then the viewer URL.
    expect(playlistAtReady).toBe(false);
    expect(events.filter((e) => e.type === 'ready')).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'ready' });
    expect(events[1]).toEqual({
      type: 'chunk',
      data: { status: STATUS.live, watch: WATCH, playlist: `${WATCH}${PLAYLIST_FILE}` },
    });

    const [page, script] = await early!;
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('/live/hls.min.js');
    expect(script.status).toBe(200);
    expect(script.headers.get('content-type')).toMatch(/javascript/);
    // The embedded copy is the installed hls.js, byte for byte.
    const dist = createRequire(import.meta.url).resolve('hls.js/dist/hls.min.js');
    expect((await script.arrayBuffer()).byteLength).toBe((await stat(dist)).size);

    const { playlist, text, segment } = await replay!;
    expect(playlist.headers.get('content-type')).toBe('application/vnd.apple.mpegurl');
    expect(text).toContain('#EXT-X-PLAYLIST-TYPE:EVENT');
    expect(text).toContain('#EXT-X-ENDLIST');
    expect(segment.status).toBe(200);
    expect(segment.headers.get('content-type')).toBe('video/mp2t');

    // The last progress report is always sent, so the final chunk and metric hold the full length.
    const streaming = chunks(events, STATUS.streaming);
    expect(streaming.at(-1)).toMatchObject({ of_s: null });
    expect(Number(streaming.at(-1)?.time_s)).toBeCloseTo(SOURCE_SEC, 0);
    const metrics = events.filter((e) => e.type === 'metric');
    expect(metrics.every((m) => m.name === METRIC_STREAMED_SECONDS && m.kind === 'gauge')).toBe(true);
    expect(metrics.at(-1)?.value).toBeCloseTo(SOURCE_SEC, 0);

    // The server is closed when stream() returns.
    await expect(fetch(`${base}/live/`)).rejects.toThrow();
  });

  it('a stop during the start delay returns before-stream and never starts ffmpeg', async () => {
    const controller = new AbortController();
    const { ctx, events } = fakeCtx(CALLBACK, {
      onChunk: (data) => data.status === STATUS.waiting && controller.abort(),
    });

    const result = await stream(ctx, { source, startDelaySec: 60, port: await freePort(), signal: controller.signal });

    expect(result).toEqual({ success: true, cancelled: true, stage: 'before-stream' });
    expect(chunks(events, STATUS.streaming)).toEqual([]);
    expect(existsSync(join(hlsDir, PLAYLIST_FILE))).toBe(false);
  });

  it('audio + stop: AAC-only segments, returns at the end of the source, no callback → no viewer URL', async () => {
    const { ctx, events } = fakeCtx(null);

    const result = await stream(ctx, { source, profile: 'audio', after: 'stop', port: await freePort() });

    expect(result).toMatchObject({ success: true, cancelled: false, stage: 'streamed', watch: null, height: null });
    expect(result.stage === 'streamed' && result.streamed_s).toBeCloseTo(SOURCE_SEC, 0);
    expect(chunks(events, STATUS.live)).toEqual([{ status: STATUS.live, watch: null, playlist: null }]);
    expect(chunks(events, STATUS.ended)).toEqual([]);

    const files = await readdir(hlsDir);
    const segments = files.filter((f) => f.endsWith('.ts'));
    expect(files).toContain(PLAYLIST_FILE);
    expect(segments.length).toBeGreaterThan(0);
    expect(await readFile(join(hlsDir, PLAYLIST_FILE), 'utf8')).toContain('#EXT-X-ENDLIST');
    expect(streamTypes(join(hlsDir, segments[0]!))).toEqual(['audio']);
  });

  it('an onProgress handler that throws never stops the stream', async () => {
    const { ctx } = fakeCtx(null);
    const onProgress = (): never => {
      throw new Error('handler bug');
    };

    const result = await stream(ctx, { source, profile: 'audio', after: 'stop', port: await freePort(), onProgress });

    expect(result).toMatchObject({ success: true, cancelled: false, stage: 'streamed' });
  });

  it('throws with the end of ffmpeg stderr when ffmpeg fails', async () => {
    const { ctx } = fakeCtx(null);
    const missing = join(work, 'missing.mp4');

    await expect(stream(ctx, { source: missing, after: 'stop', port: await freePort() })).rejects.toThrow(
      /ffmpeg exited with \d+: [\s\S]*No such file or directory/,
    );
  });
});
