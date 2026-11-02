# youtube

> **Status:** draft — not published.

Let a task upload videos and read channel and video statistics on YouTube.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call YouTube with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add youtube --task my-task
ignitify secret:set GOOGLE_CLIENT_ID --stdin
ignitify secret:set GOOGLE_CLIENT_SECRET --stdin
ignitify secret:set GOOGLE_REFRESH_TOKEN --stdin
```

The plan adds the secret names `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` and an egress network limited to `oauth2.googleapis.com`, `www.googleapis.com`, `youtube.googleapis.com`. There is nothing for you to add.

Get the credentials first: [YouTube docs](https://developers.google.com/youtube/v3/getting-started).

## Use it

`npm install @googleapis/youtube`, then:

```ts
import { auth, youtube } from '@googleapis/youtube';

export async function run(payload, ctx) {
  const client = new auth.OAuth2(ctx.secrets.GOOGLE_CLIENT_ID, ctx.secrets.GOOGLE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: ctx.secrets.GOOGLE_REFRESH_TOKEN });
  const api = youtube({ version: 'v3', auth: client });
  // payload: { "video_id": "dQw4w9WgXcQ" }
  const { data } = await api.videos.list({ part: ['statistics'], id: [payload.video_id] });
  return { views: data.items?.[0]?.statistics?.viewCount };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Post when content is ready.** Publish a post at the end of the run that made the content.
- **Write the post with a model.** Draft the text with [`anthropic`](../anthropic/README.md) or [`openai`](../openai/README.md), then publish it.
- **Weekly reach report.** Read the numbers and append a row to [`google-sheets`](../google-sheets/README.md).
- **Receive YouTube events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a YouTube event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The task gets a new access token from the refresh token on each run. The platform does not store tokens for you.
- The YouTube Data API has a daily quota; an upload costs much more than a read.
