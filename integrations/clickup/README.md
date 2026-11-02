# clickup

> **Status:** draft — not published.

Let a task create and update ClickUp tasks.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call ClickUp with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add clickup --task my-task
ignitify secret:set CLICKUP_API_TOKEN --stdin
```

The plan adds the secret names `CLICKUP_API_TOKEN` and an egress network limited to `api.clickup.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [ClickUp docs](https://developer.clickup.com/docs/authentication).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "list_id": "900100000000", "name": "Check the report" }
export async function run(payload, ctx) {
  const res = await fetch(`https://api.clickup.com/api/v2/list/${payload.list_id}/task`, {
    method: 'POST',
    headers: { Authorization: ctx.secrets.CLICKUP_API_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: payload.name }),
  });
  if (!res.ok) throw new Error(`ClickUp answered ${res.status}`);
  return { id: (await res.json()).id };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Open an issue when a run fails.** Create it from the `catch` block, with the error text and no secrets.
- **Daily digest.** List the items due today and post them to [`slack`](../slack/README.md) or [`microsoft-teams`](../microsoft-teams/README.md).
- **Tasks from a form.** Create one item for each new [`typeform`](../typeform/README.md) response.
- **Receive ClickUp events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide: [Inbound and webhooks](../../docs/guide/inbound-and-webhooks.md).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a ClickUp event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
