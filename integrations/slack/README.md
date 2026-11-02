# slack

> **Status:** draft — not published.

Let a task post messages and files to Slack channels and people.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Slack with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add slack --task my-task
ignitify secret:set SLACK_BOT_TOKEN --stdin
```

The plan adds the secret names `SLACK_BOT_TOKEN` and an egress network limited to `slack.com`, `files.slack.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Slack docs](https://api.slack.com/authentication/basics).

## Use it

`npm install @slack/web-api`, then:

```ts
import { WebClient } from '@slack/web-api';

// payload: { "channel": "C0123456789", "text": "Report ready" }
export async function run(payload, ctx) {
  const slack = new WebClient(ctx.secrets.SLACK_BOT_TOKEN);
  const sent = await slack.chat.postMessage({ channel: payload.channel, text: payload.text });
  return { ts: sent.ts };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Tell people when a long task ends.** Send one message at the end of `run()`, and a second one from a `catch` block when the work fails.
- **Send a link to a big result.** A task result is at most 10 KiB. Upload the file with [`s3-storage`](../s3-storage/README.md) and send the link.
- **Post a digest from another service.** Read open issues from [`github`](../github/README.md) or new deals from [`hubspot`](../hubspot/README.md), then post one line for each.
- **Receive Slack events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Slack event. A task that receives webhooks must already be running.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
