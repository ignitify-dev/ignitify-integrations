# mux

> **Status:** draft — not published.

Let a task upload and stream video with Mux.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Mux with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add mux --task my-task
ignitify secret:set MUX_TOKEN_ID --stdin
ignitify secret:set MUX_TOKEN_SECRET --stdin
```

The plan adds the secret names `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET` and an egress network limited to `api.mux.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Mux docs](https://www.mux.com/docs/core/stream-video-files).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "url": "https://example.com/video.mp4" }
export async function run(payload, ctx) {
  const res = await fetch('https://api.mux.com/video/v1/assets', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${ctx.secrets.MUX_TOKEN_ID}:${ctx.secrets.MUX_TOKEN_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: [{ url: payload.url }], playback_policy: ['public'] }),
  });
  if (!res.ok) throw new Error(`Mux answered ${res.status}`);
  return { asset_id: (await res.json()).data.id };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Meetings from a calendar.** Create a meeting and put the link into a [`google-calendar`](../google-calendar/README.md) event.
- **Share the result.** Post the link to [`slack`](../slack/README.md) when it is ready.
- **Publish a file you made.** Upload the video with [`s3-storage`](../s3-storage/README.md), then give Mux the presigned link as the input URL.
- **Receive Mux events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/04-inbound-and-webhooks.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Mux event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
