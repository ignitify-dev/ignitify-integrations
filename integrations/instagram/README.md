# instagram

> **Status:** draft — not published.

Let a task publish photos to an Instagram professional account and read insights.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Instagram with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add instagram --task my-task
ignitify secret:set INSTAGRAM_ACCESS_TOKEN --stdin
```

The plan adds the secret names `INSTAGRAM_ACCESS_TOKEN` and an egress network limited to `graph.instagram.com`, `graph.facebook.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Instagram docs](https://developers.facebook.com/docs/instagram-platform/content-publishing).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "ig_user_id": "...", "image_url": "https://example.com/chart.png", "caption": "This week" }
export async function run(payload, ctx) {
  const headers = { Authorization: `Bearer ${ctx.secrets.INSTAGRAM_ACCESS_TOKEN}`, 'Content-Type': 'application/json' };
  const base = `https://graph.instagram.com/v21.0/${payload.ig_user_id}`;
  const container = await (
    await fetch(`${base}/media`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ image_url: payload.image_url, caption: payload.caption }),
    })
  ).json();
  const res = await fetch(`${base}/media_publish`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ creation_id: container.id }),
  });
  if (!res.ok) throw new Error(`Instagram answered ${res.status}`);
  return { id: (await res.json()).id };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Post when content is ready.** Publish a post at the end of the run that made the content.
- **Write the post with a model.** Draft the text with [`anthropic`](../anthropic/README.md) or [`openai`](../openai/README.md), then publish it.
- **Weekly reach report.** Read the numbers and append a row to [`google-sheets`](../google-sheets/README.md).
- **Publish a chart.** Instagram fetches the image from a public URL: upload it with [`s3-storage`](../s3-storage/README.md) and pass the presigned link.
- **Receive Instagram events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/04-inbound-and-webhooks.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Instagram event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
