// Thin shell: the poll loop. Every decision is in poll.ts. Delivery is at least once: an update is
// confirmed to Telegram only when the consumer pulls the next one (or leaves the loop).

import type { Update } from '@grammyjs/types';
import type { TaskCtx } from '@ignitify-integrations/runtime';
import type { Client, TelegramDeps } from './client.js';
import { METRIC_UPDATES, POLL_LAST_OFFSET, STATUS } from './constants.js';
import { fatalMessage, nextOffset, pollParams, pollWaitMs, shouldReport, type UpdateType } from './poll.js';

export interface UpdatesOptions {
  readonly mode: 'poll';
  /** Only these update types. Default: what the bot asked for last time. */
  readonly allowedUpdates?: readonly UpdateType[];
  /** Skip the updates that waited while no run was polling. Default false. */
  readonly dropPending?: boolean;
  /** Stop the loop. Without it, the loop stops on SIGTERM and SIGINT. */
  readonly signal?: AbortSignal;
}

type PollCtx = Pick<TaskCtx, 'chunk' | 'metric'>;

export async function* updates(
  ctx: PollCtx,
  client: Client,
  deps: Pick<TelegramDeps, 'sleep' | 'now'>,
  opts: UpdatesOptions,
): AsyncGenerator<Update, void, undefined> {
  const stop = client.acquireStop();
  const signal = opts.signal === undefined ? stop.signal : AbortSignal.any([opts.signal, stop.signal]);
  const call = { signal };
  let offset: number | undefined;
  // The update handed out and not yet confirmed.
  let pending: Update | undefined;
  try {
    // When this first call fails, polling starts without dropping; a 401 or 409 throws on the next pull.
    if (opts.dropPending === true) {
      const last = await client.call('getUpdates', { offset: POLL_LAST_OFFSET, limit: 1, timeout: 0 }, call);
      const newest = last.ok ? (last.value as readonly Update[]).at(-1) : undefined;
      if (newest !== undefined) offset = nextOffset(newest);
    }
    ctx.chunk({ status: STATUS.listening });
    let failures = 0;
    let received = 0;
    let reportedAt: number | null = null;
    while (!signal.aborted) {
      const pulled = await client.call('getUpdates', pollParams(offset, opts.allowedUpdates), call);
      if (!pulled.ok) {
        if (pulled.error.kind === 'aborted') return;
        const fatal = fatalMessage(pulled.error);
        if (fatal !== undefined) throw new Error(fatal);
        failures += 1;
        try {
          await deps.sleep(pollWaitMs(failures, pulled.error), signal);
        } catch {
          return;
        }
        continue;
      }
      failures = 0;
      const batch = pulled.value as readonly Update[];
      if (batch.length > 0) ctx.metric(METRIC_UPDATES, batch.length, 'counter');
      for (const update of batch) {
        pending = update;
        yield update;
        offset = nextOffset(update);
        pending = undefined;
        // A cancel while the consumer handled `update`: stop now. The offset was never sent, so the
        // next run gets this update again (at least once).
        if (signal.aborted) return;
        received += 1;
        if (shouldReport(reportedAt, deps.now())) {
          reportedAt = deps.now();
          ctx.chunk({ status: STATUS.receiving, updates: received });
        }
      }
    }
  } finally {
    // The consumer left the loop after seeing `pending`: confirm it, so the next run does not get it
    // again. Best effort: when this fails, the next run gets it once more (at least once).
    if (pending !== undefined && !signal.aborted)
      await client.call('getUpdates', { offset: nextOffset(pending), limit: 1, timeout: 0 }, call);
    stop.release();
  }
}
