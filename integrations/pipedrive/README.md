# pipedrive

> **Status:** draft — not published.

Let a task read and write Pipedrive deals, people and organizations.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Pipedrive with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add pipedrive --task my-task
ignitify secret:set PIPEDRIVE_API_TOKEN --stdin
```

The plan adds the secret names `PIPEDRIVE_API_TOKEN` and an egress network limited to `api.pipedrive.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Pipedrive docs](https://pipedrive.readme.io/docs/core-api-concepts-about-pipedrive-api).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "title": "New deal from the task" }
export async function run(payload, ctx) {
  const res = await fetch('https://api.pipedrive.com/v1/deals', {
    method: 'POST',
    headers: { 'x-api-token': ctx.secrets.PIPEDRIVE_API_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: payload.title }),
  });
  if (!res.ok) throw new Error(`Pipedrive answered ${res.status}`);
  return { id: (await res.json()).data.id };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Enrich records.** Read new records, classify them with [`openai`](../openai/README.md) or [`anthropic`](../anthropic/README.md), and write the label back.
- **Push leads in.** Create a record for each new [`typeform`](../typeform/README.md) response.
- **Report to the team.** Post a short pipeline summary to [`slack`](../slack/README.md).
- **Receive Pipedrive events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Pipedrive event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
