# cloudflare

> **Status:** draft — not published.

Let a task manage Cloudflare DNS records, cache and Workers.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Cloudflare with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add cloudflare --task my-task
ignitify secret:set CLOUDFLARE_API_TOKEN --stdin
```

The plan adds the secret names `CLOUDFLARE_API_TOKEN` and an egress network limited to `api.cloudflare.com`. There is nothing for you to add.

Get the credentials first: [Cloudflare docs](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "zone_id": "...", "files": ["https://example.com/report.html"] }
export async function run(payload, ctx) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${payload.zone_id}/purge_cache`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.secrets.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: payload.files }),
  });
  if (!res.ok) throw new Error(`Cloudflare answered ${res.status}`);
  return { success: (await res.json()).success };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Repository report.** Count open pull requests or failed pipelines and post the list to [`slack`](../slack/README.md).
- **Keep build output.** Upload artefacts with [`s3-storage`](../s3-storage/README.md) and link them in an issue or release.
- **Track errors.** Open an issue for each new [`sentry`](../sentry/README.md) issue above a threshold.
- **Store files on R2.** R2 speaks the S3 API: use [`s3-storage`](../s3-storage/README.md) with your R2 endpoint.
- **Receive Cloudflare events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Cloudflare event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
