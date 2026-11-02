# google-chat

> **Status:** draft — not published.

Let a task post messages to a Google Chat space through an incoming webhook.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Google Chat with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add google-chat --task my-task
ignitify secret:set GOOGLE_CHAT_WEBHOOK_URL --stdin
```

The plan adds the secret names `GOOGLE_CHAT_WEBHOOK_URL` and an egress network limited to `chat.googleapis.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Google Chat docs](https://developers.google.com/workspace/chat/quickstart/webhooks).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "text": "Report ready" }
export async function run(payload, ctx) {
  const res = await fetch(ctx.secrets.GOOGLE_CHAT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ text: payload.text }),
  });
  if (!res.ok) throw new Error(`Google Chat answered ${res.status}`);
  return { name: (await res.json()).name };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Tell people when a long task ends.** Send one message at the end of `run()`, and a second one from a `catch` block when the work fails.
- **Send a link to a big result.** A task result is at most 10 KiB. Upload the file with [`s3-storage`](../s3-storage/README.md) and send the link.
- **Post a digest from another service.** Read open issues from [`github`](../github/README.md) or new deals from [`hubspot`](../hubspot/README.md), then post one line for each.
- **Receive Google Chat events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Google Chat event. A task that receives webhooks must already be running.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The webhook URL holds its key. Do not log it or put it in errors.
