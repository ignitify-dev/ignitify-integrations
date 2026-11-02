# linkedin

> **Status:** draft — not published.

Let a task publish posts to a LinkedIn member or organization page.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call LinkedIn with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add linkedin --task my-task
ignitify secret:set LINKEDIN_ACCESS_TOKEN --stdin
```

The plan adds the secret names `LINKEDIN_ACCESS_TOKEN` and an egress network limited to `api.linkedin.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [LinkedIn docs](https://learn.microsoft.com/linkedin/marketing/community-management/shares/posts-api).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "author": "urn:li:organization:123", "text": "The weekly report is out." }
export async function run(payload, ctx) {
  const res = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.secrets.LINKEDIN_ACCESS_TOKEN}`,
      'LinkedIn-Version': '202410',
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      author: payload.author,
      commentary: payload.text,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED',
    }),
  });
  if (!res.ok) throw new Error(`LinkedIn answered ${res.status}`);
  return { id: res.headers.get('x-restli-id') };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Post when content is ready.** Publish a post at the end of the run that made the content.
- **Write the post with a model.** Draft the text with [`anthropic`](../anthropic/README.md) or [`openai`](../openai/README.md), then publish it.
- **Weekly reach report.** Read the numbers and append a row to [`google-sheets`](../google-sheets/README.md).
- **Receive LinkedIn events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a LinkedIn event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- A LinkedIn access token expires (60 days by default), and refresh tokens are for approved apps only. Set the secret again when it expires.
