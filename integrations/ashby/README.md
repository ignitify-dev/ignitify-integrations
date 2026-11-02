# ashby

> **Status:** draft — not published.

Let a task read Ashby candidates, jobs and applications.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Ashby with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add ashby --task my-task
ignitify secret:set ASHBY_API_KEY --stdin
```

The plan adds the secret names `ASHBY_API_KEY` and an egress network limited to `api.ashbyhq.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Ashby docs](https://developers.ashbyhq.com/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "limit": 10 }
export async function run(payload, ctx) {
  const res = await fetch('https://api.ashbyhq.com/candidate.list', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${ctx.secrets.ASHBY_API_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ limit: payload.limit }),
  });
  if (!res.ok) throw new Error(`Ashby answered ${res.status}`);
  return { ids: (await res.json()).results.map((c) => c.id) };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **New-hire checklist.** Read new employees, create their onboarding tasks in [`asana`](../asana/README.md) or [`jira`](../jira/README.md), and post a welcome to [`slack`](../slack/README.md).
- **Recruiting digest.** Count candidates for each stage and post the numbers to [`microsoft-teams`](../microsoft-teams/README.md) or [`slack`](../slack/README.md).
- **Access follow-up.** When a person leaves, deactivate them in [`okta`](../okta/README.md) or [`microsoft-entra-id`](../microsoft-entra-id/README.md).
- **Receive Ashby events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/04-inbound-and-webhooks.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Ashby event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
