# greenhouse

> **Status:** draft — not published.

Let a task read Greenhouse candidates, jobs and applications.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Greenhouse with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add greenhouse --task my-task
ignitify secret:set GREENHOUSE_API_KEY --stdin
```

The plan adds the secret names `GREENHOUSE_API_KEY` and an egress network limited to `harvest.greenhouse.io`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Greenhouse docs](https://developers.greenhouse.io/harvest.html).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "per_page": 10 }
export async function run(payload, ctx) {
  const res = await fetch(`https://harvest.greenhouse.io/v1/candidates?per_page=${payload.per_page}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${ctx.secrets.GREENHOUSE_API_KEY}:`).toString('base64')}` },
  });
  if (!res.ok) throw new Error(`Greenhouse answered ${res.status}`);
  return { ids: (await res.json()).map((c) => c.id) };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **New-hire checklist.** Read new employees, create their onboarding tasks in [`asana`](../asana/README.md) or [`jira`](../jira/README.md), and post a welcome to [`slack`](../slack/README.md).
- **Recruiting digest.** Count candidates for each stage and post the numbers to [`microsoft-teams`](../microsoft-teams/README.md) or [`slack`](../slack/README.md).
- **Access follow-up.** When a person leaves, deactivate them in [`okta`](../okta/README.md) or [`microsoft-entra-id`](../microsoft-entra-id/README.md).
- **Receive Greenhouse events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/04-inbound-and-webhooks.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Greenhouse event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
