# linear

> **Status:** draft — not published.

Let a task create and update Linear issues and read projects.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Linear with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add linear --task my-task
ignitify secret:set LINEAR_API_KEY --stdin
```

The plan adds the secret names `LINEAR_API_KEY` and an egress network limited to `api.linear.app`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Linear docs](https://linear.app/developers).

## Use it

`npm install @linear/sdk`, then:

```ts
import { LinearClient } from '@linear/sdk';

// payload: { "team_id": "...", "title": "Nightly run failed" }
export async function run(payload, ctx) {
  const linear = new LinearClient({ apiKey: ctx.secrets.LINEAR_API_KEY });
  const created = await linear.createIssue({ teamId: payload.team_id, title: payload.title });
  const issue = await created.issue;
  return { id: issue?.identifier };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Open an issue when a run fails.** Create it from the `catch` block, with the error text and no secrets.
- **Daily digest.** List the items due today and post them to [`slack`](../slack/README.md) or [`microsoft-teams`](../microsoft-teams/README.md).
- **Tasks from a form.** Create one item for each new [`typeform`](../typeform/README.md) response.
- **Receive Linear events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/04-inbound-and-webhooks.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Linear event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
