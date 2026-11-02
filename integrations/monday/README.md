# monday

> **Status:** draft — not published.

Let a task create and update items on monday.com boards.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call monday.com with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add monday --task my-task
ignitify secret:set MONDAY_API_TOKEN --stdin
```

The plan adds the secret names `MONDAY_API_TOKEN` and an egress network limited to `api.monday.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [monday.com docs](https://developer.monday.com/api-reference/docs/basics).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "board_id": 1234567890, "name": "Check the report" }
export async function run(payload, ctx) {
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { Authorization: ctx.secrets.MONDAY_API_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'mutation ($board: ID!, $name: String!) { create_item (board_id: $board, item_name: $name) { id } }',
      variables: { board: payload.board_id, name: payload.name },
    }),
  });
  if (!res.ok) throw new Error(`monday.com answered ${res.status}`);
  return { id: (await res.json()).data.create_item.id };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Open an issue when a run fails.** Create it from the `catch` block, with the error text and no secrets.
- **Daily digest.** List the items due today and post them to [`slack`](../slack/README.md) or [`microsoft-teams`](../microsoft-teams/README.md).
- **Tasks from a form.** Create one item for each new [`typeform`](../typeform/README.md) response.
- **Receive monday.com events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a monday.com event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
