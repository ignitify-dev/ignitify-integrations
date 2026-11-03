// Thin shell: builds the bot object from ctx, options and effects. Setup errors throw (as in
// `storage()`); every call returns a Result.

import { setTimeout as delay } from 'node:timers/promises';
import type { Message, Update } from '@grammyjs/types';
import { err, ok, processStop, readSecret, unwrap, type Result, type TaskCtx } from '@ignitify-integrations/runtime';
import { createClient, type TelegramDeps } from './client.js';
import { checkToken, endpoints, parseOptions, type TelegramOptions } from './config.js';
import { SECRET_BOT_TOKEN } from './constants.js';
import { download, type Downloaded } from './files.js';
import { splitText } from './text.js';
import { updates, type UpdatesOptions } from './updates.js';
import type { CallOptions, Method, Params, Returns, TelegramError } from './types.js';

/** The `sendMessage` parameters other than the chat and the text, plus a stop signal. */
export type SendTextOptions = Omit<Params<'sendMessage'>, 'chat_id' | 'text'> & CallOptions;

export interface Telegram {
  /** Any Bot API method, typed. Files go in as `fromDisk(path)`. */
  call<M extends Method>(method: M, params: Params<M>, opts?: CallOptions): Promise<Result<Returns<M>, TelegramError>>;
  /**
   * Send text of any length. Plain text is split at Telegram's limit and sent in order, with
   * `reply_parameters` on the first part and `reply_markup` on the last. Formatted text (with
   * `parse_mode` or `entities`) is sent as one message. A failed part sets `partsSent`.
   */
  sendText(
    chatId: number | string,
    text: string,
    opts?: SendTextOptions,
  ): Promise<Result<readonly Message.TextMessage[], TelegramError>>;
  /** Download a file by its `file_id` to `toPath` (at most 20 MB). */
  download(fileId: string, toPath: string, opts?: CallOptions): Promise<Result<Downloaded, TelegramError>>;
  /**
   * The bot's updates, by long polling, until stopped (SIGTERM, SIGINT or `signal`): then the loop
   * ends. Throws a redacted Error when polling cannot go on: a bad token, or another poller or a
   * webhook on this bot (409).
   */
  updates(opts: UpdatesOptions): AsyncIterable<Update>;
}

const defaultDeps: TelegramDeps = {
  fetch: (input, init) => fetch(input, init),
  sleep: (ms, signal) => delay(ms, undefined, { signal }),
  stop: processStop,
  now: Date.now,
};

const callOptions = (signal: AbortSignal | undefined): CallOptions => (signal === undefined ? {} : { signal });

export const telegram = (
  ctx: Pick<TaskCtx, 'secrets' | 'chunk' | 'metric'>,
  options: TelegramOptions = {},
  deps: Partial<TelegramDeps> = {},
): Telegram => {
  const config = unwrap(parseOptions(options));
  const token = unwrap(checkToken(options.token ?? unwrap(readSecret(ctx, SECRET_BOT_TOKEN))));
  const effects: TelegramDeps = { ...defaultDeps, ...deps };
  const client = createClient(endpoints(config, token), token, config, effects);

  const call: Telegram['call'] = async (method, params, opts) =>
    (await client.call(method, params as Readonly<Record<string, unknown>>, opts)) as Result<
      Returns<typeof method>,
      TelegramError
    >;

  const sendText: Telegram['sendText'] = async (chatId, text, opts = {}) => {
    const { signal, reply_markup, reply_parameters, ...rest } = opts;
    const formatted = rest.parse_mode !== undefined || rest.entities !== undefined;
    const parts = formatted ? [text] : splitText(text);
    const sent: Message.TextMessage[] = [];
    for (const [index, part] of parts.entries()) {
      const params = {
        ...rest,
        chat_id: chatId,
        text: part,
        ...(index === 0 && reply_parameters !== undefined ? { reply_parameters } : {}),
        ...(index === parts.length - 1 && reply_markup !== undefined ? { reply_markup } : {}),
      };
      const result = await client.call('sendMessage', params, callOptions(signal));
      if (!result.ok) return err({ ...result.error, partsSent: index });
      sent.push(result.value as Message.TextMessage);
    }
    return ok(sent);
  };

  return {
    call,
    sendText,
    download: (fileId, toPath, opts) => download(client, fileId, toPath, opts),
    updates: (opts) => updates(ctx, client, effects, opts),
  };
};
