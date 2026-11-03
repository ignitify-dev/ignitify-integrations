# telegram

> **Status:** draft — not published.

Run a Telegram bot from a task: send messages and files, and answer messages while the run lasts.

This integration is **settings + code**. The settings allow `api.telegram.org` and the bot token secret. The code is what a bot needs to stay safe and alive inside a run:

- the token never shows in an error;
- a `429` waits for you;
- a send is never repeated by a retry;
- a cancel stops the work;
- long text is split;
- files stream from and to the scratch disk.

Every Bot API method is one typed `call`.

## Add it

```bash
ignitify integration:add telegram --task report
ignitify secret:set TELEGRAM_BOT_TOKEN --stdin
```

The plan adds the secret name `TELEGRAM_BOT_TOKEN` and an egress network limited to `api.telegram.org`. You add only the secret value (the `secret:set` line above).

Create the bot first: Telegram's docs show how ([create a bot](https://core.telegram.org/bots/features#creating-a-new-bot)). You also need the chat id to send to.

## Use it

Send a message:

```ts
import { telegram } from '@ignitify-integrations/telegram';

// payload: { "chat_id": 123456789, "text": "Report ready" }
export async function run(payload, ctx) {
  const tg = telegram(ctx);
  const sent = await tg.sendText(payload.chat_id, payload.text);
  if (!sent.ok) throw new Error(sent.error.message); // the message never holds the token
  return { message_ids: sent.value.map((m) => m.message_id) };
}
```

| Call                                           | Does                                                                                                                                                                                 |
| :--------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `telegram(ctx, { token?, environment? })`      | Reads the `TELEGRAM_BOT_TOKEN` secret. Throws a clear error when it is missing or malformed                                                                                          |
| `call(method, params, { signal? })` → `Result` | Any Bot API method, typed: `sendPhoto`, `editMessageText`, `answerCallbackQuery`, `setMyCommands`, … On failure, `error.kind` is `api`, `network`, `timeout`, `aborted` or `invalid` |
| `sendText(chatId, text, options?)` → `Result`  | Sends text of any length. Plain text is split at 4096 characters and sent in order. Formatted text (`parse_mode`) goes as one message                                                |
| `fromDisk(path, filename?)`                    | A file to upload, for any file field: `{ document: fromDisk(path) }`. It is streamed, never read into memory. Albums work too                                                        |
| `download(fileId, toPath)` → `Result`          | Saves a file a user sent (at most 20 MB) to the scratch disk                                                                                                                         |
| `updates({ mode: 'poll', allowedUpdates? })`   | The bot's updates, one by one, until the run stops                                                                                                                                   |
| `escapeMarkdownV2(text)`, `escapeHtml(text)`   | Make user text safe inside a `parse_mode` message                                                                                                                                    |

A call returns a `Result`: check `ok`, then use `value` or `error`. When Telegram asks the bot to slow down (`429`), the call waits up to 30 s and sends again. A longer wait comes back as `error.retryAfterSec`.

A bot that answers messages runs as a long task. Add these lines to `task.yaml`:

```yaml
execution:
  duration: long
  interaction: continuous
```

```ts
import { escapeHtml, telegram } from '@ignitify-integrations/telegram';

export async function run(payload, ctx) {
  const tg = telegram(ctx);
  for await (const update of tg.updates({ mode: 'poll', allowedUpdates: ['message'] })) {
    const message = update.message;
    if (message?.text === '/stop') break;
    if (message?.text !== undefined)
      await tg.sendText(message.chat.id, `<b>You said:</b> ${escapeHtml(message.text)}`, { parse_mode: 'HTML' });
  }
  return { stopped: true };
}
```

The loop ends when the run is cancelled, and `run` returns. The caller sees `{ status: 'listening' }`, then `{ status: 'receiving', updates }` at most every 5 s.

## Grow your task

- **Send a file.** `call('sendDocument', { chat_id, document: fromDisk(path), caption })`. For a file over 50 MB, upload it with [`s3-storage`](https://github.com/ignitify-dev/ignitify-integrations/tree/master/integrations/s3-storage) and send the link.
- **Buttons.** Pass `reply_markup` to `sendText`; it goes on the last part. Answer the press with `call('answerCallbackQuery', { callback_query_id })`.
- **Announce a live stream.** With [`stream`](https://github.com/ignitify-dev/ignitify-integrations/tree/master/integrations/stream), get the viewer link with `watchUrl(ctx)` and send it before you call `stream()`.
- **Two bots in one task.** Declare a second secret name in `task.yaml` (for example `OPS_TELEGRAM_BOT_TOKEN`) and pass it: `telegram(ctx, { token: ctx.secrets.OPS_TELEGRAM_BOT_TOKEN })`.
- **A router from a bot library.** Feed each update from `updates()` to your library's handler, for example grammY's `bot.handleUpdate(update)`.
- **Tell someone when a long task ends.** Do the work, then send one message at the end of `run()`. Send a second message from a `catch` block when the work fails.

## Limits

- **One poller per bot.** A second run that polls the same bot, or a webhook on it, makes `updates()` throw (Telegram answers `409`). Call `deleteWebhook` once to switch from a webhook.
- **The last update can come twice.** An update is confirmed when you take the next one or leave the loop. When the run is cancelled while you handle one, the next run gets it again. If your code throws on an update, that update is confirmed and not delivered again.
- **A cancel stops calls.** During a call, a cancel (SIGTERM) makes the call return `kind: 'aborted'` instead of ending the process at once. Return from `run` when you see it.
- **Downloads** are at most 20 MB, and **uploads** at most 50 MB (the Bot API's limits).
- **Formatted text is not split.** With `parse_mode`, keep the text under 4096 characters yourself.
- **Webhook mode** is not in this version. It is planned for the next one.
- The platform cannot yet **start** a run from a Telegram message. A bot that answers messages must already be running.
