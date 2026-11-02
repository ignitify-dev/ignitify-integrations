# trello

> **Status:** draft — not published.

Let a task create and move Trello cards.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Trello with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add trello --task my-task
ignitify secret:set TRELLO_API_KEY --stdin
ignitify secret:set TRELLO_API_TOKEN --stdin
```

The plan adds the secret names `TRELLO_API_KEY`, `TRELLO_API_TOKEN` and an egress network limited to `api.trello.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Trello docs](https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "list_id": "...", "name": "Check the report" }
export async function run(payload, ctx) {
  const query = new URLSearchParams({ idList: payload.list_id, name: payload.name });
  const res = await fetch(`https://api.trello.com/1/cards?${query}`, {
    method: 'POST',
    headers: {
      Authorization: `OAuth oauth_consumer_key="${ctx.secrets.TRELLO_API_KEY}", oauth_token="${ctx.secrets.TRELLO_API_TOKEN}"`,
    },
  });
  if (!res.ok) throw new Error(`Trello answered ${res.status}`);
  return { id: (await res.json()).id };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Open an issue when a run fails.** Create it from the `catch` block, with the error text and no secrets.
- **Daily digest.** List the items due today and post them to [`slack`](../slack/README.md) or [`microsoft-teams`](../microsoft-teams/README.md).
- **Tasks from a form.** Create one item for each new [`typeform`](../typeform/README.md) response.
- **Receive Trello events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Trello event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- Send the key and token in the `Authorization` header, as above, not in the URL: URLs end up in logs.
