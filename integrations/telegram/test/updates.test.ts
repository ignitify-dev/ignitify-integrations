// The poll loop against the fake Bot API. Clock, sleep and the process stop are injected.

import type { Update } from '@grammyjs/types';
import type { ProcessStop } from '@ignitify-integrations/runtime';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { METRIC_UPDATES, POLL_BACKOFF_BASE_MS } from '../src/constants.js';
import { telegram, type TelegramOptions } from '../src/index.js';
import { failed, fakeBotApi, jsonOf, success, type FakeBotApi, type Recorded, type Reply } from './fake-bot-api.js';

const TOKEN = '123456:SECRET-token_value';

const update = (id: number): Update =>
  ({ update_id: id, message: { message_id: id, date: 0, chat: { id: 1, type: 'private' }, text: `m${id}` } }) as Update;

let api: FakeBotApi | undefined;
let stopController = new AbortController();
let releases = 0;
const waits: number[] = [];
const chunks: unknown[] = [];
const metrics: (readonly [string, number])[] = [];

const ctx = {
  secrets: { TELEGRAM_BOT_TOKEN: TOKEN },
  chunk: (data: unknown) => void chunks.push(data),
  metric: (name: string, value: number) => void metrics.push([name, value]),
};
const stop = (): ProcessStop => ({ signal: stopController.signal, release: () => void (releases += 1) });
const sleep = async (ms: number, signal: AbortSignal): Promise<void> => {
  waits.push(ms);
  if (signal.aborted) throw new Error('aborted');
};

const bot = async (script: (request: Recorded, index: number) => Reply, options: TelegramOptions = {}) => {
  api = await fakeBotApi(script);
  return telegram(ctx, { apiRoot: api.root, ...options }, { sleep, stop, now: () => 0 });
};

/** Answer each long poll with the next batch, then hold it open. A short pull (the confirm) gets []. */
const batches = (...list: readonly (readonly Update[])[]) => {
  let next = 0;
  return (request: Recorded): Reply => {
    if (jsonOf(request)['timeout'] === 0 && jsonOf(request)['offset'] !== -1) return success([]);
    const batch = list[next];
    next += 1;
    return batch === undefined ? { hold: true } : success(batch);
  };
};

const ids = (list: readonly Update[]): number[] => list.map((u) => u.update_id);

beforeEach(() => {
  stopController = new AbortController();
  releases = 0;
  waits.length = 0;
  chunks.length = 0;
  metrics.length = 0;
});
afterEach(async () => {
  await api?.close();
  api = undefined;
});

describe('updates (poll)', () => {
  it('yields in order, confirms with offset = last + 1, and confirms the last one on break', async () => {
    const tg = await bot(batches([update(1), update(2)], [update(3)]));
    const seen: Update[] = [];
    for await (const u of tg.updates({ mode: 'poll' })) {
      seen.push(u);
      if (seen.length === 3) break;
    }
    expect(ids(seen)).toEqual([1, 2, 3]);
    const bodies = api?.requests.map(jsonOf) ?? [];
    expect(bodies.map((b) => b['offset'])).toEqual([undefined, 3, 4]);
    expect(bodies[0]).toMatchObject({ limit: 100, timeout: 30 });
    expect(bodies[2]).toMatchObject({ offset: 4, limit: 1, timeout: 0 });
    expect(releases).toBeGreaterThan(0);
  });

  it('ends the loop when stopped, without an error', async () => {
    const controller = new AbortController();
    const tg = await bot(batches([update(1)]));
    const seen: Update[] = [];
    for await (const u of tg.updates({ mode: 'poll', signal: controller.signal })) {
      seen.push(u);
      controller.abort();
    }
    expect(ids(seen)).toEqual([1]);
  });

  it('ends the loop on a cancel in the middle of a batch, and does not confirm', async () => {
    const tg = await bot(batches([update(1), update(2)]));
    const seen: Update[] = [];
    for await (const u of tg.updates({ mode: 'poll' })) {
      seen.push(u);
      stopController.abort();
    }
    expect(ids(seen)).toEqual([1]);
    expect(api?.requests).toHaveLength(1);
  });

  it('confirms the update the consumer threw on', async () => {
    const tg = await bot(batches([update(5)]));
    const loop = async () => {
      for await (const u of tg.updates({ mode: 'poll' })) throw new Error(`failed on ${u.update_id}`);
    };
    await expect(loop()).rejects.toThrow('failed on 5');
    expect(api?.requests.map(jsonOf).at(-1)).toMatchObject({ offset: 6, limit: 1, timeout: 0 });
  });

  it('ends the loop on SIGTERM', async () => {
    const tg = await bot(batches([update(1)]));
    const seen: Update[] = [];
    for await (const u of tg.updates({ mode: 'poll' })) {
      seen.push(u);
      stopController.abort();
    }
    expect(ids(seen)).toEqual([1]);
  });

  it('throws a clear, redacted error on 409', async () => {
    const tg = await bot(() => failed(409, `Conflict: terminated by other getUpdates request /bot${TOKEN}`));
    const loop = async () => {
      for await (const _ of tg.updates({ mode: 'poll' })) void _;
    };
    await expect(loop()).rejects.toThrow(/only one poller per bot/);
    await expect(loop()).rejects.not.toThrow(TOKEN);
  });

  it('backs off after a server error, then goes on', async () => {
    const tg = await bot(
      ((rest) => (request: Recorded, i: number) => (i === 0 ? failed(502, 'Bad Gateway') : rest(request)))(
        batches([update(7)]),
      ),
      {
        retryMax: 0,
      },
    );
    for await (const u of tg.updates({ mode: 'poll' })) {
      expect(u.update_id).toBe(7);
      break;
    }
    expect(waits).toEqual([POLL_BACKOFF_BASE_MS]);
  });

  it('skips pending updates when asked, without touching a webhook', async () => {
    const tg = await bot(batches([update(41)], [update(42)]));
    for await (const u of tg.updates({ mode: 'poll', dropPending: true, allowedUpdates: ['message'] })) {
      expect(u.update_id).toBe(42);
      break;
    }
    const bodies = api?.requests.map(jsonOf) ?? [];
    expect(api?.requests.every((r) => r.path.endsWith('/getUpdates'))).toBe(true);
    expect(bodies[0]).toMatchObject({ offset: -1, limit: 1 });
    expect(bodies[1]).toMatchObject({ offset: 42, allowed_updates: ['message'] });
  });

  it('reports listening, a throttled receiving count and a metric', async () => {
    const tg = await bot(batches([update(1), update(2)]));
    const seen: Update[] = [];
    for await (const u of tg.updates({ mode: 'poll' })) {
      seen.push(u);
      if (seen.length === 2) break;
    }
    expect(chunks).toEqual([{ status: 'listening' }, { status: 'receiving', updates: 1 }]);
    expect(metrics).toEqual([[METRIC_UPDATES, 2]]);
  });
});
