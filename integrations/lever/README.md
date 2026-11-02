# lever

> **Status:** draft — not published.

Let a task read Lever opportunities, postings and candidates.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Lever with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add lever --task my-task
ignitify secret:set LEVER_API_KEY --stdin
```

The plan adds the secret names `LEVER_API_KEY` and an egress network limited to `api.lever.co`, `api.sandbox.lever.co`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Lever docs](https://hire.lever.co/developer/documentation).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "limit": 10 }
export async function run(payload, ctx) {
  const res = await fetch(`https://api.lever.co/v1/opportunities?limit=${payload.limit}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${ctx.secrets.LEVER_API_KEY}:`).toString('base64')}` },
  });
  if (!res.ok) throw new Error(`Lever answered ${res.status}`);
  return { ids: (await res.json()).data.map((o) => o.id) };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **New-hire checklist.** Read new employees, create their onboarding tasks in [`asana`](../asana/README.md) or [`jira`](../jira/README.md), and post a welcome to [`slack`](../slack/README.md).
- **Recruiting digest.** Count candidates for each stage and post the numbers to [`microsoft-teams`](../microsoft-teams/README.md) or [`slack`](../slack/README.md).
- **Access follow-up.** When a person leaves, deactivate them in [`okta`](../okta/README.md) or [`microsoft-entra-id`](../microsoft-entra-id/README.md).
- **Receive Lever events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/04-inbound-and-webhooks.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Lever event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
