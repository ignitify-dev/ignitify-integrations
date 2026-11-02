# asana

> **Status:** draft — not published.

Let a task create and update Asana tasks and read projects.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Asana with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add asana --task my-task
ignitify secret:set ASANA_ACCESS_TOKEN --stdin
```

The plan adds the secret names `ASANA_ACCESS_TOKEN` and an egress network limited to `app.asana.com`. There is nothing for you to add.

Get the credentials first: [Asana docs](https://developers.asana.com/docs/personal-access-token).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "project_id": "1200000000000000", "name": "Check the report" }
export async function run(payload, ctx) {
  const res = await fetch('https://app.asana.com/api/1.0/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.secrets.ASANA_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { name: payload.name, projects: [payload.project_id] } }),
  });
  if (!res.ok) throw new Error(`Asana answered ${res.status}`);
  return { gid: (await res.json()).data.gid };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Open an issue when a run fails.** Create it from the `catch` block, with the error text and no secrets.
- **Daily digest.** List the items due today and post them to [`slack`](../slack/README.md) or [`microsoft-teams`](../microsoft-teams/README.md).
- **Tasks from a form.** Create one item for each new [`typeform`](../typeform/README.md) response.
- **Receive Asana events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Asana event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
