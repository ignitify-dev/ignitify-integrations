# pandadoc

> **Status:** draft — not published.

Let a task create documents from templates and send them for signature in PandaDoc.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call PandaDoc with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add pandadoc --task my-task
ignitify secret:set PANDADOC_API_KEY --stdin
```

The plan adds the secret names `PANDADOC_API_KEY` and an egress network limited to `api.pandadoc.com`. There is nothing for you to add.

Get the credentials first: [PandaDoc docs](https://developers.pandadoc.com/reference/about).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "count": 10 }
export async function run(payload, ctx) {
  const res = await fetch(`https://api.pandadoc.com/public/v1/documents?count=${payload.count}`, {
    headers: { Authorization: `API-Key ${ctx.secrets.PANDADOC_API_KEY}` },
  });
  if (!res.ok) throw new Error(`PandaDoc answered ${res.status}`);
  return { documents: (await res.json()).results.map((d) => ({ id: d.id, status: d.status })) };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Send a contract from a deal.** Read the deal from [`hubspot`](../hubspot/README.md) or [`salesforce`](../salesforce/README.md), then send the document for signature.
- **Keep signed copies.** Download the signed PDF and upload it with [`s3-storage`](../s3-storage/README.md).
- **Receive PandaDoc events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a PandaDoc event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
