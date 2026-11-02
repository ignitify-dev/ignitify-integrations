# facebook-pages

> **Status:** draft — not published.

Let a task publish posts to a Facebook Page and read its insights.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Facebook Pages with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add facebook-pages --task my-task
ignitify secret:set FACEBOOK_PAGE_ACCESS_TOKEN --stdin
```

The plan adds the secret names `FACEBOOK_PAGE_ACCESS_TOKEN` and an egress network limited to `graph.facebook.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Facebook Pages docs](https://developers.facebook.com/docs/pages-api/getting-started).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "page_id": "...", "message": "The weekly report is out." }
export async function run(payload, ctx) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${payload.page_id}/feed`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.secrets.FACEBOOK_PAGE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: payload.message }),
  });
  if (!res.ok) throw new Error(`Facebook answered ${res.status}`);
  return { id: (await res.json()).id };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Post when content is ready.** Publish a post at the end of the run that made the content.
- **Write the post with a model.** Draft the text with [`anthropic`](../anthropic/README.md) or [`openai`](../openai/README.md), then publish it.
- **Weekly reach report.** Read the numbers and append a row to [`google-sheets`](../google-sheets/README.md).
- **Receive Facebook Pages events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/04-inbound-and-webhooks.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Facebook Pages event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
