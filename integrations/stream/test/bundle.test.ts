// The platform bundles a task into one file with esbuild and ships no node_modules for pure-JS
// packages. This test does the same and runs the bundle from a folder with no node_modules: the
// player page and hls.js must still be served. No ffmpeg: the task stops itself during the start delay.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const here = fileURLToPath(new URL('.', import.meta.url));
const runtimeSrc = fileURLToPath(new URL('../../../runtime/src/index.ts', import.meta.url));

// Once ready, the task fetches the page and the script from its own server, then aborts the stream.
const TASK = `
import { stream } from '../src/index.ts';
const port = Number(process.env.PORT);
const stop = new AbortController();
let fetched = Promise.resolve(null);
const get = (file) => fetch('http://127.0.0.1:' + port + '/live/' + file)
  .then(async (r) => [r.status, (await r.arrayBuffer()).byteLength]);
const ctx = {
  secrets: {}, callback: null, chunk() {}, metric() {},
  ready() {
    fetched = Promise.all([get(''), get('hls.min.js')]).finally(() => stop.abort());
  },
};
const result = await stream(ctx, { source: '/none.mp4', port, signal: stop.signal, startDelaySec: 60 });
console.log(JSON.stringify({ result, fetched: await fetched }));
`;

const freePort = (): Promise<number> =>
  new Promise((resolve) => {
    const probe = createServer().listen(0, () => {
      const address = probe.address();
      probe.close(() => resolve(typeof address === 'object' && address !== null ? address.port : 0));
    });
  });

describe('stream bundled into one file, run without node_modules', () => {
  let work = '';

  beforeAll(async () => {
    work = await mkdtemp(join(tmpdir(), 'stream-bundle-'));
  });
  afterAll(async () => {
    await rm(work, { recursive: true, force: true });
  });

  it('serves the player page and the embedded hls.js', async () => {
    const bundle = join(work, 'task.mjs');
    await build({
      stdin: { contents: TASK, resolveDir: here, loader: 'js', sourcefile: 'task.mjs' },
      outfile: bundle,
      bundle: true,
      format: 'esm',
      platform: 'node',
      target: 'node22',
      alias: { '@ignitify-integrations/runtime': runtimeSrc },
      logLevel: 'silent',
    });

    const port = await freePort();
    const stdout = execFileSync(process.execPath, [bundle], {
      cwd: work,
      env: { PATH: process.env.PATH, HOME: work, PORT: String(port) },
      encoding: 'utf8',
    });
    const { result, fetched } = JSON.parse(stdout.trim().split('\n').at(-1) ?? '{}');

    const hls = readFileSync(createRequire(import.meta.url).resolve('hls.js/dist/hls.min.js'));
    expect(fetched).toEqual([
      [200, expect.any(Number)],
      [200, hls.byteLength],
    ]);
    expect(result).toEqual({ success: true, cancelled: true, stage: 'before-stream' });
  });
});
