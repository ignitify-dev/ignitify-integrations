# telegram

Let a task send Telegram messages: "the report is ready", "the run failed", a link to a result.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you send messages with any Telegram library.

## Add it

```bash
ignitify integration:add telegram --task report
ignitify secret:set TELEGRAM_BOT_TOKEN --stdin
```

The plan adds the secret name `TELEGRAM_BOT_TOKEN` and an egress network limited to `api.telegram.org`. There is nothing for you to add.

You need a bot token and a chat id first. Telegram's own docs show how to get them: [create a bot](https://core.telegram.org/bots/features#creating-a-new-bot).

## Use it

`npm install grammy`, then:

```ts
import { Api } from 'grammy';

// payload: { "chat_id": 123456789, "text": "Report ready" }
export async function run(payload, ctx) {
  const api = new Api(ctx.secrets.TELEGRAM_BOT_TOKEN);
  const sent = await api.sendMessage(payload.chat_id, payload.text);
  return { message_id: sent.message_id };
}
```

With plain `fetch` and no library:

```ts
export async function run(payload, ctx) {
  const url = `https://api.telegram.org/bot${ctx.secrets.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: payload.chat_id, text: payload.text }),
  });
  if (!res.ok) throw new Error(`Telegram answered ${res.status}`); // never put `url` in an error: it holds the token
  return { message_id: (await res.json()).result.message_id };
}
```

Any other Telegram library works the same way: the token comes from `ctx.secrets`, and the host is already allowed.

## Grow your task

- **Tell someone when a long task ends.** Do the work, then send one message at the end of `run()`. Send a second message from a `catch` block when the work fails.
- **Send a link to a big result.** A task result is at most 10 KiB. Upload the file with [`s3-storage`](../s3-storage/README.md) and send the link in the message.
- **Announce a live stream.** With [`stream`](../stream/README.md), get the viewer link with `watchUrl(ctx)` and send it before you call `stream()`.
- **Two bots in one task.** Declare a second secret name in `task.yaml` (for example `OPS_TELEGRAM_BOT_TOKEN`) and create a second `Api` with it.
- **Receive messages.** A bot that answers messages needs a webhook. A long-running task with a bidirectional network can receive one on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- The platform cannot yet **start** a run from a Telegram message. A task that receives messages must already be running.
- The bot token is part of the API URL. Do not log request URLs or put them in errors.
- Telegram limits how fast a bot sends. If you send many messages, wait when Telegram answers `429` (your library can retry for you).
