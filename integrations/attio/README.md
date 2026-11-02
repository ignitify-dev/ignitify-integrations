# attio

> **Status:** draft — not published.

Let a task read and write Attio records and lists.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Attio with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add attio --task my-task
ignitify secret:set ATTIO_API_KEY --stdin
```

The plan adds the secret names `ATTIO_API_KEY` and an egress network limited to `api.attio.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Attio docs](https://docs.attio.com/rest-api/overview).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "object": "people", "limit": 10 }
export async function run(payload, ctx) {
  const res = await fetch(`https://api.attio.com/v2/objects/${payload.object}/records/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.secrets.ATTIO_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit: payload.limit }),
  });
  if (!res.ok) throw new Error(`Attio answered ${res.status}`);
  return { ids: (await res.json()).data.map((r) => r.id.record_id) };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Enrich records.** Read new records, classify them with [`openai`](../openai/README.md) or [`anthropic`](../anthropic/README.md), and write the label back.
- **Push leads in.** Create a record for each new [`typeform`](../typeform/README.md) response.
- **Report to the team.** Post a short pipeline summary to [`slack`](../slack/README.md).
- **Receive Attio events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/04-inbound-and-webhooks.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Attio event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
